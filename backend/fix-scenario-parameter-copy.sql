-- Fix scenario parameter copying to use actual project parameters
-- This ensures when a scenario is created, it copies the PROJECT'S CURRENT parameters, not defaults

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_copy_project_params_to_scenario ON scenarios;
DROP FUNCTION IF EXISTS copy_project_params_to_scenario() CASCADE;

-- Recreate the function to copy from the project's actual parameters
-- This includes cost params AND custom types (construction costs, housing types, equipment/utility types)
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
  
  -- Log what we're doing
  RAISE NOTICE 'Copying project parameters for project_id: % to scenario: %', v_project_id, NEW.id;
  
  -- Copy project_cost_params to scenario_cost_params
  -- This copies the CURRENT project parameters (build areas, costs, rents)
  INSERT INTO scenario_cost_params (scenario_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
  SELECT NEW.id, unit_type, build_area_m2, cost_per_m2, rent_monthly
  FROM project_cost_params
  WHERE project_id = v_project_id;
  
  GET DIAGNOSTICS v_cost_param_count = ROW_COUNT;
  RAISE NOTICE 'Copied % cost params', v_cost_param_count;
  
  -- Copy project_construction_costs to scenario_construction_costs (if the table exists)
  -- This copies custom construction cost types
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scenario_construction_costs') THEN
    INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
    SELECT NEW.id, code, name, gold_grams_per_m2
    FROM project_construction_costs
    WHERE project_id = v_project_id;
    
    GET DIAGNOSTICS v_construction_cost_count = ROW_COUNT;
    RAISE NOTICE 'Copied % construction costs', v_construction_cost_count;
  END IF;
  
  -- Copy project_housing_types to scenario_housing_types (if the table exists)
  -- This copies custom housing types
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scenario_housing_types') THEN
    INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
    SELECT NEW.id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly
    FROM project_housing_types
    WHERE project_id = v_project_id;
    
    GET DIAGNOSTICS v_housing_type_count = ROW_COUNT;
    RAISE NOTICE 'Copied % housing types', v_housing_type_count;
  END IF;
  
  -- Copy project_equipment_utility_types to scenario_equipment_utility_types (if the table exists)
  -- This copies custom equipment/utility types
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scenario_equipment_utility_types') THEN
    INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
    SELECT NEW.id, code, name, category, land_area_m2, building_occupation_pct, cost_type
    FROM project_equipment_utility_types
    WHERE project_id = v_project_id;
    
    GET DIAGNOSTICS v_equipment_utility_count = ROW_COUNT;
    RAISE NOTICE 'Copied % equipment/utility types', v_equipment_utility_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to run AFTER insert on scenarios
CREATE TRIGGER trigger_copy_project_params_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW EXECUTE FUNCTION copy_project_params_to_scenario();

-- Test: Show what parameters exist for each project
-- Run this to verify your projects have the correct parameters
SELECT 
  p.id as project_id,
  p.name as project_name,
  COUNT(pcp.id) as param_count
FROM projects p
LEFT JOIN project_cost_params pcp ON p.id = pcp.project_id
GROUP BY p.id, p.name
ORDER BY p.created_at DESC;
