import { describe, expect, it } from "vitest";
import { applySearchFilters } from "./searchFilter";
import type { RankedSeries } from "../api/manApi";

const make = (p: Partial<RankedSeries> & { id: number }): RankedSeries => ({
  title: `S${p.id}`,
  genre: "",
  type: "MANHWA",
  cover_url: "",
  vote_count: 0,
  final_score: 0,
  rank: null,
  ...p,
});

const data: RankedSeries[] = [
  make({ id: 1, title: "Beta", genre: "Action, Fantasy", status: "ONGOING", vote_count: 10, final_score: 8.1 }),
  make({ id: 2, title: "Alpha", genre: "Romance", status: "COMPLETE", vote_count: 50, final_score: 7.2 }),
  make({ id: 3, title: "Gamma", genre: "Action, Drama", status: "ONGOING", vote_count: 30, final_score: 9.0 }),
];

describe("applySearchFilters", () => {
  it("returns all items (score desc) with no filters", () => {
    const out = applySearchFilters(data, {});
    expect(out.map((s) => s.id)).toEqual([3, 1, 2]);
  });

  it("filters by genre (case-insensitive, comma lists)", () => {
    const out = applySearchFilters(data, { genre: "action" });
    expect(out.map((s) => s.id).sort()).toEqual([1, 3]);
  });

  it("filters by status", () => {
    const out = applySearchFilters(data, { status: "COMPLETE" });
    expect(out.map((s) => s.id)).toEqual([2]);
  });

  it("combines genre + status", () => {
    const out = applySearchFilters(data, { genre: "Action", status: "ONGOING" });
    expect(out.map((s) => s.id).sort()).toEqual([1, 3]);
  });

  it("sorts by votes desc", () => {
    expect(applySearchFilters(data, { sort: "votes" }).map((s) => s.id)).toEqual([2, 3, 1]);
  });

  it("sorts by title A–Z", () => {
    expect(applySearchFilters(data, { sort: "title" }).map((s) => s.title)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
  });

  it("sorts newest by id desc (no date field)", () => {
    expect(applySearchFilters(data, { sort: "newest" }).map((s) => s.id)).toEqual([3, 2, 1]);
  });

  it("does not mutate the input array", () => {
    const input = data.slice();
    const order = input.map((s) => s.id);
    applySearchFilters(input, { sort: "title" });
    expect(input.map((s) => s.id)).toEqual(order);
  });

  it("returns empty when nothing matches", () => {
    expect(applySearchFilters(data, { genre: "Horror" })).toEqual([]);
  });
});
