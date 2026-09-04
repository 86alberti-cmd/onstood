# OnStood — Etapa 3 (2026-09-04)

## Frontend refactor

- `AdminControlCenter` was extracted from `src/main.jsx` into `src/components/admin/AdminControlCenter.jsx`.
- `src/main.jsx` reduced from about 7,768 lines to about 5,894 lines.
- Auth/session orchestration was deliberately left in `main.jsx` for this phase to avoid introducing risk into login, MFA, recovery, Google onboarding and session handling.
- No user-facing design or admin behavior was intentionally changed.
- Babel parser validation passed across all source JS/JSX/TS files.
- Free-identifier validation on the extracted admin module returned zero unresolved identifiers.

## PayPal verification

No PayPal code was changed in this phase because live logs now show a successful end-to-end checkout start on Edge Function `onstood-paypal-create-subscription` v23:

- create-subscription: HTTP 200
- billing subscription insert: HTTP 201
- PayPal webhook: HTTP 200
- webhook subscription/event updates completed successfully

Earlier 401 responses correlated with revoked/stale Supabase sessions and MFA/token rotation, not with the PayPal plan creation logic.

## Academic background pipeline

The two aggressive scheduled jobs are currently disabled in Supabase:

- `onstood-global-academic-harvest`: previously every 10 minutes — disabled
- `onstood-academic-drive-export-auto`: previously every minute — disabled

They should remain disabled until the worker payload is reduced and concurrency/time-budget protection is added. Historical logs show Edge runtime limits and database/auth pressure during the old workload. The normal OnStood application and current PayPal flow are healthy while these jobs remain off.

## Next safe backend step

Before re-enabling academic automation:

1. reduce Drive Export batch size substantially;
2. prevent overlapping export runs;
3. make harvesting cursor/time-budget driven;
4. persist harvest cursor frequently so timeout does not lose progress;
5. re-enable with a conservative schedule and observe DB/Auth latency.

Do not restore the old every-minute export schedule unchanged.
