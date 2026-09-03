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
  Collapse,
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

/**
 * «4/8 оролт» — сарын явцын нимгэн зурвас.
 *
 * Өнгөний дэглэм: дүүрсэн бол ногоон, хоцорч байвал (25%-аас бага) шар
 * анхааруулга, бусад нь саарал — ягаан зөвхөн дарж болох зүйлд үлдэнэ.
 */
function MonthBar({ month }: { month?: any }) {
  if (!month) return null;
  const { attended = 0, quota = 8 } = month;
  const done = attended >= quota;
  const low = !done && attended / quota < 0.25;
  const color = done ? "#16a34a" : low ? "#d97706" : "#6b7280";
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}
    >
      <div
        style={{
          flex: 1,
          height: 6,
          background: "#f0f1f3",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.round((attended / quota) * 100))}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 12,
          color: low ? "#b45309" : "#4b5563",
          flexShrink: 0,
        }}
      >
        Энэ сар{" "}
        <b style={{ color: low ? "#b45309" : "#111827" }}>{attended}</b>/{quota}{" "}
        оролт
      </div>
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
const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
};

const dayLabel = (d: dayjs.Dayjs) =>
  `${d.format("MM сарын DD")} · ${WEEKDAY_LABEL[d.day()]}`;

/**
 * ӨМНӨ ОРСОН ХИЧЭЭЛ — «8-аас 3-ыг нь аль хэдийн орсон».
 *
 * Сурагч бүр дээр САРД НЭГ УДАА хийгддэг үйлдэл тул нугалж хаасан байдаг —
 * өдөр тутмын ирц бүртгэхэд саад болохгүй.
 */
function PriorEntries({
  studentId,
  progress,
  prior,
}: {
  studentId: string;
  progress: any;
  prior: any;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async (body: { count?: number; paidBefore?: number }) =>
      teacherApi.put(`/student/${studentId}/prior`, {
        count: body.count ?? current,
        paidBefore: body.paidBefore ?? paidBefore,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-student", studentId] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-salary"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const current = prior?.count ?? progress?.prior ?? 0;
  const paidBefore = prior?.paidBefore ?? 0;
  const payoutCount = prior?.payoutCount ?? 0;
  const unpaid = prior?.unpaid ?? 0;
  const money = (n: number) => `${(n ?? 0).toLocaleString()}₮`;

  return (
    <Collapse
      size="small"
      style={{ marginBottom: 12, background: "#fff" }}
      items={[
        {
          key: "prior",
          label: (
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Өмнө орсныг нэг дор оруулах
              {current > 0 && (
                <Tag
                  color={unpaid > 0 ? "purple" : "green"}
                  style={{ marginLeft: 8 }}
                >
                  {current}
                  {unpaid > 0 ? ` · ${unpaid} цалинтай` : " · цалинжсан"}
                </Tag>
              )}
            </span>
          ),
          children: (
            <>
              <Typography.Paragraph
                type="secondary"
                style={{ fontSize: 12, margin: "0 0 10px" }}
              >
                Энэ сурагч системд бүртгэгдэхээс өмнө <b>энэ сард</b> хэдэн удаа
                орсон бэ? Огноо санах шаардлагагүй — зөвхөн тоог дар.
              </Typography.Paragraph>
              <Space size={[8, 8]} wrap>
                {Array.from({ length: (progress?.quota ?? 8) + 1 }, (_, n) => (
                  <Button
                    key={n}
                    shape="circle"
                    type={n === current ? "primary" : "default"}
                    loading={save.isPending && save.variables?.count === n}
                    onClick={() => save.mutate({ count: n })}
                  >
                    {n}
                  </Button>
                ))}
              </Space>

              {current > 0 && (
                <>
                  <Typography.Paragraph
                    type="secondary"
                    style={{ fontSize: 12, margin: "14px 0 6px" }}
                  >
                    Эдгээрээс хэдийнх нь <b>цалингаа аль хэдийн авсан</b> бэ?
                  </Typography.Paragraph>
                  <Space size={[8, 8]} wrap>
                    {Array.from({ length: current + 1 }, (_, n) => (
                      <Button
                        key={n}
                        shape="circle"
                        disabled={n < payoutCount}
                        type={n === paidBefore ? "primary" : "default"}
                        loading={
                          save.isPending && save.variables?.paidBefore === n
                        }
                        onClick={() => save.mutate({ paidBefore: n })}
                      >
                        {n}
                      </Button>
                    ))}
                  </Space>

                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "1px solid #f0f0f0",
                      fontSize: 12,
                      color: "#555",
                    }}
                  >
                    <div>
                      Системд бүртгэсэн {progress.attendedLessons} + өмнөх{" "}
                      {current} = <b>{progress.attended} оролт</b>
                    </div>
                    {payoutCount > 0 && (
                      <div style={{ marginTop: 4 }}>
                        Цалингийн тооцоонд орсон: <b>{payoutCount}</b>
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      {unpaid > 0 ? (
                        <>
                          Дараагийн цалинд орох:{" "}
                          <b style={{ color: "#7c3aed" }}>
                            {unpaid} × {money(prior?.rate)} ={" "}
                            {money(prior?.amount)}
                          </b>
                        </>
                      ) : (
                        "Цалин бүрэн тооцогдсон."
                      )}
                    </div>
                  </div>
                </>
              )}
              {current === 0 && (
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 12, margin: "10px 0 0" }}
                >
                  Хэрэггүй бол 0 дээр үлдээнэ.
                </Typography.Paragraph>
              )}
            </>
          ),
        },
      ]}
    />
  );
}

/**
 * ИРЦ БҮРТГЭХ — өнгөрсөн/өнөөдрийн оролт.
 *
 * Товч нь ЭНЭ БЛОК ДОТРОО байна: өмнө нь Drawer-ийн доод талд байсан тул
 * доош гүйлгэсэн багш «энэ товч аль хэсэгт хамаарах вэ» гэж эргэлздэг байв.
 */
function MarkEntry({ studentId }: { studentId: string }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [date, setDate] = useState(dayjs());
  const [status, setStatus] = useState("ATTENDED");

  const add = useMutation({
    mutationFn: async () =>
      teacherApi.post(`/student/${studentId}/entry`, {
        date: date.format("YYYY-MM-DD"),
        status,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["teacher-student", studentId] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-schedule"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const isToday = date.isSame(dayjs(), "day");

  return (
    <div style={card}>
      <Typography.Text strong style={{ fontSize: 13 }}>
        Аль өдрийн ирц вэ?
      </Typography.Text>
      <DatePicker
        size="large"
        style={{ width: "100%", marginTop: 8 }}
        value={date}
        onChange={(v) => v && setDate(v)}
        format={(v) => dayLabel(v)}
        inputReadOnly
        allowClear={false}
        disabledDate={(d) => d.isAfter(dayjs(), "day")}
      />
      {!isToday && (
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, display: "block", marginTop: 4 }}
        >
          Өнгөрсөн өдөр сонгосон байна.
        </Typography.Text>
      )}

      <Typography.Text
        strong
        style={{ fontSize: 13, display: "block", marginTop: 14 }}
      >
        Тэр өдөр сурагч
      </Typography.Text>
      <Radio.Group
        style={{ marginTop: 8, width: "100%" }}
        buttonStyle="solid"
        size="large"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <Radio.Button value="ATTENDED">Ирсэн</Radio.Button>
        <Radio.Button value="ABSENT">Тасалсан</Radio.Button>
        <Radio.Button value="EXCUSED">Чөлөөтэй</Radio.Button>
      </Radio.Group>

      <Button
        type="primary"
        block
        size="large"
        className="touch-btn"
        icon={<CheckCircleOutlined />}
        style={{ marginTop: 14 }}
        loading={add.isPending}
        onClick={() => add.mutate()}
      >
        Бүртгэх
      </Button>
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 12, margin: "8px 0 0" }}
      >
        Хуваарьт хичээл байвал түүн дээр бүртгэгдэнэ. Байхгүй бол нөхөх хичээл
        автоматаар үүсээд ирц нь тавигдана.
      </Typography.Paragraph>
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
    <div style={card}>
      <Typography.Text strong style={{ fontSize: 13 }}>
        Аль өдөр нэмж орох вэ?
      </Typography.Text>
      <DatePicker
        size="large"
        style={{ width: "100%", marginTop: 8 }}
        value={day}
        onChange={(v) => v && setDay(v)}
        format={(v) => dayLabel(v)}
        inputReadOnly
        allowClear={false}
        disabledDate={(d) => d.isBefore(dayjs(), "day")}
      />

      <Typography.Text
        strong
        style={{ fontSize: 13, display: "block", marginTop: 14 }}
      >
        Сул цаг {data?.count ? `(${data.count})` : ""}
      </Typography.Text>
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 12, margin: "2px 0 8px" }}
      >
        Дарахад тэр цагт хичээл товлогдоно.
      </Typography.Paragraph>

      {isFetching ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : !data?.rows?.length ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Тэр өдөр сул цаг алга. Өөр өдөр сонгоно уу.
        </Typography.Text>
      ) : (
        <div
          style={{
            display: "grid",
            // 375px дэлгэцэд 2 багана багтана (Drawer + карт padding хассаны дараа ~300px).
            gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))",
            gap: 8,
          }}
        >
          {data.rows.map((r: any) => (
            <Button
              key={r.slotIndex}
              className="touch-btn"
              loading={book.isPending}
              onClick={() => book.mutate(r)}
              style={{ height: "auto", padding: "8px 6px", lineHeight: 1.3 }}
            >
              <div style={{ fontWeight: 600 }}>{r.timeLabel}</div>
              <div style={{ fontSize: 11, color: "#888" }}>
                {r.rooms[0].name}
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Хичээлийн нэг мөр — огноо, цаг, өрөө, төлөв. */
function LessonRow({
  lesson,
  right,
}: {
  lesson: any;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>
          {lesson.date} · {lesson.weekdayLabel}
          {lesson.type !== "REGULAR" && (
            <Tag color="purple" style={{ marginLeft: 6 }}>
              {lesson.typeLabel}
            </Tag>
          )}
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {lesson.timeLabel} · {lesson.room?.name ?? "—"}
        </Typography.Text>
      </div>
      {right}
    </div>
  );
}

/**
 * Сурагчийн хуудас.
 *
 * Гурван ажил (ирц бүртгэх / хичээл товлох / түүх харах) нь ТАБААР салсан —
 * өмнө нь гурвуулаа нэг доор дараалж, аль товч аль блокт хамаарахыг ялгахад
 * хэцүү байв. Одоо нэг мөчид ганц ажил харагдана.
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
  const [tab, setTab] = useState("mark");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-student", id],
    enabled: !!id,
    queryFn: async () => (await teacherApi.get(`/student/${id}`)).data,
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
      height="92%"
      open={!!id}
      onClose={onClose}
      styles={{ body: { paddingTop: 8, background: "#f6f6f7" } }}
    >
      {isLoading || !data ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : (
        <>
          {/* Тойм — «энэ сард хэдэн оролт орсон» гэдэг хамгийн чухал тоо. */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
                {p.attended}
              </span>
              <span style={{ fontSize: 18, color: "#888" }}>/ {p.quota}</span>
              <span style={{ marginLeft: "auto", fontSize: 13, color: "#888" }}>
                {p.remaining > 0 ? `${p.remaining} үлдлээ` : "дүүрсэн"}
              </span>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {data.month} сард ирсэн оролт
            </Typography.Text>
            <Progress
              percent={Math.min(100, Math.round((p.attended / p.quota) * 100))}
              showInfo={false}
              strokeColor={
                p.over ? "#f59e0b" : p.filled ? "#22c55e" : "#7c3aed"
              }
            />
            <Space size={[6, 6]} wrap style={{ fontSize: 12 }}>
              {p.absent > 0 && <Tag color="red">Тасалсан {p.absent}</Tag>}
              {p.excused > 0 && <Tag color="orange">Чөлөөтэй {p.excused}</Tag>}
              {p.scheduled > 0 && (
                <Tag color="blue">Товлогдсон {p.scheduled}</Tag>
              )}
              {p.prior > 0 && <Tag color="purple">Өмнөх {p.prior}</Tag>}
            </Space>
            {!!data.schedule?.length && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
                Тогтмол цаг:{" "}
                {data.schedule.map((s: any) => s.label).join(" · ")}
              </div>
            )}
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
                  ? `Энэ сард товлогдсон ${p.scheduled} хичээл үлдсэн. Орохгүй бол «Хичээл товлох» хэсгээс цуцлаарай — эс тэгвээс тасалсанд тооцогдоно.`
                  : undefined
              }
            />
          )}

          {/* Таб — `Segmented` БИШ. Segmented-ийн гулсдаг тэмдэглэгээ (thumb)
              нь CSS transition дуусахыг хүлээдэг тул сул утсан дээр идэвхтэй
              таб нэг алхам хоцорч харагдана. Radio.Group нь ангиллаараа шууд
              будагддаг тул ийм асуудалгүй. Шошго БОГИНО — 375px-д 3 багтана. */}
          <Radio.Group
            buttonStyle="solid"
            size="large"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            style={{ display: "flex", width: "100%", marginBottom: 12 }}
          >
            {[
              { value: "mark", label: "Ирц" },
              { value: "book", label: "Товлох" },
              { value: "history", label: `Түүх ${data.lessons.length}` },
            ].map((t) => (
              <Radio.Button
                key={t.value}
                value={t.value}
                style={{ flex: 1, textAlign: "center" }}
              >
                {t.label}
              </Radio.Button>
            ))}
          </Radio.Group>

          {tab === "mark" && (
            <>
              <MarkEntry studentId={id!} />
              <PriorEntries studentId={id!} progress={p} prior={data.prior} />
            </>
          )}

          {tab === "book" && (
            <>
              <div
                style={{
                  ...card,
                  background: "#f0eaff",
                  fontSize: 12,
                  color: "#555",
                }}
              >
                Тасалсанаа нөхөх, эсвэл сурагчтай тохиролцоод тухайн долоо
                хоногт нэмж орох хичээл. Үндсэн хуваарь өөрчлөгдөхгүй.
              </div>
              <BookLesson studentId={id!} />

              <div style={card}>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  Товлогдсон хичээл ({data.upcoming?.length ?? 0})
                </Typography.Text>
                {!data.upcoming?.length ? (
                  <Typography.Paragraph
                    type="secondary"
                    style={{ fontSize: 12, margin: "8px 0 0" }}
                  >
                    Товлогдсон хичээл алга.
                  </Typography.Paragraph>
                ) : (
                  data.upcoming.map((l: any) => (
                    <LessonRow
                      key={l._id}
                      lesson={l}
                      right={
                        l.cancellable ? (
                          <Popconfirm
                            title="Энэ хичээлийг цуцлах уу?"
                            okText="Тийм"
                            cancelText="Үгүй"
                            onConfirm={() => cancel.mutate(l._id)}
                          >
                            <Button size="small" danger>
                              Цуцлах
                            </Button>
                          </Popconfirm>
                        ) : undefined
                      }
                    />
                  ))
                )}
              </div>
            </>
          )}

          {tab === "history" && (
            <div style={card}>
              <Typography.Text strong style={{ fontSize: 13 }}>
                {data.month} сарын бүртгэл
              </Typography.Text>
              {!data.lessons.length ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Бичлэг алга"
                  style={{ padding: "24px 0" }}
                />
              ) : (
                data.lessons.map((l: any) => (
                  <LessonRow
                    key={l._id}
                    lesson={l}
                    right={
                      <Tag
                        color={LESSON_STATUS_COLOR[l.status]}
                        style={{ marginInlineEnd: 0 }}
                      >
                        {LESSON_STATUS_LABEL[l.status] ?? l.status}
                      </Tag>
                    }
                  />
                ))
              )}
            </div>
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
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const paused = rows.filter((r) => r.status === "PAUSED").length;
    const left = rows.filter(
      (r) => r.status !== "ACTIVE" && r.status !== "PAUSED",
    ).length;
    return { done, total: rows.length, active, paused, left };
  }, [data]);

  return (
    <div>
      {/* Гарчиг + «Нэмэх» — жагсаалтад ягаан товч ЗӨВХӨН энд. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
            Сурагч
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
            {summary.active} идэвхтэй · {data?.quota ?? 8} оролтоос{" "}
            {summary.done} гүйцээсэн
          </div>
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

      <Input.Search
        size="large"
        placeholder="Нэр, код, утсаар хайх"
        allowClear
        onSearch={setQuery}
        style={{ marginBottom: 16 }}
      />

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : !data?.rows?.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Сурагч алга"
          style={{ padding: "40px 0" }}
        />
      ) : (
        <div className="row-card">
          {data.rows.map((s: any) => {
            const phone = s.phone || s.parentPhone;
            return (
              <div
                key={s._id}
                style={{ padding: 14, cursor: "pointer" }}
                onClick={() => setSheet(s._id)}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {studentName(s)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.code} · {STUDENT_LEVEL_LABEL[s.level] ?? "—"}
                      {s.status !== "ACTIVE" && (
                        <>
                          {" "}
                          ·{" "}
                          <span
                            style={{
                              color:
                                STUDENT_STATUS_COLOR[s.status] ?? "#9ca3af",
                            }}
                          >
                            {STUDENT_STATUS_LABEL[s.status]}
                          </span>
                        </>
                      )}
                      {s.parentName && (
                        <span>
                          {" "}
                          · <UserOutlined /> {s.parentName}
                        </span>
                      )}
                    </div>
                  </div>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="icon-btn"
                      title={`${phone} руу залгах`}
                      aria-label={`${phone} руу залгах`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PhoneOutlined />
                    </a>
                  )}
                  <div
                    style={{ color: "#c4c8ce", fontSize: 15, flexShrink: 0 }}
                  >
                    ›
                  </div>
                </div>
                <MonthBar month={s.month} />
              </div>
            );
          })}
        </div>
      )}

      {!!summary.total && (
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "center",
            marginTop: 14,
          }}
        >
          Завсарласан {summary.paused} · Гарсан {summary.left}
        </div>
      )}

      <AddStudent open={open} onClose={() => setOpen(false)} />
      <StudentSheet id={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
