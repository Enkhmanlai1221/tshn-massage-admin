"use client";

import { useState } from "react";
import { Card, Table, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { MethodTag } from "@/lib/labels";

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["payments", page],
    queryFn: async () =>
      (await api.get("/payment", { params: { page, limit } })).data as {
        rows: any[];
        count: number;
      },
  });

  return (
    <div>
      <Typography.Title level={4}>Төлбөр</Typography.Title>
      <Table
        bordered
        rowKey="_id"
        loading={isLoading}
        dataSource={data?.rows || []}
        pagination={{
          current: page,
          pageSize: limit,
          total: data?.count || 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: "Код", dataIndex: "code", key: "code" },
          {
            title: "Үйлчлүүлэгч",
            key: "customer",
            render: (_, r: any) =>
              r.customer
                ? `${r.customer.firstName || ""} ${r.customer.lastName || ""}`
                : "-",
          },
          {
            title: "Үйлчилгээ",
            key: "service",
            render: (_, r: any) => r.appointment?.serviceName || "-",
          },
          {
            title: "Дүн (₮)",
            dataIndex: "amount",
            key: "amount",
            render: (v) => v?.toLocaleString(),
          },
          {
            title: "Арга",
            dataIndex: "method",
            key: "method",
            render: (v) => <MethodTag method={v} />,
          },
          {
            title: "Огноо",
            dataIndex: "paidAt",
            key: "paidAt",
            render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
        ]}
        scroll={{ x: true }}
      />
    </div>
  );
}
