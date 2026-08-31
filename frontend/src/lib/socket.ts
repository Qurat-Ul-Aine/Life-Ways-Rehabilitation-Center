import { Socket } from "socket.io-client";
import { AUTH_TOKEN_STORAGE_KEY } from "./api";
import { createWaitingSocket, getWaitingNamespaceUrl } from "./telehealthSocket";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  if (!socket) {
    console.log("Connecting to Socket.io waiting namespace:", getWaitingNamespaceUrl());
    socket = createWaitingSocket();

    socket.on("connect", () => {
      console.log("Connected to /waiting namespace successfully");
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Waiting namespace connection error:", error.message);
    });
  } else if (token) {
    socket.auth = { token };
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export { createWaitingSocket, getSocketBaseUrl, getWaitingNamespaceUrl } from "./telehealthSocket";
