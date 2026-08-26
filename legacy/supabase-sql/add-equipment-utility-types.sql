-- Update units table constraint to include new building types
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_type_check;
ALTER TABLE units ADD CONSTRAINT units_building_type_check 
  CHECK (building_type IN ('AB1', 'AB2', 'ABH', 'EQS', 'EQL', 'UTL'));

-- Update project cost params function to include equipment and utility types
DROP FUNCTION IF EXISTS auto_generate_project_cost_params() CASCADE;

CREATE OR REPLACE FUNCTION auto_generate_project_cost_params()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly) VALUES
    -- Construction Cost Types (gold g/m²)
    (NEW.id, 'ZME', 0, 0, 0),
    (NEW.id, 'ZHE', 0, 0, 0),
    (NEW.id, 'ZOS', 0, 0, 0),
    (NEW.id, 'ZMER', 0, 0, 0),
    (NEW.id, 'ZHER', 0, 0, 0),
    -- Apartment Types
    (NEW.id, 'AMS', 100, 0, 250000),
    (NEW.id, 'AML', 150, 0, 300000),
    (NEW.id, 'AH', 200, 0, 650000),
    -- Villa Types
    (NEW.id, 'BMS', 150, 0, 400000),
    (NEW.id, 'BML', 250, 0, 550000),
    (NEW.id, 'BH', 300, 0, 750000),
    (NEW.id, 'CH', 450, 0, 1300000),
    (NEW.id, 'CO', 450, 0, 2500000),
    -- Commercial Types
    (NEW.id, 'XM', 75, 0, 200000),
    (NEW.id, 'XH', 75, 0, 300000),
    -- Villa Plot Sizes
    (NEW.id, 'villa_200', 150, 0, 0),
    (NEW.id, 'villa_300', 200, 0, 0),
    (NEW.id, 'villa_500', 300, 0, 0),
    (NEW.id, 'villa_1000', 500, 0, 0),
    -- Equipment and Utility Building Types (land area, 30% occupation, ZMER cost type)
    -- EQS: 1800m² land × 30% = 540m² built area
    (NEW.id, 'EQS', 540, 0, 0),
    -- EQL: 2400m² land × 30% = 720m² built area
    (NEW.id, 'EQL', 720, 0, 0),
    -- UTL: 1800m² land × 30% = 540m² built area
    (NEW.id, 'UTL', 540, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add equipment and utility types to existing projects
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

-- Recreate the trigger
CREATE TRIGGER trigger_auto_generate_project_cost_params
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_generate_project_cost_params();
