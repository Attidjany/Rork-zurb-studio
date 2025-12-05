# Account Settings Implementation

## Overview
This implementation adds account-level default settings that are used when creating new projects. Each user can customize their default parameters for:
- Construction costs (gold grams per m²)
- Housing types (apartments, villas, commercial)
- Equipment and utility types

## SQL Migration

Run the SQL file `backend/account-settings-schema.sql` in your Supabase SQL Editor.

This will:
1. Create `account_settings` table to store user settings
2. Create `account_construction_costs`, `account_housing_types`, and `account_equipment_utility_types` tables
3. Set up Row Level Security (RLS) policies
4. Create triggers to auto-initialize settings for new users
5. Update `auto_populate_project_types()` function to use account settings instead of hardcoded values
6. Initialize settings for all existing users

## How It Works

### 1. New User Registration
When a user signs up, the `initialize_account_settings()` trigger automatically:
- Creates an `account_settings` record for the user
- Populates it with default construction costs, housing types, and equipment types

### 2. Project Creation
When a user creates a new project, the updated `auto_populate_project_types()` trigger:
- Reads the user's account settings
- Copies all customized parameters to the new project
- If no account settings exist (shouldn't happen), creates them with defaults

### 3. Settings Management
Users can access Settings from the main page to:
- View all their default parameters
- Edit construction costs (gold grams per m²)
- Edit housing types (area, cost type, rent)
- Edit equipment types (land area, occupation %, cost type)
- Logout

## Features

### Settings Page
- **Construction Costs**: Edit gold grams per m² for each cost type (ZME, ZHE, ZOS, etc.)
  - Real-time calculation showing USD cost per m² based on current gold price
  
- **Housing Types**: Edit default parameters for apartments, villas, and commercial units
  - Default area (m²)
  - Default cost type (references construction costs)
  - Default monthly rent (XOF)
  
- **Equipment & Utility Types**: Edit parameters for equipment and utility buildings
  - Land area (m²)
  - Building occupation percentage
  - Cost type

### User Experience
- All parameters are editable via modal dialogs
- Changes are saved to the database immediately
- New projects automatically inherit the customized defaults
- Users can still override parameters at the project level

## Backend Changes

### New Tables
- `account_settings`: One record per user
- `account_construction_costs`: User's default construction cost parameters
- `account_housing_types`: User's default housing type parameters
- `account_equipment_utility_types`: User's default equipment/utility parameters

### Updated Functions
- `auto_populate_project_types()`: Now reads from account settings instead of using hardcoded values
- `initialize_account_settings()`: New function to set up defaults for new users

### New tRPC Routes
- `settings.get`: Fetch user's account settings
- `settings.updateConstructionCost`: Update a construction cost parameter
- `settings.updateHousingType`: Update a housing type parameter
- `settings.updateEquipmentType`: Update an equipment/utility type parameter

## Testing

1. **Run the SQL migration** in Supabase SQL Editor
2. **Create a new project** and verify it uses the default parameters
3. **Navigate to Settings** from the main page
4. **Edit some parameters** and save
5. **Create another project** and verify it uses your customized defaults
6. **Test with multiple users** to ensure settings are isolated per account

## Rollback

If you need to rollback, run:
```sql
-- Drop account settings tables
DROP TABLE IF EXISTS account_equipment_utility_types CASCADE;
DROP TABLE IF EXISTS account_housing_types CASCADE;
DROP TABLE IF EXISTS account_construction_costs CASCADE;
DROP TABLE IF EXISTS account_settings CASCADE;

-- Restore old trigger (use hardcoded values)
-- See backend/fix-all-schema-issues.sql for the old implementation
```
