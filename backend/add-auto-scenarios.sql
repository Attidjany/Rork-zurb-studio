-- Add max_rental_period to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_rental_period_years INT DEFAULT 20;

-- Function to check if all half blocks in a site are fully configured
CREATE OR REPLACE FUNCTION check_site_blocks_configured(p_site_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_half_blocks INT;
  configured_half_blocks INT;
BEGIN
  -- Count total half blocks for this site
  SELECT COUNT(*) INTO total_half_blocks
  FROM half_blocks hb
  JOIN blocks b ON b.id = hb.block_id
  WHERE b.site_id = p_site_id;
  
  -- Count fully configured half blocks (have type and layout and units)
  SELECT COUNT(DISTINCT hb.id) INTO configured_half_blocks
  FROM half_blocks hb
  JOIN blocks b ON b.id = hb.block_id
  JOIN units u ON u.half_block_id = hb.id
  WHERE b.site_id = p_site_id
    AND hb.type IS NOT NULL
    AND (
      (hb.type = 'villas' AND hb.villa_layout IS NOT NULL)
      OR
      (hb.type = 'apartments' AND hb.apartment_layout IS NOT NULL)
    )
    AND (
      (hb.type = 'villas' AND u.unit_type IS NOT NULL)
      OR
      (hb.type = 'apartments' AND u.building_type IS NOT NULL)
    );
  
  -- All blocks are configured if counts match and > 0
  RETURN total_half_blocks > 0 AND total_half_blocks = configured_half_blocks;
END;
$$ LANGUAGE plpgsql;

-- Function to generate auto scenarios for a site
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
    AND name IN ('Auto: Most Profit', 'Auto: Lowest Rents', 'Auto: Balanced');
  
  -- Scenario 1: Most Profit
  -- Max rental period, highest rents (+20%), highest costs (+10%)
  INSERT INTO scenarios (site_id, name, notes, rental_period_years, created_by)
  VALUES (
    p_site_id,
    'Auto: Most Profit',
    'Maximum profit scenario: Longer rental period, premium rents, quality construction',
    v_max_rental_years,
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
    );
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
    );
  END LOOP;
  
  -- Copy equipment/utility types with +10% cost adjustment
  FOR v_project_equipment_utility IN
    SELECT * FROM project_equipment_utility_types
    WHERE project_id = v_project_id
  LOOP
    -- Get the construction cost and adjust it
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
    );
  END LOOP;
  
  -- Scenario 2: Lowest Rents
  -- Min rental period (10 years), lowest rents (-20%), lowest costs (-10%)
  INSERT INTO scenarios (site_id, name, notes, rental_period_years, created_by)
  VALUES (
    p_site_id,
    'Auto: Lowest Rents',
    'Affordable scenario: Shorter rental period, reduced rents, economical construction',
    10,
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
    );
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
    );
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
    );
  END LOOP;
  
  -- Scenario 3: Balanced
  -- Mid rental period (15 years), standard rents and costs (no adjustment)
  INSERT INTO scenarios (site_id, name, notes, rental_period_years, created_by)
  VALUES (
    p_site_id,
    'Auto: Balanced',
    'Balanced scenario: Moderate rental period, standard market rents, standard construction',
    15,
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
    );
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
    );
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
    );
  END LOOP;
  
  RAISE NOTICE 'Generated 3 auto-scenarios for site %', p_site_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to check if site is ready and generate auto scenarios
CREATE OR REPLACE FUNCTION check_and_generate_auto_scenarios()
RETURNS TRIGGER AS $$
DECLARE
  v_site_id UUID;
  v_is_configured BOOLEAN;
BEGIN
  -- Get the site_id from the affected half_block
  IF TG_TABLE_NAME = 'half_blocks' THEN
    SELECT b.site_id INTO v_site_id
    FROM blocks b
    WHERE b.id = NEW.block_id;
  ELSIF TG_TABLE_NAME = 'units' THEN
    SELECT b.site_id INTO v_site_id
    FROM half_blocks hb
    JOIN blocks b ON b.id = hb.block_id
    WHERE hb.id = NEW.half_block_id;
  END IF;
  
  IF v_site_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if site is fully configured
  SELECT check_site_blocks_configured(v_site_id) INTO v_is_configured;
  
  -- If configured, generate auto scenarios
  IF v_is_configured THEN
    PERFORM generate_auto_scenarios(v_site_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_generate_auto_scenarios_on_half_block_update ON half_blocks;
DROP TRIGGER IF EXISTS trigger_generate_auto_scenarios_on_unit_insert ON units;
DROP TRIGGER IF EXISTS trigger_generate_auto_scenarios_on_unit_update ON units;

-- Create triggers on half_blocks and units tables
CREATE TRIGGER trigger_generate_auto_scenarios_on_half_block_update
  AFTER INSERT OR UPDATE ON half_blocks
  FOR EACH ROW
  EXECUTE FUNCTION check_and_generate_auto_scenarios();

CREATE TRIGGER trigger_generate_auto_scenarios_on_unit_insert
  AFTER INSERT ON units
  FOR EACH ROW
  EXECUTE FUNCTION check_and_generate_auto_scenarios();

CREATE TRIGGER trigger_generate_auto_scenarios_on_unit_update
  AFTER UPDATE ON units
  FOR EACH ROW
  EXECUTE FUNCTION check_and_generate_auto_scenarios();
