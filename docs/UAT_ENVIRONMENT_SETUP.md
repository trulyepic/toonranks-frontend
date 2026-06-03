# UAT Environment Setup (Frontend)

Living runbook for standing up a **UAT (user-acceptance testing) frontend** so we can test new
frontend changes on a separate URL **without touching the production site** — while still using the
**same production backend and database**.

Update the checkboxes in this file as each step is completed.

---

## Goal & architecture

- A long-lived **`uat` git branch** in `toonranks-frontend` is the testing branch.
- **AWS Amplify** builds that branch into a **separate UAT URL** (its own deployment).
- The UAT site points at the **same Railway backend** (`man-review-backend-production...`), so it
  reads/writes the **same production database**.

```
uat branch ──► Amplify (UAT build) ──► UAT URL ─┐
                                                 ├─► same prod backend (Railway) ─► same prod DB
main branch ─► Amplify (prod build) ─► toonranks.com ┘
```

Workflow once set up: push frontend changes to `uat` to preview them live, then promote to `main`
(production) when happy.

---

## ⚠️ Important caveats (read first)

1. **Same database as production.** Anything you do on UAT (votes, forum posts, submissions, account
   or role changes, avatar/media uploads to S3) writes to **real prod data**. Accepted for now.
   - Mitigation: use **dedicated test accounts**, avoid destructive actions (deletes, role changes,
     spam), and rely on the UAT banner (below) so you never confuse UAT with prod.
2. **Auth is domain-bound.** Google login and reCAPTCHA only work on domains explicitly allow-listed
   in their respective consoles. The UAT domain must be added or **login/captcha will fail on UAT**
   (same class of issue as the mobile signing-key problem).
3. **Cloudflare caching.** If the UAT site is fronted by Cloudflare, stale cache can serve old builds
   (the known "blank screen after deploy" symptom). Apply the same cache-purge discipline, or keep
   the UAT subdomain on a less-aggressive cache rule.

## Cost

**~$0.** Amplify free tier covers a low-traffic extra branch; no new database or backend is created,
so there is no additional DB/compute cost. (Only watch Amplify's free-tier build-minute / hosting
limits — we are well under them at this scale.)

---

## Setup checklist

Legend: **[me]** = code change I can prepare on a branch · **[console]** = you do it in a web
console · ✅ = done.

### 1. Git: create the `uat` branch — ✅ DONE
- [x] Create a long-lived `uat` branch off `main` in `toonranks-frontend`.
- [x] This branch is the source Amplify will build for UAT.

### 2. Documentation — ✅ DONE
- [x] Add this runbook (`docs/UAT_ENVIRONMENT_SETUP.md`) on the `uat` branch and keep the
      checkboxes updated as we progress.

### 3. Backend CORS — accept the UAT origin — ⬜ TODO **[me]**
- [ ] Make the backend CORS allowlist env-driven: read an `EXTRA_CORS_ORIGINS` env var
      (comma-separated) in `toonranks-backend/app/main.py` and append it to `allow_origins`.
      (Currently the allowlist is hardcoded to localhost + `toonranks.com` / `www.toonranks.com`,
      with `allow_credentials=True` — so `*` is not allowed and the UAT origin must be listed.)
- [ ] After deploy, set `EXTRA_CORS_ORIGINS` to the UAT URL as a **Railway env var** (console).
- _Note: this is a separate PR in the backend repo, not the frontend `uat` branch._

### 4. Amplify: connect the `uat` branch — ⬜ TODO **[console]**
- [ ] In the existing Amplify app, **connect a new branch** = `uat`.
- [ ] Confirm it builds with the current `amplify.yml` (same backend URL — no build change needed
      because UAT uses the same backend).
- [ ] Note the generated UAT URL (e.g. `https://uat.<appId>.amplifyapp.com`).
- _(Step-by-step with screenshots to be added when we configure Amplify.)_

### 5. Google OAuth — allow the UAT domain — ⬜ TODO **[console]**
- [ ] Google Cloud Console → APIs & Services → Credentials → the **OAuth 2.0 *web* client**.
- [ ] Add the UAT URL to **Authorized JavaScript origins** (and redirect URIs if used).
- _Without this, "Continue with Google" fails on UAT._

### 6. reCAPTCHA — allow the UAT domain — ⬜ TODO **[console]**
- [ ] reCAPTCHA admin console → the site key used by the app → **add the UAT domain** to allowed
      domains.
- _Without this, the login/signup captcha fails on UAT._

### 7. UAT banner in the frontend — ⬜ TODO **[me]**
- [ ] Add a small persistent "UAT" ribbon/badge gated by an env var (e.g. `VITE_APP_ENV=uat`) so the
      UAT site is visually distinct from production (important since both share the prod DB).
- [ ] Set `VITE_APP_ENV=uat` only on the UAT Amplify branch build (prod stays unset/`production`).
- _This is a frontend change; it can live on `uat` and be merged forward._

### 8. (Optional) Cloudflare custom subdomain — ⬜ TODO **[console]**
- [ ] If you want `uat.toonranks.com` instead of the Amplify URL: add the domain in Amplify, create
      the CNAME in Cloudflare, and set a sane cache rule (avoid serving stale builds).

### 9. Verification — ⬜ TODO
- [ ] UAT URL loads the app.
- [ ] Email/password login + reCAPTCHA works on UAT.
- [ ] Google login works on UAT.
- [ ] Reads work (rankings, forum, etc.) against the shared prod data.
- [ ] The UAT banner is visible and prod is unaffected.

---

## Notes / decisions log

- **2026-06:** Decided UAT will **share the production database** for now (no separate UAT DB). A
  separate UAT DB can be introduced later if test-data pollution becomes a problem.
- Backend remains a single production instance on Railway; UAT only adds a frontend deployment.
