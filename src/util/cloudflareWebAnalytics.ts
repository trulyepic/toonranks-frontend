const CLOUDFLARE_ANALYTICS_TOKEN = "006be16347d84237b8504d9ac482a047";
const CLOUDFLARE_BEACON_URL =
  "https://static.cloudflareinsights.com/beacon.min.js";

export function shouldEnableCloudflareAnalytics(hostname: string): boolean {
  return hostname.toLowerCase() === "www.toonranks.com";
}

export function installCloudflareWebAnalytics(
  targetDocument: Document,
  hostname: string
): (() => void) | undefined {
  if (!shouldEnableCloudflareAnalytics(hostname)) return undefined;

  const existing = targetDocument.querySelector(
    'script[src*="static.cloudflareinsights.com"], script[data-cf-beacon]'
  );
  if (existing) return undefined;

  const script = targetDocument.createElement("script");
  script.defer = true;
  script.src = CLOUDFLARE_BEACON_URL;
  script.dataset.cfBeacon = JSON.stringify({
    token: CLOUDFLARE_ANALYTICS_TOKEN,
  });
  targetDocument.body.appendChild(script);

  return () => script.remove();
}
