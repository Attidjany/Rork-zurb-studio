-- Create scenario-specific custom types tables to store overrides
-- These tables allow scenarios to override project-level custom types

-- Scenario Construction Costs (scenario-specific overrides for construction costs)
CREATE TABLE IF NOT EXISTS scenario_construction_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  gold_grams_per_m2 NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id, code)
);

-- Scenario Housing Types (scenario-specific overrides for housing types)
CREATE TABLE IF NOT EXISTS scenario_housing_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('apartment', 'villa', 'commercial')),
  default_area_m2 NUMERIC NOT NULL,
  default_cost_type TEXT NOT NULL,
  default_rent_monthly NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id, code)
);

-- Scenario Equipment/Utility Types (scenario-specific overrides for equipment/utility types)
CREATE TABLE IF NOT EXISTS scenario_equipment_utility_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('equipment', 'utility')),
  land_area_m2 NUMERIC NOT NULL,
  building_occupation_pct NUMERIC NOT NULL,
  cost_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id, code)
);

-- Enable RLS on scenario custom types tables
ALTER TABLE scenario_construction_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_housing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_equipment_utility_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can read scenario_construction_costs" ON scenario_construction_costs;
DROP POLICY IF EXISTS "Users can create scenario_construction_costs" ON scenario_construction_costs;
DROP POLICY IF EXISTS "Users can update scenario_construction_costs" ON scenario_construction_costs;
DROP POLICY IF EXISTS "Users can delete scenario_construction_costs" ON scenario_construction_costs;

DROP POLICY IF EXISTS "Users can read scenario_housing_types" ON scenario_housing_types;
DROP POLICY IF EXISTS "Users can create scenario_housing_types" ON scenario_housing_types;
DROP POLICY IF EXISTS "Users can update scenario_housing_types" ON scenario_housing_types;
DROP POLICY IF EXISTS "Users can delete scenario_housing_types" ON scenario_housing_types;

DROP POLICY IF EXISTS "Users can read scenario_equipment_utility_types" ON scenario_equipment_utility_types;
DROP POLICY IF EXISTS "Users can create scenario_equipment_utility_types" ON scenario_equipment_utility_types;
DROP POLICY IF EXISTS "Users can update scenario_equipment_utility_types" ON scenario_equipment_utility_types;
DROP POLICY IF EXISTS "Users can delete scenario_equipment_utility_types" ON scenario_equipment_utility_types;

-- Scenario Construction Costs policies
CREATE POLICY "Users can read scenario_construction_costs" ON scenario_construction_costs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_construction_costs.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create scenario_construction_costs" ON scenario_construction_costs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_construction_costs.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario_construction_costs" ON scenario_construction_costs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_construction_costs.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario_construction_costs" ON scenario_construction_costs FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_construction_costs.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);

-- Scenario Housing Types policies
CREATE POLICY "Users can read scenario_housing_types" ON scenario_housing_types FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_housing_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create scenario_housing_types" ON scenario_housing_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_housing_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario_housing_types" ON scenario_housing_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_housing_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario_housing_types" ON scenario_housing_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_housing_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);

-- Scenario Equipment/Utility Types policies
CREATE POLICY "Users can read scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios 
    JOIN sites ON scenarios.site_id = sites.id 
    JOIN projects ON sites.project_id = projects.id 
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id 
    AND projects.owner_id = auth.uid()
  )
);

-- Update triggers for scenario custom types tables
DROP TRIGGER IF EXISTS update_scenario_construction_costs_updated_at ON scenario_construction_costs;
CREATE TRIGGER update_scenario_construction_costs_updated_at BEFORE UPDATE ON scenario_construction_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenario_housing_types_updated_at ON scenario_housing_types;
CREATE TRIGGER update_scenario_housing_types_updated_at BEFORE UPDATE ON scenario_housing_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenario_equipment_utility_types_updated_at ON scenario_equipment_utility_types;
CREATE TRIGGER update_scenario_equipment_utility_types_updated_at BEFORE UPDATE ON scenario_equipment_utility_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update the copy_project_params_to_scenario function to also copy custom types
DROP TRIGGER IF EXISTS trigger_copy_project_params_to_scenario ON scenarios;
DROP FUNCTION IF EXISTS copy_project_params_to_scenario() CASCADE;

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
  
  -- Copy project_construction_costs to scenario_construction_costs
  INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
  SELECT NEW.id, code, name, gold_grams_per_m2
  FROM project_construction_costs
  WHERE project_id = v_project_id;
  
  -- Copy project_housing_types to scenario_housing_types
  INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
  SELECT NEW.id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly
  FROM project_housing_types
  WHERE project_id = v_project_id;
  
  -- Copy project_equipment_utility_types to scenario_equipment_utility_types
  INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  SELECT NEW.id, code, name, category, land_area_m2, building_occupation_pct, cost_type
  FROM project_equipment_utility_types
  WHERE project_id = v_project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_copy_project_params_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW EXECUTE FUNCTION copy_project_params_to_scenario();
