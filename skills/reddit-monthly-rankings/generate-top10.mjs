// Generates shareable "Top 10 by community rating" graphics (HTML you
// screenshot) from live Toon Ranks data, for the monthly Reddit ranking posts.
// Part of the `reddit-monthly-rankings` skill — see SKILL.md in this folder.
//
// Usage (run from this folder, plain Node ≥18, no dependencies):
//   node generate-top10.mjs           → all four: MANHWA, MANGA, MANHUA, ALL
//   node generate-top10.mjs MANHWA    → just one type (MANGA / MANHUA / ALL)
//
// Output: ./output/top10-<type>-<YYYY-MM>.html  (dated so months never mix).
// Open each file in a browser at 100% zoom and screenshot the 1080×1350 card.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.toonranks.com/series/rankings";
const TYPES = ["MANHWA", "MANGA", "MANHUA", "ALL"];

const requested = process.argv[2]?.toUpperCase();
if (requested && !TYPES.includes(requested)) {
  console.error(`Unknown type "${requested}". Use one of: ${TYPES.join(", ")}`);
  process.exit(1);
}
const runTypes = requested ? [requested] : TYPES;

const now = new Date();
const MONTH_LABEL = now.toLocaleString("en", { month: "long", year: "numeric" });
const MONTH_STAMP = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const outDir = join(dirname(fileURLToPath(import.meta.url)), "output");
mkdirSync(outDir, { recursive: true });

function scoreColor(score) {
  if (score >= 8) return "#0ea76a";
  if (score >= 7.5) return "#a78bfa";
  if (score >= 5) return "#e8a23a";
  return "#eb6a5a";
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

function buildHtml(type, items) {
  const label = type === "ALL" ? "MANGA · MANHWA · MANHUA" : type;
  const rows = items
    .slice(0, 10)
    .map((item, i) => {
      const score = Number(item.final_score || 0);
      const genres = String(item.genre || "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" · ");
      return `
      <div class="row">
        <div class="rank">${i + 1}</div>
        <img class="cover" src="${esc(item.cover_url)}" alt="" />
        <div class="meta">
          <div class="title">${esc(item.title)}</div>
          <div class="genre">${esc(genres)}</div>
        </div>
        <div class="score" style="color:${scoreColor(score)}">${score.toFixed(1)}</div>
      </div>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Toon Ranks — Top 10 ${esc(label)} — ${esc(MONTH_LABEL)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #26243a; display: flex; justify-content: center; padding: 24px;
         font-family: "Segoe UI", -apple-system, Roboto, sans-serif; }
  .card { width: 1080px; height: 1350px; background: #0f0e14; color: #f4f2ff;
          border-radius: 28px; padding: 56px 64px; display: flex; flex-direction: column;
          background-image: radial-gradient(circle at top right, rgba(167,139,250,0.14), transparent 40%); }
  .eyebrow { font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #a78bfa;
             text-transform: uppercase; }
  h1 { font-size: 64px; font-weight: 800; margin-top: 8px; letter-spacing: -1px; }
  .sub { margin-top: 10px; font-size: 24px; color: #a8a4c4; }
  .list { margin-top: 40px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
  .row { display: flex; align-items: center; gap: 22px; background: #1a1828;
         border: 1px solid #2e2b45; border-radius: 18px; padding: 10px 24px 10px 16px;
         flex: 1; min-height: 0; }
  .rank { width: 56px; font-size: 34px; font-weight: 800; color: #6e6a8a; text-align: center; }
  .row:nth-child(1) .rank { color: #f5c344; }
  .row:nth-child(2) .rank { color: #c9ccd6; }
  .row:nth-child(3) .rank { color: #d0885a; }
  .cover { width: 58px; height: 76px; object-fit: cover; border-radius: 10px;
           border: 1px solid #2e2b45; background: #221f35; }
  .meta { flex: 1; min-width: 0; }
  .title { font-size: 28px; font-weight: 700; white-space: nowrap; overflow: hidden;
           text-overflow: ellipsis; }
  .genre { font-size: 19px; color: #a8a4c4; margin-top: 4px; white-space: nowrap;
           overflow: hidden; text-overflow: ellipsis; }
  .score { font-size: 34px; font-weight: 800; min-width: 84px; text-align: right; }
  .footer { margin-top: 36px; display: flex; justify-content: space-between;
            align-items: center; color: #a8a4c4; font-size: 22px; }
  .brand { font-weight: 800; color: #f4f2ff; font-size: 26px; }
  .brand span { color: #a78bfa; }
</style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">Community rated · ${esc(MONTH_LABEL)}</div>
    <h1>Top 10 ${esc(label)}</h1>
    <div class="sub">As voted by readers on Toon Ranks — story, art, characters, and world-building.</div>
    <div class="list">
${rows}
    </div>
    <div class="footer">
      <div class="brand">toon<span>ranks</span>.com</div>
      <div>Rate your favorites and shape next month's list</div>
    </div>
  </div>
</body>
</html>`;
}

let maxVotes = 0;
for (const type of runTypes) {
  const typeParam = type === "ALL" ? "" : `&type=${type}`;
  const url = `${API}?page=1&page_size=10&sort=score${typeParam}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[${type}] API request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const items = await res.json();
  if (!Array.isArray(items) || items.length === 0) {
    console.error(`[${type}] No ranking data returned — skipping.`);
    continue;
  }
  maxVotes = Math.max(maxVotes, ...items.map((i) => Number(i.vote_count) || 0));

  const outfile = `top10-${type.toLowerCase()}-${MONTH_STAMP}.html`;
  writeFileSync(join(outDir, outfile), buildHtml(type, items));
  console.log(`Wrote output/${outfile} (${items.length} items)`);
}

console.log(`\nMonth: ${MONTH_LABEL} (${MONTH_STAMP})`);
console.log(`Highest vote count seen: ${maxVotes}`);
console.log(
  maxVotes < 20
    ? "→ Use HUMBLE framing (community is small; see POST_TEMPLATES.md)."
    : "→ Vote counts support AUTHORITY framing (see POST_TEMPLATES.md).",
);
