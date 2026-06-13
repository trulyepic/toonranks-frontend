import { useEffect, useRef, useState } from "react";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import { Palette, Pencil, StarIcon } from "lucide-react";
import { Link } from "react-router-dom";
import UserIcon from "./icons/UserIcon";
import ShimmerBox from "./ShimmerBox";
import { formatScore } from "../util/formatScore";

type Props = {
  id: number;
  rank: number | string;
  title: string;
  type: string;
  genre: string;
  votes: number;
  coverUrl: string;
  onDelete: (id: number) => void;
  onEdit?: () => void;
  isAdmin: boolean;
  author?: string;
  artist?: string;
  avgScore?: number;
  onCompareToggle?: () => void;
  isCompared?: boolean | void;
  onAddToReadingList?: () => void;
  isInReadingList?: boolean;
  status?: "ONGOING" | "COMPLETE" | "HIATUS" | "UNKNOWN" | "SEASON_END" | null;
};

function statusClasses(status?: Props["status"]) {
  switch (status) {
    case "ONGOING":
      return "bg-emerald-500 text-white";
    case "COMPLETE":
      return "bg-blue-600 text-white";
    case "HIATUS":
      return "bg-amber-500 text-white";
    case "UNKNOWN":
      return "bg-slate-400 text-white";
    case "SEASON_END":
      return "bg-violet-600 text-white";
    default:
      return "";
  }
}

function scoreTone(score?: number) {
  if (score == null) return "text-slate-500";
  if (score >= 8) return "text-emerald-600";
  if (score >= 7.5) return "text-blue-600";
  if (score >= 5) return "text-amber-500";
  if (score >= 3) return "text-orange-400";
  return "text-rose-500";
}

const pillBase =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition";

const ManCard = ({
  id,
  rank,
  title,
  type,
  genre,
  votes,
  coverUrl,
  onDelete,
  onEdit,
  isAdmin,
  author,
  artist,
  avgScore,
  onCompareToggle,
  isCompared,
  onAddToReadingList,
  isInReadingList,
  status,
}: Props) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Under SSR the <img> is already in the HTML, so the browser can finish loading
  // it before React attaches the onLoad handler — the event is missed and the
  // card stays on its placeholder. Catch that by checking `complete` on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setImageLoaded(true);
  }, []);

  const showVotes = votes >= 10;
  const showListBtn = !!onAddToReadingList;
  const showCompareBtn = !!onCompareToggle;
  // Many series have the same person as author and artist; showing the name
  // twice is noise, so collapse to a single row in that case.
  const sameCreator =
    !!author &&
    !!artist &&
    author.trim().toLowerCase() === artist.trim().toLowerCase();

  const ListButton = () => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onAddToReadingList?.();
      }}
      title={isInReadingList ? "In your reading list" : "Add to reading list"}
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold sm:px-2 sm:text-xs ${
        isInReadingList
          ? "bg-blue-500 text-white hover:bg-blue-700"
          : "bg-green-200 text-green-800 hover:bg-green-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:hover:bg-emerald-900"
      }`}
    >
      {isInReadingList ? "✓ List" : "+ List"}
    </button>
  );

  return (
    <article className="group relative h-full w-full min-w-0">
      {rank !== null && rank !== undefined ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-slate-900/80 px-2.5 py-1 text-sm font-bold text-white ring-2 ring-white shadow-sm">
          {typeof rank === "number" ? `#${rank}` : rank}
        </div>
      ) : null}

      {isAdmin && (
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit?.();
            }}
            title="Edit"
            className="rounded-full bg-white/90 p-1.5 shadow-sm transition hover:bg-blue-50 dark:bg-[linear-gradient(145deg,_rgba(32,26,22,0.95),_rgba(22,18,15,0.95))] dark:hover:bg-[#2a221d]"
          >
            <PencilSquareIcon className="h-4 w-4 text-blue-500" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(id);
            }}
            title="Delete"
            className="rounded-full bg-white/90 p-1.5 shadow-sm transition hover:bg-rose-50 dark:bg-[linear-gradient(145deg,_rgba(32,26,22,0.95),_rgba(22,18,15,0.95))] dark:hover:bg-[#2a221d]"
          >
            <TrashIcon className="h-4 w-4 text-rose-400" />
          </button>
        </div>
      )}

      <Link
        to={`/series/${id}`}
        state={{ title, genre, type }}
        className="block h-full"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)] transition duration-300 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-[0_22px_50px_-34px_rgba(15,23,42,0.55)] dark-theme-card dark:group-hover:border-[#4a3d33] sm:rounded-[22px]">
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100 dark:bg-[#241d19]">
            {!imageLoaded && <ShimmerBox className="h-full w-full" />}
            <img
              ref={imgRef}
              src={coverUrl}
              alt={`Cover for ${title}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={`h-full w-full object-cover transition duration-500 ${
                imageLoaded
                  ? "opacity-100 group-hover:scale-[1.03]"
                  : "absolute left-0 top-0 opacity-0"
              }`}
            />

            {status ? (
              <div className="absolute bottom-3 right-3 z-10">
                <span
                  className={`${pillBase} ${statusClasses(status)} px-2 py-0.5 text-[10px] shadow-sm ring-1 ring-white/70 sm:px-2.5 sm:py-1 sm:text-[11px]`}
                  title={status}
                  aria-label={`Status: ${status}`}
                >
                  {status.replace("_", " ")}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-1 flex-col space-y-2 px-2 pb-2 sm:mt-4 sm:px-2.5">
            <h2 className="line-clamp-2 min-h-[2.6rem] w-full text-[15px] font-semibold leading-5 text-slate-900 dark:text-white sm:text-base sm:leading-normal" title={title}>
              {title}
            </h2>

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] capitalize text-gray-500 dark:text-slate-400 sm:gap-2.5 sm:text-xs">
              {type}
              {avgScore !== undefined && (
                <span
                  className={`flex items-center gap-0.5 font-medium ${scoreTone(
                    avgScore
                  )}`}
                >
                  <StarIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {formatScore(avgScore, 3)}
                </span>
              )}
            </p>

            {author && (
              <p
                className="flex items-center gap-1 text-[13px] text-gray-600 dark:text-slate-300 sm:gap-1.5 sm:text-sm"
                title={sameCreator ? `Author & Artist: ${author}` : author}
              >
                <Pencil className="h-4 w-4 flex-shrink-0 text-gray-700 dark:text-slate-400" />
                <span
                  className="truncate"
                  style={{ maxWidth: "calc(100% - 1.25rem)" }}
                >
                  {author}
                </span>
              </p>
            )}

            {artist && !sameCreator && (
              <p
                className="flex items-center gap-1 text-[13px] text-gray-600 dark:text-slate-300 sm:gap-1.5 sm:text-sm"
                title={artist}
              >
                <Palette className="h-4 w-4 flex-shrink-0 text-gray-700 dark:text-slate-400" />
                <span
                  className="truncate"
                  style={{ maxWidth: "calc(100% - 1.25rem)" }}
                >
                  {artist}
                </span>
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-y-2 text-sm text-gray-700 dark:text-slate-300">
              {showVotes ? (
                <div className="flex items-center space-x-1">
                  <UserIcon className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs">{votes.toLocaleString()}</span>
                </div>
              ) : showListBtn ? (
                <ListButton />
              ) : showCompareBtn ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onCompareToggle?.();
                  }}
                  title="Select to Compare"
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition sm:text-xs ${
                    isCompared
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-[#3a3028] dark:text-slate-400 dark:hover:bg-[#241d19] dark:hover:text-slate-200"
                  }`}
                >
                  {isCompared ? "✓" : "+"} Compare
                </button>
              ) : null}

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {showVotes && showListBtn && <ListButton />}

                {(showVotes || (showListBtn && !showVotes)) && showCompareBtn && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onCompareToggle?.();
                    }}
                    title="Select to Compare"
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition sm:text-xs ${
                      isCompared
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-[#3a3028] dark:text-slate-400 dark:hover:bg-[#241d19] dark:hover:text-slate-200"
                    }`}
                  >
                    {isCompared ? "✓" : "+"} Compare
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default ManCard;
