# Post templates & Reddit settings — reddit-monthly-rankings

Companion to `SKILL.md`. Everything here is copy-paste ready: fill `{MONTH}`
(e.g. "July 2026") and `{TYPE}` (e.g. "manhwa"), keep the rest verbatim unless
the skill says otherwise.

---

## Cadence decision (already made — follow it)

Generate **all four graphics** every month (manhwa, manga, manhua, all), but do
**not** make four separate posts:

- **r/ToonRanks (home):** ONE gallery post containing all four images. One
  strong monthly anchor thread beats four thin threads on a small sub — it
  reads as a recognizable monthly series, keeps the feed from looking like the
  mod talking to themselves, and puts every debate in one place.
- **Big sub (away):** ONE image post per month, rotating the type to match the
  sub. Posting more than one data post a month to big subs reads as spam and
  risks mod action.

**Rotation:** July → manhwa (r/manhwa), August → manga (r/manga), September →
manhua (r/manhua), then repeat. The ALL graphic is home-sub only (big subs are
type-specific). If the current month's rotation is unknown, count months since
July 2026 and take `["manhwa","manga","manhua"][monthsSince % 3]`.

---

## Post 1 — r/ToonRanks (home sub, gallery)

**Reddit settings:**

| Setting | Value |
|---|---|
| Community | r/ToonRanks |
| Post type | **Images & Video** — attach all 4 screenshots (manhwa, manga, manhua, all) |
| Flair | **Ranking Discussion** (blue) |
| NSFW | Off |
| Spoiler | Off |
| Brand affiliate | **On** (it's brand-made content — transparent and harmless in your own sub) |

**Title (copy):**

```
{MONTH} Community Rankings — Top 10 Manhwa, Manga, Manhua & Overall
```

**Body (copy — paste into the post body; if the gallery composer has no body
field, post it as your first comment):**

```markdown
This month's top 10s as rated by the community — story, art, characters, and world-building each scored separately.

Disagree with a placement? The fix is built in: rate the series you think belongs here and next month's list will show it.

- Rate on the site: https://www.toonranks.com
- Or grab the Android app from the Play Store (search "Toon Ranks")

Which list is most wrong, and what's the biggest snub?
```

## Post 2 — big sub (away, single image, HUMBLE framing — default)

Use while community vote counts are small (the generator prints which framing
applies). **Never use authority framing while max votes < 20.**

**Reddit settings:**

| Setting | Value |
|---|---|
| Community | rotation sub (r/manhwa / r/manga / r/manhua) |
| Post type | **Images & Video** — the matching single-type screenshot only |
| Flair | Whatever that sub uses for discussion/fanmade content — check its flair list; never leave it blank if flair is required |
| NSFW / Spoiler | Off |
| Brand affiliate | On if the sub allows promo content; if their rules are strict about brand content, skip the big-sub post this month rather than hide it |

**Title (pick ONE, copy):**

```
Our small ranking community voted these the top 10 {TYPE} — what did we get wrong?
```

```
We rate {TYPE} by story/art/characters/world-building separately. Here's {MONTH}'s top 10 — roast our list
```

**First comment (copy — post immediately after submitting):**

```markdown
This is from Toon Ranks, a small community where we rate series across four categories (story, art, characters, world-building) instead of one blanket score. Still early days so the sample is small — which is exactly why I'm posting: what's missing, and what's ranked too high?

If you want to add your own ratings and shape next month's list: https://www.toonranks.com (site + Android app), and we just opened r/ToonRanks for discussion.
```

## Post 2 alt — AUTHORITY framing (only when the generator says so)

**Title (copy):**

```
Top 10 {TYPE} of {MONTH}, ranked by community votes across story, art, characters & world-building
```

First comment: same as humble version minus the "sample is small" sentence.

---

## Rules of engagement (apply to every post)

1. **Before posting to a big sub**, open its rules page and check: self-promo
   policy, image-post policy, required flair, and any "OC day" restrictions.
   If the post would break a rule, skip that sub this month — never risk the
   account.
2. Reply to **every** comment in the first 2 hours. Concede good points
   ("fair — N is tiny for that one"). Never argue defensively.
3. Do not post to more than one big sub on the same day.
4. Crosspost good big-sub discussion back to r/ToonRanks as a comment link,
   not a new post.
5. Never upvote your own posts from other accounts or ask friends to brigade —
   vote manipulation can get the sub banned.

## Screenshot instructions

1. Open each `output/top10-<type>-<YYYY-MM>.html` in a browser at **100% zoom**.
2. Screenshot just the card (Windows: `Win+Shift+S`, drag around the rounded
   rectangle). Target ~1080×1350; small deviation is fine.
3. Save as `top10-<type>-<YYYY-MM>.png` next to the HTML so months stay
   identifiable.
