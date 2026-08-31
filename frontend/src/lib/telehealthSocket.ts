import { io, Socket } from "socket.io-client";
import { AUTH_TOKEN_STORAGE_KEY } from "./api";

/**
 * Socket.io shares the API host (no /api suffix).
 * Prefer VITE_SOCKET_URL; otherwise derive from VITE_API_URL.
 */
export function getSocketBaseUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return String(explicit).replace(/\/$/, "");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  return apiUrl.replace(/\/api\/?$/, "");
}

export function getWaitingNamespaceUrl(): string {
  return `${getSocketBaseUrl()}/waiting`;
}

export function createWaitingSocket(): Socket {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return io(getWaitingNamespaceUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: { token },
  });
}
