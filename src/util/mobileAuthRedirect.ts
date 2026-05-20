export const MOBILE_AUTH_CALLBACK_URL = "toonranks://auth/callback";

export type MobileAuthRequest = {
  isMobile: boolean;
  redirectUri: string | null;
  state: string | null;
};

export function getMobileAuthRequest(search: string): MobileAuthRequest {
  const params = new URLSearchParams(search);
  const redirectUri = params.get("redirect_uri");
  const isMobile =
    params.get("mobile") === "1" && redirectUri === MOBILE_AUTH_CALLBACK_URL;

  return {
    isMobile,
    redirectUri,
    state: params.get("state"),
  };
}

export function buildMobileSignupVerificationRedirect(
  request: MobileAuthRequest
): string | null {
  if (!request.isMobile || !request.redirectUri) return null;

  const params = new URLSearchParams({
    error: "email_verification_required",
    error_description: "Please verify your email, then log in.",
  });

  if (request.state) {
    params.set("state", request.state);
  }

  return `${request.redirectUri}?${params.toString()}`;
}

export function redirectToMobileAuthCallback(url: string): void {
  window.location.assign(url);
}
