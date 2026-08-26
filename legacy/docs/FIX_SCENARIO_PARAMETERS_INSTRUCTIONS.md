# Fix Scenario Parameters - Use New Organized Tables

## Problem
The scenario parameters are showing default values instead of the project's custom parameters because the system is using **old tables** (`project_cost_params`, `scenario_cost_params`) which contain stale data. The new organized tables (`project_housing_types`, `project_construction_costs`, `project_equipment_utility_types`) have the correct data, but weren't being copied to scenario-specific tables when scenarios were created.

## Solution
1. Create scenario-specific tables for custom types
2. Add a trigger to copy project custom types to scenario tables when scenarios are created
3. Update the app to use the new tables

## Steps

### 1. Run the SQL Migration
This will create the new scenario tables and set up the trigger to copy project parameters:

```bash
# Copy the contents of backend/add-scenario-custom-types.sql
# and run it in your Supabase SQL Editor
```

The migration will:
- Create `scenario_construction_costs`, `scenario_housing_types`, and `scenario_equipment_utility_types` tables
- Set up RLS policies for these tables
- Add a trigger to automatically copy project custom types when a scenario is created
- Add triggers to update timestamps

### 2. Context and Frontend Already Updated
The following files have already been updated to support the new tables:
- `types/index.ts` - Added new scenario type interfaces
- `contexts/ZURBContext.tsx` - Added loaders and getters for scenario custom types  
- The context now loads data from the new tables

### 3. For Existing Scenarios
For scenarios that were created BEFORE running this migration, you'll need to manually populate their custom types by copying from the project:

```sql
-- Run this query to populate existing scenarios with their project's custom types
-- Replace with your actual scenario IDs if needed

INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
SELECT 
  s.id as scenario_id,
  pcc.code,
  pcc.name,
  pcc.gold_grams_per_m2
FROM scenarios s
JOIN sites si ON si.id = s.site_id
JOIN projects p ON p.id = si.project_id
JOIN project_construction_costs pcc ON pcc.project_id = p.id
ON CONFLICT (scenario_id, code) DO NOTHING;

INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
SELECT 
  s.id as scenario_id,
  pht.code,
  pht.name,
  pht.category,
  pht.default_area_m2,
  pht.default_cost_type,
  pht.default_rent_monthly
FROM scenarios s
JOIN sites si ON si.id = s.site_id
JOIN projects p ON p.id = si.project_id
JOIN project_housing_types pht ON pht.project_id = p.id
ON CONFLICT (scenario_id, code) DO NOTHING;

INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
SELECT 
  s.id as scenario_id,
  peut.code,
  peut.name,
  peut.category,
  peut.land_area_m2,
  peut.building_occupation_pct,
  peut.cost_type
FROM scenarios s
JOIN sites si ON si.id = s.site_id
JOIN projects p ON p.id = si.project_id
JOIN project_equipment_utility_types peut ON peut.project_id = p.id
ON CONFLICT (scenario_id, code) DO NOTHING;
```

### 4. Test
1. Go to your app and refresh
2. Create a new project with custom parameters
3. Modify the project parameters in project settings
4. Create a site and scenario
5. Check the scenario parameters page - it should now show the project's custom parameters, not defaults
6. NEW scenarios created after this migration will automatically inherit their project's custom types

## What Changed

### New Tables Created
- `scenario_construction_costs` - Scenario-specific construction cost types (copies from project)
- `scenario_housing_types` - Scenario-specific housing types (copies from project)
- `scenario_equipment_utility_types` - Scenario-specific equipment/utility types (copies from project)

### Automatic Trigger
When you create a scenario, a trigger now automatically:
1. Finds the project ID for the scenario's site
2. Copies all construction costs from `project_construction_costs` to `scenario_construction_costs`
3. Copies all housing types from `project_housing_types` to `scenario_housing_types`
4. Copies all equipment/utility types from `project_equipment_utility_types` to `scenario_equipment_utility_types`

This ensures scenarios always start with their project's current custom types!

## Note About Old Tables
The old `project_cost_params` and `scenario_cost_params` tables are still in the database for backwards compatibility, but are no longer the source of truth for scenario parameters. They can be deprecated in a future update once you verify everything works correctly with the new tables.
