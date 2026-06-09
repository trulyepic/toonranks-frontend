import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { searchSeries } from "../api/manApi";
import type { FavouriteSeries, RankedSeries } from "../api/manApi";

type Props = {
  open: boolean;
  pinned: FavouriteSeries[];
  onSelect: (series: RankedSeries) => void;
  onClose: () => void;
};

export function FavouriteSearchModal({ open, pinned, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RankedSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pinnedIds = new Set(pinned.map((f) => f.series_id));

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const data = await searchSeries(query.trim(), {
          signal: controller.signal,
        });
        setResults(data.slice(0, 12));
      } catch {
        // cancelled or error — don't clear results
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Search series to pin"
      className="fixed inset-0 z-[1000] flex items-start justify-center px-4 pt-[10vh]"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative flex w-full max-w-lg flex-col rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.2)] dark:border-[#3a3028] dark-theme-shell overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2e2520]">
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white dark:placeholder-slate-500"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#2e2520] dark:hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {!loading && !query.trim() && (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              Start typing to search for a series
            </p>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((s) => {
                const alreadyPinned = pinnedIds.has(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={alreadyPinned}
                      onClick={() => {
                        if (!alreadyPinned) onSelect(s);
                      }}
                      className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors
                        ${
                          alreadyPinned
                            ? "cursor-default opacity-40"
                            : "hover:bg-slate-50 dark:hover:bg-[#1e1712] cursor-pointer"
                        }`}
                    >
                      {/* Cover thumbnail */}
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-[#2e2520]">
                        {s.cover_url ? (
                          <img
                            src={s.cover_url}
                            alt={s.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                          {s.type ?? ""}
                          {alreadyPinned ? " · Already pinned" : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
