-- Add missing custom types tables if they don't exist

-- Project Construction Costs (custom cost types per project)
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

-- Project Housing Types (custom housing types per project)
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

-- Project Equipment/Utility Types (custom equipment/utility types per project)
CREATE TABLE IF NOT EXISTS project_equipment_utility_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('equipment', 'utility')),
  land_area_m2 NUMERIC NOT NULL,
  building_occupation_pct NUMERIC NOT NULL,
  cost_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, code)
);

-- Enable RLS on custom types tables
ALTER TABLE project_construction_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_housing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_equipment_utility_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can read project_construction_costs" ON project_construction_costs;
DROP POLICY IF EXISTS "Users can create project_construction_costs" ON project_construction_costs;
DROP POLICY IF EXISTS "Users can update project_construction_costs" ON project_construction_costs;
DROP POLICY IF EXISTS "Users can delete project_construction_costs" ON project_construction_costs;

DROP POLICY IF EXISTS "Users can read project_housing_types" ON project_housing_types;
DROP POLICY IF EXISTS "Users can create project_housing_types" ON project_housing_types;
DROP POLICY IF EXISTS "Users can update project_housing_types" ON project_housing_types;
DROP POLICY IF EXISTS "Users can delete project_housing_types" ON project_housing_types;

DROP POLICY IF EXISTS "Users can read project_equipment_utility_types" ON project_equipment_utility_types;
DROP POLICY IF EXISTS "Users can create project_equipment_utility_types" ON project_equipment_utility_types;
DROP POLICY IF EXISTS "Users can update project_equipment_utility_types" ON project_equipment_utility_types;
DROP POLICY IF EXISTS "Users can delete project_equipment_utility_types" ON project_equipment_utility_types;

-- Project Construction Costs policies
CREATE POLICY "Users can read project_construction_costs" ON project_construction_costs FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can create project_construction_costs" ON project_construction_costs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update project_construction_costs" ON project_construction_costs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete project_construction_costs" ON project_construction_costs FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_construction_costs.project_id AND projects.owner_id = auth.uid())
);

-- Project Housing Types policies
CREATE POLICY "Users can read project_housing_types" ON project_housing_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can create project_housing_types" ON project_housing_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update project_housing_types" ON project_housing_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete project_housing_types" ON project_housing_types FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_housing_types.project_id AND projects.owner_id = auth.uid())
);

-- Project Equipment/Utility Types policies
CREATE POLICY "Users can read project_equipment_utility_types" ON project_equipment_utility_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can create project_equipment_utility_types" ON project_equipment_utility_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update project_equipment_utility_types" ON project_equipment_utility_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete project_equipment_utility_types" ON project_equipment_utility_types FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_equipment_utility_types.project_id AND projects.owner_id = auth.uid())
);

-- Update triggers for custom types tables
DROP TRIGGER IF EXISTS update_project_construction_costs_updated_at ON project_construction_costs;
CREATE TRIGGER update_project_construction_costs_updated_at BEFORE UPDATE ON project_construction_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_housing_types_updated_at ON project_housing_types;
CREATE TRIGGER update_project_housing_types_updated_at BEFORE UPDATE ON project_housing_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_equipment_utility_types_updated_at ON project_equipment_utility_types;
CREATE TRIGGER update_project_equipment_utility_types_updated_at BEFORE UPDATE ON project_equipment_utility_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update auto_generate_project_cost_params to also create custom types
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
DROP FUNCTION IF EXISTS auto_generate_project_cost_params() CASCADE;

CREATE OR REPLACE FUNCTION auto_generate_project_cost_params()
RETURNS TRIGGER AS $$
DECLARE
  gold_price_per_gram NUMERIC := 85.0;
  xof_to_usd NUMERIC := 656.0;
BEGIN
  -- Insert default cost params
  INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly) VALUES
    (NEW.id, 'ZME', 0, 14.91 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZHE', 0, 20.9 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZOS', 0, 26.9 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZMER', 0, 14.91 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZHER', 0, 20.9 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'AMS', 75, 14.91 * gold_price_per_gram * xof_to_usd, 500),
    (NEW.id, 'AML', 100, 14.91 * gold_price_per_gram * xof_to_usd, 600),
    (NEW.id, 'AH', 120, 20.9 * gold_price_per_gram * xof_to_usd, 850),
    (NEW.id, 'BMS', 130, 14.91 * gold_price_per_gram * xof_to_usd, 750),
    (NEW.id, 'BML', 180, 14.91 * gold_price_per_gram * xof_to_usd, 950),
    (NEW.id, 'BH', 220, 20.9 * gold_price_per_gram * xof_to_usd, 1200),
    (NEW.id, 'CH', 250, 20.9 * gold_price_per_gram * xof_to_usd, 1400),
    (NEW.id, 'CO', 160, 14.91 * gold_price_per_gram * xof_to_usd, 900),
    (NEW.id, 'XM', 50, 14.91 * gold_price_per_gram * xof_to_usd, 300),
    (NEW.id, 'XH', 80, 20.9 * gold_price_per_gram * xof_to_usd, 450),
    (NEW.id, 'villa_200', 150, 14.91 * gold_price_per_gram * xof_to_usd, 800),
    (NEW.id, 'villa_300', 200, 14.91 * gold_price_per_gram * xof_to_usd, 1000),
    (NEW.id, 'villa_500', 300, 20.9 * gold_price_per_gram * xof_to_usd, 1200),
    (NEW.id, 'villa_1000', 500, 26.9 * gold_price_per_gram * xof_to_usd, 2000);
  
  -- Insert default construction costs
  INSERT INTO project_construction_costs (project_id, code, name, gold_grams_per_m2) VALUES
    (NEW.id, 'ZME', 'Mid-End', 14.91),
    (NEW.id, 'ZHE', 'High-End', 20.9),
    (NEW.id, 'ZOS', 'Outstanding', 26.9),
    (NEW.id, 'ZMER', 'Mid-End Renovated', 14.91),
    (NEW.id, 'ZHER', 'High-End Renovated', 20.9);
  
  -- Insert default housing types
  INSERT INTO project_housing_types (project_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly) VALUES
    (NEW.id, 'AMS', 'Apartment Mid S', 'apartment', 75, 'ZME', 500),
    (NEW.id, 'AML', 'Apartment Mid L', 'apartment', 100, 'ZME', 600),
    (NEW.id, 'AH', 'Apartment High', 'apartment', 120, 'ZHE', 850),
    (NEW.id, 'BMS', 'Bungalow Mid S', 'villa', 130, 'ZME', 750),
    (NEW.id, 'BML', 'Bungalow Mid L', 'villa', 180, 'ZME', 950),
    (NEW.id, 'BH', 'Bungalow High', 'villa', 220, 'ZHE', 1200),
    (NEW.id, 'CH', 'Courtyard High', 'villa', 250, 'ZHE', 1400),
    (NEW.id, 'CO', 'Courtyard Org', 'villa', 160, 'ZME', 900),
    (NEW.id, 'XM', 'Commercial Mid', 'commercial', 50, 'ZME', 300),
    (NEW.id, 'XH', 'Commercial High', 'commercial', 80, 'ZHE', 450),
    (NEW.id, 'villa_200', 'Villa 200m²', 'villa', 150, 'ZME', 800),
    (NEW.id, 'villa_300', 'Villa 300m²', 'villa', 200, 'ZME', 1000),
    (NEW.id, 'villa_500', 'Villa 500m²', 'villa', 300, 'ZHE', 1200),
    (NEW.id, 'villa_1000', 'Villa 1000m²', 'villa', 500, 'ZOS', 2000);
  
  -- Insert default equipment/utility types
  INSERT INTO project_equipment_utility_types (project_id, code, name, category, land_area_m2, building_occupation_pct, cost_type) VALUES
    (NEW.id, 'EQS', 'Equipment Small', 'equipment', 1800, 0.3, 'ZMER'),
    (NEW.id, 'EQL', 'Equipment Large', 'equipment', 2400, 0.3, 'ZMER'),
    (NEW.id, 'UTL', 'Utility', 'utility', 1800, 0.3, 'ZMER');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_project_cost_params
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_generate_project_cost_params();

-- Function to copy project parameters to scenario when scenario is created
CREATE OR REPLACE FUNCTION copy_project_params_to_scenario()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get the project_id from the site
  SELECT sites.project_id INTO v_project_id
  FROM sites
  WHERE sites.id = NEW.site_id;
  
  -- Copy project_cost_params to scenario_cost_params
  INSERT INTO scenario_cost_params (scenario_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
  SELECT NEW.id, unit_type, build_area_m2, cost_per_m2, rent_monthly
  FROM project_cost_params
  WHERE project_id = v_project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_copy_project_params_to_scenario ON scenarios;
CREATE TRIGGER trigger_copy_project_params_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW EXECUTE FUNCTION copy_project_params_to_scenario();
