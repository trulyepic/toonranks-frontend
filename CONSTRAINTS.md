# AI Assistant Constraints — Toon Ranks Frontend

These rules apply to every AI assistant working in this repository without exception.
They are repeated in `CLAUDE.md`, `AGENTS.md`, and `.cursorrules` — if you are reading
any of those files, these constraints still apply.

---

## Workflow — how work gets shipped

```
AI creates feature branch
        │
        ▼
AI does the work on that branch
        │
        ▼
AI hands off:
  1. UI / emulator test steps (what to click, what to expect)
  2. Short commit message
  3. Short GitHub PR description
        │
        ▼
Owner reviews — ONLY commits and pushes when explicitly told to
        │
        ▼
Owner creates PR → uat
        │
        ▼
Auto-deploys to uat.toonranks.com — owner tests
        │
        ▼
PR uat → main
        │
        ▼
GitHub Actions → "Deploy to Production" (manual trigger, type "deploy")
        │
        ▼
Back-merge main → uat to keep branches even
```

---

## Hard constraints

### 1. Never commit or push without explicit instruction
Do not run `git commit`, `git push`, `git merge`, or open a PR unless the owner
explicitly says "commit", "push", or "commit and push". Completing a task does
**not** imply permission to commit. Always wait to be asked.

### 2. Always provide a handoff at the end of every task
When you finish work on a branch, always end your response with:

**UI test steps** — numbered steps the owner can follow to verify the change
works in the browser. Include:
- Where to navigate
- What to interact with
- What the expected outcome is

Example:
```
1. Go to https://uat.toonranks.com
2. Click the cookie banner "Accept" button
3. Expected: banner disappears and does not reappear on refresh
4. Click "Manage" instead — expected: preferences modal opens
```

**Commit message** — one line, imperative, under 72 characters:
```
feat: add cookie consent banner with localStorage persistence
```

**GitHub PR description** — short summary + test plan checklist:
```
## Summary
- Adds cookie consent banner (accept / manage preferences)
- Persists choice to localStorage — does not re-show after accept
- Updates Privacy Policy to mention ad cookies

## Test plan
- [ ] Banner appears on first visit
- [ ] Accept hides banner permanently
- [ ] Manage opens preferences modal
- [ ] Privacy Policy mentions advertising cookies
```

### 3. One branch per task
Never mix unrelated changes on the same branch. If you notice something else
that needs fixing while working, flag it as a follow-up, do not fix it inline.

### 4. Never work directly on `main` or `uat`
All work goes on a feature branch named `frontend-<short-desc>`. The owner
merges to `uat` via a PR after reviewing.

### 5. Ask before assuming on anything ambiguous
If a requirement is unclear, ask one focused question before writing code.
Do not make assumptions and build the wrong thing.

---

## Branch naming

`frontend-<short-desc>`

Examples: `frontend-cookie-consent`, `frontend-fix-dark-flash`, `frontend-adsense-ready`
