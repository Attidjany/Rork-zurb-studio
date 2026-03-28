-- Create tables for project-specific custom types
-- These allow users to customize construction costs, housing types, and equipment/utility types per project

-- Project custom construction cost types
CREATE TABLE IF NOT EXISTS project_construction_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  gold_grams_per_m2 NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, code)
);

-- Project custom housing types (apartments, villas, commercial)
CREATE TABLE IF NOT EXISTS project_housing_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('apartment', 'villa', 'commercial')),
  default_area_m2 NUMERIC NOT NULL,
  default_cost_type TEXT NOT NULL,
  default_rent_monthly NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, code)
);

-- Project custom equipment/utility types
CREATE TABLE IF NOT EXISTS project_equipment_utility_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('equipment', 'utility')),
  land_area_m2 NUMERIC NOT NULL DEFAULT 1800,
  building_occupation_pct NUMERIC NOT NULL DEFAULT 0.3,
  cost_type TEXT NOT NULL DEFAULT 'ZMER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, code)
);

-- RLS Policies for project_construction_costs
ALTER TABLE project_construction_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read construction costs from own projects" ON project_construction_costs;
DROP POLICY IF EXISTS "Users can insert construction costs in own projects" ON project_construction_costs;
DROP POLICY IF EXISTS "Users can update construction costs in own projects" ON project_construction_costs;
DROP POLICY IF EXISTS "Users can delete construction costs in own projects" ON project_construction_costs;

CREATE POLICY "Users can read construction costs from own projects" ON project_construction_costs FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can insert construction costs in own projects" ON project_construction_costs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update construction costs in own projects" ON project_construction_costs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete construction costs in own projects" ON project_construction_costs FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);

-- RLS Policies for project_housing_types
ALTER TABLE project_housing_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read housing types from own projects" ON project_housing_types;
DROP POLICY IF EXISTS "Users can insert housing types in own projects" ON project_housing_types;
DROP POLICY IF EXISTS "Users can update housing types in own projects" ON project_housing_types;
DROP POLICY IF EXISTS "Users can delete housing types in own projects" ON project_housing_types;

CREATE POLICY "Users can read housing types from own projects" ON project_housing_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can insert housing types in own projects" ON project_housing_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update housing types in own projects" ON project_housing_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete housing types in own projects" ON project_housing_types FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);

-- RLS Policies for project_equipment_utility_types
ALTER TABLE project_equipment_utility_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read equipment utility types from own projects" ON project_equipment_utility_types;
DROP POLICY IF EXISTS "Users can insert equipment utility types in own projects" ON project_equipment_utility_types;
DROP POLICY IF EXISTS "Users can update equipment utility types in own projects" ON project_equipment_utility_types;
DROP POLICY IF EXISTS "Users can delete equipment utility types in own projects" ON project_equipment_utility_types;

CREATE POLICY "Users can read equipment utility types from own projects" ON project_equipment_utility_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can insert equipment utility types in own projects" ON project_equipment_utility_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update equipment utility types in own projects" ON project_equipment_utility_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete equipment utility types in own projects" ON project_equipment_utility_types FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);

-- Update triggers for updated_at
CREATE TRIGGER update_project_construction_costs_updated_at BEFORE UPDATE ON project_construction_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_housing_types_updated_at BEFORE UPDATE ON project_housing_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_equipment_utility_types_updated_at BEFORE UPDATE ON project_equipment_utility_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-populate default types when a project is created
CREATE OR REPLACE FUNCTION auto_populate_project_types()
RETURNS trigger AS $$
BEGIN
  -- Insert default construction costs
  INSERT INTO project_construction_costs (project_id, code, name, gold_grams_per_m2)
  VALUES
    (NEW.id, 'ZME', 'Zenoàh Mid End', 14.91),
    (NEW.id, 'ZHE', 'Zenoàh High End', 20.9),
    (NEW.id, 'ZOS', 'Zenoàh Out-Standing', 26.9),
    (NEW.id, 'ZMER', 'Zenoàh Mid End Reduced (ZME -15%)', 12.6735),
    (NEW.id, 'ZHER', 'Zenoàh High End Reduced (ZHE -15%)', 17.765);

  -- Insert default housing types
  INSERT INTO project_housing_types (project_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
  VALUES
    (NEW.id, 'AMS', 'Apartment MidEnd Small', 'apartment', 100, 'ZME', 250000),
    (NEW.id, 'AML', 'Apartment MidEnd Large', 'apartment', 150, 'ZME', 300000),
    (NEW.id, 'AH', 'Apartment High-end', 'apartment', 200, 'ZHE', 650000),
    (NEW.id, 'BMS', 'Villa MidEnd Small', 'villa', 150, 'ZME', 400000),
    (NEW.id, 'BML', 'Villa MidEnd Large', 'villa', 250, 'ZME', 550000),
    (NEW.id, 'BH', 'Villa Highend', 'villa', 300, 'ZHE', 750000),
    (NEW.id, 'CH', 'Mansion HighEnd', 'villa', 450, 'ZHE', 1300000),
    (NEW.id, 'CO', 'Mansion OutStanding', 'villa', 450, 'ZOS', 2500000),
    (NEW.id, 'XM', 'Commercial MidEnd', 'commercial', 75, 'ZMER', 200000),
    (NEW.id, 'XH', 'Commercial HighEnd', 'commercial', 75, 'ZHER', 300000);

  -- Insert default equipment/utility types
  INSERT INTO project_equipment_utility_types (project_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  VALUES
    (NEW.id, 'EQS', 'Equipment Small', 'equipment', 1800, 0.3, 'ZMER'),
    (NEW.id, 'EQL', 'Equipment Large', 'equipment', 2400, 0.3, 'ZMER'),
    (NEW.id, 'UTL', 'Utility', 'utility', 1800, 0.3, 'ZMER');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-populate types on project creation
DROP TRIGGER IF EXISTS trigger_auto_populate_project_types ON projects;
CREATE TRIGGER trigger_auto_populate_project_types
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_populate_project_types();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_construction_costs_project_id ON project_construction_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_housing_types_project_id ON project_housing_types(project_id);
CREATE INDEX IF NOT EXISTS idx_project_equipment_utility_types_project_id ON project_equipment_utility_types(project_id);
