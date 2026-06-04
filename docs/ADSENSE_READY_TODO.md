# AdSense Readiness — TODO

Goal: get toonranks.com approved for Google AdSense.

---

## Tasks

### 1. Cookie consent banner — ✅ DONE
- [x] Built `CookieBanner` component (`src/components/CookieBanner.tsx`)
- [x] Two actions: **Accept** (all cookies) and **Manage** (opens preferences modal)
- [x] Preferences modal: toggles for Analytics and Advertising (Necessary always on)
- [x] Persists choice to `localStorage` under key `cookie-consent`
- [x] Banner does not re-appear after a choice is made
- [x] Mounted in `App.tsx` — appears on every page
- [x] Google Consent Mode v2 defaults wired in `index.html` (default denied, updated on user choice)

### 2. Update Privacy Policy — ✅ DONE
- [x] Added **Cookies** section — lists Necessary / Analytics / Advertising with descriptions
- [x] Added **Advertising** section — discloses AdSense, links to Google Ad Settings and Google ad policies
- [x] Updated last-updated date to June 4, 2026

### 3. Fix sitemap — ✅ DONE
- [x] Static `public/sitemap.xml` was stale (no series pages) — deleted
- [x] `robots.txt` updated to point to `https://api.toonranks.com/sitemap.xml` (backend dynamic, includes all series)
- [x] Removed `public/sitemap.xml` from `amplify.yml` artifacts list

---

## All tasks complete — ready to apply for AdSense
