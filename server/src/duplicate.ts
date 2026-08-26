/**
 * Server-side duplication of sites / projects (the old client-side version
 * raced the block-generation trigger and produced duplicate blocks).
 */
import { Hono } from 'hono';
import { PoolConnection } from 'mysql2/promise';
import { AuthEnv, requireAuth } from './auth.js';
import { getPool, q, exec, uuid, withTx } from './db.js';
import { ownerPredicate, normalizeRow } from './registry.js';
import { Changed, copyProjectParamsToScenario } from './hooks.js';

async function copyScenarioParams(conn: PoolConnection, fromId: string, toId: string) {
  await exec(conn, `INSERT INTO scenario_construction_costs (id, scenario_id, code, name, gold_grams_per_m2)
    SELECT UUID(), ?, code, name, gold_grams_per_m2 FROM scenario_construction_costs WHERE scenario_id = ?`, [toId, fromId]);
  await exec(conn, `INSERT INTO scenario_housing_types (id, scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
    SELECT UUID(), ?, code, name, category, default_area_m2, default_cost_type, default_rent_monthly FROM scenario_housing_types WHERE scenario_id = ?`, [toId, fromId]);
  await exec(conn, `INSERT INTO scenario_equipment_utility_types (id, scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
    SELECT UUID(), ?, code, name, category, land_area_m2, building_occupation_pct, cost_type FROM scenario_equipment_utility_types WHERE scenario_id = ?`, [toId, fromId]);
}

export async function duplicateSite(conn: PoolConnection, siteId: string, targetProjectId: string, name: string, userId: string, changed: Changed) {
  const [site] = await q(conn, 'SELECT * FROM sites WHERE id = ?', [siteId]);
  const newSiteId = uuid();
  await exec(conn, 'INSERT INTO sites (id, project_id, name, area_ha) VALUES (?,?,?,?)', [newSiteId, targetProjectId, name, site.area_ha]);
  const blocks = await q(conn, 'SELECT * FROM blocks WHERE site_id = ? ORDER BY block_number', [siteId]);
  for (const b of blocks) {
    const newBlockId = uuid();
    await exec(conn, 'INSERT INTO blocks (id, site_id, block_number) VALUES (?,?,?)', [newBlockId, newSiteId, b.block_number]);
    const hbs = await q(conn, 'SELECT * FROM half_blocks WHERE block_id = ?', [b.id]);
    for (const hb of hbs) {
      const newHbId = uuid();
      await exec(conn, `INSERT INTO half_blocks (id, block_id, position, type, villa_layout, apartment_layout, villa_type_selections) VALUES (?,?,?,?,?,?,?)`,
        [newHbId, newBlockId, hb.position, hb.type, hb.villa_layout, hb.apartment_layout, hb.villa_type_selections == null ? null : JSON.stringify(hb.villa_type_selections)]);
      await exec(conn, `INSERT INTO units (id, half_block_id, unit_number, unit_type, size_m2, building_type, equipment_name, utility_name, land_area_m2)
        SELECT UUID(), ?, unit_number, unit_type, size_m2, building_type, equipment_name, utility_name, land_area_m2 FROM units WHERE half_block_id = ?`, [newHbId, hb.id]);
    }
  }
  const scenarios = await q(conn, 'SELECT * FROM scenarios WHERE site_id = ? ORDER BY created_at', [siteId]);
  for (const s of scenarios) {
    const newScenarioId = uuid();
    await exec(conn, `INSERT INTO scenarios (id, site_id, name, notes, rental_period_years, is_auto_scenario, created_by) VALUES (?,?,?,?,?,?,?)`,
      [newScenarioId, newSiteId, s.name, s.notes, s.rental_period_years, s.is_auto_scenario, userId]);
    await copyScenarioParams(conn, s.id, newScenarioId);
    await copyProjectParamsToScenario(conn, newScenarioId, newSiteId, changed); // fills anything missing
  }
  for (const t of ['sites', 'blocks', 'half_blocks', 'units', 'scenarios', 'scenario_construction_costs', 'scenario_housing_types', 'scenario_equipment_utility_types']) changed.add(t);
  return newSiteId;
}

export const duplicateRoutes = new Hono<AuthEnv>();
duplicateRoutes.use('*', requireAuth);

duplicateRoutes.post('/sites/:id/duplicate', async c => {
  const user = c.get('user');
  const siteId = c.req.param('id');
  const owner = ownerPredicate('sites');
  const rows = await q(getPool(), `SELECT * FROM sites WHERE sites.id = ? AND ${owner.sql}`, [siteId, user.id]);
  if (!rows.length) return c.json({ data: null, error: { message: 'Site not found' } }, 404);
  const changed: Changed = new Set();
  const newId = await withTx(conn => duplicateSite(conn, siteId, rows[0].project_id, `${rows[0].name} (Copy)`, user.id, changed));
  const [site] = await q(getPool(), 'SELECT * FROM sites WHERE id = ?', [newId]);
  return c.json({ data: normalizeRow('sites', site), error: null, changed: [...changed] });
});

duplicateRoutes.post('/projects/:id/duplicate', async c => {
  const user = c.get('user');
  const projectId = c.req.param('id');
  const rows = await q(getPool(), 'SELECT * FROM projects WHERE id = ? AND owner_id = ?', [projectId, user.id]);
  if (!rows.length) return c.json({ data: null, error: { message: 'Project not found' } }, 404);
  const src = rows[0];
  const changed: Changed = new Set(['projects']);
  const newId = await withTx(async conn => {
    const id = uuid();
    await exec(conn, 'INSERT INTO projects (id, owner_id, name, description, max_rental_period_years) VALUES (?,?,?,?,?)',
      [id, user.id, `${src.name} (Copy)`, src.description, src.max_rental_period_years]);
    for (const t of ['project_construction_costs', 'project_housing_types', 'project_equipment_utility_types']) {
      const cols = t === 'project_construction_costs' ? 'code, name, gold_grams_per_m2'
        : t === 'project_housing_types' ? 'code, name, category, default_area_m2, default_cost_type, default_rent_monthly'
        : 'code, name, category, land_area_m2, building_occupation_pct, cost_type';
      await exec(conn, `INSERT INTO ${t} (id, project_id, ${cols}) SELECT UUID(), ?, ${cols} FROM ${t} WHERE project_id = ?`, [id, projectId]);
      changed.add(t);
    }
    const sites = await q(conn, 'SELECT id, name FROM sites WHERE project_id = ? ORDER BY created_at', [projectId]);
    for (const s of sites) await duplicateSite(conn, s.id, id, s.name, user.id, changed);
    return id;
  });
  const [project] = await q(getPool(), 'SELECT * FROM projects WHERE id = ?', [newId]);
  return c.json({ data: normalizeRow('projects', project), error: null, changed: [...changed] });
});
