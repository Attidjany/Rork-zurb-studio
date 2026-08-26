/**
 * Table registry — replaces Supabase RLS. Every table resolves to an owner
 * (the authenticated user) through a parent chain; the API only ever reads or
 * mutates rows that resolve to the caller.
 */
export interface TableDef {
  /** column holding the owner user id (root tables) */
  ownerColumn?: string;
  /** parent link (child tables) */
  parent?: { column: string; table: string };
  /** columns clients may write */
  writable: string[];
  /** columns stored as TINYINT(1) → boolean */
  booleans?: string[];
  /** columns stored as JSON */
  json?: string[];
  hasUpdatedAt: boolean;
}

export const TABLES: Record<string, TableDef> = {
  profiles: { ownerColumn: 'id', writable: [], hasUpdatedAt: true },
  projects: {
    ownerColumn: 'owner_id',
    writable: ['name', 'description', 'max_rental_period_years', 'owner_id'],
    hasUpdatedAt: true,
  },
  sites: {
    parent: { column: 'project_id', table: 'projects' },
    writable: ['project_id', 'name', 'area_ha'],
    hasUpdatedAt: true,
  },
  blocks: {
    parent: { column: 'site_id', table: 'sites' },
    writable: ['site_id', 'block_number'],
    hasUpdatedAt: false,
  },
  half_blocks: {
    parent: { column: 'block_id', table: 'blocks' },
    writable: ['block_id', 'position', 'type', 'villa_layout', 'apartment_layout', 'villa_type_selections'],
    json: ['villa_type_selections'],
    hasUpdatedAt: false,
  },
  units: {
    parent: { column: 'half_block_id', table: 'half_blocks' },
    writable: ['half_block_id', 'unit_number', 'unit_type', 'size_m2', 'building_type', 'equipment_name', 'utility_name', 'land_area_m2'],
    hasUpdatedAt: false,
  },
  scenarios: {
    parent: { column: 'site_id', table: 'sites' },
    writable: ['site_id', 'name', 'notes', 'rental_period_years', 'is_auto_scenario', 'created_by'],
    booleans: ['is_auto_scenario'],
    hasUpdatedAt: true,
  },
  project_construction_costs: {
    parent: { column: 'project_id', table: 'projects' },
    writable: ['project_id', 'code', 'name', 'gold_grams_per_m2'],
    hasUpdatedAt: true,
  },
  project_housing_types: {
    parent: { column: 'project_id', table: 'projects' },
    writable: ['project_id', 'code', 'name', 'category', 'default_area_m2', 'default_cost_type', 'default_rent_monthly'],
    hasUpdatedAt: true,
  },
  project_equipment_utility_types: {
    parent: { column: 'project_id', table: 'projects' },
    writable: ['project_id', 'code', 'name', 'category', 'land_area_m2', 'building_occupation_pct', 'cost_type'],
    hasUpdatedAt: true,
  },
  scenario_construction_costs: {
    parent: { column: 'scenario_id', table: 'scenarios' },
    writable: ['scenario_id', 'code', 'name', 'gold_grams_per_m2'],
    hasUpdatedAt: true,
  },
  scenario_housing_types: {
    parent: { column: 'scenario_id', table: 'scenarios' },
    writable: ['scenario_id', 'code', 'name', 'category', 'default_area_m2', 'default_cost_type', 'default_rent_monthly'],
    hasUpdatedAt: true,
  },
  scenario_equipment_utility_types: {
    parent: { column: 'scenario_id', table: 'scenarios' },
    writable: ['scenario_id', 'code', 'name', 'category', 'land_area_m2', 'building_occupation_pct', 'cost_type'],
    hasUpdatedAt: true,
  },
  account_settings: {
    ownerColumn: 'user_id',
    writable: ['user_id', 'gold_price_per_oz'],
    hasUpdatedAt: true,
  },
  account_construction_costs: {
    parent: { column: 'account_settings_id', table: 'account_settings' },
    writable: ['account_settings_id', 'code', 'name', 'gold_grams_per_m2'],
    hasUpdatedAt: true,
  },
  account_housing_types: {
    parent: { column: 'account_settings_id', table: 'account_settings' },
    writable: ['account_settings_id', 'code', 'name', 'category', 'default_area_m2', 'default_cost_type', 'default_rent_monthly'],
    hasUpdatedAt: true,
  },
  account_equipment_utility_types: {
    parent: { column: 'account_settings_id', table: 'account_settings' },
    writable: ['account_settings_id', 'code', 'name', 'category', 'land_area_m2', 'building_occupation_pct', 'cost_type'],
    hasUpdatedAt: true,
  },
  account_occupancy_rates: {
    parent: { column: 'account_settings_id', table: 'account_settings' },
    writable: ['account_settings_id', 'min_area_m2', 'max_area_m2', 'people_per_unit', 'category'],
    hasUpdatedAt: true,
  },
};

const IDENT = /^[a-z_][a-z0-9_]*$/;
export const isIdent = (s: string) => IDENT.test(s);

/** SQL predicate (on the table's own columns) restricting rows to `userId`. */
export function ownerPredicate(table: string): { sql: string; params: any[] } {
  const def = TABLES[table];
  if (!def) throw new Error(`Unknown table ${table}`);
  if (def.ownerColumn) return { sql: `\`${table}\`.\`${def.ownerColumn}\` = ?`, params: [] };
  const chain: string[] = [];
  let cur = table;
  let params = 0;
  let sql = '';
  // Build nested IN (...) subqueries up to the root owner table.
  const build = (t: string): string => {
    const d = TABLES[t];
    if (d.ownerColumn) return `SELECT \`${t}\`.\`id\` FROM \`${t}\` WHERE \`${t}\`.\`${d.ownerColumn}\` = ?`;
    const p = d.parent!;
    return `SELECT \`${t}\`.\`id\` FROM \`${t}\` WHERE \`${t}\`.\`${p.column}\` IN (${build(p.table)})`;
  };
  const p = def.parent!;
  sql = `\`${table}\`.\`${p.column}\` IN (${build(p.table)})`;
  void chain; void cur; void params;
  return { sql, params: [] };
}

/** Number of `?` placeholders in ownerPredicate() — always exactly one (the user id). */
export function ownerParams(userId: string) {
  return [userId];
}

/** For an insert: the parent id column that must belong to the user (or owner column). */
export function parentCheck(table: string): { column: string; table?: string } {
  const def = TABLES[table];
  if (def.ownerColumn) return { column: def.ownerColumn };
  return { column: def.parent!.column, table: def.parent!.table };
}

export function normalizeRow(table: string, row: any) {
  const def = TABLES[table];
  if (!row) return row;
  for (const b of def.booleans || []) if (b in row) row[b] = !!row[b];
  for (const j of def.json || []) {
    if (j in row && typeof row[j] === 'string') {
      try { row[j] = JSON.parse(row[j]); } catch {}
    }
  }
  for (const k of Object.keys(row)) {
    if (row[k] instanceof Date) row[k] = row[k].toISOString();
  }
  return row;
}
