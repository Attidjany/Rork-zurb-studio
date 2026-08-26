-- Fix building_type check constraint to use AB1, AB2, ABH instead of AM1, AM2, AH
-- Also add new building types: EQS, EQL, UTL

-- Drop the old constraint
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_type_check;

-- Add the new constraint with correct building type names
ALTER TABLE units ADD CONSTRAINT units_building_type_check 
  CHECK (building_type IN ('AB1', 'AB2', 'ABH', 'EQS', 'EQL', 'UTL', 'equipment', 'utility'));

-- Update any existing data with old building type names to new names (if any exist)
UPDATE units SET building_type = 'AB1' WHERE building_type = 'AM1';
UPDATE units SET building_type = 'AB2' WHERE building_type = 'AM2';
UPDATE units SET building_type = 'ABH' WHERE building_type = 'AH';
