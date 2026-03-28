# Complete Schema Fix Instructions

## Issues Being Fixed

1. ❌ **Project Creation Error**: `relation "project_cost_params" does not exist`
   - Old table references need to be removed from triggers
   - New parameter tables need proper setup

2. ❌ **Scenario Parameters Empty**: Parameters not being copied to scenarios
   - Trigger needs to be verified and fixed
   
3. ❌ **Missing rental_period_years**: Column not in scenarios table
   - Need to add this column

4. ❌ **Block Configuration Not Refreshing**: Realtime subscriptions not working properly
   - Context already has proper subscriptions, but data might not be loading

5. ❌ **Villa Type Editing Not Working**: Updates not being saved
   - Need to verify units table constraint includes villa types

## Migration Steps

### Step 1: Run the Complete Schema Fix

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Copy and paste the ENTIRE contents of: backend/fix-all-schema-issues.sql
```

This migration will:
- ✅ Remove old `project_cost_params` and `scenario_cost_params` tables
- ✅ Add `rental_period_years` column to scenarios table
- ✅ Ensure all new parameter tables exist
- ✅ Fix the trigger that auto-populates project types
- ✅ Fix the trigger that copies parameters to scenarios
- ✅ Update the units table constraint to include villa types (BMS, BML, BH, CH, CO)

### Step 2: Verify the Fix

After running the migration, test these scenarios:

#### Test 1: Create a New Project
```
1. Go to home screen
2. Click "+" to create a new project
3. Enter name and description
4. Project should be created WITHOUT errors
5. Check that the project has default parameters (go to Project Parameters)
```

**Expected Result**: Project created successfully with default construction costs, housing types, and equipment/utility types.

#### Test 2: Create a Scenario
```
1. Open a site
2. Create a new scenario
3. Scenario should be created successfully
4. Go to Scenario Parameters
5. Should see parameters copied from project
```

**Expected Result**: Scenario created successfully with parameters copied from project.

#### Test 3: Edit Scenario Rental Period
```
1. Go to Scenario Parameters
2. Click edit on Rental Period
3. Change the value
4. Save
5. Value should persist
```

**Expected Result**: Rental period can be edited and saved successfully.

#### Test 4: Edit Villa Types
```
1. Go to a site with a block configured as villas
2. Click "Edit Villa Types"
3. Select different villa types for different plot sizes
4. Close the modal
5. Changes should be saved
```

**Expected Result**: Villa types update successfully and persist.

#### Test 5: Block Configuration Refresh
```
1. Go to a site's block configuration
2. Make changes to half-blocks
3. Changes should appear immediately (realtime)
4. Pull to refresh should work
```

**Expected Result**: Changes appear immediately and pull-to-refresh works.

### Step 3: If You Have Existing Data

If you have existing projects/scenarios that are broken, you may need to:

#### For Projects Missing Parameters
Run this for each project that's missing parameters:

```sql
-- Replace YOUR_PROJECT_ID with the actual project ID
SELECT auto_populate_project_types() FROM projects WHERE id = 'YOUR_PROJECT_ID';
```

Or just run:
```sql
-- This will add default parameters to all projects that don't have them
DO $$
DECLARE
  proj RECORD;
BEGIN
  FOR proj IN SELECT id FROM projects LOOP
    -- Check if project has construction costs
    IF NOT EXISTS (SELECT 1 FROM project_construction_costs WHERE project_id = proj.id) THEN
      -- Populate default types for this project
      INSERT INTO project_construction_costs (project_id, code, name, gold_grams_per_m2)
      VALUES
        (proj.id, 'ZME', 'Zenoàh Mid End', 14.91),
        (proj.id, 'ZHE', 'Zenoàh High End', 20.9),
        (proj.id, 'ZOS', 'Zenoàh Out-Standing', 26.9),
        (proj.id, 'ZMER', 'Zenoàh Mid End Reduced (ZME -15%)', 12.6735),
        (proj.id, 'ZHER', 'Zenoàh High End Reduced (ZHE -15%)', 17.765);
      
      INSERT INTO project_housing_types (project_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
      VALUES
        (proj.id, 'AMS', 'Apartment MidEnd Small', 'apartment', 100, 'ZME', 250000),
        (proj.id, 'AML', 'Apartment MidEnd Large', 'apartment', 150, 'ZME', 300000),
        (proj.id, 'AH', 'Apartment High-end', 'apartment', 200, 'ZHE', 650000),
        (proj.id, 'BMS', 'Villa MidEnd Small', 'villa', 150, 'ZME', 400000),
        (proj.id, 'BML', 'Villa MidEnd Large', 'villa', 250, 'ZME', 550000),
        (proj.id, 'BH', 'Villa Highend', 'villa', 300, 'ZHE', 750000),
        (proj.id, 'CH', 'Mansion HighEnd', 'villa', 450, 'ZHE', 1300000),
        (proj.id, 'CO', 'Mansion OutStanding', 'villa', 450, 'ZOS', 2500000),
        (proj.id, 'XM', 'Commercial MidEnd', 'commercial', 75, 'ZMER', 200000),
        (proj.id, 'XH', 'Commercial HighEnd', 'commercial', 75, 'ZHER', 300000);
      
      INSERT INTO project_equipment_utility_types (project_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
      VALUES
        (proj.id, 'EQS', 'Equipment Small', 'equipment', 1800, 0.3, 'ZMER'),
        (proj.id, 'EQL', 'Equipment Large', 'equipment', 2400, 0.3, 'ZMER'),
        (proj.id, 'UTL', 'Utility', 'utility', 1800, 0.3, 'ZMER');
    END IF;
  END LOOP;
END $$;
```

#### For Scenarios Missing Parameters
Run this for each scenario that's missing parameters:

```sql
-- This will copy project parameters to all scenarios that don't have them
DO $$
DECLARE
  scen RECORD;
  v_project_id UUID;
BEGIN
  FOR scen IN SELECT id, site_id FROM scenarios LOOP
    -- Check if scenario has construction costs
    IF NOT EXISTS (SELECT 1 FROM scenario_construction_costs WHERE scenario_id = scen.id) THEN
      -- Get project_id
      SELECT st.project_id INTO v_project_id
      FROM sites st
      WHERE st.id = scen.site_id;
      
      -- Copy from project
      INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
      SELECT scen.id, pcc.code, pcc.name, pcc.gold_grams_per_m2
      FROM project_construction_costs pcc
      WHERE pcc.project_id = v_project_id;
      
      INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
      SELECT scen.id, pht.code, pht.name, pht.category, pht.default_area_m2, pht.default_cost_type, pht.default_rent_monthly
      FROM project_housing_types pht
      WHERE pht.project_id = v_project_id;
      
      INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
      SELECT scen.id, peut.code, peut.name, peut.category, peut.land_area_m2, peut.building_occupation_pct, peut.cost_type
      FROM project_equipment_utility_types peut
      WHERE peut.project_id = v_project_id;
    END IF;
  END LOOP;
END $$;
```

## Verification Checklist

After running the migration, verify:

- [ ] New projects can be created without errors
- [ ] New projects have default parameters automatically populated
- [ ] Scenario parameters page shows parameters
- [ ] Scenario rental period can be edited
- [ ] Villa types can be assigned and saved in block configuration
- [ ] Block configuration refreshes properly (realtime updates)
- [ ] Pull-to-refresh works on block configuration page
- [ ] Edit buttons work on scenario parameters
- [ ] Reset to project settings works

## Common Issues

### Issue: Still getting "project_cost_params" error
**Solution**: The old trigger is still active. Run:
```sql
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
```

### Issue: Scenarios still have no parameters
**Solution**: Run the "For Scenarios Missing Parameters" script above.

### Issue: Villa types not saving
**Solution**: Check that the units table constraint was updated:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'units'::regclass 
AND conname = 'units_building_type_check';
```

Should include: BMS, BML, BH, CH, CO

## Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs for database errors
3. Verify all migrations ran successfully
4. Try creating a fresh project to test
