"use client";

import { TeacherAuthProvider, useTeacherAuth } from "@/lib/teacher-auth";
import {
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  LogoutOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Popconfirm, Spin, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { key: "/teacher", label: "Өнөөдөр", icon: <CheckSquareOutlined /> },
  { key: "/teacher/schedule", label: "Хуваарь", icon: <CalendarOutlined /> },
  { key: "/teacher/students", label: "Сурагч", icon: <TeamOutlined /> },
  { key: "/teacher/salary", label: "Цалин", icon: <DollarOutlined /> },
];

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { teacher, loading, logout } = useTeacherAuth();

  const isLogin = pathname === "/teacher/login";

  useEffect(() => {
    if (!loading && !teacher && !isLogin) router.replace("/teacher/login");
  }, [loading, teacher, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading || !teacher) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const active =
    [...NAV]
      .sort((a, b) => b.key.length - a.key.length)
      .find((n) => pathname === n.key || pathname.startsWith(n.key + "/"))
      ?.key ?? "/teacher";

  return (
    <div
      className="teacher-shell"
      style={{ background: "#eceef1", minHeight: "100vh" }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Avatar
          size={34}
          style={{
            background: teacher.instrument?.color || "#7c3aed",
            flexShrink: 0,
          }}
        >
          {teacher.name.slice(0, 1)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text
            strong
            ellipsis
            style={{ display: "block", fontSize: 15 }}
          >
            {teacher.name}
          </Typography.Text>
        </div>
        <Popconfirm
          title="Гарах уу?"
          onConfirm={logout}
          okText="Тийм"
          cancelText="Үгүй"
          okButtonProps={{ color: "red" }}
        >
          <Button
            type="text"
            icon={
              <LogoutOutlined
                size={16}
                style={{
                  color: "red",
                  fontSize: 16,
                }}
              />
            }
            aria-label="Гарах"
          />
        </Popconfirm>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: 12 }}>
        {children}
      </main>

      <nav
        className="teacher-tabbar"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          background: "#fff",
          borderTop: "1px solid #eee",
          display: "flex",
        }}
      >
        {NAV.map((n) => {
          const on = active === n.key;
          return (
            <button
              key={n.key}
              onClick={() => router.push(n.key)}
              style={{
                flex: 1,
                border: "none",
                background: "none",
                padding: "8px 2px 10px",
                cursor: "pointer",
                color: on ? "#7c3aed" : "#8c8c8c",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minHeight: 56,
              }}
            >
              <span style={{ fontSize: 19, lineHeight: 1 }}>{n.icon}</span>
              <span style={{ fontSize: 11, fontWeight: on ? 600 : 400 }}>
                {n.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TeacherAuthProvider>
      <Shell>{children}</Shell>
    </TeacherAuthProvider>
  );
}
