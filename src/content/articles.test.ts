import { describe, expect, it } from "vitest";
import { getRelatedArticles, getAllArticles } from "./articles";

describe("getRelatedArticles", () => {
  it("returns at most `limit` articles", () => {
    expect(getRelatedArticles("MANHWA", 3).length).toBeLessThanOrEqual(3);
    expect(getRelatedArticles("MANGA", 1)).toHaveLength(1);
  });

  it("prefers articles tagged for the series type", () => {
    const manhwa = getRelatedArticles("MANHWA", 3);
    // At least the first result should carry the matching tag when such
    // articles exist in the catalog.
    const taggedManhwa = getAllArticles().filter((a) => a.tags.includes("Manhwa"));
    if (taggedManhwa.length > 0) {
      expect(manhwa[0].tags).toContain("Manhwa");
    }
  });

  it("tops up with recent articles when there aren't enough matches", () => {
    // An unknown / untagged type has no matches, so it should still fill up to
    // the limit from the newest articles rather than returning empty.
    const result = getRelatedArticles("UNKNOWN", 3);
    const available = Math.min(3, getAllArticles().length);
    expect(result).toHaveLength(available);
  });

  it("never returns duplicate slugs", () => {
    const slugs = getRelatedArticles("MANHWA", 3).map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("is safe with no series type", () => {
    expect(() => getRelatedArticles(undefined, 3)).not.toThrow();
  });
});
