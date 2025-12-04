-- Fix duplicate key error by consolidating the two project creation triggers
-- We have both auto_generate_project_cost_params() and auto_populate_project_types()
-- They both try to insert the same construction costs, causing duplicates

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
DROP FUNCTION IF EXISTS auto_generate_project_cost_params() CASCADE;

-- Update the auto_populate_project_types function to also handle cost params
-- This is the only trigger that should run on project creation
DROP TRIGGER IF EXISTS trigger_auto_populate_project_types ON projects;
DROP FUNCTION IF EXISTS auto_populate_project_types() CASCADE;

CREATE OR REPLACE FUNCTION auto_populate_project_types()
RETURNS TRIGGER AS $$
DECLARE
  gold_price_per_gram NUMERIC := 85.0;
  xof_to_usd NUMERIC := 656.0;
BEGIN
  -- Insert default construction costs (only once)
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
    (NEW.id, 'XH', 'Commercial HighEnd', 'commercial', 75, 'ZHER', 300000),
    (NEW.id, 'villa_200', 'Villa 200m²', 'villa', 60, 'ZME', 400000),
    (NEW.id, 'villa_300', 'Villa 300m²', 'villa', 90, 'ZME', 550000),
    (NEW.id, 'villa_500', 'Villa 500m²', 'villa', 150, 'ZHE', 750000),
    (NEW.id, 'villa_1000', 'Villa 1000m²', 'villa', 300, 'ZOS', 1500000);

  -- Insert default equipment/utility types
  INSERT INTO project_equipment_utility_types (project_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  VALUES
    (NEW.id, 'EQS', 'Equipment Small', 'equipment', 1800, 0.3, 'ZMER'),
    (NEW.id, 'EQL', 'Equipment Large', 'equipment', 2400, 0.3, 'ZMER'),
    (NEW.id, 'UTL', 'Utility', 'utility', 1800, 0.3, 'ZMER');

  -- Insert default cost params (including construction costs and housing types)
  INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly)
  VALUES
    -- Construction cost types (no area/rent)
    (NEW.id, 'ZME', 0, 14.91 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZHE', 0, 20.9 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZOS', 0, 26.9 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZMER', 0, 12.6735 * gold_price_per_gram * xof_to_usd, 0),
    (NEW.id, 'ZHER', 0, 17.765 * gold_price_per_gram * xof_to_usd, 0),
    -- Apartment types
    (NEW.id, 'AMS', 100, 14.91 * gold_price_per_gram * xof_to_usd, 250000),
    (NEW.id, 'AML', 150, 14.91 * gold_price_per_gram * xof_to_usd, 300000),
    (NEW.id, 'AH', 200, 20.9 * gold_price_per_gram * xof_to_usd, 650000),
    -- Villa types
    (NEW.id, 'BMS', 150, 14.91 * gold_price_per_gram * xof_to_usd, 400000),
    (NEW.id, 'BML', 250, 14.91 * gold_price_per_gram * xof_to_usd, 550000),
    (NEW.id, 'BH', 300, 20.9 * gold_price_per_gram * xof_to_usd, 750000),
    (NEW.id, 'CH', 450, 20.9 * gold_price_per_gram * xof_to_usd, 1300000),
    (NEW.id, 'CO', 450, 26.9 * gold_price_per_gram * xof_to_usd, 2500000),
    -- Commercial types
    (NEW.id, 'XM', 75, 12.6735 * gold_price_per_gram * xof_to_usd, 200000),
    (NEW.id, 'XH', 75, 17.765 * gold_price_per_gram * xof_to_usd, 300000),
    -- Villa plot types
    (NEW.id, 'villa_200', 60, 14.91 * gold_price_per_gram * xof_to_usd, 400000),
    (NEW.id, 'villa_300', 90, 14.91 * gold_price_per_gram * xof_to_usd, 550000),
    (NEW.id, 'villa_500', 150, 20.9 * gold_price_per_gram * xof_to_usd, 750000),
    (NEW.id, 'villa_1000', 300, 26.9 * gold_price_per_gram * xof_to_usd, 1500000);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_auto_populate_project_types
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_populate_project_types();

-- Ensure the copy_project_params_to_scenario function exists and works
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_copy_project_params_to_scenario ON scenarios;
CREATE TRIGGER trigger_copy_project_params_to_scenario
  AFTER INSERT ON scenarios
  FOR EACH ROW EXECUTE FUNCTION copy_project_params_to_scenario();
