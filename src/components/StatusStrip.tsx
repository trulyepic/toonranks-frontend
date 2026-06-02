import type { SeriesStatus } from "../api/manApi";

type StatusValue = "ONGOING" | "COMPLETE" | "HIATUS" | "SEASON_END";

type Props = {
  active: SeriesStatus;
  onSelect: (status: SeriesStatus) => void;
};

const STATUS_OPTIONS: { label: string; value: StatusValue }[] = [
  { label: "Ongoing", value: "ONGOING" },
  { label: "Complete", value: "COMPLETE" },
  { label: "Hiatus", value: "HIATUS" },
  { label: "Season End", value: "SEASON_END" },
];

const DOT_CLASS: Record<StatusValue, string> = {
  ONGOING: "bg-emerald-500",
  COMPLETE: "bg-blue-600",
  HIATUS: "bg-amber-500",
  SEASON_END: "bg-violet-600",
};

// Mirrors GenreStrip's tab styling for visual consistency.
const tabBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors sm:px-3.5 sm:py-2 sm:text-sm sm:tracking-[0.14em]";
const tabActive =
  "bg-[linear-gradient(135deg,_#315ff4,_#2347c5)] text-white shadow-[0_12px_26px_-18px_rgba(35,71,197,0.7)] ring-1 ring-inset ring-blue-500/40 dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_40%),linear-gradient(145deg,_rgba(34,63,124,0.96),_rgba(23,44,96,0.96))] dark:text-white dark:ring-[#3056a5]";
const tabIdle =
  "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[linear-gradient(145deg,_rgba(35,28,24,0.95),_rgba(24,19,16,0.95))] dark:hover:text-white";

export default function StatusStrip({ active, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        className={`${tabBase} ${!active ? tabActive : tabIdle}`}
        onClick={() => onSelect(null)}
        title="All statuses"
      >
        ALL STATUS
      </button>

      {STATUS_OPTIONS.map((option) => {
        const isActive = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`${tabBase} ${isActive ? tabActive : tabIdle}`}
            onClick={() => onSelect(isActive ? null : option.value)}
            title={option.label}
          >
            <span
              className={`h-2 w-2 rounded-full ${DOT_CLASS[option.value]}`}
              aria-hidden="true"
            />
            {option.label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
