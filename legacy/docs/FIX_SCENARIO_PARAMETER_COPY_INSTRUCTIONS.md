# Fix: Scenario Parameters Not Copying From Project

## Problem
When creating a scenario, it's copying default parameters instead of the project's current (modified) parameters.

## Solution
The database trigger needs to be updated to ensure it properly copies the project's CURRENT parameters to new scenarios.

## Steps to Fix

### 1. Run the SQL Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Create a new query
4. Copy and paste the contents of `backend/fix-scenario-parameter-copy.sql`
5. Click **Run** to execute the SQL

**File location**: `backend/fix-scenario-parameter-copy.sql`

### 2. Test the Fix

After running the SQL:

1. Create a test project
2. Go to Project Settings and modify some parameters (e.g., change build areas, rents)
3. Create a site in that project
4. Populate the site with blocks
5. Create a scenario
6. Go to the scenario's parameters page
7. Verify that the scenario parameters match your modified project parameters (not defaults)

### 3. For Existing Scenarios (Optional)

If you have existing scenarios that were created with wrong parameters, you'll need to either:

**Option A**: Recreate the scenarios
- Delete the existing scenarios
- Create them again (they will now copy correct parameters)

**Option B**: Manually update parameters
- Go to each scenario's parameter page
- Edit and save each parameter you want to change

## What This Fix Does

The SQL migration:
1. Drops and recreates the `copy_project_params_to_scenario()` function
2. Ensures it copies from `project_cost_params` table (project's current params)
3. Adds logging to help debug if issues persist
4. Includes a test query to verify projects have parameters

## Verification

After running the SQL, you should see output showing:
- How many parameters each project has
- This helps verify that projects are properly storing custom parameters

If a project shows 0 params, it means the project was created before the parameter system was added and needs to be recreated or have parameters added manually.
