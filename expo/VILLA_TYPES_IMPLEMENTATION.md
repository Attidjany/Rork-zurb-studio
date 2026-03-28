# Villa Types Implementation Instructions

This document explains the villa types feature and how to apply the database migration.

## Overview

The system now supports selecting specific villa types (BMS, BML, BH, CH, CO) for villas based on plot size, instead of using generic villa_200, villa_300, etc.

## Villa Type Mapping

- **200m² villas**: Can pick BMS (Villa MidEnd Small) or BML (Villa MidEnd Large)
- **300m² villas**: Can pick BML (Villa MidEnd Large) or BH (Villa Highend)
- **500m² villas**: Can pick BH (Villa Highend) or CH (Mansion HighEnd)
- **1000m² villas**: Can pick CH (Mansion HighEnd) or CO (Mansion OutStanding)

## How It Works

1. When you configure a half-block as "Villas" and select a layout, villa units are automatically created
2. Click "Edit Villa Types" button to assign villa types to groups of villas
3. All villas of the same plot size in a half-block share the same villa type selection
4. The villa type is stored in the `building_type` field of the `units` table

## Database Migration

To enable villa types in your database, run the following SQL:

```sql
-- Run this in your Supabase SQL Editor
```

Then copy and paste the contents of `backend/add-villa-types.sql` into the Supabase SQL Editor and execute it.

## Steps to Apply

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open the file `backend/add-villa-types.sql`
4. Copy its contents
5. Paste into the SQL Editor
6. Click "Run" to execute the migration

## What Changed

### Database
- Updated `units` table `building_type` constraint to include villa types: BMS, BML, BH, CH, CO
- Added optional `villa_type_selections` JSONB column to `half_blocks` table for future use

### Code
- Added villa type configurations in `constants/typologies.ts`
- Added `VILLA_TYPE_OPTIONS` mapping that shows available villa types per plot size
- Updated TypeScript types to include villa types in `BuildingType`
- Added villa type selection modal in site screen
- Villa units are now created automatically when selecting a villa layout

### UI
- "Edit Villa Types" button appears for villa half-blocks (similar to "Edit Buildings" for apartments)
- Modal groups villas by plot size and allows selection of appropriate villa types
- Shows villa type code (BMS, BML, etc.) and full name
- Selecting a villa type applies it to all villas of that size in the half-block

## Notes

- Villa types are linked to calculations and rental pricing through the housing types system
- The display now shows proper villa type codes instead of generic villa_200, villa_300, etc.
- This change does not affect existing data, but you can now assign villa types to existing villas
