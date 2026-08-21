"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Divider, Form, Input, Typography, App } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success("Тавтай морил!");
    } catch (e) {
      message.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <Card style={{ width: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Админ хэсэг
          </Typography.Title>
        </div>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Имэйл"
            rules={[
              { required: true, message: "Имэйл оруулна уу" },
              {
                type: "email",
                message: "Имэйл буруу байна (жишээ: admin@music.mn)",
              },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@music.mn" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Нууц үг"
            rules={[{ required: true, message: "Нууц үг оруулна уу" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Нэвтрэх
          </Button>
        </Form>
        <Divider plain style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Багш уу?
          </Typography.Text>
        </Divider>
        <Link href="/teacher/login">
          <Button block>Багшийн хэсэг рүү</Button>
        </Link>
      </Card>
    </div>
  );
}
