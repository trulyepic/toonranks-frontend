const CLOUDFLARE_BEACON_URL =
  "https://static.cloudflareinsights.com/beacon.min.js";

export function shouldEnableCloudflareAnalytics(hostname: string): boolean {
  return hostname.toLowerCase() === "www.toonranks.com";
}

export function installCloudflareWebAnalytics(
  targetDocument: Document,
  hostname: string,
  token: string | undefined
): (() => void) | undefined {
  const normalizedToken = token?.trim();
  if (!shouldEnableCloudflareAnalytics(hostname) || !normalizedToken) {
    return undefined;
  }

  const existing = targetDocument.querySelector(
    'script[src*="static.cloudflareinsights.com"], script[data-cf-beacon]'
  );
  if (existing) return undefined;

  const script = targetDocument.createElement("script");
  script.defer = true;
  script.src = CLOUDFLARE_BEACON_URL;
  script.dataset.cfBeacon = JSON.stringify({
    token: normalizedToken,
  });
  targetDocument.body.appendChild(script);

  return () => script.remove();
}
