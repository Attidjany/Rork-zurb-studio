# Fix Auto-Scenarios Function Return Type Error

## Problem
Getting error: `ERROR: 42P13: cannot change return type of existing function`

This happens because PostgreSQL doesn't allow changing a function's return type without dropping it first.

## Solution
Run this SQL file in Supabase SQL Editor:
```
backend/fix-auto-scenarios-drop-and-recreate.sql
```

## What This Does
1. Drops all existing auto-scenario triggers and functions
2. Recreates the `generate_auto_scenarios` function with the correct return type: `TABLE(success BOOLEAN, message TEXT)`
3. Adds performance indexes

## After Running This
- The duplicate key error should be fixed
- The function will return proper success/error messages
- Auto-scenarios can be generated via the button without errors
