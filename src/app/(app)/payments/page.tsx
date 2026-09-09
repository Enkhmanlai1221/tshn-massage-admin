"use client";

import { useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTeachers } from "@/lib/hooks";
import { studentName } from "@/lib/labels";

/** Урьдчилж төлөх боломжит сарын тоо. */
const ADVANCE_OPTIONS = [2, 3, 6, 12];

/**
 * Сурагчийн сарын төлбөр — зөвхөн "төлсөн / төлөөгүй" төлөв (дүн тооцохгүй).
 *
 * Зарим сурагч 2-3 сараар урьдчилж төлдөг тул нэг товшилтоор олон сарыг
 * тэмдэглэх боломжтой: «Олон сар» → 3 сар гэвэл сонгосон сараас эхлэн
 * гурван сар PAID болно. «Төлсөн хүртэл» багана нь урьдчилгааг харуулна.
 */
export default function PaymentsPage() {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [teacher, setTeacher] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const monthKey = month.format("YYYY-MM");
  const { data: teachers } = useTeachers();

  const { data, isLoading } = useQuery({
    queryKey: ["payments", monthKey, teacher, status],
    queryFn: async () =>
      (await api.get("/payment", { params: { monthKey, teacher, status } }))
        .data,
  });

  const mark = useMutation({
    mutationFn: async (p: {
      student: string;
      paid: boolean;
      months?: number;
    }) =>
      api.post(`/payment/${p.student}`, {
        monthKey,
        status: p.paid ? "PAID" : "UNPAID",
        months: p.months ?? 1,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const canApprove = can("PAYMENT", "isApprove");

  return (
    <div>
      <Typography.Title level={4}>Сурагчийн төлбөр</Typography.Title>
      <Card size="small">
        <Space wrap style={{ marginBottom: 12, display: "flex" }}>
          <DatePicker
            picker="month"
            value={month}
            onChange={(v) => v && setMonth(v)}
            allowClear={false}
            format="YYYY-MM"
          />
          <Select
            allowClear
            placeholder="Багш"
            style={{ width: 170 }}
            options={(teachers || []).map((t: any) => ({
              value: t._id,
              label: t.name,
            }))}
            onChange={setTeacher}
          />
          <Select
            allowClear
            placeholder="Төлөв"
            style={{ width: 140 }}
            options={[
              { value: "PAID", label: "Төлсөн" },
              { value: "UNPAID", label: "Төлөөгүй" },
            ]}
            onChange={setStatus}
          />
        </Space>

        <div style={{ marginBottom: 12 }}>
          <Space size={48}>
            <Statistic title="Нийт" value={data?.count ?? 0} />
            <Statistic
              title="Төлсөн"
              value={data?.paid ?? 0}
              valueStyle={{ color: "#22c55e" }}
            />
            <Statistic
              title="Төлөөгүй"
              value={data?.unpaid ?? 0}
              valueStyle={{ color: "#ef4444" }}
            />
            <Statistic
              title="Урьдчилсан"
              value={data?.advance ?? 0}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Space>
        </div>

        <Table
          size="small"
          rowKey={(r: any) => r.student._id}
          loading={isLoading}
          dataSource={data?.rows || []}
          pagination={{ pageSize: 30, showSizeChanger: false }}
          columns={[
            {
              title: "Код",
              dataIndex: ["student", "code"],
              width: 110,
            },
            {
              title: "Сурагч",
              key: "name",
              render: (_, r: any) => studentName(r.student),
            },
            {
              title: "Хөгжим",
              dataIndex: ["student", "instrument", "name"],
              render: (v, r: any) => (
                <Tag color={r.student.instrument?.color}>{v}</Tag>
              ),
            },
            { title: "Багш", dataIndex: ["student", "teacher", "name"] },
            {
              title: "Утас",
              key: "phone",
              render: (_, r: any) =>
                r.student.phone || r.student.parentPhone || "—",
            },
            {
              title: `${monthKey} төлбөр`,
              key: "status",
              width: 160,
              render: (_, r: any) => (
                <Space>
                  <Switch
                    checked={r.status === "PAID"}
                    disabled={!canApprove || mark.isPending}
                    onChange={(v) =>
                      mark.mutate({ student: r.student._id, paid: v })
                    }
                  />
                  <Tag color={r.status === "PAID" ? "green" : "red"}>
                    {r.status === "PAID" ? "Төлсөн" : "Төлөөгүй"}
                  </Tag>
                </Space>
              ),
            },
            {
              title: "Төлсөн хүртэл",
              key: "paidThrough",
              width: 230,
              render: (_, r: any) => (
                <Space>
                  {r.advanceMonths > 0 ? (
                    <Tag color="blue">
                      {r.paidThrough} хүртэл · +{r.advanceMonths} сар
                    </Tag>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  )}
                  {canApprove && (
                    <Dropdown
                      disabled={mark.isPending}
                      menu={{
                        items: [
                          ...ADVANCE_OPTIONS.map((n) => ({
                            key: String(n),
                            label: `${n} сарын төлбөр авсан`,
                          })),
                          ...(r.advanceMonths > 0
                            ? [
                                { type: "divider" as const },
                                {
                                  key: "undo",
                                  danger: true,
                                  label: `Урьдчилгааг цуцлах (${
                                    r.advanceMonths + 1
                                  } сар)`,
                                },
                              ]
                            : []),
                        ],
                        onClick: ({ key }) =>
                          key === "undo"
                            ? mark.mutate({
                                student: r.student._id,
                                paid: false,
                                months: r.advanceMonths + 1,
                              })
                            : mark.mutate({
                                student: r.student._id,
                                paid: true,
                                months: Number(key),
                              }),
                      }}
                    >
                      <Button size="small">
                        Олон сар <DownOutlined />
                      </Button>
                    </Dropdown>
                  )}
                </Space>
              ),
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          «Олон сар» нь сонгосон сараас эхлэн тэр тооны сарыг нэг дор
          баталгаажуулна (ж: 2026-09 дээр «3 сар» → 09, 10, 11 сар төлөгдсөн).
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
