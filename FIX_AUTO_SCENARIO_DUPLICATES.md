# Fix Auto-Scenario Duplicate Key Error

## Problem
Getting error: `duplicate key value violates unique constraint "scenario_construction_costs_scenario_id_code_key"`

This happens because the CASCADE DELETE might not be working properly or there's a timing issue with multiple triggers firing.

## Solution
Run the SQL script to fix the function with explicit cleanup:

```bash
backend/fix-auto-scenario-final.sql
```

## What Changed
1. **Explicit Child Table Deletion**: Instead of relying on CASCADE DELETE, we explicitly delete from child tables first:
   - `scenario_construction_costs`
   - `scenario_housing_types`
   - `scenario_equipment_utility_types`

2. **Advisory Lock**: The function already has an advisory lock to prevent concurrent execution for the same site.

3. **Array-based Deletion**: We collect all scenario IDs first, then delete from child tables using `ANY(array)`, which is more efficient and safer.

## How to Apply
In your Supabase SQL Editor, run:

```sql
-- Paste the contents of backend/fix-auto-scenario-final.sql
```

This will:
1. Drop the old function
2. Create the new function with proper cleanup
3. Fix the duplicate key constraint error

## Testing
After applying, try:
1. Selecting a building type in blocks configuration
2. The auto-scenarios should generate without errors
3. Changing building types should update auto-scenarios correctly
