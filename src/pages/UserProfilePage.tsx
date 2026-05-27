import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { getPublicProfile, type PublicProfile } from "../api/manApi";
import UserAvatar from "../components/UserAvatar";
import { inlineUsernameClassName } from "../util/userDisplay";
import { SITE_NAME, SITE_ORIGIN } from "../config/site";

function roleLabel(role: string): string {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "Admin";
  if (r === "CONTRIBUTOR") return "Contributor";
  return "Member";
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    getPublicProfile(username)
      .then(setProfile)
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  const canonical = `${SITE_ORIGIN}/user/${username ?? ""}`;
  const pageTitle = profile
    ? `${profile.username} — ${SITE_NAME}`
    : `User profile — ${SITE_NAME}`;

  /* ── Loading skeleton ────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Helmet><title>{pageTitle}</title></Helmet>
        <div className="animate-pulse space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-[#342b24] dark:bg-[#1b1612]">
            <div className="h-2 w-full bg-slate-200 dark:bg-[#2e2520]" />
            <div className="flex flex-col gap-5 px-8 py-8 sm:flex-row sm:items-center sm:gap-8">
              <div className="h-24 w-24 shrink-0 rounded-full bg-slate-200 dark:bg-[#2e2520]" />
              <div className="space-y-3">
                <div className="h-8 w-52 rounded bg-slate-200 dark:bg-[#2e2520]" />
                <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-[#2e2520]" />
                <div className="h-4 w-36 rounded bg-slate-100 dark:bg-[#241d19]" />
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 dark:border-[#342b24] dark:bg-[#1b1612]">
            <div className="mb-5 h-6 w-40 rounded bg-slate-200 dark:bg-[#2e2520]" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-[18px] bg-slate-200 dark:bg-[#1e1712]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found ───────────────────────────────────────────────────────── */
  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <Helmet>
          <title>User not found — {SITE_NAME}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <p className="text-5xl">😶</p>
        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
          User not found
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          We couldn't find a user named{" "}
          <span className="font-semibold">"{username}"</span>.
        </p>
        <Link
          to="/forum"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-[#342b24] dark:text-slate-300 dark:hover:bg-[#1e1712]"
        >
          ← Back to forum
        </Link>
      </div>
    );
  }

  /* ── Profile ─────────────────────────────────────────────────────────── */
  const hasFavourites = profile.favourites.length > 0;
  const hasLists = profile.reading_lists.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={canonical} />
        <meta name="description" content={`View ${profile.username}'s profile on ${SITE_NAME}.`} />
      </Helmet>

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-[#342b24] dark:bg-[linear-gradient(135deg,rgba(27,22,18,0.98),rgba(20,16,13,0.97)_60%,rgba(18,28,23,0.72))] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        {/* Role-coloured accent strip */}
        <div
          className={`h-2 w-full ${
            (profile.role || "").toUpperCase() === "ADMIN"
              ? "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
              : (profile.role || "").toUpperCase() === "CONTRIBUTOR"
              ? "bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-300"
              : "bg-gradient-to-r from-slate-200 to-slate-300 dark:from-[#342b24] dark:to-[#2a2119]"
          }`}
        />

        <div className="flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:gap-8 sm:px-10 sm:py-10">
          {/* Avatar */}
          <UserAvatar
            username={profile.username}
            avatarUrl={profile.avatar_url}
            avatarPreset={profile.avatar_preset}
            size="xl"
            className="h-24 w-24 shrink-0 text-3xl ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1b1612]"
          />

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Username — span so gradient clips to text width, not block width */}
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              <span className={inlineUsernameClassName(profile.role)}>
                {profile.username}
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              {/* Role badge */}
              <span
                className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
                  (profile.role || "").toUpperCase() === "ADMIN"
                    ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-700/50"
                    : (profile.role || "").toUpperCase() === "CONTRIBUTOR"
                    ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-700/50"
                    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-[#241d19] dark:text-slate-400 dark:ring-[#342b24]"
                }`}
              >
                {roleLabel(profile.role)}
              </span>

              {profile.registered_at && (
                <span className="text-sm text-slate-400 dark:text-slate-500">
                  Joined {formatJoinDate(profile.registered_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Favourite Series ──────────────────────────────────────────────── */}
      <div className="mb-6 rounded-[2rem] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-[#342b24] dark:bg-[linear-gradient(145deg,rgba(27,22,18,0.98),rgba(20,16,13,0.97))] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)] sm:px-10 sm:py-10">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
            Favourite Series
          </h2>
          {!hasFavourites && (
            <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
              {profile.username} hasn't pinned any series yet.
            </p>
          )}
        </div>

        {/* Grid: 2 cols mobile → 3 cols tablet → 5 cols desktop */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {profile.favourites.map((fav) => (
            <Link
              key={fav.series_id}
              to={`/series/${fav.series_id}`}
              className="group relative aspect-[2/3]"
              title={fav.title}
            >
              <div className="h-full w-full overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 shadow-sm dark:border-[#2e2520] dark:bg-[#1e1712]">
                {fav.cover_url ? (
                  <img
                    src={fav.cover_url}
                    alt={fav.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-1">
                    <span className="text-center text-[10px] leading-tight text-slate-400 dark:text-slate-600">
                      {fav.title}
                    </span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col justify-end rounded-[18px] bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="p-2.5 pb-3">
                    <p className="line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow">
                      {fav.title}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Public Reading Lists (only if any are public) ─────────────────── */}
      {hasLists && (
        <div className="mb-6 rounded-[2rem] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-[#342b24] dark:bg-[linear-gradient(145deg,rgba(27,22,18,0.98),rgba(20,16,13,0.97))] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)] sm:px-10 sm:py-10">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
              Reading Lists
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Shared lists from {profile.username}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.reading_lists.map((list) => (
              <Link
                key={list.share_token}
                to={`/lists/${list.share_token}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 transition hover:border-slate-300 hover:bg-slate-100/80 dark:border-[#2e2520] dark:bg-[#1a1410] dark:hover:border-[#3a3028] dark:hover:bg-[#201a16]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">
                    {list.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {list.item_count} {list.item_count === 1 ? "series" : "series"}
                  </p>
                </div>
                <span className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Back link ────────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/forum"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-[#342b24] dark:text-slate-400 dark:hover:bg-[#1e1712]"
        >
          ← Back to forum
        </Link>
      </div>
    </div>
  );
}
