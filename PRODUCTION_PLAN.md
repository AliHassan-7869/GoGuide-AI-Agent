# GoGuide Production Plan

Checklist and cost sheet for taking GoGuide to production.

Last updated: 2026-10-20

---

## 1. What is already done

| # | Item | Commit |
|---|---|---|
| 1 | Git repo moved from home folder to the project folder | `f7cad24` |
| 2 | Backend security: Gemini key sent in header, generic errors, strict API key, input limits, CORS | `2142223` |
| 3 | Firebase login auth on backend, per-user rate limit, `/chat` endpoint, Gemini model fallback | `b385e00` |
| 4 | App calls the backend for all AI. No AI keys inside the app | `f38b08a` |
| 5 | Firestore rules: users can only see their own trips and profile. Unique trip ids | `3059759` |
| 6 | 35 backend tests and a GitHub Actions workflow | `6e5f072` |
| 7 | Beach, Mountain and Forest screens merged into one Explore screen with filters | `1c9938a` |

---

## 2. Production checklist

### 2.1 Must do before launch

| # | Task | Owner | How |
|---|---|---|---|
| [ ] 1 | Push all commits | Me (Ali) | `git push origin staging` |
| [ ] 2 | Deploy Firestore rules | Me | `cd "app/Go Guide" && npx firebase-tools deploy --only firestore:rules` |
| [ ] 3 | Change DeepSeek model name from `deepseek-chat` to `deepseek-flash` | Claude | DeepSeek docs no longer list `deepseek-chat` |
| [ ] 4 | Change Gemini fallback from `gemini-3.5-flash` to `gemini-3.6-flash` | Claude | `3.5-flash` is not on the pricing page anymore |
| [ ] 5 | Log token usage for every AI call | Claude | Read `usageMetadata` from Gemini so real cost is known |
| [ ] 6 | Set a spend cap in Google AI Studio ($5 or $10) | Me | AI Studio > Spend page > project spend cap |
| [ ] 7 | Create my own Render account and deploy the backend | Me + Claude | Free web service, HTTPS URL |
| [ ] 8 | Set Render env vars | Me | `GEMINI_API_KEY`, new random `API_KEY`, `FIREBASE_PROJECT_ID`, optional `DEEPSEEK_API_KEY` |
| [ ] 9 | Point the app to the HTTPS backend | Claude | `EXPO_PUBLIC_API_URL=https://<my-backend>.onrender.com` |
| [ ] 10 | Rotate keys after deploy | Me | New Gemini key only on Render. Delete old ones |

Generate a strong `API_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2.2 Google Play Store requirements

| # | Task | Owner | Notes |
|---|---|---|---|
| [ ] 11 | Privacy policy page | Claude writes, I publish | Free on GitHub Pages. Must say Gemini free tier data may be used by Google |
| [ ] 12 | Delete account option in the app and a web link | Claude | Required by Play Store for apps with sign up |
| [ ] 13 | Data safety form | Me | Collected: email, name, location, trip data |
| [ ] 14 | Closed testing: 12 testers for 14 days | Me | Required for new personal developer accounts before production. Start early |
| [ ] 15 | Play Console account | Me | $25 one time |
| [ ] 16 | Release build with EAS | Me + Claude | Create my own Expo account, run `eas init` (links the app to my account), then `eas build -p android --profile production`. The old link to the `stack2211` account was removed on 2026-10-20 |

### 2.3 Should do (quality)

| # | Task | Why |
|---|---|---|
| [ ] 17 | Debounce place search | Nominatim (OpenStreetMap) allows about 1 request per second. Typing calls it on every letter. They block heavy users |
| [ ] 18 | Fix lint error in `generate-trip.jsx` | "Cannot access variable before it is declared" can crash the screen |
| [ ] 19 | Remove debug `console.log` | Interest page logs the full AI prompt and response |
| [ ] 20 | Lighter requirements file for Render | `requirements.txt` also installs CrewAI and Streamlit, which the API does not need. Slow builds |
| [ ] 21 | Keep Render awake | Free server sleeps after 15 min. First request then takes about 1 min. A free uptime monitor can ping `/health` every 10 min |
| [ ] 22 | Restrict the Firebase API key | Google Cloud Console > Credentials. Allow only my Android app and Firebase APIs |
| [ ] 23 | Rename the home folder git repo | `mv ~/.git ~/.git-home-backup` so private files never get committed |
| [ ] 24 | Top up DeepSeek or remove it | Balance is $0, so the last fallback does not work |

### 2.4 Later (after launch)

| # | Task | Why |
|---|---|---|
| [ ] 25 | Redis cache for `/plan` and safety alerts | Same trip asked again is served free. Biggest AI cost saving |
| [ ] 26 | Move rate limit to Redis | Survives restarts and multiple servers |
| [ ] 27 | Docker and docker compose | One command to run backend and Redis |
| [ ] 28 | Sentry crash tracking | Know when the app crashes on user phones |
| [ ] 29 | Firebase App Check | Only my real app can call Firebase |
| [ ] 30 | Smart Copilot with LangGraph, step A: weather, places and read trip tools | Real weather (Open-Meteo) and places (OpenStreetMap) instead of guesses. Max 3 tool rounds. Normal chat cost goes up about 15%, tool questions cost about 2x |
| [ ] 31 | Smart Copilot with LangGraph, step B: edit trip tool | "Remove the museum from Day 2" updates the trip. Most expensive Copilot action (about $0.03). Only if users ask for it |

Do 30 and 31 only after launch and after token logging (task 5) shows how much people use the Copilot.

### 2.5 Suggested order

| Day | Tasks |
|---|---|
| Day 1 | 1 to 10 (backend live, keys safe) |
| Day 2 | 11 to 16 (Play Store setup, start the 14 day tester clock) |
| Day 3+ | 17 to 24 |
| After launch | 25 to 29 |

---

## 3. Cost

All prices checked on 2026-10-20. USD to PKR taken as about 280. Prices change, so check again before paying.

### 3.1 AI prices

| Provider | Model | Input / 1M tokens | Output / 1M tokens | Notes |
|---|---|---|---|---|
| Google | `gemini-3.8-flash` | $0.75 | $3.75 | Until 2026-12-31 |
| Google | `gemini-3.8-flash` | $1.50 | $7.50 | From 2027-01-01 (double) |
| Google | `gemini-3.6-flash` | $0.75 | $3.75 | Same as 3.8 until end of 2026 |
| Google | `gemini-3.5-flash-lite` | $0.30 | $2.50 | Cheaper option |
| DeepSeek | `deepseek-flash` | about $0.14 | about $0.28 | From third party sources. Confirm on DeepSeek site |

Notes:

- Gemini "thinking" tokens are billed as output.
- Gemini free tier exists, but limits are not published and are low. I got `429` after a few requests on 2026-10-20.
- Free tier data may be used by Google to improve its products.
- DeepSeek is prepaid. No surprise bills.

### 3.2 Cost per request (estimate)

| Request | Tokens (approx) | Now | From 2027 |
|---|---|---|---|
| 1 trip plan (`/plan`) | 500 in + 4,000 out | ~$0.015 (~4 PKR) | ~$0.03 (~8 PKR) |
| 1 Copilot message (`/chat`) | 1,000 in + 1,000 out | ~$0.005 (~1.4 PKR) | ~$0.01 (~3 PKR) |
| 1 safety alert list (`/generate`) | 300 in + 800 out | ~$0.003 (~1 PKR) | ~$0.006 (~2 PKR) |

These are estimates. Task 5 (token logging) gives real numbers.

### 3.3 One time costs

| Item | Cost | Needed? |
|---|---|---|
| Google Play developer account | $25 (~7,000 PKR) | Yes, for Play Store |
| Apple developer account | $99 per year (~28,000 PKR) | Optional, only for iOS |
| Domain name | ~$10 per year | Optional |

### 3.4 Monthly costs

| Service | Free tier | Paid |
|---|---|---|
| Firebase Auth | Free for normal email login use | Only if very large |
| Firestore | 50,000 reads and 20,000 writes per day | Pay as you go above that |
| Render web service | Free, sleeps after 15 min, 750 hours per month | Paid plan for always on (check current price, around $7) |
| Render Key Value (Redis) | 1 free instance, data lost on restart | Paid for persistence |
| Expo EAS Build | Free tier available | Paid for faster builds |
| Gemini API | Free tier with low limits | See 3.1 |
| OpenStreetMap / Open-Meteo | Free with fair use rules | |

### 3.5 Total by stage

| Stage | Usage per month | AI | Server | Total per month |
|---|---|---|---|---|
| Testing (me and friends) | Inside free tier | $0 | $0 | **$0** |
| Small launch | 500 trips + 2,000 chats | ~$17 (~4,800 PKR) | $0 to $7 | **~$17 to $25** |
| Growing | 5,000 trips + 20,000 chats | ~$175 (~49,000 PKR) | ~$7+ | **~$180+** |

Plus one time: **$25** for Play Store.

### 3.6 How to keep cost safe

| Control | Where |
|---|---|
| Project spend cap | Google AI Studio > Spend |
| Prepay balance | Gemini stops with `402` when balance is $0 |
| Per-user rate limit | Backend, `RATE_LIMIT_PER_HOUR` (default 30) |
| Offline trip cache | App saves the last trip on the phone, so viewing it again costs nothing |
| Redis cache (later) | Same request served without calling AI |
| DeepSeek prepaid wallet | Only spends what I load |

---

## 4. Environment variables

### Backend (`.env` locally, Render dashboard in production)

| Name | Required | Example |
|---|---|---|
| `GEMINI_API_KEY` | Yes | from AI Studio |
| `API_KEY` | Yes | long random string |
| `FIREBASE_PROJECT_ID` | No | `ai-travel-agent-e36a2` (default) |
| `DEEPSEEK_API_KEY` | No | fallback provider |
| `GEMINI_MODELS` | No | `gemini-3.8-flash,gemini-3.6-flash` |
| `RATE_LIMIT_PER_HOUR` | No | `30` |
| `ALLOWED_ORIGINS` | No | `*` or comma separated list |

### App (`app/Go Guide/.env`)

| Name | Required | Example |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Production only | `https://...onrender.com`. Leave unset for local dev, the app finds the computer automatically |

Never put AI keys in the app. Anything starting with `EXPO_PUBLIC_` is visible inside the APK.

---

## 5. Sources

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini API billing and spend caps](https://ai.google.dev/gemini-api/docs/billing)
- [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [DeepSeek API guide (Morph)](https://www.morphllm.com/deepseek-api)
- [Render free tier](https://render.com/docs/free)
- [Google Play 12 testers rule](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026)
