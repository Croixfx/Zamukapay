import { api, getAccessToken, refreshAccessToken, setAccessToken, type ApiEnvelope } from "./api";

export type Role = "SUPPLIER" | "BUYER" | "ADMIN";

export type CurrentUser = {
  id: number;
  email: string;
  role: Role;
  company_name: string;
  phone_number: string;
  is_verified: boolean;
  created_at: string;
};

type AuthPayload = { user: CurrentUser; access: string };

export async function login(email: string, password: string): Promise<CurrentUser> {
  const { data } = await api.post<ApiEnvelope<AuthPayload>>("/auth/login/", { email, password });
  setAccessToken(data.data.access);
  return data.data.user;
}

export async function register(payload: {
  email: string;
  password: string;
  role: Extract<Role, "SUPPLIER" | "BUYER">;
  company_name: string;
  phone_number?: string;
}): Promise<CurrentUser> {
  const { data } = await api.post<ApiEnvelope<AuthPayload>>("/auth/register/", payload);
  setAccessToken(data.data.access);
  return data.data.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout/");
  } finally {
    setAccessToken(null);
    sessionRestorePromise = null;
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<ApiEnvelope<CurrentUser>>("/auth/me/");
  return data.data;
}

/** Call on app start to silently pick up a still-valid refresh cookie after a page reload. */
export async function restoreSession(): Promise<CurrentUser> {
  await refreshAccessToken();
  return getCurrentUser();
}

let sessionRestorePromise: Promise<CurrentUser> | null = null;

/** Same as restoreSession(), but shares one in-flight attempt across every caller in a page
 * load (root layout, ProtectedRoute, etc). Refresh tokens rotate and are single-use, so two
 * independent restoreSession() calls racing on the same stale cookie would blacklist each
 * other — the loser gets a 401 and bounces an otherwise-valid session to /login. */
export function ensureSession(): Promise<CurrentUser> {
  sessionRestorePromise ??= restoreSession().catch((error: unknown) => {
    sessionRestorePromise = null;
    throw error;
  });
  return sessionRestorePromise;
}

/** True if we currently hold an access token. Doesn't verify the token is still valid server-side. */
export function checkAuth(): boolean {
  return getAccessToken() !== null;
}
