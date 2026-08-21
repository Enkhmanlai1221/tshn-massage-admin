"use client";

import { useState } from "react";
import {
  App,
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { useRooms, useSetting } from "@/lib/hooks";
import { ENROLLMENT_STATUS_LABEL, WEEKDAY_LABEL } from "@/lib/labels";

/**
 * Сурагчийн тогтмол хуваарь — 7 хоногт давтагдах цагууд.
 * Хичээл эндээс үүсдэг: үүсгэхэд тухайн сарын үлдсэн хугацаа, дараа нь
 * "Сунгах" товчоор сар бүр нэмэгдэнэ.
 */
export default function EnrollmentPanel({ student }: { student: any }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  const { data: rooms } = useRooms();
  const { data: setting } = useSetting();

  const { data, isLoading } = useQuery({
    queryKey: ["enrollment", student?._id],
    queryFn: async () =>
      (await api.get("/enrollment", { params: { student: student._id } })).data
        .rows as any[],
    enabled: !!student,
  });

  const active = (data || []).find((e) => e.status === "ACTIVE");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["enrollment", student._id] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
  };

  const create = useMutation({
    mutationFn: async (v: any) =>
      api.post("/enrollment", {
        student: student._id,
        teacher: student.teacher?._id ?? student.teacher,
        slots: v.slots.map((s: any) => ({
          weekday: s.weekday,
          slotIndex: s.slotIndex,
          room: s.room,
        })),
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      if (res.data.conflicts?.length) {
        message.warning(
          `Давхцал: ${res.data.conflicts.map((c: any) => c.message).join("; ")}`,
          6,
        );
      }
      setOpen(false);
      form.resetFields();
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const extend = useMutation({
    mutationFn: async () => api.post(`/enrollment/${active._id}/extend`),
    onSuccess: (res) => {
      message.success(res.data.message);
      if (res.data.conflicts?.length) {
        message.warning(`${res.data.conflicts.length} давхцал гарлаа`, 5);
      }
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const end = useMutation({
    mutationFn: async () => api.delete(`/enrollment/${active._id}`),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const slotOptions = (setting?.timeSlots || []).map((s: any) => ({
    value: s.index,
    label: s.label,
  }));
  const weekdayOptions = (setting?.workingDays || []).map((d: number) => ({
    value: d,
    label: WEEKDAY_LABEL[d],
  }));
  const roomOptions = (rooms || []).map((r: any) => ({
    value: r._id,
    label: r.name,
  }));

  return (
    <>
      <Card
        size="small"
        title="Тогтмол хуваарь"
        extra={
          active ? (
            <Space>
              <Button
                size="small"
                type="primary"
                loading={extend.isPending}
                onClick={() => extend.mutate()}
              >
                Дараа сар сунгах
              </Button>
              <Popconfirm
                title="Хуваарийг дуусгах уу?"
                description="Ирээдүйн товлогдсон хичээлүүд цуцлагдана."
                onConfirm={() => end.mutate()}
              >
                <Button size="small" danger>
                  Дуусгах
                </Button>
              </Popconfirm>
            </Space>
          ) : (
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
            >
              Хуваарь үүсгэх
            </Button>
          )
        }
      >
        {isLoading ? null : active ? (
          <>
            <Table
              size="small"
              pagination={false}
              rowKey={(r: any) => `${r.weekday}-${r.slotIndex}`}
              dataSource={active.slots}
              columns={[
                {
                  title: "Гараг",
                  dataIndex: "weekday",
                  render: (v) => WEEKDAY_LABEL[v],
                },
                {
                  title: "Цаг",
                  dataIndex: "slotIndex",
                  render: (v) =>
                    setting?.timeSlots?.find((s: any) => s.index === v)?.label ??
                    v,
                },
                { title: "Өрөө", dataIndex: ["room", "name"] },
              ]}
            />
            <Space style={{ marginTop: 8 }} wrap>
              <Tag>{ENROLLMENT_STATUS_LABEL[active.status]}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Эхэлсэн: {active.startDate} · Хичээл үүссэн:{" "}
                {active.generatedUntil || "—"} хүртэл
              </Typography.Text>
            </Space>
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Тогтмол хуваарь байхгүй"
          />
        )}
      </Card>

      <Drawer
        title="Тогтмол хуваарь үүсгэх"
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        footer={
          <Space style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setOpen(false)}>Болих</Button>
            <Button
              type="primary"
              loading={create.isPending}
              onClick={() => form.submit()}
            >
              Үүсгэх
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Багш: ${student?.teacher?.name} · Хөгжим: ${student?.instrument?.name}`}
          description="Ердийн тохиолдолд 7 хоногт 2 цаг сонгоно. Үүсгэхэд энэ сарын үлдсэн хичээлүүд шууд товлогдоно."
        />
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Form.List name="slots" initialValue={[{}, {}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space
                    key={field.key}
                    align="baseline"
                    style={{ display: "flex", marginBottom: 4 }}
                  >
                    <Form.Item
                      name={[field.name, "weekday"]}
                      rules={[{ required: true, message: "Гараг" }]}
                    >
                      <Select
                        style={{ width: 110 }}
                        placeholder="Гараг"
                        options={weekdayOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "slotIndex"]}
                      rules={[{ required: true, message: "Цаг" }]}
                    >
                      <Select
                        style={{ width: 150 }}
                        placeholder="Цаг"
                        options={slotOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "room"]}
                      rules={[{ required: true, message: "Өрөө" }]}
                    >
                      <Select
                        style={{ width: 120 }}
                        placeholder="Өрөө"
                        options={roomOptions}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <a onClick={() => remove(field.name)}>Хасах</a>
                    )}
                  </Space>
                ))}
                <Button type="dashed" block onClick={() => add()}>
                  Цаг нэмэх
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </>
  );
}
