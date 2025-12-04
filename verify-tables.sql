-- Run this to verify tables exist and notify PostgREST to reload schema

-- Check if tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('project_cost_params', 'scenario_cost_params');

-- Force PostgREST schema reload by sending NOTIFY
NOTIFY pgrst, 'reload schema';

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('project_cost_params', 'scenario_cost_params');

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('project_cost_params', 'scenario_cost_params');
