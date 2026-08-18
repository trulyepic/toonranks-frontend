import { useState } from "react";
import { Link } from "react-router-dom";
import { createSeries } from "../api/manApi";
import type { Series, SeriesPayload } from "../api/manApi";
import { useUser } from "../login/useUser";
import { isAdminRole } from "../util/roleUtils";
import CoverImageEditor from "./CoverImageEditor";

interface Props {
  onClose: () => void;
}

const fieldClass =
  "dark-theme-field w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 dark:border-[#3a3028] dark:text-stone-100 dark:placeholder:text-stone-500";

const TITLE_COVER_WIDTH = 600;
const TITLE_COVER_HEIGHT = 900;
const TITLE_COVER_MAX_SIZE_KB = 800;

const AddSeriesModal = ({ onClose }: Props) => {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.role);
  const [form, setForm] = useState<Partial<SeriesPayload>>({});
  const [cover, setCover] = useState<File | null>(null);
  const [coverPending, setCoverPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSeries, setSubmittedSeries] = useState<Series | null>(null);
  const canCreateTitle =
    Boolean(form.title && form.genre && form.type && cover) &&
    !coverPending &&
    !loading;

  const handleSubmit = async () => {
    if (!form.title || !form.genre || !form.type) {
      setError("Title, genre, and type are required.");
      return;
    }
    if (!cover) {
      setError("Choose an image, then click Make correct 2:3 cover.");
      return;
    }
    if (coverPending) {
      setError("Finish the cover image before creating the title.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const created = await createSeries({ ...form, cover } as SeriesPayload);
      setSubmittedSeries(created);
    } catch (err) {
      setError("Error adding series.");
      console.error("Error adding series:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="dark-theme-shell max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] dark:border-[#3a3028]">
        {submittedSeries ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-stone-50">
                {isAdmin ? "Title created" : "Title saved"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-stone-300">
                <span className="font-medium text-slate-800 dark:text-stone-100">
                  {submittedSeries.title}
                </span>{" "}
                {isAdmin
                  ? "has been created. Add the title details next to publish the full detail page."
                  : "has been saved. Add the title details next, and that step will submit it for admin review."}
              </p>
            </div>

            {isAdmin ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                Admin titles do not need approval. Once you save the title details, this entry will be available immediately.
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                Contributor titles stay private until the detail step is completed and the submission is sent for admin review.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              {!isAdmin && (
                <Link
                  to="/my-submissions"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-200 dark:hover:bg-[#241d19]"
                >
                  View my submissions
                </Link>
              )}
              <Link
                to={`/series/${submittedSeries.id}`}
                state={{
                  title: submittedSeries.title,
                  genre: submittedSeries.genre,
                  type: submittedSeries.type,
                  author: submittedSeries.author,
                  artist: submittedSeries.artist,
                  approval_status: submittedSeries.approval_status,
                  can_manage_pending_details: true,
                }}
                onClick={onClose}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Add details now
              </Link>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-200 dark:hover:bg-[#241d19]"
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
              Add New Title
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-stone-300">
              Add the core metadata and cover art first. You’ll continue with title details in the next step.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-300 dark:hover:bg-[#241d19]"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/70 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Title"
            className={fieldClass}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Genre"
            className={fieldClass}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
          />
          <input
            type="text"
            placeholder="Author"
            className={fieldClass}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
          <input
            type="text"
            placeholder="Artist"
            className={fieldClass}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
          />
          <select
            className={fieldClass}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as SeriesPayload["type"] })
            }
          >
            <option value="">Select Type</option>
            <option value="MANGA">Manga</option>
            <option value="MANHWA">Manhwa</option>
            <option value="MANHUA">Manhua</option>
          </select>

          <select
            className={fieldClass}
            onChange={(e) =>
              setForm({
                ...form,
                status:
                  e.target.value === ""
                    ? undefined
                    : (e.target.value as SeriesPayload["status"]),
              })
            }
          >
            <option value="">Status (optional)</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETE">Complete</option>
            <option value="HIATUS">Hiatus</option>
            <option value="SEASON_END">Season End</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          <CoverImageEditor
            id="cover-upload"
            label="Cover image"
            helperText={`Use the visible 2:3 guide to frame the cover. The editor exports ${TITLE_COVER_WIDTH}x${TITLE_COVER_HEIGHT}px under ${TITLE_COVER_MAX_SIZE_KB}KB.`}
            aspectLabel="2:3"
            actionLabel="Make correct 2:3 cover"
            outputSuffix="2x3"
            outputWidth={TITLE_COVER_WIDTH}
            outputHeight={TITLE_COVER_HEIGHT}
            maxSizeKB={TITLE_COVER_MAX_SIZE_KB}
            required
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
            disabled={!canCreateTitle}
            onClick={handleSubmit}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create title"}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddSeriesModal;
