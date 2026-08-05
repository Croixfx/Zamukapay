import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  // Sends the httpOnly refresh-token cookie set by the backend on login/register.
  withCredentials: true,
});

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, unknown> | string[] | null;
};

/** Human-readable message for any failed API call — falls back to a generic string. */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiEnvelope<unknown> | undefined;
    if (envelope?.message) return envelope.message;
  }
  return fallback;
}

/** Per-field validation messages from a DRF serializer error response, e.g. { amount: "..." }. */
export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const envelope = error.response?.data as ApiEnvelope<unknown> | undefined;
  const errors = envelope?.errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};

  const fieldErrors: Record<string, string> = {};
  for (const [field, message] of Object.entries(errors)) {
    fieldErrors[field] = Array.isArray(message) ? String(message[0]) : String(message);
  }
  return fieldErrors;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type QueueEntry = { resolve: (token: string) => void; reject: (error: unknown) => void };

let isRefreshing = false;
let refreshQueue: QueueEntry[] = [];

function flushQueue(error: unknown, token: string | null) {
  for (const { resolve, reject } of refreshQueue) {
    if (error || !token) reject(error);
    else resolve(token);
  }
  refreshQueue = [];
}

// Routes reachable without a session — a failed opportunistic session
// restore here (e.g. a first-time visitor on the landing page) must not
// bounce the user away from the page they're already allowed to see.
const PUBLIC_PATHS = ["/", "/login"];

/** Session is unrecoverable — clear the token and send the user back to sign in. */
function redirectToLogin() {
  setAccessToken(null);
  if (typeof window !== "undefined" && !PUBLIC_PATHS.includes(window.location.pathname)) {
    window.location.href = "/login";
  }
}

/** Refresh tokens rotate and are single-use (see SIMPLE_JWT.ROTATE_REFRESH_TOKENS on the
 * backend), so two independent refresh POSTs racing on the same httpOnly cookie would
 * blacklist each other — the loser gets a 401 and bounces an otherwise-valid session to
 * /login. This is the single source of truth for "refresh the access token": both the
 * proactive restore-on-mount path (auth.ts's ensureSession, called from the root layout and
 * ProtectedRoute) and the reactive 401-retry path below share this one in-flight call instead
 * of each firing their own. */
export function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  return api
    .post<ApiEnvelope<{ access: string }>>("/auth/token/refresh/")
    .then(({ data }) => {
      const token = data.data.access;
      setAccessToken(token);
      flushQueue(null, token);
      return token;
    })
    .catch((error: unknown) => {
      flushQueue(error, null);
      redirectToLogin();
      throw error;
    })
    .finally(() => {
      isRefreshing = false;
    });
}

// On a 401, transparently refresh the access token (via the httpOnly cookie)
// and retry the original request once.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.response) {
      toast.error("Network error — check your connection.", { id: "network-error" });
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableConfig | undefined;

    if (error.response.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }
    // The refresh call itself failed — refreshAccessToken()'s own .catch already
    // handles cleanup and redirecting; just let it propagate.
    if (originalRequest.url?.includes("/auth/token/refresh/")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
