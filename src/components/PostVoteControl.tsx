import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

export type ForumVote = "UPVOTE" | "DOWNVOTE";

type ToggleResult =
  | {
      ok: true;
      viewerVote: ForumVote | null;
      upvoteCount: number;
      downvoteCount: number;
    }
  | { ok: false };

type PostVoteControlProps = {
  initialVote?: ForumVote | null;
  initialUpvotes: number;
  initialDownvotes: number;
  label?: string;
  onVote: (vote: ForumVote | null) => Promise<ToggleResult>;
};

export function PostVoteControl({
  initialVote = null,
  initialUpvotes,
  initialDownvotes,
  label = "Post votes",
  onVote,
}: PostVoteControlProps) {
  const [viewerVote, setViewerVote] = useState<ForumVote | null>(initialVote);
  const [upvoteCount, setUpvoteCount] = useState(initialUpvotes);
  const [downvoteCount, setDownvoteCount] = useState(initialDownvotes);
  const [busyVote, setBusyVote] = useState<ForumVote | null>(null);

  const applyOptimisticVote = (nextVote: ForumVote | null) => {
    const previousVote = viewerVote;
    setViewerVote(nextVote);

    setUpvoteCount((count) => {
      let nextCount = count;
      if (previousVote === "UPVOTE") nextCount -= 1;
      if (nextVote === "UPVOTE") nextCount += 1;
      return Math.max(0, nextCount);
    });

    setDownvoteCount((count) => {
      let nextCount = count;
      if (previousVote === "DOWNVOTE") nextCount -= 1;
      if (nextVote === "DOWNVOTE") nextCount += 1;
      return Math.max(0, nextCount);
    });
  };

  const handleVote = async (vote: ForumVote) => {
    if (busyVote) return;

    const previousVote = viewerVote;
    const previousUpvotes = upvoteCount;
    const previousDownvotes = downvoteCount;
    const nextVote = previousVote === vote ? null : vote;

    setBusyVote(vote);
    applyOptimisticVote(nextVote);

    try {
      const result = await onVote(nextVote);
      if (result.ok) {
        setViewerVote(result.viewerVote);
        setUpvoteCount(result.upvoteCount);
        setDownvoteCount(result.downvoteCount);
      } else {
        setViewerVote(previousVote);
        setUpvoteCount(previousUpvotes);
        setDownvoteCount(previousDownvotes);
      }
    } catch {
      setViewerVote(previousVote);
      setUpvoteCount(previousUpvotes);
      setDownvoteCount(previousDownvotes);
    } finally {
      setBusyVote(null);
    }
  };

  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm shadow-sm dark:border-[#3a3028] dark:bg-[#14100e]"
      aria-label={label}
    >
      <button
        type="button"
        aria-pressed={viewerVote === "UPVOTE"}
        aria-label={`Upvote this post; ${upvoteCount} upvotes`}
        disabled={!!busyVote}
        onClick={() => void handleVote("UPVOTE")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold transition ${
          viewerVote === "UPVOTE"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        } ${busyVote ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        <span className="tabular-nums">{upvoteCount}</span>
      </button>

      <span className="h-6 w-px bg-slate-200 dark:bg-[#3a3028]" aria-hidden="true" />

      <button
        type="button"
        aria-pressed={viewerVote === "DOWNVOTE"}
        aria-label={`Downvote this post; ${downvoteCount} downvotes`}
        disabled={!!busyVote}
        onClick={() => void handleVote("DOWNVOTE")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold transition ${
          viewerVote === "DOWNVOTE"
            ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        } ${busyVote ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <ThumbsDown className="h-4 w-4" aria-hidden="true" />
        <span className="tabular-nums">{downvoteCount}</span>
      </button>
    </div>
  );
}
