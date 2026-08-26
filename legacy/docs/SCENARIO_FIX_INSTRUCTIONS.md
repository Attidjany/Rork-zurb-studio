# Scenario Parameter Copy Fix

## Issue
When creating a scenario, the project parameters are not automatically copied to the scenario, causing:
1. Cost calculations showing 0
2. Equipment and utility buildings not showing
3. Scenario not inheriting project's custom types and parameters

## Solution
A database trigger has been created to automatically copy project parameters when a scenario is created.

## Steps to Apply the Fix

1. Open Supabase Dashboard at https://supabase.com/dashboard
2. Navigate to your project
3. Go to SQL Editor (left sidebar)
4. Create a new query
5. Copy and paste the contents of `backend/fix-scenario-and-custom-types.sql`
6. Click "Run" to execute the SQL

## What This Does

The SQL migration:
- Adds missing `project_construction_costs`, `project_housing_types`, and `project_equipment_utility_types` tables
- Sets up proper RLS policies for these tables
- Updates the `auto_generate_project_cost_params` trigger to also create default custom types
- Creates a new trigger `copy_project_params_to_scenario` that automatically copies all project cost parameters to a new scenario when it's created

## After Running the Migration

1. All new scenarios will automatically get the project's cost parameters
2. Equipment and utility buildings will show in scenario summaries
3. Cost calculations will work correctly
4. Existing scenarios without parameters will need to be deleted and recreated, OR you can manually run:

```sql
-- For each existing scenario, copy its project parameters
INSERT INTO scenario_cost_params (scenario_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
SELECT 
  scenarios.id as scenario_id, 
  pcp.unit_type, 
  pcp.build_area_m2, 
  pcp.cost_per_m2, 
  pcp.rent_monthly
FROM scenarios
JOIN sites ON sites.id = scenarios.site_id
JOIN project_cost_params pcp ON pcp.project_id = sites.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM scenario_cost_params 
  WHERE scenario_cost_params.scenario_id = scenarios.id
);
```

This will backfill parameters for all existing scenarios that don't have any.
