// Editorial articles for the /articles section.
//
// Phase 1: content lives in-repo as original Markdown. The public pages render
// from this module via getAllArticles()/getArticleBySlug(). The rendering layer
// is intentionally data-source-agnostic, so a future admin-authored CMS
// (backend Article model + endpoints) can replace this source without touching
// the article pages, routes, or SEO/structured-data wiring.

export interface Article {
  slug: string;
  title: string;
  description: string;
  author: string;
  /** ISO date strings. */
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  /**
   * Optional hero image. Use only images you own or license (or royalty-free).
   * Never copyrighted manga/manhwa art. Path is served from /public, or an
   * absolute URL. When omitted, the article renders cleanly text-only.
   */
  image?: { src: string; alt: string };
  /** Original long-form body in Markdown. */
  body: string;
}

const AUTHOR = "The Toon Ranks Team";

export const articles: Article[] = [
  {
    slug: "manga-vs-manhwa-vs-manhua",
    title: "Manga vs Manhwa vs Manhua: What's Actually Different?",
    description:
      "Manga, manhwa, and manhua look similar at a glance but come from different countries and reading traditions. Here's how to tell them apart and what each format does best.",
    author: AUTHOR,
    publishedAt: "2026-06-02",
    updatedAt: "2026-06-02",
    tags: ["Guides", "Manga", "Manhwa", "Manhua"],
    body: `If you've spent any time in comment sections or ranking lists, you've seen the three words used almost interchangeably: **manga**, **manhwa**, and **manhua**. They're related, but they aren't the same thing, and knowing the difference makes it much easier to find series you'll actually enjoy.

## The short version

All three are comics from East Asia, and the words literally translate to roughly the same thing ("comics" or "impromptu sketches"). The distinction is mostly about **country of origin**:

- **Manga** comes from **Japan**.
- **Manhwa** comes from **South Korea**.
- **Manhua** comes from **China** (and Chinese-speaking regions like Hong Kong and Taiwan).

That single fact drives almost every other difference below, because each country developed its own publishing industry, art conventions, and reading habits.

## How you read them

The most practical difference is direction. **Manga is read right-to-left.** Pages and panels flow the opposite way from Western books, which trips up a lot of newcomers. **Manhwa and manhua are generally read left-to-right**, partly because so many of them were designed for phones first.

That phone-first design is why a huge share of modern manhwa are **webtoons**: long vertical strips you scroll through one continuous column at a time, rather than flipping pages laid out in a grid. Manhua increasingly use the same vertical format.

## Color and art style

Traditional **manga is usually black and white**. That isn't a budget compromise. It's an aesthetic the medium has refined for decades, with screentones and linework doing the work color would do elsewhere. **Manhwa and manhua are frequently in full color**, again because the webtoon format and digital-first distribution made color practical and expected.

Art styles differ too, though there's huge overlap and plenty of exceptions:

- Manga spans an enormous range, from minimalist slice-of-life to dense, detailed action.
- Manhwa is often associated with clean, polished character art and dramatic, cinematic paneling, especially in popular action and fantasy series.
- Manhua frequently leans into bold color and wuxia/xianxia (martial-arts and cultivation) settings.

## Genres and storytelling

Each tradition has its signatures. Manga covers basically every genre imaginable and has the longest history, so its catalog is the deepest. Manhwa has driven a lot of the recent global boom in **regression, leveling-up, and tower-climbing** power fantasies, alongside strong romance and drama. Manhua is a go-to for **cultivation and historical fantasy**.

None of these are rules. There are slow, quiet manhwa and frenetic action manga out there. They're tendencies, not boundaries.

## So which should you read?

Whichever tells a story you like. The format label tells you something about presentation (page vs. scroll, color vs. black-and-white) and a bit about genre tendencies, but a great series is a great series. If you're browsing rankings on Toon Ranks, you can filter by type (**manga, manhwa, or manhua**) and compare titles side by side to see what fits your taste before you commit.

The takeaway: the words aren't interchangeable, but they're also not a hierarchy. They're three neighboring traditions that have been borrowing from each other for years, and readers are the ones who benefit.`,
  },
  {
    slug: "how-toon-ranks-scores-series",
    title: "How Toon Ranks Scores and Ranks Series",
    description:
      "Toon Ranks rankings aren't a single star rating. They're built from community votes across multiple categories. Here's exactly how a score is calculated and why it's harder to game.",
    author: AUTHOR,
    publishedAt: "2026-06-08",
    updatedAt: "2026-06-08",
    tags: ["Guides", "Rankings", "Community"],
    body: `Most sites boil a series down to one number: a 1-to-5 star average. It's simple, but it hides a lot. A title with gorgeous art and a weak ending gets the same blurry "4 stars" as one that's the reverse. Toon Ranks is built to keep that detail, so here's exactly how our scores work.

## Scores come from categories, not a single tap

When a member rates a series, they don't give one overall score. They rate it across several **distinct categories**: story, characters, art, world-building, and the drama or action that carries it. Each category is scored on its own.

This matters because it separates *why* people like (or don't like) a series. A community can collectively say "the art is incredible but the pacing drags," and that nuance survives into the final number instead of being averaged into mush.

## How the final score is calculated

For each category, we take the **average of every member's vote** in that category. Then the series' overall score is the **average of those category averages**.

Averaging the category averages, rather than dumping every individual vote into one pile, keeps any single category from dominating just because it happened to get more votes. Story, art, and characters each get a fair say in the final result.

## Why this is harder to game

Single-number ratings are easy to brigade: a wave of 5s or 1s swings the average fast. A category system is more resistant, because a vote has to be cast across the board, and the structure makes lopsided manipulation stand out. Combined with community moderation, it keeps rankings closer to genuine consensus.

It also rewards series that are **well-rounded**. A title that's merely "pretty" won't ride its art to the top if its story and characters lag, and a narratively brilliant series with rough art still gets credit where it's due.

## Reading a Toon Ranks score

When you see a score on a card or a series page, that number is the rolled-up community verdict across all categories. On the full series page you can see the breakdown, so you're never stuck guessing what the number actually means. Want to weigh two contenders? The **compare** tool puts titles side by side so you can see exactly where each one wins.

## The Rankers leaderboard

Scoring is only half of it. Members who contribute thoughtful ratings and participate in the community earn **Cred Points**, which feed the Rankers leaderboard. The goal is simple: the people shaping the rankings are the people who actually show up and engage, not anonymous drive-by votes.

That's the whole philosophy. A ranking should reflect a real community's considered opinion, with enough structure that the number means something. The more members rate and discuss, the sharper the rankings get.`,
  },
  {
    slug: "where-to-start-with-manhwa",
    title: "Where to Start with Manhwa: A Beginner's Guide",
    description:
      "New to manhwa and not sure where to jump in? Here's how the format works, the sub-genres worth knowing, and how to find a first series that fits your taste.",
    author: AUTHOR,
    publishedAt: "2026-06-12",
    updatedAt: "2026-06-12",
    tags: ["Guides", "Manhwa", "Beginners"],
    body: `Manhwa, comics from South Korea, has pulled in a massive global audience over the last few years, and a lot of that is thanks to the webtoon format. If you've been meaning to try it but don't know where to start, this guide will get you oriented fast.

## First, the format

Most modern manhwa are **webtoons**: you read them as a single vertical strip, scrolling down through one continuous column instead of flipping paginated spreads. They're usually in **full color** and read **left-to-right**, which makes them friendlier for first-timers than right-to-left black-and-white manga.

Practically, that means manhwa is built for phones. Short, momentum-driven chapters are the norm, which is part of why the format is so easy to binge.

## Know the big sub-genres

Manhwa covers everything, but a few categories dominate the popular charts. Knowing them helps you pick a lane:

- **Regression:** a character dies or fails, then wakes up in the past with their memories and tries to do it right this time. Heavy on strategy and payoff.
- **Leveling-up / progression:** a weak protagonist grows stronger through a clear system (stats, ranks, dungeons). Satisfying, fast-moving power fantasy.
- **Tower / dungeon climbing:** characters ascend floors or clear gates, each with new challenges and stakes.
- **Romance and drama:** from office romance to historical settings, often with sharp art and strong character writing.
- **Revenge and villainess stories:** a wronged lead methodically turns the tables.

You don't need to memorize these, but recognizing them on a ranking page tells you a lot about what you're getting into.

## How to pick your first one

A few tips that save you from bouncing off the wrong title:

1. **Start with something completed or well into its run.** You'll get a full arc instead of waiting on weekly chapters.
2. **Match the sub-genre to your mood.** Want catharsis? Try a regression or revenge story. Want comfort? Romance or slice-of-life.
3. **Use the community, not just the cover.** A striking cover doesn't guarantee a good story. Check where a series ranks and what readers actually praise.

## Let the rankings do the work

This is exactly what Toon Ranks is for. Filter the rankings to **manhwa**, sort by score, and you've got a shortlist of community-vetted starting points. Open a series page to see how it scores on story, art, and characters specifically, so you can tell the "gorgeous but shallow" titles from the ones that hold up. When two look tempting, drop them into **compare** and decide.

Start with one well-ranked series in a sub-genre that matches your mood, and you'll understand the appeal within a few chapters. From there, the rabbit hole is deep, in the best way.`,
  },
  {
    slug: "completed-series-worth-binging",
    title: "Completed Series Worth Binging in One Sitting",
    description:
      "No cliffhangers, no waiting on weekly chapters, just finished stories you can read start to end. Here's how to find the best completed manga, manhwa, and manhua.",
    author: AUTHOR,
    publishedAt: "2026-06-15",
    updatedAt: "2026-06-15",
    tags: ["Recommendations", "Completed", "Binge"],
    body: `There's a particular joy in a **finished** series. No theorizing about an ending that may never come, no waiting a week between chapters, just a complete story you can read at your own pace from start to finish. If that's the itch you're scratching, here's how to find the best completed titles and what to look for.

## Why "completed" is its own filter

A great ongoing series can still disappoint if it fizzles or goes on hiatus. A **completed** one has already crossed the finish line: the pacing, the payoff, and the ending are all known quantities that the community has rated *as a whole*. That makes finished series some of the safest, most satisfying recommendations you can get.

On Toon Ranks you can filter the rankings by **status**, so you can pull up titles marked complete and sort them by community score, giving you an instant shortlist of stories you can start and actually finish.

## What makes a series binge-worthy

Not every finished story is a great binge. The ones that are tend to share a few traits:

- **A strong, consistent core.** Look at how a series scores on *story* and *characters* specifically, not just the overall number. A binge lives or dies on momentum.
- **An ending people praise.** The fastest way to ruin a weekend read is a rushed or hollow finale. Community discussion is your early warning system here.
- **A length that matches your time.** Some completed series are tight and punchy; others are epics. Check the scope before you commit a Saturday to it.

## How to build your own binge list

Here's a simple workflow:

1. Filter rankings to **completed** status (and a type, like manga, manhwa, or manhua, if you have a preference).
2. Sort by score and open the top few series pages.
3. Read the **category breakdown** to confirm the story and characters land, not just the art.
4. **Compare** your finalists side by side, then save the winner to a reading list so you don't lose it.

## The payoff

A finished, highly-rated series is the closest thing to a guaranteed good time in this hobby. You skip the gamble of an unfinished story and go straight to the part where you get swept up in something that already knows how to end.

Pull up the completed rankings, trust the category scores, and pick the one that matches your mood, then clear your schedule.`,
  },
  {
    slug: "what-is-a-webtoon",
    title: "What Is a Webtoon? The Vertical-Scroll Format, Explained",
    description:
      "Webtoons reinvented comics for the phone: one long vertical scroll, full color, episodic releases. Here's what defines the format and why it spread.",
    author: AUTHOR,
    publishedAt: "2026-06-16",
    updatedAt: "2026-06-16",
    tags: ["Guides", "Webtoons", "Manhwa"],
    image: {
      src: "/articles/what-is-a-webtoon/hero.svg",
      alt: "A stylized phone showing a vertical-scroll comic strip",
    },
    body: `"Webtoon" gets used two ways, and the overlap trips people up. Sometimes it means *any* digital comic; more usefully, it means a specific **format**: a comic built as one long vertical strip you scroll through on a phone, usually in full color and released an episode at a time. That second meaning is the one worth understanding, because it changed how millions of people read comics.

## The defining trait: you scroll, you don't flip

A traditional comic or manga page is a grid of panels you read in a set order, then turn the page. A webtoon drops the page entirely. Panels are stacked in a single column, the **infinite canvas**, and you move through the story with one continuous downward scroll.

That sounds like a small change. It isn't. Creators use the empty vertical space between panels as a tool: a long gap before a reveal becomes a beat of silence; a sudden drop can land a punchline or a shock. Pacing stops being about page turns and starts being about how far your thumb travels. The format has its own grammar.

## Full color, phone-first

Two things usually travel with the format. Webtoons are typically **full color**, and they're built for **phone screens first**: narrow, tall, readable one-handed on a commute. Traditional manga, by contrast, is usually black and white and composed for a printed page. None of this is a hard rule, but that combination of vertical scroll, color, and mobile-native design is what people picture when they say "webtoon."

If the format-versus-origin distinction feels fuzzy, you're not alone; we untangle it in [manga vs manhwa vs manhua](/articles/manga-vs-manhwa-vs-manhua). The short version: "webtoon" describes *how* a comic is built and read, while manhwa, manga, and manhua describe *where it's from*. Plenty of popular manhwa are webtoons, but the words aren't synonyms.

## Where it came from

The format grew out of **South Korea in the early 2000s**, when web portals began hosting comics made for the browser instead of for print. Freed from fixed page dimensions, creators leaned into the long vertical scroll, and the style spread from there: first across Korea, then worldwide as smartphones made it the obvious way to read on the move. Today dedicated apps and sites publish webtoons in many languages.

## Released episode by episode

Webtoons are **episodic**. Instead of volumes, you get episodes, often weekly, grouped into seasons, sometimes with breaks between arcs. That cadence shapes the experience: cliffhangers are tuned for the weekly wait, and a series can run for years. It also means "is it finished?" is a live question. Some webtoons are complete, many are ongoing, and a few stall out.

## Why it took over

The honest answer is **friction**, or the lack of it. A webtoon asks almost nothing of a newcomer: no right-to-left adjustment, no decoding panel order, no setup, just open and scroll. Color makes the art instantly approachable, and bite-size episodes slot into the gaps in a day. For people who already live on their phones, it's the shortest path to a story, and that ease is most of why the format exploded.

It isn't simply "better" than paged comics. A dense, masterfully composed manga page does things a vertical scroll can't. It's a different toolset, tuned for a different screen.

## How to find good ones

Format tells you how a series reads; it says nothing about whether it's any good. That part is on the community. Browse the [manhwa rankings](/type/MANHWA), where most webtoons live, sort by score, and open a few series pages to see how each rates on story, art, and characters, so you can skip the gorgeous-but-hollow ones. Torn between two? Put them in [Compare](/compare). And if you're brand new to the medium, start with our [beginner's guide to manhwa](/articles/where-to-start-with-manhwa).

Read a couple and the format stops being a novelty. You're just reading, which is the whole point.`,
  },
];

const WORDS_PER_MINUTE = 200;

export function readingTimeMinutes(article: Article): number {
  const words = article.body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function getAllArticles(): Article[] {
  // Newest first.
  return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
