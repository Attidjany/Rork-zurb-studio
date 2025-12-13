-- Update auto-scenarios generation to only create profitable scenarios
-- Revenue must be higher than costs

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
  v_total_revenue NUMERIC;
  v_total_cost NUMERIC;
  v_gold_price_usd NUMERIC;
  v_usd_per_gram NUMERIC;
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
  
  -- Get current gold price (fetch from account settings or use default)
  SELECT COALESCE(
    (SELECT gold_price_per_oz FROM account_settings WHERE user_id = v_user_id LIMIT 1),
    3000
  ) INTO v_gold_price_usd;
  
  v_usd_per_gram := v_gold_price_usd / 31.1034768;
  
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
  -- Max rental period, highest rents (+20%), highest costs (+10%)
  -- Calculate expected revenue and costs
  SELECT 
    SUM(
      CASE 
        WHEN u.unit_type LIKE 'villa_%' THEN 
          COALESCE(aht.default_rent_monthly, 0) * 1.20 * 12 * v_max_rental_years
        WHEN hb.type = 'apartments' THEN
          COALESCE(aht.default_rent_monthly, 0) * 1.20 * 12 * v_max_rental_years
        ELSE 0
      END
    ),
    SUM(
      CASE 
        WHEN u.unit_type LIKE 'villa_%' THEN 
          COALESCE(aht.default_area_m2, 0) * COALESCE(acc.gold_grams_per_m2, 0) * v_usd_per_gram * 1.10
        WHEN hb.type = 'apartments' THEN
          COALESCE(aht.default_area_m2, 0) * COALESCE(acc.gold_grams_per_m2, 0) * v_usd_per_gram * 1.10
        WHEN hb.type = 'apartments' AND u.building_type IN ('equipment', 'utility') THEN
          COALESCE(aeut.land_area_m2, 0) * COALESCE(aeut.building_occupation_pct, 0) / 100 * 
          COALESCE(acc_eq.gold_grams_per_m2, 0) * v_usd_per_gram * 1.10
        ELSE 0
      END
    )
  INTO v_total_revenue, v_total_cost
  FROM units u
  JOIN half_blocks hb ON hb.id = u.half_block_id
  JOIN blocks b ON b.id = hb.block_id
  LEFT JOIN account_settings asett ON asett.user_id = v_user_id
  LEFT JOIN account_housing_types aht ON aht.account_settings_id = asett.id 
    AND aht.code = u.unit_type
  LEFT JOIN account_construction_costs acc ON acc.account_settings_id = asett.id 
    AND acc.code = aht.default_cost_type
  LEFT JOIN account_equipment_utility_types aeut ON aeut.account_settings_id = asett.id 
    AND aeut.code = u.unit_type
  LEFT JOIN account_construction_costs acc_eq ON acc_eq.account_settings_id = asett.id 
    AND acc_eq.code = aeut.cost_type
  WHERE b.site_id = p_site_id;
  
  -- Only create scenario if revenue > costs
  IF v_total_revenue > v_total_cost THEN
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
  END IF;
  
  -- Scenario 2: Lowest Rents (10 years)
  SELECT 
    SUM(
      CASE 
        WHEN u.unit_type LIKE 'villa_%' THEN 
          COALESCE(aht.default_rent_monthly, 0) * 0.80 * 12 * 10
        WHEN hb.type = 'apartments' THEN
          COALESCE(aht.default_rent_monthly, 0) * 0.80 * 12 * 10
        ELSE 0
      END
    ),
    SUM(
      CASE 
        WHEN u.unit_type LIKE 'villa_%' THEN 
          COALESCE(aht.default_area_m2, 0) * COALESCE(acc.gold_grams_per_m2, 0) * v_usd_per_gram * 0.90
        WHEN hb.type = 'apartments' THEN
          COALESCE(aht.default_area_m2, 0) * COALESCE(acc.gold_grams_per_m2, 0) * v_usd_per_gram * 0.90
        WHEN hb.type = 'apartments' AND u.building_type IN ('equipment', 'utility') THEN
          COALESCE(aeut.land_area_m2, 0) * COALESCE(aeut.building_occupation_pct, 0) / 100 * 
          COALESCE(acc_eq.gold_grams_per_m2, 0) * v_usd_per_gram * 0.90
        ELSE 0
      END
    )
  INTO v_total_revenue, v_total_cost
  FROM units u
  JOIN half_blocks hb ON hb.id = u.half_block_id
  JOIN blocks b ON b.id = hb.block_id
  LEFT JOIN account_settings asett ON asett.user_id = v_user_id
  LEFT JOIN account_housing_types aht ON aht.account_settings_id = asett.id 
    AND aht.code = u.unit_type
  LEFT JOIN account_construction_costs acc ON acc.account_settings_id = asett.id 
    AND acc.code = aht.default_cost_type
  LEFT JOIN account_equipment_utility_types aeut ON aeut.account_settings_id = asett.id 
    AND aeut.code = u.unit_type
  LEFT JOIN account_construction_costs acc_eq ON acc_eq.account_settings_id = asett.id 
    AND acc_eq.code = aeut.cost_type
  WHERE b.site_id = p_site_id;
  
  -- Only create scenario if revenue > costs
  IF v_total_revenue > v_total_cost THEN
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
  END IF;
  
  -- Scenario 3: Balanced (15 years)
  SELECT 
    SUM(
      CASE 
        WHEN u.unit_type LIKE 'villa_%' THEN 
          COALESCE(aht.default_rent_monthly, 0) * 12 * 15
        WHEN hb.type = 'apartments' THEN
          COALESCE(aht.default_rent_monthly, 0) * 12 * 15
        ELSE 0
      END
    ),
    SUM(
      CASE 
        WHEN u.unit_type LIKE 'villa_%' THEN 
          COALESCE(aht.default_area_m2, 0) * COALESCE(acc.gold_grams_per_m2, 0) * v_usd_per_gram
        WHEN hb.type = 'apartments' THEN
          COALESCE(aht.default_area_m2, 0) * COALESCE(acc.gold_grams_per_m2, 0) * v_usd_per_gram
        WHEN hb.type = 'apartments' AND u.building_type IN ('equipment', 'utility') THEN
          COALESCE(aeut.land_area_m2, 0) * COALESCE(aeut.building_occupation_pct, 0) / 100 * 
          COALESCE(acc_eq.gold_grams_per_m2, 0) * v_usd_per_gram
        ELSE 0
      END
    )
  INTO v_total_revenue, v_total_cost
  FROM units u
  JOIN half_blocks hb ON hb.id = u.half_block_id
  JOIN blocks b ON b.id = hb.block_id
  LEFT JOIN account_settings asett ON asett.user_id = v_user_id
  LEFT JOIN account_housing_types aht ON aht.account_settings_id = asett.id 
    AND aht.code = u.unit_type
  LEFT JOIN account_construction_costs acc ON acc.account_settings_id = asett.id 
    AND acc.code = aht.default_cost_type
  LEFT JOIN account_equipment_utility_types aeut ON aeut.account_settings_id = asett.id 
    AND aeut.code = u.unit_type
  LEFT JOIN account_construction_costs acc_eq ON acc_eq.account_settings_id = asett.id 
    AND acc_eq.code = aeut.cost_type
  WHERE b.site_id = p_site_id;
  
  -- Only create scenario if revenue > costs
  IF v_total_revenue > v_total_cost THEN
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
  END IF;
  
  IF v_scenarios_created = 0 THEN
    RETURN QUERY SELECT FALSE, 'No profitable scenarios could be generated. All scenarios had costs exceeding expected revenue.'::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, format('Successfully generated %s profitable auto-scenario(s)', v_scenarios_created)::TEXT;
  END IF;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comment
COMMENT ON FUNCTION generate_auto_scenarios(uuid) IS 
  'Generates up to 3 auto-scenarios for a site, only creating scenarios where expected revenue exceeds costs. ' ||
  'Calculates profitability based on existing units, rental periods, and cost/rent adjustments.';
