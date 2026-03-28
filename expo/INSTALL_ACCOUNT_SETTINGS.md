# Complete Account Settings Setup - SQL Instructions

## Step 1: Run This SQL in Supabase SQL Editor

Copy and paste the entire content of `backend/account-settings-schema.sql` into your Supabase SQL Editor and execute it.

This single migration will:
✅ Create all account settings tables
✅ Set up RLS policies  
✅ Create triggers for auto-initialization
✅ Update project creation to use account settings
✅ Initialize settings for existing users

## Step 2: Verify Installation

Run this query to verify everything is set up correctly:

```sql
-- Check if account settings exist for your user
SELECT 
  (SELECT COUNT(*) FROM account_settings) as account_settings_count,
  (SELECT COUNT(*) FROM account_construction_costs) as construction_costs_count,
  (SELECT COUNT(*) FROM account_housing_types) as housing_types_count,
  (SELECT COUNT(*) FROM account_equipment_utility_types) as equipment_types_count;
```

Expected results:
- `account_settings_count`: Should equal the number of users in your system
- `construction_costs_count`: Should be at least 5 per user (ZME, ZHE, ZOS, ZMER, ZHER)
- `housing_types_count`: Should be at least 10 per user (AMS, AML, AH, BMS, BML, BH, CH, CO, XM, XH)
- `equipment_types_count`: Should be at least 3 per user (EQS, EQL, UTL)

## Step 3: Test the Functionality

### Test 1: View Settings
1. Navigate to the Settings page in your app (from the main page)
2. You should see all your default parameters loaded

### Test 2: Edit a Parameter
1. Tap on any construction cost item
2. Change the gold grams per m² value
3. Save
4. Verify it's updated in the UI

### Test 3: Create a New Project
1. Create a new project
2. Go to Project Parameters
3. Verify the parameters match your account settings (including any edits you made)

## Architecture Overview

```
User Signs Up
    ↓
handle_new_user() creates profile
    ↓
initialize_account_settings() creates account settings with defaults
    ↓
User can edit settings in Settings page
    ↓
User creates a project
    ↓
auto_populate_project_types() copies from account settings to project
    ↓
Project has customized defaults (not hardcoded values)
```

## Key Benefits

1. **No More Hardcoded Defaults**: Each user controls their own default values
2. **Consistent Project Setup**: All new projects start with the user's preferred defaults
3. **Easy Customization**: Users can adjust defaults without touching project-level parameters
4. **Per-Account Isolation**: Each user's settings are completely independent

## Files Modified

### Backend
- `backend/account-settings-schema.sql` - Main migration file (NEW)
- `backend/trpc/routes/settings/get/route.ts` - Fetch settings endpoint (NEW)
- `backend/trpc/routes/settings/update-construction-cost/route.ts` - Update construction cost (NEW)
- `backend/trpc/routes/settings/update-housing-type/route.ts` - Update housing type (NEW)
- `backend/trpc/routes/settings/update-equipment-type/route.ts` - Update equipment type (NEW)
- `backend/trpc/app-router.ts` - Added settings routes (MODIFIED)

### Frontend
- `app/settings.tsx` - Settings UI with edit functionality (MODIFIED)

## Notes

- The migration is idempotent (safe to run multiple times)
- All existing projects remain unchanged
- Only NEW projects created AFTER running the migration will use account settings
- Settings are stored per user, not per project
- Project-level parameters can still override account defaults
