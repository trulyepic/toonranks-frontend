import { describe, expect, it } from "vitest";
import { filterItemsByType } from "./readingListFilters";

const items = [
  { series_id: 1 },
  { series_id: 2 },
  { series_id: 3 },
  { series_id: 4 },
];

const summaries: Record<number, { type?: string }> = {
  1: { type: "MANGA" },
  2: { type: "MANHWA" },
  3: { type: "MANHUA" },
  // 4 intentionally missing: summary not loaded yet
};

describe("filterItemsByType", () => {
  it("returns every item when the filter is ALL", () => {
    expect(filterItemsByType(items, summaries, "ALL")).toEqual(items);
  });

  it("keeps only titles of the selected type", () => {
    expect(filterItemsByType(items, summaries, "MANGA")).toEqual([
      { series_id: 1 },
    ]);
    expect(filterItemsByType(items, summaries, "MANHWA")).toEqual([
      { series_id: 2 },
    ]);
    expect(filterItemsByType(items, summaries, "MANHUA")).toEqual([
      { series_id: 3 },
    ]);
  });

  it("matches type case-insensitively", () => {
    expect(
      filterItemsByType([{ series_id: 9 }], { 9: { type: "manhwa" } }, "MANHWA")
    ).toEqual([{ series_id: 9 }]);
  });

  it("excludes items whose summary has not loaded", () => {
    expect(filterItemsByType(items, summaries, "MANGA")).not.toContainEqual({
      series_id: 4,
    });
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterItemsByType([{ series_id: 1 }], summaries, "MANHUA")).toEqual(
      []
    );
  });

  it("preserves the incoming (sorted) order", () => {
    const manhwaOnly = { 1: { type: "MANHWA" }, 2: { type: "MANHWA" } };
    expect(
      filterItemsByType(
        [{ series_id: 2 }, { series_id: 1 }],
        manhwaOnly,
        "MANHWA"
      )
    ).toEqual([{ series_id: 2 }, { series_id: 1 }]);
  });
});
