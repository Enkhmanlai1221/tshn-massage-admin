"use client";

import { useState } from "react";
import Link from "next/link";
import { App, Button, Card, Divider, Form, Input, Typography } from "antd";
import { LockOutlined, PhoneOutlined } from "@ant-design/icons";
import { useTeacherAuth } from "@/lib/teacher-auth";
import { teacherApiError } from "@/lib/teacher-api";

export default function TeacherLoginPage() {
  const { login } = useTeacherAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 360 }}>
        <Typography.Title level={4} style={{ textAlign: "center" }}>
          Багш нэвтрэх
        </Typography.Title>
        <Form
          layout="vertical"
          onFinish={async (v) => {
            setLoading(true);
            try {
              await login(v.phone, v.password);
            } catch (e) {
              message.error(teacherApiError(e));
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item
            name="phone"
            label="Утас"
            rules={[{ required: true, message: "Утсаа оруулна уу" }]}
          >
            <Input
              size="large"
              inputMode="numeric"
              autoComplete="tel"
              prefix={<PhoneOutlined />}
              placeholder="99110011"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Нууц үг"
            rules={[{ required: true, message: "Нууц үгээ оруулна уу" }]}
          >
            <Input.Password
              size="large"
              autoComplete="current-password"
              prefix={<LockOutlined />}
              placeholder="••••••••"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            className="touch-btn"
            loading={loading}
          >
            Нэвтрэх
          </Button>
        </Form>
        <Typography.Paragraph
          type="secondary"
          style={{ fontSize: 12, marginTop: 16, marginBottom: 0 }}
        >
          Нууц үгээ мартсан бол админд хандаж шинэчлүүлнэ үү.
        </Typography.Paragraph>
        <Divider plain style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Админ уу?
          </Typography.Text>
        </Divider>
        <Link href="/login">
          <Button block className="touch-btn">Удирдлагын самбар руу</Button>
        </Link>
      </Card>
    </div>
  );
}
