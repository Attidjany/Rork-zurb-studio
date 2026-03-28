# Occupancy Rates Update Instructions

## Overview
This update adds account-level occupancy parameters that can be edited in the settings page. The population calculation in scenarios now uses these customizable parameters instead of hardcoded values.

## Database Changes

### Run this SQL script in your Supabase SQL editor:

```sql
-- File: backend/add-occupancy-rates.sql
```

Run the entire content of `backend/add-occupancy-rates.sql` in your Supabase SQL editor. This will:

1. Create the `account_occupancy_rates` table
2. Set up RLS policies
3. Update the `initialize_account_settings()` function to include default occupancy rates
4. Initialize occupancy rates for existing accounts

## Default Occupancy Rates

The system sets up these default rates for new accounts:

### Apartments:
- 0-80 m²: 3 people per unit
- 81-120 m²: 4 people per unit
- 121+ m²: 5 people per unit

### Villas:
- 0-400 m²: 4 people per unit
- 401-700 m²: 5 people per unit
- 701+ m²: 6 people per unit

## Features

### Settings Page
- New "Occupancy Rates" section in the account settings
- Edit min/max area ranges and people per unit for each category (villa/apartment)
- Visual badge showing "People/Unit"
- Ability to set unlimited max area (∞) by leaving the field empty

### Scenario Calculations
- Population estimates now use account-level occupancy parameters
- Falls back to default values (4 for villas, 3 for apartments) if no rate is found
- Updates automatically when occupancy rates are changed in settings

## Files Modified

1. **backend/add-occupancy-rates.sql** - New SQL schema for occupancy rates
2. **app/settings.tsx** - Added occupancy rates UI
3. **app/scenario/[id].tsx** - Updated population calculation to use account occupancy rates

## Deployment Steps

1. Run `backend/add-occupancy-rates.sql` in Supabase SQL editor
2. Deploy the updated application code
3. Verify that:
   - Settings page shows occupancy rates section
   - Occupancy rates can be edited
   - Scenario population calculations reflect the account settings

## Testing

1. Go to Settings page
2. Verify occupancy rates are displayed
3. Edit an occupancy rate and save
4. Go to a scenario page
5. Verify the estimated population reflects your occupancy settings
