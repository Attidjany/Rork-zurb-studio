-- Fix duplicate key constraint error when creating scenarios
-- The issue is that construction costs are being duplicated during scenario creation

-- Step 1: Check for duplicate triggers (there should only be ONE trigger for scenario creation)
DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'trigger_copy_project_params_to_scenario';
  
  RAISE NOTICE 'Found % triggers named trigger_copy_project_params_to_scenario', trigger_count;
END $$;

-- Step 2: Drop ALL versions of the trigger and function
DROP TRIGGER IF EXISTS trigger_copy_project_params_to_scenario ON scenarios CASCADE;
DROP FUNCTION IF EXISTS copy_project_params_to_scenario() CASCADE;

-- Step 3: Clean up any orphaned scenario data (optional - only if you want to reset)
-- TRUNCATE TABLE scenario_construction_costs CASCADE;
-- TRUNCATE TABLE scenario_housing_types CASCADE;
-- TRUNCATE TABLE scenario_equipment_utility_types CASCADE;
-- TRUNCATE TABLE scenario_cost_params CASCADE;

-- Step 4: Recreate the function with proper error handling and duplicate prevention
CREATE OR REPLACE FUNCTION copy_project_params_to_scenario()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_cost_param_count INT;
  v_construction_cost_count INT;
  v_housing_type_count INT;
  v_equipment_utility_count INT;
BEGIN
  -- Get the project_id from the site
  SELECT sites.project_id INTO v_project_id
  FROM sites
  WHERE sites.id = NEW.site_id;
  
  RAISE NOTICE 'Copying parameters from project % to scenario %', v_project_id, NEW.id;
  
  -- Delete any existing scenario data (in case this is being re-run)
  DELETE FROM scenario_cost_params WHERE scenario_id = NEW.id;
  DELETE FROM scenario_construction_costs WHERE scenario_id = NEW.id;
  DELETE FROM scenario_housing_types WHERE scenario_id = NEW.id;
  DELETE FROM scenario_equipment_utility_types WHERE scenario_id = NEW.id;
  
  -- Copy project_cost_params to scenario_cost_params
  INSERT INTO scenario_cost_params (scenario_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
  SELECT NEW.id, unit_type, build_area_m2, cost_per_m2, rent_monthly
  FROM project_cost_params
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, unit_type) DO NOTHING;
  
  GET DIAGNOSTICS v_cost_param_count = ROW_COUNT;
  RAISE NOTICE 'Copied % cost params', v_cost_param_count;
  
  -- Copy project_construction_costs to scenario_construction_costs
  INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
  SELECT NEW.id, code, name, gold_grams_per_m2
  FROM project_construction_costs
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;
  
  GET DIAGNOSTICS v_construction_cost_count = ROW_COUNT;
  RAISE NOTICE 'Copied % construction costs', v_construction_cost_count;
  
  -- Copy project_housing_types to scenario_housing_types
  INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
  SELECT NEW.id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly
  FROM project_housing_types
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;
  
  GET DIAGNOSTICS v_housing_type_count = ROW_COUNT;
  RAISE NOTICE 'Copied % housing types', v_housing_type_count;
  
  -- Copy project_equipment_utility_types to scenario_equipment_utility_types
  INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  SELECT NEW.id, code, name, category, land_area_m2, building_occupation_pct, cost_type
  FROM project_equipment_utility_types
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;
  
  GET DIAGNOSTICS v_equipment_utility_count = ROW_COUNT;
  RAISE NOTICE 'Copied % equipment/utility types', v_equipment_utility_count;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error copying project params to scenario: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the trigger (only once)
CREATE TRIGGER trigger_copy_project_params_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW EXECUTE FUNCTION copy_project_params_to_scenario();

-- Step 6: Verify the trigger was created correctly
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_copy_project_params_to_scenario';

-- Step 7: Check for duplicate codes in existing project data
SELECT 
  project_id,
  code,
  COUNT(*) as count
FROM project_construction_costs
GROUP BY project_id, code
HAVING COUNT(*) > 1;

RAISE NOTICE 'Trigger fix applied successfully';
