---
name: write-article
description: >-
  Write and publish a high-quality, original article for the Toon Ranks
  /articles section (manga, manhwa, manhua). Use when asked to draft, add, or
  publish a Toon Ranks article / blog post / editorial piece. Enforces the
  house style in AUTHORING_GUIDE.md, generates or sources an image via the
  generate-article-image skill, adds the article to src/content/articles.ts,
  logs it in TOPICS.md, and verifies the build.
---

# Skill: write-article

You are authoring an article for the Toon Ranks `/articles` section. This skill
is comprehensive — everything you need is in this folder plus the files it
points to. Follow it end to end.

## Companion files (read these)

- **`AUTHORING_GUIDE.md`** (same folder) — the authoritative standard: voice,
  the anti-AI-slop quality bar, originality rules, structure, SEO/AdSense
  requirements, facts/safety, internal linking, the `Article` data shape, and
  the publish checklist. **Read it in full before writing.**
- **`PROMPT_TEMPLATES.md`** (same folder) — draft, de-slop/humanize, title,
  image-brief, and fact-safety prompts.
- **`TOPICS.md`** (same folder) — published log + backlog. Check it to avoid
  repeating a topic or angle; update it after publishing.
- **`skills/generate-article-image/SKILL.md`** — how to create or source an
  original, royalty-free, on-brand image. Use it for the image step.

## Procedure

1. **Read `AUTHORING_GUIDE.md`** and hold yourself to it. The quality bar (§3),
   originality (§4), facts/safety (§7), and the checklist (§12) are not optional.
2. **Pick / confirm the topic** against `TOPICS.md`. Do not repeat a published
   topic or a close angle. If the user gave one, confirm no overlap; otherwise
   propose distinct backlog options and let them choose. Vary the format across
   the catalog.
3. **Draft** to the standard — real point of view, specific and concrete,
   banned phrases avoided, varied rhythm. Body is Markdown, **no H1**, `##`/`###`
   headings, short paragraphs, and ≥2 natural internal links (`/`,
   `/series/:id`, `/how-rankings-work`, `/compare`, `/type/MANGA|MANHWA|MANHUA`,
   other `/articles/<slug>`).
4. **Self-review** against §3 (cut anything generic/padded; run the de-slop
   prompt if needed) and §7 (remove or generalize any unverified claim about a
   real series — never fabricate).
5. **Image** — follow `skills/generate-article-image/SKILL.md`. If you can
   generate images, produce an original, royalty-free, on-brand 16:9 hero,
   optimize it, save it to `public/articles/<slug>/hero.webp`, and set the
   article's `image` field. If you cannot, leave `image` unset and note the
   stock-search guidance from that skill. **Never** use copyrighted manga art.
6. **Add to code** — append a complete object to the `articles` array in
   `src/content/articles.ts` per the §10 shape (unique kebab-case `slug`,
   `YYYY-MM-DD` dates, sensible tags). Escape literal backticks in the body.
7. **Log it** — move the topic to the "Published" table in `TOPICS.md` with the
   slug and a one-line angle note.
8. **Verify** — run `npm run build` and confirm it passes. If a preview/dev
   server is available, open `/articles/<slug>` and check it renders, links
   work, and any image loads.
9. **Run the publish checklist** (`AUTHORING_GUIDE.md` §12). Every item must
   pass.

## Non-negotiables

- Original wording and an original angle. Never copy; never reuse a published angle.
- Never invent facts about real series, creators, dates, or numbers.
- Images: original / royalty-free / owned only. Never copyrighted manga art.
- Respect the repo workflow: don't commit/push unless told; end with
  preview/test steps + a one-line commit message + a short PR description.

## Handoff

Summarize: new slug + title, files changed (`src/content/articles.ts`,
`skills/write-article/TOPICS.md`, any image under `public/articles/<slug>/`),
build result, preview steps, a one-line commit message, and a short PR
description.
