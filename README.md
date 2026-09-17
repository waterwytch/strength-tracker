# Carolyn's Strength Tracker

## Setup

### 1. Supabase
1. Create project at supabase.com
2. Go to SQL Editor → run the contents of `src/lib/supabase-schema.sql`
3. Go to Settings → API → copy Project URL and anon key
4. In Vercel, add environment variables:
   - `REACT_APP_SUPABASE_URL` = your project URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your anon key

### 2. Vercel
1. Push this repo to GitHub
2. Import repo in Vercel
3. Add the two environment variables above
4. Deploy

### 3. Install as app on iPhone
1. Open the deployed URL in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Tap Add
