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
