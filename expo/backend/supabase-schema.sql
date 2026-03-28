-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'designer' CHECK (role IN ('admin', 'designer', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sites table with PostGIS geometry
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom GEOMETRY(MultiPolygon, 4326),
  area_ha NUMERIC,
  bbox GEOMETRY(Polygon, 4326),
  centroid GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  geom GEOMETRY(Polygon, 4326),
  area_m2 NUMERIC,
  perimeter_m NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parcels table
CREATE TABLE IF NOT EXISTS parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  geom GEOMETRY(Polygon, 4326),
  area_m2 NUMERIC,
  frontage_m NUMERIC,
  depth_m NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Typologies catalog
CREATE TABLE IF NOT EXISTS typologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_gfa_m2 NUMERIC NOT NULL,
  floors INT NOT NULL,
  params JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commercial types
CREATE TABLE IF NOT EXISTS commercial_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mix JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cost parameters (gold-indexed)
CREATE TABLE IF NOT EXISTS cost_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gold_usd_per_oz NUMERIC NOT NULL DEFAULT 3000,
  grams_mid_end NUMERIC NOT NULL DEFAULT 14.91,
  grams_high_end NUMERIC NOT NULL DEFAULT 20.9,
  grams_outstanding NUMERIC NOT NULL DEFAULT 26.9,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mix rules
CREATE TABLE IF NOT EXISTS mix_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT UNIQUE NOT NULL,
  mid_end_pct NUMERIC NOT NULL DEFAULT 0,
  high_end_pct NUMERIC NOT NULL DEFAULT 0,
  outstanding_pct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rents configuration
CREATE TABLE IF NOT EXISTS rents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  monthly_usd NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Overheads configuration
CREATE TABLE IF NOT EXISTS overheads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_monthly_usd NUMERIC NOT NULL DEFAULT 90,
  maint_monthly_usd NUMERIC NOT NULL DEFAULT 10,
  lease_years INT NOT NULL DEFAULT 20,
  infra_subsidy_pct NUMERIC NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scenario items
CREATE TABLE IF NOT EXISTS scenario_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
  typology_code TEXT NOT NULL,
  units INT NOT NULL,
  gfa_m2 NUMERIC NOT NULL,
  overrides JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exports table
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'csv', 'geojson', 'dxf')),
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project-specific cost params (override global)
CREATE TABLE IF NOT EXISTS project_cost_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gold_usd_per_oz NUMERIC NOT NULL DEFAULT 3000,
  grams_mid_end NUMERIC NOT NULL DEFAULT 14.91,
  grams_high_end NUMERIC NOT NULL DEFAULT 20.9,
  grams_outstanding NUMERIC NOT NULL DEFAULT 26.9,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Project-specific mix rules (override global)
CREATE TABLE IF NOT EXISTS project_mix_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  mid_end_pct NUMERIC NOT NULL DEFAULT 0,
  high_end_pct NUMERIC NOT NULL DEFAULT 0,
  outstanding_pct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, category)
);

-- Project-specific rents (override global)
CREATE TABLE IF NOT EXISTS project_rents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  monthly_usd NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, code)
);

-- Scenario-specific cost params (override project & global)
CREATE TABLE IF NOT EXISTS scenario_cost_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  gold_usd_per_oz NUMERIC NOT NULL DEFAULT 3000,
  grams_mid_end NUMERIC NOT NULL DEFAULT 14.91,
  grams_high_end NUMERIC NOT NULL DEFAULT 20.9,
  grams_outstanding NUMERIC NOT NULL DEFAULT 26.9,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id)
);

-- Scenario-specific mix rules (override project & global)
CREATE TABLE IF NOT EXISTS scenario_mix_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  mid_end_pct NUMERIC NOT NULL DEFAULT 0,
  high_end_pct NUMERIC NOT NULL DEFAULT 0,
  outstanding_pct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id, category)
);

-- Scenario-specific rents (override project & global)
CREATE TABLE IF NOT EXISTS scenario_rents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  monthly_usd NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id, code)
);

-- Create indexes for geometry columns
CREATE INDEX IF NOT EXISTS idx_sites_geom ON sites USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_sites_centroid ON sites USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_blocks_geom ON blocks USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_parcels_geom ON parcels USING GIST(geom);

-- Seed data for typologies
INSERT INTO typologies (code, name, category, default_gfa_m2, floors, params) VALUES
  ('A', 'Multifamily', 'residential', 3000, 5, '{"buildings_per_6ha": 20}'::jsonb),
  ('B', 'Small Villas', 'residential', 300, 2, '{"plots_per_6ha": 80, "min_plot_m2": 300, "footprint_pct": 50}'::jsonb),
  ('C', 'High-End Villas', 'residential', 450, 2, '{"plots_per_6ha": 24, "min_plot_m2": 1000}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Seed data for commercial types
INSERT INTO commercial_types (code, name, mix) VALUES
  ('XM', 'Commercial MidEnd', '{"level": "mid_end"}'::jsonb),
  ('XH', 'Commercial HighEnd', '{"level": "high_end"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Seed global cost params
INSERT INTO cost_params (gold_usd_per_oz, grams_mid_end, grams_high_end, grams_outstanding)
SELECT 3000, 14.91, 20.9, 26.9
WHERE NOT EXISTS (SELECT 1 FROM cost_params);

-- Seed global mix rules
INSERT INTO mix_rules (category, mid_end_pct, high_end_pct, outstanding_pct) VALUES
  ('A', 80, 20, 0),
  ('B', 60, 40, 0),
  ('C', 0, 25, 75)
ON CONFLICT (category) DO NOTHING;

-- Seed global rents
INSERT INTO rents (code, monthly_usd) VALUES
  ('AMS', 500),
  ('AML', 600),
  ('AH', 850),
  ('BM', 1000),
  ('BH', 1300),
  ('CH', 3500),
  ('CO', 6000)
ON CONFLICT (code) DO NOTHING;

-- Seed global overheads
INSERT INTO overheads (dev_monthly_usd, maint_monthly_usd, lease_years, infra_subsidy_pct)
SELECT 90, 10, 20, 100
WHERE NOT EXISTS (SELECT 1 FROM overheads);

-- Helper functions
CREATE OR REPLACE FUNCTION construction_cost_per_m2(
  p_category TEXT,
  p_gold_usd_per_oz NUMERIC,
  p_grams_mid_end NUMERIC,
  p_grams_high_end NUMERIC,
  p_grams_outstanding NUMERIC,
  p_mid_end_pct NUMERIC,
  p_high_end_pct NUMERIC,
  p_outstanding_pct NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  usd_per_gram NUMERIC;
  mid_end_cost NUMERIC;
  high_end_cost NUMERIC;
  outstanding_cost NUMERIC;
BEGIN
  usd_per_gram := p_gold_usd_per_oz / 31.1034768;
  mid_end_cost := p_grams_mid_end * usd_per_gram;
  high_end_cost := p_grams_high_end * usd_per_gram;
  outstanding_cost := p_grams_outstanding * usd_per_gram;
  
  RETURN (
    (mid_end_cost * p_mid_end_pct / 100) +
    (high_end_cost * p_high_end_pct / 100) +
    (outstanding_cost * p_outstanding_pct / 100)
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION max_capex(
  p_monthly_rent NUMERIC,
  p_lease_years INT,
  p_dev_monthly NUMERIC,
  p_maint_monthly NUMERIC,
  p_non_construction_capex NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (p_monthly_rent * 12 * p_lease_years) -
    ((p_dev_monthly + p_maint_monthly) * 12 * p_lease_years) -
    p_non_construction_capex
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_mix_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_rents ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_cost_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_mix_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_rents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Projects policies
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can read own projects" ON projects FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (owner_id = auth.uid());

-- Sites policies
DROP POLICY IF EXISTS "Users can read sites from own projects" ON sites;
DROP POLICY IF EXISTS "Users can create sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can update sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can delete sites in own projects" ON sites;

CREATE POLICY "Users can read sites from own projects" ON sites FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = sites.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can create sites in own projects" ON sites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = sites.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update sites in own projects" ON sites FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = sites.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete sites in own projects" ON sites FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = sites.project_id AND projects.owner_id = auth.uid())
);

-- Blocks policies
DROP POLICY IF EXISTS "Users can read blocks from own sites" ON blocks;
DROP POLICY IF EXISTS "Users can create blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can update blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks in own sites" ON blocks;

CREATE POLICY "Users can read blocks from own sites" ON blocks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = blocks.site_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create blocks in own sites" ON blocks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = blocks.site_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update blocks in own sites" ON blocks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = blocks.site_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete blocks in own sites" ON blocks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = blocks.site_id AND projects.owner_id = auth.uid()
  )
);

-- Parcels policies (similar pattern)
DROP POLICY IF EXISTS "Users can read parcels from own blocks" ON parcels;
DROP POLICY IF EXISTS "Users can create parcels in own blocks" ON parcels;
DROP POLICY IF EXISTS "Users can update parcels in own blocks" ON parcels;
DROP POLICY IF EXISTS "Users can delete parcels in own blocks" ON parcels;

CREATE POLICY "Users can read parcels from own blocks" ON parcels FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = parcels.block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create parcels in own blocks" ON parcels FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = parcels.block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update parcels in own blocks" ON parcels FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = parcels.block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete parcels in own blocks" ON parcels FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = parcels.block_id AND projects.owner_id = auth.uid()
  )
);

-- Scenarios policies
DROP POLICY IF EXISTS "Users can read scenarios from own sites" ON scenarios;
DROP POLICY IF EXISTS "Users can create scenarios in own sites" ON scenarios;
DROP POLICY IF EXISTS "Users can update scenarios in own sites" ON scenarios;
DROP POLICY IF EXISTS "Users can delete scenarios in own sites" ON scenarios;

CREATE POLICY "Users can read scenarios from own sites" ON scenarios FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create scenarios in own sites" ON scenarios FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  ) AND created_by = auth.uid()
);
CREATE POLICY "Users can update scenarios in own sites" ON scenarios FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenarios in own sites" ON scenarios FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  )
);

-- Scenario items policies
DROP POLICY IF EXISTS "Users can read scenario items from own scenarios" ON scenario_items;
DROP POLICY IF EXISTS "Users can create scenario items in own scenarios" ON scenario_items;
DROP POLICY IF EXISTS "Users can update scenario items in own scenarios" ON scenario_items;
DROP POLICY IF EXISTS "Users can delete scenario items in own scenarios" ON scenario_items;

CREATE POLICY "Users can read scenario items from own scenarios" ON scenario_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_items.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create scenario items in own scenarios" ON scenario_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_items.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario items in own scenarios" ON scenario_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_items.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario items in own scenarios" ON scenario_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_items.scenario_id AND projects.owner_id = auth.uid()
  )
);

-- Project-specific config policies
DROP POLICY IF EXISTS "Users can read project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can insert project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can update project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can delete project configs" ON project_cost_params;

CREATE POLICY "Users can read project configs" ON project_cost_params FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can insert project configs" ON project_cost_params FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update project configs" ON project_cost_params FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete project configs" ON project_cost_params FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can read project mix rules" ON project_mix_rules;
DROP POLICY IF EXISTS "Users can insert project mix rules" ON project_mix_rules;
DROP POLICY IF EXISTS "Users can update project mix rules" ON project_mix_rules;
DROP POLICY IF EXISTS "Users can delete project mix rules" ON project_mix_rules;

CREATE POLICY "Users can read project mix rules" ON project_mix_rules FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_mix_rules.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can insert project mix rules" ON project_mix_rules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_mix_rules.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update project mix rules" ON project_mix_rules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_mix_rules.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete project mix rules" ON project_mix_rules FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_mix_rules.project_id AND projects.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can read project rents" ON project_rents;
DROP POLICY IF EXISTS "Users can insert project rents" ON project_rents;
DROP POLICY IF EXISTS "Users can update project rents" ON project_rents;
DROP POLICY IF EXISTS "Users can delete project rents" ON project_rents;

CREATE POLICY "Users can read project rents" ON project_rents FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_rents.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can insert project rents" ON project_rents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_rents.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update project rents" ON project_rents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_rents.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete project rents" ON project_rents FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_rents.project_id AND projects.owner_id = auth.uid())
);

-- Scenario-specific config policies
DROP POLICY IF EXISTS "Users can read scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can insert scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can update scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can delete scenario configs" ON scenario_cost_params;

CREATE POLICY "Users can read scenario configs" ON scenario_cost_params FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can insert scenario configs" ON scenario_cost_params FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario configs" ON scenario_cost_params FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario configs" ON scenario_cost_params FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can read scenario mix rules" ON scenario_mix_rules;
DROP POLICY IF EXISTS "Users can insert scenario mix rules" ON scenario_mix_rules;
DROP POLICY IF EXISTS "Users can update scenario mix rules" ON scenario_mix_rules;
DROP POLICY IF EXISTS "Users can delete scenario mix rules" ON scenario_mix_rules;

CREATE POLICY "Users can read scenario mix rules" ON scenario_mix_rules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_mix_rules.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can insert scenario mix rules" ON scenario_mix_rules FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_mix_rules.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario mix rules" ON scenario_mix_rules FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_mix_rules.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario mix rules" ON scenario_mix_rules FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_mix_rules.scenario_id AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can read scenario rents" ON scenario_rents;
DROP POLICY IF EXISTS "Users can insert scenario rents" ON scenario_rents;
DROP POLICY IF EXISTS "Users can update scenario rents" ON scenario_rents;
DROP POLICY IF EXISTS "Users can delete scenario rents" ON scenario_rents;

CREATE POLICY "Users can read scenario rents" ON scenario_rents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_rents.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can insert scenario rents" ON scenario_rents FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_rents.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario rents" ON scenario_rents FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_rents.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario rents" ON scenario_rents FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_rents.scenario_id AND projects.owner_id = auth.uid()
  )
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'designer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
