-- Complete fix for auto-scenario duplicate key errors
-- This removes ALL automatic triggers and ensures manual generation works correctly

-- 1. Drop ALL triggers related to auto-scenarios
DROP TRIGGER IF EXISTS trigger_generate_auto_scenarios_on_half_block_update ON half_blocks;
DROP TRIGGER IF EXISTS trigger_generate_auto_scenarios_on_unit_insert ON units;
DROP TRIGGER IF EXISTS trigger_generate_auto_scenarios_on_unit_update ON units;
DROP TRIGGER IF EXISTS trigger_generate_auto_scenarios_on_half_block_insert ON half_blocks;

-- 2. Drop the automatic check function
DROP FUNCTION IF EXISTS check_and_generate_auto_scenarios() CASCADE;

-- 3. Recreate the generate_auto_scenarios function with proper cleanup
-- This version ensures complete cleanup before generating new scenarios
CREATE OR REPLACE FUNCTION generate_auto_scenarios(p_site_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_project_id UUID;
  v_max_rental_years INT;
  v_user_id UUID;
  v_scenario_id UUID;
  v_scenarios_created INT := 0;
BEGIN
  -- Try to get an advisory lock for this site (will auto-release at transaction end)
  IF NOT pg_try_advisory_xact_lock(hashtext('auto_scenarios_' || p_site_id::text)) THEN
    RETURN QUERY SELECT FALSE, 'Another process is already generating auto-scenarios for this site'::TEXT;
    RETURN;
  END IF;

  -- Get project and user info
  SELECT s.project_id, COALESCE(p.max_rental_period_years, 20), p.owner_id
  INTO v_project_id, v_max_rental_years, v_user_id
  FROM sites s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = p_site_id;
  
  IF v_project_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Site not found'::TEXT;
    RETURN;
  END IF;
  
  -- Delete existing auto-scenarios for this site
  -- CASCADE should handle related records, but we'll be explicit for safety
  DELETE FROM scenario_construction_costs
  WHERE scenario_id IN (
    SELECT id FROM scenarios 
    WHERE site_id = p_site_id AND is_auto_scenario = TRUE
  );
  
  DELETE FROM scenario_housing_types
  WHERE scenario_id IN (
    SELECT id FROM scenarios 
    WHERE site_id = p_site_id AND is_auto_scenario = TRUE
  );
  
  DELETE FROM scenario_equipment_utility_types
  WHERE scenario_id IN (
    SELECT id FROM scenarios 
    WHERE site_id = p_site_id AND is_auto_scenario = TRUE
  );
  
  DELETE FROM scenarios
  WHERE site_id = p_site_id
    AND is_auto_scenario = TRUE;
  
  -- Scenario 1: Most Profit
  -- Max rental period, highest rents (+20%), highest costs (+10%)
  INSERT INTO scenarios (site_id, name, notes, rental_period_years, is_auto_scenario, created_by)
  VALUES (
    p_site_id,
    'Auto: Most Profit',
    'Maximum profit scenario: Longer rental period, premium rents, quality construction',
    v_max_rental_years,
    TRUE,
    v_user_id
  )
  RETURNING id INTO v_scenario_id;
  
  v_scenarios_created := v_scenarios_created + 1;
  
  -- Copy construction costs with +10% adjustment
  INSERT INTO scenario_construction_costs (
    scenario_id, code, name, gold_grams_per_m2
  )
  SELECT
    v_scenario_id,
    pcc.code,
    pcc.name,
    pcc.gold_grams_per_m2 * 1.10
  FROM project_construction_costs pcc
  WHERE pcc.project_id = v_project_id;
  
  -- Copy housing types with +20% rent adjustment
  INSERT INTO scenario_housing_types (
    scenario_id, code, name, category,
    default_area_m2, default_cost_type, default_rent_monthly
  )
  SELECT
    v_scenario_id,
    pht.code,
    pht.name,
    pht.category,
    pht.default_area_m2,
    pht.default_cost_type,
    pht.default_rent_monthly * 1.20
  FROM project_housing_types pht
  WHERE pht.project_id = v_project_id;
  
  -- Copy equipment/utility types
  INSERT INTO scenario_equipment_utility_types (
    scenario_id, code, name, category,
    land_area_m2, building_occupation_pct, cost_type
  )
  SELECT
    v_scenario_id,
    peut.code,
    peut.name,
    peut.category,
    peut.land_area_m2,
    peut.building_occupation_pct,
    peut.cost_type
  FROM project_equipment_utility_types peut
  WHERE peut.project_id = v_project_id;
  
  -- Scenario 2: Lowest Rents
  -- Min rental period (10 years), lowest rents (-20%), lowest costs (-10%)
  INSERT INTO scenarios (site_id, name, notes, rental_period_years, is_auto_scenario, created_by)
  VALUES (
    p_site_id,
    'Auto: Lowest Rents',
    'Affordable scenario: Shorter rental period, reduced rents, economical construction',
    10,
    TRUE,
    v_user_id
  )
  RETURNING id INTO v_scenario_id;
  
  v_scenarios_created := v_scenarios_created + 1;
  
  -- Copy construction costs with -10% adjustment
  INSERT INTO scenario_construction_costs (
    scenario_id, code, name, gold_grams_per_m2
  )
  SELECT
    v_scenario_id,
    pcc.code,
    pcc.name,
    pcc.gold_grams_per_m2 * 0.90
  FROM project_construction_costs pcc
  WHERE pcc.project_id = v_project_id;
  
  -- Copy housing types with -20% rent adjustment
  INSERT INTO scenario_housing_types (
    scenario_id, code, name, category,
    default_area_m2, default_cost_type, default_rent_monthly
  )
  SELECT
    v_scenario_id,
    pht.code,
    pht.name,
    pht.category,
    pht.default_area_m2,
    pht.default_cost_type,
    pht.default_rent_monthly * 0.80
  FROM project_housing_types pht
  WHERE pht.project_id = v_project_id;
  
  -- Copy equipment/utility types
  INSERT INTO scenario_equipment_utility_types (
    scenario_id, code, name, category,
    land_area_m2, building_occupation_pct, cost_type
  )
  SELECT
    v_scenario_id,
    peut.code,
    peut.name,
    peut.category,
    peut.land_area_m2,
    peut.building_occupation_pct,
    peut.cost_type
  FROM project_equipment_utility_types peut
  WHERE peut.project_id = v_project_id;
  
  -- Scenario 3: Balanced
  -- Mid rental period (15 years), standard rents and costs (no adjustment)
  INSERT INTO scenarios (site_id, name, notes, rental_period_years, is_auto_scenario, created_by)
  VALUES (
    p_site_id,
    'Auto: Balanced',
    'Balanced scenario: Moderate rental period, standard market rents, standard construction',
    15,
    TRUE,
    v_user_id
  )
  RETURNING id INTO v_scenario_id;
  
  v_scenarios_created := v_scenarios_created + 1;
  
  -- Copy construction costs with no adjustment
  INSERT INTO scenario_construction_costs (
    scenario_id, code, name, gold_grams_per_m2
  )
  SELECT
    v_scenario_id,
    pcc.code,
    pcc.name,
    pcc.gold_grams_per_m2
  FROM project_construction_costs pcc
  WHERE pcc.project_id = v_project_id;
  
  -- Copy housing types with no rent adjustment
  INSERT INTO scenario_housing_types (
    scenario_id, code, name, category,
    default_area_m2, default_cost_type, default_rent_monthly
  )
  SELECT
    v_scenario_id,
    pht.code,
    pht.name,
    pht.category,
    pht.default_area_m2,
    pht.default_cost_type,
    pht.default_rent_monthly
  FROM project_housing_types pht
  WHERE pht.project_id = v_project_id;
  
  -- Copy equipment/utility types
  INSERT INTO scenario_equipment_utility_types (
    scenario_id, code, name, category,
    land_area_m2, building_occupation_pct, cost_type
  )
  SELECT
    v_scenario_id,
    peut.code,
    peut.name,
    peut.category,
    peut.land_area_m2,
    peut.building_occupation_pct,
    peut.cost_type
  FROM project_equipment_utility_types peut
  WHERE peut.project_id = v_project_id;
  
  RETURN QUERY SELECT TRUE, format('Successfully generated %s auto-scenarios', v_scenarios_created)::TEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 4. Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_scenarios_site_auto ON scenarios(site_id, is_auto_scenario);
CREATE INDEX IF NOT EXISTS idx_scenario_construction_costs_scenario_code ON scenario_construction_costs(scenario_id, code);
CREATE INDEX IF NOT EXISTS idx_scenario_housing_types_scenario_code ON scenario_housing_types(scenario_id, code);
CREATE INDEX IF NOT EXISTS idx_scenario_equipment_utility_types_scenario_code ON scenario_equipment_utility_types(scenario_id, code);
