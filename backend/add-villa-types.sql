-- Add villa types to building_type constraint in units table
-- This allows villa types (BMS, BML, BH, CH, CO) to be stored alongside apartment types

-- Drop existing constraint
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_type_check;

-- Add new constraint that includes villa types
ALTER TABLE units ADD CONSTRAINT units_building_type_check 
  CHECK (building_type IN (
    'AB1', 'AB2', 'ABH',           -- Apartment building types
    'BMS', 'BML', 'BH', 'CH', 'CO', -- Villa types
    'EQS', 'EQL',                   -- Equipment types
    'UTL'                           -- Utility type
  ));

-- Update half_blocks to store villa type selections (optional, for future use)
-- This will store the selected villa types per plot size as JSON
-- Format: {"200": "BMS", "300": "BML", "500": "BH", "1000": "CH"}
ALTER TABLE half_blocks ADD COLUMN IF NOT EXISTS villa_type_selections JSONB DEFAULT '{}'::jsonb;
