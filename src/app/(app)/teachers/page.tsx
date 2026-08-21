"use client";

import { useState } from "react";
import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
  Space,
  Typography,
} from "antd";
import { KeyOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CrudPage from "@/components/CrudPage";
import { api, apiError } from "@/lib/api";
import { useInstruments } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

/** Багшийн нууц үг тавих / шинэчлэх. Багш өөрөө бүртгүүлдэггүй. */
function PasswordDrawer({
  teacher,
  onClose,
}: {
  teacher: any | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const save = useMutation({
    mutationFn: async (v: any) =>
      api.post(`/teacher/${teacher._id}/password`, { password: v.password }),
    onSuccess: (res) => {
      message.success(res.data.message);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ["teachers"] });
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Drawer
      title={teacher ? `${teacher.name} — нууц үг` : ""}
      open={!!teacher}
      onClose={onClose}
      width={420}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Болих</Button>
          <Button
            type="primary"
            loading={save.isPending}
            onClick={() => form.submit()}
          >
            Хадгалах
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        Нууц үг тавихад багшийн нэвтрэх эрх автоматаар нээгдэнэ. Багш өөрөө
        нууц үгээ дараа солих боломжтой.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
        <Form.Item
          name="password"
          label="Шинэ нууц үг"
          rules={[{ required: true, min: 6, message: "6-аас дээш тэмдэгт" }]}
        >
          <Input.Password placeholder="Хамгийн багадаа 6 тэмдэгт" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default function TeachersPage() {
  const { data: instruments } = useInstruments();
  const { can } = useAuth();
  const [pwTeacher, setPwTeacher] = useState<any | null>(null);

  const options = (instruments || []).map((i: any) => ({
    value: i._id,
    label: i.name,
  }));

  return (
    <>
      <CrudPage
        title="Багш"
        endpoint="/teacher"
        permission="TEACHER"
        queryKey="teachers"
        columns={[
          { title: "Нэр", dataIndex: "name", key: "name" },
          { title: "Утас", dataIndex: "phone", key: "phone" },
          {
            title: "Хөгжим",
            dataIndex: ["instrument", "name"],
            key: "instrument",
            render: (v, r: any) => (
              <Tag color={r.instrument?.color || "default"}>{v || "—"}</Tag>
            ),
          },
          {
            title: "Нэвтрэх эрх",
            key: "canLogin",
            render: (_, r: any) =>
              r.userSuspended ? (
                <Tag color="red">Түдгэлзүүлсэн</Tag>
              ) : r.canLogin ? (
                <Tag color="green">Нээлттэй</Tag>
              ) : (
                <Tag>Хаалттай</Tag>
              ),
          },
          {
            title: "Идэвхтэй",
            dataIndex: "isActive",
            key: "isActive",
            render: (v) => (v ? "Тийм" : "Үгүй"),
          },
          {
            title: "Нууц үг",
            key: "password",
            width: 100,
            render: (_, r: any) =>
              can("TEACHER", "isEdit") ? (
                <Button
                  size="small"
                  icon={<KeyOutlined />}
                  onClick={() => setPwTeacher(r)}
                >
                  Тавих
                </Button>
              ) : null,
          },
        ]}
        toInitialValues={(r) => ({
          ...r,
          instrument: r.instrument?._id ?? r.instrument,
        })}
        toPayload={(v) => ({ ...v, isActive: v.isActive ?? true })}
        renderFormItems={(editing) => (
          <>
            <Form.Item
              name="name"
              label="Нэр"
              rules={[{ required: true, message: "Нэр оруулна уу" }]}
            >
              <Input placeholder="Б.Болд" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Утас"
              rules={[{ required: true, message: "Утас оруулна уу" }]}
              extra="Нэвтрэхэд ашиглана — давхардаж болохгүй."
            >
              <Input placeholder="99110011" />
            </Form.Item>
            <Form.Item
              name="instrument"
              label="Заах хөгжим"
              rules={[{ required: true, message: "Хөгжим сонгоно уу" }]}
              extra="Багш нэг л хөгжим заана."
            >
              <Select options={options} placeholder="Сонгох" />
            </Form.Item>
            {!editing && (
              <Form.Item
                name="password"
                label="Нэвтрэх нууц үг (заавал биш)"
                extra="Оруулбал нэвтрэх эрх шууд нээгдэнэ. Дараа ч тавьж болно."
              >
                <Input.Password placeholder="Хамгийн багадаа 6 тэмдэгт" />
              </Form.Item>
            )}
            <Form.Item name="color" label="Өнгө (календарт)">
              <Input placeholder="#3b82f6" />
            </Form.Item>
            <Form.Item name="note" label="Тэмдэглэл">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Space size="large">
              <Form.Item
                name="isActive"
                label="Идэвхтэй"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
              {editing && (
                <Form.Item
                  name="userSuspended"
                  label="Түдгэлзүүлэх"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              )}
              <Form.Item name="sort" label="Эрэмбэ">
                <InputNumber min={0} />
              </Form.Item>
            </Space>
          </>
        )}
      />
      <PasswordDrawer teacher={pwTeacher} onClose={() => setPwTeacher(null)} />
    </>
  );
}
