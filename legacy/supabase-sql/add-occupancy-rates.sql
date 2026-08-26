-- Add occupancy rates table to account settings
-- This allows each user to customize occupancy parameters per unit size

-- Create account_occupancy_rates table
CREATE TABLE IF NOT EXISTS account_occupancy_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_settings_id UUID NOT NULL REFERENCES account_settings(id) ON DELETE CASCADE,
  min_area_m2 NUMERIC NOT NULL,
  max_area_m2 NUMERIC,
  people_per_unit NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('villa', 'apartment')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE account_occupancy_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own occupancy rates" ON account_occupancy_rates;
CREATE POLICY "Users can read own occupancy rates" ON account_occupancy_rates 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_occupancy_rates.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own occupancy rates" ON account_occupancy_rates;
CREATE POLICY "Users can create own occupancy rates" ON account_occupancy_rates 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_occupancy_rates.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own occupancy rates" ON account_occupancy_rates;
CREATE POLICY "Users can update own occupancy rates" ON account_occupancy_rates 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_occupancy_rates.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own occupancy rates" ON account_occupancy_rates;
CREATE POLICY "Users can delete own occupancy rates" ON account_occupancy_rates 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_occupancy_rates.account_settings_id AND account_settings.user_id = auth.uid())
  );

-- Updated timestamp trigger
DROP TRIGGER IF EXISTS update_account_occupancy_rates_updated_at ON account_occupancy_rates;
CREATE TRIGGER update_account_occupancy_rates_updated_at BEFORE UPDATE ON account_occupancy_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update initialize_account_settings function to include default occupancy rates
CREATE OR REPLACE FUNCTION initialize_account_settings()
RETURNS trigger AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  INSERT INTO account_settings (user_id)
  VALUES (NEW.id)
  RETURNING id INTO v_settings_id;

  INSERT INTO account_construction_costs (account_settings_id, code, name, gold_grams_per_m2)
  VALUES
    (v_settings_id, 'ZME', 'Zenoàh Mid End', 14.91),
    (v_settings_id, 'ZHE', 'Zenoàh High End', 20.9),
    (v_settings_id, 'ZOS', 'Zenoàh Out-Standing', 26.9),
    (v_settings_id, 'ZMER', 'Zenoàh Mid End Reduced (ZME -15%)', 12.6735),
    (v_settings_id, 'ZHER', 'Zenoàh High End Reduced (ZHE -15%)', 17.765);

  INSERT INTO account_housing_types (account_settings_id, code, name, category, default_area_m2, default_cost_type, default_rent_monthly)
  VALUES
    (v_settings_id, 'AMS', 'Apartment MidEnd Small', 'apartment', 100, 'ZME', 250000),
    (v_settings_id, 'AML', 'Apartment MidEnd Large', 'apartment', 150, 'ZME', 300000),
    (v_settings_id, 'AH', 'Apartment High-end', 'apartment', 200, 'ZHE', 650000),
    (v_settings_id, 'BMS', 'Villa MidEnd Small', 'villa', 150, 'ZME', 400000),
    (v_settings_id, 'BML', 'Villa MidEnd Large', 'villa', 250, 'ZME', 550000),
    (v_settings_id, 'BH', 'Villa Highend', 'villa', 300, 'ZHE', 750000),
    (v_settings_id, 'CH', 'Mansion HighEnd', 'villa', 450, 'ZHE', 1300000),
    (v_settings_id, 'CO', 'Mansion OutStanding', 'villa', 450, 'ZOS', 2500000),
    (v_settings_id, 'XM', 'Commercial MidEnd', 'commercial', 75, 'ZMER', 200000),
    (v_settings_id, 'XH', 'Commercial HighEnd', 'commercial', 75, 'ZHER', 300000);

  INSERT INTO account_equipment_utility_types (account_settings_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  VALUES
    (v_settings_id, 'EQS', 'Equipment Small', 'equipment', 1800, 0.3, 'ZMER'),
    (v_settings_id, 'EQL', 'Equipment Large', 'equipment', 2400, 0.3, 'ZMER'),
    (v_settings_id, 'UTL', 'Utility', 'utility', 1800, 0.3, 'ZMER');

  INSERT INTO account_occupancy_rates (account_settings_id, min_area_m2, max_area_m2, people_per_unit, category)
  VALUES
    (v_settings_id, 0, 80, 3, 'apartment'),
    (v_settings_id, 81, 120, 4, 'apartment'),
    (v_settings_id, 121, NULL, 5, 'apartment'),
    (v_settings_id, 0, 400, 4, 'villa'),
    (v_settings_id, 401, 700, 5, 'villa'),
    (v_settings_id, 701, NULL, 6, 'villa');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize occupancy rates for existing accounts
DO $$
DECLARE
  settings_record RECORD;
BEGIN
  FOR settings_record IN SELECT id FROM account_settings WHERE id NOT IN (SELECT DISTINCT account_settings_id FROM account_occupancy_rates)
  LOOP
    INSERT INTO account_occupancy_rates (account_settings_id, min_area_m2, max_area_m2, people_per_unit, category)
    VALUES
      (settings_record.id, 0, 80, 3, 'apartment'),
      (settings_record.id, 81, 120, 4, 'apartment'),
      (settings_record.id, 121, NULL, 5, 'apartment'),
      (settings_record.id, 0, 400, 4, 'villa'),
      (settings_record.id, 401, 700, 5, 'villa'),
      (settings_record.id, 701, NULL, 6, 'villa');
  END LOOP;
END $$;
