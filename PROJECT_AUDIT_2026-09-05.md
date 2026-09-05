# OnStood 360° pre-mobile-app audit — 2026-09-05

## Scope checked

- Frontend source tree and relative import graph
- Package/lock consistency
- Environment-secret hygiene in the uploaded ZIP
- Responsive/mobile foundations, safe-area usage, and chat viewport patch presence
- Auth/Login source, AI/Knowledge call paths, PayPal invocation paths
- SEO/indexing metadata, robots and sitemap
- Local Supabase migrations/function sources
- Connected live Supabase project: public-table RLS state, key SECURITY DEFINER RPC grants, and deployed Edge Function JWT configuration

## Safe corrections applied to this snapshot

1. Removed accidental stale duplicate frontend mirror under `supabase/src`.
   - It was not referenced by the app build.
   - Several files inside it were older than the real `src`, including Auth, Messages and main.jsx.
   - Keeping it created a serious future risk of editing/deploying the wrong copy.

2. SEO/mobile-head cleanup in `index.html` only:
   - Standardized visible metadata brand casing to `OnStood`.
   - Added `viewport-fit=cover` for iPhone safe-area compatibility.
   - Added favicon and Apple touch icon references using the existing `public/onstood-logo.png` asset.

3. Preserved the current working frontend behavior:
   - Current library background remains unchanged.
   - Current mobile scroll fix remains unchanged.
   - Current mobile chat keyboard/composer fix remains unchanged.
   - No payment, quota, privacy, messaging, upload, or AI UI behavior was changed in this audit patch.

## Validation results

- Relative frontend imports missing: 0
- Package versions in `package.json` vs root `package-lock.json`: consistent
- Hard-coded private/local production endpoints: none found; localhost/LAN handling appears only where expected for development
- `eval`, `new Function`, `dangerouslySetInnerHTML`: none found in frontend source
- Obvious committed API/service secrets: none found in the uploaded project
- `robots.txt`: allows crawl and points to sitemap
- `sitemap.xml`: contains canonical `https://onstood.com/`
- Live Supabase: all public tables inspected have RLS enabled
- Live AI internal quota consume/refund RPCs are restricted to service role/postgres; `get_ai_usage` is available to authenticated users as intended
- Live `onstood-ai` is deployed with JWT verification enabled and contains server-side authentication/quota enforcement
- Live `onstood-knowledge-search` is deployed with JWT verification enabled
- PayPal create-subscription has platform JWT verification disabled but performs its own Bearer-session validation before checkout; webhook-style endpoints require their own verification by design

## Important non-breaking follow-ups before App Store / Play Store release

### 1. Repository ↔ live Edge Function synchronization
The uploaded repository contains only a small subset of the Edge Functions currently deployed in Supabase, and the local copies of `onstood-ai` / `onstood-knowledge-search` are older than the live deployed versions. Do not redeploy those local copies over production. Before treating this repository as a disaster-recovery backend source, export/synchronize all deployed Edge Functions into source control.

### 2. Pending-registration endpoint deserves a dedicated security redesign
The live `onstood-resend-confirmation` intentionally allows an unconfirmed registration to be replaced and resent. That matches current product behavior, but because it is a pre-auth flow it should get a dedicated rate-limit/anti-abuse and ownership-verification review before large public launch. It was not silently changed here because doing so can alter registration semantics.

### 3. Production build
The sandbox could not complete a clean `npm ci` because package installation did not finish in the execution environment, so a full Vite production build must still be run locally before release:

```cmd
npm ci
npm run build
```

This is an execution-environment limitation, not a detected source error. Static import and package-lock checks passed.

## Mobile app readiness conclusion

The frontend is in a reasonable state to begin the native-wrapper phase after one local production build passes. For Android/iOS, keep the existing React/Vite app and add native packaging rather than rewriting the product. The next dedicated phase should cover safe areas, keyboard behavior, camera/files, deep links/OAuth callbacks, push notifications, permissions, splash/icons, and store configuration.
