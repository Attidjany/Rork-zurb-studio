# ZURB Studio - Simplified Setup Guide

## Overview

This app has been completely rebuilt with a simplified architecture focused on basic functionality using Supabase realtime subscriptions.

## Data Model

### Hierarchy
```
Projects
  └─ Sites (with area in hectares)
      └─ Blocks (6ha each, auto-generated)
          └─ Half Blocks (North & South)
              ├─ Villas (3 layout options)
              │   └─ Units/Plots
              └─ Apartments (13 buildings)
                  └─ Units/Buildings
```

### Villa Layouts
1. **200/300 sqm Mix**: 26 plots of 200sqm + 24 plots of 300sqm (50 total units)
2. **500 sqm**: 30 plots of 500sqm each
3. **1000 sqm**: 20 plots of 1000sqm each

### Apartment Buildings
- 10 apartment buildings (user picks type: AM1, AM2, or AH)
- 2 equipment spots (user picks from list)
- 1 utility spot (user picks from list)

## Database Setup

**IMPORTANT**: You need to run the new simplified schema in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/supabase-schema-simplified.sql`
4. Run the query

This will:
- Drop all old tables and recreate the simplified schema
- Set up proper RLS policies
- Create auto-generation triggers for blocks and half-blocks
- Enable realtime subscriptions

## How It Works

### 1. Creating a Site
When you create a site with an area (e.g., 18 hectares):
- The system automatically calculates number of 6ha blocks: `floor(18 / 6) = 3 blocks`
- Database trigger creates blocks automatically
- Database trigger creates North and South half-blocks for each block

### 2. Configuring Half-Blocks
For each half-block, tap to configure:
- Select "Villas" or "Apartments"
- If Villas: Choose layout (200/300 mix, 500, or 1000)
- If Apartments: Fixed layout with 13 buildings

### 3. Scenarios
- Create scenarios to capture different configuration snapshots
- View summary with:
  - Total residential units
  - Unit types breakdown
  - Total build area
  - Total costs
  - Expected revenue
  - Rental period analysis

## Key Features

### Realtime Updates
All data syncs automatically using Supabase realtime subscriptions:
- Projects list updates instantly
- Sites list updates when blocks are generated
- Blocks and half-blocks appear in real-time
- Pull-to-refresh on all screens for manual sync

### Simple Architecture
- No complex tRPC backend
- Direct Supabase client calls
- Automatic block/half-block generation via DB triggers
- Clean TypeScript types throughout

## Next Steps

If you need to add more features:

1. **Unit Details**: Expand the units table to store individual plot/building configurations
2. **Building Type Selection**: Add UI to let users pick AM1/AM2/AH for apartment buildings
3. **Equipment Configuration**: Add UI for selecting equipment and utility types
4. **Advanced Calculations**: Enhance scenario summary with more detailed financial metrics
5. **Export**: Add PDF/CSV export functionality for scenarios

## Files Modified

- `backend/supabase-schema-simplified.sql` - New simplified database schema
- `types/index.ts` - Updated TypeScript types
- `constants/typologies.ts` - Villa layouts, apartment config, and cost data
- `contexts/ZURBContext.tsx` - Simplified context with realtime subscriptions
- `app/index.tsx` - Projects list (removed settings)
- `app/project/[id].tsx` - Project details with sites
- `app/site/[id].tsx` - Site details with block configuration UI
- `app/scenario/[id].tsx` - Scenario summary with calculations

## Important Notes

- The old complex schema with parcels, typologies, and cost_params has been removed
- Settings screen has been removed (add it back if needed)
- All calculations are now done client-side with constants
- Realtime subscriptions ensure data stays in sync across devices
