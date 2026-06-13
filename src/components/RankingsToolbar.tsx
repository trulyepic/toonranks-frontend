import type { ReactNode } from "react";
import type { SeriesStatus } from "../api/manApi";
import FilterSelect, { type FilterOption } from "./FilterSelect";

export type SortValue = "score" | "votes" | "newest" | "title";

const SORT_OPTIONS: FilterOption[] = [
  { value: "score", label: "Score" },
  { value: "votes", label: "Most Voted" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "A–Z" },
];

// Dot colors mirror the original StatusStrip for visual continuity.
const STATUS_OPTIONS: FilterOption[] = [
  { value: "", label: "All Status" },
  { value: "ONGOING", label: "Ongoing", dot: "bg-emerald-500" },
  { value: "COMPLETE", label: "Complete", dot: "bg-blue-600" },
  { value: "HIATUS", label: "Hiatus", dot: "bg-amber-500" },
  { value: "SEASON_END", label: "Season End", dot: "bg-violet-600" },
];

type Props = {
  /** Leading context chip — "Rankings" on Home, the type on /type pages. */
  contextLabel: string;
  loadedCount: number;
  activeStatus: SeriesStatus;
  activeGenre: string | null;
  genres: string[];
  sort: SortValue;
  searchTerm?: string;
  onSelectStatus: (status: SeriesStatus) => void;
  onSelectGenre: (genre: string | null) => void;
  onSelectSort: (sort: SortValue) => void;
  /** Page-specific action buttons (Create List / Add Title). */
  rightSlot?: ReactNode;
};

function RemovableChip({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200 dark:ring-[#475276] sm:text-sm">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="flex h-4 w-4 items-center justify-center rounded-full text-blue-500 transition hover:bg-blue-200/70 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-[#3a4a73]"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden="true">
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}

export default function RankingsToolbar({
  contextLabel,
  loadedCount,
  activeStatus,
  activeGenre,
  genres,
  sort,
  searchTerm,
  onSelectStatus,
  onSelectGenre,
  onSelectSort,
  rightSlot,
}: Props) {
  const trimmedSearch = searchTerm?.trim();
  const hasActiveFilters = !!activeStatus || !!activeGenre;

  const genreOptions: FilterOption[] = [
    { value: "", label: "All Genres" },
    ...genres.map((g) => ({ value: g, label: g })),
  ];

  const clearAll = () => {
    onSelectStatus(null);
    onSelectGenre(null);
  };

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200/80 px-3.5 py-4 dark:border-[#342a23] sm:gap-4 sm:px-6 sm:py-5">
      {/* Row 1: context + page actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-400 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.18em]">
            {contextLabel}
          </span>
          <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300 sm:px-3 sm:py-1.5 sm:text-sm">
            Showing {loadedCount} series
          </span>
        </div>
        {rightSlot}
      </div>

      {/* Row 2: the refinement controls + active chips */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Genre"
          value={activeGenre ?? ""}
          options={genreOptions}
          onChange={(v) => onSelectGenre(v || null)}
        />
        <FilterSelect
          label="Status"
          value={activeStatus ?? ""}
          options={STATUS_OPTIONS}
          onChange={(v) => onSelectStatus((v || null) as SeriesStatus)}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(v) => onSelectSort(v as SortValue)}
        />

        {(hasActiveFilters || trimmedSearch) && (
          <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-[#3a3028] sm:inline-block" />
        )}

        {activeGenre ? (
          <RemovableChip
            onRemove={() => onSelectGenre(null)}
            removeLabel="Clear genre filter"
          >
            {activeGenre}
          </RemovableChip>
        ) : null}

        {activeStatus ? (
          <RemovableChip
            onRemove={() => onSelectStatus(null)}
            removeLabel="Clear status filter"
          >
            {(() => {
              const dot = STATUS_OPTIONS.find(
                (o) => o.value === activeStatus
              )?.dot;
              return dot ? (
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
                  aria-hidden="true"
                />
              ) : null;
            })()}
            {activeStatus.replace("_", " ")}
          </RemovableChip>
        ) : null}

        {trimmedSearch ? (
          <span className="inline-flex max-w-full items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900 sm:text-sm">
            Search: {trimmedSearch}
          </span>
        ) : null}

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 underline-offset-2 transition hover:text-slate-700 hover:underline dark:text-slate-500 dark:hover:text-slate-200 sm:text-[11px]"
          >
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  );
}
