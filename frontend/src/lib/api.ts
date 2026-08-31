import axios from "axios";

export const AUTH_TOKEN_STORAGE_KEY = "auth_token";
export const AUTH_USER_STORAGE_KEY = "auth_user";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/validate-reset-token",
  "/auth/validate-reset-token",
  "/auth/security-questions/catalog",
  "/auth/forgot-password/security-questions",
  "/auth/verify-security-answers",
];

function isPublicScreeningRequest(url?: string): boolean {
  if (!url) return false;
  return url.includes("/screening/");
}

function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

function isOnPublicScreeningPage(): boolean {
  return window.location.pathname.startsWith("/screening");
}

function resolveLoginPath(): string {
  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
  let redirectTo = "/login/patient";

  if (raw) {
    try {
      const user = JSON.parse(raw);
      const role = String(user?.role ?? "").toUpperCase();

      if (role === "ADMIN") redirectTo = "/login/admin";
      else if (role === "DOCTOR") redirectTo = "/login/doctor";
      else if (role === "INTERN") redirectTo = "/intern/login";
      else redirectTo = "/login/patient";
    } catch {
      // fallback to patient login
    }
  }

  return redirectTo;
}

function clearSessionAndRedirect(extraQuery = "") {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);

  const isLoginPage = window.location.pathname.startsWith("/login");
  if (!isLoginPage) {
    const base = resolveLoginPath();
    window.location.assign(extraQuery ? `${base}?${extraQuery}` : base);
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary for file uploads.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const message = String(error?.response?.data?.message ?? "");

    if (
      status === 403 &&
      (code === "ACCOUNT_SUSPENDED" || message.toLowerCase().includes("suspended"))
    ) {
      clearSessionAndRedirect("suspended=1");
      return Promise.reject(error);
    }

    if (status === 401 && !isPublicAuthRequest(error?.config?.url)) {
      const screeningRequest = isPublicScreeningRequest(error?.config?.url);
      if (screeningRequest && isOnPublicScreeningPage()) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        return Promise.reject(error);
      }
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  },
);

export default api;
