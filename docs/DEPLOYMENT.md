# Deployment (Frontend)

How the Toon Ranks frontend ships to **UAT** and **production**. Hosting is AWS
Amplify (one app, branch-per-environment), with DNS/proxy via Cloudflare.

## Environments

| Environment | Git branch | URL                    | Deploys how                                  |
| ----------- | ---------- | ---------------------- | -------------------------------------------- |
| UAT         | `uat`      | https://uat.toonranks.com | **Auto** — every push/merge to `uat`        |
| Production  | `main`     | https://toonranks.com     | **Manual** — the "Deploy to Production" GitHub Action |

Both point at the **same production backend and database** (Railway). UAT is for
testing frontend changes only — it is **not** a separate data environment, so
writes during UAT testing hit real prod data. Use test accounts and avoid
destructive actions. (See `UAT_ENVIRONMENT_SETUP.md` for how UAT was set up.)

## Release flow

```
feature ──PR──► uat ──(auto build)──► uat.toonranks.com        (test here)
                 │
                 └──PR / merge──► main ──(manual: Deploy to Production)──► toonranks.com
```

Changes flow **one direction: `uat → main`**. `main` deliberately lags `uat`
until you promote.

### Step by step

1. **Develop:** open a PR against **`uat`** (CI runs: lint, unit tests, browser
   smoke tests, build). Merge it.
2. **Test on UAT:** the merge auto-deploys to https://uat.toonranks.com. Verify
   your change there.
3. **Promote:** when satisfied, **merge `uat` → `main`** (open a PR `uat → main`;
   that PR's diff is your "what's going to prod" review). Merging to `main` does
   **not** deploy anything — `main` auto-build is intentionally disabled.
4. **Release:** GitHub → **Actions → Deploy to Production → Run workflow**.
   - **"Use workflow from" must be `main`** (see gotchas below).
   - Type **`deploy`** in the confirm box → **Run**.
   - The workflow assumes the AWS role, runs an Amplify `RELEASE` build of the
     `main` branch, and polls until it succeeds or fails.

## How it's wired

- **Auto-build is OFF on the Amplify `main` branch**, so merges to `main` never
  ship prod by themselves. `uat` auto-build stays ON.
- **`.github/workflows/deploy-production.yml`** — manual (`workflow_dispatch`)
  production release. Assumes the AWS OIDC role (`vars.AWS_ROLE_TO_ASSUME`) and
  calls `aws amplify start-job --branch-name main --job-type RELEASE`, then waits
  for the job to finish. There is intentionally **no `environment:`** on the job
  (see gotchas).
- **`.github/workflows/frontend-ci.yml`** — runs on PRs/pushes to `main` and
  `uat`. Its "Amplify deployment" wait job only runs on **push to `uat`** (the
  auto-deploy branch) and watches the `uat` Amplify build. It does not wait on
  `main` (which no longer auto-deploys).

## Gotchas (things that have bitten us)

- **Run "Deploy to Production" from `main` only.** The role's trust policy allows
  the subject `repo:trulyepic/toonranks-frontend:ref:refs/heads/main`. A
  `workflow_dispatch` run from `main` produces exactly that subject. Running it
  from another branch (or adding `environment:` to the job, which rewrites the
  subject to `…:environment:<name>`) causes `sts:AssumeRoleWithWebIdentity` →
  **Not authorized**.
- **The deploy action deploys whatever is on `main` *now*.** It does not merge
  `uat` into `main`. Promote first (step 3), then deploy.
- **IAM permission:** the role needs `amplify:StartJob` (plus `GetJob` /
  `ListJobs` for polling). Already granted on
  `GitHubActionsAmplifyDeployReadOnly-ToonRanks`.
- **Cloudflare cache:** after a prod deploy, if a stale build is served, purge the
  Cloudflare cache (the classic "blank screen after deploy" symptom).

## Hotfixes

For an urgent fix straight to prod: branch from `main`, PR into `main`, run
**Deploy to Production**. Then **back-merge `main` → `uat`** so the two branches
stay aligned.

## Backend note

The backend (FastAPI) deploys separately on **Railway** via its GitHub
integration (auto-deploys on merge to the backend repo's `main`). It is shared by
both UAT and production frontends. CORS for the UAT origin is controlled by the
`EXTRA_CORS_ORIGINS` env var on the Railway service.
