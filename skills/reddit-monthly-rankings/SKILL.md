---
name: reddit-monthly-rankings
description: >-
  Produce the monthly Reddit ranking-post kit for r/ToonRanks and one big sub:
  generate dated Top-10 graphics (manhwa, manga, manhua, all) from live Toon
  Ranks data, and write a copy-paste post kit (titles, bodies, flair and tag
  settings, posting checklist) so the owner only has to screenshot and post.
  Use when asked to prepare the monthly Reddit rankings post, the "top 10"
  Reddit graphics, or to run the reddit-monthly-rankings skill.
---

# Skill: reddit-monthly-rankings

You are producing the complete monthly Reddit posting kit for Toon Ranks. This
skill is comprehensive — run it end to end **without asking the user
anything**. The user's only remaining work is screenshotting the graphics and
pasting the kit into Reddit.

## Companion files (read these)

- **`generate-top10.mjs`** (same folder) — fetches the live top 10 per type
  from the public API and writes styled, dated HTML graphics to `output/`.
- **`POST_TEMPLATES.md`** (same folder) — the copy-paste titles/bodies, the
  Reddit settings (flair, tags), the home/away cadence decision, the big-sub
  rotation, and the rules of engagement. **The cadence and framing decisions
  in it are already made — apply them, don't relitigate them.**

## Procedure

1. **Generate all four graphics.** From this folder run:

   ```
   node generate-top10.mjs
   ```

   It writes `output/top10-{manhwa,manga,manhua,all}-<YYYY-MM>.html` (the date
   stamp keeps months identifiable) and prints the **max vote count**, which
   decides HUMBLE vs AUTHORITY framing per `POST_TEMPLATES.md`. Node ≥18, no
   dependencies. If the API fails, stop and report — never fabricate ranking
   data.

2. **Verify the graphics render.** If you have a browser/preview tool, open at
   least one HTML file and confirm: 10 rows, cover images loading, no
   overflowing titles, the month label correct. If any cover 404s the row shows
   an empty frame — note it in the handoff so the user knows before
   screenshotting. If you cannot render HTML, say so in the handoff and ask the
   user to eyeball the files before screenshotting.

3. **Determine this month's rotation sub** per the rotation rule in
   `POST_TEMPLATES.md` (July 2026 = manhwa → r/manhwa, then manga → r/manga,
   then manhua → r/manhua, repeating).

4. **Write the post kit** to `output/<YYYY-MM>-post-kit.md`. It must contain,
   in order, with all copy-paste text in fenced markdown blocks:

   - **Post 1 (r/ToonRanks):** the settings table (post type: gallery with all
     4 images; flair **Ranking Discussion**; NSFW off; Spoiler off; Brand
     affiliate on), the filled-in title, and the filled-in body — from
     `POST_TEMPLATES.md` with `{MONTH}` / `{TYPE}` substituted.
   - **Post 2 (rotation big sub):** the settings table, the filled-in title
     (correct framing per step 1's vote-count output), and the filled-in first
     comment.
   - **Screenshot instructions** (copy the section from `POST_TEMPLATES.md`).
   - **Posting checklist:** check the big sub's self-promo/flair rules first;
     post r/ToonRanks post; post big-sub post (not the same day as any other
     big-sub post); reply to every comment in the first 2 hours; skip the
     big-sub post entirely this month if its rules forbid it.

5. **Hand off.** End your response with: the list of generated files (dated
   names), which framing applied and why (the vote-count number), this month's
   rotation sub, and the numbered manual steps left for the user (screenshot →
   post 1 → post 2 → engage). Do not post to Reddit yourself and do not commit
   anything to git — this skill produces artifacts only.

## Notes

- `output/` is disposable, git-ignored monthly artifacts. Never delete prior
  months' kits without being asked.
- The graphics intentionally omit per-series vote counts while the community is
  small; transparency about sample size lives in the post copy instead. Do not
  add vote counts to the graphic without being asked.
- If the user asks for a single type only, pass it as an argument
  (`node generate-top10.mjs MANGA`) and produce a kit for just that post.
