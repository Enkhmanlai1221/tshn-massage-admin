"use client";

import { useState } from "react";
import {
  App,
  Alert,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";
import { useTeacherAuth } from "@/lib/teacher-auth";
import {
  STUDENT_LEVEL_LABEL,
  STUDENT_STATUS_COLOR,
  STUDENT_STATUS_LABEL,
  studentName,
} from "@/lib/labels";

/**
 * Шинэ сурагч бүртгэх — гар утсанд Drawer (доороос дээш), Modal биш.
 * Багш болон хөгжим нь автоматаар өөрийнх болно.
 */
function AddStudent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const { teacher } = useTeacherAuth();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const save = useMutation({
    mutationFn: async (v: any) =>
      teacherApi.post("/student", {
        ...v,
        birthday: v.birthday ? v.birthday.toISOString() : null,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      form.resetFields();
      onClose();
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  return (
    <Drawer
      title="Шинэ сурагч"
      placement="bottom"
      height="92%"
      open={open}
      onClose={onClose}
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <Button
          type="primary"
          block
          className="touch-btn"
          loading={save.isPending}
          onClick={() => form.submit()}
        >
          Бүртгэх
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 14 }}
        message={`${teacher?.name} · ${teacher?.instrument?.name}`}
        description="Сурагч танд автоматаар оногдоно. Хуваарийг админ үүсгэнэ."
      />
      <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
        <Form.Item
          name="firstName"
          label="Нэр"
          rules={[{ required: true, message: "Нэр оруулна уу" }]}
        >
          <Input size="large" placeholder="Ану" />
        </Form.Item>
        <Form.Item name="lastName" label="Овог">
          <Input size="large" placeholder="Б" />
        </Form.Item>
        <Form.Item name="level" label="Түвшин" initialValue="BEGINNER">
          <Select
            size="large"
            options={Object.entries(STUDENT_LEVEL_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Form.Item>
        <Form.Item name="birthday" label="Төрсөн өдөр">
          <DatePicker size="large" style={{ width: "100%" }} format="YYYY-MM-DD" inputReadOnly />
        </Form.Item>
        <Form.Item name="phone" label="Утас">
          <Input size="large" inputMode="numeric" placeholder="99001122" />
        </Form.Item>
        <Form.Item name="parentName" label="Эцэг эхийн нэр">
          <Input size="large" placeholder="Бага насны сурагчид" />
        </Form.Item>
        <Form.Item name="parentPhone" label="Эцэг эхийн утас">
          <Input size="large" inputMode="numeric" placeholder="88001122" />
        </Form.Item>
        <Form.Item name="note" label="Тэмдэглэл">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default function TeacherStudentsPage() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-students", query],
    queryFn: async () =>
      (await teacherApi.get("/student", { params: { query } })).data as {
        rows: any[];
        count: number;
      },
  });

  return (
    <div>
      <Input.Search
        size="large"
        placeholder="Нэр, код, утсаар хайх"
        allowClear
        onSearch={setQuery}
        style={{ marginBottom: 12 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Typography.Text strong>
          Миний сурагчид ({data?.count ?? 0})
        </Typography.Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
          className="touch-btn"
        >
          Нэмэх
        </Button>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : !data?.rows?.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Сурагч алга"
          style={{ padding: "40px 0" }}
        />
      ) : (
        data.rows.map((s: any) => {
          const phone = s.phone || s.parentPhone;
          return (
            <div key={s._id} className="lesson-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {studentName(s)}
                  </div>
                  <Space size={8} wrap style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    <span>{s.code}</span>
                    <span>{STUDENT_LEVEL_LABEL[s.level] ?? "—"}</span>
                    {s.parentName && (
                      <span>
                        <UserOutlined /> {s.parentName}
                      </span>
                    )}
                  </Space>
                </div>
                <Tag
                  color={STUDENT_STATUS_COLOR[s.status]}
                  style={{ marginInlineEnd: 0 }}
                >
                  {STUDENT_STATUS_LABEL[s.status]}
                </Tag>
              </div>
              {phone && (
                <a href={`tel:${phone}`}>
                  <Button block className="touch-btn" style={{ marginTop: 10 }}>
                    <PhoneOutlined /> {phone} — залгах
                  </Button>
                </a>
              )}
            </div>
          );
        })
      )}

      <AddStudent open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
