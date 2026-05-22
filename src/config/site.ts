export const SITE_ORIGIN = "https://www.toonranks.com";
export const SITE_NAME = "Toon Ranks";
export const OPERATOR_NAME = "Nofara LLC";

export const SUPPORT_EMAIL = "support@toonranks.com";
export const VERIFICATION_EMAIL = "noreply@toonranks.com";
export const PASSWORD_RESET_EMAIL = "accounts@toonranks.com";
export const BILLING_EMAIL = "billing@toonranks.com";
export const ADMIN_EMAIL = "admin@toonranks.com";

export const CONTACT_EMAIL = SUPPORT_EMAIL;
export const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/android-chrome-512x512.png`;

export const absoluteUrl = (path = "/") =>
  `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
