# Fix Villa Layout Constraint

## Issue
The `half_blocks` table constraint only allows `'200_300_mix'`, `'500'`, and `'1000'` for villa layouts.
We need to update to allow `'480'` and `'1200'` instead of `'500'` and `'1000'`.

## Solution
Run the SQL migration to update the constraint:

```sql
-- backend/fix-villa-layout-constraint.sql
```

## Steps
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `backend/fix-villa-layout-constraint.sql`
3. Execute the query
4. Test creating a half block with the new villa layout values (480 or 1200)

## Changes
- Removed: '500', '1000'
- Added: '480', '1200'
- Kept: '200_300_mix'
