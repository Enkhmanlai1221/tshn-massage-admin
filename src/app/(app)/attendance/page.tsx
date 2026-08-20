"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api } from "@/lib/api";
import { useTeachers } from "@/lib/hooks";
import { LessonStatusTag, minuteLabel, studentName } from "@/lib/labels";
import LessonDrawer from "@/components/LessonDrawer";
import AttendanceButtons from "@/components/AttendanceButtons";

function LessonTable({
  rows,
  loading,
  onOpen,
}: {
  rows: any[];
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <Table
      size="small"
      rowKey="_id"
      loading={loading}
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: false }}
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
            <a onClick={() => onOpen(r._id)}>{studentName(r.student)}</a>
          ),
        },
        { title: "Багш", dataIndex: ["teacher", "name"] },
        { title: "Өрөө", dataIndex: ["room", "name"] },
        {
          title: "Одоогийн төлөв",
          dataIndex: "status",
          width: 130,
          render: (v) => <LessonStatusTag status={v} />,
        },
        {
          title: "Ирц бүртгэх",
          key: "mark",
          width: 260,
          render: (_, r: any) =>
            r.salaryPayout ? (
              <Tag color="green">Цалин олгогдсон</Tag>
            ) : (
              <AttendanceButtons lesson={r} />
            ),
        },
      ]}
    />
  );
}

export default function AttendancePage() {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [teacher, setTeacher] = useState<string | undefined>();
  const [open, setOpen] = useState<string | null>(null);
  const { data: teachers } = useTeachers();

  const dateKey = date.format("YYYY-MM-DD");

  const { data: dayRows, isLoading } = useQuery({
    queryKey: ["attendance", "day", dateKey, teacher],
    queryFn: async () =>
      (
        await api.get("/lesson", {
          params: { from: dateKey, to: dateKey, teacher, limit: 200 },
        })
      ).data.rows as any[],
  });

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ["attendance", "pending", teacher],
    queryFn: async () =>
      (await api.get("/attendance/pending", { params: { teacher } })).data as {
        rows: any[];
        count: number;
      },
  });

  const filter = (
    <Space wrap style={{ marginBottom: 12 }}>
      <Select
        allowClear
        placeholder="Багш"
        style={{ width: 180 }}
        options={(teachers || []).map((t: any) => ({
          value: t._id,
          label: t.name,
        }))}
        onChange={setTeacher}
      />
    </Space>
  );

  return (
    <div>
      <Typography.Title level={4}>Ирц</Typography.Title>
      <Tabs
        items={[
          {
            key: "day",
            label: "Өдрөөр",
            children: (
              <Card size="small">
                <Space wrap style={{ marginBottom: 12, display: "flex" }}>
                  <DatePicker
                    value={date}
                    onChange={(v) => v && setDate(v)}
                    allowClear={false}
                    format="YYYY-MM-DD"
                  />
                  <Button onClick={() => setDate(dayjs())}>Өнөөдөр</Button>
                  {filter}
                </Space>
                <LessonTable
                  rows={dayRows || []}
                  loading={isLoading}
                  onOpen={setOpen}
                />
              </Card>
            ),
          },
          {
            key: "pending",
            label: (
              <span>
                Бүртгэгдээгүй{" "}
                {pending?.count ? (
                  <Tag color="red">{pending.count}</Tag>
                ) : null}
              </span>
            ),
            children: (
              <Card size="small">
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Өнгөрсөн ч ирц нь бүртгэгдээгүй хичээлүүд"
                  description="Багш мартсан тохиолдолд эндээс админ бүртгэнэ."
                />
                {filter}
                <LessonTable
                  rows={pending?.rows || []}
                  loading={pendingLoading}
                  onOpen={setOpen}
                />
              </Card>
            ),
          },
        ]}
      />
      <LessonDrawer lessonId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
