export const stripMdHeading = (s: string) =>
  s.replace(/^\s{0,3}#{1,6}\s+/, "").trim();

/**
 * Converts forum markdown to a plain-text string suitable for previews.
 * Handles the custom series-mention syntax used across the platform, as well
 * as standard markdown syntax (images, links, bold, italic, code, headings,
 * blockquotes).  The result is a single collapsed line ready for truncation.
 */
export function mdToPlainText(md: string): string {
  return (
    md
      // Images: ![alt](url) → alt text (or nothing when alt is empty)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Series mentions: [Title](series:123) or [Title](/series/123) → Title
      .replace(/\[([^\]]+)\]\((?:series:\d+|\/series\/\d+[^)]*)\)/g, "$1")
      // Generic links: [text](url) → text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Bold / italic combinations (**bold**, *italic*, __bold__, _italic_)
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
      // Inline code: `code` → code
      .replace(/`([^`]+)`/g, "$1")
      // ATX headings: ## Heading → Heading
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      // Blockquotes: > text → text
      .replace(/^\s*>\s?/gm, "")
      // Collapse newlines / extra whitespace to a single space
      .replace(/\s+/g, " ")
      .trim()
  );
}
