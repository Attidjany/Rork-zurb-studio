-- Fix building type check constraint and add equipment/utility building types
-- This migration fixes the units table check constraint to support AB1, AB2, ABH
-- and adds EQS, EQL, UTL as proper building types with land areas

-- Step 1: Drop the old check constraint
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_type_check;

-- Step 2: Add new check constraint with correct building types
ALTER TABLE units ADD CONSTRAINT units_building_type_check 
  CHECK (building_type IN ('AB1', 'AB2', 'ABH', 'EQS', 'EQL', 'UTL'));

-- Step 3: Add land_area_m2 column to units table to track parcel size
ALTER TABLE units ADD COLUMN IF NOT EXISTS land_area_m2 NUMERIC;

-- Step 4: Update project cost params to include equipment/utility building types
-- First, add EQS (Equipment Small), EQL (Equipment Large), UTL (Utility)
INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
SELECT 
  p.id,
  'EQS',
  540,  -- 1800m² land × 30% occupation
  0,    -- Uses ZMER (will be calculated dynamically)
  0     -- No rent
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_cost_params 
  WHERE project_id = p.id AND unit_type = 'EQS'
);

INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
SELECT 
  p.id,
  'EQL',
  720,  -- 2400m² land × 30% occupation
  0,    -- Uses ZMER (will be calculated dynamically)
  0     -- No rent
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_cost_params 
  WHERE project_id = p.id AND unit_type = 'EQL'
);

INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
SELECT 
  p.id,
  'UTL',
  540,  -- 1800m² land × 30% occupation
  0,    -- Uses ZMER (will be calculated dynamically)
  0     -- No rent
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_cost_params 
  WHERE project_id = p.id AND unit_type = 'UTL'
);

-- Step 5: Update the auto-generate function to include new building types
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

-- Step 6: Refresh the schema cache
NOTIFY pgrst, 'reload schema';
