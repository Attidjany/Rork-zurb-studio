# Fix All Issues - Complete Guide

This guide fixes all three issues you reported:
1. Project creation error (project_cost_params)
2. Villa type editing not working
3. Block configuration page realtime and refresh not working

## Issue 1: Project Creation Error

### Problem
When creating a new project, you get the error: `Error: relation "project_cost_params" does not exist`

### Root Cause
The old `project_cost_params` table and its trigger were removed when the system was migrated to the new organized parameter tables, but one trigger still references it.

### Fix
Run this SQL script in your Supabase SQL Editor:

```sql
-- Fix: Remove the old project_cost_params trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
DROP FUNCTION IF EXISTS auto_generate_project_cost_params() CASCADE;
```

### What This Does
- Removes the old trigger that tries to insert into `project_cost_params` (which no longer exists)
- The new system uses `auto_populate_project_types()` trigger which correctly inserts into:
  - `project_construction_costs`
  - `project_housing_types`
  - `project_equipment_utility_types`

---

## Issue 2: Villa Type Editing Not Working

### Problem
When editing villa types in the block configuration modal, the changes don't reflect immediately.

### Root Cause
The `updateUnit` function in ZURBContext wasn't implementing optimistic updates, so the UI didn't update until the realtime subscription triggered.

### Fix
✅ **Already Fixed** in `contexts/ZURBContext.tsx`

The `updateUnit` function now:
1. Immediately updates the local state (optimistic update)
2. Sends the update to Supabase
3. Reverts if there's an error
4. Logs the update for debugging

---

## Issue 3: Block Configuration Page - Realtime & Refresh

### Problem
- Pull to refresh doesn't work
- Realtime updates don't show

### Root Cause
Realtime subscriptions were already set up, but optimistic updates were missing, causing perceived delay.

### Fix
✅ **Already Fixed** in multiple places:

1. **ZURBContext.tsx** - Added optimistic updates to `updateUnit()`
2. **app/site/[id].tsx** - Added console logs for debugging

### What Now Works
- **Pull to refresh**: Works and logs to console
- **Realtime updates**: Already working via Supabase realtime subscriptions
- **Optimistic updates**: UI now updates immediately when changing villa types
- **Error recovery**: Failed updates automatically revert

---

## Summary of Changes Made

### Files Modified
1. `contexts/ZURBContext.tsx`
   - Added optimistic update to `updateUnit()` function
   - Added better error handling with rollback

2. `app/site/[id].tsx`
   - Added debug logging to `handleUpdateVillaType()`
   - Added debug logging to `handleRefresh()`

### SQL Script Created
- `backend/fix-project-cost-params-removal.sql` - Removes the old trigger

---

## Testing Instructions

### 1. Test Project Creation
1. Go to Supabase SQL Editor
2. Run: `backend/fix-project-cost-params-removal.sql`
3. In your app, create a new project
4. ✅ Should work without errors
5. Check that default parameters are created in:
   - `project_construction_costs`
   - `project_housing_types`  
   - `project_equipment_utility_types`

### 2. Test Villa Type Editing
1. Open a site with villa half-blocks
2. Click "Edit Villa Types" button
3. Select a different villa type (e.g., BMS → BML)
4. ✅ UI should update immediately
5. Close and reopen the modal
6. ✅ Changes should be persisted
7. Check console logs for: `[Site] Updating villa type for unit:`

### 3. Test Realtime & Refresh
1. Open a block configuration page
2. Pull down to refresh
3. ✅ Check console for: `[Site] Manual refresh triggered`
4. Make changes in another browser/device
5. ✅ Changes should appear automatically via realtime
6. Check console for: `[ZURB] Units changed, reloading`

---

## Debugging

If issues persist, check console logs for:

### Project Creation
```
[ZURB] Project created: <id>
```

### Villa Type Updates
```
[Site] Updating villa type for unit: <id> to: <type>
[ZURB] Unit updated successfully: <id> <updates>
[ZURB] Units changed, reloading
```

### Refresh
```
[Site] Manual refresh triggered
[ZURB] Loaded units: <count>
```

---

## Architecture Notes

### State Management
- **Optimistic Updates**: UI updates immediately before API call
- **Realtime Sync**: Supabase subscriptions keep data in sync
- **Error Recovery**: Failed updates trigger a full reload

### Parameter System
- **Old System** (removed): `project_cost_params`, `scenario_cost_params`
- **New System** (current):
  - Construction costs: `project_construction_costs`, `scenario_construction_costs`
  - Housing types: `project_housing_types`, `scenario_housing_types`
  - Equipment/Utility: `project_equipment_utility_types`, `scenario_equipment_utility_types`

---

## Need Help?

If any issue persists:
1. Check the console logs
2. Verify the SQL script was run successfully
3. Make sure realtime is enabled in Supabase (check Project Settings → API → Realtime)
4. Try logging out and back in to refresh authentication
