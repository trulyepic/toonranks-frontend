// src/api/client.ts
import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";

// Optional: prevent multiple rapid redirects on burst 401s
let isLoggingOut = false;

function hardLogout(redirectTo: string = "/login") {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } finally {
    // Force a clean app state; no dependency on React context
    window.location.href = redirectTo;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL,
  // timeout: 20000, // optional
  // baseURL: "http://localhost:8000",
});

// Helper to detect public auth endpoints
function isPublicAuthRoute(url?: string) {
  if (!url) return false;
  return (
    url.startsWith("/auth/login") ||
    url.startsWith("/auth/signup") ||
    url.startsWith("/auth/verify-email") ||
    url.startsWith("/auth/google-oauth") ||
    url.startsWith("/auth/resend-verification") ||
    url.startsWith("/auth/forgot-password") ||
    url.startsWith("/auth/reset-password")
  );
}

// Attach token on every request
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     config.headers = config.headers ?? {};
//     // Axios header values must be strings|number|boolean
//     (
//       config.headers as Record<string, string>
//     ).Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// Attach token EXCEPT on auth routes
api.interceptors.request.use((config) => {
  if (!isPublicAuthRoute(config.url)) {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      (
        config.headers as Record<string, string>
      ).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Narrow/guard helpers
function isCanceledError(err: unknown): boolean {
  // axios.isCancel exists in axios v1; feature-check for safety
  if (
    typeof (axios as { isCancel?: (v: unknown) => boolean }).isCancel ===
    "function"
  ) {
    if (axios.isCancel(err)) return true;
  }
  if (err && typeof err === "object") {
    const obj = err as { code?: unknown; name?: unknown; message?: unknown };
    if (obj.code === "ERR_CANCELED") return true;
    if (obj.name === "CanceledError" || obj.name === "AbortError") return true;
    if (obj.message === "canceled") return true;
  }
  return false;
}

function isAxiosErr<T = unknown>(err: unknown): err is AxiosError<T> {
  return (
    (
      axios as { isAxiosError?: (payload: unknown) => payload is AxiosError }
    ).isAxiosError?.(err) ?? false
  );
}

// Global 401 handler — works without UserContext access
// api.interceptors.response.use(
//   (res: AxiosResponse) => res,
//   (err: unknown) => {
//     // Ignore cancels here so they don't trigger logout logic
//     if (isCanceledError(err)) {
//       return Promise.reject(err);
//     }
//     if (isAxiosErr(err)) {
//       const status = err.response?.status;
//       if (status === 401) hardLogout();
//     }
//     return Promise.reject(err);
//   }
// );

// Global 401 handler
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: unknown) => {
    if (isCanceledError(err)) return Promise.reject(err);

    if (isAxiosErr(err)) {
      const status = err.response?.status;
      const url = err.config?.url;

      if (status === 401) {
        if (isPublicAuthRoute(url)) {
          // ❌ Do NOT redirect on failed /auth/* calls (e.g., wrong password)
          // Let the page catch and show "Invalid username or password"
          return Promise.reject(err);
        }
        // For all other 401s, nuke session and send to login
        hardLogout("/login");
        return new Promise(() => {}); // halt further promise chains
      }
    }
    return Promise.reject(err);
  }
);

// a tiny helper to use in UI
export const isRequestCanceled = (err: unknown): boolean => {
  return isCanceledError(err);
};
