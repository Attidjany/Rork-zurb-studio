import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateText } from "@rork-ai/toolkit-sdk";
import { createClient } from "@supabase/supabase-js";

const app = new Hono();

app.use("*", cors());

app.use("*", async (c, next) => {
  console.log(`[Hono] Incoming request: ${c.req.method} ${c.req.url}`);
  console.log(`[Hono] Path: ${c.req.path}`);
  await next();
});

console.log('[Hono] Starting server...');
console.log('[Hono] Environment check:', {
  hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  nodeEnv: process.env.NODE_ENV,
});

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[Hono] ERROR: Missing required Supabase environment variables');
}

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    message: "ZURB API is healthy",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
    },
  });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "ZURB API is running" });
});

app.onError((err, c) => {
  console.error('[Hono] Unhandled error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

app.notFound((c) => {
  console.log(`[Hono] 404 Not Found: ${c.req.method} ${c.req.path}`);
  return c.json({ error: 'Not Found', path: c.req.path, methods: c.req.method }, 404);
});

app.post("/api/ai/generate-scenarios-object", async (c) => {
  try {
    const body = await c.req.json();
    const { prompt } = body;

    if (!prompt) {
      return c.json({ error: "Prompt is required" }, 400);
    }

    console.log('[AI Scenarios Object] Generating object with prompt length:', prompt.length);

    const result = await generateText({
      messages: [{ role: 'user', content: prompt + "\n\nReturn ONLY a valid JSON object matching the schema. Do not include markdown formatting or explanations outside the JSON." }],
    });

    console.log('[AI Scenarios Object] AI Response received, length:', result.length);

    let parsedResponse;
    try {
      let jsonText = result.trim();
      
      const jsonMatch = result.match(/\{[\s\S]*"scenarios"[\s\S]*\}/s);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      console.log('[AI Scenarios Object] Attempting to parse JSON');
      parsedResponse = JSON.parse(jsonText);
      
      // Validate structure loosely
      if (!parsedResponse.scenarios || !Array.isArray(parsedResponse.scenarios)) {
        throw new Error('Invalid response structure: missing scenarios array');
      }
    } catch (e: any) {
      console.error('[AI Scenarios Object] Failed to parse AI response:', e);
      console.error('[AI Scenarios Object] Raw response:', result);
      return c.json({ 
        error: 'AI returned invalid response format. Please try again.',
        details: e.message,
        rawResponse: result.substring(0, 500)
      }, 500);
    }

    return c.json(parsedResponse);
  } catch (error: any) {
    console.error('[AI Scenarios Object] Error:', error);
    return c.json({ error: error.message || 'Failed to generate scenarios' }, 500);
  }
});

app.post("/api/scenarios/generate-intelligent", async (c) => {
  try {
    console.log('[AI Scenarios] Request received');

    const supabase = getSupabase();
    if (!supabase) {
      console.error('[AI Scenarios] Missing Supabase credentials');
      return c.json({ error: 'Server configuration error: Missing database credentials' }, 500);
    }

    const body = await c.req.json();
    const { siteId, userId } = body;

    if (!siteId || !userId) {
      return c.json({ error: "siteId and userId are required" }, 400);
    }

    console.log('[AI Scenarios] Starting intelligent generation for site:', siteId);

    const { data: site } = await supabase
      .from('sites')
      .select('*, projects(*)')
      .eq('id', siteId)
      .single();

    if (!site) {
      return c.json({ error: 'Site not found' }, 404);
    }

    const project = site.projects;

    const { data: blocks } = await supabase
      .from('blocks')
      .select('*, half_blocks(*, units(*))')
      .eq('site_id', siteId)
      .order('block_number', { ascending: true });

    const { data: accountSettings } = await supabase
      .from('account_settings')
      .select('*, account_housing_types(*), account_construction_costs(*), account_equipment_utility_types(*), account_occupancy_rates(*)')
      .eq('user_id', userId)
      .single();

    const goldPrice = accountSettings?.gold_price_per_oz || 3000;
    const usdPerGram = goldPrice / 31.1034768;
    const xofPerUsd = 656;
    const gramsPerOz = 85;

    let unitsBreakdown = '';
    let totalUnits = 0;
    const unitTypes: { [key: string]: number } = {};

    blocks?.forEach((block: any) => {
      block.half_blocks?.forEach((hb: any) => {
        if (hb.type === 'villas') {
          hb.units?.forEach((unit: any) => {
            if (unit.unit_type === 'villa') {
              totalUnits++;
              const villaType = unit.building_type || 'BMS';
              unitTypes[villaType] = (unitTypes[villaType] || 0) + 1;
            }
          });
        } else if (hb.type === 'apartments') {
          const buildings = hb.units?.filter((u: any) => u.unit_type === 'apartment').length || 0;
          const layoutConfig = hb.apartment_layout;
          
          if (layoutConfig && buildings > 0) {
            const unitsPerBuilding: { [key: string]: number } = {};
            
            if (layoutConfig === 'A3') unitsPerBuilding['F3'] = 10;
            else if (layoutConfig === 'A3B') unitsPerBuilding['F3'] = 12;
            else if (layoutConfig === 'A4') unitsPerBuilding['F4'] = 12;
            else if (layoutConfig === 'A4B') unitsPerBuilding['F4'] = 15;
            else if (layoutConfig === 'A5') unitsPerBuilding['F5'] = 15;
            
            Object.entries(unitsPerBuilding).forEach(([type, perBuilding]) => {
              const total = perBuilding * buildings;
              totalUnits += total;
              unitTypes[type] = (unitTypes[type] || 0) + total;
            });
          }
        }
      });
    });

    Object.entries(unitTypes).forEach(([type, count]) => {
      const housingType = accountSettings?.account_housing_types?.find((h: any) => h.code === type);
      const area = housingType?.default_area_m2 || 100;
      const defaultRent = housingType?.default_rent_monthly || 500000;
      const costType = housingType?.default_cost_type || 'ZME';
      const costParam = accountSettings?.account_construction_costs?.find((c: any) => c.code === costType);
      const costPerM2 = costParam ? costParam.gold_grams_per_m2 * gramsPerOz * usdPerGram * xofPerUsd : 100000;
      
      unitsBreakdown += `\n- ${type}: ${count} units, ${area}m² each, default rent ${defaultRent} XOF/month, construction cost ~${(area * costPerM2).toFixed(0)} XOF per unit`;
    });

    const maxRentalPeriod = project.max_rental_period_years || 20;

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

BE CREATIVE AND ANALYTICAL:
- Consider market dynamics: longer periods need lower rents to attract buyers
- Balance construction quality with market expectations
- For "Most Profitable": Consider premium quality justifying higher rents
- For "Lowest Rent": Find the minimum rent that still covers costs + margin
- For "Balanced": Find optimal trade-offs

Return a JSON object with this EXACT structure:
{
  "scenarios": [
    {
      "name": "Most Profitable",
      "rentalPeriodYears": <number between 5 and ${maxRentalPeriod}>,
      "strategy": "<2-3 sentence explanation of your strategy and thought process>",
      "rentAdjustments": {
        "<unit_type>": <multiplier like 1.2 for +20% or 0.85 for -15%>,
        ...
      },
      "costAdjustment": <multiplier like 1.15 for premium quality or 0.9 for economical>,
      "expectedRevenue": <calculated total>,
      "expectedCosts": <calculated total>,
      "profitMargin": <percentage>
    },
    // ... two more scenarios
  ]
}

Think step-by-step and be bold in your recommendations. The goal is to find truly profitable scenarios, not just apply arbitrary percentages.`;

    console.log('[AI Scenarios] Sending prompt to AI...');
    
    // Simulate AI delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    const aiResponse = await generateText({
      messages: [{ role: "user", content: aiPrompt }]
    });

    console.log('[AI Scenarios] AI Response received, length:', aiResponse.length);

    let parsedResponse;
    try {
      let jsonText = aiResponse.trim();
      
      const jsonMatch = aiResponse.match(/\{[\s\S]*"scenarios"[\s\S]*\}/s);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      console.log('[AI Scenarios] Attempting to parse JSON, length:', jsonText.length);
      parsedResponse = JSON.parse(jsonText);
      
      if (!parsedResponse.scenarios || !Array.isArray(parsedResponse.scenarios)) {
        throw new Error('Invalid response structure: missing scenarios array');
      }
    } catch (e: any) {
      console.error('[AI Scenarios] Failed to parse AI response:', e);
      console.error('[AI Scenarios] Raw response:', aiResponse);
      return c.json({ 
        error: 'AI returned invalid response format. Please try again.',
        details: e.message,
        rawResponse: aiResponse.substring(0, 500)
      }, 500);
    }

    const { data: existingAutoScenarios } = await supabase
      .from('scenarios')
      .select('id')
      .eq('site_id', siteId)
      .eq('is_auto_scenario', true);

    if (existingAutoScenarios && existingAutoScenarios.length > 0) {
      const scenarioIds = existingAutoScenarios.map(s => s.id);
      
      await supabase
        .from('scenario_construction_costs')
        .delete()
        .in('scenario_id', scenarioIds);
      
      await supabase
        .from('scenario_housing_types')
        .delete()
        .in('scenario_id', scenarioIds);
      
      await supabase
        .from('scenario_equipment_utility_types')
        .delete()
        .in('scenario_id', scenarioIds);
      
      await supabase
        .from('scenarios')
        .delete()
        .in('id', scenarioIds);
    }

    const createdScenarios = [];

    for (const scenario of parsedResponse.scenarios) {
      console.log('[AI Scenarios] Creating scenario:', scenario.name);

      const { data: newScenario, error: scenarioError } = await supabase
        .from('scenarios')
        .insert({
          site_id: siteId,
          name: `AI: ${scenario.name}`,
          notes: scenario.strategy,
          rental_period_years: scenario.rentalPeriodYears,
          is_auto_scenario: true,
          created_by: userId,
        })
        .select()
        .single();

      if (scenarioError || !newScenario) {
        console.error('[AI Scenarios] Error creating scenario:', scenarioError);
        continue;
      }

      const { data: projectCosts } = await supabase
        .from('project_construction_costs')
        .select('*')
        .eq('project_id', project.id);

      if (projectCosts && projectCosts.length > 0) {
        const adjustedCosts = projectCosts.map(cost => ({
          scenario_id: newScenario.id,
          code: cost.code,
          name: cost.name,
          gold_grams_per_m2: cost.gold_grams_per_m2 * (scenario.costAdjustment || 1.0),
        }));

        await supabase
          .from('scenario_construction_costs')
          .insert(adjustedCosts);
      }

      const { data: projectHousing } = await supabase
        .from('project_housing_types')
        .select('*')
        .eq('project_id', project.id);

      if (projectHousing && projectHousing.length > 0) {
        const adjustedHousing = projectHousing.map(housing => {
          const rentMultiplier = scenario.rentAdjustments[housing.code] || 1.0;
          return {
            scenario_id: newScenario.id,
            code: housing.code,
            name: housing.name,
            category: housing.category,
            default_area_m2: housing.default_area_m2,
            default_cost_type: housing.default_cost_type,
            default_rent_monthly: housing.default_rent_monthly * rentMultiplier,
          };
        });

        await supabase
          .from('scenario_housing_types')
          .insert(adjustedHousing);
      }

      const { data: projectEquipment } = await supabase
        .from('project_equipment_utility_types')
        .select('*')
        .eq('project_id', project.id);

      if (projectEquipment && projectEquipment.length > 0) {
        await supabase
          .from('scenario_equipment_utility_types')
          .insert(projectEquipment.map(eq => ({
            scenario_id: newScenario.id,
            code: eq.code,
            name: eq.name,
            category: eq.category,
            land_area_m2: eq.land_area_m2,
            building_occupation_pct: eq.building_occupation_pct,
            cost_type: eq.cost_type,
          })));
      }

      createdScenarios.push({
        id: newScenario.id,
        name: newScenario.name,
        strategy: scenario.strategy,
      });
    }

    return c.json({
      success: true,
      message: `Created ${createdScenarios.length} intelligent scenarios`,
      scenarios: createdScenarios,
    });
  } catch (error: any) {
    console.error('[AI Scenarios] Error:', error);
    return c.json({ error: error.message || 'Failed to generate scenarios' }, 500);
  }
});

export default app;
