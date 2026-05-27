import { useEffect, useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getMyFavourites,
  replaceMyFavourites,
  removeMyFavourite,
} from "../api/manApi";
import type { FavouriteSeries, RankedSeries } from "../api/manApi";
import { FavouriteSearchModal } from "./FavouriteSearchModal";
import { ConfirmModal } from "./ConfirmModal";

const MAX_SLOTS = 6;

export function FavouritesSection() {
  const [favourites, setFavourites] = useState<FavouriteSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<FavouriteSeries | null>(null);

  useEffect(() => {
    getMyFavourites()
      .then(setFavourites)
      .catch(() => toast.error("Could not load favourites."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(series: RankedSeries) {
    setSearchOpen(false);
    if (favourites.length >= MAX_SLOTS) return;

    const nextIds = [...favourites.map((f) => f.series_id), series.id];
    setSaving(true);
    try {
      const updated = await replaceMyFavourites(nextIds);
      setFavourites(updated);
      toast.success(`"${series.title}" pinned to your profile.`);
    } catch {
      toast.error("Could not save favourite.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    setSaving(true);
    try {
      const updated = await removeMyFavourite(target.series_id);
      setFavourites(updated);
      toast.success(`"${target.title}" removed from favourites.`);
    } catch {
      toast.error("Could not remove favourite.");
    } finally {
      setSaving(false);
    }
  }

  const emptySlots = MAX_SLOTS - favourites.length;
  const canAdd = favourites.length < MAX_SLOTS && !saving;

  return (
    <>
      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Favourites
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pin up to {MAX_SLOTS} series on your profile.
            </p>
          </div>
          {favourites.length > 0 && canAdd && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-[#342b24] dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          )}
        </div>

        {loading ? (
          /* Skeleton */
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Array.from({ length: MAX_SLOTS }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-[18px] bg-slate-100 dark:bg-[#1e1712]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {/* Filled slots */}
            {favourites.map((fav) => (
              <div key={fav.series_id} className="group relative aspect-[2/3]">
                <div className="h-full w-full overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 shadow-sm dark:border-[#2e2520] dark:bg-[#1e1712]">
                  {fav.cover_url ? (
                    <img
                      src={fav.cover_url}
                      alt={fav.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-[#1e1712]">
                      <span className="text-xs text-slate-400 dark:text-slate-600 text-center px-1 leading-tight">
                        {fav.title}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col justify-between rounded-[18px] bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {/* Remove button */}
                    <div className="flex justify-end p-2">
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(fav)}
                        disabled={saving}
                        aria-label={`Remove ${fav.title} from favourites`}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-red-600 disabled:opacity-50"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Title */}
                    <div className="p-2.5 pb-3">
                      <p className="line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow">
                        {fav.title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={() => canAdd && setSearchOpen(true)}
                disabled={!canAdd}
                aria-label="Add a favourite series"
                className="aspect-[2/3] flex flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-slate-200 bg-transparent text-slate-300 transition-all hover:border-blue-400 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2e2520] dark:text-slate-600 dark:hover:border-blue-600 dark:hover:text-blue-500"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Pin
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Search modal */}
      <FavouriteSearchModal
        open={searchOpen}
        pinned={favourites}
        onSelect={handleAdd}
        onClose={() => setSearchOpen(false)}
      />

      {/* Remove confirmation */}
      <ConfirmModal
        open={!!removeTarget}
        title="Remove favourite?"
        message={
          removeTarget
            ? `"${removeTarget.title}" will be removed from your pinned favourites.`
            : ""
        }
        confirmText="Remove"
        destructive
        busy={saving}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
