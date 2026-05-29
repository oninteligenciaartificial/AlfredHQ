# Alfred Schema Migration Notes

## Current Setup

Alfred runs inside DentaGest's Supabase project (`kvepqgikokjlacxngkiw`) using a dedicated PostgreSQL schema (`alfred`) for full isolation.

- **DB URL**: `https://kvepqgikokjlacxngkiw.supabase.co`
- **Schema**: `alfred` (all tables, functions, RLS policies)
- **DentaGest schema**: `public` (untouched)

## Applied Migrations

| Migration | Applied | Description |
|-----------|---------|-------------|
| `create_alfred_schema` | 2026-05-28 | Full schema: 7 tables, RLS, indexes, `get_agent_context` function |

## Manual Step Required

After applying the schema, expose `alfred` in PostgREST settings:

1. Supabase Dashboard → Settings → API
2. **Exposed schemas** → add `alfred`
3. Save → PostgREST restarts automatically

Without this step, the JS client cannot query `alfred` schema tables via REST.

## Future Migration to Dedicated Project

When moving Alfred to its own Supabase project:

1. Create new Supabase project
2. Apply `supabase/schema-alfred.sql` (no changes needed)
3. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<new-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<new-service-key>
   ```
4. Expose `alfred` schema in new project's PostgREST settings
5. No code changes required

## Client Configuration

Both `server.ts` and `client.ts` use:
```ts
createServerClient<Database, 'alfred'>(..., { db: { schema: 'alfred' } })
createBrowserClient<Database, 'alfred'>(..., { db: { schema: 'alfred' } })
```

`database.types.ts` uses `alfred:` as the top-level key (not `public:`).
