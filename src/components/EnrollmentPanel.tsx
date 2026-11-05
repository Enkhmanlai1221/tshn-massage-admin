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
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { useRooms, useSetting } from "@/lib/hooks";
import { ENROLLMENT_STATUS_LABEL, WEEKDAY_LABEL } from "@/lib/labels";

/**
 * Сурагчийн тогтмол хуваарь — 7 хоногт давтагдах цагууд.
 * Хичээл эндээс үүсдэг: үүсгэхэд тухайн сарын үлдсэн хугацаа, дараа нь
 * сервер автоматаар сунгана. "Сунгах" товч нь цааш урьдчилан үүсгэхэд.
 */
export default function EnrollmentPanel({ student }: { student: any }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  /** Drawer засах горимд нээгдсэн эсэх (false = шинээр үүсгэх). */
  const [editing, setEditing] = useState(false);

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

  const toSlots = (v: any) =>
    v.slots.map((s: any) => ({
      weekday: s.weekday,
      slotIndex: s.slotIndex,
      // Хоосон = тухайн цагт сул байгаа өрөөнөөс автоматаар.
      room: s.room || null,
    }));

  const openCreate = () => {
    setEditing(false);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = () => {
    setEditing(true);
    form.setFieldsValue({
      slots: active.slots.map((s: any) => ({
        weekday: s.weekday,
        slotIndex: s.slotIndex,
        room: s.room?._id ?? s.room ?? undefined,
      })),
    });
    setOpen(true);
  };

  const create = useMutation({
    mutationFn: async (v: any) =>
      api.post("/enrollment", {
        student: student._id,
        teacher: student.teacher?._id ?? student.teacher,
        slots: toSlots(v),
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

  /**
   * Хуваарийн цагийг засна. Сервер ирээдүйн товлогдсон хичээлийг устгаж шинэ
   * цагаар дахин үүсгэнэ — өнгөрсөн болон ирц бүртгэгдсэн хичээл хэвээр.
   */
  const update = useMutation({
    mutationFn: async (v: any) =>
      api.put(`/enrollment/${active._id}`, { slots: toSlots(v) }),
    onSuccess: (res) => {
      message.success(res.data.message);
      setOpen(false);
      setEditing(false);
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
              <Button size="small" icon={<EditOutlined />} onClick={openEdit}>
                Засах
              </Button>
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
              onClick={openCreate}
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
                {
                  title: "Өрөө",
                  dataIndex: "room",
                  render: (r) => r?.name ?? <Tag color="blue">Сул өрөөнд</Tag>,
                },
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
        title={editing ? "Тогтмол хуваарь засах" : "Тогтмол хуваарь үүсгэх"}
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        // Form үргэлж mount хийгдсэн байх ёстой — эс бөгөөс засах үед
        // setFieldsValue анх нээхэд хоосон form руу бичигдэнэ.
        forceRender
        footer={
          <Space style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setOpen(false)}>Болих</Button>
            <Button
              type="primary"
              loading={create.isPending || update.isPending}
              onClick={() => form.submit()}
            >
              {editing ? "Хадгалах" : "Үүсгэх"}
            </Button>
          </Space>
        }
      >
        <Alert
          type={editing ? "warning" : "info"}
          showIcon
          style={{ marginBottom: 16 }}
          message={`Багш: ${student?.teacher?.name} · Хөгжим: ${student?.instrument?.name}`}
          description={
            editing
              ? "Өнөөдрөөс хойшхи товлогдсон хичээлүүд устаж, шинэ цагаар дахин товлогдоно. Өнгөрсөн болон ирц бүртгэгдсэн хичээл өөрчлөгдөхгүй."
              : "Ердийн тохиолдолд 7 хоногт 2 цаг сонгоно. Үүсгэхэд энэ сарын үлдсэн хичээлүүд шууд товлогдоно."
          }
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => (editing ? update.mutate(v) : create.mutate(v))}
        >
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
                    <Form.Item name={[field.name, "room"]}>
                      <Select
                        style={{ width: 150 }}
                        placeholder="Өрөө: автомат"
                        allowClear
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
