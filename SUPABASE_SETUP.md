# ZURB Studio - Supabase Backend Setup Guide

## Your Supabase Credentials
- **URL**: `https://qreomjzhrajvcvsopxyo.supabase.co`
- **Anon Key**: Already configured in `.env.local`

## Setup Steps

### 1. Enable PostGIS Extension

PostGIS is required for storing and querying geographic data (site polygons, blocks, parcels).

1. Open your Supabase dashboard: https://qreomjzhrajvcvsopxyo.supabase.co
2. Navigate to **Database** → **Extensions** in the left sidebar
3. Search for `postgis`
4. Click the toggle to **Enable** it

### 2. Run the Database Schema

The complete schema is in `backend/supabase-schema.sql`. This creates all tables, functions, and security policies.

**Option A: Using SQL Editor (Recommended)**
1. Go to **SQL Editor** in your Supabase dashboard
2. Click **+ New query**
3. Open the file `backend/supabase-schema.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

**Option B: Using psql (Advanced)**
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.qreomjzhrajvcvsopxyo.supabase.co:5432/postgres" -f backend/supabase-schema.sql
```

### 3. Verify the Setup

After running the schema, verify everything is set up correctly:

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `profiles` - User profiles
   - `projects` - Urban design projects
   - `sites` - Site geometries with PostGIS
   - `blocks` - Generated blocks
   - `parcels` - Subdivided parcels
   - `scenarios` - Design scenarios
   - `scenario_items` - Items in each scenario
   - `typologies` - Building types (A, B, C)
   - `cost_params` - Global cost parameters
   - `mix_rules` - Global construction mix rules
   - `rents` - Global rent configurations
   - `project_cost_params` - Project-specific overrides
   - `project_mix_rules` - Project-specific mix rules
   - `project_rents` - Project-specific rents
   - `scenario_cost_params` - Scenario-specific overrides
   - `scenario_mix_rules` - Scenario-specific mix rules
   - `scenario_rents` - Scenario-specific rents

3. Check seed data:
   - Open the `typologies` table - should have A, B, C entries
   - Open the `rents` table - should have AMS, AML, AH, BM, BH, CH, CO
   - Open the `cost_params` table - should have one row with gold price $3000
   - Open the `mix_rules` table - should have A, B, C categories

### 4. Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. (Optional) Configure email templates under **Authentication** → **Email Templates**

### 5. Test the Connection

Your app is now ready to use Supabase!

**First time using the app:**
1. Sign up with an email/password
2. A profile will be automatically created for you
3. You can start creating projects, sites, and scenarios
4. All data is secured with Row Level Security (RLS)

## What the Schema Does

### Core Tables
- **Projects**: Top-level container for urban design work
- **Sites**: Geographic polygons representing development sites
- **Scenarios**: Different design options for a site
- **Scenario Items**: Buildings/typologies placed in a scenario

### Configuration Tables (3-level hierarchy)
1. **Global level**: Default settings for all projects
   - `cost_params`, `mix_rules`, `rents`, `overheads`
2. **Project level**: Override global settings per project
   - `project_cost_params`, `project_mix_rules`, `project_rents`
3. **Scenario level**: Override project/global settings per scenario
   - `scenario_cost_params`, `scenario_mix_rules`, `scenario_rents`

### Helper Functions
- `construction_cost_per_m2()`: Calculates cost per square meter based on gold price and mix
- `max_capex()`: Calculates maximum allowable construction cost from rent targets

### Security
- **Row Level Security (RLS)** is enabled on all tables
- Users can only access their own projects and related data
- Profiles are automatically created when users sign up
- All policies enforce owner-based access control

## Architecture

### Frontend (Mobile App)
- React Native with Expo
- Supabase client configured in `lib/supabase.ts`
- Context provider in `contexts/ZUDSContext.tsx`

### Backend (Supabase)
- PostgreSQL database with PostGIS
- Row Level Security for multi-tenancy
- Functions for calculations
- Real-time subscriptions ready (not yet implemented)

## Next Steps

After setup, you can:
1. ✅ Create projects
2. ✅ Add sites with polygon coordinates
3. ✅ Create scenarios
4. 🔄 Configure costs/rents at project or scenario level (UI to be added)
5. 🔄 Generate blocks and parcels (geometry tools to be added)
6. 🔄 Place buildings and calculate feasibility (to be added)

## Troubleshooting

### "relation does not exist" error
- Make sure PostGIS is enabled first
- Re-run the schema SQL

### "permission denied" error
- RLS policies might be interfering
- Check that you're logged in
- Verify the user has a profile in the `profiles` table

### Can't connect to Supabase
- Verify `.env.local` has the correct URL and anon key
- Restart the development server after adding env variables
- Check Supabase dashboard is accessible

## Support

For issues:
1. Check the Supabase dashboard logs (Logs Explorer)
2. Check the app console for error messages
3. Verify RLS policies in Table Editor → Policies tab
