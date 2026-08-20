import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7100";

/** Багшийн token админыхаас ТУСДАА хадгалагдана — хоёр session зэрэг байж болно. */
export const TEACHER_TOKEN_KEY = "music-erp.teacherToken";

export const getTeacherToken = (): string | null =>
  typeof window === "undefined"
    ? null
    : localStorage.getItem(TEACHER_TOKEN_KEY);

export const setTeacherToken = (t: string) =>
  localStorage.setItem(TEACHER_TOKEN_KEY, t);

export const clearTeacherToken = () =>
  localStorage.removeItem(TEACHER_TOKEN_KEY);

export const teacherApi = axios.create({
  baseURL: `${API_URL}/teacher`,
  withCredentials: true,
});

teacherApi.interceptors.request.use((config) => {
  const token = getTeacherToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

teacherApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearTeacherToken();
      if (!window.location.pathname.startsWith("/teacher/login")) {
        window.location.href = "/teacher/login";
      }
    }
    return Promise.reject(error);
  },
);

export const teacherApiError = (error: any): string =>
  error?.response?.data?.message || error?.message || "Алдаа гарлаа.";
