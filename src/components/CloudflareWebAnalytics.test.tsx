import { afterEach, describe, expect, it } from "vitest";

import {
  installCloudflareWebAnalytics,
  shouldEnableCloudflareAnalytics,
} from "../util/cloudflareWebAnalytics";

afterEach(() => {
  document.querySelectorAll("script[data-cf-beacon]").forEach((script) => script.remove());
});

describe("Cloudflare Web Analytics", () => {
  it("only enables analytics on the production hostname", () => {
    expect(shouldEnableCloudflareAnalytics("www.toonranks.com")).toBe(true);
    expect(shouldEnableCloudflareAnalytics("uat.toonranks.com")).toBe(false);
    expect(shouldEnableCloudflareAnalytics("localhost")).toBe(false);
  });

  it("installs one production beacon and cleans it up", () => {
    const cleanup = installCloudflareWebAnalytics(
      document,
      "www.toonranks.com",
      "test-token"
    );
    const beacon = document.querySelector<HTMLScriptElement>("script[data-cf-beacon]");

    expect(beacon?.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    expect(beacon?.dataset.cfBeacon).toContain("test-token");

    cleanup?.();
    expect(document.querySelector("script[data-cf-beacon]")).toBeNull();
  });

  it("does not duplicate a beacon already injected by Cloudflare", () => {
    const existing = document.createElement("script");
    existing.dataset.cfBeacon = '{"token":"existing"}';
    document.body.appendChild(existing);

    installCloudflareWebAnalytics(document, "www.toonranks.com", "test-token");

    expect(document.querySelectorAll("script[data-cf-beacon]")).toHaveLength(1);
  });

  it("does not install a beacon without a configured token", () => {
    installCloudflareWebAnalytics(document, "www.toonranks.com", undefined);

    expect(document.querySelector("script[data-cf-beacon]")).toBeNull();
  });
});
