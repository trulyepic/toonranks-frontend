/**
 * Module-level cache for the top-10 leaderboard rank map.
 * Both ThreadPage and ForumPage call getTopRankMap() — the fetch
 * only happens once per session regardless of how many pages use it.
 */
import { getLeaderboard } from "../api/manApi";

let cachedRankMap: Record<string, number> | null = null;
let fetchPromise: Promise<Record<string, number>> | null = null;

export async function getTopRankMap(): Promise<Record<string, number>> {
  if (cachedRankMap) return cachedRankMap;
  if (!fetchPromise) {
    fetchPromise = getLeaderboard(1, 10)
      .then((data) => {
        cachedRankMap = Object.fromEntries(
          data.items.map((u) => [u.username, u.rank])
        );
        return cachedRankMap;
      })
      .catch(() => {
        fetchPromise = null; // allow retry on next call
        return {};
      });
  }
  return fetchPromise;
}
