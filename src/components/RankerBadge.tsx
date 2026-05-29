/**
 * Small inline badge shown next to a username in forum bylines.
 * - #1 → amber ◆  (gold)
 * - #2 → slate ◆  (silver)
 * - #3 → amber-700 ◆  (bronze)
 * - #4–10 → muted #N rank number
 * - No rank / rank > 10 → renders nothing
 */
export function RankerBadge({ rank }: { rank: number | undefined }) {
  if (!rank) return null;

  if (rank <= 3) {
    const color =
      rank === 1
        ? "text-amber-500 dark:text-amber-400"
        : rank === 2
        ? "text-slate-400 dark:text-slate-300"
        : "text-amber-700 dark:text-amber-600";

    return (
      <span
        className={`shrink-0 text-[11px] leading-none ${color}`}
        title={`#${rank} Ranker`}
        aria-label={`Rank ${rank}`}
      >
        ◆
      </span>
    );
  }

  if (rank <= 10) {
    return (
      <span
        className="shrink-0 text-[10px] font-bold leading-none text-slate-400 dark:text-slate-500"
        title={`#${rank} Ranker`}
        aria-label={`Rank ${rank}`}
      >
        #{rank}
      </span>
    );
  }

  return null;
}
