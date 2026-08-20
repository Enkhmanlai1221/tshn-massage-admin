"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  teacherApi,
  setTeacherToken,
  clearTeacherToken,
  getTeacherToken,
} from "./teacher-api";

export interface Teacher {
  _id: string;
  name: string;
  phone: string;
  instrument?: { _id: string; name: string; color?: string; lessonRate?: number };
  color?: string | null;
}

interface TeacherAuthState {
  teacher: Teacher | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<TeacherAuthState | null>(null);

export const TeacherAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const { data } = await teacherApi.get("/auth/me");
      setTeacher(data.teacher);
    } catch {
      setTeacher(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getTeacherToken()) loadMe();
    else setLoading(false);
  }, []);

  const login = async (phone: string, password: string) => {
    const { data } = await teacherApi.post("/auth/login", { phone, password });
    setTeacherToken(data.accessToken);
    await loadMe();
    router.push("/teacher");
  };

  const logout = () => {
    clearTeacherToken();
    setTeacher(null);
    router.push("/teacher/login");
  };

  return (
    <Ctx.Provider value={{ teacher, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
};

export const useTeacherAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTeacherAuth must be used within provider");
  return ctx;
};
