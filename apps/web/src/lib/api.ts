const SESSION_KEY = "nexus.session";

export interface StoredSession {
  token: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: "owner" | "admin" | "manager" | "seller" | "support";
    organization: { id: string; name: string; slug: string };
  };
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = loadSession();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("content-type", "application/json");
  if (session?.token) headers.set("authorization", `Bearer ${session.token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string; details?: unknown } }
    | null;

  if (!response.ok) {
    const error = payload?.error;
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      saveSession(null);
      window.dispatchEvent(new Event("nexus:unauthorized"));
    }
    throw new ApiError(response.status, error?.code ?? "REQUEST_FAILED", error?.message ?? "Falha na requisição", error?.details);
  }
  return (payload?.data ?? payload) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
