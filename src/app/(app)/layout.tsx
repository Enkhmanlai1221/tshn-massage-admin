"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Layout, Menu, Spin, Dropdown, Avatar, Typography } from "antd";
import {
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  HomeOutlined,
  SoundOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  DollarOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/lib/auth";

const { Sider, Content } = Layout;

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  permission: string;
}

const NAV: NavItem[] = [
  {
    key: "/",
    label: "Дашбоард",
    icon: <BarChartOutlined />,
    permission: "DASHBOARD",
  },
  {
    key: "/calendar",
    label: "Календар",
    icon: <CalendarOutlined />,
    permission: "LESSON",
  },
  {
    key: "/students",
    label: "Сурагч",
    icon: <UserOutlined />,
    permission: "STUDENT",
  },
  {
    key: "/teachers",
    label: "Багш",
    icon: <TeamOutlined />,
    permission: "TEACHER",
  },
  {
    key: "/attendance",
    label: "Ирц",
    icon: <CheckSquareOutlined />,
    permission: "ATTENDANCE",
  },
  {
    key: "/leaves",
    label: "Багшийн чөлөө",
    icon: <CoffeeOutlined />,
    permission: "LEAVE",
  },
  {
    key: "/salary",
    label: "Цалин",
    icon: <DollarOutlined />,
    permission: "SALARY",
  },
  {
    key: "/payments",
    label: "Төлбөр",
    icon: <CreditCardOutlined />,
    permission: "PAYMENT",
  },
  {
    key: "/instruments",
    label: "Хөгжим",
    icon: <SoundOutlined />,
    permission: "INSTRUMENT",
  },
  { key: "/rooms", label: "Өрөө", icon: <HomeOutlined />, permission: "ROOM" },
  {
    key: "/settings",
    label: "Тохиргоо",
    icon: <SettingOutlined />,
    permission: "SETTING",
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, loading, logout, can } = useAuth();

  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [loading, admin, router]);

  if (loading || !admin) {
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

  const menuItems = NAV.filter((n) => can(n.permission, "isRead")).map((n) => ({
    key: n.key,
    icon: n.icon,
    label: n.label,
  }));

  // Идэвхтэй меню — pathname-ий эхний segment-ээр
  const selectedKey =
    NAV.map((n) => n.key)
      .filter((k) => k !== "/")
      .find((k) => pathname.startsWith(k)) || "/";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        theme="light"
        width={200}
        style={{
          borderRight: "1px solid #f0f0f0",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div style={{ padding: "20px 16px", fontSize: 18, fontWeight: 700 }}>
            BNM Admin
          </div>
          <Menu
            itemIcon
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
            style={{ flex: 1, borderInlineEnd: "none" }}
          />
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Гарах",
                  onClick: logout,
                },
              ],
            }}
          >
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Avatar icon={<UserOutlined />} />
              <Typography.Text ellipsis style={{ flex: 1 }}>
                {admin.firstName} {admin.lastName}
              </Typography.Text>
            </div>
          </Dropdown>
        </div>
      </Sider>
      <Layout style={{ background: "white" }}>
        <Content style={{ margin: 16 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
