-- RLS Policies Only
-- Run this script in Supabase SQL Editor

-- Enable RLS on all tables
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

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can read sites from own projects" ON sites;
DROP POLICY IF EXISTS "Users can create sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can update sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can delete sites in own projects" ON sites;
DROP POLICY IF EXISTS "Users can read blocks from own sites" ON blocks;
DROP POLICY IF EXISTS "Users can create blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can update blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks in own sites" ON blocks;
DROP POLICY IF EXISTS "Users can read parcels from own blocks" ON parcels;
DROP POLICY IF EXISTS "Users can create parcels in own blocks" ON parcels;
DROP POLICY IF EXISTS "Users can update parcels in own blocks" ON parcels;
DROP POLICY IF EXISTS "Users can delete parcels in own blocks" ON parcels;
DROP POLICY IF EXISTS "Users can read scenarios from own sites" ON scenarios;
DROP POLICY IF EXISTS "Users can create scenarios in own sites" ON scenarios;
DROP POLICY IF EXISTS "Users can update scenarios in own sites" ON scenarios;
DROP POLICY IF EXISTS "Users can delete scenarios in own sites" ON scenarios;
DROP POLICY IF EXISTS "Users can read scenario items from own scenarios" ON scenario_items;
DROP POLICY IF EXISTS "Users can create scenario items in own scenarios" ON scenario_items;
DROP POLICY IF EXISTS "Users can update scenario items in own scenarios" ON scenario_items;
DROP POLICY IF EXISTS "Users can delete scenario items in own scenarios" ON scenario_items;
DROP POLICY IF EXISTS "Users can read project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can insert project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can update project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can delete project configs" ON project_cost_params;
DROP POLICY IF EXISTS "Users can read project mix rules" ON project_mix_rules;
DROP POLICY IF EXISTS "Users can insert project mix rules" ON project_mix_rules;
DROP POLICY IF EXISTS "Users can update project mix rules" ON project_mix_rules;
DROP POLICY IF EXISTS "Users can delete project mix rules" ON project_mix_rules;
DROP POLICY IF EXISTS "Users can read project rents" ON project_rents;
DROP POLICY IF EXISTS "Users can insert project rents" ON project_rents;
DROP POLICY IF EXISTS "Users can update project rents" ON project_rents;
DROP POLICY IF EXISTS "Users can delete project rents" ON project_rents;
DROP POLICY IF EXISTS "Users can read scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can insert scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can update scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can delete scenario configs" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can read scenario mix rules" ON scenario_mix_rules;
DROP POLICY IF EXISTS "Users can insert scenario mix rules" ON scenario_mix_rules;
DROP POLICY IF EXISTS "Users can update scenario mix rules" ON scenario_mix_rules;
DROP POLICY IF EXISTS "Users can delete scenario mix rules" ON scenario_mix_rules;
DROP POLICY IF EXISTS "Users can read scenario rents" ON scenario_rents;
DROP POLICY IF EXISTS "Users can insert scenario rents" ON scenario_rents;
DROP POLICY IF EXISTS "Users can update scenario rents" ON scenario_rents;
DROP POLICY IF EXISTS "Users can delete scenario rents" ON scenario_rents;

-- Create policies
-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Projects policies
CREATE POLICY "Users can read own projects" ON projects FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (owner_id = auth.uid());

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

-- Parcels policies
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
