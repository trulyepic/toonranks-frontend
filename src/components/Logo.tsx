/**
 * Crisp, resolution-independent "TOON RANKS" wordmark. Replaces the old low-res
 * PNG logo: rendered as styled text (Manrope, loaded site-wide), so it stays
 * sharp at every size and adapts to light/dark themes automatically.
 *
 * Keeps the spirit of the original mark: stacked TOON / RANKS, playful tilt,
 * blue identity — but with a modern gradient instead of a bitmap.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex -rotate-2 select-none flex-col font-display font-extrabold uppercase leading-none ${className}`}
      aria-hidden="true"
    >
      <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-[1.05rem] tracking-[0.08em] text-transparent dark:from-blue-400 dark:via-sky-400 dark:to-cyan-300">
        Toon
      </span>
      <span className="text-[1.05rem] tracking-[0.02em] text-slate-900 dark:text-white">
        Ranks
      </span>
    </span>
  );
}
