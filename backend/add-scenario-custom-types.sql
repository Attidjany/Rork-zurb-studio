-- Add scenario-specific tables for custom types
-- These mirror the project-level tables but are scenario-specific overrides

-- Scenario construction costs (overrides project defaults)
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

-- Scenario housing types (overrides project defaults)
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

-- Scenario equipment/utility types (overrides project defaults)
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

-- Enable RLS
ALTER TABLE scenario_construction_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_housing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_equipment_utility_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scenario_construction_costs
DROP POLICY IF EXISTS "Users can read scenario_construction_costs" ON scenario_construction_costs;
CREATE POLICY "Users can read scenario_construction_costs" ON scenario_construction_costs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_construction_costs.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create scenario_construction_costs" ON scenario_construction_costs;
CREATE POLICY "Users can create scenario_construction_costs" ON scenario_construction_costs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_construction_costs.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update scenario_construction_costs" ON scenario_construction_costs;
CREATE POLICY "Users can update scenario_construction_costs" ON scenario_construction_costs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_construction_costs.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete scenario_construction_costs" ON scenario_construction_costs;
CREATE POLICY "Users can delete scenario_construction_costs" ON scenario_construction_costs FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_construction_costs.scenario_id AND projects.owner_id = auth.uid()
  )
);

-- RLS Policies for scenario_housing_types
DROP POLICY IF EXISTS "Users can read scenario_housing_types" ON scenario_housing_types;
CREATE POLICY "Users can read scenario_housing_types" ON scenario_housing_types FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_housing_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create scenario_housing_types" ON scenario_housing_types;
CREATE POLICY "Users can create scenario_housing_types" ON scenario_housing_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_housing_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update scenario_housing_types" ON scenario_housing_types;
CREATE POLICY "Users can update scenario_housing_types" ON scenario_housing_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_housing_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete scenario_housing_types" ON scenario_housing_types;
CREATE POLICY "Users can delete scenario_housing_types" ON scenario_housing_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_housing_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

-- RLS Policies for scenario_equipment_utility_types
DROP POLICY IF EXISTS "Users can read scenario_equipment_utility_types" ON scenario_equipment_utility_types;
CREATE POLICY "Users can read scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create scenario_equipment_utility_types" ON scenario_equipment_utility_types;
CREATE POLICY "Users can create scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update scenario_equipment_utility_types" ON scenario_equipment_utility_types;
CREATE POLICY "Users can update scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete scenario_equipment_utility_types" ON scenario_equipment_utility_types;
CREATE POLICY "Users can delete scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id
    WHERE scenarios.id = scenario_equipment_utility_types.scenario_id AND projects.owner_id = auth.uid()
  )
);

-- Trigger to update timestamps
DROP TRIGGER IF EXISTS update_scenario_construction_costs_updated_at ON scenario_construction_costs;
CREATE TRIGGER update_scenario_construction_costs_updated_at BEFORE UPDATE ON scenario_construction_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenario_housing_types_updated_at ON scenario_housing_types;
CREATE TRIGGER update_scenario_housing_types_updated_at BEFORE UPDATE ON scenario_housing_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenario_equipment_utility_types_updated_at ON scenario_equipment_utility_types;
CREATE TRIGGER update_scenario_equipment_utility_types_updated_at BEFORE UPDATE ON scenario_equipment_utility_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to copy project custom types to scenario when scenario is created
CREATE OR REPLACE FUNCTION copy_project_custom_types_to_scenario()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get the project_id for this scenario
  SELECT sites.project_id INTO v_project_id
  FROM sites
  WHERE sites.id = NEW.site_id;

  -- Copy construction costs from project to scenario
  INSERT INTO scenario_construction_costs (scenario_id, code, name, gold_grams_per_m2)
  SELECT NEW.id, code, name, gold_grams_per_m2
  FROM project_construction_costs
  WHERE project_id = v_project_id;

  -- Copy housing types from project to scenario
  INSERT INTO scenario_housing_types (scenario_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
  SELECT NEW.id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly
  FROM project_housing_types
  WHERE project_id = v_project_id;

  -- Copy equipment/utility types from project to scenario
  INSERT INTO scenario_equipment_utility_types (scenario_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  SELECT NEW.id, code, name, category, land_area_m2, building_occupation_pct, cost_type
  FROM project_equipment_utility_types
  WHERE project_id = v_project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if it exists
DROP TRIGGER IF EXISTS trigger_copy_project_custom_types_to_scenario ON scenarios;

-- Create trigger to copy project custom types when scenario is created
CREATE TRIGGER trigger_copy_project_custom_types_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW EXECUTE FUNCTION copy_project_custom_types_to_scenario();
