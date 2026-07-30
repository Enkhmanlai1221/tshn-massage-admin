import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000";

export const TOKEN_KEY = "massage.accessToken";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const api = axios.create({
  baseURL: `${API_URL}/admin`,
  withCredentials: true,
});

// Хүсэлт бүрд Bearer token тавина.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → login руу (token хүчингүй/дууссан).
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// Backend алдааны мессежийг гаргаж авах туслах.
export const apiError = (error: any): string =>
  error?.response?.data?.message || error?.message || "Алдаа гарлаа.";
