# Fix: Scenario Parameters Not Copying from Project

## Problem
When creating a new scenario, the project parameters are not being copied to the scenario's parameter tables. This causes:
- Scenario parameters appearing empty
- Cost calculations showing 0
- Equipment and utilities not appearing in scenario summary

## Root Cause
There is no database trigger to automatically copy project parameters to scenario-specific tables when a scenario is created.

## Solution
Run the SQL migration that adds a trigger to copy all project parameters (construction costs, housing types, equipment/utility types) to the scenario when it's created.

## Steps to Fix

### 1. Run the SQL Migration in Supabase

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `backend/add-scenario-copy-trigger.sql`
4. Click "Run"

### 2. Test the Fix

After running the SQL:

1. Create a new project
2. Configure the project parameters (go to Project Settings)
3. Create a site in the project
4. Add blocks to the site
5. Create a scenario for the site
6. Go to scenario parameters - they should now show the project parameters
7. Check the scenario summary - costs should calculate correctly

### 3. For Existing Scenarios

If you have existing scenarios that were created before this fix, they won't have parameters. You have two options:

**Option A: Delete and Recreate**
- Delete the old scenarios
- Create new scenarios (they will automatically get the project parameters)

**Option B: Manual Data Migration** (if you want to keep existing scenarios)
Run this SQL to copy parameters for existing scenarios:

```sql
-- For each existing scenario, copy project parameters
DO $$
DECLARE
  scenario_record RECORD;
  v_project_id UUID;
BEGIN
  FOR scenario_record IN SELECT id, site_id FROM scenarios LOOP
    -- Get project_id
    SELECT s.project_id INTO v_project_id
    FROM sites s
    WHERE s.id = scenario_record.site_id;
    
    -- Copy construction costs
    INSERT INTO scenario_construction_costs (
      scenario_id, code, name, description, gold_grams_per_m2
    )
    SELECT 
      scenario_record.id, code, name, description, gold_grams_per_m2
    FROM project_construction_costs
    WHERE project_id = v_project_id
    ON CONFLICT (scenario_id, code) DO NOTHING;
    
    -- Copy housing types
    INSERT INTO scenario_housing_types (
      scenario_id, code, name, category, default_cost_type, default_area_m2, default_rent_monthly
    )
    SELECT 
      scenario_record.id, code, name, category, default_cost_type, default_area_m2, default_rent_monthly
    FROM project_housing_types
    WHERE project_id = v_project_id
    ON CONFLICT (scenario_id, code) DO NOTHING;
    
    -- Copy equipment/utility types
    INSERT INTO scenario_equipment_utility_types (
      scenario_id, code, name, category, cost_type, land_area_m2, building_occupation_pct
    )
    SELECT 
      scenario_record.id, code, name, category, cost_type, land_area_m2, building_occupation_pct
    FROM project_equipment_utility_types
    WHERE project_id = v_project_id
    ON CONFLICT (scenario_id, code) DO NOTHING;
    
    RAISE NOTICE 'Copied parameters for scenario %', scenario_record.id;
  END LOOP;
END $$;
```

## Verification

After the fix, verify that:
1. ✅ New scenarios automatically have parameters copied from the project
2. ✅ Scenario parameters page shows all construction costs, housing types, and equipment/utilities
3. ✅ Scenario summary calculates costs correctly
4. ✅ Equipment and utility details are shown in the summary

## Technical Details

The trigger `copy_project_params_to_scenario` fires after a scenario is inserted and:
1. Finds the project_id from the site
2. Copies all rows from `project_construction_costs` to `scenario_construction_costs`
3. Copies all rows from `project_housing_types` to `scenario_housing_types`
4. Copies all rows from `project_equipment_utility_types` to `scenario_equipment_utility_types`

This ensures that scenarios start with a complete copy of the project's configuration, which can then be modified independently if needed.
