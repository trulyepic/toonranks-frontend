// Compact, Reddit-style relative timestamps for the forum.
//
// Rendered values depend on the current time, so they differ between the SSR
// pass and client hydration. Callers should pass the result to an element with
// `suppressHydrationWarning` (and keep the absolute date in a `title`) so the
// brief mismatch doesn't produce a hydration warning.

/** e.g. "just now", "5m ago", "7h ago", "3d ago", "2mo ago", "1y ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 45) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/** Full, human-readable timestamp for tooltips (`title` attributes). */
export function fullTimestamp(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
