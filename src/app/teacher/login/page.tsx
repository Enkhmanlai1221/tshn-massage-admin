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
      <Card style={{ width: 360 }}>
        <Typography.Title level={4} style={{ textAlign: "center" }}>
          🎵 Багшийн хэсэг
        </Typography.Title>
        <Typography.Paragraph
          type="secondary"
          style={{ textAlign: "center", marginTop: -8 }}
        >
          Утас + нууц үгээрээ нэвтэрнэ үү
        </Typography.Paragraph>
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
            <Input prefix={<PhoneOutlined />} placeholder="99110011" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Нууц үг"
            rules={[{ required: true, message: "Нууц үгээ оруулна уу" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
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
          <Button block>Удирдлагын самбар руу (имэйлээр нэвтрэх)</Button>
        </Link>
      </Card>
    </div>
  );
}
