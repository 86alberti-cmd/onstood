# OnStood project audit — 2026-09-04

This snapshot includes behavior-preserving cleanup and database hardening applied to the live Supabase project.

## Completed

- Removed unreferenced legacy duplicate frontend folders: `src/components/home`, `src/components/friends`, `src/components/courses`.
- Removed the duplicate frontend mirror under `supabase/src`.
- Pinned frontend package versions to the exact versions already resolved by `package-lock.json`.
- Added local migration records matching the production hardening applied on 2026-09-04.
- Enabled RLS on the final public table that had RLS disabled.
- Fixed mutable `search_path` on three database helper functions.
- Added four missing owner foreign-key indexes in Knowledge tables.
- Removed two duplicate `ai_cost_events(created_at desc)` indexes, retaining one.
- Optimized 24 RLS policies so `auth.uid()` is initialized once per statement without changing ownership/privacy semantics.

## Intentionally not changed

- Admin `SECURITY DEFINER` RPCs remain callable by `authenticated` because the application uses them and each sensitive RPC performs an internal admin-role check. `anon` and `PUBLIC` cannot execute them.
- Multiple permissive policies were not merged because they encode distinct valid access paths (owner/admin, student/employer, privacy/owner).
- Storage MIME/size rules were not tightened in this pass because changing accepted file types could break existing uploads.
- The large `src/main.jsx` remains functionally unchanged. Splitting it should be done as a dedicated refactor with regression testing rather than mixed into a security cleanup.

## Operational follow-ups

- Enable Supabase Auth leaked-password protection in the dashboard when available for the current plan.
- Investigate the Academic Drive export/harvest 500/546 errors separately; they are runtime/backend failures, not frontend cleanup issues.
- Keep every deployed Edge Function source synchronized in the repository; the uploaded snapshot contains only a subset of live functions.
