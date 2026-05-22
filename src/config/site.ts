export const SITE_ORIGIN = "https://www.toonranks.com";
export const SITE_NAME = "Toon Ranks";
export const OPERATOR_NAME = "Nofara LLC";
export const CONTACT_EMAIL = "support@toonranks.com";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/android-chrome-512x512.png`;

export const absoluteUrl = (path = "/") =>
  `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
