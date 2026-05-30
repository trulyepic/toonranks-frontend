/**
 * Returns true when a post's updatedAt is meaningfully later than createdAt.
 * A 10-second buffer covers server-side flush timing differences.
 */
export function wasEdited(createdAt: string, updatedAt: string): boolean {
  const diff = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  return diff > 10_000;
}
