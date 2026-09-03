"use client";

import { useState } from "react";
import {
  App,
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Popconfirm,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  LessonStatusTag,
  SALARY_STATUS_LABEL,
  minuteLabel,
  money,
  studentName,
} from "@/lib/labels";

/** Нэг багшийн задаргаа + ноорог үүсгэх. */
function PreviewDrawer({
  teacher,
  from,
  to,
  onClose,
}: {
  teacher: any | null;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["salary-preview", teacher?._id, from, to],
    queryFn: async () =>
      (
        await api.get("/salary/preview", {
          params: { teacher: teacher._id, from, to },
        })
      ).data,
    enabled: !!teacher,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post("/salary", {
        teacher: teacher._id,
        periodFrom: from,
        periodTo: to,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["salary"] });
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Drawer
      title={teacher ? `${teacher.name} — цалингийн задаргаа` : ""}
      open={!!teacher}
      onClose={onClose}
      width={720}
      loading={isLoading}
    >
      {data && (
        <>
          <Space size={48} style={{ marginBottom: 16 }}>
            <Statistic title="Хичээл" value={data.lessonCount} />
            {data.priorCount > 0 && (
              <Statistic title="Өмнө орсон" value={data.priorCount} />
            )}
            <Statistic
              title="Нийт"
              value={data.totalAmount}
              formatter={(v) => money(Number(v))}
            />
          </Space>

          {/* «Өмнө орсон» хичээл нь Lesson бүртгэлгүй тул доорх хүснэгтэд
              харагдахгүй — эндээс задаргааг нь харуулна. */}
          {data.priorCount > 0 && (
            <Alert
              type="warning"
              style={{ marginBottom: 12 }}
              message={`Өмнө орсон хичээл: ${data.priorCount} ширхэг, ${money(data.priorAmount)}`}
              description={
                <>
                  <div style={{ marginBottom: 4 }}>
                    Багш системд бүртгэхээс өмнө заасан, огноогүй хичээлүүд.
                    Доорх хүснэгтэд ороогүй ч нийт дүнд тооцогдоно.
                  </div>
                  {data.priorItems?.map((i: any, n: number) => (
                    <div key={n}>
                      {i.studentName} · {i.monthKey} — {i.count} × {money(i.rate)}{" "}
                      = <b>{money(i.amount)}</b>
                    </div>
                  ))}
                </>
              }
            />
          )}
          {data.excluded?.length > 0 && (
            <Alert
              type="info"
              style={{ marginBottom: 12 }}
              message="Цалинд ороогүй хичээл"
              description={data.excluded
                .map((e: any) => `${e.label}: ${e.count}`)
                .join(" · ")}
            />
          )}
          <Table
            size="small"
            rowKey="_id"
            dataSource={data.lessons}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            columns={[
              { title: "Огноо", dataIndex: "date", width: 110 },
              {
                title: "Цаг",
                key: "t",
                width: 70,
                render: (_, r: any) => minuteLabel(r.startMinute),
              },
              {
                title: "Сурагч",
                key: "s",
                render: (_, r: any) => studentName(r.student),
              },
              {
                title: "Төлөв",
                dataIndex: "status",
                render: (v) => <LessonStatusTag status={v} />,
              },
              {
                title: "Дүн",
                dataIndex: "rate",
                align: "right",
                render: (v) => money(v),
              },
            ]}
          />
          {can("SALARY", "isWrite") &&
            data.lessonCount + data.priorCount > 0 && (
            <Button
              type="primary"
              block
              style={{ marginTop: 16 }}
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              Тооцоо үүсгэх ({money(data.totalAmount)})
            </Button>
            )}
        </>
      )}
    </Drawer>
  );
}

/** Олголтын дэлгэрэнгүй — хичээл бүрээр. */
function PayoutDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["salary", id],
    queryFn: async () => (await api.get(`/salary/${id}`)).data,
    enabled: !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["salary"] });
    qc.invalidateQueries({ queryKey: ["salary-summary"] });
  };

  const confirm = useMutation({
    mutationFn: async () => api.post(`/salary/${id}/confirm`),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/salary/${id}`),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Drawer
      title="Цалингийн тооцоо"
      open={!!id}
      onClose={onClose}
      width={720}
      loading={isLoading}
    >
      {data && (
        <>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Код">{data.code}</Descriptions.Item>
            <Descriptions.Item label="Багш">
              {data.teacher?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Хугацаа" span={2}>
              {data.periodFrom} — {data.periodTo}
            </Descriptions.Item>
            <Descriptions.Item label="Хичээл">
              {data.lessonCount}
            </Descriptions.Item>
            <Descriptions.Item label="Нийт дүн">
              <b>{money(data.totalAmount)}</b>
            </Descriptions.Item>
            <Descriptions.Item label="Төлөв" span={2}>
              <Tag color={data.status === "PAID" ? "green" : "orange"}>
                {SALARY_STATUS_LABEL[data.status]}
              </Tag>
              {data.paidAt && (
                <Typography.Text type="secondary">
                  {dayjs(data.paidAt).format("YYYY-MM-DD HH:mm")}
                </Typography.Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Space style={{ margin: "16px 0" }}>
            {data.status === "DRAFT" && can("SALARY", "isApprove") && (
              <Popconfirm
                title="Цалин олгосон гэж баталгаажуулах уу?"
                onConfirm={() => confirm.mutate()}
              >
                <Button type="primary" loading={confirm.isPending}>
                  Олгосон гэж баталгаажуулах
                </Button>
              </Popconfirm>
            )}
            {data.status === "DRAFT" && can("SALARY", "isRemove") && (
              <Popconfirm
                title="Ноорог цуцлах уу?"
                description="Хичээлүүд дахин тооцоонд орно."
                onConfirm={() => remove.mutate()}
              >
                <Button danger loading={remove.isPending}>
                  Ноорог цуцлах
                </Button>
              </Popconfirm>
            )}
          </Space>

          <Table
            size="small"
            rowKey="_id"
            dataSource={data.lessons}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            columns={[
              { title: "Огноо", dataIndex: "date", width: 110 },
              {
                title: "Сурагч",
                key: "s",
                render: (_, r: any) => studentName(r.student),
              },
              {
                title: "Төлөв",
                dataIndex: "status",
                render: (v) => <LessonStatusTag status={v} />,
              },
              {
                title: "Дүн",
                dataIndex: "rate",
                align: "right",
                render: (v) => money(v),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}

export default function SalaryPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [teacher, setTeacher] = useState<any | null>(null);
  const [payout, setPayout] = useState<string | null>(null);

  const from = range[0].format("YYYY-MM-DD");
  const to = range[1].format("YYYY-MM-DD");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["salary-summary", from, to],
    queryFn: async () =>
      (await api.get("/salary/summary", { params: { from, to } })).data,
  });

  const { data: history } = useQuery({
    queryKey: ["salary", "list"],
    queryFn: async () =>
      (await api.get("/salary", { params: { limit: 50 } })).data as {
        rows: any[];
        count: number;
      },
  });

  return (
    <div>
      <Typography.Title level={4}>Цалин</Typography.Title>
      <Tabs
        items={[
          {
            key: "calc",
            label: "Тооцоо",
            children: (
              <Card size="small">
                <Space wrap style={{ marginBottom: 12, display: "flex" }}>
                  <DatePicker.RangePicker
                    value={range}
                    onChange={(v) => v && setRange(v as [Dayjs, Dayjs])}
                    allowClear={false}
                    format="YYYY-MM-DD"
                  />
                  <Button
                    onClick={() =>
                      setRange([dayjs().startOf("month"), dayjs().endOf("month")])
                    }
                  >
                    Энэ сар
                  </Button>
                  <Button
                    onClick={() =>
                      setRange([
                        dayjs().add(-1, "month").startOf("month"),
                        dayjs().add(-1, "month").endOf("month"),
                      ])
                    }
                  >
                    Өнгөрсөн сар
                  </Button>
                </Space>
                <div style={{ marginBottom: 12 }}>
                  <Space size={48}>
                    <Statistic title="Хичээл" value={summary?.totalLessons ?? 0} />
                    <Statistic
                      title="Нийт олгох"
                      value={summary?.totalAmount ?? 0}
                      formatter={(v) => money(Number(v))}
                    />
                  </Space>
                </div>
                <Table
                  size="small"
                  rowKey={(r: any) => r.teacher?._id ?? Math.random()}
                  loading={isLoading}
                  dataSource={summary?.rows || []}
                  pagination={false}
                  columns={[
                    { title: "Багш", dataIndex: ["teacher", "name"] },
                    { title: "Хичээл", dataIndex: "lessonCount", align: "right" },
                    {
                      title: "Дүн",
                      dataIndex: "totalAmount",
                      align: "right",
                      render: (v) => <b>{money(v)}</b>,
                    },
                    {
                      title: "",
                      key: "a",
                      width: 120,
                      render: (_, r: any) => (
                        <Button size="small" onClick={() => setTeacher(r.teacher)}>
                          Задаргаа
                        </Button>
                      ),
                    },
                  ]}
                />
                {summary?.rows?.length === 0 && (
                  <Alert
                    style={{ marginTop: 12 }}
                    type="info"
                    showIcon
                    message="Энэ хугацаанд олгох цалин алга"
                    description="Хичээлүүд аль хэдийн олгогдсон эсвэл ирц бүртгэгдээгүй байж болно."
                  />
                )}
              </Card>
            ),
          },
          {
            key: "history",
            label: "Түүх",
            children: (
              <Card size="small">
                <Table
                  size="small"
                  rowKey="_id"
                  dataSource={history?.rows || []}
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                  onRow={(r) => ({ onClick: () => setPayout(r._id) })}
                  columns={[
                    { title: "Код", dataIndex: "code", width: 110 },
                    { title: "Багш", dataIndex: ["teacher", "name"] },
                    {
                      title: "Хугацаа",
                      key: "p",
                      render: (_, r: any) => `${r.periodFrom} — ${r.periodTo}`,
                    },
                    { title: "Хичээл", dataIndex: "lessonCount", align: "right" },
                    {
                      title: "Дүн",
                      dataIndex: "totalAmount",
                      align: "right",
                      render: (v) => <b>{money(v)}</b>,
                    },
                    {
                      title: "Төлөв",
                      dataIndex: "status",
                      render: (v) => (
                        <Tag color={v === "PAID" ? "green" : "orange"}>
                          {SALARY_STATUS_LABEL[v]}
                        </Tag>
                      ),
                    },
                    {
                      title: "Олгосон",
                      dataIndex: "paidAt",
                      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <PreviewDrawer
        teacher={teacher}
        from={from}
        to={to}
        onClose={() => setTeacher(null)}
      />
      <PayoutDrawer id={payout} onClose={() => setPayout(null)} />
    </div>
  );
}
