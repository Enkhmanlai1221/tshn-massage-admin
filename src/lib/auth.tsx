"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, clearToken, getToken } from "./api";

export interface Permission {
  code: string;
  isFull?: boolean;
  isRead?: boolean;
  isWrite?: boolean;
  isEdit?: boolean;
  isRemove?: boolean;
  isExport?: boolean;
  isApprove?: boolean;
}

export interface Admin {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isSuperAdmin?: boolean;
}

interface AuthState {
  admin: Admin | null;
  permissions: Permission[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (code: string, action?: keyof Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setAdmin(data.admin);
      setPermissions(data.permissions || []);
    } catch {
      setAdmin(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getToken()) loadMe();
    else setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.accessToken);
    await loadMe();
    router.push("/");
  };

  const logout = () => {
    clearToken();
    setAdmin(null);
    setPermissions([]);
    router.push("/login");
  };

  // Эрх шалгах — super admin бүх зүйлд, эсвэл permission-ийн action.
  const can = (code: string, action: keyof Permission = "isRead") => {
    if (admin?.isSuperAdmin) return true;
    const perm = permissions.find((p) => p.code === code);
    return !!(perm && (perm.isFull || perm[action]));
  };

  return (
    <AuthContext.Provider
      value={{ admin, permissions, loading, login, logout, can }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
