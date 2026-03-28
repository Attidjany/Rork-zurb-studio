-- Fix duplicate key error in auto scenarios generation
-- The issue: scenario_construction_costs_scenario_id_code_key constraint violation
-- Solution: Ensure proper cascade deletion and use ON CONFLICT

-- 1. Drop and recreate the function with ON CONFLICT handling
DROP FUNCTION IF EXISTS generate_auto_scenarios(uuid) CASCADE;

CREATE OR REPLACE FUNCTION generate_auto_scenarios(p_site_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_project_id UUID;
  v_max_rental_years INT;
  v_user_id UUID;
  v_scenario_id UUID;
  v_scenarios_created INT := 0;
  v_existing_scenarios UUID[];
BEGIN
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
  
  -- Get IDs of existing auto-scenarios
  SELECT ARRAY_AGG(id) INTO v_existing_scenarios
  FROM scenarios
  WHERE site_id = p_site_id AND is_auto_scenario = TRUE;
  
  -- Delete all child records explicitly to avoid constraint issues
  IF v_existing_scenarios IS NOT NULL THEN
    DELETE FROM scenario_construction_costs
    WHERE scenario_id = ANY(v_existing_scenarios);
    
    DELETE FROM scenario_housing_types
    WHERE scenario_id = ANY(v_existing_scenarios);
    
    DELETE FROM scenario_equipment_utility_types
    WHERE scenario_id = ANY(v_existing_scenarios);
  END IF;
  
  -- Delete the scenarios themselves
  DELETE FROM scenarios
  WHERE site_id = p_site_id
    AND is_auto_scenario = TRUE;
  
  -- Scenario 1: Most Profit
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
  WHERE pcc.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    gold_grams_per_m2 = EXCLUDED.gold_grams_per_m2;
  
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
  WHERE pht.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    default_area_m2 = EXCLUDED.default_area_m2,
    default_cost_type = EXCLUDED.default_cost_type,
    default_rent_monthly = EXCLUDED.default_rent_monthly;
  
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
  WHERE peut.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    land_area_m2 = EXCLUDED.land_area_m2,
    building_occupation_pct = EXCLUDED.building_occupation_pct,
    cost_type = EXCLUDED.cost_type;
  
  -- Scenario 2: Lowest Rents
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
  WHERE pcc.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    gold_grams_per_m2 = EXCLUDED.gold_grams_per_m2;
  
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
  WHERE pht.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    default_area_m2 = EXCLUDED.default_area_m2,
    default_cost_type = EXCLUDED.default_cost_type,
    default_rent_monthly = EXCLUDED.default_rent_monthly;
  
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
  WHERE peut.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    land_area_m2 = EXCLUDED.land_area_m2,
    building_occupation_pct = EXCLUDED.building_occupation_pct,
    cost_type = EXCLUDED.cost_type;
  
  -- Scenario 3: Balanced
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
  WHERE pcc.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    gold_grams_per_m2 = EXCLUDED.gold_grams_per_m2;
  
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
  WHERE pht.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    default_area_m2 = EXCLUDED.default_area_m2,
    default_cost_type = EXCLUDED.default_cost_type,
    default_rent_monthly = EXCLUDED.default_rent_monthly;
  
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
  WHERE peut.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    land_area_m2 = EXCLUDED.land_area_m2,
    building_occupation_pct = EXCLUDED.building_occupation_pct,
    cost_type = EXCLUDED.cost_type;
  
  RETURN QUERY SELECT TRUE, format('Successfully generated %s auto-scenarios', v_scenarios_created)::TEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;
