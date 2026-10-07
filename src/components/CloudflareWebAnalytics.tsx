import { useEffect } from "react";
import { installCloudflareWebAnalytics } from "../util/cloudflareWebAnalytics";

export default function CloudflareWebAnalytics() {
  useEffect(() => {
    return installCloudflareWebAnalytics(
      document,
      window.location.hostname,
      import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN
    );
  }, []);

  return null;
}
