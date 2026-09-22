
---

## Status update — Sept 22, 2026 (work completed live)

Supabase:
- Project was PAUSED (free plan inactivity) — resumed; the live app's backend had been down.
- Applied `202609220001_protect_premium_override_and_ai_usage.sql`: override trigger + `ai_usage` table + `consume_ai_quota`.
- 19 of 36 profiles had `is_premium_override = true` (bulk-set May 13). Turned off for all but the owner's account (buddieroots@gmail.com); 1 remains.
- Deployed `gemini-food-estimator` and `gemini-training-coach` (single-file versions with the shared helper inlined): Pro check, daily caps (60 / 15), current Gemini models, API key moved to header. Both verified responding.

App Store Connect:
- `nerdie_blaq_fit_pro_monthly` is APPROVED, $9.99/mo, 3-day free trial, group "Nerdie Blaq Fit Pro".
- Blocker cleared by owner: updated Apple Developer Program License Agreement accepted.

RevenueCat (project "Nerdie Blaq Clubhouse", app `app8747c7632e`):
- Entitlement identifier was `Pro`; the app checks `pro` (case-sensitive) so the entitlement check never matched — purchases only unlocked via the activeSubscriptions fallback. Identifiers can't be renamed, so created entitlement `pro` with `nerdie_blaq_fit_pro_monthly` attached. (Display name shows "ProProProPro" — cosmetic, fix in dashboard.)
- Current offering is "Default" and contains the Fit monthly package — paywall can load.
- In-app purchase key and App Store Connect API key: valid. Apple server-to-server notifications: none received — worth configuring.
- No live transactions, $0 revenue to date.

Still open:
- Push the 1.0.3 commit and run `eas build -p ios --profile production --auto-submit` from the Mac.
- Add `REVENUECAT_SECRET_API_KEY` in Supabase Edge Function secrets (owner only) to activate the server-side Pro check.
- Consider Supabase Pro so the project cannot pause again.
