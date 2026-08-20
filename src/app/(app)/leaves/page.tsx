"use client";

import { useState } from "react";
import {
  App,
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiError } from "@/lib/api";
import { useTeachers } from "@/lib/hooks";
import { LessonStatusTag, minuteLabel, studentName } from "@/lib/labels";
import LessonDrawer from "@/components/LessonDrawer";

/**
 * Багшийн чөлөө. Хадгалахад тэр хугацааны хичээлүүд автоматаар дараагийн
 * ажлын өдрийн ижил цаг руу зөөгдөнө (7 хоног хайна). Олдохгүй бол
 * "Зохицуулах шаардлагатай" таб дээр гарч ирнэ.
 */
function LeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { data: teachers } = useTeachers();

  const save = useMutation({
    mutationFn: async (v: any) =>
      api.post("/leave", {
        teacher: v.teacher,
        dateFrom: v.range[0].format("YYYY-MM-DD"),
        dateTo: v.range[1].format("YYYY-MM-DD"),
        reason: v.reason,
      }),
    onSuccess: (res) => {
      const { moved, unresolved } = res.data;
      if (unresolved) {
        message.warning(res.data.message, 8);
      } else {
        message.success(res.data.message);
      }
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["unresolved"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      form.resetFields();
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Modal
      title="Багшийн чөлөө бүртгэх"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={save.isPending}
      okText="Бүртгэх"
      cancelText="Болих"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Хичээлүүд автоматаар зөөгдөнө"
        description="Тухайн хугацааны товлогдсон хичээл бүрийг дараагийн 7 хоногийн дотор, ижил цагт, багш болон сурагч хоёулаа сул үед зөөнө. Олдохгүй бол гараар зохицуулах жагсаалтад орно."
      />
      <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
        <Form.Item
          name="teacher"
          label="Багш"
          rules={[{ required: true, message: "Багш сонгоно уу" }]}
        >
          <Select
            placeholder="Сонгох"
            options={(teachers || []).map((t: any) => ({
              value: t._id,
              label: t.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="range"
          label="Хугацаа"
          rules={[{ required: true, message: "Хугацаа сонгоно уу" }]}
        >
          <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="reason" label="Шалтгаан">
          <Input.TextArea rows={2} placeholder="Өвчтэй" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function LeavesPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lesson, setLesson] = useState<string | null>(null);

  const { data: leaves, isLoading } = useQuery({
    queryKey: ["leaves"],
    queryFn: async () =>
      (await api.get("/leave", { params: { limit: 50 } })).data as {
        rows: any[];
        count: number;
      },
  });

  const { data: unresolved, isLoading: unLoading } = useQuery({
    queryKey: ["unresolved"],
    queryFn: async () =>
      (await api.get("/leave/unresolved")).data as {
        rows: any[];
        count: number;
        pending: number;
      },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => api.delete(`/leave/${id}`),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["unresolved"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <div>
      <Space
        style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Багшийн чөлөө
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Чөлөө бүртгэх
        </Button>
      </Space>

      <Tabs
        items={[
          {
            key: "list",
            label: "Чөлөөний бүртгэл",
            children: (
              <Card size="small">
                <Table
                  size="small"
                  rowKey="_id"
                  loading={isLoading}
                  dataSource={leaves?.rows || []}
                  pagination={false}
                  columns={[
                    { title: "Багш", dataIndex: ["teacher", "name"] },
                    {
                      title: "Хугацаа",
                      key: "range",
                      render: (_, r: any) => `${r.dateFrom} — ${r.dateTo}`,
                    },
                    { title: "Шалтгаан", dataIndex: "reason" },
                    {
                      title: "Зөөгдсөн",
                      dataIndex: "movedCount",
                      render: (v) => <Tag color="blue">{v}</Tag>,
                    },
                    {
                      title: "Зохицуулаагүй",
                      dataIndex: "unresolvedCount",
                      render: (v) =>
                        v ? <Tag color="red">{v}</Tag> : <Tag>0</Tag>,
                    },
                    {
                      title: "",
                      key: "actions",
                      render: (_, r: any) => (
                        <Popconfirm
                          title="Чөлөөг цуцлах уу?"
                          description="Зөөгдсөн хичээлүүд байрандаа буцна."
                          onConfirm={() => cancel.mutate(r._id)}
                        >
                          <Button size="small" danger>
                            Цуцлах
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: "unresolved",
            label: (
              <span>
                Зохицуулах шаардлагатай{" "}
                {unresolved?.pending ? (
                  <Tag color="red">{unresolved.pending}</Tag>
                ) : null}
              </span>
            ),
            children: (
              <Card size="small">
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Автоматаар зөөгдөж чадаагүй хичээлүүд"
                  description="Мөр дээр дарж нөхөх хичээлийг гараар товлоно уу."
                />
                <Table
                  size="small"
                  rowKey="_id"
                  loading={unLoading}
                  dataSource={unresolved?.rows || []}
                  pagination={false}
                  columns={[
                    { title: "Огноо", dataIndex: "date", width: 110 },
                    {
                      title: "Цаг",
                      key: "time",
                      width: 80,
                      render: (_, r: any) => minuteLabel(r.startMinute),
                    },
                    {
                      title: "Сурагч",
                      key: "student",
                      render: (_, r: any) => (
                        <a onClick={() => setLesson(r._id)}>
                          {studentName(r.student)}
                        </a>
                      ),
                    },
                    { title: "Багш", dataIndex: ["teacher", "name"] },
                    {
                      title: "Төлөв",
                      dataIndex: "status",
                      render: (v) => <LessonStatusTag status={v} />,
                    },
                    {
                      title: "Нөхөх хичээл",
                      key: "makeup",
                      render: (_, r: any) =>
                        r.scheduledMakeup ? (
                          <Tag color="green">{r.scheduledMakeup.date}</Tag>
                        ) : (
                          <Button size="small" onClick={() => setLesson(r._id)}>
                            Товлох
                          </Button>
                        ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <LeaveModal open={open} onClose={() => setOpen(false)} />
      <LessonDrawer lessonId={lesson} onClose={() => setLesson(null)} />
    </div>
  );
}
