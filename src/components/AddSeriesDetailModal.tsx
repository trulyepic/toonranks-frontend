import { useState } from "react";
import { createSeriesDetail } from "../api/manApi";
import { useUser } from "../login/useUser";
import { isAdminRole } from "../util/roleUtils";
import CoverImageEditor from "./CoverImageEditor";

const DETAIL_COVER_WIDTH = 600;
const DETAIL_COVER_HEIGHT = 400;
const DETAIL_COVER_MAX_SIZE_KB = 800;

const AddSeriesDetailModal = ({
  seriesId,
  initialSynopsis = "",
  hasExistingDetails = false,
  onClose,
}: {
  seriesId: number;
  initialSynopsis?: string;
  hasExistingDetails?: boolean;
  onClose: () => void;
}) => {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.role);
  const [synopsis, setSynopsis] = useState(initialSynopsis);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPending, setCoverPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMode, setSavedMode] = useState<"created" | "review" | null>(null);
  const canSaveDetails =
    Boolean(synopsis.trim() && (hasExistingDetails || cover)) &&
    !coverPending &&
    !loading;

  const handleSubmit = async () => {
    if (!synopsis.trim()) {
      setError("Synopsis is required.");
      return;
    }

    if (!hasExistingDetails && !cover) {
      setError("Choose an image, then click Make correct wide cover.");
      return;
    }

    if (coverPending) {
      setError("Finish the detail cover image before saving.");
      return;
    }

    const fileSizeKB = cover ? cover.size / 1024 : 0;
    if (cover && fileSizeKB > DETAIL_COVER_MAX_SIZE_KB) {
      setError("Cover image must be less than 800KB.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await createSeriesDetail({
        series_id: seriesId,
        synopsis,
        series_cover: cover,
      });
      if (hasExistingDetails) {
        onClose();
      } else {
        setSavedMode(isAdmin ? "created" : "review");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save detail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="dark-theme-shell max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] dark:border-[#3a3028]">
        {savedMode ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-stone-50">
                {savedMode === "created" ? "Title details saved" : "Submitted for review"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-stone-300">
                {savedMode === "created"
                  ? "The synopsis and wide cover are saved. This title is now available immediately."
                  : "The synopsis and wide cover are complete. This title is now waiting for admin approval."}
              </p>
            </div>

            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                savedMode === "created"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200"
              }`}
            >
              {savedMode === "created"
                ? "No admin approval is needed for this title."
                : "Approved titles become visible in rankings, search, compare, and public detail pages."}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-stone-50">
              {hasExistingDetails ? "Edit title details" : "Add title details"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-stone-300">
              {hasExistingDetails
                ? "Update the synopsis or replace the detail cover for this title."
                : "Add the synopsis and detail cover for this title."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-300 dark:hover:bg-[#241d19]"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/70 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-stone-200">
              Synopsis
            </label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="dark-theme-field h-32 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 dark:border-[#3a3028] dark:text-stone-100 dark:placeholder:text-stone-500"
              placeholder="Enter synopsis..."
            />
          </div>

          <CoverImageEditor
            id={`detail-cover-upload-${seriesId}`}
            label="Detail cover image"
            helperText={`Use the wide guide to frame the detail-page banner. The editor exports ${DETAIL_COVER_WIDTH}x${DETAIL_COVER_HEIGHT}px under ${DETAIL_COVER_MAX_SIZE_KB}KB.${
              hasExistingDetails
                ? " Choose a new image only if you want to replace the current cover."
                : ""
            }`}
            aspectLabel="3:2"
            actionLabel="Make correct wide cover"
            outputSuffix="wide-cover"
            outputWidth={DETAIL_COVER_WIDTH}
            outputHeight={DETAIL_COVER_HEIGHT}
            maxSizeKB={DETAIL_COVER_MAX_SIZE_KB}
            required={!hasExistingDetails}
            onChange={(file) => {
              setCover(file);
              if (file) setError(null);
            }}
            onPendingChange={setCoverPending}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-200 dark:hover:bg-[#241d19]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSaveDetails}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : hasExistingDetails
              ? "Save changes"
              : isAdmin
              ? "Save title details"
              : "Submit for review"}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddSeriesDetailModal;
