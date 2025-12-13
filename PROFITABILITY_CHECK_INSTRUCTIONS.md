# Add Profitability Check to Auto-Scenarios

## Overview
This migration updates the `generate_auto_scenarios` function to only create scenarios where expected revenue exceeds costs.

## What Changed
- The function now calculates total expected revenue and total construction costs for each scenario
- Only scenarios with positive profitability (revenue > costs) are created
- Up to 3 scenarios can be generated (Most Profit, Lowest Rents, Balanced)
- If no profitable scenarios exist, an informative error message is returned

## How to Apply

Run the following SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of backend/add-profitability-check-auto-scenarios.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

## How It Works

For each scenario, the function:
1. Queries all units in the site
2. Calculates expected revenue based on:
   - Unit type and default rent from account settings
   - Rental period (20, 10, or 15 years)
   - Rent adjustment factor (1.20, 0.80, or 1.00)
3. Calculates construction costs based on:
   - Unit area and construction cost per m²
   - Cost adjustment factor (1.10, 0.90, or 1.00)
4. Only creates the scenario if revenue > costs

## Testing

After applying the migration:
1. Go to a site with configured blocks
2. Click "Generate/Update Smart Scenarios"
3. Only profitable scenarios will be created
4. Check the response message to see how many scenarios were generated
