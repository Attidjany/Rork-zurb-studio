/**
 * PostgREST-compatible subset over MySQL:
 *   POST /api/db/:table/select  { columns, filters, order, limit, single }
 *   POST /api/db/:table/insert  { rows, returning }
 *   POST /api/db/:table/update  { values, filters, returning }
 *   POST /api/db/:table/delete  { filters, returning }
 * Every call is scoped to the authenticated user through the table registry.
 * Responses: { data, error, changed } — `changed` lists tables touched by
 * hooks so the client can refresh (replaces Supabase realtime).
 */
import { Hono } from 'hono';
import { PoolConnection } from 'mysql2/promise';
import { AuthEnv, requireAuth } from './auth.js';
import { getPool, q, exec, uuid, withTx } from './db.js';
import { TABLES, isIdent, ownerPredicate, parentCheck, normalizeRow } from './registry.js';
import {
  Changed, populateProjectTypes, generateBlocks, generateHalfBlocks, copyProjectParamsToScenario,
  maybeGenerateAutoScenarios, siteIdsForHalfBlocks, siteIdsForUnits,
} from './hooks.js';

type Filter = { col: string; op: string; value: any };
type Order = { col: string; ascending?: boolean };

class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'bad_request') { super(message); }
}

function assertTable(table: string) {
  if (!isIdent(table) || !TABLES[table]) throw new ApiError(404, `relation "${table}" does not exist`, '42P01');
}

function buildWhere(table: string, filters: Filter[], userId: string) {
  const parts: string[] = [];
  const params: any[] = [];
  for (const f of filters || []) {
    if (!isIdent(f.col)) throw new ApiError(400, `invalid column ${f.col}`);
    const col = `\`${table}\`.\`${f.col}\``;
    switch (f.op) {
      case 'eq':
        if (f.value === null) parts.push(`${col} IS NULL`); else { parts.push(`${col} = ?`); params.push(f.value); }
        break;
      case 'neq':
        if (f.value === null) parts.push(`${col} IS NOT NULL`); else { parts.push(`${col} <> ?`); params.push(f.value); }
        break;
      case 'gt': parts.push(`${col} > ?`); params.push(f.value); break;
      case 'gte': parts.push(`${col} >= ?`); params.push(f.value); break;
      case 'lt': parts.push(`${col} < ?`); params.push(f.value); break;
      case 'lte': parts.push(`${col} <= ?`); params.push(f.value); break;
      case 'like': parts.push(`${col} LIKE ?`); params.push(f.value); break;
      case 'ilike': parts.push(`LOWER(${col}) LIKE LOWER(?)`); params.push(f.value); break;
      case 'is':
        parts.push(f.value === null ? `${col} IS NULL` : `${col} = ?`); if (f.value !== null) params.push(f.value ? 1 : 0);
        break;
      case 'in': {
        const arr = Array.isArray(f.value) ? f.value : [];
        if (!arr.length) parts.push('1 = 0'); else { parts.push(`${col} IN (?)`); params.push(arr); }
        break;
      }
      default: throw new ApiError(400, `unsupported operator ${f.op}`);
    }
  }
  const owner = ownerPredicate(table);
  parts.push(owner.sql);
  params.push(userId);
  return { sql: parts.join(' AND '), params };
}

function serialize(table: string, value: any) {
  const def = TABLES[table];
  const out: any = {};
  for (const k of Object.keys(value || {})) {
    if (!isIdent(k)) throw new ApiError(400, `invalid column ${k}`);
    if (!def.writable.includes(k)) {
      if (k === 'id' || k === 'created_at' || k === 'updated_at') continue;
      throw new ApiError(400, `column "${k}" of relation "${table}" is not writable`, '42703');
    }
    let v = value[k];
    if (def.json?.includes(k) && v !== null && v !== undefined && typeof v !== 'string') v = JSON.stringify(v);
    if (def.booleans?.includes(k) && typeof v === 'boolean') v = v ? 1 : 0;
    out[k] = v === undefined ? null : v;
  }
  return out;
}

async function assertParentOwned(conn: PoolConnection, table: string, row: any, userId: string) {
  const pc = parentCheck(table);
  if (!pc.table) {
    // root table: owner column must be the caller (default it when omitted)
    if (row[pc.column] === undefined || row[pc.column] === null) row[pc.column] = userId;
    if (row[pc.column] !== userId) throw new ApiError(403, 'new row violates row-level security policy', '42501');
    return;
  }
  const parentId = row[pc.column];
  if (!parentId) throw new ApiError(400, `${pc.column} is required`);
  const owner = ownerPredicate(pc.table);
  const rows = await q(conn, `SELECT 1 FROM \`${pc.table}\` WHERE \`${pc.table}\`.\`id\` = ? AND ${owner.sql} LIMIT 1`, [parentId, userId]);
  if (!rows.length) throw new ApiError(403, 'new row violates row-level security policy', '42501');
}

async function selectRows(conn: PoolConnection | ReturnType<typeof getPool>, table: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await q(conn, `SELECT * FROM \`${table}\` WHERE id IN (?)`, [ids]);
  const byId = new Map(rows.map(r => [r.id, normalizeRow(table, r)]));
  return ids.map(id => byId.get(id)).filter(Boolean);
}

// ---------------------------------------------------------------- hooks wiring

async function afterInsert(conn: PoolConnection, table: string, rows: any[], userId: string, changed: Changed) {
  if (table === 'projects') for (const r of rows) await populateProjectTypes(conn, r.id, r.owner_id || userId, changed);
  if (table === 'sites') for (const r of rows) await generateBlocks(conn, r.id, r.area_ha, changed);
  if (table === 'blocks') { for (const r of rows) await generateHalfBlocks(conn, r.id); changed.add('half_blocks'); }
  if (table === 'scenarios') for (const r of rows) await copyProjectParamsToScenario(conn, r.id, r.site_id, changed);
  if (table === 'units') await maybeGenerateAutoScenarios(conn, await siteIdsForUnits(conn, rows.map(r => r.id)), changed);
  if (table === 'half_blocks') await maybeGenerateAutoScenarios(conn, await siteIdsForHalfBlocks(conn, rows.map(r => r.id)), changed);
}

async function afterUpdate(conn: PoolConnection, table: string, ids: string[], values: any, changed: Changed) {
  if (!ids.length) return;
  if (table === 'sites' && 'area_ha' in values) {
    const sites = await q(conn, 'SELECT id, area_ha FROM sites WHERE id IN (?)', [ids]);
    for (const s of sites) await generateBlocks(conn, s.id, s.area_ha, changed);
  }
  if (table === 'units') await maybeGenerateAutoScenarios(conn, await siteIdsForUnits(conn, ids), changed);
  if (table === 'half_blocks') await maybeGenerateAutoScenarios(conn, await siteIdsForHalfBlocks(conn, ids), changed);
}

// ---------------------------------------------------------------- routes

export const dbRoutes = new Hono<AuthEnv>();
dbRoutes.use('*', requireAuth);

dbRoutes.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ data: null, error: { message: err.message, code: err.code } }, err.status as any);
  if ((err as any)?.code === 'ER_BAD_FIELD_ERROR') return c.json({ data: null, error: { message: err.message, code: '42703' } }, 400);
  console.error('[db] error', err);
  return c.json({ data: null, error: { message: err.message || 'Internal error', code: 'internal' } }, 500);
});

dbRoutes.post('/:table/select', async c => {
  const table = c.req.param('table');
  assertTable(table);
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const cols: string = body.columns && body.columns !== '*'
    ? String(body.columns).split(',').map((s: string) => s.trim()).filter(Boolean).map((s: string) => {
        if (!isIdent(s)) throw new ApiError(400, `invalid column ${s}`);
        return `\`${table}\`.\`${s}\``;
      }).join(', ')
    : `\`${table}\`.*`;
  const where = buildWhere(table, body.filters || [], user.id);
  let sql = `SELECT ${cols} FROM \`${table}\` WHERE ${where.sql}`;
  const orders: Order[] = body.order || [];
  if (orders.length) {
    sql += ' ORDER BY ' + orders.map(o => {
      if (!isIdent(o.col)) throw new ApiError(400, `invalid column ${o.col}`);
      return `\`${table}\`.\`${o.col}\` ${o.ascending === false ? 'DESC' : 'ASC'}`;
    }).join(', ');
  }
  if (body.limit) { sql += ' LIMIT ?'; where.params.push(Number(body.limit)); }
  const rows = (await q(getPool(), sql, where.params)).map(r => normalizeRow(table, r));
  if (body.single === 'single') {
    if (rows.length !== 1) throw new ApiError(406, rows.length ? 'JSON object requested, multiple (or no) rows returned' : 'JSON object requested, multiple (or no) rows returned', 'PGRST116');
    return c.json({ data: rows[0], error: null });
  }
  if (body.single === 'maybeSingle') {
    if (rows.length > 1) throw new ApiError(406, 'JSON object requested, multiple (or no) rows returned', 'PGRST116');
    return c.json({ data: rows[0] ?? null, error: null });
  }
  return c.json({ data: rows, error: null });
});

dbRoutes.post('/:table/insert', async c => {
  const table = c.req.param('table');
  assertTable(table);
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const input: any[] = Array.isArray(body.rows) ? body.rows : body.rows ? [body.rows] : [];
  if (!input.length) throw new ApiError(400, 'no rows to insert');
  const changed: Changed = new Set([table]);
  const ids: string[] = [];
  await withTx(async conn => {
    for (const raw of input) {
      const row = serialize(table, raw);
      await assertParentOwned(conn, table, row, user.id);
      const id = raw.id && typeof raw.id === 'string' ? raw.id : uuid();
      const cols = ['id', ...Object.keys(row)];
      const vals = [id, ...Object.values(row)];
      try {
        await exec(conn, `INSERT INTO \`${table}\` (${cols.map(x => `\`${x}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
      } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY') throw new ApiError(409, `duplicate key value violates unique constraint`, '23505');
        throw e;
      }
      ids.push(id);
    }
    const inserted = await selectRows(conn, table, ids);
    await afterInsert(conn, table, inserted, user.id, changed);
  });
  const data = body.returning === false ? null : await selectRows(getPool(), table, ids);
  return c.json({ data, error: null, changed: [...changed] });
});

dbRoutes.post('/:table/update', async c => {
  const table = c.req.param('table');
  assertTable(table);
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const values = serialize(table, body.values || {});
  const filters: Filter[] = body.filters || [];
  if (!filters.length) throw new ApiError(400, 'update requires at least one filter');
  const changed: Changed = new Set([table]);
  let ids: string[] = [];
  await withTx(async conn => {
    const where = buildWhere(table, filters, user.id);
    ids = (await q(conn, `SELECT \`${table}\`.\`id\` FROM \`${table}\` WHERE ${where.sql}`, where.params)).map(r => r.id);
    if (!ids.length || !Object.keys(values).length) return;
    // Re-parenting is only allowed onto rows the caller owns.
    const pc = parentCheck(table);
    if (pc.column in values) await assertParentOwned(conn, table, { ...values }, user.id);
    const sets = Object.keys(values).map(k => `\`${k}\` = ?`).join(', ');
    try {
      await exec(conn, `UPDATE \`${table}\` SET ${sets} WHERE id IN (?)`, [...Object.values(values), ids]);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') throw new ApiError(409, `duplicate key value violates unique constraint`, '23505');
      throw e;
    }
    await afterUpdate(conn, table, ids, values, changed);
  });
  const data = body.returning === false ? null : await selectRows(getPool(), table, ids);
  return c.json({ data, error: null, changed: [...changed] });
});

dbRoutes.post('/:table/delete', async c => {
  const table = c.req.param('table');
  assertTable(table);
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const filters: Filter[] = body.filters || [];
  if (!filters.length) throw new ApiError(400, 'delete requires at least one filter');
  const changed: Changed = new Set([table]);
  let deleted: any[] = [];
  await withTx(async conn => {
    const where = buildWhere(table, filters, user.id);
    const ids = (await q(conn, `SELECT \`${table}\`.\`id\` FROM \`${table}\` WHERE ${where.sql}`, where.params)).map(r => r.id);
    if (!ids.length) return;
    deleted = await selectRows(conn, table, ids);
    // Sites touched by unit / half-block deletes may become "configured" → regenerate auto scenarios.
    const siteIds = table === 'units' ? await siteIdsForUnits(conn, ids)
      : table === 'half_blocks' ? await siteIdsForHalfBlocks(conn, ids) : [];
    await exec(conn, `DELETE FROM \`${table}\` WHERE id IN (?)`, [ids]);
    if (siteIds.length) await maybeGenerateAutoScenarios(conn, siteIds, changed);
    // Cascades: tell the client what else changed.
    const cascades: Record<string, string[]> = {
      projects: ['sites', 'blocks', 'half_blocks', 'units', 'scenarios', 'project_construction_costs', 'project_housing_types', 'project_equipment_utility_types', 'scenario_construction_costs', 'scenario_housing_types', 'scenario_equipment_utility_types'],
      sites: ['blocks', 'half_blocks', 'units', 'scenarios', 'scenario_construction_costs', 'scenario_housing_types', 'scenario_equipment_utility_types'],
      blocks: ['half_blocks', 'units'],
      half_blocks: ['units'],
      scenarios: ['scenario_construction_costs', 'scenario_housing_types', 'scenario_equipment_utility_types'],
      account_settings: ['account_construction_costs', 'account_housing_types', 'account_equipment_utility_types', 'account_occupancy_rates'],
    };
    for (const t of cascades[table] || []) changed.add(t);
  });
  return c.json({ data: body.returning === false ? null : deleted, error: null, changed: [...changed] });
});

// ---------------------------------------------------------------- rpc

export const rpcRoutes = new Hono<AuthEnv>();
rpcRoutes.use('*', requireAuth);

rpcRoutes.post('/generate_auto_scenarios', async c => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const siteId = String(body.p_site_id || '');
  const owner = ownerPredicate('sites');
  const ok = await q(getPool(), `SELECT 1 FROM sites WHERE sites.id = ? AND ${owner.sql}`, [siteId, user.id]);
  if (!ok.length) return c.json({ data: [{ success: false, message: 'Site not found' }], error: null });
  const { generateAutoScenarios } = await import('./autoScenarios.js');
  const result = await withTx(conn => generateAutoScenarios(conn, siteId));
  return c.json({
    data: [result], error: null,
    changed: ['scenarios', 'scenario_construction_costs', 'scenario_housing_types', 'scenario_equipment_utility_types'],
  });
});
