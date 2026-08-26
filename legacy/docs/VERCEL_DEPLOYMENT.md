# ZURB Studio - Vercel Deployment Guide

## Architecture Overview

**Important**: Only the backend API is deployed to Vercel. The mobile app runs locally or on devices via Expo Go.

- **Backend API**: Runs on Vercel at `https://zurbstudio.vercel.app`
- **Mobile App**: Runs locally via `bun start`, connects to Vercel backend
- **Development**: You develop locally, the app talks to your deployed Vercel backend

# ZURB Studio - Vercel Deployment Guide

## Critical Environment Variables

You MUST set these environment variables in Vercel for the app to work:

### In Vercel Dashboard (Project Settings → Environment Variables):

1. **EXPO_PUBLIC_SUPABASE_URL**
   - Value: `https://qreomjzhrajvcvsopxyo.supabase.co`
   - Environment: Production, Preview, Development

2. **EXPO_PUBLIC_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZW9tanpocmFqdmN2c29weHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzE4ODgsImV4cCI6MjA4MDM0Nzg4OH0.fB_T1-SExvX5Hhg1oq_DEXIGMnqEAvEev1nYeS-qpfE`
   - Environment: Production, Preview, Development

3. **EXPO_PUBLIC_RORK_API_BASE_URL**
   - Value: `https://zurbstudio.vercel.app`
   - Environment: Production, Preview, Development

## Steps to Deploy

1. **Push your code to GitHub**

2. **Import to Vercel**
   - Go to vercel.com
   - Click "Import Project"
   - Connect your GitHub repository
   - Framework Preset: Other

3. **Set Environment Variables**
   - In Project Settings → Environment Variables
   - Add all 3 variables above
   - Make sure they're set for all environments

4. **Update EXPO_PUBLIC_RORK_API_BASE_URL**
   - After first deployment, copy your Vercel URL (e.g., `https://zurb-studio.vercel.app`)
   - Go back to Environment Variables
   - Update `EXPO_PUBLIC_RORK_API_BASE_URL` with your actual Vercel URL
   - Redeploy

5. **Update env.local**
   - Update `EXPO_PUBLIC_RORK_API_BASE_URL` in your local `env.local` file
   - Use the Vercel deployment URL

## Testing the Deployment

1. Visit `https://your-app-name.vercel.app/`
   - Should show: `{"status":"ok","message":"API is running"}`

2. Visit `https://your-app-name.vercel.app/api/trpc/example.hi`
   - Should return tRPC response

## Troubleshooting

### 404: NOT_FOUND
- Make sure `vercel.json` exists with proper rewrites
- Check that `api/index.ts` exists and exports the Hono app

### Failed to fetch / CORS errors
- Verify environment variables are set in Vercel
- Check that CORS headers are properly configured in `backend/hono.ts`

### Projects not being created
- Verify Supabase environment variables are correct
- Check that RLS policies allow authenticated users to insert
- Verify user is properly authenticated

### Database issues
- Make sure Supabase tables exist (run `backend/supabase-schema.sql`)
- Check RLS policies (run `supabase-rls-only.sql`)
- Verify user profile exists in `profiles` table

## Important Notes

- The backend runs serverlessly on Vercel
- Each API request is a separate function invocation
- Cold starts may cause initial slowness
- Database connections are created per-request
