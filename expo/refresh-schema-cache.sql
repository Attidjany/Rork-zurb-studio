-- Refresh PostgREST schema cache
-- Run this in your Supabase SQL editor to force PostgREST to reload the schema

-- Method 1: Send reload signal to PostgREST (recommended)
NOTIFY pgrst, 'reload schema';

-- Method 2: If the above doesn't work, you can also try:
-- SELECT pg_notify('pgrst', 'reload schema');

-- Verify that the tables exist
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('project_cost_params', 'scenario_cost_params')
ORDER BY tablename;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('project_cost_params', 'scenario_cost_params')
ORDER BY tablename;

-- List all policies on these tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('project_cost_params', 'scenario_cost_params')
ORDER BY tablename, policyname;
