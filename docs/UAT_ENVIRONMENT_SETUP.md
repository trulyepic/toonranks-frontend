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

### 3. Backend CORS — accept the UAT origin — ✅ DONE

- [x] **[me]** Made the CORS allowlist env-driven: `app/config.py` reads `EXTRA_CORS_ORIGINS`
      (comma-separated) and `app/main.py` spreads it into `allow_origins` (merged on the backend).
- [x] **[console]** Set the Railway env var on the backend service:
      `EXTRA_CORS_ORIGINS = https://uat.toonranks.com` → redeployed. UAT data now loads.

### 4. Amplify: connect the `uat` branch — ✅ DONE **[console]**
- [x] Connected the `uat` branch in the Amplify app (App ID `d44czcdkzilpz`), auto-build enabled,
      using the existing `amplify.yml` (same backend URL).
- [x] **UAT URL:** `https://uat.d44czcdkzilpz.amplifyapp.com` — status **Deployed**.

### 5. Google OAuth — allow the UAT domain — ✅ DONE **[console]**
- [x] Google Cloud Console → APIs & Services → Credentials → the **OAuth 2.0 web client** →
      **Authorized JavaScript origins** → added `https://uat.toonranks.com`. Google login works on UAT.

### 6. reCAPTCHA — allow the UAT domain — ✅ DONE **[console]**
- [x] reCAPTCHA admin → site key `6Ld96JMrAAAAAOgkEHH4sARr5aHkCone2tYQBCXN` → **Domains** → added
      `uat.toonranks.com`. Captcha + email login work on UAT.

### 7. UAT banner in the frontend — ⬜ TODO (optional) **[me]**
- [ ] Add a small persistent "UAT" ribbon/badge gated by an env var (e.g. `VITE_APP_ENV=uat`) so the
      UAT site is visually distinct from production (important since both share the prod DB).
- [ ] Set `VITE_APP_ENV=uat` only on the UAT Amplify branch build (prod stays unset/`production`).
- _Not yet built. Still worth doing since UAT writes to the prod DB._

### 8. Custom subdomain `uat.toonranks.com` — ✅ DONE **[console]**

- [x] Added the `uat` → `uat` branch subdomain mapping in Amplify (App settings → Custom domains).
- [x] **DNS reality:** `toonranks.com` is delegated to **Cloudflare** (the Route 53 hosted zone is
      not authoritative — its NS records point to `*.ns.cloudflare.com`). Amplify's auto-DNS therefore
      did **not** apply. The record was added **manually in Cloudflare**: `CNAME uat →
      d3kra0wwhm7whn.cloudfront.net`, **Proxied** (mirroring the existing `www` record).
- [x] `https://uat.toonranks.com` resolves and serves the UAT build.

### 9. Verification — ✅ DONE (banner pending)
- [x] UAT URL loads the app.
- [x] Email/password login + reCAPTCHA works on UAT.
- [x] Google login works on UAT.
- [x] Reads/writes work against the shared prod data.
- [ ] The UAT banner (step 7) — still to add.

---

## Notes / decisions log

- **2026-06:** Decided UAT will **share the production database** for now (no separate UAT DB). A
  separate UAT DB can be introduced later if test-data pollution becomes a problem.
- Backend remains a single production instance on Railway; UAT only adds a frontend deployment.
