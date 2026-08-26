-- Remove old project_cost_params and scenario_cost_params tables
-- These have been replaced by the new organized parameter system:
-- - project_construction_costs / scenario_construction_costs
-- - project_housing_types / scenario_housing_types
-- - project_equipment_utility_types / scenario_equipment_utility_types

-- Drop the old trigger first
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
DROP FUNCTION IF EXISTS auto_generate_project_cost_params() CASCADE;

-- Drop policies
DROP POLICY IF EXISTS "Users can read project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can create project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can update project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can delete project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can read project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can insert project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can update project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can delete project configs" ON project_cost_params;

DROP POLICY IF EXISTS "Users can read scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can create scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can update scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can delete scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can read scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can insert scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can update scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can delete scenario configs" ON scenario_cost_params;

-- Drop update triggers
DROP TRIGGER IF EXISTS update_project_cost_params_updated_at ON project_cost_params;
DROP TRIGGER IF EXISTS update_scenario_cost_params_updated_at ON scenario_cost_params;

-- Drop the tables
DROP TABLE IF EXISTS scenario_cost_params CASCADE;
DROP TABLE IF EXISTS project_cost_params CASCADE;

-- Verify the new tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_construction_costs') THEN
    RAISE EXCEPTION 'project_construction_costs table does not exist. Please run add-project-custom-types.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_housing_types') THEN
    RAISE EXCEPTION 'project_housing_types table does not exist. Please run add-project-custom-types.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_equipment_utility_types') THEN
    RAISE EXCEPTION 'project_equipment_utility_types table does not exist. Please run add-project-custom-types.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'scenario_construction_costs') THEN
    RAISE EXCEPTION 'scenario_construction_costs table does not exist. Please run add-scenario-custom-types.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'scenario_housing_types') THEN
    RAISE EXCEPTION 'scenario_housing_types table does not exist. Please run add-scenario-custom-types.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'scenario_equipment_utility_types') THEN
    RAISE EXCEPTION 'scenario_equipment_utility_types table does not exist. Please run add-scenario-custom-types.sql first.';
  END IF;
END $$;
