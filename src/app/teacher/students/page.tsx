"use client";

import { useMemo, useState } from "react";
import {
  App,
  Alert,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Progress,
  Radio,
  Select,
  Popconfirm,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import {
  PlusOutlined,
  PhoneOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";
import { useTeacherAuth } from "@/lib/teacher-auth";
import {
  LESSON_STATUS_COLOR,
  LESSON_STATUS_LABEL,
  STUDENT_LEVEL_LABEL,
  STUDENT_STATUS_COLOR,
  STUDENT_STATUS_LABEL,
  WEEKDAY_LABEL,
  studentName,
} from "@/lib/labels";

interface SlotChoice {
  weekday?: number;
  slotIndex?: number;
  room?: string;
}

interface Available {
  weekday: number;
  slotIndex: number;
  rooms: { _id: string; name: string }[];
}

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "").slice(0, 8);

/** «3/8» — сарын оролтын явц. Норм биелсэн бол ногоон. */
function MonthProgress({ month }: { month?: any }) {
  if (!month) return null;
  const { attended = 0, quota = 8 } = month;
  const done = attended >= quota;
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 2,
        }}
      >
        <span style={{ color: "#888" }}>Энэ сарын оролт</span>
        <span style={{ fontWeight: 600, color: done ? "#22c55e" : "#7c3aed" }}>
          {attended}/{quota}
        </span>
      </div>
      <Progress
        percent={Math.min(100, Math.round((attended / quota) * 100))}
        showInfo={false}
        size="small"
        strokeColor={done ? "#22c55e" : "#7c3aed"}
      />
    </div>
  );
}

/**
 * Долоо хоногийн нэг тогтмол цаг сонгох мөр.
 *
 * Зөвхөн САРЫН ТУРШ сул байгаа гараг/цаг/өрөө харагдана (`available`) — тиймээс
 * багш давхцсан цаг сонгох боломжгүй, сервер рүү очоод няцаагдахгүй.
 */
function SlotRow({
  index,
  available,
  value,
  taken,
  onChange,
}: {
  index: number;
  available: Available[];
  value: SlotChoice;
  taken: string[];
  onChange: (v: SlotChoice) => void;
}) {
  const free = available.filter(
    (a) => !taken.includes(`${a.weekday}#${a.slotIndex}`),
  );
  const weekdays = [...new Set(free.map((a) => a.weekday))].sort();
  const times = free.filter((a) => a.weekday === value.weekday);
  const rooms = times.find((a) => a.slotIndex === value.slotIndex)?.rooms ?? [];

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
      }}
    >
      <Typography.Text strong style={{ fontSize: 13 }}>
        {index + 1}-р цаг
      </Typography.Text>
      <Space.Compact block style={{ marginTop: 6 }}>
        <Select
          size="large"
          style={{ width: "40%" }}
          placeholder="Гараг"
          value={value.weekday}
          options={weekdays.map((w) => ({ value: w, label: WEEKDAY_LABEL[w] }))}
          onChange={(weekday) => onChange({ weekday })}
        />
        <Select
          size="large"
          style={{ width: "60%" }}
          placeholder="Цаг"
          value={value.slotIndex}
          disabled={value.weekday === undefined}
          options={times.map((t) => ({
            value: t.slotIndex,
            label:
              (t as any).label?.split(" ").slice(1).join(" ") ||
              `#${t.slotIndex}`,
          }))}
          onChange={(slotIndex) =>
            onChange({ weekday: value.weekday, slotIndex })
          }
        />
      </Space.Compact>
      <Select
        size="large"
        style={{ width: "100%", marginTop: 6 }}
        placeholder="Өрөө"
        value={value.room}
        disabled={value.slotIndex === undefined}
        options={rooms.map((r) => ({ value: r._id, label: r.name }))}
        onChange={(room) => onChange({ ...value, room })}
      />
    </div>
  );
}

/**
 * Шинэ сурагч бүртгэх — гар утсанд Drawer (доороос дээш), Modal биш.
 * Багш болон хөгжим нь автоматаар өөрийнх болно.
 */
function AddStudent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const { teacher } = useTeacherAuth();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [slots, setSlots] = useState<SlotChoice[]>([{}, {}]);

  const {
    data: options,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teacher-student-options"],
    enabled: open,
    retry: false,
    queryFn: async () =>
      (await teacherApi.get("/student/options")).data as {
        monthlyLessonQuota: number;
        weeklyLessonCount: number;
        available: Available[];
      },
  });

  const weekly = options?.weeklyLessonCount ?? 2;
  const quota = options?.monthlyLessonQuota ?? 8;

  const reset = () => {
    form.resetFields();
    setSlots(Array.from({ length: weekly }, () => ({})));
  };

  const save = useMutation({
    mutationFn: async (v: any) =>
      teacherApi.post("/student", {
        ...v,
        phone: onlyDigits(v.phone),
        parentPhone: v.parentPhone ? onlyDigits(v.parentPhone) : undefined,
        birthday: v.birthday ? v.birthday.toISOString() : null,
        slots,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-student-options"] });
      reset();
      onClose();
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const submit = (v: any) => {
    const filled = slots.filter((s) => s.room !== undefined);
    if (filled.length < weekly) {
      message.error(`Долоо хоногийн ${weekly} цагийг бүрэн сонгоно уу.`);
      return;
    }
    save.mutate(v);
  };

  const taken = (self: number) =>
    slots
      .map((s, i) =>
        i === self || s.slotIndex === undefined
          ? null
          : `${s.weekday}#${s.slotIndex}`,
      )
      .filter(Boolean) as string[];

  return (
    <Drawer
      title="Шинэ сурагч"
      placement="bottom"
      height="92%"
      open={open}
      onClose={onClose}
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <Button
          type="primary"
          block
          className="touch-btn"
          loading={save.isPending}
          onClick={() => form.submit()}
        >
          Бүртгэх
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 14 }}
        message={`${teacher?.name} · ${teacher?.instrument?.name}`}
        description={`Сурагч танд автоматаар оногдоно. Долоо хоногт ${weekly} удаа, сард ${quota} оролт.`}
      />
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="lastName" label="Овог">
          <Input size="large" placeholder="Б" />
        </Form.Item>
        <Form.Item
          name="firstName"
          label="Нэр"
          rules={[{ required: true, message: "Нэр оруулна уу" }]}
        >
          <Input size="large" placeholder="Ану" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Утас"
          rules={[
            { required: true, message: "Утас оруулна уу" },
            {
              validator: (_, v) =>
                onlyDigits(v).length === 8
                  ? Promise.resolve()
                  : Promise.reject(new Error("8 оронтой дугаар оруулна уу")),
            },
          ]}
        >
          <Input size="large" inputMode="numeric" placeholder="99001122" />
        </Form.Item>

        <Typography.Text
          strong
          style={{ display: "block", margin: "6px 0 8px" }}
        >
          Долоо хоногийн хуваарь ({weekly} удаа)
        </Typography.Text>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : error ? (
          // Сервер хариу өгөөгүйг «сул цаг алга» гэж БҮҮ хэл — өөр асуудал.
          <Alert
            type="error"
            showIcon
            message="Цагийн мэдээлэл ачаалагдсангүй"
            description={teacherApiError(error)}
            style={{ marginBottom: 12 }}
          />
        ) : !options?.available?.length ? (
          <Alert
            type="warning"
            showIcon
            message="Сул цаг алга"
            description="Ойрын 4 долоо хоногт сул өрөө/цаг үлдээгүй байна. Админд хандана уу."
            style={{ marginBottom: 12 }}
          />
        ) : (
          Array.from({ length: weekly }, (_, i) => (
            <SlotRow
              key={i}
              index={i}
              available={options.available}
              value={slots[i] ?? {}}
              taken={taken(i)}
              onChange={(v) =>
                setSlots((prev) => {
                  const next = [...prev];
                  while (next.length < weekly) next.push({});
                  next[i] = v;
                  return next;
                })
              }
            />
          ))
        )}

        <Form.Item name="level" label="Түвшин" initialValue="BEGINNER">
          <Select
            size="large"
            options={Object.entries(STUDENT_LEVEL_LABEL).map(
              ([value, label]) => ({
                value,
                label,
              }),
            )}
          />
        </Form.Item>
        <Form.Item name="birthday" label="Төрсөн өдөр">
          <DatePicker
            size="large"
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            inputReadOnly
          />
        </Form.Item>
        <Form.Item name="parentName" label="Эцэг эхийн нэр">
          <Input size="large" placeholder="Бага насны сурагчид" />
        </Form.Item>
        <Form.Item name="parentPhone" label="Эцэг эхийн утас">
          <Input size="large" inputMode="numeric" placeholder="88001122" />
        </Form.Item>
        <Form.Item name="note" label="Тэмдэглэл">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

/**
 * ӨМНӨ ОРСОН ХИЧЭЭЛ — «8-аас 3-ыг нь аль хэдийн орсон».
 *
 * Сурагч системд бүртгэгдэхээсээ өмнө тэр сард хэдэн хичээл орсныг багш нэг
 * товшилтоор оруулна. Огноо, цаг, өрөө асуухгүй — багш тэдгээрийг санахгүй.
 * Хуурамч хичээл ч үүсгэхгүй: зөвхөн тоолуурт нэмэгдэнэ.
 */
function PriorEntries({
  studentId,
  progress,
}: {
  studentId: string;
  progress: any;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async (count: number) =>
      teacherApi.put(`/student/${studentId}/prior`, { count }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-student", studentId] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const current = progress?.prior ?? 0;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Typography.Text strong style={{ fontSize: 13 }}>
        Өмнө орсон хичээл
      </Typography.Text>
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 12, margin: "2px 0 8px" }}
      >
        Системд бүртгэхээс өмнө энэ сард хэдэн удаа орсон бэ? Огноо хэрэггүй —
        зөвхөн тоог дар.
      </Typography.Paragraph>
      <Space size={[6, 6]} wrap>
        {Array.from({ length: (progress?.quota ?? 8) + 1 }, (_, n) => (
          <Button
            key={n}
            size="small"
            type={n === current ? "primary" : "default"}
            loading={save.isPending && save.variables === n}
            onClick={() => save.mutate(n)}
          >
            {n}
          </Button>
        ))}
      </Space>
      {current > 0 && (
        <Typography.Paragraph
          type="secondary"
          style={{ fontSize: 12, margin: "8px 0 0" }}
        >
          {progress.attendedLessons} системд бүртгэгдсэн + {current} өмнөх ={" "}
          <b>{progress.attended}</b> оролт
        </Typography.Paragraph>
      )}
    </div>
  );
}

/**
 * НЭМЭЛТ ХИЧЭЭЛ ТОВЛОХ — «энэ долоо хоногт 3-4 удаа орно» гэж тохирсон үед.
 *
 * Үндсэн хуваарь долоо хоногт 2 хэвээр. Энэ хэсэг нь тухайн өдрийн СУЛ цагийг
 * л харуулна (багш, сурагч, өрөө гурвуулаа сул), тиймээс давхцал үүсэхгүй.
 */
function BookLesson({ studentId }: { studentId: string }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [day, setDay] = useState(dayjs().add(1, "day"));

  const dateKey = day.format("YYYY-MM-DD");
  const { data, isFetching } = useQuery({
    queryKey: ["teacher-free-slots", studentId, dateKey],
    queryFn: async () =>
      (
        await teacherApi.get(`/student/${studentId}/free-slots`, {
          params: { date: dateKey },
        })
      ).data as { rows: any[]; count: number },
  });

  const book = useMutation({
    mutationFn: async (slot: any) =>
      teacherApi.post(`/student/${studentId}/lesson`, {
        date: dateKey,
        slotIndex: slot.slotIndex,
        room: slot.rooms[0]._id,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-student", studentId] });
      qc.invalidateQueries({ queryKey: ["teacher-free-slots", studentId] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-schedule"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Typography.Text strong style={{ fontSize: 13 }}>
        Нэмэлт хичээл товлох
      </Typography.Text>
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 12, margin: "2px 0 0" }}
      >
        Тасалсанаа нөхөх, эсвэл тохиролцоод нэмж орох үед.
      </Typography.Paragraph>
      <DatePicker
        size="large"
        style={{ width: "100%", marginTop: 8 }}
        value={day}
        onChange={(v) => v && setDay(v)}
        format="YYYY-MM-DD"
        inputReadOnly
        disabledDate={(d) => d.isBefore(dayjs(), "day")}
      />
      {isFetching ? (
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginTop: 10 }} />
      ) : !data?.rows?.length ? (
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, display: "block", marginTop: 8 }}
        >
          Тэр өдөр сул цаг алга. Өөр өдөр сонгоно уу.
        </Typography.Text>
      ) : (
        <Space size={[6, 6]} wrap style={{ marginTop: 10 }}>
          {data.rows.map((r: any) => (
            <Button
              key={r.slotIndex}
              size="small"
              loading={book.isPending}
              onClick={() => book.mutate(r)}
            >
              {r.timeLabel} · {r.rooms[0].name}
            </Button>
          ))}
        </Space>
      )}
    </div>
  );
}

/**
 * Сурагчийн хуудас — сарын оролтууд ба «Оролт нэмэх».
 *
 * Багш календарь хайх шаардлагагүй: огноо (анхдагч нь өнөөдөр) + төлөв сонгоод
 * нэг товч дарна. Хуваарьт хичээл байвал түүн дээр бүртгэгдэнэ, байхгүй бол
 * сервер нөхөх хичээл үүсгэнэ.
 */
function StudentSheet({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [date, setDate] = useState(dayjs());
  const [status, setStatus] = useState("ATTENDED");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-student", id],
    enabled: !!id,
    queryFn: async () => (await teacherApi.get(`/student/${id}`)).data,
  });

  const add = useMutation({
    mutationFn: async () =>
      teacherApi.post(`/student/${id}/entry`, {
        date: date.format("YYYY-MM-DD"),
        status,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-student", id] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-schedule"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const cancel = useMutation({
    mutationFn: async (lessonId: string) =>
      teacherApi.delete(`/student/${id}/lesson/${lessonId}`),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-student", id] });
      qc.invalidateQueries({ queryKey: ["teacher-free-slots", id] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-schedule"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const p = data?.progress;

  return (
    <Drawer
      title={data ? studentName(data.student) : "Сурагч"}
      placement="bottom"
      height="88%"
      open={!!id}
      onClose={onClose}
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <Button
          type="primary"
          block
          className="touch-btn"
          icon={<CheckCircleOutlined />}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          Оролт бүртгэх
        </Button>
      }
    >
      {isLoading || !data ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : (
        <>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
              {p.attended}
              <span style={{ fontSize: 16, color: "#888" }}>/{p.quota}</span>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {data.month} сарын оролт · үлдсэн {p.remaining}
            </Typography.Text>
            <Progress
              percent={Math.min(100, Math.round((p.attended / p.quota) * 100))}
              showInfo={false}
              strokeColor={
                p.over ? "#f59e0b" : p.filled ? "#22c55e" : "#7c3aed"
              }
            />
            <Space size={6} wrap style={{ fontSize: 12 }}>
              <Tag color="red">Тасалсан {p.absent}</Tag>
              <Tag color="orange">Чөлөөтэй {p.excused}</Tag>
              <Tag color="blue">Товлогдсон {p.scheduled}</Tag>
            </Space>
          </div>

          {/* Норм дүүрсэн эсэх. Хурдац чөлөөтэй — эхний 7 хоногтоо 7 оролт
              хийсэн ч болно, зөвхөн сарын нийлбэр л чухал. */}
          {(p.filled || p.over > 0) && (
            <Alert
              type={p.over > 0 ? "warning" : "success"}
              showIcon
              style={{ marginBottom: 12 }}
              message={
                p.over > 0
                  ? `Нормоос ${p.over} оролт илүү (${p.attended}/${p.quota})`
                  : `Сарын ${p.quota} оролт дүүрсэн`
              }
              description={
                p.scheduled > 0
                  ? `Энэ сард товлогдсон ${p.scheduled} хичээл үлдсэн байна. Орохгүй бол админд хэлж цуцлуулна уу — эс тэгвээс тасалсанд тооцогдоно.`
                  : undefined
              }
            />
          )}

          {!!data.schedule?.length && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text strong style={{ fontSize: 13 }}>
                Тогтмол цаг
              </Typography.Text>
              <div style={{ marginTop: 4 }}>
                {data.schedule.map((s: any, i: number) => (
                  <Tag key={i}>{s.label}</Tag>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Typography.Text strong style={{ fontSize: 13 }}>
              Оролт нэмэх
            </Typography.Text>
            <DatePicker
              size="large"
              style={{ width: "100%", marginTop: 8 }}
              value={date}
              onChange={(v) => v && setDate(v)}
              format="YYYY-MM-DD"
              inputReadOnly
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
            />
            <Radio.Group
              style={{ marginTop: 8, width: "100%" }}
              buttonStyle="solid"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <Radio.Button value="ATTENDED">Ирсэн</Radio.Button>
              <Radio.Button value="ABSENT">Тасалсан</Radio.Button>
              <Radio.Button value="EXCUSED">Чөлөөтэй</Radio.Button>
            </Radio.Group>
          </div>

          <PriorEntries studentId={id!} progress={p} />

          <BookLesson studentId={id!} />

          {!!data.upcoming?.length && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text strong style={{ fontSize: 13 }}>
                Товлогдсон хичээл ({data.upcoming.length})
              </Typography.Text>
              {data.upcoming.map((l: any) => (
                <div
                  key={l._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>
                      {l.date} · {l.weekdayLabel}
                      {l.type !== "REGULAR" && (
                        <Tag color="purple" style={{ marginLeft: 6 }}>
                          {l.typeLabel}
                        </Tag>
                      )}
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {l.timeLabel} · {l.room?.name ?? "—"}
                    </Typography.Text>
                  </div>
                  {l.cancellable && (
                    <Popconfirm
                      title="Энэ хичээлийг цуцлах уу?"
                      okText="Тийм"
                      cancelText="Үгүй"
                      onConfirm={() => cancel.mutate(l._id)}
                    >
                      <Button size="small" danger loading={cancel.isPending}>
                        Цуцлах
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              ))}
            </div>
          )}

          <Typography.Text strong style={{ fontSize: 13 }}>
            {data.month} сарын бүртгэл ({data.lessons.length})
          </Typography.Text>
          {!data.lessons.length ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Бичлэг алга"
              style={{ padding: "24px 0" }}
            />
          ) : (
            data.lessons.map((l: any) => (
              <div
                key={l._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>
                    {l.date} · {l.weekdayLabel}
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {l.timeLabel} · {l.room?.name ?? "—"}
                    {l.type !== "REGULAR" ? ` · ${l.typeLabel}` : ""}
                  </Typography.Text>
                </div>
                <Tag
                  color={LESSON_STATUS_COLOR[l.status]}
                  style={{ marginInlineEnd: 0 }}
                >
                  {LESSON_STATUS_LABEL[l.status] ?? l.status}
                </Tag>
              </div>
            ))
          )}
        </>
      )}
    </Drawer>
  );
}

export default function TeacherStudentsPage() {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-students", query],
    queryFn: async () =>
      (await teacherApi.get("/student", { params: { query } })).data as {
        rows: any[];
        count: number;
        quota: number;
        month: string;
      },
  });

  const summary = useMemo(() => {
    const rows = data?.rows ?? [];
    const done = rows.filter(
      (r) => (r.month?.attended ?? 0) >= (r.month?.quota ?? 8),
    ).length;
    return { done, total: rows.length };
  }, [data]);

  return (
    <div>
      <Input.Search
        size="large"
        placeholder="Нэр, код, утсаар хайх"
        allowClear
        onSearch={setQuery}
        style={{ marginBottom: 12 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div>
          <Typography.Text strong>
            Миний сурагчид ({data?.count ?? 0})
          </Typography.Text>
          {!!summary.total && (
            <Typography.Text
              type="secondary"
              style={{ display: "block", fontSize: 12 }}
            >
              {summary.done}/{summary.total} нь сарын {data?.quota ?? 8} оролтоо
              гүйцээсэн
            </Typography.Text>
          )}
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
          className="touch-btn"
        >
          Нэмэх
        </Button>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : !data?.rows?.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Сурагч алга"
          style={{ padding: "40px 0" }}
        />
      ) : (
        data.rows.map((s: any) => {
          const phone = s.phone || s.parentPhone;
          return (
            <div key={s._id} className="lesson-card">
              <div
                style={{ display: "flex", alignItems: "center", gap: 10 }}
                onClick={() => setSheet(s._id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {studentName(s)}
                  </div>
                  <Space
                    size={8}
                    wrap
                    style={{ fontSize: 12, color: "#888", marginTop: 2 }}
                  >
                    <span>{s.code}</span>
                    <span>{STUDENT_LEVEL_LABEL[s.level] ?? "—"}</span>
                    {s.parentName && (
                      <span>
                        <UserOutlined /> {s.parentName}
                      </span>
                    )}
                  </Space>
                </div>
                <Tag
                  color={STUDENT_STATUS_COLOR[s.status]}
                  style={{ marginInlineEnd: 0 }}
                >
                  {STUDENT_STATUS_LABEL[s.status]}
                </Tag>
              </div>

              <MonthProgress month={s.month} />

              <Space.Compact block style={{ marginTop: 10 }}>
                <Button
                  type="primary"
                  className="touch-btn"
                  style={{ width: "55%" }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => setSheet(s._id)}
                >
                  Оролт
                </Button>
                {phone ? (
                  <Button
                    className="touch-btn"
                    style={{ width: "45%" }}
                    href={`tel:${phone}`}
                  >
                    <PhoneOutlined /> {phone}
                  </Button>
                ) : null}
              </Space.Compact>
            </div>
          );
        })
      )}

      <AddStudent open={open} onClose={() => setOpen(false)} />
      <StudentSheet id={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
