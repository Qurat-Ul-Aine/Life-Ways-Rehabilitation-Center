import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api, {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from "@/lib/api";

export type AuthRole = "admin" | "doctor" | "patient" | "staff" | "family" | "intern";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
};

const AUTH_ROLES: readonly AuthRole[] = ["admin", "doctor", "patient", "staff", "family", "intern"];

const normalizeRole = (role: string): AuthRole => {
  const r = String(role || "").trim().toLowerCase();
  if (r === "intern") return "intern";
  return (AUTH_ROLES as readonly string[]).includes(r) ? (r as AuthRole) : "patient";
};

const normalizeAuthUser = (user: AuthUser): AuthUser => ({
  ...user,
  role: normalizeRole(user.role),
});

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ LOAD BOTH TOKEN + USER AND VERIFY
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    if (storedUser) setUser(normalizeAuthUser(JSON.parse(storedUser)));

    api
      .get("/auth/me")
      .then((res) => {
        if (res.data?.data?.user) {
          const freshUser = normalizeAuthUser(res.data.data.user);
          setUser(freshUser);
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(freshUser));
        }
      })
      .catch(() => {
        // Interceptor handles hard redirect on 401,
        // but we MUST clear local React state and storage here
        // to prevent ProtectedRoute from briefly flashing unauthorized content.
        setToken(null);
        setUser(null);
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // ✅ LOGIN
  const login = useCallback((newToken: string, nextUser: AuthUser) => {
    const normalizedUser = normalizeAuthUser(nextUser);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, newToken);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalizedUser));

    setToken(newToken);
    setUser(normalizedUser);
  }, []);

  // ✅ LOGOUT
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY); // 🔥

    setToken(null);
    setUser(null);
  }, []);

  // ✅ UPDATE USER
  const updateUser = useCallback((nextUser: AuthUser) => {
    const normalizedUser = normalizeAuthUser(nextUser);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalizedUser)); // 🔥
    setUser(normalizedUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [user, token, isLoading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ HOOK
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}