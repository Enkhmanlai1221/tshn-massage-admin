"use client";

import { useState } from "react";
import {
  App,
  Card,
  DatePicker,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTeachers } from "@/lib/hooks";
import { studentName } from "@/lib/labels";

/**
 * Сурагчийн сарын төлбөр — зөвхөн "төлсөн / төлөөгүй" төлөв.
 * Дүн, өр тооцохгүй (тохирсны дагуу).
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

  const toggle = useMutation({
    mutationFn: async (p: { student: string; paid: boolean }) =>
      api.post(`/payment/${p.student}`, {
        monthKey,
        status: p.paid ? "PAID" : "UNPAID",
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
                    disabled={!canApprove || toggle.isPending}
                    onChange={(v) =>
                      toggle.mutate({ student: r.student._id, paid: v })
                    }
                  />
                  <Tag color={r.status === "PAID" ? "green" : "red"}>
                    {r.status === "PAID" ? "Төлсөн" : "Төлөөгүй"}
                  </Tag>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
