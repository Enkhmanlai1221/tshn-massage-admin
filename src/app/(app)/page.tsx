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
  Tooltip,
  Typography,
} from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import StudentDrawer from "@/components/StudentDrawer";
import { studentName, money, PaymentStatusTag } from "@/lib/labels";

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
          {/*
            Зарагдсан оролтын үлдэгдэл — сарын норм БИШ. Сурагч төлбөрөө
            өөрийн хурдаараа зарцуулдаг тул «энэ сард X/448» гэдэг нь
            биелэх ёсгүй амлалт өгдөг байв.
          */}
          <Statistic
            title="Төлсөн оролтын үлдэгдэл"
            value={s.package?.remaining ?? 0}
            suffix={
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                / {s.package?.entitled ?? 0} зарагдсан
              </Typography.Text>
            }
          />
          <Progress
            percent={s.package?.usedPercent ?? 0}
            size="small"
            style={{ marginBottom: 0 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ашигласан {s.package?.used ?? 0}
            {s.package?.overdrawn > 0 &&
              ` · ${s.package.overdrawn} сурагч хэтэрсэн`}
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card size="small">
          <Statistic
            title={`${s.monthKey}-д орсон`}
            value={s.attended}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            системд {s.attendedLessons} + гараар {s.prior}
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
  const finished = rows.filter((r) => (r.package?.balance ?? 0) <= 0).length;

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
          description="Бүх сурагчийн төлсөн оролтын үлдэгдэл хангалттай байна."
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
              `Төлсөн төлбөрөөрөө авсан оролтоос ${data?.threshold} ба түүнээс цөөн үлдсэн` +
              (finished ? `, үүнээс ${finished} нь бүрэн дууссан` : "") +
              ". Дараагийн төлбөрийг авах цаг болжээ."
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
                title: "Багц",
                key: "package",
                width: 150,
                render: (_, r: any) => {
                  const pk = r.package;
                  if (!pk) return "—";
                  if (pk.entitled === 0) {
                    return (
                      <Tooltip title="Төлбөрийн бүртгэл алга — оруулна уу">
                        <Tag color="red">төлбөр бүртгээгүй</Tag>
                      </Tooltip>
                    );
                  }
                  return (
                    <Tooltip
                      title={`${pk.paidMonths} сар төлсөн = ${pk.entitled} оролт`}
                    >
                      <Tag>
                        {pk.used}/{pk.entitled} ашигласан
                      </Tag>
                    </Tooltip>
                  );
                },
              },
              {
                title: "Үлдсэн",
                key: "remaining",
                width: 120,
                render: (_, r: any) => {
                  const b = r.package?.balance ?? 0;
                  if (b < 0) {
                    return <Tag color="red">{Math.abs(b)} илүү орсон</Tag>;
                  }
                  return b === 0 ? (
                    <Tag color="red">Дууссан</Tag>
                  ) : (
                    <Tag color="orange">{b} оролт</Tag>
                  );
                },
              },
              {
                title: "Цааш товлогдсон",
                key: "upcoming",
                width: 120,
                render: (_, r: any) =>
                  r.upcomingScheduled ? (
                    <Tooltip title={`${r.lastScheduledDate} хүртэл товлогдсон`}>
                      <Tag>{r.upcomingScheduled} хичээл</Tag>
                    </Tooltip>
                  ) : (
                    <Tag color="red">Товлогдоогүй</Tag>
                  ),
              },
              {
                title: "Төлбөр",
                dataIndex: "lastPaidMonth",
                key: "lastPaidMonth",
                width: 150,
                render: (v) => <PaymentStatusTag lastPaidMonth={v} />,
              },
            ]}
          />
        </>
      )}

      <StudentDrawer studentId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
