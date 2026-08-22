import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { editSeries, type Series, type SeriesType } from "../api/manApi";
import CoverImageEditor from "./CoverImageEditor";

const TITLE_COVER_WIDTH = 600;
const TITLE_COVER_HEIGHT = 900;
const TITLE_COVER_MAX_SIZE_KB = 800;

type Props = {
  id: number;
  initialData: {
    title: string;
    genre: string;
    type: SeriesType;
    author?: string;
    artist?: string;
    cover_url?: string | null;
    status?:
      | "ONGOING"
      | "COMPLETE"
      | "HIATUS"
      | "UNKNOWN"
      | "SEASON_END"
      | null;
  };
  onClose: () => void;
  onSuccess: (updated: Series) => void;
};

const fieldClass =
  "dark-theme-field w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 dark:border-[#3a3028] dark:text-stone-100 dark:placeholder:text-stone-500";
const selectClass = `${fieldClass} cursor-pointer appearance-none pr-12`;
const selectIconClass =
  "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-stone-300";

const EditSeriesModal = ({ id, initialData, onClose, onSuccess }: Props) => {
  const [form, setForm] = useState({ ...initialData });
  const [cover, setCover] = useState<File | null>(null);
  const [coverPending, setCoverPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.genre || !form.type) {
      setError("Title, genre, and type are required.");
      return;
    }
    if (coverPending) {
      setError("Finish the cover image before saving.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const updated = await editSeries(id, {
        ...form,
        ...(cover ? { cover } : {}),
      });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError("Failed to update series.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const canSave = Boolean(form.title && form.genre && form.type) && !coverPending && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="dark-theme-shell max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] dark:border-[#3a3028]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-stone-50">
              Edit Series
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-stone-300">
              Update the title metadata without leaving the page.
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
            name="title"
            value={form.title}
            onChange={handleChange}
            className={fieldClass}
          />
          <input
            name="genre"
            value={form.genre}
            onChange={handleChange}
            className={fieldClass}
          />
          <input
            name="author"
            value={form.author}
            onChange={handleChange}
            className={fieldClass}
            placeholder="Author"
          />
          <input
            name="artist"
            value={form.artist}
            onChange={handleChange}
            className={fieldClass}
            placeholder="Artist"
          />
          <div className="relative">
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="MANGA">Manga</option>
              <option value="MANHWA">Manhwa</option>
              <option value="MANHUA">Manhua</option>
            </select>
            <ChevronDown className={selectIconClass} aria-hidden="true" />
          </div>

          <div className="relative">
            <select
              name="status"
              value={form.status || ""}
              onChange={(e) => {
                const v = e.target.value as Props["initialData"]["status"];
                setForm((prev) => ({ ...prev, status: v || null }));
              }}
              className={selectClass}
            >
              <option value="">Status (optional)</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETE">Complete</option>
              <option value="HIATUS">Hiatus</option>
              <option value="SEASON_END">Season End</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <ChevronDown className={selectIconClass} aria-hidden="true" />
          </div>

          <CoverImageEditor
            id={`series-cover-upload-${id}`}
            label="Cover image"
            helperText={`Choose a new image only if you want to replace the current cover. The editor exports ${TITLE_COVER_WIDTH}x${TITLE_COVER_HEIGHT}px under ${TITLE_COVER_MAX_SIZE_KB}KB.`}
            aspectLabel="2:3"
            actionLabel="Make correct 2:3 cover"
            outputSuffix="2x3"
            outputWidth={TITLE_COVER_WIDTH}
            outputHeight={TITLE_COVER_HEIGHT}
            maxSizeKB={TITLE_COVER_MAX_SIZE_KB}
            initialImageUrl={initialData.cover_url}
            initialImageName={`${initialData.title}-cover.png`}
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
            disabled={!canSave}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSeriesModal;
