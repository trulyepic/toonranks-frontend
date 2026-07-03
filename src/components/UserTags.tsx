import { ShieldCheck, Sparkles, Star, MessageSquareText } from "lucide-react";

/**
 * Small identity/activity tags shown right after a username, so anyone can
 * tell at a glance what kind of user they're reading:
 *
 * - Admin      (role)                 — runs the place
 * - Curator    (CONTRIBUTOR role)     — submits series to the catalog
 * - Critic     (10+ series rated)     — backbone of the rankings
 * - Chatterbox (25+ forum posts)      — keeps the forum alive
 *
 * Role tags render wherever posts/threads/profiles expose `role`. Activity
 * tags render only where the API already provides the stats (leaderboard,
 * public profile) — never guessed client-side. The existing crown RankerBadge
 * (top-10 leaderboard) and the thread "OP" pill complete the set.
 */

const CRITIC_MIN_RATED = 10;
const CHATTERBOX_MIN_POSTS = 25;

const pillBase =
  "inline-flex items-center gap-0.5 rounded px-1 py-px align-middle text-[10px] font-bold uppercase leading-none tracking-wide";

type Tag = {
  key: string;
  label: string;
  title: string;
  className: string;
  Icon: typeof ShieldCheck;
};

function tagsFor({
  role,
  seriesRated,
  postCount,
}: {
  role?: string | null;
  seriesRated?: number;
  postCount?: number;
}): Tag[] {
  const tags: Tag[] = [];
  const normalized = String(role || "").toUpperCase();

  if (normalized === "ADMIN") {
    tags.push({
      key: "admin",
      label: "Admin",
      title: "Toon Ranks staff",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
      Icon: ShieldCheck,
    });
  } else if (normalized === "CONTRIBUTOR") {
    tags.push({
      key: "curator",
      label: "Curator",
      title: "Contributor — submits series to the catalog",
      className: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
      Icon: Sparkles,
    });
  }

  if ((seriesRated ?? 0) >= CRITIC_MIN_RATED) {
    tags.push({
      key: "critic",
      label: "Critic",
      title: `Rated ${seriesRated} series`,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      Icon: Star,
    });
  }

  if ((postCount ?? 0) >= CHATTERBOX_MIN_POSTS) {
    tags.push({
      key: "chatterbox",
      label: "Chatterbox",
      title: `${postCount} forum posts`,
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
      Icon: MessageSquareText,
    });
  }

  return tags;
}

export default function UserTags({
  role,
  seriesRated,
  postCount,
  className,
}: {
  role?: string | null;
  seriesRated?: number;
  postCount?: number;
  className?: string;
}) {
  const tags = tagsFor({ role, seriesRated, postCount });
  if (tags.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {tags.map(({ key, label, title, className: pill, Icon }) => (
        <span key={key} className={`${pillBase} ${pill}`} title={title}>
          <Icon className="h-2.5 w-2.5" aria-hidden="true" />
          {label}
        </span>
      ))}
    </span>
  );
}
