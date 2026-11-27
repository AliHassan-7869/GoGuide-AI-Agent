# Environments

GoGuide runs in three environments. A build only talks to production services if it is a production
build, or if you explicitly say so.

| Environment | What it is | Backend | Firebase project |
|---|---|---|---|
| `production` | The live site and store builds | `https://goguide-ai-agent.onrender.com` (default) | `goguideai` (default) |
| `staging` | Test builds and preview site with test data | its own Render service | its own Firebase project |
| `development` | `npx expo start` on a laptop | local backend or a staging one | a test Firebase project |

The app decides which one it is from `EXPO_PUBLIC_APP_ENV`. If unset, `expo start` is `development` and
any built app or site is `production`. Code: `app/GoGuide/Configs/env.js`.

## The rule

- **Production builds** use the live backend and Firebase project with no setup.
- **Development and staging builds must be configured** (`EXPO_PUBLIC_API_URL` and the four required
  `EXPO_PUBLIC_FIREBASE_*` values). Without them, Firebase refuses to start and AI calls fail with a
  message saying what is missing. They never fall back to production by themselves.
- A **half-filled** Firebase config is refused too, so settings from two projects can never be mixed.
- To use production on purpose, set `EXPO_PUBLIC_USE_PRODUCTION_SERVICES=true`. The app prints a loud
  warning at start-up when you do.

## Day-to-day (development)

1. `cp app/GoGuide/.env.example app/GoGuide/.env.local` and fill it in (or set `EXPO_PUBLIC_USE_PRODUCTION_SERVICES=true` in `app/GoGuide/.env.local` to run Expo Go directly against production Firebase/Render).
2. Start the app: `cd app/GoGuide && npx expo start --go -c`. The console shows which backend and Firebase project are in use.
3. For a full list of installed machine tools, VS Code extensions, and frontend/backend dependencies, see [`docs/MACHINE_EXTENSIONS_AND_DEPENDENCIES.md`](./MACHINE_EXTENSIONS_AND_DEPENDENCIES.md).

## One-time setup you must do yourself (not done by the code)

These create real cloud resources, so they are deliberately not automated here.

1. **Staging Firebase project**: create `goguide-staging` in the Firebase console, enable
   Email/Password and Anonymous sign-in, create a Firestore database, add a Web app and copy its config
   into `.env.local` (and into the EAS/Vercel settings below).
   - Register it in the CLI: `cd app/GoGuide && firebase use --add` (alias `staging`).
   - Deploy rules and indexes to it: `firebase deploy --only firestore --project staging`.
   - Always check the project before deploying: `firebase use`. Production is `goguideai` (alias `default`).
2. **Staging backend**: in Render create a second web service from this repo (branch `staging`, same
   build and start commands as `render.yaml`). Set `ENVIRONMENT=staging`, its own `API_KEY`, AI keys,
   `FIREBASE_PROJECT_ID=<staging project id>`, `ALLOWED_ORIGINS=<staging site>`, and (optional) its own
   `SENTRY_DSN`. Staging does not report to the production Sentry project unless you give it that DSN.
3. **Staging site (Vercel)**: Vercel *Preview* deployments are built like production unless told
   otherwise. In Project Settings > Environment Variables, set for **Preview only**:
   `EXPO_PUBLIC_APP_ENV=staging`, `EXPO_PUBLIC_API_URL=<staging backend>` and the `EXPO_PUBLIC_FIREBASE_*`
   values. Leave **Production** with no overrides.
4. **Staging app builds (EAS)**: `eas build --profile staging`. The profile sets
   `EXPO_PUBLIC_APP_ENV=staging`; add the URL and Firebase values as EAS environment variables for the
   `staging` profile. The existing `preview` profile is unchanged and still uses production.
5. **Uptime check for staging**: create a repository variable `BACKEND_URL` (or run the workflow manually
   with a URL). See `.github/workflows/keep-alive.yml`.

## Backend settings that depend on the environment

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | `production`, `staging` or `development`. A Render service without it counts as production; a laptop counts as development. |
| `SENTRY_DSN` | Where errors go. Only production falls back to the shared production project. |
| `SENTRY_TRACES_SAMPLE_RATE` | Fraction of requests traced (default `0.1`). |
| `ALLOWED_ORIGINS` | The web origin(s) allowed to call this backend. |
| `FIREBASE_PROJECT_ID` | Which Firebase project's login tokens this backend accepts. Must match the app. |
| `REQUIRE_EMAIL_VERIFICATION` | `true` by default; unverified email accounts cannot use AI features. |
| `RATE_LIMIT_PER_HOUR` / `IP_RATE_LIMIT_PER_HOUR` | Requests per hour per account (`30`) and per address (`120`). |
| `PLAN_RATE_LIMIT_PER_HOUR` | Trip generation requests per hour per account (`15`). |
| `USER_DAILY_LIMIT` | Requests per day per account (`150`). |
| `ANON_RATE_LIMIT_PER_HOUR` / `ANON_DAILY_LIMIT` | Lower limits for guest accounts (`15` per hour, `40` per day). |
| `ANON_IP_DAILY_LIMIT` | Daily requests from all guest accounts at one address (`100`). |
| `MAX_BODY_BYTES` | Largest request accepted; bigger ones get `413` (`524288`). |

In production, an empty `ALLOWED_ORIGINS` allows only the live website.

The keep-alive heartbeat inside the backend pings only its own address (`RENDER_EXTERNAL_URL`), so a
staging service can never keep production awake or report on it.
