import { describe, expect, it } from "vitest";
import { cleanWhereToRead, whereToReadError } from "./whereToRead";

describe("whereToReadError", () => {
  it("accepts complete https links and ignores fully empty rows", () => {
    expect(
      whereToReadError([
        { site: "Tapas", url: "https://tapas.io/series/x" },
        { site: "", url: "" },
      ])
    ).toBeNull();
  });

  it("requires a site name", () => {
    expect(whereToReadError([{ site: " ", url: "https://tapas.io/x" }])).toMatch(/site name/);
  });

  it("rejects non-https or partial links", () => {
    expect(whereToReadError([{ site: "Tapas", url: "http://tapas.io/x" }])).toMatch(/https/);
    expect(whereToReadError([{ site: "Tapas", url: "tapas.io/x" }])).toMatch(/https/);
    expect(whereToReadError([{ site: "Tapas", url: "javascript:alert(1)" }])).toMatch(/https/);
  });
});

describe("cleanWhereToRead", () => {
  it("trims values and drops empty rows", () => {
    expect(
      cleanWhereToRead([
        { site: " Tapas ", url: " https://tapas.io/x " },
        { site: "", url: "" },
      ])
    ).toEqual([{ site: "Tapas", url: "https://tapas.io/x" }]);
  });
});
