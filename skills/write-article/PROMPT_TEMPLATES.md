# Prompt Templates

Copy-paste prompts for drafting and refining Toon Ranks articles with any
generative AI. **Always** paste `AUTHORING_GUIDE.md` into the same conversation
first (or attach it), then use these. Fill in every `<…>` placeholder.

---

## 1. Article draft prompt

> You are writing an article for **Toon Ranks**, a community ranking and review
> platform for manga, manhwa, and manhua. Follow the attached `AUTHORING_GUIDE.md`
> exactly — especially the voice (§2), the anti-AI-slop quality bar (§3), and the
> structure (§5). Do not violate any banned-phrase or formatting rule.
>
> **Topic:** `<topic>`
> **Angle / unique take:** `<the specific point of view or hook — must not repeat existing articles>`
> **Format:** `<explainer | beginner guide | opinion/analysis | curated list | format/industry deep-dive | how-the-site-works>`
> **Target reader:** `<newcomer | regular reader | both>`
> **Must mention:** `<concepts/sections to include, if any>`
> **Must avoid:** `<anything off-limits — and never fabricate facts about real series>`
> **Target length:** `<700–1200>` words
> **Internal links to weave in (≥2):** `<e.g. /how-rankings-work, /compare, /type/MANHWA, /articles/<slug>>`
>
> Output:
> 1. `title` (specific, honest, < ~60 chars)
> 2. `description` (120–160 chars, compelling, accurate)
> 3. `tags` (2–4, from: Guides, Beginners, Manga, Manhwa, Manhua, Rankings, Recommendations, Community — or propose one)
> 4. `body` in Markdown — **no H1**, use `##`/`###`, short paragraphs, varied rhythm, ≥2 internal links woven in naturally.
>
> Have a real point of view. Be specific and concrete. Cut every sentence that
> doesn't earn its place. Do not state any specific fact about a real series
> unless it is widely known and safe; otherwise stay general.

---

## 2. De-slop / humanize refine prompt

Use when a draft feels generic or machine-made.

> Revise the article below so it reads like strong human writing, per
> `AUTHORING_GUIDE.md` §3. Specifically:
> - Remove every banned phrase and filler transition.
> - Vary sentence and paragraph length; break uniform rhythm.
> - Replace vague claims with specific, concrete ones (or cut them).
> - Strengthen the point of view; make sure each section delivers a real idea.
> - Cut throat-clearing intros and any summary that just restates the body.
> Keep the meaning and the internal links. Return the full revised Markdown body.
>
> `<paste draft>`

---

## 3. Title + description prompt

> Given this article body, write: (a) 3 candidate `title`s — specific, honest,
> under ~60 chars, no clickbait; and (b) a `description` of 120–160 characters
> that's compelling and accurate (used as the meta description and card blurb).
> `<paste body>`

---

## 4. Image brief prompt

For an AI image generator, or to derive a stock-search query.

> Suggest a hero image concept for an article titled "`<title>`" on a
> manga/manhwa/manhua discovery site. It must be **original/royalty-free-style**
> — no manga panels, no copyrighted characters, no recognizable IP. On-theme,
> clean, works behind text, fits a 16:9 banner. Give: (a) an AI image-gen prompt,
> and (b) 3 stock-photo search queries (Unsplash/Pexels) as a fallback. Also
> provide concise, descriptive **alt text** (no keyword stuffing).

(Reminder: optimize to ~1200px / `.webp` or `.jpg` / under ~150 KB, place in
`public/articles/<slug>/`, and only use images you own or are licensed/royalty-free.)

---

## 5. Fact-safety review prompt

> Review the article below for any specific factual claim about a real manga,
> manhwa, or manhua series, creator, date, or number. For each, flag it and say
> whether it's widely known and safe to state. Recommend cutting or generalizing
> anything uncertain. Do not add new claims.
> `<paste body>`

---

## 6. Final formatting prompt (optional)

> Convert/verify this article as a JavaScript-safe Markdown string for
> `src/content/articles.ts`: ensure there is **no H1**, headings use `##`/`###`,
> links use `/path` form, and any literal backticks are escaped. Then give me the
> complete article object (`slug`, `title`, `description`, `author`,
> `publishedAt`, `updatedAt`, `tags`, optional `image`, `body`) ready to paste
> into the `articles` array. Use today's date (`YYYY-MM-DD`) for the dates and a
> unique kebab-case `slug`.
