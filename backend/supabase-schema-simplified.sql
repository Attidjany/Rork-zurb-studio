-- Simplified ZURB Schema
-- Drop existing tables
DROP TABLE IF EXISTS scenario_cost_params CASCADE;
DROP TABLE IF EXISTS project_cost_params CASCADE;
DROP TABLE IF EXISTS scenario_rents CASCADE;
DROP TABLE IF EXISTS scenario_mix_rules CASCADE;
DROP TABLE IF EXISTS exports CASCADE;
DROP TABLE IF EXISTS scenario_items CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS overheads CASCADE;
DROP TABLE IF EXISTS rents CASCADE;
DROP TABLE IF EXISTS mix_rules CASCADE;
DROP TABLE IF EXISTS cost_params CASCADE;
DROP TABLE IF EXISTS commercial_types CASCADE;
DROP TABLE IF EXISTS typologies CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS half_blocks CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS project_mix_rules CASCADE;
DROP TABLE IF EXISTS project_rents CASCADE;
DROP TABLE IF EXISTS units CASCADE;

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

-- Project-level cost parameters (defaults that can be overridden per scenario)
CREATE TABLE IF NOT EXISTS project_cost_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL,
  build_area_m2 NUMERIC NOT NULL,
  cost_per_m2 NUMERIC NOT NULL,
  rent_monthly NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, unit_type)
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_ha NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blocks table (6ha blocks, auto-generated)
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  block_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Half blocks (North and South per block)
CREATE TABLE IF NOT EXISTS half_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (position IN ('north', 'south')),
  type TEXT CHECK (type IN ('villas', 'apartments')),
  villa_layout TEXT CHECK (villa_layout IN ('200_300_mix', '500', '1000')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_id, position)
);

-- Plots (for villas) or Buildings (for apartments)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  half_block_id UUID NOT NULL REFERENCES half_blocks(id) ON DELETE CASCADE,
  unit_number INT NOT NULL,
  unit_type TEXT NOT NULL,
  size_m2 NUMERIC,
  building_type TEXT CHECK (building_type IN ('AM1', 'AM2', 'AH', 'equipment', 'utility')),
  equipment_name TEXT,
  utility_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Scenario-level cost overrides (optional - inherits from project if not set)
CREATE TABLE IF NOT EXISTS scenario_cost_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL,
  build_area_m2 NUMERIC NOT NULL,
  cost_per_m2 NUMERIC NOT NULL,
  rent_monthly NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id, unit_type)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE half_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_cost_params ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can read project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can create project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can update project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can delete project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can read sites from own projects" ON sites;
DROP POLICY IF EXISTS "Users can create sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can update sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can delete sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can read blocks from own sites" ON blocks;
DROP POLICY IF EXISTS "Users can create blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can update blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can read half_blocks" ON half_blocks;
DROP POLICY IF EXISTS "Users can create half_blocks" ON half_blocks;
DROP POLICY IF EXISTS "Users can update half_blocks" ON half_blocks;
DROP POLICY IF EXISTS "Users can delete half_blocks" ON half_blocks;
DROP POLICY IF EXISTS "Users can read units" ON units;
DROP POLICY IF EXISTS "Users can create units" ON units;
DROP POLICY IF EXISTS "Users can update units" ON units;
DROP POLICY IF EXISTS "Users can delete units" ON units;
DROP POLICY IF EXISTS "Users can read scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can create scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can delete scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can read scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can create scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can update scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can delete scenario_cost_params" ON scenario_cost_params;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can read own projects" ON projects FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (owner_id = auth.uid());

-- Project cost params policies
CREATE POLICY "Users can read project_cost_params" ON project_cost_params FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can create project_cost_params" ON project_cost_params FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can update project_cost_params" ON project_cost_params FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);
CREATE POLICY "Users can delete project_cost_params" ON project_cost_params FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_cost_params.project_id AND projects.owner_id = auth.uid())
);

-- Sites policies
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

-- Half blocks policies
CREATE POLICY "Users can read half_blocks" ON half_blocks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = half_blocks.block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create half_blocks" ON half_blocks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = half_blocks.block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update half_blocks" ON half_blocks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = half_blocks.block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete half_blocks" ON half_blocks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM blocks
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE blocks.id = half_blocks.block_id AND projects.owner_id = auth.uid()
  )
);

-- Units policies
CREATE POLICY "Users can read units" ON units FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM half_blocks
    JOIN blocks ON blocks.id = half_blocks.block_id
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE half_blocks.id = units.half_block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create units" ON units FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM half_blocks
    JOIN blocks ON blocks.id = half_blocks.block_id
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE half_blocks.id = units.half_block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update units" ON units FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM half_blocks
    JOIN blocks ON blocks.id = half_blocks.block_id
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE half_blocks.id = units.half_block_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete units" ON units FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM half_blocks
    JOIN blocks ON blocks.id = half_blocks.block_id
    JOIN sites ON sites.id = blocks.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE half_blocks.id = units.half_block_id AND projects.owner_id = auth.uid()
  )
);

-- Scenarios policies
CREATE POLICY "Users can read scenarios" ON scenarios FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create scenarios" ON scenarios FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  ) AND created_by = auth.uid()
);
CREATE POLICY "Users can update scenarios" ON scenarios FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenarios" ON scenarios FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN projects ON projects.id = sites.project_id 
    WHERE sites.id = scenarios.site_id AND projects.owner_id = auth.uid()
  )
);

-- Scenario cost params policies
CREATE POLICY "Users can read scenario_cost_params" ON scenario_cost_params FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can create scenario_cost_params" ON scenario_cost_params FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can update scenario_cost_params" ON scenario_cost_params FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scenario_cost_params" ON scenario_cost_params FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN sites ON sites.id = scenarios.site_id
    JOIN projects ON projects.id = sites.project_id 
    WHERE scenarios.id = scenario_cost_params.scenario_id AND projects.owner_id = auth.uid()
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
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

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenarios_updated_at ON scenarios;
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_cost_params_updated_at ON project_cost_params;
CREATE TRIGGER update_project_cost_params_updated_at BEFORE UPDATE ON project_cost_params
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenario_cost_params_updated_at ON scenario_cost_params;
CREATE TRIGGER update_scenario_cost_params_updated_at BEFORE UPDATE ON scenario_cost_params
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate blocks when site is created/updated
CREATE OR REPLACE FUNCTION auto_generate_blocks()
RETURNS TRIGGER AS $$
DECLARE
  num_blocks INT;
  i INT;
BEGIN
  num_blocks := FLOOR(NEW.area_ha / 6);
  
  DELETE FROM blocks WHERE site_id = NEW.id;
  
  FOR i IN 1..num_blocks LOOP
    INSERT INTO blocks (site_id, block_number) VALUES (NEW.id, i);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_blocks ON sites;
CREATE TRIGGER trigger_auto_generate_blocks
  AFTER INSERT OR UPDATE OF area_ha ON sites
  FOR EACH ROW EXECUTE FUNCTION auto_generate_blocks();

-- Function to auto-generate half-blocks when block is created
CREATE OR REPLACE FUNCTION auto_generate_half_blocks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO half_blocks (block_id, position) VALUES (NEW.id, 'north');
  INSERT INTO half_blocks (block_id, position) VALUES (NEW.id, 'south');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_half_blocks ON blocks;
CREATE TRIGGER trigger_auto_generate_half_blocks
  AFTER INSERT ON blocks
  FOR EACH ROW EXECUTE FUNCTION auto_generate_half_blocks();

-- Function to auto-generate default project cost params when project is created
CREATE OR REPLACE FUNCTION auto_generate_project_cost_params()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly) VALUES
    (NEW.id, 'XM', 50, 800, 300),
    (NEW.id, 'AMS', 75, 900, 500),
    (NEW.id, 'AML', 100, 1000, 600),
    (NEW.id, 'AH', 120, 1200, 850),
    (NEW.id, 'villa_200', 150, 1100, 800),
    (NEW.id, 'villa_300', 200, 1200, 1000),
    (NEW.id, 'villa_500', 300, 1300, 1200),
    (NEW.id, 'villa_1000', 500, 1500, 2000);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
CREATE TRIGGER trigger_auto_generate_project_cost_params
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_generate_project_cost_params();
