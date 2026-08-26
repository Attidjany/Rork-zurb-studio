/**
 * AI endpoints — replaces the Rork toolkit SDK with the Anthropic SDK.
 *   POST /api/ai/generate-text              { messages:[{role,content}] } → { text }
 *   POST /api/ai/generate-scenarios-object  { prompt } → parsed { scenarios: [...] }
 *   POST /api/scenarios/generate-intelligent { siteId } → creates 3 AI scenarios for the site
 */
import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import { AuthEnv, requireAuth } from './auth.js';
import { getPool, q, exec, uuid, withTx } from './db.js';
import { ownerPredicate } from './registry.js';
import { APARTMENT_BUILDING_UNITS, CONSTRUCTION_COST_DEFAULTS, HOUSING_TYPE_DEFAULTS } from './typologies.js';

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-opus-5';
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export async function generateText(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('AI is not configured on the server (ANTHROPIC_API_KEY missing)');
  const response = await anthropic().beta.messages.create({
    model: MODEL(),
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: 'You are a real-estate financial analyst for urban housing developments in West Africa. When asked for JSON, reply with only the JSON object — no markdown fences, no commentary.',
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  } as any);
  if (response.stop_reason === 'refusal') throw new Error('The AI declined this request.');
  return response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
}

function extractJson(text: string): any {
  let s = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const m = s.match(/\{[\s\S]*"scenarios"[\s\S]*\}/);
  if (m) s = m[0];
  const parsed = JSON.parse(s);
  if (!parsed.scenarios || !Array.isArray(parsed.scenarios)) throw new Error('Invalid response structure: missing scenarios array');
  return parsed;
}

export const aiRoutes = new Hono<AuthEnv>();
aiRoutes.use('*', requireAuth);

aiRoutes.post('/ai/generate-text', async c => {
  const body = await c.req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : body.prompt ? [{ role: 'user', content: String(body.prompt) }] : [];
  if (!messages.length) return c.json({ error: 'messages or prompt is required' }, 400);
  try {
    const text = await generateText(messages);
    return c.json({ text });
  } catch (e: any) {
    console.error('[ai] generate-text failed:', e?.message || e);
    return c.json({ error: e?.message || 'AI generation failed' }, 500);
  }
});

aiRoutes.post('/ai/generate-scenarios-object', async c => {
  const body = await c.req.json().catch(() => ({}));
  const prompt = String(body.prompt || '');
  if (!prompt) return c.json({ error: 'Prompt is required' }, 400);
  let text = '';
  try {
    text = await generateText([{ role: 'user', content: prompt + '\n\nReturn ONLY a valid JSON object matching the schema. Do not include markdown formatting or explanations outside the JSON.' }]);
    return c.json(extractJson(text));
  } catch (e: any) {
    console.error('[ai] generate-scenarios-object failed:', e?.message || e);
    if (text) return c.json({ error: 'AI returned invalid response format. Please try again.', details: e.message, rawResponse: text.substring(0, 500) }, 500);
    return c.json({ error: e?.message || 'Failed to generate scenarios' }, 500);
  }
});

// Port of /api/scenarios/generate-intelligent from the old Hono backend.
aiRoutes.post('/scenarios/generate-intelligent', async c => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const siteId = String(body.siteId || '');
  if (!siteId) return c.json({ error: 'siteId is required' }, 400);
  const pool = getPool();
  const owner = ownerPredicate('sites');
  const sites = await q(pool, `SELECT * FROM sites WHERE sites.id = ? AND ${owner.sql}`, [siteId, user.id]);
  if (!sites.length) return c.json({ error: 'Site not found' }, 404);
  const site = sites[0];
  const [project] = await q(pool, 'SELECT * FROM projects WHERE id = ?', [site.project_id]);

  const blocks = await q(pool, 'SELECT * FROM blocks WHERE site_id = ? ORDER BY block_number', [siteId]);
  const halfBlocks = blocks.length ? await q(pool, 'SELECT * FROM half_blocks WHERE block_id IN (?)', [blocks.map(b => b.id)]) : [];
  const units = halfBlocks.length ? await q(pool, 'SELECT * FROM units WHERE half_block_id IN (?)', [halfBlocks.map(h => h.id)]) : [];
  const [settings] = await q(pool, 'SELECT * FROM account_settings WHERE user_id = ?', [user.id]);
  const housingTypes = settings ? await q(pool, 'SELECT * FROM account_housing_types WHERE account_settings_id = ?', [settings.id]) : [];
  const constructionCosts = settings ? await q(pool, 'SELECT * FROM account_construction_costs WHERE account_settings_id = ?', [settings.id]) : [];

  const goldPrice = Number(settings?.gold_price_per_oz || 3000);
  const usdPerGram = goldPrice / 31.1034768;
  const xofPerUsd = 656;

  let unitsBreakdown = '';
  let totalUnits = 0;
  const unitTypes: Record<string, number> = {};
  for (const hb of halfBlocks) {
    const hbUnits = units.filter(u => u.half_block_id === hb.id);
    if (hb.type === 'villas') {
      for (const u of hbUnits) if (u.unit_type === 'villa' && u.building_type) { totalUnits++; unitTypes[u.building_type] = (unitTypes[u.building_type] || 0) + 1; }
    } else if (hb.type === 'apartments' && hb.apartment_layout) {
      const buildings = hbUnits.filter(u => u.unit_type === 'apartment').length;
      for (const [t, n] of Object.entries(APARTMENT_BUILDING_UNITS[hb.apartment_layout] || {})) { const total = n * buildings; totalUnits += total; unitTypes[t] = (unitTypes[t] || 0) + total; }
    }
  }
  const projectHousing = await q(pool, 'SELECT * FROM project_housing_types WHERE project_id = ?', [project.id]);
  const projectCosts = await q(pool, 'SELECT * FROM project_construction_costs WHERE project_id = ?', [project.id]);
  for (const [type, count] of Object.entries(unitTypes)) {
    const ht = projectHousing.find(h => h.code === type) || housingTypes.find(h => h.code === type);
    const area = Number(ht?.default_area_m2 || HOUSING_TYPE_DEFAULTS[type]?.area || 100);
    const rent = Number(ht?.default_rent_monthly || HOUSING_TYPE_DEFAULTS[type]?.rent || 500000);
    const costType = ht?.default_cost_type || HOUSING_TYPE_DEFAULTS[type]?.costType || 'ZME';
    const cp = projectCosts.find(x => x.code === costType) || constructionCosts.find(x => x.code === costType);
    const costPerM2 = Number(cp?.gold_grams_per_m2 || CONSTRUCTION_COST_DEFAULTS[costType] || 14.91) * usdPerGram * xofPerUsd;
    unitsBreakdown += `\n- ${type}: ${count} units, ${area}m² each, default rent ${rent} XOF/month, construction cost ~${(area * costPerM2).toFixed(0)} XOF per unit`;
  }
  const maxRentalPeriod = Number(project?.max_rental_period_years || 20);

  const aiPrompt = `You are an intelligent real estate financial advisor analyzing a housing development project in West Africa.

PROJECT CONTEXT:
- Site Area: ${site.area_ha} hectares
- Total Residential Units: ${totalUnits}
- Max Rental Period: ${maxRentalPeriod} years
- Gold Price (used for cost calculation): ${goldPrice} USD/oz
- Currency: XOF (West African CFA Franc), 1 USD = ${xofPerUsd} XOF

UNIT BREAKDOWN:${unitsBreakdown}

YOUR TASK:
Analyze this project and generate THREE distinct profitable scenarios:

1. **Most Profitable Scenario** - Maximize returns while ensuring profitability
2. **Lowest Rent Scenario** - Make housing affordable while maintaining profit
3. **Balanced Scenario** - Optimize between profit and affordability

For EACH scenario, you must:
1. Set a rental period (between 5 and ${maxRentalPeriod} years)
2. Adjust monthly rents for each unit type (you can go +/- 50% from default)
3. Adjust construction costs (you can go +/- 30% from default by changing quality)
4. **CRITICAL**: Calculate total revenue (all rents × 12 months × rental period) and total costs
5. **CRITICAL**: Ensure revenue > costs for profitability
6. Explain your strategic thinking - WHY these numbers create the desired outcome. explicitly calling it "thought process".

Return a JSON object with this EXACT structure:
{
  "scenarios": [
    {
      "name": "Most Profitable",
      "rentalPeriodYears": <number between 5 and ${maxRentalPeriod}>,
      "strategy": "<2-3 sentence explanation of your strategy and thought process>",
      "rentAdjustments": { "<unit_type>": <multiplier like 1.2 for +20% or 0.85 for -15%>, ... },
      "costAdjustment": <multiplier like 1.15 for premium quality or 0.9 for economical>,
      "expectedRevenue": <calculated total>,
      "expectedCosts": <calculated total>,
      "profitMargin": <percentage>
    }
    // ... two more scenarios
  ]
}`;

  let parsed: any;
  let raw = '';
  try {
    raw = await generateText([{ role: 'user', content: aiPrompt }]);
    parsed = extractJson(raw);
  } catch (e: any) {
    console.error('[ai] generate-intelligent failed:', e?.message || e);
    if (raw) return c.json({ error: 'AI returned invalid response format. Please try again.', details: e.message, rawResponse: raw.substring(0, 500) }, 500);
    return c.json({ error: e?.message || 'Failed to generate scenarios' }, 500);
  }

  const created: { id: string; name: string; strategy: string }[] = [];
  await withTx(async conn => {
    const existing = await q(conn, 'SELECT id FROM scenarios WHERE site_id = ? AND is_auto_scenario = 1', [siteId]);
    if (existing.length) await exec(conn, 'DELETE FROM scenarios WHERE id IN (?)', [existing.map(r => r.id)]);
    const pcc = await q(conn, 'SELECT * FROM project_construction_costs WHERE project_id = ?', [project.id]);
    const pht = await q(conn, 'SELECT * FROM project_housing_types WHERE project_id = ?', [project.id]);
    const peut = await q(conn, 'SELECT * FROM project_equipment_utility_types WHERE project_id = ?', [project.id]);
    for (const s of parsed.scenarios) {
      const id = uuid();
      await exec(conn, 'INSERT INTO scenarios (id, site_id, name, notes, rental_period_years, is_auto_scenario, created_by) VALUES (?,?,?,?,?,1,?)',
        [id, siteId, `AI: ${s.name}`, s.strategy || null, Number(s.rentalPeriodYears) || maxRentalPeriod, user.id]);
      const costAdj = Number(s.costAdjustment) || 1;
      for (const cc of pcc) await exec(conn, 'INSERT INTO scenario_construction_costs (id, scenario_id, code, name, gold_grams_per_m2) VALUES (?,?,?,?,?)',
        [uuid(), id, cc.code, cc.name, Number(cc.gold_grams_per_m2) * costAdj]);
      for (const h of pht) {
        const mult = Number(s.rentAdjustments?.[h.code]) || 1;
        await exec(conn, 'INSERT INTO scenario_housing_types (id, scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly) VALUES (?,?,?,?,?,?,?,?)',
          [uuid(), id, h.code, h.name, h.category, h.default_area_m2, h.default_cost_type, Number(h.default_rent_monthly) * mult]);
      }
      for (const e of peut) await exec(conn, 'INSERT INTO scenario_equipment_utility_types (id, scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type) VALUES (?,?,?,?,?,?,?,?)',
        [uuid(), id, e.code, e.name, e.category, e.land_area_m2, e.building_occupation_pct, e.cost_type]);
      created.push({ id, name: `AI: ${s.name}`, strategy: s.strategy });
    }
  });
  return c.json({
    success: true, message: `Created ${created.length} intelligent scenarios`, scenarios: created,
    changed: ['scenarios', 'scenario_construction_costs', 'scenario_housing_types', 'scenario_equipment_utility_types'],
  });
});
