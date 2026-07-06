import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Crown, Star } from "lucide-react";
import type { RankedSeries } from "../api/manApi";
import { formatScore } from "../util/formatScore";

// Podium tints — mirror the mobile app's gold/silver/bronze rank treatment.
const NUMERAL_TINT: Record<number, string> = {
  1: "text-amber-300",
  2: "text-slate-200",
  3: "text-orange-300",
};

const AUTO_ADVANCE_MS = 4500;
const AUTO_RESUME_MS = 7000;

/**
 * Home / type-page "Top 10" showcase — a horizontally scrolling band of the
 * highest-ranked series. Rendered from data already present in the page (no
 * extra fetch), so it's in the SSR HTML for LCP and adds no SEO/CLS cost:
 * every series here also appears in the full grid below.
 *
 * Interactivity (client-only, attaches on mount): auto-advances on its own,
 * pauses on hover/touch, and shows prev/next arrows on desktop. Auto-advance
 * is disabled for reduced-motion users.
 */
export default function HomeTopTen({
  items,
  title = "Top 10",
}: {
  items: RankedSeries[];
  title?: string;
}) {
  const top = items.slice(0, 10);
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const lastInteract = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  const scrollByCards = useCallback(
    (dir: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const card = el.querySelector("li");
      const step = card ? (card as HTMLElement).offsetWidth + 12 : el.clientWidth * 0.8;
      el.scrollBy({ left: dir * step, behavior: "smooth" });
    },
    []
  );

  // Auto-advance: drift to the next card, loop to start at the end. Pauses
  // while the user is interacting (tracked via lastInteract), and never runs
  // for reduced-motion users.
  useEffect(() => {
    if (top.length < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      if (Date.now() - lastInteract.current < AUTO_RESUME_MS) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 8;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByCards(1);
      }
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [top.length, scrollByCards]);

  const markInteract = () => {
    lastInteract.current = Date.now();
  };

  if (top.length < 3) return null; // not enough to make a showcase

  return (
    <section className="mb-4" aria-label={`${title} highest rated`}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          {title}
        </h2>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Community ranked
        </span>
      </div>

      <div
        className="group/car relative"
        onMouseEnter={markInteract}
        onPointerDown={markInteract}
        onTouchStart={markInteract}
      >
        {/* Desktop arrows — hidden on touch-first small screens. */}
        {canLeft && (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => {
              markInteract();
              scrollByCards(-1);
            }}
            className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-white sm:block dark:bg-[#241d19]/90 dark:text-slate-200 dark:ring-[#3a3028]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => {
              markInteract();
              scrollByCards(1);
            }}
            className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-white sm:block dark:bg-[#241d19]/90 dark:text-slate-200 dark:ring-[#3a3028]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <ul
          ref={scrollerRef}
          onScroll={updateArrows}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
        >
          {top.map((item, index) => {
            const rank = index + 1;
            return (
              <li key={item.id} className="snap-start">
                <Link
                  to={`/series/${item.id}`}
                  state={{ title: item.title, genre: item.genre, type: item.type }}
                  className="group relative block w-[42vw] max-w-[210px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.6)] dark:border-[#3a3028] dark:bg-[#241d19] sm:w-[190px]"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden">
                    <img
                      src={item.cover_url}
                      alt={`Cover for ${item.title}`}
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    <div className="absolute bottom-14 left-2 flex items-end">
                      {rank === 1 && (
                        <Crown
                          className="tr-crown mr-1 h-6 w-6 text-amber-300 drop-shadow"
                          fill="currentColor"
                          strokeWidth={1.5}
                        />
                      )}
                      <span
                        className={`font-display text-5xl font-extrabold leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] ${
                          NUMERAL_TINT[rank] ?? "text-white/90"
                        }`}
                      >
                        {rank}
                      </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <h3
                        className="line-clamp-2 text-sm font-semibold text-white"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/25">
                          <Star
                            className="h-3 w-3"
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          {formatScore(item.final_score, 3)}
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
