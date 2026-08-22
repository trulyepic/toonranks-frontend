import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "img"],
  attributes: {
    ...(defaultSchema.attributes || {}),
    img: [
      ["src", /^https?:\/\//i],
      "alt",
      "title",
      "loading",
      "decoding",
      "width",
      "height",
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      ["href", /^(https?:\/\/|\/)/i],
      "target",
      "rel",
      "title",
    ],
  },
};

type MarkdownProseProps = {
  children: string;
  className?: string;
  size?: "base" | "sm";
};

export default function MarkdownProse({
  children,
  className,
  size = "base",
}: MarkdownProseProps) {
  const safeMarkdown = children.replace(
    /\[([^\]]+?)\]\(\s*series:\s*(\d+)\s*\)/gi,
    "[$1](/series/$2)"
  );

  return (
    <div
      className={`${
        size === "sm" ? "prose prose-sm" : "prose"
      } max-w-none prose-slate dark:prose-invert prose-headings:font-semibold prose-p:leading-7 prose-a:font-medium prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-500 dark:prose-headings:text-stone-50 dark:prose-p:text-stone-200 dark:prose-strong:text-stone-50 dark:prose-li:text-stone-200 dark:prose-a:text-blue-300 hover:dark:prose-a:text-blue-200 dark:prose-hr:border-[#3a3028] dark:prose-blockquote:border-l-[#5b4b3e] dark:prose-blockquote:text-stone-300 dark:prose-code:text-blue-200 dark:prose-pre:bg-[#18120f] dark:prose-pre:text-stone-100 ${
        className || ""
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          img: ({ src = "", alt = "", ...props }) => (
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="max-w-full rounded-xl"
              {...props}
            />
          ),
          a: ({ children: linkChildren, href, ...props }) => {
            const url = String(href ?? "");

            if (/^https?:\/\/.+\.(?:png|jpe?g|webp|gif)$/i.test(url)) {
              return (
                <img
                  src={url}
                  alt={typeof linkChildren === "string" ? linkChildren : "image"}
                  loading="lazy"
                  decoding="async"
                  className="max-w-full rounded-xl"
                />
              );
            }

            const internalPath = (() => {
              try {
                const parsed = new URL(url, "https://toonranks.local");
                if (parsed.origin === "https://toonranks.local") {
                  return parsed.pathname + parsed.search + parsed.hash;
                }
              } catch {
                return url.startsWith("/") ? url : null;
              }
              return null;
            })();

            if (internalPath?.startsWith("/")) {
              return (
                <Link
                  to={internalPath}
                  className="font-medium text-blue-600 underline decoration-blue-500/40 underline-offset-4 hover:text-blue-500 hover:decoration-blue-500 dark:text-blue-300 dark:decoration-blue-300/40 dark:hover:text-blue-200"
                >
                  {linkChildren}
                </Link>
              );
            }

            const isExternal = /^https?:/i.test(url);
            return (
              <a
                {...props}
                href={url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer" : undefined}
                className="font-medium text-blue-600 underline decoration-blue-500/40 underline-offset-4 hover:text-blue-500 hover:decoration-blue-500 dark:text-blue-300 dark:decoration-blue-300/40 dark:hover:text-blue-200"
              >
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {safeMarkdown}
      </ReactMarkdown>
    </div>
  );
}
