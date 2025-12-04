-- Fix for missing tables - Run this in Supabase SQL Editor

-- First, ensure the tables exist (idempotent)
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
ALTER TABLE project_cost_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_cost_params ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can read project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can create project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can update project_cost_params" ON project_cost_params;
DROP POLICY IF EXISTS "Users can delete project_cost_params" ON project_cost_params;

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

DROP POLICY IF EXISTS "Users can read scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can create scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can update scenario_cost_params" ON scenario_cost_params;
DROP POLICY IF EXISTS "Users can delete scenario_cost_params" ON scenario_cost_params;

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

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_project_cost_params_updated_at ON project_cost_params;
CREATE TRIGGER update_project_cost_params_updated_at BEFORE UPDATE ON project_cost_params
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenario_cost_params_updated_at ON scenario_cost_params;
CREATE TRIGGER update_scenario_cost_params_updated_at BEFORE UPDATE ON scenario_cost_params
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-generate default project cost params when project is created
CREATE OR REPLACE FUNCTION auto_generate_project_cost_params()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO project_cost_params (project_id, unit_type, build_area_m2, cost_per_m2, rent_monthly) VALUES
    (NEW.id, 'XM', 50, 800, 300),
    (NEW.id, 'XH', 80, 1000, 450),
    (NEW.id, 'AMS', 75, 900, 500),
    (NEW.id, 'AML', 100, 1000, 600),
    (NEW.id, 'AH', 120, 1200, 850),
    (NEW.id, 'BMS', 130, 1100, 750),
    (NEW.id, 'BML', 180, 1200, 950),
    (NEW.id, 'BH', 220, 1400, 1200),
    (NEW.id, 'CH', 250, 1500, 1400),
    (NEW.id, 'CO', 160, 1150, 900),
    (NEW.id, 'villa_200', 150, 1100, 800),
    (NEW.id, 'villa_300', 200, 1200, 1000),
    (NEW.id, 'villa_500', 300, 1300, 1200),
    (NEW.id, 'villa_1000', 500, 1500, 2000),
    (NEW.id, 'ZME', 0, 1000, 0),
    (NEW.id, 'ZHE', 0, 1200, 0),
    (NEW.id, 'ZOS', 0, 900, 0),
    (NEW.id, 'ZMER', 0, 1100, 0),
    (NEW.id, 'ZHER', 0, 1300, 0);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_auto_generate_project_cost_params ON projects;
CREATE TRIGGER trigger_auto_generate_project_cost_params
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_generate_project_cost_params();

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Verify tables exist
SELECT 
  'project_cost_params' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'project_cost_params'
UNION ALL
SELECT 
  'scenario_cost_params' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'scenario_cost_params';
