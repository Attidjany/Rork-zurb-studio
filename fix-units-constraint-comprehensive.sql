-- Comprehensive fix for units building_type constraint
-- This handles all existing data and adds a complete constraint

-- Step 1: Drop the existing constraint
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_type_check;

-- Step 2: Update existing data to conform to new structure
-- Update any old 'equipment' references to specific equipment types
UPDATE units SET building_type = 'EQS' WHERE building_type = 'equipment';
UPDATE units SET building_type = 'UTL' WHERE building_type = 'utility';

-- Update any apartment building types that might use old naming
UPDATE units SET building_type = 'AB1' WHERE building_type = 'AM1';
UPDATE units SET building_type = 'AB2' WHERE building_type = 'AM2';
UPDATE units SET building_type = 'ABH' WHERE building_type = 'AH';

-- Step 3: Add comprehensive constraint that includes:
-- - Apartment building layouts: AB1, AB2, ABH
-- - Villa building types: BMS, BML, BH, CH, CO
-- - Commercial building types: XM, XH
-- - Equipment and utility types: EQS, EQL, UTL
ALTER TABLE units ADD CONSTRAINT units_building_type_check 
  CHECK (building_type IS NULL OR building_type IN (
    'AB1', 'AB2', 'ABH',           -- Apartment building layouts
    'BMS', 'BML', 'BH', 'CH', 'CO', -- Villa building types
    'XM', 'XH',                      -- Commercial building types
    'EQS', 'EQL', 'UTL'             -- Equipment and utility building types
  ));
