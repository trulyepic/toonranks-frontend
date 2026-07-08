import type { SeriesType } from "../api/manApi";

export type TypeFilter = "ALL" | SeriesType;

export const typeFilterOptions: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "MANGA", label: "Manga" },
  { value: "MANHWA", label: "Manhwa" },
  { value: "MANHUA", label: "Manhua" },
];

/**
 * Keep only items whose series type matches the filter. "ALL" passes everything
 * through. Items whose summary hasn't loaded yet (no known type) are excluded,
 * so callers should wait until every type is resolved before trusting counts.
 */
export function filterItemsByType<T extends { series_id: number }>(
  items: T[],
  summaries: Record<number, { type?: string }>,
  typeFilter: TypeFilter
): T[] {
  if (typeFilter === "ALL") return items;
  return items.filter(
    (it) => summaries[it.series_id]?.type?.toUpperCase() === typeFilter
  );
}
