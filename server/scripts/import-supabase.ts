/**
 * One-shot import of the Supabase export (JSON per table) into the MySQL/MariaDB database.
 *   node dist/import.js <data-dir> [temp-password]
 * Keeps all UUIDs. Users get the temp password (Supabase password hashes are not exportable).
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { getPool, exec, q } from '../src/db.js';
import { ensureSchema } from '../src/schema.js';

const dir = process.argv[2] || './supa';
const tempPassword = process.argv[3] || 'Zenoah-2026!';
const load = (t: string): any[] => existsSync(join(dir, t + '.json')) ? JSON.parse(readFileSync(join(dir, t + '.json'), 'utf8')) : [];
const d = (v: any) => (v ? new Date(v) : null);

const pool = getPool();
await ensureSchema(pool);
const conn = await pool.getConnection();
await conn.beginTransaction();
try {
  const users = (() => { const u = load('users'); return Array.isArray(u) ? u : (u as any).users || []; })();
  const profiles = load('profiles');
  const hash = await bcrypt.hash(tempPassword, 10);
  let n = 0;
  for (const u of users) {
    const email = String(u.email || '').toLowerCase();
    await exec(conn, 'INSERT IGNORE INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)', [u.id, email, hash, d(u.created_at) || new Date()]);
    const p = profiles.find((x: any) => x.id === u.id);
    await exec(conn, 'INSERT IGNORE INTO profiles (id, email, role, created_at, updated_at) VALUES (?,?,?,?,?)', [u.id, email, p?.role || 'designer', d(p?.created_at) || new Date(), d(p?.updated_at) || new Date()]);
    n++;
  }
  console.log('users', n);

  const insert = async (table: string, rows: any[], cols: string[], map: (r: any) => any[] = r => cols.map(c => r[c] ?? null)) => {
    let k = 0;
    for (const r of rows) { await exec(conn, `INSERT IGNORE INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`, map(r)); k++; }
    console.log(table, k);
  };
  const ts = (r: any) => [d(r.created_at) || new Date(), d(r.updated_at) || d(r.created_at) || new Date()];

  await insert('account_settings', load('account_settings'), ['id', 'user_id', 'gold_price_per_oz', 'created_at', 'updated_at'], r => [r.id, r.user_id, r.gold_price_per_oz ?? null, ...ts(r)]);
  await insert('account_construction_costs', load('account_construction_costs'), ['id', 'account_settings_id', 'code', 'name', 'gold_grams_per_m2', 'created_at', 'updated_at'], r => [r.id, r.account_settings_id, r.code, r.name, r.gold_grams_per_m2, ...ts(r)]);
  await insert('account_housing_types', load('account_housing_types'), ['id', 'account_settings_id', 'code', 'name', 'category', 'default_area_m2', 'default_cost_type', 'default_rent_monthly', 'created_at', 'updated_at'], r => [r.id, r.account_settings_id, r.code, r.name, r.category, r.default_area_m2, r.default_cost_type, r.default_rent_monthly, ...ts(r)]);
  await insert('account_equipment_utility_types', load('account_equipment_utility_types'), ['id', 'account_settings_id', 'code', 'name', 'category', 'land_area_m2', 'building_occupation_pct', 'cost_type', 'created_at', 'updated_at'], r => [r.id, r.account_settings_id, r.code, r.name, r.category, r.land_area_m2, r.building_occupation_pct, r.cost_type, ...ts(r)]);
  await insert('account_occupancy_rates', load('account_occupancy_rates'), ['id', 'account_settings_id', 'min_area_m2', 'max_area_m2', 'people_per_unit', 'category', 'created_at', 'updated_at'], r => [r.id, r.account_settings_id, r.min_area_m2, r.max_area_m2 ?? null, r.people_per_unit, r.category, ...ts(r)]);

  await insert('projects', load('projects'), ['id', 'owner_id', 'name', 'description', 'max_rental_period_years', 'created_at', 'updated_at'], r => [r.id, r.owner_id, r.name, r.description ?? null, r.max_rental_period_years ?? 20, ...ts(r)]);
  await insert('project_construction_costs', load('project_construction_costs'), ['id', 'project_id', 'code', 'name', 'gold_grams_per_m2', 'created_at', 'updated_at'], r => [r.id, r.project_id, r.code, r.name, r.gold_grams_per_m2, ...ts(r)]);
  await insert('project_housing_types', load('project_housing_types'), ['id', 'project_id', 'code', 'name', 'category', 'default_area_m2', 'default_cost_type', 'default_rent_monthly', 'created_at', 'updated_at'], r => [r.id, r.project_id, r.code, r.name, r.category, r.default_area_m2, r.default_cost_type, r.default_rent_monthly, ...ts(r)]);
  await insert('project_equipment_utility_types', load('project_equipment_utility_types'), ['id', 'project_id', 'code', 'name', 'category', 'land_area_m2', 'building_occupation_pct', 'cost_type', 'created_at', 'updated_at'], r => [r.id, r.project_id, r.code, r.name, r.category, r.land_area_m2, r.building_occupation_pct, r.cost_type, ...ts(r)]);
  await insert('sites', load('sites'), ['id', 'project_id', 'name', 'area_ha', 'created_at', 'updated_at'], r => [r.id, r.project_id, r.name, r.area_ha, ...ts(r)]);
  await insert('blocks', load('blocks'), ['id', 'site_id', 'block_number', 'created_at'], r => [r.id, r.site_id, r.block_number, d(r.created_at) || new Date()]);
  await insert('half_blocks', load('half_blocks'), ['id', 'block_id', 'position', 'type', 'villa_layout', 'apartment_layout', 'villa_type_selections', 'created_at'], r => [r.id, r.block_id, r.position, r.type ?? null, r.villa_layout ?? null, r.apartment_layout ?? null, r.villa_type_selections == null ? null : JSON.stringify(r.villa_type_selections), d(r.created_at) || new Date()]);
  await insert('units', load('units'), ['id', 'half_block_id', 'unit_number', 'unit_type', 'size_m2', 'building_type', 'equipment_name', 'utility_name', 'land_area_m2', 'created_at'], r => [r.id, r.half_block_id, r.unit_number, r.unit_type, r.size_m2 ?? null, r.building_type ?? null, r.equipment_name ?? null, r.utility_name ?? null, r.land_area_m2 ?? null, d(r.created_at) || new Date()]);
  await insert('scenarios', load('scenarios'), ['id', 'site_id', 'name', 'notes', 'rental_period_years', 'is_auto_scenario', 'created_by', 'created_at', 'updated_at'], r => [r.id, r.site_id, r.name, r.notes ?? null, r.rental_period_years ?? 20, r.is_auto_scenario ? 1 : 0, r.created_by, ...ts(r)]);
  await insert('scenario_construction_costs', load('scenario_construction_costs'), ['id', 'scenario_id', 'code', 'name', 'gold_grams_per_m2', 'created_at', 'updated_at'], r => [r.id, r.scenario_id, r.code, r.name, r.gold_grams_per_m2, ...ts(r)]);
  await insert('scenario_housing_types', load('scenario_housing_types'), ['id', 'scenario_id', 'code', 'name', 'category', 'default_area_m2', 'default_cost_type', 'default_rent_monthly', 'created_at', 'updated_at'], r => [r.id, r.scenario_id, r.code, r.name, r.category, r.default_area_m2, r.default_cost_type, r.default_rent_monthly, ...ts(r)]);
  await insert('scenario_equipment_utility_types', load('scenario_equipment_utility_types'), ['id', 'scenario_id', 'code', 'name', 'category', 'land_area_m2', 'building_occupation_pct', 'cost_type', 'created_at', 'updated_at'], r => [r.id, r.scenario_id, r.code, r.name, r.category, r.land_area_m2, r.building_occupation_pct, r.cost_type, ...ts(r)]);

  await conn.commit();
  for (const t of ['users', 'projects', 'sites', 'blocks', 'half_blocks', 'units', 'scenarios', 'scenario_housing_types']) {
    const [{ n }] = await q(conn, `SELECT COUNT(*) n FROM \`${t}\``); console.log(`  ${t}: ${n}`);
  }
} catch (e) {
  await conn.rollback(); console.error('IMPORT FAILED — rolled back', e); process.exit(1);
} finally {
  conn.release(); await pool.end();
}
