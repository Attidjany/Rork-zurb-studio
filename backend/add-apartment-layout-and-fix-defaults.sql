-- Add apartment_layout column to half_blocks table
ALTER TABLE half_blocks
ADD COLUMN IF NOT EXISTS apartment_layout TEXT CHECK (apartment_layout IN ('AB1', 'AB2', 'ABH'));

-- Drop and recreate the project cost params function with corrected default values
-- Use CASCADE to drop the trigger that depends on this function
DROP FUNCTION IF EXISTS auto_generate_project_cost_params() CASCADE;

CREATE OR REPLACE FUNCTION auto_generate_project_cost_params()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default project cost params with correct values matching HOUSING_TYPES
  INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly) VALUES
    -- Construction Cost Types (no build area or rent)
    (NEW.id, 'ZME', 0, 0, 0),
    (NEW.id, 'ZHE', 0, 0, 0),
    (NEW.id, 'ZOS', 0, 0, 0),
    (NEW.id, 'ZMER', 0, 0, 0),
    (NEW.id, 'ZHER', 0, 0, 0),
    -- Apartment Types
    (NEW.id, 'AMS', 100, 0, 250000),  -- 100m², ZME, 250000 XOF/month
    (NEW.id, 'AML', 150, 0, 300000),  -- 150m², ZME, 300000 XOF/month
    (NEW.id, 'AH', 200, 0, 650000),   -- 200m², ZHE, 650000 XOF/month
    -- Villa Types
    (NEW.id, 'BMS', 150, 0, 400000),  -- 150m², ZME, 400000 XOF/month
    (NEW.id, 'BML', 250, 0, 550000),  -- 250m², ZME, 550000 XOF/month
    (NEW.id, 'BH', 300, 0, 750000),   -- 300m², ZHE, 750000 XOF/month
    (NEW.id, 'CH', 450, 0, 1300000),  -- 450m², ZHE, 1300000 XOF/month
    (NEW.id, 'CO', 450, 0, 2500000),  -- 450m², ZOS, 2500000 XOF/month
    -- Commercial Types
    (NEW.id, 'XM', 75, 0, 200000),    -- 75m², ZMER, 200000 XOF/month
    (NEW.id, 'XH', 75, 0, 300000),    -- 75m², ZHER, 300000 XOF/month
    -- Villa Plot Sizes
    (NEW.id, 'villa_200', 150, 0, 0),
    (NEW.id, 'villa_300', 200, 0, 0),
    (NEW.id, 'villa_500', 300, 0, 0),
    (NEW.id, 'villa_1000', 500, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing project cost params to correct values
UPDATE project_cost_params SET build_area_m2 = 100, rent_monthly = 250000 WHERE unit_type = 'AMS';
UPDATE project_cost_params SET build_area_m2 = 150, rent_monthly = 300000 WHERE unit_type = 'AML';
UPDATE project_cost_params SET build_area_m2 = 200, rent_monthly = 650000 WHERE unit_type = 'AH';
UPDATE project_cost_params SET build_area_m2 = 150, rent_monthly = 400000 WHERE unit_type = 'BMS';
UPDATE project_cost_params SET build_area_m2 = 250, rent_monthly = 550000 WHERE unit_type = 'BML';
UPDATE project_cost_params SET build_area_m2 = 300, rent_monthly = 750000 WHERE unit_type = 'BH';
UPDATE project_cost_params SET build_area_m2 = 450, rent_monthly = 1300000 WHERE unit_type = 'CH';
UPDATE project_cost_params SET build_area_m2 = 450, rent_monthly = 2500000 WHERE unit_type = 'CO';
UPDATE project_cost_params SET build_area_m2 = 75, rent_monthly = 200000 WHERE unit_type = 'XM';
UPDATE project_cost_params SET build_area_m2 = 75, rent_monthly = 300000 WHERE unit_type = 'XH';

-- Set cost_per_m2 to 0 for all units (will be calculated dynamically from gold prices)
UPDATE project_cost_params SET cost_per_m2 = 0;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
CREATE TRIGGER trigger_auto_generate_project_cost_params
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_generate_project_cost_params();
