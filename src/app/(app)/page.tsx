"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Space, Spin, Table, Tag, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import StudentDrawer from "@/components/StudentDrawer";
import { studentName } from "@/lib/labels";

/**
 * Дашбоард — админ нэвтрээд хамгийн түрүүнд харах дэлгэц.
 *
 * Гол хэсэг нь «оролт дуусах гэж буй сурагчид»: энэ сарын нормд 2 ба түүнээс
 * цөөн оролт үлдсэн сурагчдыг жагсааж, хуваарь сунгах/төлбөр авах цаг
 * болсныг анхааруулна.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);

  const canStudent = can("STUDENT", "isRead");
  const { data, isLoading } = useQuery({
    enabled: canStudent,
    queryKey: ["students", "expiring"],
    queryFn: async () => (await api.get("/student/expiring")).data,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const rows: any[] = data?.rows || [];
  const finished = rows.filter((r) => (r.month?.remaining ?? 0) === 0).length;

  return (
    <div>
      <Typography.Title level={3}>Дашбоард</Typography.Title>

      {!canStudent ? (
        <Alert
          type="info"
          showIcon
          message="Сурагчийн мэдээлэл харах эрхгүй тул анхааруулга харагдахгүй."
        />
      ) : isLoading ? (
        <Spin />
      ) : rows.length === 0 ? (
        <Alert
          type="success"
          showIcon
          message="Оролт дуусах гэж буй сурагч алга"
          description={`Энэ сард (${data?.monthKey}) бүх идэвхтэй сурагчийн оролт хэвийн байна.`}
        />
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 12 }}
            message={`${rows.length} сурагчийн оролт дуусах гэж байна`}
            description={
              `Энэ сарын ${data?.quota} оролтын нормд ${data?.threshold} ба түүнээс цөөн оролт үлдсэн` +
              (finished ? `, үүнээс ${finished} нь бүрэн дууссан` : "") +
              ". Хуваарийг сунгаж, дараагийн төлбөрийг шийдвэрлэнэ үү."
            }
            action={
              <Button size="small" onClick={() => router.push("/students")}>
                Сурагчид руу
              </Button>
            }
          />
          <Table
            size="small"
            rowKey="_id"
            dataSource={rows}
            pagination={false}
            columns={[
              { title: "Код", dataIndex: "code", key: "code", width: 100 },
              {
                title: "Нэр",
                key: "name",
                render: (_, r: any) => (
                  <a onClick={() => setOpen(r._id)}>{studentName(r)}</a>
                ),
              },
              {
                title: "Хөгжим",
                key: "instrument",
                render: (_, r: any) =>
                  r.instrument ? (
                    <Tag color={r.instrument.color}>{r.instrument.name}</Tag>
                  ) : (
                    "—"
                  ),
              },
              {
                title: "Багш",
                dataIndex: ["teacher", "name"],
                key: "teacher",
                render: (v) => v || "—",
              },
              {
                title: "Утас",
                key: "phone",
                render: (_, r: any) => r.phone || r.parentPhone || "—",
              },
              {
                title: "Энэ сар",
                key: "month",
                width: 130,
                render: (_, r: any) => {
                  const m = r.month;
                  if (!m) return "—";
                  return (
                    <Tag color={m.remaining === 0 ? "red" : "orange"}>
                      {m.attended}/{m.quota} оролт
                    </Tag>
                  );
                },
              },
              {
                title: "Үлдсэн",
                key: "remaining",
                width: 100,
                render: (_, r: any) => {
                  const rem = r.month?.remaining ?? 0;
                  return rem === 0 ? (
                    <Tag color="red">Дууссан</Tag>
                  ) : (
                    <Tag color="orange">{rem} оролт</Tag>
                  );
                },
              },
              {
                title: "Цааш товлогдсон",
                key: "upcoming",
                width: 170,
                render: (_, r: any) =>
                  r.upcomingScheduled ? (
                    <Space size={4}>
                      <Tag>{r.upcomingScheduled} хичээл</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {r.lastScheduledDate} хүртэл
                      </Typography.Text>
                    </Space>
                  ) : (
                    <Tag color="red">Товлогдоогүй</Tag>
                  ),
              },
              {
                title: "Төлбөр",
                dataIndex: "lastPaidMonth",
                key: "lastPaidMonth",
                width: 100,
                render: (v) =>
                  v === dayjs().format("YYYY-MM") ? (
                    <Tag color="green">Төлсөн</Tag>
                  ) : (
                    <Tag color="red">Төлөөгүй</Tag>
                  ),
              },
            ]}
          />
        </>
      )}

      <StudentDrawer studentId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
