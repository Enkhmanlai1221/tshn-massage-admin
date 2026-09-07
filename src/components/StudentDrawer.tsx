"use client";

import { useState } from "react";
import {
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
import dayjs from "dayjs";
import { api, apiError } from "@/lib/api";
import { useTeachers } from "@/lib/hooks";
import {
  GENDER_LABEL,
  LessonStatusTag,
  STUDENT_LEVEL_LABEL,
  StudentStatusTag,
  studentName,
} from "@/lib/labels";
import EnrollmentPanel from "./EnrollmentPanel";

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
  const [form] = Form.useForm();

  const { data } = useQuery({
    queryKey: ["student-prior", studentId],
    queryFn: async () => (await api.get(`/student/${studentId}/prior`)).data,
  });

  const save = useMutation({
    mutationFn: async (v: any) =>
      api.put(`/student/${studentId}/prior`, {
        monthKey: v.month ? v.month.format("YYYY-MM") : undefined,
        count: v.count ?? 0,
        paidBefore: v.paidBefore ?? 0,
        note: v.note || undefined,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["student-prior", studentId] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["student", studentId] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  if (!data) return null;
  const p = data.progress;

  // Сар сонгоход тухайн сарын хадгалагдсан тоог форм руу татна.
  const fillMonth = (monthKey: string) => {
    const hit = (data.priors || []).find((x: any) => x.monthKey === monthKey);
    form.setFieldsValue({
      count: hit?.count ?? 0,
      paidBefore: hit?.paidBefore ?? 0,
      note: hit?.note ?? undefined,
    });
  };

  return (
    <>
      <Divider orientation="left" plain>
        Сарын оролт
      </Divider>
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color={p.filled ? "green" : "blue"} style={{ fontSize: 13 }}>
          {data.monthKey}: {p.attended}/{p.quota} оролт
        </Tag>
        <Typography.Text type="secondary">
          системд {p.attendedLessons} + өмнөх {p.prior} · үлдсэн {p.remaining}
        </Typography.Text>
        {data.unpaidCount > 0 && (
          <Tag color="gold">
            Цалинд орох: {data.unpaidCount} ×{" "}
            {(data.rate || 0).toLocaleString()}₮ ={" "}
            {(data.unpaidAmount || 0).toLocaleString()}₮
          </Tag>
        )}
      </Space>

      {(data.priors || []).length > 0 && (
        <Space wrap size={[4, 4]} style={{ marginBottom: 12, display: "flex" }}>
          {data.priors.map((r: any) => (
            <Tag key={r.monthKey}>
              {r.monthKey}: орсон {r.count} · цалинжсан{" "}
              {r.paidBefore + r.payoutCount} · цалинд орох {r.unpaid}
            </Tag>
          ))}
        </Space>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          month: dayjs(data.monthKey),
          count:
            (data.priors || []).find((x: any) => x.monthKey === data.monthKey)
              ?.count ?? 0,
          paidBefore:
            (data.priors || []).find((x: any) => x.monthKey === data.monthKey)
              ?.paidBefore ?? 0,
        }}
        onFinish={(v) => save.mutate(v)}
      >
        <Space wrap align="end" size={12}>
          <Form.Item name="month" label="Сар" style={{ marginBottom: 0 }}>
            <DatePicker
              picker="month"
              allowClear={false}
              format="YYYY-MM"
              style={{ width: 110 }}
              onChange={(d) => d && fillMonth(d.format("YYYY-MM"))}
            />
          </Form.Item>
          <Form.Item
            name="count"
            label="Системээс гадуур орсон"
            tooltip="Тухайн сард системд бүртгэгдээгүй (өмнө нь) орсон нийт хичээл"
            style={{ marginBottom: 0 }}
          >
            <InputNumber min={0} max={60} style={{ width: 70 }} />
          </Form.Item>
          <Form.Item
            name="paidBefore"
            label="Үүнээс багш цалингаа авсан"
            tooltip="Гараар аль хэдийн цалинжсан тоо — дараагийн цалинд орохгүй"
            style={{ marginBottom: 0 }}
          >
            <InputNumber min={0} max={60} style={{ width: 70 }} />
          </Form.Item>
          <Form.Item name="note" label="Тэмдэглэл" style={{ marginBottom: 0 }}>
            <Input style={{ width: 140 }} placeholder="сонголттой" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" loading={save.isPending} htmlType="submit">
              Хадгалах
            </Button>
          </Form.Item>
        </Space>
      </Form>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        Ж: орсон 3, цалин авсан 2 → дараагийн цалинд 1 хичээл, сарын явцад 3
        оролт нэмэгдэнэ. Олголтод орсон тоог систем хамгаалдаг — доош
        буулгахыг зөвшөөрөхгүй.
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
            <Descriptions.Item label="Сүүлд төлсөн сар" span={2}>
              {student.lastPaidMonth || (
                <Typography.Text type="danger">Төлөөгүй</Typography.Text>
              )}
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
