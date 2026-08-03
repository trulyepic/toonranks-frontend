import React from "react";
import ShimmerBox from "./ShimmerBox";

export const ListHeaderShimmer: React.FC = () => (
  <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm dark-theme-shell">
    <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-[#342a23] dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_28%),linear-gradient(180deg,_rgba(38,31,27,0.94),_rgba(30,24,21,0.92))]">
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <ShimmerBox className="h-5 w-5 rounded" />
          <ShimmerBox className="h-6 w-48 rounded" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShimmerBox className="h-6 w-20 rounded-full" />
          <ShimmerBox className="h-6 w-24 rounded-full" />
          <ShimmerBox className="h-4 w-16 rounded" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ShimmerBox className="h-10 w-20 rounded-xl" />
        <ShimmerBox className="h-10 w-28 rounded-xl" />
        <ShimmerBox className="h-10 w-28 rounded-xl" />
        <ShimmerBox className="h-10 w-24 rounded-xl" />
      </div>
    </div>
    <div className="px-4 py-4">
      <ItemRowShimmer />
      <ItemRowShimmer />
    </div>
  </div>
);

export const ItemRowShimmer: React.FC = () => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)] dark-theme-card">
    <div className="relative shrink-0">
      <ShimmerBox className="h-24 w-16 rounded-2xl" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <ShimmerBox className="h-5 w-48 rounded" />
        <ShimmerBox className="hidden h-5 w-16 rounded md:inline-block" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ShimmerBox className="h-7 w-20 rounded-full" />
        <ShimmerBox className="h-7 w-20 rounded-full" />
        <ShimmerBox className="h-7 w-24 rounded-full" />
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark-theme-card-soft">
        <ShimmerBox className="h-4 w-24 rounded" />
        <ShimmerBox className="mt-3 h-10 w-32 rounded-xl" />
      </div>
    </div>
    <ShimmerBox className="h-10 w-20 rounded-xl" />
  </div>
);

export const ItemRowsShimmerBlock: React.FC<{ count?: number }> = ({
  count = 6,
}) => (
  <ul className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <li key={i}>
        <ItemRowShimmer />
      </li>
    ))}
  </ul>
);

/**
 * Loading skeleton for the PUBLIC shared-list page (/lists/:token), matching
 * that page's three share layouts so the placeholders have the same shape and
 * grid as the content that replaces them (no layout jump). The row shimmers
 * above belong to the owner's My Lists page, not here.
 */
export const SharedListShimmerBlock: React.FC<{
  layout?: "cards" | "poster" | "compact";
  count?: number;
}> = ({ layout = "cards", count = 6 }) => {
  if (layout === "compact") {
    return (
      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-4 rounded-[22px] border border-slate-200 bg-white/90 p-3 dark:border-[#342a23] dark:bg-[#15110f]/90"
          >
            <ShimmerBox className="h-24 w-full rounded-2xl" />
            <div className="min-w-0 space-y-2">
              <div className="flex gap-2">
                <ShimmerBox className="h-5 w-14 rounded-full" />
                <ShimmerBox className="h-5 w-16 rounded-full" />
              </div>
              <ShimmerBox className="h-5 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (layout === "poster") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <ShimmerBox key={i} className="aspect-[2/3] w-full rounded-[26px]" />
        ))}
      </div>
    );
  }

  // cards (default share layout)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 dark:border-[#342a23] dark:bg-[#15110f]/90"
        >
          <ShimmerBox className="aspect-[2/3] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <ShimmerBox className="h-6 w-3/4 rounded" />
            <ShimmerBox className="h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
