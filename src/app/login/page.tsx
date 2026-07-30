"use client";

import { useState } from "react";
import { Button, Card, Form, Input, Typography, App } from "antd";
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
            🧖 Массаж салон
          </Typography.Title>
          <Typography.Text type="secondary">Удирдлагын самбар</Typography.Text>
        </div>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Имэйл"
            rules={[{ required: true, message: "Имэйл оруулна уу" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@massage.mn" />
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
      </Card>
    </div>
  );
}
