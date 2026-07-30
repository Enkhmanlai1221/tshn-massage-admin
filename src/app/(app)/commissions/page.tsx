"use client";

import { useState } from "react";
import {
  Card,
  Table,
  Typography,
  Select,
  DatePicker,
  Space,
  Statistic,
  Tag,
  Button,
  Popconfirm,
  App,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const { RangePicker } = DatePicker;

export default function CommissionsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canSettle = can("TOUR_OPERATOR", "isApprove");

  const [page, setPage] = useState(1);
  const [operator, setOperator] = useState<string>();
  const [settled, setSettled] = useState<string>(); // "true" | "false" | undefined
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const limit = 20;

  const { data: operators } = useQuery({
    queryKey: ["operators-select"],
    queryFn: async () =>
      (await api.get("/tour-operator", { params: { limit: 200 } })).data.rows,
  });

  const params = {
    page,
    limit,
    operator: operator || undefined,
    settled: settled || undefined,
    from: range?.[0]?.startOf("day").toISOString(),
    to: range?.[1]?.endOf("day").toISOString(),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["commissions", params],
    queryFn: async () =>
      (await api.get("/commission", { params })).data as {
        rows: any[];
        count: number;
        totalAmount: number;
      },
  });

  const settle = useMutation({
    mutationFn: async (id: string) =>
      api.put(`/commission/${id}/settle`),
    onSuccess: () => {
      message.success("Барагдуулсан гэж тэмдэглэлээ");
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const settleBulk = useMutation({
    mutationFn: async (ids: string[]) =>
      (await api.put("/commission/settle", { ids })).data,
    onSuccess: (res) => {
      message.success(`${res.modified || 0} бичлэг барагдууллаа`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <div>
      <Typography.Title level={4}>Тур операторын commission</Typography.Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            allowClear
            placeholder="Оператор"
            style={{ width: 200 }}
            value={operator}
            onChange={(v) => {
              setOperator(v);
              setPage(1);
            }}
            options={(operators || []).map((o: any) => ({
              value: o._id,
              label: `${o.name} (${o.commissionPercent}%)`,
            }))}
          />
          <Select
            allowClear
            placeholder="Төлөв"
            style={{ width: 160 }}
            value={settled}
            onChange={(v) => {
              setSettled(v);
              setPage(1);
            }}
            options={[
              { value: "false", label: "Барагдаагүй" },
              { value: "true", label: "Барагдсан" },
            ]}
          />
          <RangePicker
            value={range as any}
            onChange={(v) => {
              setRange(v as any);
              setPage(1);
            }}
          />
        </Space>
      </Card>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Statistic
          title="Шүүлтэд тохирох нийт commission"
          value={data?.totalAmount || 0}
          suffix="₮"
          formatter={(v) => Number(v).toLocaleString()}
        />
      </Card>

      {canSettle && (
        <Space style={{ marginBottom: 12 }}>
          <Popconfirm
            title={`Сонгосон ${selected.length} бичлэгийг барагдуулах уу?`}
            onConfirm={() => settleBulk.mutate(selected)}
            disabled={!selected.length}
          >
            <Button
              type="primary"
              disabled={!selected.length}
              loading={settleBulk.isPending}
            >
              Сонгосныг барагдуулах
              {selected.length ? ` (${selected.length})` : ""}
            </Button>
          </Popconfirm>
        </Space>
      )}

      <Table
        bordered
        rowKey="_id"
        loading={isLoading}
        dataSource={data?.rows || []}
        rowSelection={
          canSettle
            ? {
                selectedRowKeys: selected,
                onChange: (keys) => setSelected(keys as string[]),
                // Барагдсан мөрийг сонгуулахгүй.
                getCheckboxProps: (r: any) => ({ disabled: r.settled }),
              }
            : undefined
        }
        pagination={{
          current: page,
          pageSize: limit,
          total: data?.count || 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          {
            title: "Огноо",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Оператор",
            key: "operator",
            render: (_, r: any) => r.operator?.name || "-",
          },
          {
            title: "Захиалга",
            key: "appointment",
            render: (_, r: any) =>
              r.appointment
                ? `${r.appointment.code || ""} · ${r.appointment.serviceName || ""}`
                : "-",
          },
          {
            title: "Нийт төлбөр (₮)",
            dataIndex: "baseAmount",
            key: "baseAmount",
            align: "right",
            render: (v) => (v || 0).toLocaleString(),
          },
          {
            title: "Хувь",
            dataIndex: "percent",
            key: "percent",
            align: "right",
            render: (v) => `${v || 0}%`,
          },
          {
            title: "Commission (₮)",
            dataIndex: "amount",
            key: "amount",
            align: "right",
            render: (v) => <b>{(v || 0).toLocaleString()}</b>,
          },
          {
            title: "Төлөв",
            dataIndex: "settled",
            key: "settled",
            render: (v) =>
              v ? (
                <Tag color="green">Барагдсан</Tag>
              ) : (
                <Tag color="orange">Барагдаагүй</Tag>
              ),
          },
          {
            title: "Үйлдэл",
            key: "action",
            render: (_, r: any) =>
              !r.settled && canSettle ? (
                <Popconfirm
                  title="Барагдуулсан гэж тэмдэглэх үү?"
                  onConfirm={() => settle.mutate(r._id)}
                >
                  <Button size="small" loading={settle.isPending}>
                    Барагдуулах
                  </Button>
                </Popconfirm>
              ) : null,
          },
        ]}
        scroll={{ x: true }}
      />
    </div>
  );
}
