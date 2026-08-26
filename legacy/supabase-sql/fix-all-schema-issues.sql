-- Comprehensive fix for all schema issues
-- Run this migration to fix:
-- 1. Remove old project_cost_params table
-- 2. Add rental_period_years to scenarios
-- 3. Ensure all required tables exist with correct structure

-- Step 1: Drop old project_cost_params and scenario_cost_params tables if they exist
DROP TABLE IF EXISTS scenario_cost_params CASCADE;
DROP TABLE IF EXISTS project_cost_params CASCADE;

-- Step 2: Ensure scenarios table has rental_period_years column
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS rental_period_years INT NOT NULL DEFAULT 20;

-- Step 3: Make sure all new parameter tables exist (they should, but just in case)
-- These were created by add-project-custom-types.sql and create-scenario-parameter-tables.sql

-- Verify project_construction_costs exists
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

-- Verify project_housing_types exists
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

-- Verify project_equipment_utility_types exists
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

-- Verify scenario_construction_costs exists
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

-- Verify scenario_housing_types exists
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

-- Verify scenario_equipment_utility_types exists
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

-- Step 4: Update or replace the trigger function for auto_populate_project_types
-- This removes the old project_cost_params references
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
    (NEW.id, 'ZHER', 'Zenoàh High End Reduced (ZHE -15%)', 17.765)
  ON CONFLICT (project_id, code) DO NOTHING;

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
    (NEW.id, 'XH', 'Commercial HighEnd', 'commercial', 75, 'ZHER', 300000)
  ON CONFLICT (project_id, code) DO NOTHING;

  -- Insert default equipment/utility types
  INSERT INTO project_equipment_utility_types (project_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  VALUES
    (NEW.id, 'EQS', 'Equipment Small', 'equipment', 1800, 0.3, 'ZMER'),
    (NEW.id, 'EQL', 'Equipment Large', 'equipment', 2400, 0.3, 'ZMER'),
    (NEW.id, 'UTL', 'Utility', 'utility', 1800, 0.3, 'ZMER')
  ON CONFLICT (project_id, code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger that referenced project_cost_params
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;

-- Ensure the new trigger exists
DROP TRIGGER IF EXISTS trigger_auto_populate_project_types ON projects;
CREATE TRIGGER trigger_auto_populate_project_types
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_populate_project_types();

-- Step 5: Verify copy_project_params_to_scenario function is correct
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
  WHERE pcc.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;

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
  WHERE pht.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;

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
  WHERE peut.project_id = v_project_id
  ON CONFLICT (scenario_id, code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS copy_project_params_to_scenario_trigger ON scenarios;
CREATE TRIGGER copy_project_params_to_scenario_trigger
AFTER INSERT ON scenarios
FOR EACH ROW
EXECUTE FUNCTION copy_project_params_to_scenario();

-- Step 6: Update building_type constraint in units table to include villa types
DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_type_check;
  
  -- Add new constraint with villa types
  ALTER TABLE units ADD CONSTRAINT units_building_type_check 
    CHECK (building_type IN ('AB1', 'AB2', 'ABH', 'BMS', 'BML', 'BH', 'CH', 'CO', 'EQS', 'EQL', 'UTL'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
