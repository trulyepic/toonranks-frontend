import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders its children only on the client, after mount. On the server (SSR) and
 * during the first client render it shows `fallback` (default: nothing), then
 * swaps to the real children in an effect — so there's no hydration mismatch.
 *
 * Use for inherently browser-only widgets that can't render on the server, e.g.
 * `react-google-recaptcha` (whose component is invalid during SSR and needs
 * `window`/`grecaptcha`). `children` is a function so it's never evaluated on the
 * server.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: () => ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children() : fallback}</>;
}
