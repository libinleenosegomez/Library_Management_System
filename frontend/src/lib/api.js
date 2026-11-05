import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
});

// Attach the JWT (stored client-side after login) to every request.
// NOTE: for production hardening, prefer an httpOnly cookie set by the
// server over localStorage, to reduce XSS token-theft exposure.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("lms_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);

export default api;
