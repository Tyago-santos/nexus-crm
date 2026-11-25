import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api, loadSession, saveSession, type StoredSession } from "@/lib/api";
import { can, type Permission } from "@nexus/shared";

interface AuthContextValue {
  session: StoredSession | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    full_name: string;
    email: string;
    password: string;
    organization_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => loadSession());

  useEffect(() => {
    const onUnauthorized = () => setSession(null);
    window.addEventListener("nexus:unauthorized", onUnauthorized);
    return () => window.removeEventListener("nexus:unauthorized", onUnauthorized);
  }, []);

  const apply = useCallback((next: StoredSession | null) => {
    saveSession(next);
    setSession(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<StoredSession>("/auth/login", { email, password });
      apply(result);
    },
    [apply],
  );

  const register = useCallback(
    async (input: { full_name: string; email: string; password: string; organization_name: string }) => {
      const result = await api.post<StoredSession>("/auth/register", input);
      apply(result);
    },
    [apply],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // token expirado — limpar sessão mesmo assim
    }
    apply(null);
  }, [apply]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login,
      register,
      logout,
      can: (permission) => (session ? can(session.user.role, permission) : false),
    }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}

export function ProtectedRoute() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
