// export type SeriesType = "MANGA" | "MANHWA" | "MANHUA";
// export type SeriesStatus = "ONGOING" | "COMPLETE" | "HIATUS" | "UNKNOWN" | null;

// export interface Series {
//   id: number;
//   title: string;
//   genre: string;
//   type: SeriesType;
//   cover_url: string;
//   vote_count: number;
//   author?: string;
//   artist?: string;
//   status?: SeriesStatus;
// }

// export interface SeriesPayload {
//   title: string;
//   genre: string;
//   type: SeriesType;
//   cover: File;
//   author?: string;
//   artist?: string;
//   status?: Exclude<SeriesStatus, null>;
// }

// export interface SeriesDetailPayload {
//   series_id: number;
//   synopsis: string;
//   series_cover: File;
// }

// export interface RankedSeries {
//   id: number;
//   title: string;
//   genre: string;
//   type: SeriesType;
//   cover_url: string;
//   vote_count: number;
//   final_score: number;
//   rank: number | null;
//   author?: string;
//   artist?: string;
//   status?: SeriesStatus;
// }

// // ---------- Reading List Types ----------
// export interface ReadingListItem {
//   series_id: number;
// }

// export interface ReadingList {
//   id: number;
//   name: string;
//   items: ReadingListItem[];
// }

// // Small helper for auth headers
// // Small helper for auth headers (no union types)
// const authHeaders = (): HeadersInit => {
//   const token = localStorage.getItem("token");
//   const headers: Record<string, string> = {};
//   if (token) headers.Authorization = `Bearer ${token}`;
//   return headers;
// };

// const BASE_URL = "http://localhost:8000";
// // const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

// export const createSeries = async (data: SeriesPayload): Promise<Series> => {
//   const formData = new FormData();
//   formData.append("title", data.title);
//   formData.append("genre", data.genre);
//   formData.append("type", data.type);
//   formData.append("cover", data.cover);
//   formData.append("author", data.author || "");
//   formData.append("artist", data.artist || "");

//   if (data.status) formData.append("status", data.status);

//   const response = await fetch(`${BASE_URL}/series/`, {
//     method: "POST",
//     body: formData,
//   });

//   if (!response.ok) {
//     throw new Error("Failed to create series");
//   }

//   return (await response.json()) as Series;
// };

// export const fetchSeries = async (): Promise<Series[]> => {
//   const response = await fetch(`${BASE_URL}/series/`);
//   if (!response.ok) throw new Error("Failed to fetch series");
//   return (await response.json()) as Series[];
// };

// export const deleteSeries = async (id: number): Promise<void> => {
//   const response = await fetch(`${BASE_URL}/series/${id}`, {
//     method: "DELETE",
//   });

//   if (!response.ok) {
//     throw new Error("Failed to delete series");
//   }
// };

// // ----- Auth API -----

// export const login = async (credentials: {
//   username: string;
//   password: string;
//   captcha_token: string;
// }) => {
//   const response = await fetch(`${BASE_URL}/auth/login`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(credentials),
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(
//       `${response.status}: ${errorData.detail || "Login failed"}`
//     );
//   }

//   const data = await response.json();
//   localStorage.setItem("token", data.access_token);
//   localStorage.setItem("user", JSON.stringify(data.user));
//   return data;
// };

// // export const signup = async (credentials: {
// //   username: string;
// //   password: string;
// // }) => {
// //   const response = await fetch(`${BASE_URL}/auth/signup`, {
// //     method: "POST",
// //     headers: { "Content-Type": "application/json" },
// //     body: JSON.stringify(credentials),
// //   });

// //   if (!response.ok) throw new Error(`${response.status}: Signup failed`);
// // };
// export const signup = async (credentials: {
//   username: string;
//   password: string;
//   email: string;
//   captcha_token: string;
// }): Promise<{ message: string; token: string }> => {
//   const response = await fetch(`${BASE_URL}/auth/signup`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(credentials),
//   });

//   if (!response.ok) throw new Error(`${response.status}: Signup failed`);

//   return await response.json();
// };

// export const addSeriesDetail = async (
//   seriesId: number,
//   payload: { synopsis: string; cover: File }
// ) => {
//   const formData = new FormData();
//   formData.append("series_id", String(seriesId));
//   formData.append("synopsis", payload.synopsis);
//   formData.append("cover", payload.cover);

//   const token = localStorage.getItem("token");

//   const response = await fetch(`${BASE_URL}/series/${seriesId}/details`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//     body: formData,
//   });

//   if (!response.ok) throw new Error("Failed to add series details");

//   return await response.json();
// };

// export const createSeriesDetail = async (
//   data: SeriesDetailPayload
// ): Promise<void> => {
//   const formData = new FormData();
//   formData.append("series_id", String(data.series_id));
//   formData.append("synopsis", data.synopsis);
//   formData.append("file", data.series_cover);

//   const token = localStorage.getItem("token");

//   const response = await fetch(`${BASE_URL}/series-details/`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//     body: formData,
//   });

//   if (!response.ok) {
//     throw new Error("Failed to create series details");
//   }
// };

// export const getSeriesDetailById = async (seriesId: number) => {
//   const token = localStorage.getItem("token");
//   const res = await fetch(`${BASE_URL}/series-details/${seriesId}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
//   if (!res.ok) throw new Error("Failed to fetch series detail");
//   return res.json();
// };

// export const voteOnSeries = async (
//   seriesId: number,
//   category: string,
//   score: number
// ): Promise<void> => {
//   const token = localStorage.getItem("token");
//   const formData = new FormData();
//   formData.append("category", category);
//   formData.append("score", String(score));

//   const res = await fetch(`${BASE_URL}/series-details/${seriesId}/vote`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//     body: formData,
//   });

//   if (!res.ok) throw new Error("Voting failed");
// };

// export const fetchRankedSeries = async (): Promise<RankedSeries[]> => {
//   const response = await fetch(`${BASE_URL}/series/rankings`);
//   if (!response.ok) throw new Error("Failed to fetch ranked series");
//   return await response.json();
// };

// export const fetchRankedSeriesPaginated = async (
//   page: number,
//   size: number,
//   type?: string,
//   signal?: AbortSignal // ✅ Optional
// ): Promise<RankedSeries[]> => {
//   const typeQuery = type ? `&type=${type}` : "";
//   const response = await fetch(
//     `${BASE_URL}/series/rankings?page=${page}&page_size=${size}${typeQuery}`,
//     { signal } // ✅ Safe even if signal is undefined
//   );
//   if (!response.ok) throw new Error("Failed to fetch ranked series");
//   return await response.json();
// };

// export const editSeries = async (
//   id: number,
//   data: Partial<{
//     title: string;
//     genre: string;
//     type: SeriesType;
//     author: string;
//     artist: string;
//   }>
// ) => {
//   const response = await fetch(`${BASE_URL}/${id}`, {
//     method: "PUT",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(data),
//   });

//   if (!response.ok) {
//     throw new Error("Failed to update series");
//   }

//   return await response.json();
// };

// export const searchSeries = async (query: string): Promise<RankedSeries[]> => {
//   const response = await fetch(
//     `${BASE_URL}/series/search?query=${encodeURIComponent(query)}`
//   );
//   if (!response.ok) throw new Error("Search failed");
//   return await response.json();
// };

// // Utility for accessing user
// export const getCurrentUser = () => {
//   const user = localStorage.getItem("user");
//   return user ? JSON.parse(user) : null;
// };

// export const logout = () => {
//   localStorage.removeItem("token");
//   localStorage.removeItem("user");
// };

// export const verifyEmail = async (token: string): Promise<string> => {
//   const response = await fetch(`${BASE_URL}/auth/verify-email?token=${token}`);
//   if (!response.ok) {
//     throw new Error(await response.text());
//   }
//   const data = await response.json();
//   return data.message;
// };

// export const googleOAuthLogin = async (token: string) => {
//   const response = await fetch(`${BASE_URL}/auth/google-oauth`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ token }),
//   });

//   if (!response.ok) throw new Error("Google OAuth login failed");

//   return await response.json();
// };

// // ---------- Reading List API ----------

// // GET /reading-lists/me
// export const getMyReadingLists = async (): Promise<ReadingList[]> => {
//   const res = await fetch(`${BASE_URL}/reading-lists/me`, {
//     headers: { ...authHeaders() },
//   });
//   if (!res.ok) throw new Error("Failed to fetch reading lists");
//   return res.json();
// };

// // POST /reading-lists  { name }
// export const createReadingList = async (name: string): Promise<ReadingList> => {
//   const res = await fetch(`${BASE_URL}/reading-lists`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...authHeaders(),
//     },
//     body: JSON.stringify({ name }),
//   });

//   // surfaces the “max 2 lists” rule from backend
//   if (!res.ok) {
//     const data = await res.json().catch(() => ({}));
//     throw new Error(data.detail || "Failed to create reading list");
//   }

//   return res.json();
// };

// // POST /reading-lists/:list_id/items  { series_id }
// export const addSeriesToReadingList = async (
//   listId: number,
//   seriesId: number
// ): Promise<ReadingList> => {
//   const res = await fetch(`${BASE_URL}/reading-lists/${listId}/items`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...authHeaders(),
//     },
//     body: JSON.stringify({ series_id: seriesId }),
//   });
//   if (!res.ok) {
//     const data = await res.json().catch(() => ({}));
//     throw new Error(data.detail || "Failed to add series to list");
//   }
//   return res.json();
// };

// // DELETE /reading-lists/:list_id/items/:series_id
// export const removeSeriesFromReadingList = async (
//   listId: number,
//   seriesId: number
// ): Promise<ReadingList> => {
//   const res = await fetch(
//     `${BASE_URL}/reading-lists/${listId}/items/${seriesId}`,
//     {
//       method: "DELETE",
//       headers: { ...authHeaders() },
//     }
//   );
//   if (!res.ok) {
//     const data = await res.json().catch(() => ({}));
//     throw new Error(data.detail || "Failed to remove series from list");
//   }
//   return res.json();
// };

// // DELETE /reading-lists/:list_id
// export const deleteReadingList = async (listId: number): Promise<void> => {
//   const res = await fetch(`${BASE_URL}/reading-lists/${listId}`, {
//     method: "DELETE",
//     headers: { ...authHeaders() },
//   });
//   if (!res.ok) {
//     const data = await res.json().catch(() => ({}));
//     throw new Error(data.detail || "Failed to delete reading list");
//   }
// };

// export const getSeriesSummary = async (
//   seriesId: number
// ): Promise<RankedSeries> => {
//   const res = await fetch(`${BASE_URL}/series/summary/${seriesId}`);
//   if (!res.ok) throw new Error("Failed to fetch series summary");
//   return res.json();
// };

// src/api/manApi.ts
import type { AvatarFields, AvatarPreset, SeriesDetailData } from "../types/types";
import { api } from "./client"; // <-- your shared Axios instance
import { isAxiosError } from "axios";

// ---------- Types ----------
export type SeriesType = "MANGA" | "MANHWA" | "MANHUA";
export type SeriesStatus =
  | "ONGOING"
  | "COMPLETE"
  | "HIATUS"
  | "UNKNOWN"
  | "SEASON_END"
  | null;
export type IssueType = "BUG" | "FEATURE" | "CONTENT" | "OTHER";
// export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "FIXED" | "WONT_FIX";

type ApiErrorDetail = string | { code?: string; message?: string };
type ApiErrorData =
  | {
      detail?: ApiErrorDetail;
      code?: string;
      message?: string;
    }
  | undefined;

export type ForumSeriesRef = {
  series_id: number;
  title?: string;
  cover_url?: string;
  type?: string;
  status?: string;
};
export type ForumThread = {
  id: number;
  title: string;
  author_username?: string | null;
  author_role?: UserRole | null;
  author_avatar_url?: string | null;
  author_avatar_preset?: AvatarPreset | null;
  created_at: string;
  updated_at: string;
  post_count: number;
  last_post_at: string;
  series_refs: ForumSeriesRef[];
  locked?: boolean;
  latest_first?: boolean;
};
export type ForumPost = {
  id: number;
  thread_id?: number;
  author_username?: string | null;
  author_role?: UserRole | null;
  author_avatar_url?: string | null;
  author_avatar_preset?: AvatarPreset | null;
  content_markdown: string;
  created_at: string;
  updated_at: string;
  series_refs: ForumSeriesRef[];
  parent_id?: number | null;
  upvote_count?: number;
  downvote_count?: number;
  viewer_vote?: "UPVOTE" | "DOWNVOTE" | null;
  heart_count?: number;
  viewer_has_hearted?: boolean;
};

export interface Issue {
  id: number;
  type: IssueType;
  title: string;
  description: string;
  page_url?: string | null;
  email?: string | null;
  screenshot_url?: string | null;
  user_id?: number | null;
  user_agent?: string | null;
  status: IssueStatus; // <-- make sure your backend includes this
  created_at: string; // ISO string
}

export interface Series {
  id: number;
  title: string;
  genre: string;
  type: SeriesType;
  cover_url: string;
  vote_count: number;
  author?: string;
  artist?: string;
  status?: SeriesStatus;
  approval_status?: string | null;
}

export interface SeriesPayload {
  title: string;
  genre: string;
  type: SeriesType;
  cover: File;
  author?: string;
  artist?: string;
  status?: Exclude<SeriesStatus, null>;
}

export interface SeriesDetailPayload {
  series_id: number;
  synopsis: string;
  series_cover?: File | null;
}

export interface RankedSeries {
  id: number;
  title: string;
  genre: string;
  type: SeriesType;
  cover_url: string;
  vote_count: number;
  final_score: number;
  rank: number | null;
  author?: string;
  artist?: string;
  status?: SeriesStatus;
  approval_status?: string | null;
}

export interface PendingSeries extends Series {
  submitted_by_id?: number | null;
  submitted_by_username?: string | null;
  approved_by_id?: number | null;
  approved_at?: string | null;
  detail_ready?: boolean;
}

// ---------- Reading List Types ----------
export interface ReadingListItem {
  series_id: number;
  left_off_chapter?: string | null;
}

export interface ReadingList {
  id: number;
  name: string;
  is_public: boolean;
  share_token: string;
  items: ReadingListItem[];
}

// ---------- Auth Types ----------
export type UserRole = "ADMIN" | "GENERAL" | "CONTRIBUTOR" | (string & {});
export interface AuthUser extends AvatarFields {
  id: number;
  username: string;
  email?: string | null;
  role?: UserRole | null;
}
export interface AdminUser extends AuthUser {
  is_verified: boolean;
}
export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}
export interface MobileAuthCodeResponse {
  code: string;
  expires_in: number;
  redirect_url: string;
}
export type UserAvatar = Pick<AuthUser, "id" | "username" | "role"> &
  Required<Pick<AvatarFields, "avatar_preset">> &
  Pick<AvatarFields, "avatar_url">;

export type UpdateThreadResponse = {
  thread: ForumThread;
  first_post: ForumPost | null;
};

// export type Paginated<T> = {
//   items: T[];
//   page: number;
//   page_size: number;
//   total: number;
//   has_more: boolean;
// };

export type Paginated<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  // new fields (standard pagination)
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
  // legacy field kept for compatibility if you used it elsewhere
  has_more?: boolean;
};

export type ReadingListPreview = {
  id: number;
  name: string;
  is_public: boolean;
  share_token: string;
  item_count: number;
};

export type ThreadPostsPage = {
  thread: ForumThread;
  posts: ForumPost[]; // OP first
  page: number;
  page_size: number;
  total_top_level: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
};

// ---------- Small helpers ----------
function extractApiDetail(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as unknown;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const detail = obj["detail"];
      if (typeof detail === "string") return detail;
      const message = obj["message"];
      if (typeof message === "string") return message;
    }
    return err.message ?? fallback;
  }
  return fallback;
}

function retryAfterSeconds(err: unknown): number | null {
  if (isAxiosError(err)) {
    const ra = err.response?.headers?.["retry-after"];
    if (!ra) return null;
    const n = Number(ra);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isAuthUser(x: unknown): x is AuthUser {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return typeof obj["id"] === "number" && typeof obj["username"] === "string";
}

// ---------- Series CRUD ----------
export const createSeries = async (data: SeriesPayload): Promise<Series> => {
  const form = new FormData();
  form.append("title", data.title);
  form.append("genre", data.genre);
  form.append("type", data.type);
  form.append("cover", data.cover);
  if (data.author) form.append("author", data.author);
  if (data.artist) form.append("artist", data.artist);
  if (data.status) form.append("status", data.status);

  const res = await api.post<Series>("/series/", form);
  return res.data;
};

export const getPendingSeries = async (): Promise<PendingSeries[]> => {
  const res = await api.get<PendingSeries[]>("/series/pending");
  return res.data;
};

export const getMySubmittedSeries = async (): Promise<PendingSeries[]> => {
  const res = await api.get<PendingSeries[]>("/series/submissions/mine");
  return res.data;
};

export const approveSeries = async (seriesId: number): Promise<Series> => {
  const res = await api.post<Series>(`/series/${seriesId}/approve`);
  return res.data;
};

export const fetchSeries = async (): Promise<Series[]> => {
  const res = await api.get<Series[]>("/series/");
  return res.data;
};

export const deleteSeries = async (id: number): Promise<void> => {
  await api.delete(`/series/${id}`);
};

export const editSeries = async (
  id: number,
  data: Partial<{
    title: string;
    genre: string;
    type: SeriesType;
    author: string;
    artist: string;
    cover: File;
    status: SeriesStatus;
  }>
): Promise<Series> => {
  const form = new FormData();
  if (data.title !== undefined) form.append("title", data.title);
  if (data.genre !== undefined) form.append("genre", data.genre);
  if (data.type !== undefined) form.append("type", data.type);
  if (data.author !== undefined) form.append("author", data.author);
  if (data.artist !== undefined) form.append("artist", data.artist);
  if (data.status !== undefined && data.status !== null) {
    form.append("status", data.status);
  }
  if (data.cover instanceof File) {
    form.append("cover", data.cover);
  }

  const res = await api.put<Series>(`/series/${id}`, form);
  return res.data;
};

// ---------- Auth ----------
export const login = async (credentials: {
  username: string;
  password: string;
  captcha_token: string;
}): Promise<AuthResponse> => {
  try {
    const res = await api.post<AuthResponse>("/auth/login", credentials);

    // persist like before
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    return res.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      const status = err.response?.status ?? 0;

      // Safely derive a detail string without using `any`
      const data = err.response?.data;
      let detail = "Login failed";
      if (data && typeof data === "object") {
        const maybe = data as { detail?: unknown; message?: unknown };
        if (typeof maybe.detail === "string") detail = maybe.detail;
        else if (typeof maybe.message === "string") detail = maybe.message;
        else if (typeof err.message === "string") detail = err.message;
      } else if (typeof err.message === "string") {
        detail = err.message;
      }

      // Re-throw in the "STATUS: detail" format your LoginPage expects
      throw new Error(`${status}:${detail}`);
    }

    // Non-Axios errors
    throw err instanceof Error ? err : new Error("Login failed");
  }
};

export const signup = async (payload: {
  username: string;
  password: string;
  email: string;
  captcha_token: string;
}): Promise<{ message: string; token: string }> => {
  // Normalize before sending
  const body = {
    username: payload.username.trim(),
    password: payload.password,
    email: payload.email.trim().toLowerCase(),
    captcha_token: payload.captcha_token,
  };

  try {
    const res = await api.post<{ message: string; token: string }>(
      "/auth/signup",
      body
    );
    return res.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      const status = err.response?.status ?? 0;

      // Derive a readable detail without `any`
      const data = err.response?.data;
      let detail = "Signup failed";
      if (data && typeof data === "object") {
        const maybe = data as { detail?: unknown; message?: unknown };
        if (typeof maybe.detail === "string") detail = maybe.detail;
        else if (typeof maybe.message === "string") detail = maybe.message;
        else if (typeof err.message === "string") detail = err.message;
      } else if (typeof err.message === "string") {
        detail = err.message;
      }

      // Re-throw like login: "409: Email already exists", etc.
      throw new Error(`${status}:${detail}`);
    }

    throw err instanceof Error ? err : new Error("Signup failed");
  }
};

export const googleOAuthLogin = async (
  token: string
): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/google-oauth", { token });

  // Keep existing behavior: persist token + user here
  localStorage.setItem("token", res.data.access_token);
  localStorage.setItem("user", JSON.stringify(res.data.user));
  return res.data;
};

export const createMobileAuthCode = async (payload: {
  redirect_uri: string;
  state?: string | null;
}): Promise<MobileAuthCodeResponse> => {
  const res = await api.post<MobileAuthCodeResponse>("/auth/mobile-code", {
    redirect_uri: payload.redirect_uri,
    state: payload.state ?? null,
  });
  return res.data;
};

export const verifyEmail = async (token: string): Promise<string> => {
  const res = await api.get<{ message: string }>("/auth/verify-email", {
    params: { token },
  });
  return res.data.message;
};

export const resendVerificationEmail = async (payload: {
  email?: string;
  username?: string;
  captcha_token?: string;
}): Promise<{ message: string }> => {
  const res = await api.post<{ message: string }>(
    "/auth/resend-verification",
    payload
  );
  return res.data;
};

export const forgotPassword = async (payload: {
  email: string;
  captcha_token?: string;
}): Promise<{ message: string }> => {
  try {
    const res = await api.post<{ message: string }>("/auth/forgot-password", {
      email: payload.email.trim().toLowerCase(),
      captcha_token: payload.captcha_token || undefined,
    });
    return res.data;
  } catch (err: unknown) {
    const detail = extractApiDetail(
      err,
      "Unable to send reset link. Please try again."
    );
    throw new Error(detail);
  }
};

export const resetPassword = async (payload: {
  token: string;
  password: string;
}): Promise<{ message: string }> => {
  try {
    const res = await api.post<{ message: string }>("/auth/reset-password", {
      token: payload.token,
      password: payload.password,
    });
    return res.data;
  } catch (err: unknown) {
    const detail = extractApiDetail(
      err,
      "Reset link is invalid or expired. Please request a new link."
    );
    throw new Error(detail);
  }
};

export const uploadMyAvatar = async (file: File): Promise<UserAvatar> => {
  const form = new FormData();
  form.append("file", file);

  const res = await api.post<UserAvatar>("/auth/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const selectMyAvatarPreset = async (
  avatar_preset: AvatarPreset
): Promise<UserAvatar> => {
  const res = await api.patch<UserAvatar>("/auth/me/avatar/preset", {
    avatar_preset,
  });
  return res.data;
};

export const resetMyAvatar = async (): Promise<UserAvatar> => {
  const res = await api.delete<UserAvatar>("/auth/me/avatar");
  return res.data;
};

export const mergeStoredAuthUser = (
  fields: Partial<AvatarFields>
): AuthUser | null => {
  const current = getCurrentUser();
  if (!current) return null;

  const next = { ...current, ...fields };
  localStorage.setItem("user", JSON.stringify(next));
  return next;
};

// ---------- Series Details / Voting ----------
export const addSeriesDetail = async (
  seriesId: number,
  payload: { synopsis: string; cover: File }
): Promise<unknown> => {
  const form = new FormData();
  form.append("series_id", String(seriesId));
  form.append("synopsis", payload.synopsis);
  form.append("cover", payload.cover);

  const res = await api.post(`/series/${seriesId}/details`, form);
  return res.data; // unknown until backend shape is finalized
};

export const createSeriesDetail = async (
  data: SeriesDetailPayload
): Promise<void> => {
  const form = new FormData();
  form.append("series_id", String(data.series_id));
  form.append("synopsis", data.synopsis);
  // Backend previously expected "file" here — keep this for compatibility
  if (data.series_cover) {
    form.append("file", data.series_cover);
  }

  await api.post("/series-details/", form);
};

export const getSeriesDetailById = async (
  seriesId: number
): Promise<SeriesDetailData> => {
  const res = await api.get<SeriesDetailData>(`/series-details/${seriesId}`);
  return res.data; // unknown until you define a SeriesDetail shape
};

export const voteOnSeries = async (
  seriesId: number,
  category: string,
  score: number
): Promise<void> => {
  const form = new FormData();
  form.append("category", category);
  form.append("score", String(score));

  await api.post(`/series-details/${seriesId}/vote`, form);
};

// ---------- Rankings / Search ----------
export const fetchRankedSeries = async (): Promise<RankedSeries[]> => {
  const res = await api.get<RankedSeries[]>("/series/rankings");
  return res.data;
};

export const fetchRankedSeriesPaginated = async (
  page: number,
  size: number,
  type?: string,
  signal?: AbortSignal
): Promise<RankedSeries[]> => {
  const res = await api.get<RankedSeries[]>("/series/rankings", {
    params: {
      page,
      page_size: size,
      ...(type ? { type } : {}),
    },
    signal, // Axios v1 supports AbortController signals
  });
  return res.data;
};

export const searchSeries = async (
  query: string,
  signal?: AbortSignal
): Promise<RankedSeries[]> => {
  const res = await api.get<RankedSeries[]>("/series/search", {
    params: { query },
    signal, // <-- now cancellable
  });
  return res.data;
};

export const getSeriesSummary = async (
  seriesId: number
): Promise<RankedSeries> => {
  const res = await api.get<RankedSeries>(`/series/summary/${seriesId}`);
  return res.data;
};

// ---------- Reading Lists ----------
export const getMyReadingLists = async (): Promise<ReadingList[]> => {
  const res = await api.get<ReadingList[]>("/reading-lists/me");
  return res.data;
};

export const createReadingList = async (name: string): Promise<ReadingList> => {
  try {
    const res = await api.post<ReadingList>("/reading-lists", { name });
    return res.data;
  } catch (err: unknown) {
    const detail = extractApiDetail(err, "Failed to create reading list");
    throw new Error(detail);
  }
};

export const addSeriesToReadingList = async (
  listId: number,
  seriesId: number,
  leftOffChapter?: string | null
): Promise<ReadingList> => {
  try {
    const res = await api.post<ReadingList>(`/reading-lists/${listId}/items`, {
      series_id: seriesId,
      left_off_chapter: leftOffChapter ?? null,
    });
    return res.data;
  } catch (err: unknown) {
    const detail = extractApiDetail(err, "Failed to add series to list");
    throw new Error(detail);
  }
};

export const removeSeriesFromReadingList = async (
  listId: number,
  seriesId: number
): Promise<ReadingList> => {
  try {
    const res = await api.delete<ReadingList>(
      `/reading-lists/${listId}/items/${seriesId}`
    );
    return res.data;
  } catch (err: unknown) {
    const detail = extractApiDetail(err, "Failed to remove series from list");
    throw new Error(detail);
  }
};

export const updateReadingListItem = async (
  listId: number,
  seriesId: number,
  leftOffChapter?: string | null
): Promise<ReadingList> => {
  try {
    const res = await api.patch<ReadingList>(
      `/reading-lists/${listId}/items/${seriesId}`,
      {
        left_off_chapter: leftOffChapter ?? null,
      }
    );
    return res.data;
  } catch (err: unknown) {
    if (
      isAxiosError(err) &&
      (err.response?.status === 404 || err.response?.status === 405)
    ) {
      try {
        const res = await api.post<ReadingList>(`/reading-lists/${listId}/items`, {
          series_id: seriesId,
          left_off_chapter: leftOffChapter ?? null,
        });
        return res.data;
      } catch (fallbackErr: unknown) {
        const detail = extractApiDetail(
          fallbackErr,
          "Failed to update reading progress"
        );
        throw new Error(detail);
      }
    }
    const detail = extractApiDetail(err, "Failed to update reading progress");
    throw new Error(detail);
  }
};

export const deleteReadingList = async (listId: number): Promise<void> => {
  try {
    await api.delete(`/reading-lists/${listId}`);
  } catch (err: unknown) {
    const detail = extractApiDetail(err, "Failed to delete reading list");
    throw new Error(detail);
  }
};

// ---------- Session helpers ----------
export const getCurrentUser = (): AuthUser | null => {
  const user = localStorage.getItem("user");
  if (!user) return null;
  try {
    const parsed: unknown = JSON.parse(user);
    return isAuthUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const logout = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const res = await api.get<AdminUser[]>("/auth/users");
  return res.data;
};

export const updateUserRole = async (
  userId: number,
  role: UserRole
): Promise<AdminUser> => {
  const res = await api.patch<AdminUser>(`/auth/users/${userId}/role`, { role });
  return res.data;
};

export const reportIssue = async (payload: {
  type: IssueType;
  title: string;
  description: string;
  page_url?: string;
  email?: string;
  screenshot?: File;
}): Promise<unknown> => {
  const form = new FormData();
  form.append("type", payload.type);
  form.append("title", payload.title);
  form.append("description", payload.description);
  if (payload.page_url) form.append("page_url", payload.page_url);
  if (payload.email) form.append("email", payload.email);
  if (payload.screenshot) form.append("screenshot", payload.screenshot);

  const res = await api.post("/issues/report", form);
  return res.data; // backend may return created Issue or a message
};

// List issues (public)
export const listIssues = async (params?: {
  q?: string;
  type?: IssueType;
  status?: IssueStatus;
  page?: number;
  page_size?: number;
}): Promise<Issue[]> => {
  const res = await api.get<Issue[]>("/issues", { params });
  return res.data;
};

// Admin: update status
export const adminUpdateIssueStatus = async (
  id: number,
  status: IssueStatus
): Promise<Issue> => {
  const res = await api.patch<Issue>(`/issues/${id}/status`, { status });
  return res.data;
};

// Admin: delete issue (also deletes screenshot if any server-side)
export const adminDeleteIssue = async (id: number): Promise<void> => {
  await api.delete(`/issues/${id}`);
};

// ---------- Forum ----------
export async function listForumThreads(
  q = "",
  page = 1,
  page_size = 20
): Promise<ForumThread[]> {
  const res = await api.get<ForumThread[]>("/forum/threads", {
    params: { q: q || undefined, page, page_size },
  });
  return res.data;
}

export async function listForumThreadsPaged(
  q = "",
  page = 1,
  page_size = 20,
  opts?: { author_id?: number; signal?: AbortSignal }
): Promise<Paginated<ForumThread>> {
  const res = await api.get<Paginated<ForumThread>>("/forum/threads-paged", {
    params: {
      q: q || undefined,
      page,
      page_size,
      ...(opts?.author_id != null ? { author_id: opts.author_id } : {}),
    },
    signal: opts?.signal,
  });
  return res.data;
}

export async function createForumThread(input: {
  title: string;
  first_post_markdown: string;
  series_ids?: number[];
}): Promise<ForumThread> {
  try {
    const res = await api.post<ForumThread>("/forum/threads", input);
    return res.data;
  } catch (err: unknown) {
    const status = isAxiosError(err) ? err.response?.status : undefined;
    const data: ApiErrorData = isAxiosError(err)
      ? (err.response?.data as unknown as ApiErrorData)
      : undefined;

    if (status === 429) {
      const ra = retryAfterSeconds(err);
      throw new Error(
        `You're creating threads too fast${ra ? `; try again in ${ra}s` : ""}.`
      );
    }

    // explicit profanity branch
    const detailObj =
      typeof data?.detail === "object" && data?.detail !== null
        ? data.detail
        : undefined;
    const code = detailObj?.code ?? data?.code ?? null;

    if (status === 400 && code === "PROFANITY") {
      throw new Error("Thread contains inappropriate language.");
    }

    // Fallbacks
    const serverDetail =
      (typeof data?.detail === "string" && data.detail) ||
      detailObj?.message ||
      data?.message;

    throw new Error(
      serverDetail || extractApiDetail(err, "Failed to create thread")
    );
  }
}

export async function getForumThread(
  thread_id: number
): Promise<{ thread: ForumThread; posts: ForumPost[] }> {
  const res = await api.get<{ thread: ForumThread; posts: ForumPost[] }>(
    `/forum/threads/${thread_id}`
  );
  return res.data;
}

export async function getForumThreadPaged(
  thread_id: number,
  page = 1,
  page_size = 25
): Promise<ThreadPostsPage> {
  const res = await api.get<ThreadPostsPage>(
    `/forum/threads/${thread_id}/posts-paged`,
    { params: { page, page_size } }
  );
  return res.data;
}

export async function createForumPost(
  thread_id: number,
  input: { content_markdown: string; series_ids?: number[]; parent_id?: number }
): Promise<ForumPost> {
  const body = {
    content_markdown: String(input.content_markdown).trim(),
    parent_id:
      typeof input.parent_id === "number" && input.parent_id > 0
        ? input.parent_id
        : null,
  } as {
    content_markdown: string;
    series_ids?: number[];
    parent_id: number | null;
  };

  if (Array.isArray(input.series_ids) && input.series_ids.length > 0) {
    body.series_ids = input.series_ids.map(Number);
  }

  try {
    const res = await api.post<ForumPost>(
      `/forum/threads/${thread_id}/posts`,
      body
    );
    return res.data;
  } catch (err: unknown) {
    const status = isAxiosError(err) ? err.response?.status : undefined;
    const data: ApiErrorData = isAxiosError(err)
      ? (err.response?.data as unknown as ApiErrorData)
      : undefined;

    const detailStr =
      typeof data?.detail === "string"
        ? data.detail
        : (typeof data?.detail === "object" && data.detail?.message) ||
          undefined;

    if (status === 429) {
      const ra = retryAfterSeconds(err);
      throw new Error(
        `You're posting too fast${ra ? `; try again in ${ra}s` : ""}.`
      );
    }

    if (status === 423) {
      throw new Error("This thread is locked by an admin.");
    }

    // Profanity (structured)
    const detailObj =
      typeof data?.detail === "object" && data?.detail !== null
        ? data.detail
        : undefined;
    if (status === 400 && detailObj?.code === "PROFANITY") {
      throw new Error("Reply contains inappropriate language.");
    }

    // Profanity (string detail)
    if (
      status === 400 &&
      detailStr &&
      /inappropriate|profan/i.test(detailStr)
    ) {
      throw new Error("Reply contains inappropriate language.");
    }

    const fallback = extractApiDetail(err, "Failed to post reply");
    throw new Error(detailStr || fallback);
  }
}

export async function forumSeriesSearch(q: string): Promise<ForumSeriesRef[]> {
  const res = await api.get<ForumSeriesRef[]>("/forum/series-search", {
    params: { q },
  });
  return res.data;
}

export async function deleteForumPost(
  thread_id: number,
  post_id: number
): Promise<void> {
  await api.delete(`/forum/threads/${thread_id}/posts/${post_id}`);
}

export async function deleteForumThread(thread_id: number): Promise<void> {
  await api.delete(`/forum/threads/${thread_id}`);
}
// Owner-only delete (server checks the author)
export async function deleteMyForumPost(
  thread_id: number,
  post_id: number
): Promise<void> {
  await api.delete(`/forum/threads/${thread_id}/posts/${post_id}/mine`);
}

export async function lockForumThread(
  thread_id: number,
  locked: boolean
): Promise<{ id: number; locked: boolean }> {
  const res = await api.patch<{ id: number; locked: boolean }>(
    `/forum/threads/${thread_id}/lock`,
    { locked }
  );
  return res.data;
}

export async function updateForumThreadSettings(
  thread_id: number,
  input: { latest_first?: boolean }
): Promise<{ id: number; latest_first: boolean }> {
  const res = await api.patch<{ id: number; latest_first: boolean }>(
    `/forum/threads/${thread_id}/settings`,
    input
  );
  return res.data;
}

// ---------- End Forum ----------

// ---------- Reading Lists (new helpers) ----------
export interface PublicReadingList {
  name: string;
  items: {
    series_id: number;
    title?: string;
    cover_url?: string;
    left_off_chapter?: string | null;
  }[];
}

/** Owner-only: make list public (ensures share_token server-side) */
export const shareReadingList = async (
  listId: number
): Promise<ReadingList> => {
  const res = await api.post<ReadingList>(`/reading-lists/${listId}/share`, {});
  return res.data;
};

/** Owner-only: make list private again */
export const unshareReadingList = async (
  listId: number
): Promise<ReadingList> => {
  const res = await api.delete<ReadingList>(`/reading-lists/${listId}/share`);
  return res.data;
};

/**
 * Public page: fetch a shared list by token and enrich items with title/cover.
 * Backend returns only series_id; we decorate each via getSeriesSummary.
 */
export const getPublicReadingList = async (
  token: string
): Promise<PublicReadingList> => {
  const res = await api.get<{
    name: string;
    items: { series_id: number; left_off_chapter?: string | null }[];
  }>(`/reading-lists/public/${token}`);

  // lightweight enrichment so the UI can show covers/titles
  const items = await Promise.all(
    res.data.items.map(async (it) => {
      try {
        const s = await getSeriesSummary(it.series_id);
        return {
          series_id: it.series_id,
          title: s.title,
          cover_url: s.cover_url,
          left_off_chapter: it.left_off_chapter ?? null,
        };
      } catch {
        return it;
      }
    })
  );

  return { name: res.data.name, items };
};

export async function editForumPost(
  thread_id: number,
  post_id: number,
  input: { content_markdown: string; series_ids?: number[] }
): Promise<ForumPost> {
  const body: { content_markdown: string; series_ids?: number[] } = {
    content_markdown: String(input.content_markdown).trim(),
  };
  if (Array.isArray(input.series_ids) && input.series_ids.length > 0) {
    body.series_ids = input.series_ids.map(Number);
  }

  try {
    const res = await api.patch<ForumPost>(
      `/forum/threads/${thread_id}/posts/${post_id}`,
      body
    );
    return res.data;
  } catch (err: unknown) {
    const status = isAxiosError(err) ? err.response?.status : undefined;
    const data: ApiErrorData = isAxiosError(err)
      ? (err.response?.data as unknown as ApiErrorData)
      : undefined;

    const detailStr =
      typeof data?.detail === "string"
        ? data.detail
        : (typeof data?.detail === "object" && data.detail?.message) ||
          undefined;

    if (status === 423) {
      throw new Error("This thread is locked by an admin.");
    }

    // Profanity (structured)
    const detailObj =
      typeof data?.detail === "object" && data?.detail !== null
        ? (data.detail as { code?: string; message?: string })
        : undefined;
    if (status === 400 && detailObj?.code === "PROFANITY") {
      throw new Error("Reply contains inappropriate language.");
    }

    // Profanity (string detail)
    if (
      status === 400 &&
      detailStr &&
      /inappropriate|profan/i.test(detailStr)
    ) {
      throw new Error("Reply contains inappropriate language.");
    }

    const fallback = extractApiDetail(err, "Failed to save changes");
    throw new Error(detailStr || fallback);
  }
}

export async function updateForumThread(
  thread_id: number,
  input: {
    title?: string;
    first_post_markdown?: string;
    series_ids?: number[];
  }
): Promise<ForumThread> {
  // Only send provided fields
  const body: {
    title?: string;
    first_post_markdown?: string;
    series_ids?: number[];
  } = {};
  if (typeof input.title === "string") body.title = input.title;
  if (typeof input.first_post_markdown === "string") {
    body.first_post_markdown = input.first_post_markdown.trim();
  }
  if (Array.isArray(input.series_ids)) {
    body.series_ids = input.series_ids.map(Number);
  }

  try {
    const res = await api.patch<ForumThread>(
      `/forum/threads/${thread_id}`,
      body
    );
    return res.data;
  } catch (err: unknown) {
    const status = isAxiosError(err) ? err.response?.status : undefined;
    const data: ApiErrorData = isAxiosError(err)
      ? (err.response?.data as unknown as ApiErrorData)
      : undefined;

    const detailStr =
      typeof data?.detail === "string"
        ? data.detail
        : (typeof data?.detail === "object" && data.detail?.message) ||
          undefined;

    if (status === 423) {
      throw new Error("This thread is locked by an admin.");
    }

    // Profanity (structured)
    const detailObj =
      typeof data?.detail === "object" && data?.detail !== null
        ? (data.detail as { code?: string; message?: string })
        : undefined;
    if (status === 400 && detailObj?.code === "PROFANITY") {
      throw new Error(detailObj.message || "Contains inappropriate language.");
    }

    const fallback = extractApiDetail(err, "Failed to update thread");
    throw new Error(detailStr || fallback);
  }
}

export const getMyReadingListsPaged = async (
  page = 1,
  page_size = 10,
  signal?: AbortSignal
): Promise<Paginated<ReadingListPreview>> => {
  const res = await api.get<Paginated<ReadingListPreview>>(
    "/reading-lists/me/paged",
    { params: { page, page_size }, signal }
  );
  return res.data;
};

export const getReadingListItemsPaged = async (
  listId: number,
  page = 1,
  page_size = 25,
  signal?: AbortSignal
): Promise<Paginated<ReadingListItem>> => {
  const res = await api.get<Paginated<ReadingListItem>>(
    `/reading-lists/${listId}/items/paged`,
    { params: { page, page_size }, signal }
  );
  return res.data;
};

// ---------- Forum Media (tiny images & GIFs) ----------
export const uploadForumMedia = async (
  threadId: number,
  file: File,
  postId?: number
): Promise<{
  url: string;
  mime: string;
  width: number;
  height: number;
  size: number;
}> => {
  const form = new FormData();
  form.append("thread_id", String(threadId));
  if (typeof postId === "number") form.append("post_id", String(postId));
  form.append("file", file);

  const res = await api.post<{
    url: string;
    mime: string;
    width: number;
    height: number;
    size: number;
  }>("/forum/media/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export async function getMyForumThreads(
  page = 1,
  page_size = 10,
  signal?: AbortSignal
): Promise<Paginated<ForumThread>> {
  const res = await api.get<Paginated<ForumThread>>("/forum/me/threads", {
    params: { page, page_size },
    signal,
  });
  return res.data;
}

export async function getMyForumPosts(
  page = 1,
  page_size = 10,
  signal?: AbortSignal
): Promise<Paginated<ForumPost>> {
  const res = await api.get<Paginated<ForumPost>>("/forum/me/posts", {
    params: { page, page_size },
    signal,
  });
  return res.data;
}

export async function getMyForumVotes(
  page = 1,
  page_size = 10,
  signal?: AbortSignal
): Promise<Paginated<ForumPost>> {
  const res = await api.get<Paginated<ForumPost>>("/forum/me/votes", {
    params: { page, page_size },
    signal,
  });
  return res.data;
}

export async function toggleHeart(
  thread_id: number,
  post_id: number
): Promise<{ hearted: boolean; count: number }> {
  const res = await api.post<{ hearted: boolean; count: number }>(
    `/forum/threads/${thread_id}/posts/${post_id}/heart`
  );
  return res.data;
}

export async function setForumPostVote(
  thread_id: number,
  post_id: number,
  vote: "UPVOTE" | "DOWNVOTE" | null
): Promise<{
  viewer_vote: "UPVOTE" | "DOWNVOTE" | null;
  upvote_count: number;
  downvote_count: number;
}> {
  const res = await api.post<{
    viewer_vote: "UPVOTE" | "DOWNVOTE" | null;
    upvote_count: number;
    downvote_count: number;
  }>(`/forum/threads/${thread_id}/posts/${post_id}/vote`, { vote });
  return res.data;
}
