import { describe, expect, it, vi } from "vitest";

import {
  buildMobileSignupVerificationRedirect,
  getMobileAuthRequest,
  redirectToMobileAuthCallback,
} from "./mobileAuthRedirect";

describe("mobile auth redirect helpers", () => {
  it("recognizes valid mobile auth requests", () => {
    const request = getMobileAuthRequest(
      "?mobile=1&redirect_uri=toonranks%3A%2F%2Fauth%2Fcallback&state=abc"
    );

    expect(request).toEqual({
      isMobile: true,
      redirectUri: "toonranks://auth/callback",
      state: "abc",
    });
  });

  it("rejects unknown redirect URIs", () => {
    const request = getMobileAuthRequest(
      "?mobile=1&redirect_uri=https%3A%2F%2Fevil.example%2Fcallback&state=abc"
    );

    expect(request.isMobile).toBe(false);
    expect(request.redirectUri).toBe("https://evil.example/callback");
  });

  it("builds the signup verification callback", () => {
    const url = buildMobileSignupVerificationRedirect({
      isMobile: true,
      redirectUri: "toonranks://auth/callback",
      state: "abc",
    });

    expect(url).toBe(
      "toonranks://auth/callback?error=email_verification_required&error_description=Please+verify+your+email%2C+then+log+in.&state=abc"
    );
  });

  it("does not build signup callbacks for normal web requests", () => {
    expect(
      buildMobileSignupVerificationRedirect({
        isMobile: false,
        redirectUri: null,
        state: null,
      })
    ).toBeNull();
  });

  it("redirects through location assign", () => {
    const assign = vi.fn();
    const originalLocation = window.location;

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign },
    });

    try {
      redirectToMobileAuthCallback("toonranks://auth/callback?code=123");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }

    expect(assign).toHaveBeenCalledWith("toonranks://auth/callback?code=123");
  });
});
