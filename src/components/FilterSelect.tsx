import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export type FilterOption = {
  value: string;
  label: string;
  /** Optional Tailwind background class for a small color dot (e.g. status). */
  dot?: string;
};

type Props = {
  /** Short dimension label shown before the value, e.g. "Genre". */
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

// A compact labeled dropdown used to refine the rankings (Genre / Status / Sort).
// Keeps every dimension visible but in one tidy row instead of full-width strips.
export default function FilterSelect({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-[#3a3028] dark:bg-[#1e1712] dark:text-slate-200 dark:hover:bg-[#241d19] sm:py-2"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {label}
        </span>
        {selected?.dot ? (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`}
            aria-hidden="true"
          />
        ) : null}
        <span className="max-w-[10rem] truncate">{selected?.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 max-h-72 w-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] dark-theme-card"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || "__all__"}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-[linear-gradient(135deg,_#315ff4,_#2347c5)] font-semibold text-white dark:bg-[linear-gradient(145deg,_rgba(34,63,124,0.96),_rgba(23,44,96,0.96))]"
                    : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#241d19] dark:hover:text-white"
                }`}
              >
                {option.dot ? (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`}
                    aria-hidden="true"
                  />
                ) : null}
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
