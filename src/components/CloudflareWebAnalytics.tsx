import { useEffect } from "react";
import { installCloudflareWebAnalytics } from "../util/cloudflareWebAnalytics";

export default function CloudflareWebAnalytics() {
  useEffect(() => {
    return installCloudflareWebAnalytics(document, window.location.hostname);
  }, []);

  return null;
}
