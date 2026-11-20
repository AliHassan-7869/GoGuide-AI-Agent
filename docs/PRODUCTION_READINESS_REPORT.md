# GoGuide AI: Production Readiness Report

Branch: `staging` | Date: 2026-11-20 | Nothing pushed.

## 1. Verdict

The app is **close to launch-ready from a code standpoint**. What remains is mostly account, key and infrastructure work that only you can do.

| Area | Status |
|---|---|
| Code quality (lint, tests, web build) | Green: lint exit 0, 91/91 tests, `expo export -p web` exit 0 |
| Firestore security rules | Strong in the repo (see section 4). Booking and favorite validation added but **not yet deployed or emulator-tested** |
| Backend hardening (CORS, auth, secrets) | Good |
| Web hosting headers | Good, but no CSP yet |
| Secrets and key hygiene | **Needs action** (rotate and restrict) |
| AI provider billing | **Blocker**: DeepSeek balance is $0 |
| Horizontal scaling | Not ready (in-memory state) |
| Store release | Not started (Play Store tasks) |

## 2. Architecture

- **Frontend:** Expo SDK 58, React Native 0.88, React 19, expo-router. Static web export on Vercel (https://dist-seven-tau-79.vercel.app).
- **Backend:** FastAPI (`app.py`) with CrewAI agents, a LangGraph orchestrator and curated destinations. It runs on Render (https://goguide-ai-agent.onrender.com) with a keep-alive workflow. Sentry is initialized.
- **Data and auth:** Firebase project `goguideai`: anonymous auth, email OTP 2FA, Firestore.
- **CI:** `app-tests.yml`, `backend-tests.yml`, `keep-alive.yml`.
- **Protected contracts (never rename):** POST /plan, GET /plan, POST /plan-deep, GET /plan-deep/{job_id}, POST /plan/orchestrate, /health.

## 3. Completed in this audit (committed on `staging`)

| Commit | Change |
|---|---|
| ec95c8f | Production CORS drops the wildcard origin regex when an allow-list is set |
| dd9b083 | `vercel.json` adds X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy and HSTS |
| 236d751 | ESLint fixed: Windows path-casing false positives, jest globals, generated `CuratedPlans.js` ignored |
| 9e19e68 | Debug `console.log` calls in 18 files guarded by `__DEV__` |
| 1fe8e1e | `jest` and `jest-expo` moved to devDependencies |
| bebabae | `.claude/launch.json` for local preview |

Earlier fixes in the same effort: jspdf SSR crash in `metro.config.js`, missing `expo-clipboard`, and the production-services flag for live Firebase.

## 4. Firestore rules review

I re-read `firestore.rules`. Findings:

- Default deny. Trips, profiles, shared trips, support tickets and error logs have key whitelists and size limits. **Bookings, UserBookings and UserFavorites now have them too** (`validBooking`, `validFavorite`: key whitelist, string and size caps, `userEmail` immutable on update). This is in the repo only; it has not been deployed.
- A second copy exists at `app/GoGuide/firestore.rules`. Verified: it is now byte-identical to the root file.
- Trips, profiles, bookings and favourites are owner-only. Ownership fields are immutable on update.
- `SupportTickets` is create-only for guests, with bounded payloads. `AppErrors` is write-only.
- **SharedTrips:** single-document `get` is public by design, because share links need it. Listing is owner-only, so nobody can enumerate trips. The stored fields are `id`, `destination`, `plan`, `updatedAt` and `userId` (a UID). The remaining check is that the `plan` content never embeds an email address or phone number. The rules cannot enforce that, so it depends on the client code.
- Not verified: that the **deployed** rules in the Firebase console match this file. `firebase deploy --only firestore:rules` has **not** been run. Test the new rules in the Firebase emulator first (see section 6), then deploy.

## 5. Open issues

### Critical (before launch)
1. **Rotate all API keys.** They have lived in local `.env` files. Set the new ones only in Render and Vercel (PRODUCTION_PLAN #10, #8).
2. **Restrict the Firebase API key** to your domains and app bundle IDs in Google Cloud Console (#22).
3. **Fund DeepSeek and confirm the model** (#24, #3). With a $0 balance, AI planning fails in production.
4. **Confirm SharedTrips `plan` holds no personal data** (section 4).

### High
5. **In-memory rate limiting, daily AI cap and plan cache.** This is fine on one instance. With two or more, the limits multiply and the cache fragments. Move them to Redis before scaling (#26).
6. **No Content-Security-Policy.** Add one in report-only mode first, tested against Firebase, Sentry and your map and image hosts, so a wrong policy cannot break the app.
7. **No Firebase App Check.** Without it, anyone can call your Firebase project and AI endpoint from outside your app (#29).
8. **No token usage logging.** You cannot track AI cost per user or per plan without it (#5).

### Medium
9. `moment` and `date-fns` are both installed. Consolidate over time to reduce bundle size.
10. The backend `requirements.txt` is heavy. A lighter file means faster Render deploys (#20).
11. Add an uptime alert on `/health` and a spend alert on the AI provider.
12. ~~Add field and size validation to the Bookings, UserBookings and UserFavorites rules~~ Done in the repo, and the two `firestore.rules` copies are identical. Still to do: emulator test, then deploy. Keep both copies identical in future.
13. Rename the stray home-folder `.git` so tools do not mistake it for this repo (#23).

### Release tasks
14. Play Store: listing, privacy policy, data-safety form (#13 to #15).
15. Docker and the copilot tools are planned for later (#27 to #31).

### Decisions made
- `@google/generative-ai` is unused but **kept**, at your request.

## 6. What I did not verify

- Every screen's layout at the 600px and 1024px breakpoints. I tested the main flows in the browser pane only.
- Real-device behavior, for example keyboard docking of the chat bar on Android and iOS.
- The deployed Firestore rules and the live Render environment variables. I cannot see either from here.
- Load or cost behavior under real traffic.
- The new booking and favorite rules against the Firebase emulator or the live project. A rule that is too strict (for example, a booking with a field I did not see) would reject writes, and the app swallows those errors, so the failure would be silent.

## 7. Recommended order of work

1. Items 1 to 4 (about an hour, all console settings).
2. Review and push `staging`, then promote to `main`.
3. Add the CSP in report-only mode, then App Check.
4. Add token logging and the uptime and spend alerts.
5. Do the Redis migration only when you need more than one instance.
6. Play Store submission.
