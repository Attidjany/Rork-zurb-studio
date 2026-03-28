# Auto Scenarios Update Instructions

This update adds visual distinction for auto-generated scenarios and ensures they are regenerated when block configuration changes.

## Changes Made

### 1. Database Schema
- Added `is_auto_scenario` BOOLEAN column to `scenarios` table
- Updated auto scenario generation function to mark scenarios as auto
- Auto scenarios are now regenerated whenever block configuration changes

### 2. UI Updates
- Auto scenarios are displayed with a distinctive orange color scheme
- Background: Light orange (#FFF8F0)
- Border: Orange (#FFD3A0)
- Text color: Orange (#FF9500)
- Icon color: Orange (#FF9500)
- Bold font weight for auto scenario names

### 3. Trigger Updates
The system now automatically regenerates auto scenarios when:
- Half blocks are configured (type/layout changes)
- Units are created or updated (building types/villa types assigned)

## SQL Migration

Run the SQL file to update your database:

```bash
# In Supabase SQL Editor, run:
backend/add-auto-scenarios.sql
```

This will:
1. Add `max_rental_period_years` column to projects table (if not exists)
2. Add `is_auto_scenario` column to scenarios table (if not exists)
3. Create/update the `check_site_blocks_configured()` function
4. Create/update the `generate_auto_scenarios()` function
5. Create/update the trigger function `check_and_generate_auto_scenarios()`
6. Set up triggers on half_blocks and units tables

## How Auto Scenarios Work

### Generation Logic
When all half blocks in a site are fully configured:
1. **Auto: Most Profit**
   - Uses max rental period from project settings
   - +20% rent adjustment
   - +10% construction cost adjustment

2. **Auto: Lowest Rents**
   - 10-year rental period
   - -20% rent adjustment
   - -10% construction cost adjustment

3. **Auto: Balanced**
   - 15-year rental period
   - No adjustments (standard rates)

### Regeneration
Auto scenarios are automatically deleted and regenerated when:
- Block configuration changes (type: villas/apartments)
- Layout changes (villa/apartment layouts)
- Unit assignments change (building types, villa types)

This ensures auto scenarios always reflect the current block configuration.

## Visual Distinction

Auto scenarios are now easily identifiable:
- **Orange theme** vs regular scenarios' gray theme
- **Thicker border** for visibility
- **Bold text** for emphasis
- Special orange icon color

This makes it clear which scenarios are automatically generated vs manually created by users.
