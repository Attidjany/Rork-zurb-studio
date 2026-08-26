-- Create scenario parameter tables that mirror project parameter tables
-- These tables will store scenario-specific overrides

-- Scenario Construction Costs
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

-- Scenario Housing Types
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

-- Scenario Equipment/Utility Types
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

-- Drop existing policies
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

-- Scenario construction costs policies
CREATE POLICY "Users can read scenario_construction_costs" ON scenario_construction_costs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_construction_costs.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create scenario_construction_costs" ON scenario_construction_costs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_construction_costs.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update scenario_construction_costs" ON scenario_construction_costs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_construction_costs.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scenario_construction_costs" ON scenario_construction_costs FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_construction_costs.scenario_id
    AND p.owner_id = auth.uid()
  )
);

-- Scenario housing types policies
CREATE POLICY "Users can read scenario_housing_types" ON scenario_housing_types FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_housing_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create scenario_housing_types" ON scenario_housing_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_housing_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update scenario_housing_types" ON scenario_housing_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_housing_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scenario_housing_types" ON scenario_housing_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_housing_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

-- Scenario equipment/utility types policies
CREATE POLICY "Users can read scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_equipment_utility_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_equipment_utility_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_equipment_utility_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scenario_equipment_utility_types" ON scenario_equipment_utility_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    JOIN sites st ON st.id = s.site_id
    JOIN projects p ON p.id = st.project_id
    WHERE s.id = scenario_equipment_utility_types.scenario_id
    AND p.owner_id = auth.uid()
  )
);

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS copy_project_params_to_scenario_trigger ON scenarios;
DROP FUNCTION IF EXISTS copy_project_params_to_scenario CASCADE;

-- Create function to copy project parameters to scenario when scenario is created
CREATE OR REPLACE FUNCTION copy_project_params_to_scenario()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get the project_id for this scenario
  SELECT st.project_id INTO v_project_id
  FROM sites st
  WHERE st.id = NEW.site_id;

  -- Copy construction costs
  INSERT INTO scenario_construction_costs (
    scenario_id,
    code,
    name,
    gold_grams_per_m2
  )
  SELECT
    NEW.id,
    pcc.code,
    pcc.name,
    pcc.gold_grams_per_m2
  FROM project_construction_costs pcc
  WHERE pcc.project_id = v_project_id;

  -- Copy housing types
  INSERT INTO scenario_housing_types (
    scenario_id,
    code,
    name,
    category,
    default_area_m2,
    default_cost_type,
    default_rent_monthly
  )
  SELECT
    NEW.id,
    pht.code,
    pht.name,
    pht.category,
    pht.default_area_m2,
    pht.default_cost_type,
    pht.default_rent_monthly
  FROM project_housing_types pht
  WHERE pht.project_id = v_project_id;

  -- Copy equipment/utility types
  INSERT INTO scenario_equipment_utility_types (
    scenario_id,
    code,
    name,
    category,
    land_area_m2,
    building_occupation_pct,
    cost_type
  )
  SELECT
    NEW.id,
    peut.code,
    peut.name,
    peut.category,
    peut.land_area_m2,
    peut.building_occupation_pct,
    peut.cost_type
  FROM project_equipment_utility_types peut
  WHERE peut.project_id = v_project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER copy_project_params_to_scenario_trigger
AFTER INSERT ON scenarios
FOR EACH ROW
EXECUTE FUNCTION copy_project_params_to_scenario();
