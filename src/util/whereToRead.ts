import type { ReadingLink } from "../types/types";

export const MAX_WHERE_TO_READ_LINKS = 6;

/** Returns an error message, or null when every row is either complete or fully empty. */
export function whereToReadError(links: ReadingLink[]): string | null {
  for (const link of links) {
    const site = link.site.trim();
    const url = link.url.trim();
    if (!site && !url) continue;
    if (!site) return "Each Where to read link needs a site name.";
    if (!/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)) {
      return `The link for ${site} must be a full https:// address.`;
    }
  }
  return null;
}

export function cleanWhereToRead(links: ReadingLink[]): ReadingLink[] {
  return links
    .map((link) => ({ site: link.site.trim(), url: link.url.trim() }))
    .filter((link) => link.site && link.url);
}
