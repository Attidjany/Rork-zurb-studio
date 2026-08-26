# Complete Fix for Auto-Scenario Duplicate Key Errors

## Problem
When selecting apartment layouts, you're getting a duplicate key error:
```
duplicate key value violates unique constraint "scenario_construction_costs_scenario_id_code_key"
```

This happens because automatic triggers fire multiple times during building creation, causing the auto-scenario function to run simultaneously.

## Solution
The fix removes ALL automatic triggers and ensures manual generation works properly without duplicates.

## Instructions

### Step 1: Apply the SQL Fix
Run the following SQL file in your Supabase SQL Editor:

**File:** `backend/fix-auto-scenarios-complete.sql`

This will:
1. Remove ALL auto-scenario triggers from half_blocks and units tables
2. Drop the automatic check function
3. Recreate the generate_auto_scenarios function with proper cleanup
4. Add performance indexes

### Step 2: Verify the Fix
After running the SQL:

1. Try selecting an apartment layout (AB1, AB2, or ABH)
2. The buildings should be created without errors
3. Auto-scenarios will NOT be generated automatically

### Step 3: Manual Generation
Auto-scenarios are now generated manually by calling:
```sql
SELECT * FROM generate_auto_scenarios('your-site-id-here');
```

This should be triggered from the UI with a "Generate / Update Smart Scenarios" button in the blocks configuration page.

## What Changed
- **Before:** Triggers fired automatically on half_block/unit changes, causing race conditions
- **After:** Triggers removed, manual generation only with proper locking
- **Result:** No more duplicate key errors, user has control over when scenarios are generated

## Testing
1. Select an apartment layout → Should work without errors
2. Modify block configurations → Should work without errors
3. Click "Generate Smart Scenarios" button → Should create/update 3 auto-scenarios
4. Verify auto-scenarios appear with different settings (Most Profit, Lowest Rents, Balanced)
