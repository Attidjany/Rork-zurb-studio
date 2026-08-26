/**
 * Port of generate_auto_scenarios(p_site_id) — the latest Postgres version
 * (add-profitability-check-auto-scenarios.sql): up to three auto scenarios,
 * each only created when projected revenue > projected cost.
 */
import { Conn, exec, q, uuid } from './db.js';
import { APARTMENT_BUILDING_UNITS, CONSTRUCTION_COST_DEFAULTS, HOUSING_TYPE_DEFAULTS } from './typologies.js';

const TROY_OZ_GRAMS = 31.1034768;

interface Variant {
  name: string;
  notes: string;
  years: (max: number) => number;
  rentMult: number;
  costMult: number;
}

const VARIANTS: Variant[] = [
  {
    name: 'Auto: Most Profit',
    notes: 'Maximum profit scenario: Longer rental period, premium rents, quality construction',
    years: max => max, rentMult: 1.2, costMult: 1.1,
  },
  {
    name: 'Auto: Lowest Rents',
    notes: 'Affordable scenario: Shorter rental period, reduced rents, economical construction',
    years: () => 10, rentMult: 0.8, costMult: 0.9,
  },
  {
    name: 'Auto: Balanced',
    notes: 'Balanced scenario: Moderate rental period, standard market rents, standard construction',
    years: () => 15, rentMult: 1.0, costMult: 1.0,
  },
];

export interface AutoScenarioResult { success: boolean; message: string }

export async function generateAutoScenarios(conn: Conn, siteId: string): Promise<AutoScenarioResult> {
  const info = await q(conn,
    `SELECT s.project_id, COALESCE(p.max_rental_period_years, 20) AS max_years, p.owner_id
       FROM sites s JOIN projects p ON p.id = s.project_id WHERE s.id = ?`, [siteId]);
  if (!info.length) return { success: false, message: 'Site not found' };
  const { project_id: projectId, max_years: maxYears, owner_id: userId } = info[0];

  const gp = await q(conn, 'SELECT gold_price_per_oz FROM account_settings WHERE user_id = ? LIMIT 1', [userId]);
  const goldPriceUsd = Number(gp[0]?.gold_price_per_oz ?? 3000) || 3000;
  const usdPerGram = goldPriceUsd / TROY_OZ_GRAMS;

  // Price every housing unit on the site the same way the site screen does:
  // villas = one unit per plot keyed by building_type; apartment half-blocks =
  // N apartment buildings × the layout's unit mix. Project parameters win over defaults.
  const housing = await q(conn, 'SELECT code, default_area_m2, default_cost_type, default_rent_monthly FROM project_housing_types WHERE project_id = ?', [projectId]);
  const costs = await q(conn, 'SELECT code, gold_grams_per_m2 FROM project_construction_costs WHERE project_id = ?', [projectId]);
  const priced = await priceSiteUnits(conn, siteId, housing, costs, usdPerGram);
  // Remove existing auto scenarios (children cascade, but delete explicitly like the original).
  const existing = await q(conn, 'SELECT id FROM scenarios WHERE site_id = ? AND is_auto_scenario = 1', [siteId]);
  if (existing.length) {
    const ids = existing.map(r => r.id);
    await exec(conn, 'DELETE FROM scenario_construction_costs WHERE scenario_id IN (?)', [ids]);
    await exec(conn, 'DELETE FROM scenario_housing_types WHERE scenario_id IN (?)', [ids]);
    await exec(conn, 'DELETE FROM scenario_equipment_utility_types WHERE scenario_id IN (?)', [ids]);
    await exec(conn, 'DELETE FROM scenarios WHERE id IN (?)', [ids]);
  }

  let created = 0;
  for (const v of VARIANTS) {
    const years = v.years(Number(maxYears));
    let revenue = 0;
    let cost = 0;
    for (const u of priced) {
      revenue += u.rent * v.rentMult * 12 * years;
      cost += u.cost * v.costMult;
    }
    if (!(revenue > cost)) continue;

    const scenarioId = uuid();
    await exec(conn,
      `INSERT INTO scenarios (id, site_id, name, notes, rental_period_years, is_auto_scenario, created_by) VALUES (?,?,?,?,?,1,?)`,
      [scenarioId, siteId, v.name, v.notes, years, userId]);
    created++;

    await exec(conn, `INSERT INTO scenario_construction_costs (id, scenario_id, code, name, gold_grams_per_m2)
      SELECT UUID(), ?, code, name, gold_grams_per_m2 * ? FROM project_construction_costs WHERE project_id = ?`,
      [scenarioId, v.costMult, projectId]);
    await exec(conn, `INSERT INTO scenario_housing_types (id, scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
      SELECT UUID(), ?, code, name, category, default_area_m2, default_cost_type, default_rent_monthly * ? FROM project_housing_types WHERE project_id = ?`,
      [scenarioId, v.rentMult, projectId]);
    await exec(conn, `INSERT INTO scenario_equipment_utility_types (id, scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
      SELECT UUID(), ?, code, name, category, land_area_m2, building_occupation_pct, cost_type FROM project_equipment_utility_types WHERE project_id = ?`,
      [scenarioId, projectId]);
  }

  if (created === 0) {
    return { success: false, message: 'No profitable scenarios could be generated. All scenarios had costs exceeding expected revenue.' };
  }
  return { success: true, message: `Successfully generated ${created} profitable auto-scenario(s)` };
}

export interface PricedUnit { code: string; rent: number; cost: number; area: number }

/** Expand a site's blocks into priced housing units (rent per month, construction cost). */
export async function priceSiteUnits(conn: Conn, siteId: string, housing: any[], costs: any[], usdPerGram: number): Promise<PricedUnit[]> {
  const rows = await q(conn,
    `SELECT hb.type AS hb_type, hb.villa_layout, hb.apartment_layout, u.unit_type, u.building_type
       FROM half_blocks hb
       JOIN blocks b ON b.id = hb.block_id
       LEFT JOIN units u ON u.half_block_id = hb.id
      WHERE b.site_id = ?`, [siteId]);
  const price = (code: string): PricedUnit | null => {
    const ph = housing.find(h => h.code === code);
    const def = HOUSING_TYPE_DEFAULTS[code];
    if (!ph && !def) return null;
    const area = Number(ph?.default_area_m2 ?? def?.area ?? 100);
    const rent = Number(ph?.default_rent_monthly ?? def?.rent ?? 0);
    const costType = ph?.default_cost_type ?? def?.costType ?? 'ZME';
    const pc = costs.find(c => c.code === costType);
    const gg = Number(pc?.gold_grams_per_m2 ?? CONSTRUCTION_COST_DEFAULTS[costType] ?? 14.91);
    return { code, rent, area, cost: area * gg * usdPerGram };
  };
  const out: PricedUnit[] = [];
  const apartmentBuildings = new Map<string, number>(); // apartment_layout → building count
  for (const r of rows) {
    if (r.hb_type === 'villas' && r.villa_layout && r.unit_type === 'villa' && r.building_type) {
      const p = price(r.building_type); if (p) out.push(p);
    } else if (r.hb_type === 'apartments' && r.apartment_layout && r.unit_type === 'apartment') {
      apartmentBuildings.set(r.apartment_layout, (apartmentBuildings.get(r.apartment_layout) || 0) + 1);
    }
  }
  for (const [layout, n] of apartmentBuildings) {
    for (const [code, perBuilding] of Object.entries(APARTMENT_BUILDING_UNITS[layout] || {})) {
      const p = price(code); if (!p) continue;
      for (let i = 0; i < perBuilding * n; i++) out.push(p);
    }
  }
  return out;
}
