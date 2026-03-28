-- Fix: Remove the old project_cost_params trigger that is breaking project creation
-- This trigger was trying to insert into project_cost_params table which no longer exists
-- The new system uses project_construction_costs, project_housing_types, and project_equipment_utility_types

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
DROP FUNCTION IF EXISTS auto_generate_project_cost_params() CASCADE;

-- Verify the auto_populate_project_types trigger exists (this is the correct one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_auto_populate_project_types'
  ) THEN
    RAISE EXCEPTION 'trigger_auto_populate_project_types does not exist. Please run add-project-custom-types.sql first.';
  END IF;
  
  RAISE NOTICE 'Old trigger removed successfully. Project creation now uses auto_populate_project_types trigger.';
END $$;
