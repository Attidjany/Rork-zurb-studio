-- Fix duplicate key issues in auto-scenario generation

-- Add a lock mechanism to prevent concurrent execution
CREATE OR REPLACE FUNCTION generate_auto_scenarios(p_site_id UUID)
RETURNS VOID AS $$
DECLARE
  v_project_id UUID;
  v_max_rental_years INT;
  v_user_id UUID;
  v_scenario_id UUID;
  v_project_construction_cost RECORD;
  v_project_housing_type RECORD;
  v_project_equipment_utility RECORD;
BEGIN
  -- Try to get an advisory lock for this site
  -- If we can't get it, another process is already generating, so exit
  IF NOT pg_try_advisory_xact_lock(hashtext(p_site_id::text)) THEN
    RAISE NOTICE 'Another process is already generating auto-scenarios for site %', p_site_id;
    RETURN;
  END IF;

  -- Get project and user info
  SELECT s.project_id, p.max_rental_period_years, p.owner_id
  INTO v_project_id, v_max_rental_years, v_user_id
  FROM sites s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = p_site_id;
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;
  
  -- Delete existing auto-scenarios for this site
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
  
  -- Copy construction costs with +10% adjustment
  FOR v_project_construction_cost IN
    SELECT * FROM project_construction_costs
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_construction_costs (
      scenario_id, code, name, gold_grams_per_m2
    ) VALUES (
      v_scenario_id,
      v_project_construction_cost.code,
      v_project_construction_cost.name,
      v_project_construction_cost.gold_grams_per_m2 * 1.10
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      gold_grams_per_m2 = EXCLUDED.gold_grams_per_m2;
  END LOOP;
  
  -- Copy housing types with +20% rent adjustment
  FOR v_project_housing_type IN
    SELECT * FROM project_housing_types
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_housing_types (
      scenario_id, code, name, category,
      default_area_m2, default_cost_type, default_rent_monthly
    ) VALUES (
      v_scenario_id,
      v_project_housing_type.code,
      v_project_housing_type.name,
      v_project_housing_type.category,
      v_project_housing_type.default_area_m2,
      v_project_housing_type.default_cost_type,
      v_project_housing_type.default_rent_monthly * 1.20
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      default_area_m2 = EXCLUDED.default_area_m2,
      default_cost_type = EXCLUDED.default_cost_type,
      default_rent_monthly = EXCLUDED.default_rent_monthly;
  END LOOP;
  
  -- Copy equipment/utility types with +10% cost adjustment
  FOR v_project_equipment_utility IN
    SELECT * FROM project_equipment_utility_types
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_equipment_utility_types (
      scenario_id, code, name, category,
      land_area_m2, building_occupation_pct, cost_type
    ) VALUES (
      v_scenario_id,
      v_project_equipment_utility.code,
      v_project_equipment_utility.name,
      v_project_equipment_utility.category,
      v_project_equipment_utility.land_area_m2,
      v_project_equipment_utility.building_occupation_pct,
      v_project_equipment_utility.cost_type
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      land_area_m2 = EXCLUDED.land_area_m2,
      building_occupation_pct = EXCLUDED.building_occupation_pct,
      cost_type = EXCLUDED.cost_type;
  END LOOP;
  
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
  
  -- Copy construction costs with -10% adjustment
  FOR v_project_construction_cost IN
    SELECT * FROM project_construction_costs
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_construction_costs (
      scenario_id, code, name, gold_grams_per_m2
    ) VALUES (
      v_scenario_id,
      v_project_construction_cost.code,
      v_project_construction_cost.name,
      v_project_construction_cost.gold_grams_per_m2 * 0.90
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      gold_grams_per_m2 = EXCLUDED.gold_grams_per_m2;
  END LOOP;
  
  -- Copy housing types with -20% rent adjustment
  FOR v_project_housing_type IN
    SELECT * FROM project_housing_types
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_housing_types (
      scenario_id, code, name, category,
      default_area_m2, default_cost_type, default_rent_monthly
    ) VALUES (
      v_scenario_id,
      v_project_housing_type.code,
      v_project_housing_type.name,
      v_project_housing_type.category,
      v_project_housing_type.default_area_m2,
      v_project_housing_type.default_cost_type,
      v_project_housing_type.default_rent_monthly * 0.80
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      default_area_m2 = EXCLUDED.default_area_m2,
      default_cost_type = EXCLUDED.default_cost_type,
      default_rent_monthly = EXCLUDED.default_rent_monthly;
  END LOOP;
  
  -- Copy equipment/utility types with -10% cost adjustment
  FOR v_project_equipment_utility IN
    SELECT * FROM project_equipment_utility_types
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_equipment_utility_types (
      scenario_id, code, name, category,
      land_area_m2, building_occupation_pct, cost_type
    ) VALUES (
      v_scenario_id,
      v_project_equipment_utility.code,
      v_project_equipment_utility.name,
      v_project_equipment_utility.category,
      v_project_equipment_utility.land_area_m2,
      v_project_equipment_utility.building_occupation_pct,
      v_project_equipment_utility.cost_type
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      land_area_m2 = EXCLUDED.land_area_m2,
      building_occupation_pct = EXCLUDED.building_occupation_pct,
      cost_type = EXCLUDED.cost_type;
  END LOOP;
  
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
  
  -- Copy construction costs with no adjustment
  FOR v_project_construction_cost IN
    SELECT * FROM project_construction_costs
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_construction_costs (
      scenario_id, code, name, gold_grams_per_m2
    ) VALUES (
      v_scenario_id,
      v_project_construction_cost.code,
      v_project_construction_cost.name,
      v_project_construction_cost.gold_grams_per_m2
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      gold_grams_per_m2 = EXCLUDED.gold_grams_per_m2;
  END LOOP;
  
  -- Copy housing types with no rent adjustment
  FOR v_project_housing_type IN
    SELECT * FROM project_housing_types
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_housing_types (
      scenario_id, code, name, category,
      default_area_m2, default_cost_type, default_rent_monthly
    ) VALUES (
      v_scenario_id,
      v_project_housing_type.code,
      v_project_housing_type.name,
      v_project_housing_type.category,
      v_project_housing_type.default_area_m2,
      v_project_housing_type.default_cost_type,
      v_project_housing_type.default_rent_monthly
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      default_area_m2 = EXCLUDED.default_area_m2,
      default_cost_type = EXCLUDED.default_cost_type,
      default_rent_monthly = EXCLUDED.default_rent_monthly;
  END LOOP;
  
  -- Copy equipment/utility types with no cost adjustment
  FOR v_project_equipment_utility IN
    SELECT * FROM project_equipment_utility_types
    WHERE project_id = v_project_id
  LOOP
    INSERT INTO scenario_equipment_utility_types (
      scenario_id, code, name, category,
      land_area_m2, building_occupation_pct, cost_type
    ) VALUES (
      v_scenario_id,
      v_project_equipment_utility.code,
      v_project_equipment_utility.name,
      v_project_equipment_utility.category,
      v_project_equipment_utility.land_area_m2,
      v_project_equipment_utility.building_occupation_pct,
      v_project_equipment_utility.cost_type
    )
    ON CONFLICT (scenario_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      land_area_m2 = EXCLUDED.land_area_m2,
      building_occupation_pct = EXCLUDED.building_occupation_pct,
      cost_type = EXCLUDED.cost_type;
  END LOOP;
  
  RAISE NOTICE 'Generated 3 auto-scenarios for site %', p_site_id;
END;
$$ LANGUAGE plpgsql;
