const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function formatSubmissionAge(
  approvedAt: string | null | undefined,
  now = new Date()
): string | null {
  if (!approvedAt) return null;

  const approvedDate = new Date(approvedAt);
  if (Number.isNaN(approvedDate.getTime())) return null;

  const elapsedDays = Math.max(
    0,
    Math.floor((now.getTime() - approvedDate.getTime()) / DAY_IN_MS)
  );

  if (elapsedDays === 0) return "Approved today";
  if (elapsedDays === 1) return "Approved 1 day ago";
  return `Approved ${elapsedDays} days ago`;
}
