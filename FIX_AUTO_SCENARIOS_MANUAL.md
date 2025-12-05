# Fix Auto-Scenarios: Manual Generation with Button

This update fixes the duplicate key error and changes auto-scenario generation from automatic (triggered by block changes) to manual (triggered by user button press).

## Changes Made

### 1. Database Changes (`backend/fix-auto-scenarios-manual.sql`)

**Removed:**
- Automatic triggers on `half_blocks` and `units` tables
- `check_and_generate_auto_scenarios()` trigger function

**Improved:**
- `generate_auto_scenarios()` function now:
  - Returns `TABLE(success BOOLEAN, message TEXT)` for better error handling
  - Uses transaction-level advisory locking to prevent concurrent execution
  - Uses `ON CONFLICT ... DO UPDATE` clauses to handle duplicate keys gracefully
  - Deletes existing auto-scenarios before creating new ones (CASCADE handles related data)
  - Provides clear success/error messages

**Added:**
- Performance indexes for faster lookups on scenario tables

### 2. Frontend Changes

**ZURBContext (`contexts/ZURBContext.tsx`):**
- Added `generateAutoScenarios()` function that:
  - Calls the database RPC function
  - Shows success/error alerts to the user
  - Reloads scenario data after generation
  - Returns boolean for success/failure

**Site Screen (`app/site/[id].tsx`):**
- Added "Smart Scenarios" button in the Block Configuration section header
- Button shows loading state while generating scenarios
- Uses Sparkles icon to indicate AI/smart functionality
- Positioned prominently next to the section title

## How to Apply

### Step 1: Run the SQL Migration

In your Supabase SQL Editor, run the contents of `backend/fix-auto-scenarios-manual.sql`:

```sql
-- Copy and paste the entire contents of backend/fix-auto-scenarios-manual.sql
```

This will:
1. Remove all automatic triggers
2. Update the `generate_auto_scenarios()` function
3. Add performance indexes

### Step 2: Test the Feature

1. Navigate to a site with configured blocks
2. Click the "Smart Scenarios" button in the Block Configuration section
3. Wait for the success message
4. Check the Scenarios list to see the 3 auto-generated scenarios:
   - Auto: Most Profit (max rental period, +20% rents, +10% costs)
   - Auto: Lowest Rents (10 years, -20% rents, -10% costs)
   - Auto: Balanced (15 years, standard values)

## Benefits

### Before (Automatic):
- ❌ Duplicate key errors when multiple updates happen quickly
- ❌ Unexpected scenario generation while user is configuring
- ❌ Multiple triggers firing for each unit update
- ❌ No user control over when scenarios are generated

### After (Manual Button):
- ✅ No duplicate key errors (proper locking + ON CONFLICT)
- ✅ User controls when to generate scenarios
- ✅ Single function call, not multiple triggers
- ✅ Clear feedback with success/error messages
- ✅ Better performance (no unnecessary regeneration)

## Technical Details

### Advisory Locking
The function uses PostgreSQL's advisory lock to prevent concurrent execution:
```sql
pg_try_advisory_xact_lock(hashtext('auto_scenarios_' || p_site_id::text))
```
This ensures only one auto-scenario generation runs per site at a time, preventing race conditions.

### ON CONFLICT Handling
All INSERT statements use `ON CONFLICT ... DO UPDATE` to handle duplicate keys gracefully:
```sql
INSERT INTO scenario_construction_costs (...)
VALUES (...)
ON CONFLICT (scenario_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  gold_grams_per_m2 = EXCLUDED.gold_grams_per_m2,
  updated_at = NOW();
```

### Performance Indexes
Added indexes for faster lookups:
- `idx_scenarios_site_auto` on `scenarios(site_id, is_auto_scenario)`
- `idx_scenario_construction_costs_scenario_code` on `scenario_construction_costs(scenario_id, code)`
- Similar indexes for housing types and equipment/utility types

## Troubleshooting

### If you get "Another process is already generating" message:
- This is normal if the function was called twice quickly
- Just wait a second and try again

### If scenarios aren't being created:
- Check that the project has `max_rental_period_years` set (defaults to 20)
- Verify that project has construction costs, housing types, and equipment types defined
- Check the Supabase logs for any error messages

### If you see old automatic behavior:
- Verify that all triggers were removed:
  ```sql
  SELECT * FROM pg_trigger 
  WHERE tgname LIKE '%auto_scenario%';
  ```
  Should return no rows.
