# Operations runbook

What is watched, who finds out, how to get data back, and how to undo a bad release.

> **Status key.** *In the repo* = done in code and tested. *You must do* = needs a console login or a
> paid plan, so it is NOT done until you do it. Nothing in the "You must do" lists has been run.

## 1. Monitoring and alerts

### What the code already does (in the repo)
- **Uptime:** `.github/workflows/keep-alive.yml` checks `/health` every 12 minutes with retries and
  **fails the run** if the backend is down. GitHub emails Actions failures to the repository's
  notification recipients. It also keeps the free-tier Render service awake.
  - In public repositories GitHub disables scheduled workflows after 60 days with no activity. If the check goes
    quiet, re-enable it under the Actions tab.
- **Render health check:** `render.yaml` sets `healthCheckPath: /health`, so Render restarts an
  instance that stops answering.
- **Which release is live:** `GET /health` returns `{"status":"ok","release":"<7-char commit>"}`.
  Errors in Sentry carry the same release.
- **Backend errors** go to Sentry (production falls back to the shared project; staging needs its own
  `SENTRY_DSN`). Tagged with `environment` and `release`. 10% of requests are traced.
- **AI provider health** (no user text is ever logged):
  - `AI answered: provider=gemini latency=842ms` (INFO) on every answer.
  - `Gemini API error ...` (WARNING) when a provider failed but the next one covered for it.
  - `All AI providers failed (tried: ...)` (**ERROR**) when users actually got an error. Alert on this one.

### You must do: Sentry alert rules (about 10 minutes, Sentry > Alerts)
1. **Outage:** issue alert, filter `message contains "All AI providers failed"` and
   `environment = production`, action: email immediately.
2. **Any new error in production:** issue alert on "A new issue is created", `environment = production`.
3. **Regression after a deploy:** alert on "Issue is reopened / regressed".
4. **Volume:** metric alert when errors per 10 minutes exceed a normal level (start with 20).
5. **Slow AI:** metric alert on p95 transaction duration for `POST /plan` above 60 seconds.

### Known gap: the mobile/web app has no alerting
Crashes are written to the Firestore `AppErrors` collection, which nothing reads and nothing alerts on.
Options (each needs your decision): add `@sentry/react-native` (a new native dependency and an EAS
rebuild), or build a small scheduled job that reads `AppErrors`. Until then, look at `AppErrors` in the
Firebase console after each release.

## 2. Backups

### You must do: turn on Firestore backups (not done)
Firestore has no backups unless you enable them. These need the **Blaze (pay-as-you-go)** plan and
`gcloud` logged in with permission on project `goguideai`. Check each flag with
`gcloud firestore --help`, because the CLI changes.

```bash
# Point-in-time recovery: restore to any minute in the last 7 days
gcloud firestore databases update --database='(default)' --enable-pitr --project=goguideai

# Daily backups kept for 4 weeks
gcloud firestore backups schedules create --database='(default)' \
  --recurrence=daily --retention=4w --project=goguideai

# Confirm
gcloud firestore databases describe --database='(default)' --project=goguideai
gcloud firestore backups schedules list --database='(default)' --project=goguideai
```

### Restore (practise this once on staging before you need it)
```bash
gcloud firestore backups list --project=goguideai
gcloud firestore databases restore --source-backup=<BACKUP_NAME> \
  --destination-database=restored-$(date +%Y%m%d) --project=goguideai
```
Restoring creates a **new** database. Compare it, then copy the needed documents back; do not point
the app at it blindly. Also keep `firestore.rules` and `firestore.indexes.json` in git (they are).

### Not backed up
- AI provider keys and Render/Vercel settings: keep them in a password manager.
- Local data on users' phones (offline cache, packing lists): lives only on the device.

## 3. Deploys and rollback

| Part | Deploys from | Roll back |
|---|---|---|
| Web (Vercel) | push to the connected branch | Vercel > Deployments > pick the last good one > **Promote to Production** (or `vercel rollback`) |
| Backend (Render) | push to the connected branch | Render > service > Events/Deploys > pick the last good deploy > **Rollback** |
| Firestore rules | manual: `firebase deploy --only firestore:rules` | `git checkout <good-commit> -- firestore.rules app/GoGuide/firestore.rules` then redeploy. Check `firebase use` first. |
| Mobile apps (EAS) | manual: `eas build --profile production` | Submit the previous build; store releases cannot be un-shipped, only superseded |

**Order that avoids breakage for changes touching both sides:** deploy Firestore rules *after* the app
release that no longer needs the old access, and deploy the backend *after* the app that understands its
new responses (for example the email-verification rule).

**Before every release** (CI runs these on each push/PR): backend `pytest`, app lint, `tsc`, unit and
screen tests, and `npx expo export -p web`.

## 4. When something is wrong

1. **Is it the backend?** Open `<backend>/health`. Not `ok`: check Render logs and the last deploy; roll
   back if it started right after one. The `release` value tells you which commit is running.
2. **Are AI answers failing?** Sentry "All AI providers failed" means every provider is down or out of
   quota. Check each provider's status page and key balance; set `GEMINI_MODELS` or keys in Render.
   The app falls back to bundled itineraries for six cities in the meantime.
3. **Are users unable to sign in or save?** Check the Firebase console (Authentication, Firestore usage)
   and the last rules deploy. Rules mistakes show up as "permission denied" in the app logs.
4. **After the incident:** write down what happened and what you changed here or in a commit message.
