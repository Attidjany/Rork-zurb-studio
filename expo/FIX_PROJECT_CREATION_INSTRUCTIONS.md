# Fix Instructions for Project Creation and Scenario Issues

## Issues Fixed

1. **Duplicate key error on project creation** - `project_construction_costs_project_id_code_key` constraint violation
2. **Scenario calculations showing 0** - Parameters not being copied correctly
3. **Instant refresh not working on projects/blocks pages** - Optimistic UI updates added
4. **Scenarios not copying project parameters** - Trigger now properly copies parameters

## Steps to Fix

### 1. Run the SQL Migration

Run the following SQL file in your Supabase SQL editor:

```
backend/fix-duplicate-triggers.sql
```

This file:
- Removes the duplicate `auto_generate_project_cost_params()` function and trigger
- Consolidates all project initialization into a single `auto_populate_project_types()` function
- Ensures `copy_project_params_to_scenario()` trigger works correctly
- Prevents duplicate construction cost entries

### 2. Code Changes Already Applied

The following code changes have been made:

- **`backend/trpc/routes/projects/create/route.ts`**: Removed manual parameter insertion (now handled by database trigger)
- **`contexts/ZURBContext.tsx`**: Added optimistic UI updates for instant refresh when creating projects, sites, and scenarios

### 3. How It Works Now

#### Project Creation
1. User creates a project
2. Database trigger `auto_populate_project_types()` automatically:
   - Creates default construction costs (ZME, ZHE, ZOS, ZMER, ZHER)
   - Creates default housing types (apartments, villas, commercial)
   - Creates default equipment/utility types (EQS, EQL, UTL)
   - Creates default cost parameters for all types
3. UI immediately shows the new project (optimistic update)
4. All related parameters are loaded

#### Scenario Creation
1. User creates a scenario linked to a site
2. Database trigger `copy_project_params_to_scenario()` automatically:
   - Gets the project_id from the site
   - Copies all project_cost_params to scenario_cost_params
3. UI immediately shows the new scenario (optimistic update)
4. Scenario now has the project's custom parameters

#### Instant Refresh
- When you create a project/site/scenario, it's immediately added to the UI
- Background realtime subscriptions keep data in sync
- Manual refresh is also available via pull-to-refresh

## Testing

1. **Test project creation**: Create a new project - should not show duplicate key error
2. **Test scenario creation**: Create a scenario - should copy project parameters
3. **Test calculations**: Open a scenario - costs should calculate correctly (not show 0)
4. **Test instant refresh**: Create items - they should appear immediately without manual refresh

## Notes

- The trigger ensures consistency between project creation and parameter initialization
- All default values match the project requirements
- Realtime subscriptions keep all data synchronized across the app
