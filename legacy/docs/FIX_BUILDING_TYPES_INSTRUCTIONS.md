# Fix Building Types and Equipment/Utility Buildings

This migration fixes the check constraint error and adds proper support for equipment and utility building types.

## Issues Fixed

1. ✅ Check constraint error: `units_building_type_check` now includes AB1, AB2, ABH instead of AM1, AM2, AH
2. ✅ Added proper building types for equipment and utility: EQS, EQL, UTL
3. ✅ Added land_area_m2 column to track parcel sizes
4. ✅ Updated default cost parameters to include equipment/utility types

## Migration Steps

### Step 1: Run the SQL Migration

Execute the SQL file in your Supabase SQL Editor:

```bash
# The file is located at: fix-building-types-and-equipment.sql
```

Or copy and paste this SQL directly:

```sql
-- Fix building type check constraint and add equipment/utility building types

-- Step 1: Drop the old check constraint
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_type_check;

-- Step 2: Add new check constraint with correct building types
ALTER TABLE units ADD CONSTRAINT units_building_type_check 
  CHECK (building_type IN ('AB1', 'AB2', 'ABH', 'EQS', 'EQL', 'UTL'));

-- Step 3: Add land_area_m2 column to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS land_area_m2 NUMERIC;

-- Step 4: Update existing project cost params (for existing projects)
INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
SELECT 
  p.id,
  'EQS',
  540,
  0,
  0
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_cost_params 
  WHERE project_id = p.id AND unit_type = 'EQS'
);

INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
SELECT 
  p.id,
  'EQL',
  720,
  0,
  0
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_cost_params 
  WHERE project_id = p.id AND unit_type = 'EQL'
);

INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
SELECT 
  p.id,
  'UTL',
  540,
  0,
  0
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_cost_params 
  WHERE project_id = p.id AND unit_type = 'UTL'
);

-- Step 5: Update the auto-generate function (for new projects)
CREATE OR REPLACE FUNCTION auto_generate_project_cost_params()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly) VALUES
    (NEW.id, 'ZME', 0, 0, 0),
    (NEW.id, 'ZHE', 0, 0, 0),
    (NEW.id, 'ZOS', 0, 0, 0),
    (NEW.id, 'ZMER', 0, 0, 0),
    (NEW.id, 'ZHER', 0, 0, 0),
    (NEW.id, 'AMS', 100, 0, 250000),
    (NEW.id, 'AML', 150, 0, 300000),
    (NEW.id, 'AH', 200, 0, 650000),
    (NEW.id, 'BMS', 150, 0, 400000),
    (NEW.id, 'BML', 250, 0, 550000),
    (NEW.id, 'BH', 300, 0, 750000),
    (NEW.id, 'CH', 450, 0, 1300000),
    (NEW.id, 'CO', 450, 0, 2500000),
    (NEW.id, 'XM', 75, 0, 200000),
    (NEW.id, 'XH', 75, 0, 300000),
    (NEW.id, 'villa_200', 150, 0, 800),
    (NEW.id, 'villa_300', 200, 0, 1000),
    (NEW.id, 'villa_500', 300, 0, 1200),
    (NEW.id, 'villa_1000', 500, 0, 2000),
    (NEW.id, 'EQS', 540, 0, 0),
    (NEW.id, 'EQL', 720, 0, 0),
    (NEW.id, 'UTL', 540, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

### Step 2: Verify the Changes

After running the migration, verify:

1. Check that the constraint was updated:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'units_building_type_check';
```

2. Check that new cost params exist for your projects:
```sql
SELECT project_id, unit_type, build_area_m2
FROM project_cost_params
WHERE unit_type IN ('EQS', 'EQL', 'UTL')
ORDER BY project_id;
```

## Building Type Definitions

### Apartment Building Types
- **AB1**: 18 AMS + 4 AML + 6 XM units per building (600m² parcel)
- **AB2**: 16 AML + 6 XM units per building (600m² parcel)
- **ABH**: 12 AH + 6 XH units per building (600m² parcel)

### Equipment Building Types
- **EQS** (Equipment Small): 1800m² land, 30% occupation = 540m² build area, ZMER cost
- **EQL** (Equipment Large): 2400m² land, 30% occupation = 720m² build area, ZMER cost

### Utility Building Types
- **UTL** (Utility): 1800m² land, 30% occupation = 540m² build area, ZMER cost

## Hierarchical Structure

The new structure follows this hierarchy:

```
Site (e.g., 24ha)
  └─ Blocks (6ha each)
      └─ Midblocks (North/South, 3ha each)
          └─ Parcels
              ├─ Villa Parcels (200m², 300m², 500m², 1000m²)
              ├─ Apartment Parcels (600m²)
              └─ Equipment/Utility Parcels (1800m², 2400m²)
                  └─ Buildings on Parcels
                      ├─ Villa Types: BMS, BML, BH, CH, CO
                      ├─ Apartment Buildings: AB1, AB2, ABH
                      │   └─ Comprising housing units: AMS, AML, AH, XM, XH
                      ├─ Equipment: EQS, EQL
                      └─ Utility: UTL
```

## Cost Calculation

### Construction Costs per m²
- ZME: 14.91g Au/m²
- ZHE: 20.9g Au/m²
- ZOS: 26.9g Au/m²
- ZMER: 12.6735g Au/m² (ZME -15%)
- ZHER: 17.765g Au/m² (ZHE -15%)

### Equipment/Utility Cost Calculation
Equipment and utility buildings use ZMER construction cost type:
- Build Area = Land Area × 30%
- Construction Cost = Build Area × ZMER cost per m²

Example:
- EQS: 1800m² × 0.3 = 540m² × ZMER = total cost
- EQL: 2400m² × 0.3 = 720m² × ZMER = total cost
- UTL: 1800m² × 0.3 = 540m² × ZMER = total cost

## Code Changes Made

1. ✅ Updated `types/index.ts` - BuildingType now includes EQS, EQL, UTL
2. ✅ Updated `constants/typologies.ts` - Added building type configs with land areas
3. ✅ Updated `app/site/[id].tsx` - Fixed building type assignments
4. ✅ Updated `app/scenario/[id].tsx` - Added equipment/utility cost calculations
5. ✅ Updated `fix-building-types-and-equipment.sql` - Database migration script

## Testing

After applying the migration:

1. Try selecting an apartment building type (AB1, AB2, or ABH) - should work without constraint errors
2. Equipment and utility buildings should be automatically created when you select an apartment layout
3. Cost calculations should include equipment/utility building costs using ZMER
4. Check the scenario summary to verify all costs are calculated correctly
