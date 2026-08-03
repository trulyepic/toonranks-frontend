import type { RankedSeries, SeriesStatus } from "../api/manApi";
import type { SortValue } from "../components/RankingsToolbar";

export type SearchFilterOpts = {
  genre?: string | null;
  status?: SeriesStatus;
  sort?: SortValue;
};

/**
 * Apply the rankings toolbar's genre/status filters and sort to a set of search
 * matches, client-side. The search endpoint only accepts the query (+ optional
 * type), so the toolbar can't filter server-side during a text search — this
 * makes those controls work on the returned results instead.
 *
 * Item ranks are left untouched; only which items appear and their order change,
 * mirroring how the rankings grid behaves. Returns a new array (input untouched).
 */
export function applySearchFilters(
  results: RankedSeries[],
  { genre, status, sort = "score" }: SearchFilterOpts
): RankedSeries[] {
  const wantGenre = genre?.toLowerCase() ?? null;

  const filtered = results.filter((s) => {
    if (wantGenre) {
      const has = String(s.genre ?? "")
        .split(",")
        .some((g) => g.trim().toLowerCase() === wantGenre);
      if (!has) return false;
    }
    if (status && (s.status ?? "").toUpperCase() !== status) {
      return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    switch (sort) {
      case "votes":
        return (b.vote_count ?? 0) - (a.vote_count ?? 0);
      // RankedSeries has no date field; a higher id ≈ more recently added.
      case "newest":
        return b.id - a.id;
      case "title":
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      case "score":
      default:
        return (b.final_score ?? 0) - (a.final_score ?? 0);
    }
  });
}
