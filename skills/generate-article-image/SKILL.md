---
name: generate-article-image
description: >-
  Create (or source) an original, royalty-free, on-brand hero or inline image
  for a Toon Ranks article — license-clear for commercial use, never copyrighted
  manga art. Used by the write-article skill or standalone. Produces an
  optimized file under public/articles/<slug>/ and the image metadata to wire
  into src/content/articles.ts.
---

# Skill: generate-article-image

Produce **one original, royalty-free, on-brand hero image (16:9)** for a Toon
Ranks article — and optional inline images. If you can generate images, make
one. If you can't, give license-clear sourcing guidance and leave the image
unset. The result is wired into the article's `image` field.

## Hard rules (read first)

- **Original / royalty-free / owned only**, and **license-clear for commercial
  use**. Never depict copyrighted characters, real IP/franchises, brand logos,
  watermarks, or recognizable real people. **No manga/manhwa panels or official
  covers.**
- Don't prompt for a specific living artist's style by name or a named
  franchise — keep it generic and original.
- **No text baked into the image** (or only minimal/generic) — the page renders
  the title separately.

## Brand & style (Toon Ranks)

- Subject: manga/manhwa/manhua **discovery & community**. Modern, clean, friendly.
- Must read well in **both light and dark mode**, and sit nicely behind/around
  text — keep the center relatively calm with generous negative space.
- Palette: the site's accents — **indigo/blue and teal, with warm amber
  highlights**; deep near-black backgrounds work for dark mode.
- License-safe aesthetics to choose from: abstract/gradient compositions;
  clean **flat-vector** illustration with generic figures/objects (not real
  characters); flat-design motifs (books, comic panels, speech bubbles, stars/
  rankings, a phone with a vertical-scroll strip); subtle texture.
- **Match the article concept**, e.g.: "what is a webtoon" → stylized phone +
  abstract vertical-scroll strip; "how scoring works" → abstract bars/stars;
  "beginner guide" → an open path/doorway motif.

## Building the prompt (for an image generator)

Compose: `[concept tied to the article]` + `[composition: 16:9 banner, calm
center for text, generous negative space]` + `[style: e.g. "modern flat-vector
illustration" or "clean abstract gradient"]` + `[palette: indigo/teal with amber
accents, dark-friendly]` + `[constraints: "no text, no logos, no watermark, no
copyrighted characters, original artwork"]`.

Example — "What is a webtoon?":
> Modern flat-vector illustration of a stylized smartphone showing an abstract
> vertical-scroll comic strip; clean geometric shapes; indigo and teal with
> amber accents; dark background; 16:9 banner; generous negative space; no text,
> no logos, no recognizable characters; original artwork.

## Output specs

- **16:9**, ~1200px wide.
- Export optimized **`.webp`** (or `.jpg`), target **under ~150 KB**.
- Save the hero to **`public/articles/<slug>/hero.webp`** (create the folder).
  Inline images go in the same folder with descriptive filenames.
- Write **descriptive alt text** (what's shown) — not keyword stuffing.

## Wire it into the article

In `src/content/articles.ts`, set:
```ts
image: { src: "/articles/<slug>/hero.webp", alt: "<concise description>" }
```
For inline images, use Markdown in the body:
`![concise description](/articles/<slug>/<file>.webp)`

## If you cannot generate images

Provide:
1. **3 stock-search queries** for Unsplash / Pexels / Pixabay that fit the
   concept and the brand palette.
2. The **licensing rule**: only images free for commercial use; verify each
   image's license; if a source requires attribution, add it at the bottom of
   the article body.
3. Leave the article's `image` **unset** until a real file is added — never use
   a copyrighted image as a placeholder.
