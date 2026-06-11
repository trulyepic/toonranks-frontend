import { useCallback, useEffect, useState } from "react";
import { useParams, useLocation, useLoaderData } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router";
import SeriesDetail from "../components/SeriesDetail";
import AddSeriesDetailModal from "../components/AddSeriesDetailModal";
import {
  getSeriesDetailById,
  getSeriesSummary,
} from "../api/manApi";
import type { RankedSeries } from "../api/manApi";
import { UserIcon } from "lucide-react";
import { UsersIcon } from "@heroicons/react/24/outline";
import SeriesDetailShimmer from "../components/SeriesDetailShimmer";
import type { SeriesDetailData } from "../types/types";
import RatingInfoTooltip from "../components/RatingInfoTooltip";
import { getDisplayVoteCounts } from "../util/displayVoteCounts";
import { isAdminRole } from "../util/roleUtils";
import { useUser } from "../login/useUser";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
} from "../config/site";

// SSR loader: runs on the server for every /series/:id request (any id, including
// series added since the last deploy), so the synopsis/title/author land in the
// initial HTML for crawlers. The client also revalidates via the effects below.
type SeriesLoaderData = {
  seriesDetail: SeriesDetailData | null;
  summary: RankedSeries | null;
};

export async function loader({
  params,
}: LoaderFunctionArgs): Promise<SeriesLoaderData> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return { seriesDetail: null, summary: null };
  const [seriesDetail, summary] = await Promise.all([
    getSeriesDetailById(id).catch(() => null),
    getSeriesSummary(id).catch(() => null),
  ]);
  return { seriesDetail, summary };
}

function seriesDisplayTitle(data: SeriesLoaderData | undefined, id?: string) {
  const detail = data?.seriesDetail as unknown as
    | Record<string, unknown>
    | undefined;
  const detailTitle =
    typeof detail?.["title"] === "string"
      ? (detail["title"] as string)
      : typeof detail?.["series_title"] === "string"
      ? (detail["series_title"] as string)
      : undefined;
  return detailTitle ?? data?.summary?.title ?? `Series #${id}`;
}

export function meta({
  data,
  params,
}: {
  data?: SeriesLoaderData;
  params: { id?: string };
}) {
  const id = params.id;
  const detail = data?.seriesDetail;
  const displayTitle = seriesDisplayTitle(data, id);
  const description =
    detail?.synopsis?.slice(0, 150) ??
    "Explore detailed information and ratings for this manga/manhwa/manhua series.";
  const image = detail?.series_cover_url || DEFAULT_SOCIAL_IMAGE;
  const url = absoluteUrl(`/series/${id}`);
  return [
    { title: `${displayTitle} | ${SITE_NAME}` },
    { tagName: "link", rel: "canonical", href: url },
    { name: "description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:title", content: `${displayTitle} | ${SITE_NAME}` },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:url", content: url },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `${displayTitle} | ${SITE_NAME}` },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "CreativeWorkSeries",
        name: displayTitle,
        genre: data?.summary?.genre,
        author: detail?.author
          ? { "@type": "Person", name: detail.author }
          : undefined,
        creator: detail?.artist
          ? { "@type": "Person", name: detail.artist }
          : undefined,
        image: detail?.series_cover_url || undefined,
        url,
        description: detail?.synopsis?.slice(0, 300),
      },
    },
  ];
}

const dummyData = {
  id: 1,
  title: "Heavenly Chronicles",
  genre: "Action",
  type: "MANHWA",
  description:
    "A legendary tale of a martial artist who reincarnates to challenge fate and the heavens.",
  author: "Jane Smith",
  artist: "John Doe",
};

const SeriesDetailPage = () => {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.role);
  const { id } = useParams();
  const location = useLocation();
  const locationState = (location.state || {}) as {
    title?: string;
    genre?: string;
    type?: string;
    author?: string;
    artist?: string;
    approval_status?: string | null;
    submitted_by_id?: number | string | null;
    can_manage_pending_details?: boolean;
  };
  const { title, genre, type, author, artist } = locationState;

  // Seed from the SSR loader so the synopsis/title/author are in the server HTML
  // (and match the first client render). The effects below still refetch live.
  const loaderData = useLoaderData() as SeriesLoaderData;
  const loadedSummary = loaderData?.summary ?? null;

  const [showEditModal, setShowEditModal] = useState(false);
  const [series, setSeries] = useState<typeof dummyData>({
    ...dummyData,
    id: Number(id),
    title: title || loadedSummary?.title || dummyData.title,
    genre: genre || loadedSummary?.genre || dummyData.genre,
    type: type || loadedSummary?.type || dummyData.type,
    author: author || loadedSummary?.author || dummyData.author,
    artist: artist || loadedSummary?.artist || dummyData.artist,
  });

  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailData | null>(
    loaderData?.seriesDetail ?? null
  );

  const [ratings, setRatings] = useState<Record<string, number>>({
    Story: -1,
    Characters: -1,
    "World Building": -1,
    Art: -1,
    "Drama / Fighting": -1,
  });

  const [displayCounts, setDisplayCounts] = useState<Record<string, number>>(
    {}
  );

  const validScores = Object.values(ratings).filter((s) => s !== -1);
  const avgScore =
    validScores.length > 0
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
      : "-";

  function pickBasicFromDetail(d: SeriesDetailData | null): {
    title?: string;
    type?: string;
    genre?: string;
  } {
    if (!d) return {};
    const rec = d as unknown as Record<string, unknown>;
    const nextTitle =
      typeof rec["title"] === "string"
        ? (rec["title"] as string)
        : typeof rec["series_title"] === "string"
        ? (rec["series_title"] as string)
        : undefined;
    const nextType =
      typeof rec["type"] === "string" ? (rec["type"] as string) : undefined;
    const nextGenre =
      typeof rec["genre"] === "string" ? (rec["genre"] as string) : undefined;
    return { title: nextTitle, type: nextType, genre: nextGenre };
  }

  const { title: fetchedTitle } = pickBasicFromDetail(seriesDetail);
  const displayTitle = fetchedTitle ?? series.title ?? `Series #${id}`;
  const hasDetailCover = Boolean(seriesDetail?.series_cover_url);
  const hasExistingTitleDetails = Boolean(
    seriesDetail?.series_cover_url || seriesDetail?.synopsis?.trim()
  );
  const canEditDetails = Boolean(user && isAdmin);
  const isPendingSubmission =
    String(
      seriesDetail?.approval_status ?? locationState.approval_status ?? ""
    ).toUpperCase() === "PENDING";
  const isContributorSubmissionOwner = Boolean(
    user &&
      !isAdmin &&
      Number(seriesDetail?.submitted_by_id ?? locationState.submitted_by_id) ===
        Number(user.id)
  );
  const canManagePendingDetails = Boolean(
    !isAdmin &&
      (locationState.can_manage_pending_details ||
        (isPendingSubmission && isContributorSubmissionOwner))
  );
  const canOpenDetailsEditor = canEditDetails || canManagePendingDetails;
  const canShowDetailsAction = canOpenDetailsEditor;

  useEffect(() => {
    setSeries((prev) => ({
      ...prev,
      id: Number(id),
      title: title || prev.title,
      genre: genre || prev.genre,
      type: type || prev.type,
      artist: artist || prev.artist,
      author: author || prev.author,
    }));
  }, [id, title, genre, type, author, artist]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const detail = await getSeriesDetailById(Number(id));
        setSeriesDetail(detail);

        const num = (k: string) =>
          (detail as unknown as Record<string, number | undefined>)[k];
        setRatings((prev) => {
          const nextRatings = { ...prev };
          for (const cat in nextRatings) {
            const base = cat.toLowerCase().replace(" / ", "_");
            const count = num(`${base}_count`);
            const total = num(`${base}_total`);
            nextRatings[cat] =
              typeof count === "number" &&
              count > 0 &&
              typeof total === "number"
                ? total / count
                : -1;
          }
          return nextRatings;
        });

        const baseCounts = detail.vote_counts || {};
        setDisplayCounts(getDisplayVoteCounts(baseCounts, Number(id)));
      } catch (err) {
        console.error("Failed to fetch series detail", err);
      }
    };

    fetchDetails();
  }, [id, showEditModal]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSeriesSummary(Number(id));
        if (cancelled) return;
        setSeries((prev) => ({
          ...prev,
          id: s.id,
          title: s.title,
          genre: s.genre,
          type: s.type,
          author: s.author ?? prev.author,
          artist: s.artist ?? prev.artist,
        }));
      } catch (e) {
        console.error("Failed to fetch series summary", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateRating = useCallback((category: string, avg: number) => {
    setRatings((prev) => ({
      ...prev,
      [category]: avg,
    }));
  }, []);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 lg:px-10">
      {canShowDetailsAction && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowEditModal(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark-theme-card-soft dark:text-slate-200 dark:hover:bg-[#241d19]"
          >
            {hasExistingTitleDetails
              ? "Edit title details"
              : "Add title details"}
          </button>
        </div>
      )}

        {!seriesDetail ? (
          <SeriesDetailShimmer />
        ) : (
          <>
            <section className="overflow-visible rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-[0_28px_70px_-46px_rgba(15,23,42,0.55)] dark-theme-shell">
              <div className="px-5 pt-5 sm:px-7 sm:pt-7 lg:px-8 lg:pt-8">
                {hasDetailCover ? (
                  <button
                    type="button"
                    onClick={
                      canOpenDetailsEditor
                        ? () => setShowEditModal(true)
                        : undefined
                    }
                    className={`block w-full text-left ${
                      canOpenDetailsEditor ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <img
                      src={seriesDetail.series_cover_url}
                      alt={displayTitle}
                      className="w-full rounded-[26px] border border-slate-200 bg-white object-cover shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)] dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(25,21,18,0.96),_rgba(20,17,14,0.96))] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.85)]"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      canOpenDetailsEditor
                        ? () => setShowEditModal(true)
                        : undefined
                    }
                    className={`flex min-h-[320px] w-full items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.95))] px-6 py-10 text-center shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)] dark:border-[#4a3b31] dark:bg-[linear-gradient(145deg,_rgba(28,22,19,0.96),_rgba(20,16,14,0.96))] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.85)] ${
                      canOpenDetailsEditor ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="max-w-xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Detail cover pending
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Add the detail cover
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        Upload the wide cover image for this title.
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Recommended size: 600 × 400 px
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="px-5 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                        {series.type}
                      </span>
                      <span className="inline-block max-w-full whitespace-normal rounded-[24px] bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
                        {series.genre}
                      </span>
                    </div>

                    <h1 className="mt-4 break-words text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                      {displayTitle}
                    </h1>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {seriesDetail.author ? (
                        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark-theme-card-soft">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Author
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                            {seriesDetail.author}
                          </p>
                        </div>
                      ) : null}

                      {seriesDetail.artist ? (
                        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark-theme-card-soft">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Artist
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                            {seriesDetail.artist}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-full max-w-[220px] shrink-0">
                    <div className="rounded-[28px] border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-[0_20px_42px_-30px_rgba(15,23,42,0.45)] dark-theme-card dark:shadow-[0_20px_42px_-30px_rgba(0,0,0,0.85)]">
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Avg. Rating
                        <RatingInfoTooltip />
                      </div>
                      <div className="mt-3 text-5xl font-semibold leading-none tracking-tight text-slate-950 dark:text-white">
                        {avgScore}
                      </div>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">out of 10</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[26px] border border-slate-200 bg-white/92 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)] dark-theme-card-soft dark:shadow-[0_18px_42px_-34px_rgba(0,0,0,0.85)]">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Synopsis
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-[15px]">
                    {seriesDetail.synopsis || "Synopsis coming soon."}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Rating breakdown
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  How readers rate this series
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Object.entries(ratings).map(([label, score]) => (
                  <RatingCard
                    key={label}
                    label={label}
                    score={score}
                    count={displayCounts[label]}
                  />
                ))}
              </div>
            </section>

            <section className="mt-8 overflow-visible rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark-theme-shell">
              <div className="border-b border-slate-200/80 px-5 py-5 dark:border-[#342a23] sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Community voting
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  Rate this series
                </h2>
              </div>
              <div className="px-5 py-5 sm:px-6">
                <SeriesDetail
                  series={series}
                  updateRating={updateRating}
                  seriesDetail={seriesDetail}
                />
              </div>
            </section>
          </>
        )}

      {showEditModal && (
        <AddSeriesDetailModal
          seriesId={series.id}
          initialSynopsis={seriesDetail?.synopsis ?? ""}
          hasExistingDetails={hasExistingTitleDetails}
          onClose={() => setShowEditModal(false)}
        />
      )}
      </div>
    </>
  );
};

const RatingCard = ({
  label,
  score,
  count,
}: {
  label: string;
  score: number;
  count?: number;
}) => (
  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.4)] dark-theme-card dark:shadow-[0_18px_40px_-34px_rgba(0,0,0,0.82)]">
    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h3>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-blue-500">
      {score === -1 ? "-" : score.toFixed(1)}
      <span className="ml-1 text-base font-medium text-slate-400 dark:text-slate-500">/10</span>
    </p>
    {count !== undefined && (
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
        {count > 1 ? (
          <UsersIcon className="h-4 w-4 text-blue-400" />
        ) : (
          <UserIcon className="h-4 w-4 text-blue-400" />
        )}
        {count}
      </div>
    )}
  </div>
);

export default SeriesDetailPage;
