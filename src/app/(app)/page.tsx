"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import StudentDrawer from "@/components/StudentDrawer";
import { studentName, money } from "@/lib/labels";

/**
 * Сургуулийн хэмжээний сарын нэгтгэл — «бүх сурагчийн оролт нийлээд хэд вэ».
 * Норм биелэлт + цалингийн явцыг нэг мөрөнд.
 */
function SummaryRow() {
  const { can } = useAuth();
  const canSalary = can("SALARY", "isRead");

  const { data: s } = useQuery({
    queryKey: ["students", "summary"],
    queryFn: async () => (await api.get("/student/summary")).data,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Цалин: одоо байгаа цалингийн нэгтгэл endpoint — жинхэнэ цалингийн
  // дүрмээр (тасалтын дүрэм, өмнөх оролт, олгогдсоныг хасаад) бодогдоно.
  const { data: salary } = useQuery({
    enabled: canSalary,
    queryKey: ["salary", "month-summary"],
    queryFn: async () =>
      (
        await api.get("/salary/summary", {
          params: {
            from: dayjs().startOf("month").format("YYYY-MM-DD"),
            to: dayjs().endOf("month").format("YYYY-MM-DD"),
          },
        })
      ).data,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (!s) return null;

  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={8} lg={5}>
        <Card size="small">
          <Statistic
            title="Идэвхтэй сурагч"
            value={s.activeStudents}
            suffix={
              s.pausedStudents > 0 ? (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  +{s.pausedStudents} завсарласан
                </Typography.Text>
              ) : undefined
            }
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={5}>
        <Card size="small">
          <Statistic
            title={`Сарын оролт (${s.monthKey})`}
            value={s.attended}
            suffix={`/ ${s.totalQuota}`}
          />
          <Progress
            percent={s.fillPercent}
            size="small"
            style={{ marginBottom: 0 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            системд {s.attendedLessons} + өмнөх {s.prior}
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card size="small">
          <Statistic
            title="Тасалсан / Чөлөөтэй"
            value={s.absent}
            suffix={`/ ${s.excused}`}
            valueStyle={s.absent > 0 ? { color: "#cf1322" } : undefined}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card size="small">
          <Statistic title="Товлогдсон үлдсэн" value={s.scheduled} />
        </Card>
      </Col>
      {canSalary && salary && (
        <Col xs={12} sm={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Олгогдоогүй цалин (энэ сар)"
              value={money(salary.totalAmount)}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {salary.totalLessons} хичээл цалинд бодогдоно
            </Typography.Text>
          </Card>
        </Col>
      )}
    </Row>
  );
}

/**
 * Дашбоард — админ нэвтрээд хамгийн түрүүнд харах дэлгэц.
 *
 * Дээр нь сургуулийн сарын нэгтгэл, доор нь «оролт дуусах гэж буй сурагчид»:
 * энэ сарын нормд 2 ба түүнээс цөөн оролт үлдсэн сурагчдыг жагсааж, хуваарь
 * сунгах/төлбөр авах цаг болсныг анхааруулна.
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

      {canStudent && <SummaryRow />}

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
