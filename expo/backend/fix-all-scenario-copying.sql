-- Comprehensive fix for scenario parameter copying
-- This ensures ALL project parameters (both old and new systems) are properly copied to scenarios

-- Step 1: Drop any existing triggers and functions
DROP TRIGGER IF EXISTS trigger_copy_project_params_to_scenario ON scenarios CASCADE;
DROP TRIGGER IF EXISTS trigger_copy_project_custom_types_to_scenario ON scenarios CASCADE;
DROP FUNCTION IF EXISTS copy_project_params_to_scenario() CASCADE;
DROP FUNCTION IF EXISTS copy_project_custom_types_to_scenario() CASCADE;

-- Step 2: Create a single comprehensive function that copies EVERYTHING
CREATE OR REPLACE FUNCTION copy_all_project_params_to_scenario()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_count INT;
BEGIN
  -- Get the project_id from the site
  SELECT sites.project_id INTO v_project_id
  FROM sites
  WHERE sites.id = NEW.site_id;
  
  IF v_project_id IS NULL THEN
    RAISE WARNING 'Could not find project_id for site_id: %', NEW.site_id;
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'Copying ALL parameters from project % to scenario %', v_project_id, NEW.id;
  
  -- Delete any existing scenario data to prevent duplicates
  DELETE FROM scenario_cost_params WHERE scenario_id = NEW.id;
  DELETE FROM scenario_construction_costs WHERE scenario_id = NEW.id;
  DELETE FROM scenario_housing_types WHERE scenario_id = NEW.id;
  DELETE FROM scenario_equipment_utility_types WHERE scenario_id = NEW.id;
  
  -- ===== OLD SYSTEM: Copy project_cost_params to scenario_cost_params =====
  INSERT INTO scenario_cost_params (scenario_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
  SELECT NEW.id, unit_type, build_area_m2, cost_per_m2, rent_monthly
  FROM project_cost_params
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, unit_type) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  → Copied % project_cost_params', v_count;
  
  -- ===== NEW SYSTEM: Copy custom type tables =====
  
  -- Copy construction costs
  INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
  SELECT NEW.id, code, name, gold_grams_per_m2
  FROM project_construction_costs
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  → Copied % construction costs', v_count;
  
  -- Copy housing types
  INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
  SELECT NEW.id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly
  FROM project_housing_types
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  → Copied % housing types', v_count;
  
  -- Copy equipment/utility types
  INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  SELECT NEW.id, code, name, category, land_area_m2, building_occupation_pct, cost_type
  FROM project_equipment_utility_types
  WHERE project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  → Copied % equipment/utility types', v_count;
  
  RAISE NOTICE 'Successfully copied all parameters from project % to scenario %', v_project_id, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error copying project params to scenario: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the trigger
CREATE TRIGGER trigger_copy_all_project_params_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW EXECUTE FUNCTION copy_all_project_params_to_scenario();

-- Step 4: Verify the trigger was created
DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'scenarios'::regclass
    AND tgname LIKE '%copy%project%';
  
  RAISE NOTICE 'Found % scenario copy triggers', trigger_count;
  
  IF trigger_count = 1 THEN
    RAISE NOTICE '✓ Trigger successfully created';
  ELSIF trigger_count > 1 THEN
    RAISE WARNING '⚠ Multiple triggers found - this may cause issues!';
  ELSE
    RAISE WARNING '⚠ No triggers found!';
  END IF;
END $$;

-- Step 5: Verify project data exists
DO $$
DECLARE
  project_count INT;
  cost_param_count INT;
  construction_cost_count INT;
  housing_type_count INT;
  equipment_count INT;
BEGIN
  SELECT COUNT(*) INTO project_count FROM projects;
  SELECT COUNT(*) INTO cost_param_count FROM project_cost_params;
  SELECT COUNT(*) INTO construction_cost_count FROM project_construction_costs;
  SELECT COUNT(*) INTO housing_type_count FROM project_housing_types;
  SELECT COUNT(*) INTO equipment_count FROM project_equipment_utility_types;
  
  RAISE NOTICE 'Current data in database:';
  RAISE NOTICE '  - Projects: %', project_count;
  RAISE NOTICE '  - Project cost params: %', cost_param_count;
  RAISE NOTICE '  - Project construction costs: %', construction_cost_count;
  RAISE NOTICE '  - Project housing types: %', housing_type_count;
  RAISE NOTICE '  - Project equipment/utility types: %', equipment_count;
END $$;

-- Step 6: Test query - show what will be copied for each project
SELECT 
  p.id as project_id,
  p.name as project_name,
  COUNT(DISTINCT pcp.id) as old_cost_params,
  COUNT(DISTINCT pcc.id) as construction_costs,
  COUNT(DISTINCT pht.id) as housing_types,
  COUNT(DISTINCT peut.id) as equipment_utility_types
FROM projects p
LEFT JOIN project_cost_params pcp ON p.id = pcp.project_id
LEFT JOIN project_construction_costs pcc ON p.id = pcc.project_id
LEFT JOIN project_housing_types pht ON p.id = pht.project_id
LEFT JOIN project_equipment_utility_types peut ON p.id = peut.project_id
GROUP BY p.id, p.name
ORDER BY p.created_at DESC;
