-- Add trigger to copy project parameters to scenario when scenario is created

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS copy_project_params_to_scenario ON scenarios;
DROP FUNCTION IF EXISTS copy_project_params_to_scenario_func();

-- Function to copy project parameters to scenario
CREATE OR REPLACE FUNCTION copy_project_params_to_scenario_func()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get the project_id from the site
  SELECT s.project_id INTO v_project_id
  FROM sites s
  WHERE s.id = NEW.site_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find project for site %', NEW.site_id;
  END IF;

  -- Copy construction costs from project to scenario
  INSERT INTO scenario_construction_costs (
    scenario_id,
    code,
    name,
    gold_grams_per_m2
  )
  SELECT 
    NEW.id,
    code,
    name,
    gold_grams_per_m2
  FROM project_construction_costs
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;

  -- Copy housing types from project to scenario
  INSERT INTO scenario_housing_types (
    scenario_id,
    code,
    name,
    category,
    default_cost_type,
    default_area_m2,
    default_rent_monthly
  )
  SELECT 
    NEW.id,
    code,
    name,
    category,
    default_cost_type,
    default_area_m2,
    default_rent_monthly
  FROM project_housing_types
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;

  -- Copy equipment/utility types from project to scenario
  INSERT INTO scenario_equipment_utility_types (
    scenario_id,
    code,
    name,
    category,
    cost_type,
    land_area_m2,
    building_occupation_pct
  )
  SELECT 
    NEW.id,
    code,
    name,
    category,
    cost_type,
    land_area_m2,
    building_occupation_pct
  FROM project_equipment_utility_types
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after scenario insert
CREATE TRIGGER copy_project_params_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW 
  EXECUTE FUNCTION copy_project_params_to_scenario_func();

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Trigger created successfully: copy_project_params_to_scenario';
END $$;
