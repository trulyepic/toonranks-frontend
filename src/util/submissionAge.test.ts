import { describe, expect, it } from "vitest";

import { formatSubmissionAge } from "./submissionAge";

const NOW = new Date("2026-10-06T12:00:00Z");

describe("formatSubmissionAge", () => {
  it("formats approvals from today", () => {
    expect(formatSubmissionAge("2026-10-06T08:00:00Z", NOW)).toBe(
      "Approved today"
    );
  });

  it("formats singular and plural day counts", () => {
    expect(formatSubmissionAge("2026-10-05T11:00:00Z", NOW)).toBe(
      "Approved 1 day ago"
    );
    expect(formatSubmissionAge("2026-09-26T12:00:00Z", NOW)).toBe(
      "Approved 10 days ago"
    );
  });

  it("omits missing or invalid dates", () => {
    expect(formatSubmissionAge(null, NOW)).toBeNull();
    expect(formatSubmissionAge("not-a-date", NOW)).toBeNull();
  });
});
