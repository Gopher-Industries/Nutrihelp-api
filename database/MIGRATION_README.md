# Database Migrations - Logging Tables Setup

## Overview
This directory contains migration scripts to set up persistent logging tables for the NutriHelp backend audit trail system (Week 9 implementation).

## Tables to Create
- **token_activity_logs** - Tracks token generation, refresh, verification, and failure events
- **session_logs** - Tracks user session activities (logout, session cleanup)
- **system_logs** - Records backend startup and system events

## Files
- `001_create_logging_tables.sql` - SQL migration file with table definitions
- `runMigration.js` - Node.js script to execute migration (requires service role key)
- `runMigrationAdmin.js` - Alternative admin-level execution script

## Method 1: Manual Execution (Recommended First Time)

### Steps:
1. **Login to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your NutriHelp project

2. **Navigate to SQL Editor**
   - Click: SQL Editor (left sidebar)
   - Click: Create new query

3. **Copy and Execute Migration**
   - Open `001_create_logging_tables.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click: "Run" button

4. **Verify Creation**
   - Go to: Table Editor (left sidebar)
   - Confirm you see:
     - `token_activity_logs`
     - `session_logs`
     - `system_logs`

## Method 2: Using Node.js Script

### Prerequisites:
- Add to `.env` file:
  ```
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```
  
  To get your service role key:
  - Supabase Dashboard → Settings → API
  - Copy the "service_role" key (⚠️ Keep this secret!)

### Execute:
```bash
cd Nutrihelp-api/database
node runMigrationAdmin.js
```

## Method 3: Using Supabase CLI (If Installed)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link project
supabase link --project-ref your_project_ref

# Push migrations
supabase db push
```

## What the Migration Does

### token_activity_logs Table
```sql
- id: Unique identifier
- user_id: Reference to users table
- event_type: token_generated, token_verified, token_verification_failed, token_refreshed
- token_type: access or refresh
- ip_address: IP address of token request
- user_agent: Browser/client user agent
- error_message: Error details (if applicable)
- created_at: Timestamp
```

### session_logs Table
```sql
- id: Unique identifier
- user_id: Reference to users table
- event: logout, logout_all, session_cleanup
- ip_address: IP address of session activity
- user_agent: Browser/client user agent
- timestamp: Event timestamp
```

### system_logs Table
```sql
- id: Unique identifier
- event: server_start, server_shutdown, maintenance
- port: Server port
- environment: Environment type (dev, staging, production)
- timestamp: Event timestamp
```

## Row Level Security (RLS)

The migration includes RLS policies:
- **Authenticated users**: Can read all logs (for auditing)
- **Anon users**: Can insert logs (for service account logging)
- **Columns**: user_id, event_type are indexed for fast queries

## Verification

After running the migration, verify in Supabase:

1. **Check Tables Exist**
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('token_activity_logs', 'session_logs', 'system_logs');
   ```

2. **Verify Indexes**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename IN ('token_activity_logs', 'session_logs', 'system_logs');
   ```

3. **Test Insert**
   ```sql
   INSERT INTO token_activity_logs 
   (event_type, token_type, created_at) 
   VALUES ('test_event', 'access', now());
   ```

## Troubleshooting

### Error: "Column user_id does not exist in users table"
- Verify your `users` table exists and has a `user_id` column (UUID type)
- If using different column name, edit the SQL before executing

### Error: "Permission denied for schema public"
- Ensure you're using the **service_role** key, not the anon key
- Add this to your .env and retry

### Tables not appearing in Table Editor
- Refresh the Supabase dashboard page
- Check the SQL Editor → Query Results for error messages
- Verify RLS policies don't block viewing

## Next Steps

Once tables are created:
1. ✅ Persistent logging code is deployed (see authService.js, server.js)
2. ✅ Test by:
   - Starting the NutriHelp API: `npm start`
   - Making a login request
   - Checking Supabase Table Editor → token_activity_logs for new entries
3. ✅ Monitor logs in Supabase as system runs

## Support

For issues:
1. Check the SQL syntax in `001_create_logging_tables.sql`
2. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
3. Review Supabase logs in the dashboard
4. Contact the development team

---
**Author**: Himanshi - Junior SOC Analyst, Cybersecurity Team  
**Date**: Week 9, Trimester 2 2026  
**Status**: ✅ Ready for Production
