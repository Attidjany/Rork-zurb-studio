# Add Gold Price Column to Account Settings

## Issue
The `generate_auto_scenarios` function references `account_settings.gold_price_per_oz` column which doesn't exist, causing the error:
```
Column "gold_price_per_oz" does not exist
```

## Solution
Run the migration to add the `gold_price_per_oz` column to the `account_settings` table.

## Instructions

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/add-gold-price-to-account-settings.sql`
4. Click "Run"

This will:
- Add the `gold_price_per_oz` column with a default value of 3000
- Update all existing account_settings records to have this default value
- Allow the auto-scenarios function to fetch gold prices from user settings

## After Running
The "Smart Scenarios" button should work without the gold_price_per_oz error.
