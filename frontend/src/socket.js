import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Single shared socket instance for the whole app
export const socket = io(API_URL, {
  autoConnect: true,
});

export const API_BASE = API_URL;