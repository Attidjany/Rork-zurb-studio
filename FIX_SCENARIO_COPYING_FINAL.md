# Fix Scenario Parameter Copying - Final Solution

## Problem
When creating a scenario, it's not copying the project's CURRENT parameters. Instead, it's either copying default values or not copying anything at all.

## Root Cause
There are TWO parameter systems in the database:
1. **Old system**: `project_cost_params` / `scenario_cost_params`
2. **New system**: `project_construction_costs`, `project_housing_types`, `project_equipment_utility_types` (and their scenario equivalents)

The trigger that copies parameters when a scenario is created needs to copy BOTH systems.

## Solution

### Step 1: Run the Comprehensive Fix SQL
Run the SQL file `backend/fix-all-scenario-copying.sql` in your Supabase SQL Editor.

This will:
- Remove all old/duplicate triggers
- Create a single comprehensive trigger that copies ALL parameter types
- Show diagnostic information about what data exists
- Verify the trigger was created correctly

### Step 2: Verify the Fix

After running the SQL, check the output messages. You should see:
```
✓ Trigger successfully created
Current data in database:
  - Projects: X
  - Project cost params: X
  - Project construction costs: X
  - Project housing types: X
  - Project equipment/utility types: X
```

And a table showing what parameters exist for each project.

### Step 3: Test

1. Go to your app
2. Create a NEW scenario for an existing site
3. Check the scenario parameters page
4. The scenario should now have the SAME parameters as the project

### Step 4: For Existing Scenarios (Optional)

If you want to fix existing scenarios that were created with wrong parameters:

1. Delete the scenario
2. Create it again - it will now copy the correct parameters

OR run this SQL to manually copy parameters for an existing scenario:

```sql
-- Replace SCENARIO_ID with your actual scenario ID
SELECT copy_all_project_params_to_scenario_manual('SCENARIO_ID'::uuid);
```

But first you need to create the manual function:

```sql
CREATE OR REPLACE FUNCTION copy_all_project_params_to_scenario_manual(p_scenario_id UUID)
RETURNS void AS $$
DECLARE
  v_project_id UUID;
  v_count INT;
BEGIN
  -- Get the project_id from the scenario
  SELECT sites.project_id INTO v_project_id
  FROM scenarios
  JOIN sites ON sites.id = scenarios.site_id
  WHERE scenarios.id = p_scenario_id;
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Could not find project for scenario: %', p_scenario_id;
  END IF;
  
  RAISE NOTICE 'Copying parameters from project % to scenario %', v_project_id, p_scenario_id;
  
  -- Delete existing
  DELETE FROM scenario_cost_params WHERE scenario_id = p_scenario_id;
  DELETE FROM scenario_construction_costs WHERE scenario_id = p_scenario_id;
  DELETE FROM scenario_housing_types WHERE scenario_id = p_scenario_id;
  DELETE FROM scenario_equipment_utility_types WHERE scenario_id = p_scenario_id;
  
  -- Copy old system
  INSERT INTO scenario_cost_params (scenario_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
  SELECT p_scenario_id, unit_type, build_area_m2, cost_per_m2, rent_monthly
  FROM project_cost_params
  WHERE project_id = v_project_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Copied % cost params', v_count;
  
  -- Copy new system
  INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
  SELECT p_scenario_id, code, name, gold_grams_per_m2
  FROM project_construction_costs
  WHERE project_id = v_project_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Copied % construction costs', v_count;
  
  INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
  SELECT p_scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly
  FROM project_housing_types
  WHERE project_id = v_project_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Copied % housing types', v_count;
  
  INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  SELECT p_scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type
  FROM project_equipment_utility_types
  WHERE project_id = v_project_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Copied % equipment/utility types', v_count;
  
  RAISE NOTICE 'Done!';
END;
$$ LANGUAGE plpgsql;
```

## Expected Behavior After Fix

1. Create a project → It gets default parameters
2. Modify project parameters → Changes are saved to the project
3. Create a scenario → It copies the project's CURRENT (modified) parameters
4. Modify scenario parameters → Only affects that scenario, not the project

## Troubleshooting

### If parameters are still not copying:

1. Check that the project actually HAS parameters:
   ```sql
   SELECT * FROM project_housing_types WHERE project_id = 'YOUR_PROJECT_ID';
   SELECT * FROM project_construction_costs WHERE project_id = 'YOUR_PROJECT_ID';
   SELECT * FROM project_equipment_utility_types WHERE project_id = 'YOUR_PROJECT_ID';
   ```

2. Check the Supabase logs when creating a scenario - you should see NOTICE messages like:
   ```
   Copying ALL parameters from project X to scenario Y
   → Copied N construction costs
   → Copied N housing types
   → Copied N equipment/utility types
   ```

3. If no parameters exist for the project, the trigger on project creation might not have run. Manually populate them:
   ```sql
   -- Run the auto_populate_project_types function manually
   -- (This is normally triggered on project creation)
   ```

### If you get "duplicate key" errors:

The new SQL includes `ON CONFLICT DO NOTHING` to prevent this, but if you still get errors:

1. Check for duplicate triggers:
   ```sql
   SELECT * FROM pg_trigger WHERE tgrelid = 'scenarios'::regclass;
   ```

2. If there are multiple copy triggers, drop them all and re-run the fix SQL.
