-- ============================================
-- COMPLETE ACCOUNT SETTINGS SETUP - COPY THIS ENTIRE FILE
-- Run this in Supabase SQL Editor
-- ============================================

-- This migration:
-- 1. Creates account settings tables
-- 2. Sets up RLS policies
-- 3. Updates project creation trigger to use account settings
-- 4. Initializes settings for existing users

BEGIN;

-- ============================================
-- STEP 1: Create Account Settings Tables
-- ============================================

CREATE TABLE IF NOT EXISTS account_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS account_construction_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_settings_id UUID NOT NULL REFERENCES account_settings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  gold_grams_per_m2 NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_settings_id, code)
);

CREATE TABLE IF NOT EXISTS account_housing_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_settings_id UUID NOT NULL REFERENCES account_settings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('apartment', 'villa', 'commercial')),
  default_area_m2 NUMERIC NOT NULL,
  default_cost_type TEXT NOT NULL,
  default_rent_monthly NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_settings_id, code)
);

CREATE TABLE IF NOT EXISTS account_equipment_utility_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_settings_id UUID NOT NULL REFERENCES account_settings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('equipment', 'utility')),
  land_area_m2 NUMERIC NOT NULL DEFAULT 1800,
  building_occupation_pct NUMERIC NOT NULL DEFAULT 0.3,
  cost_type TEXT NOT NULL DEFAULT 'ZMER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_settings_id, code)
);

-- ============================================
-- STEP 2: Enable RLS
-- ============================================

ALTER TABLE account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_construction_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_housing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_equipment_utility_types ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create RLS Policies
-- ============================================

-- Account Settings Policies
DROP POLICY IF EXISTS "Users can read own account settings" ON account_settings;
CREATE POLICY "Users can read own account settings" ON account_settings 
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own account settings" ON account_settings;
CREATE POLICY "Users can create own account settings" ON account_settings 
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own account settings" ON account_settings;
CREATE POLICY "Users can update own account settings" ON account_settings 
  FOR UPDATE USING (user_id = auth.uid());

-- Construction Costs Policies
DROP POLICY IF EXISTS "Users can read own construction costs" ON account_construction_costs;
CREATE POLICY "Users can read own construction costs" ON account_construction_costs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_construction_costs.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own construction costs" ON account_construction_costs;
CREATE POLICY "Users can create own construction costs" ON account_construction_costs 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_construction_costs.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own construction costs" ON account_construction_costs;
CREATE POLICY "Users can update own construction costs" ON account_construction_costs 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_construction_costs.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own construction costs" ON account_construction_costs;
CREATE POLICY "Users can delete own construction costs" ON account_construction_costs 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_construction_costs.account_settings_id AND account_settings.user_id = auth.uid())
  );

-- Housing Types Policies
DROP POLICY IF EXISTS "Users can read own housing types" ON account_housing_types;
CREATE POLICY "Users can read own housing types" ON account_housing_types 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_housing_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own housing types" ON account_housing_types;
CREATE POLICY "Users can create own housing types" ON account_housing_types 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_housing_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own housing types" ON account_housing_types;
CREATE POLICY "Users can update own housing types" ON account_housing_types 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_housing_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own housing types" ON account_housing_types;
CREATE POLICY "Users can delete own housing types" ON account_housing_types 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_housing_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

-- Equipment Types Policies
DROP POLICY IF EXISTS "Users can read own equipment types" ON account_equipment_utility_types;
CREATE POLICY "Users can read own equipment types" ON account_equipment_utility_types 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_equipment_utility_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own equipment types" ON account_equipment_utility_types;
CREATE POLICY "Users can create own equipment types" ON account_equipment_utility_types 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_equipment_utility_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own equipment types" ON account_equipment_utility_types;
CREATE POLICY "Users can update own equipment types" ON account_equipment_utility_types 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_equipment_utility_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own equipment types" ON account_equipment_utility_types;
CREATE POLICY "Users can delete own equipment types" ON account_equipment_utility_types 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM account_settings WHERE account_settings.id = account_equipment_utility_types.account_settings_id AND account_settings.user_id = auth.uid())
  );

-- ============================================
-- STEP 4: Create Update Timestamp Triggers
-- ============================================

DROP TRIGGER IF EXISTS update_account_settings_updated_at ON account_settings;
CREATE TRIGGER update_account_settings_updated_at BEFORE UPDATE ON account_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_construction_costs_updated_at ON account_construction_costs;
CREATE TRIGGER update_account_construction_costs_updated_at BEFORE UPDATE ON account_construction_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_housing_types_updated_at ON account_housing_types;
CREATE TRIGGER update_account_housing_types_updated_at BEFORE UPDATE ON account_housing_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_equipment_utility_types_updated_at ON account_equipment_utility_types;
CREATE TRIGGER update_account_equipment_utility_types_updated_at BEFORE UPDATE ON account_equipment_utility_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 5: Create Function to Initialize Account Settings
-- ============================================

CREATE OR REPLACE FUNCTION initialize_account_settings(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  -- Create account settings record
  INSERT INTO account_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_settings_id;
  
  -- If already exists, get the id
  IF v_settings_id IS NULL THEN
    SELECT id INTO v_settings_id FROM account_settings WHERE user_id = p_user_id;
    RETURN v_settings_id;
  END IF;

  -- Insert default construction costs
  INSERT INTO account_construction_costs (account_settings_id, code, name, gold_grams_per_m2)
  VALUES
    (v_settings_id, 'ZME', 'Zenoàh Mid End', 14.91),
    (v_settings_id, 'ZHE', 'Zenoàh High End', 20.9),
    (v_settings_id, 'ZOS', 'Zenoàh Out-Standing', 26.9),
    (v_settings_id, 'ZMER', 'Zenoàh Mid End Reduced (ZME -15%)', 12.6735),
    (v_settings_id, 'ZHER', 'Zenoàh High End Reduced (ZHE -15%)', 17.765);

  -- Insert default housing types
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

  -- Insert default equipment/utility types
  INSERT INTO account_equipment_utility_types (account_settings_id, code, name, category, land_area_m2, building_occupation_pct, cost_type)
  VALUES
    (v_settings_id, 'EQS', 'Equipment Small', 'equipment', 1800, 0.3, 'ZMER'),
    (v_settings_id, 'EQL', 'Equipment Large', 'equipment', 2400, 0.3, 'ZMER'),
    (v_settings_id, 'UTL', 'Utility', 'utility', 1800, 0.3, 'ZMER');

  RETURN v_settings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Create Trigger to Auto-Initialize on Profile Creation
-- ============================================

CREATE OR REPLACE FUNCTION trigger_initialize_account_settings()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_account_settings(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_initialize_account_settings ON profiles;
CREATE TRIGGER trigger_initialize_account_settings
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_initialize_account_settings();

-- ============================================
-- STEP 7: Update Project Creation to Use Account Settings
-- ============================================

CREATE OR REPLACE FUNCTION auto_populate_project_types()
RETURNS trigger AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  -- Get user's account settings
  SELECT id INTO v_settings_id
  FROM account_settings
  WHERE user_id = NEW.owner_id;

  -- If no account settings found, initialize them first
  IF v_settings_id IS NULL THEN
    v_settings_id := initialize_account_settings(NEW.owner_id);
  END IF;

  -- Copy construction costs from account settings to project
  INSERT INTO project_construction_costs (
    project_id,
    code,
    name,
    gold_grams_per_m2
  )
  SELECT
    NEW.id,
    acc.code,
    acc.name,
    acc.gold_grams_per_m2
  FROM account_construction_costs acc
  WHERE acc.account_settings_id = v_settings_id
  ON CONFLICT (project_id, code) DO NOTHING;

  -- Copy housing types from account settings to project
  INSERT INTO project_housing_types (
    project_id,
    code,
    name,
    category,
    default_area_m2,
    default_cost_type,
    default_rent_monthly
  )
  SELECT
    NEW.id,
    aht.code,
    aht.name,
    aht.category,
    aht.default_area_m2,
    aht.default_cost_type,
    aht.default_rent_monthly
  FROM account_housing_types aht
  WHERE aht.account_settings_id = v_settings_id
  ON CONFLICT (project_id, code) DO NOTHING;

  -- Copy equipment/utility types from account settings to project
  INSERT INTO project_equipment_utility_types (
    project_id,
    code,
    name,
    category,
    land_area_m2,
    building_occupation_pct,
    cost_type
  )
  SELECT
    NEW.id,
    aeut.code,
    aeut.name,
    aeut.category,
    aeut.land_area_m2,
    aeut.building_occupation_pct,
    aeut.cost_type
  FROM account_equipment_utility_types aeut
  WHERE aeut.account_settings_id = v_settings_id
  ON CONFLICT (project_id, code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS trigger_auto_populate_project_types ON projects;
CREATE TRIGGER trigger_auto_populate_project_types
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_populate_project_types();

-- ============================================
-- STEP 8: Initialize Settings for Existing Users
-- ============================================

DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM profiles WHERE id NOT IN (SELECT user_id FROM account_settings)
  LOOP
    PERFORM initialize_account_settings(profile_record.id);
  END LOOP;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the migration succeeded:
-- 
-- SELECT 
--   (SELECT COUNT(*) FROM account_settings) as account_settings_count,
--   (SELECT COUNT(*) FROM account_construction_costs) as construction_costs_count,
--   (SELECT COUNT(*) FROM account_housing_types) as housing_types_count,
--   (SELECT COUNT(*) FROM account_equipment_utility_types) as equipment_types_count;
