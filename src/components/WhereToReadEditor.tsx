import { Plus, X } from "lucide-react";
import type { ReadingLink } from "../types/types";
import { MAX_WHERE_TO_READ_LINKS } from "../util/whereToRead";

const fieldClass =
  "dark-theme-field w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 dark:border-[#3a3028] dark:text-stone-100 dark:placeholder:text-stone-500";

type Props = {
  links: ReadingLink[];
  onChange: (links: ReadingLink[]) => void;
  disabled?: boolean;
};

const WhereToReadEditor = ({ links, onChange, disabled = false }: Props) => {
  const update = (index: number, patch: Partial<ReadingLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-[#3a3028]">
      <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-stone-100">
        Where to read (optional)
      </legend>
      <p className="text-xs text-slate-500 dark:text-stone-400">
        Official platforms only, e.g. WEBTOON, Tapas, Tappytoon. Up to {MAX_WHERE_TO_READ_LINKS}.
      </p>

      <div className="mt-3 space-y-2">
        {links.map((link, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              aria-label={`Site name ${index + 1}`}
              placeholder="Site (e.g. WEBTOON)"
              value={link.site}
              maxLength={40}
              disabled={disabled}
              onChange={(e) => update(index, { site: e.target.value })}
              className={`${fieldClass} sm:w-44 sm:shrink-0`}
            />
            <input
              type="url"
              aria-label={`Link ${index + 1}`}
              placeholder="https://..."
              value={link.url}
              maxLength={500}
              disabled={disabled}
              onChange={(e) => update(index, { url: e.target.value })}
              className={fieldClass}
            />
            <button
              type="button"
              aria-label={`Remove link ${index + 1}`}
              disabled={disabled}
              onClick={() => onChange(links.filter((_, i) => i !== index))}
              className="self-end rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3028] dark:text-stone-300 dark:hover:bg-[#241d19] sm:self-auto"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {links.length < MAX_WHERE_TO_READ_LINKS ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...links, { site: "", url: "" }])}
          className="mt-3 inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3028] dark:text-stone-200 dark:hover:bg-[#241d19]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add link
        </button>
      ) : null}
    </fieldset>
  );
};

export default WhereToReadEditor;
