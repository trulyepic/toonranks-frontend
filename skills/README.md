# Skills

Repo skills are **self-contained task playbooks** any AI (or a human) can find
and follow. They don't depend on a specific tool's private skill mechanism —
they're just discoverable Markdown.

## How to use a skill

When asked to "use the **X** skill," open **`skills/X/SKILL.md`** and follow it
exactly. A skill may reference companion files in its own folder and may
reference other skills by path — follow those too as needed.

## Available skills

| Skill | What it does | Entry point |
|---|---|---|
| **write-article** | Write & publish a high-quality, original article for the Toon Ranks `/articles` section (manga/manhwa/manhua). Enforces the house style, adds it to the code, verifies the build. | [`skills/write-article/SKILL.md`](./write-article/SKILL.md) |
| **generate-article-image** | Create (or source) an original, royalty-free, on-brand hero/inline image for an article, license-clear for commercial use. Used by `write-article` or standalone. | [`skills/generate-article-image/SKILL.md`](./generate-article-image/SKILL.md) |

## Convention

- Each skill is a folder under `skills/` with a **`SKILL.md`** entry point.
- A skill may include companion docs in its folder (guides, templates, logs).
- A skill is **comprehensive**: an AI that finds it should be able to complete
  the task from the SKILL.md plus the files it references — no outside context
  required beyond the repo.
