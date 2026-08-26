/**
 * Business logic that used to live in Postgres triggers / functions.
 * All functions run on the caller's connection (inside its transaction).
 */
import { Conn, exec, q, uuid } from './db.js';
import {
  DEFAULT_CONSTRUCTION_COSTS,
  DEFAULT_EQUIPMENT_UTILITY_TYPES,
  DEFAULT_HOUSING_TYPES,
  DEFAULT_OCCUPANCY_RATES,
} from './defaults.js';
import { generateAutoScenarios } from './autoScenarios.js';

export type Changed = Set<string>;

// ---------------------------------------------------------------- accounts

/** initialize_account_settings(user_id) — idempotent; returns the settings id. */
export async function initializeAccountSettings(conn: Conn, userId: string, changed?: Changed): Promise<string> {
  const existing = await q(conn, 'SELECT id FROM account_settings WHERE user_id = ?', [userId]);
  if (existing.length) return existing[0].id;
  const id = uuid();
  await exec(conn, 'INSERT INTO account_settings (id, user_id) VALUES (?, ?)', [id, userId]);
  for (const c of DEFAULT_CONSTRUCTION_COSTS)
    await exec(conn, 'INSERT INTO account_construction_costs (id, account_settings_id, code, name, gold_grams_per_m2) VALUES (?,?,?,?,?)',
      [uuid(), id, c.code, c.name, c.gold_grams_per_m2]);
  for (const h of DEFAULT_HOUSING_TYPES)
    await exec(conn, 'INSERT INTO account_housing_types (id, account_settings_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly) VALUES (?,?,?,?,?,?,?,?)',
      [uuid(), id, h.code, h.name, h.category, h.default_area_m2, h.default_cost_type, h.default_rent_monthly]);
  for (const e of DEFAULT_EQUIPMENT_UTILITY_TYPES)
    await exec(conn, 'INSERT INTO account_equipment_utility_types (id, account_settings_id, code, name, category, land_area_m2, building_occupation_pct, cost_type) VALUES (?,?,?,?,?,?,?,?)',
      [uuid(), id, e.code, e.name, e.category, e.land_area_m2, e.building_occupation_pct, e.cost_type]);
  for (const o of DEFAULT_OCCUPANCY_RATES)
    await exec(conn, 'INSERT INTO account_occupancy_rates (id, account_settings_id, min_area_m2, max_area_m2, people_per_unit, category) VALUES (?,?,?,?,?,?)',
      [uuid(), id, o.min_area_m2, o.max_area_m2, o.people_per_unit, o.category]);
  changed?.add('account_settings');
  changed?.add('account_construction_costs');
  changed?.add('account_housing_types');
  changed?.add('account_equipment_utility_types');
  changed?.add('account_occupancy_rates');
  return id;
}

// ---------------------------------------------------------------- projects

/** auto_populate_project_types — copy the owner's account defaults onto a new project. */
export async function populateProjectTypes(conn: Conn, projectId: string, ownerId: string, changed: Changed) {
  const settingsId = await initializeAccountSettings(conn, ownerId, changed);
  await exec(conn, `INSERT IGNORE INTO project_construction_costs (id, project_id, code, name, gold_grams_per_m2)
    SELECT UUID(), ?, code, name, gold_grams_per_m2 FROM account_construction_costs WHERE account_settings_id = ?`, [projectId, settingsId]);
  await exec(conn, `INSERT IGNORE INTO project_housing_types (id, project_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
    SELECT UUID(), ?, code, name, category, default_area_m2, default_cost_type, default_rent_monthly FROM account_housing_types WHERE account_settings_id = ?`, [projectId, settingsId]);
  await exec(conn, `INSERT IGNORE INTO project_equipment_utility_types (id, project_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
    SELECT UUID(), ?, code, name, category, land_area_m2, building_occupation_pct, cost_type FROM account_equipment_utility_types WHERE account_settings_id = ?`, [projectId, settingsId]);
  changed.add('project_construction_costs');
  changed.add('project_housing_types');
  changed.add('project_equipment_utility_types');
}

// ---------------------------------------------------------------- sites / blocks

/** auto_generate_blocks — FLOOR(area_ha / 6) blocks, each with a north + south half-block. */
export async function generateBlocks(conn: Conn, siteId: string, areaHa: number, changed: Changed) {
  await exec(conn, 'DELETE FROM blocks WHERE site_id = ?', [siteId]);
  const n = Math.floor(Number(areaHa) / 6);
  for (let i = 1; i <= n; i++) {
    const blockId = uuid();
    await exec(conn, 'INSERT INTO blocks (id, site_id, block_number) VALUES (?,?,?)', [blockId, siteId, i]);
    await generateHalfBlocks(conn, blockId);
  }
  changed.add('blocks'); changed.add('half_blocks'); changed.add('units'); changed.add('scenarios');
}

/** auto_generate_half_blocks */
export async function generateHalfBlocks(conn: Conn, blockId: string) {
  await exec(conn, 'INSERT IGNORE INTO half_blocks (id, block_id, position) VALUES (?,?,?)', [uuid(), blockId, 'north']);
  await exec(conn, 'INSERT IGNORE INTO half_blocks (id, block_id, position) VALUES (?,?,?)', [uuid(), blockId, 'south']);
}

// ---------------------------------------------------------------- scenarios

/** copy_project_params_to_scenario — ON CONFLICT DO NOTHING semantics. */
export async function copyProjectParamsToScenario(conn: Conn, scenarioId: string, siteId: string, changed: Changed) {
  const rows = await q(conn, 'SELECT project_id FROM sites WHERE id = ?', [siteId]);
  if (!rows.length) return;
  const projectId = rows[0].project_id;
  await exec(conn, `INSERT IGNORE INTO scenario_construction_costs (id, scenario_id, code, name, gold_grams_per_m2)
    SELECT UUID(), ?, code, name, gold_grams_per_m2 FROM project_construction_costs WHERE project_id = ?`, [scenarioId, projectId]);
  await exec(conn, `INSERT IGNORE INTO scenario_housing_types (id, scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
    SELECT UUID(), ?, code, name, category, default_area_m2, default_cost_type, default_rent_monthly FROM project_housing_types WHERE project_id = ?`, [scenarioId, projectId]);
  await exec(conn, `INSERT IGNORE INTO scenario_equipment_utility_types (id, scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
    SELECT UUID(), ?, code, name, category, land_area_m2, building_occupation_pct, cost_type FROM project_equipment_utility_types WHERE project_id = ?`, [scenarioId, projectId]);
  changed.add('scenario_construction_costs');
  changed.add('scenario_housing_types');
  changed.add('scenario_equipment_utility_types');
}

// ---------------------------------------------------------------- auto scenarios

/** check_site_blocks_configured */
export async function isSiteConfigured(conn: Conn, siteId: string): Promise<boolean> {
  const [{ total }] = await q(conn,
    `SELECT COUNT(*) AS total FROM half_blocks hb JOIN blocks b ON b.id = hb.block_id WHERE b.site_id = ?`, [siteId]);
  const [{ configured }] = await q(conn,
    `SELECT COUNT(DISTINCT hb.id) AS configured
       FROM half_blocks hb
       JOIN blocks b ON b.id = hb.block_id
       JOIN units u ON u.half_block_id = hb.id
      WHERE b.site_id = ?
        AND hb.type IS NOT NULL
        AND ((hb.type = 'villas' AND hb.villa_layout IS NOT NULL) OR (hb.type = 'apartments' AND hb.apartment_layout IS NOT NULL))
        AND ((hb.type = 'villas' AND u.unit_type IS NOT NULL) OR (hb.type = 'apartments' AND u.building_type IS NOT NULL))`, [siteId]);
  return Number(total) > 0 && Number(total) === Number(configured);
}

/** check_and_generate_auto_scenarios — for a set of sites touched by unit/half-block writes. */
export async function maybeGenerateAutoScenarios(conn: Conn, siteIds: Iterable<string>, changed: Changed) {
  for (const siteId of new Set(siteIds)) {
    if (await isSiteConfigured(conn, siteId)) {
      await generateAutoScenarios(conn, siteId);
      changed.add('scenarios');
      changed.add('scenario_construction_costs');
      changed.add('scenario_housing_types');
      changed.add('scenario_equipment_utility_types');
    }
  }
}

export async function siteIdsForHalfBlocks(conn: Conn, halfBlockIds: string[]): Promise<string[]> {
  if (!halfBlockIds.length) return [];
  const rows = await q(conn,
    `SELECT DISTINCT b.site_id FROM half_blocks hb JOIN blocks b ON b.id = hb.block_id WHERE hb.id IN (?)`, [halfBlockIds]);
  return rows.map(r => r.site_id);
}

export async function siteIdsForUnits(conn: Conn, unitIds: string[]): Promise<string[]> {
  if (!unitIds.length) return [];
  const rows = await q(conn,
    `SELECT DISTINCT b.site_id FROM units u JOIN half_blocks hb ON hb.id = u.half_block_id JOIN blocks b ON b.id = hb.block_id WHERE u.id IN (?)`, [unitIds]);
  return rows.map(r => r.site_id);
}
