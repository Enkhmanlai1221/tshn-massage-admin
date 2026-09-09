"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useTeachers } from "@/lib/hooks";
import {
  GENDER_LABEL,
  LessonStatusTag,
  STUDENT_LEVEL_LABEL,
  StudentStatusTag,
  PaymentStatusTag,
  studentName,
  money,
} from "@/lib/labels";
import EnrollmentPanel from "./EnrollmentPanel";

/** Нэг сарын оролтын бүртгэл (хадгалаагүй засварыг ч агуулна). */
interface Row {
  monthKey: string;
  count: number;
  paidBefore: number;
}

/** Багш солих — түүх хадгалагдана (хуучин бичлэг хаагдаж шинэ нээгдэнэ). */
function ChangeTeacherDrawer({
  student,
  open,
  onClose,
}: {
  student: any;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { data: teachers } = useTeachers({
    instrument: student?.instrument?._id ?? student?.instrument,
  });

  const save = useMutation({
    mutationFn: async (v: any) =>
      api.post(`/student/${student._id}/change-teacher`, v),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["student", student._id] });
      form.resetFields();
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Drawer
      title="Багш солих"
      open={open}
      onClose={onClose}
      width={420}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Болих</Button>
          <Button
            type="primary"
            loading={save.isPending}
            onClick={() => form.submit()}
          >
            Солих
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        Багш солиход түүх хадгалагдана. Товлогдсон хичээлүүдийн багш
        өөрчлөгдөхгүй — хуваарийг тусад нь шинэчилнэ.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
        <Form.Item
          name="teacher"
          label="Шинэ багш"
          rules={[{ required: true, message: "Багш сонгоно уу" }]}
        >
          <Select
            placeholder="Сонгох"
            options={(teachers || [])
              .filter((t: any) => t._id !== (student?.teacher?._id ?? student?.teacher))
              .map((t: any) => ({ value: t._id, label: t.name }))}
          />
        </Form.Item>
        <Form.Item name="reason" label="Шалтгаан">
          <Input.TextArea rows={2} placeholder="Хуваарь тохирохгүй" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

/**
 * САРЫН ОРОЛТ — админы гар бүртгэл.
 *
 * Өгөгдлийг эхнээс нь гараар оруулахад сурагч бүрийн «орсон N, үүнээс
 * цалинжсан K»-г админ эндээс тавина. Систем: цалинд орох = N − K −
 * (олголтод орсон), сарын явц = системд бүртгэгдсэн + өмнөх N.
 */
function PriorPanel({ studentId }: { studentId: string }) {
  const { message } = App.useApp();
  const qc = useQueryClient();

  /** Хадгалаагүй засварууд — сар бүрээр. */
  const [draft, setDraft] = useState<Record<string, Row> | null>(null);
  const [payFrom, setPayFrom] = useState<Dayjs>(dayjs());
  const [payMonths, setPayMonths] = useState<number>(1);

  const { data } = useQuery({
    queryKey: ["student-prior", studentId],
    queryFn: async () => (await api.get(`/student/${studentId}/prior`)).data,
  });

  const refresh = () => {
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["student-prior", studentId] });
    qc.invalidateQueries({ queryKey: ["students"] });
    qc.invalidateQueries({ queryKey: ["student", studentId] });
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["teacher-salary-sheet"] });
  };

  const saveMonths = useMutation({
    mutationFn: async (months: Row[]) =>
      api.put(`/student/${studentId}/prior/bulk`, { months }),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const savePayment = useMutation({
    mutationFn: async () =>
      api.post(`/payment/${studentId}`, {
        monthKey: payFrom.format("YYYY-MM"),
        status: "PAID",
        months: payMonths,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  if (!data) return null;
  const p = data.progress;
  const pkg = data.package;

  // Сервер дээрх мөрүүд + хадгалаагүй засварууд.
  const rows: Row[] = Object.values(
    draft ??
      Object.fromEntries(
        (data.priors || []).map((r: any) => [
          r.monthKey,
          { monthKey: r.monthKey, count: r.count, paidBefore: r.paidBefore },
        ]),
      ),
  );
  rows.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  const edit = (monthKey: string, patch: Partial<Row>) =>
    setDraft((d) => {
      const base =
        d ??
        Object.fromEntries(
          (data.priors || []).map((r: any) => [
            r.monthKey,
            { monthKey: r.monthKey, count: r.count, paidBefore: r.paidBefore },
          ]),
        );
      return { ...base, [monthKey]: { ...base[monthKey], ...patch } };
    });

  /** Жагсаалтад байхгүй хамгийн ойрын өмнөх сарыг нэмнэ. */
  const addMonth = () => {
    const taken = new Set(rows.map((r) => r.monthKey));
    let candidate = dayjs();
    for (let i = 0; i < 36 && taken.has(candidate.format("YYYY-MM")); i++) {
      candidate = candidate.subtract(1, "month");
    }
    edit(candidate.format("YYYY-MM"), {
      monthKey: candidate.format("YYYY-MM"),
      count: 0,
      paidBefore: 0,
    });
  };

  const dirty = draft !== null;
  const busy = saveMonths.isPending || savePayment.isPending;

  return (
    <>
      <Divider orientation="left" plain>
        Төлбөр ба оролт
      </Divider>

      {pkg && pkg.paidMonths > 0 && (
        <Alert
          type={pkg.balance < 0 ? "warning" : "info"}
          showIcon
          style={{ marginBottom: 12 }}
          message={
            <Space wrap>
              <b>
                Багц: {pkg.entitled} оролт ({pkg.paidMonths} сар × {data.quota})
              </b>
              <Tag color="green">орсон {pkg.used}</Tag>
              {pkg.balance >= 0 ? (
                <Tag color="blue">үлдсэн {pkg.balance}</Tag>
              ) : (
                <Tag color="red">
                  төлснөөс {Math.abs(pkg.balance)} оролт илүү орсон
                </Tag>
              )}
            </Space>
          }
          description={
            pkg.usedLessons > 0 && pkg.usedPrior > 0
              ? `Ашигласан: системд ${pkg.usedLessons} + гараар ${pkg.usedPrior}`
              : undefined
          }
        />
      )}

      {/* 1. Хэдэн сарын төлбөр авсныг нэг дор тэмдэглэнэ. */}
      <Space wrap align="end" size={8} style={{ marginBottom: 16 }}>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Төлбөр: эхлэх сар
          </Typography.Text>
          <br />
          <DatePicker
            picker="month"
            value={payFrom}
            onChange={(v) => v && setPayFrom(v)}
            allowClear={false}
            format="YYYY-MM"
            style={{ width: 120 }}
          />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            хэдэн сар
          </Typography.Text>
          <br />
          <InputNumber
            min={1}
            max={12}
            value={payMonths}
            onChange={(v) => setPayMonths(Number(v) || 1)}
            style={{ width: 70 }}
          />
        </div>
        <Button
          onClick={() => savePayment.mutate()}
          loading={savePayment.isPending}
          disabled={busy}
        >
          Төлсөн гэж тэмдэглэх
        </Button>
        <Typography.Text type="secondary">
          = {payMonths * data.quota} оролтын эрх
        </Typography.Text>
      </Space>

      {/* 2. Өнгөрсөн оролтыг сар бүрээр — бүгдийг нэг хадгалалтаар. */}
      <Table
        size="small"
        rowKey="monthKey"
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: "Оролтын бүртгэл алга — «Сар нэмэх» дарна уу." }}
        columns={[
          { title: "Сар", dataIndex: "monthKey", width: 100 },
          {
            title: "Орсон оролт",
            key: "count",
            width: 120,
            render: (_, r: Row) => (
              <InputNumber
                size="small"
                min={0}
                max={60}
                style={{ width: 70 }}
                value={r.count}
                disabled={busy}
                onChange={(v) =>
                  edit(r.monthKey, { count: Number(v ?? 0) })
                }
              />
            ),
          },
          {
            title: "Цалингаа авсан",
            key: "paidBefore",
            width: 140,
            render: (_, r: Row) => (
              <InputNumber
                size="small"
                min={0}
                max={r.count}
                style={{ width: 70 }}
                value={r.paidBefore}
                disabled={busy}
                onChange={(v) =>
                  edit(r.monthKey, { paidBefore: Number(v ?? 0) })
                }
              />
            ),
          },
          {
            title: "Цалинд орох",
            key: "unpaid",
            render: (_, r: Row) => {
              const saved = (data.priors || []).find(
                (x: any) => x.monthKey === r.monthKey,
              );
              const payout = saved?.payoutCount ?? 0;
              const unpaid = Math.max(0, r.count - r.paidBefore - payout);
              return unpaid ? (
                <Space size={4}>
                  <Tag color="gold">{unpaid} оролт</Tag>
                  <Typography.Text type="secondary">
                    {money(unpaid * data.rate)}
                  </Typography.Text>
                </Space>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              );
            },
          },
        ]}
      />

      <Space style={{ marginTop: 12 }} wrap>
        <Button onClick={addMonth} disabled={busy}>
          + Сар нэмэх
        </Button>
        <Button
          type="primary"
          disabled={!dirty || busy}
          loading={saveMonths.isPending}
          onClick={() => saveMonths.mutate(rows)}
        >
          Хадгалах
        </Button>
        {dirty && (
          <>
            <Button onClick={() => setDraft(null)} disabled={busy}>
              Болих
            </Button>
            <Typography.Text type="warning">
              Хадгалаагүй засвар байна
            </Typography.Text>
          </>
        )}
      </Space>

      <Space wrap style={{ marginTop: 12 }}>
        <Tag>
          {data.monthKey}-д орсон: {p.attended}
        </Tag>
        <Typography.Text type="secondary">
          системд {p.attendedLessons} + гараар {p.prior}
          {p.absent > 0 && ` · тасалсан ${p.absent}`}
        </Typography.Text>
        {data.unpaidCount > 0 && (
          <Tag color="gold">
            Багшид олгох: {data.unpaidCount} оролт ={" "}
            {money(data.unpaidAmount)}
          </Tag>
        )}
      </Space>

      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        Оролтыг болсон САРУУДАД нь хуваарилж бичнэ (нэг сард 34 гэх мэт бөөнөөр
        бичвэл тухайн сар нормоос хэтэрч, буруу анхааруулга өгнө). «Цалингаа
        авсан» нь багшид аль хэдийн олгосон оролтын тоо — үлдсэн нь цалинд орно.
      </Typography.Paragraph>
    </>
  );
}

export default function StudentDrawer({
  studentId,
  onClose,
}: {
  studentId: string | null;
  onClose: () => void;
}) {
  const [changeOpen, setChangeOpen] = useState(false);

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => (await api.get(`/student/${studentId}`)).data,
    enabled: !!studentId,
  });

  /** Excel-ээс импортлосон, системээс өмнөх ирцийн түүх. */
  const { data: imported } = useQuery({
    queryKey: ["student-attendance-history", studentId],
    queryFn: async () =>
      (await api.get(`/student/${studentId}/attendance-history`)).data,
    enabled: !!studentId,
  });

  const { data: lessons } = useQuery({
    queryKey: ["student-lessons", studentId],
    queryFn: async () =>
      (
        await api.get("/lesson", {
          params: { student: studentId, limit: 60 },
        })
      ).data.rows as any[],
    enabled: !!studentId,
  });

  return (
    <Drawer
      title={student ? studentName(student) : "Сурагч"}
      open={!!studentId}
      onClose={onClose}
      width={720}
      loading={isLoading}
    >
      {student && (
        <>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Код">{student.code}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              <StudentStatusTag status={student.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Хөгжим">
              <Tag color={student.instrument?.color}>
                {student.instrument?.name}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Түвшин">
              {STUDENT_LEVEL_LABEL[student.level] || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Багш">
              <Space>
                {student.teacher?.name}
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => setChangeOpen(true)}
                >
                  Солих
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Утас">
              {student.phone || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Төрсөн">
              {student.birthday
                ? dayjs(student.birthday).format("YYYY-MM-DD")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Хүйс">
              {GENDER_LABEL[student.gender] || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Эцэг эх">
              {student.parentName || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Эцэг эхийн утас">
              {student.parentPhone || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Төлбөр" span={2}>
              <PaymentStatusTag lastPaidMonth={student.lastPaidMonth} />
            </Descriptions.Item>
          </Descriptions>

          <PriorPanel studentId={student._id} />

          <Divider orientation="left" plain>
            Хуваарь
          </Divider>
          <EnrollmentPanel student={student} />

          {student.teacherHistory?.length > 1 && (
            <>
              <Divider orientation="left" plain>
                Багшийн түүх
              </Divider>
              <Table
                size="small"
                pagination={false}
                rowKey={(r: any) => r._id || r.from}
                dataSource={[...student.teacherHistory].reverse()}
                columns={[
                  {
                    title: "Багш",
                    dataIndex: "teacher",
                    render: (v) => v?.name ?? v,
                  },
                  { title: "Эхэлсэн", dataIndex: "from" },
                  {
                    title: "Дууссан",
                    dataIndex: "to",
                    render: (v) => v || <Tag color="green">Одоо</Tag>,
                  },
                  { title: "Шалтгаан", dataIndex: "reason" },
                ]}
              />
            </>
          )}

          <Divider orientation="left" plain>
            Хичээлийн түүх
          </Divider>
          <Table
            size="small"
            rowKey="_id"
            dataSource={lessons || []}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            columns={[
              { title: "Огноо", dataIndex: "date", width: 110 },
              {
                title: "Цаг",
                key: "time",
                render: (_, r: any) =>
                  `${String(Math.floor(r.startMinute / 60)).padStart(2, "0")}:${String(
                    r.startMinute % 60,
                  ).padStart(2, "0")}`,
              },
              { title: "Багш", dataIndex: ["teacher", "name"] },
              { title: "Өрөө", dataIndex: ["room", "name"] },
              {
                title: "Төлөв",
                dataIndex: "status",
                render: (v) => <LessonStatusTag status={v} />,
              },
            ]}
          />

          {imported?.total > 0 && (
            <>
              <Divider orientation="left" plain>
                Импортлосон ирцийн түүх
              </Divider>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                Систем нэвтрэхээс өмнөх бүртгэл ({imported.source}). Эх файлд
                өрөө, цаг байгаагүй тул энэ түүх календар, цалин, тасалтын
                тоолуурт нөлөөлөхгүй.
                {imported.firstLessonDate && (
                  <> Анхны хичээл: <b>{imported.firstLessonDate}</b>.</>
                )}
              </Typography.Paragraph>
              <Space wrap size={[4, 4]} style={{ marginBottom: 12 }}>
                {imported.months.map((m: any) => (
                  <Tag key={m.monthKey}>
                    {m.monthKey} · {m.attended} ирсэн
                    {m.absent > 0 && ` · ${m.absent} тасалсан`}
                    {m.excused > 0 && ` · ${m.excused} чөлөө`}
                  </Tag>
                ))}
              </Space>
              <Table
                size="small"
                rowKey="_id"
                dataSource={imported.rows}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                columns={[
                  { title: "Огноо", dataIndex: "date", width: 110 },
                  { title: "Багш", dataIndex: ["teacher", "name"] },
                  {
                    title: "Төлөв",
                    dataIndex: "status",
                    render: (v) => <LessonStatusTag status={v} />,
                  },
                  {
                    title: "Эх бичилт",
                    dataIndex: "raw",
                    render: (v, r: any) => (
                      <Space size={4}>
                        <Typography.Text type="secondary">{v}</Typography.Text>
                        {r.isReconstructed && (
                          <Tag color="orange">огноо сэргээсэн</Tag>
                        )}
                        {r.isFirstLesson && <Tag color="blue">анхны</Tag>}
                      </Space>
                    ),
                  },
                ]}
              />
            </>
          )}

          <ChangeTeacherDrawer
            student={student}
            open={changeOpen}
            onClose={() => setChangeOpen(false)}
          />
        </>
      )}
    </Drawer>
  );
}
