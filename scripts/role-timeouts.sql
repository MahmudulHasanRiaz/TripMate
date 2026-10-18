-- Role-level statement timeouts for the app role behind the Supabase pooler.
--
-- Why role-level: Supavisor (the 6543 transaction pooler) DROPS per-connection
-- startup parameters — statement_timeout, application_name, even the `options`
-- connection parameter (all verified live). So the connection-level guards in
-- src/db/connection.ts never reach the backend. Role defaults are stored in
-- the database (pg_roles.rolconfig) and therefore survive the pooler; this is
-- the only working server-side backstop besides Supabase's own 2-minute
-- default, which this tightens.
--
-- Apply once per environment, connecting AS the role the app uses (both
-- DATABASE_URL and DATABASE_URL_MIGRATE share it — Supabase: `postgres`):
--   psql "$DATABASE_URL_MIGRATE" -f scripts/role-timeouts.sql
--
-- The auto-migrator lifts these for its own session (scripts/auto-migrate.mjs
-- runs `set statement_timeout = 0`) so long index builds are never killed.
-- App runtime connections keep 30s.
--
-- Pooler note (verified live): while Supavisor's warm SERVER-side sessions
-- (opened before this script ran) keep their session-start values, any NEW
-- server connection gets these role defaults. The pooler recycles them on its
-- own; to force immediately, terminate them from a privileged connection:
--   select pg_terminate_backend(pid) from pg_stat_activity
--   where application_name = 'Supavisor' and pid <> pg_backend_pid();
-- Verify on a fresh app connection: current_setting('statement_timeout')
-- must return 30s with source = "user".
--
-- To revert:
--   alter role <role> reset statement_timeout;
--   alter role <role> reset idle_in_transaction_session_timeout;

do $$
begin
  execute format('alter role %I set statement_timeout = %L', current_user, '30s');
  execute format(
    'alter role %I set idle_in_transaction_session_timeout = %L',
    current_user, '60s'
  );
end
$$;
