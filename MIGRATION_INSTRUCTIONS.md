# Migration Instructions

## Changes Made

### 1. Added Apartment Layout Support
- **Added `apartment_layout` column** to `half_blocks` table to store AB1, AB2, or ABH selection
- **Updated UI** to show apartment layout selection (AB1, AB2, ABH) similar to villa layouts
- **Updated types** to include `ApartmentLayout` type and `apartment_layout` field in `DbHalfBlock`

### 2. Fixed Default Values
The default values in the database trigger were incorrect. The SQL migration fixes them to match:
- **AMS**: 100m², ZME, 250,000 XOF/month
- **AML**: 150m², ZME, 300,000 XOF/month
- **AH**: 200m², ZHE, 650,000 XOF/month
- **BMS**: 150m², ZME, 400,000 XOF/month
- **BML**: 250m², ZME, 550,000 XOF/month
- **BH**: 300m², ZHE, 750,000 XOF/month
- **CH**: 450m², ZHE, 1,300,000 XOF/month
- **CO**: 450m², ZOS, 2,500,000 XOF/month
- **XM**: 75m², ZMER, 200,000 XOF/month
- **XH**: 75m², ZHER, 300,000 XOF/month

## Database Migration Required

**You need to run the SQL migration file on your Supabase database:**

File: `backend/add-apartment-layout-and-fix-defaults.sql`

This migration will:
1. Add the `apartment_layout` column to `half_blocks` table
2. Update the `auto_generate_project_cost_params()` function with correct default values
3. Update existing project cost params to use the correct values

## How to Apply Migration

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `backend/add-apartment-layout-and-fix-defaults.sql`
4. Paste and run the SQL script

## What's Changed in the App

### User Experience
- When selecting "Apartments" for a half-block, users now see 3 layout options:
  - **AB1**: 10x AB1 buildings (18 AMS + 4 AML + 6 XM each) + 2 equipment + 1 utility
  - **AB2**: 10x AB2 buildings (16 AML + 6 XM each) + 2 equipment + 1 utility  
  - **ABH**: 10x ABH buildings (12 AH + 6 XH each) + 2 equipment + 1 utility

- This works exactly like villa layouts (200-300/500/1000)
- The apartment layout is stored at the half-block level
- All apartment buildings in that half-block will use the selected layout
- Rental and surface values now correctly reflect the values from your specifications

### Files Modified
- `types/index.ts` - Added `ApartmentLayout` type and updated interfaces
- `constants/typologies.ts` - Changed `APARTMENT_LAYOUT` to `APARTMENT_LAYOUTS` array with AB1, AB2, ABH configs
- `app/site/[id].tsx` - Added apartment layout selection UI
- `contexts/ZURBContext.tsx` - Updated `updateHalfBlock` to support `apartment_layout`
- `app/scenario/[id].tsx` - Updated summary calculation to use apartment layouts
- `backend/add-apartment-layout-and-fix-defaults.sql` - Database migration script

## Testing

After applying the migration:
1. Create a new project
2. Verify that project parameters show the correct default values
3. Add a site
4. Configure a half-block as "Apartments"
5. Select an apartment layout (AB1, AB2, or ABH)
6. Create a scenario and verify the summary shows correct unit counts and values
