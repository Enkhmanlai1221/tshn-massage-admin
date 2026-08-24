"use client";

import { useState } from "react";
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Popconfirm,
  Select,
  Space,
  Tag,
  Timeline,
  Typography,
  Divider,
} from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import {
  LessonStatusTag,
  LESSON_TYPE_LABEL,
  WEEKDAY_LABEL,
  minuteLabel,
  money,
  studentName,
} from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import AttendanceButtons from "./AttendanceButtons";
import ShiftLessonModal from "./ShiftLessonModal";

/** Нөхөх хичээл товлох — backend-ийн санал болгосон сул цагуудаас сонгоно. */
function MakeupPicker({ lesson, onDone }: { lesson: any; onDone: () => void }) {
  const { message } = App.useApp();
  const [picked, setPicked] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["makeup-options", lesson._id],
    queryFn: async () =>
      (await api.get(`/lesson/${lesson._id}/makeup-options`)).data
        .rows as any[],
  });

  const save = useMutation({
    mutationFn: async () => {
      const [date, slotIndex, room] = picked!.split("|");
      return api.post(`/lesson/${lesson._id}/makeup`, {
        date,
        slotIndex: Number(slotIndex),
        room,
      });
    },
    onSuccess: (res) => {
      message.success(res.data.message);
      onDone();
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Typography.Text type="secondary">
        Нөхөх хичээлийн цаг — багш, сурагч хоёулаа сул цагууд:
      </Typography.Text>
      <Select
        loading={isLoading}
        style={{ width: "100%" }}
        placeholder="Сул цаг сонгох"
        value={picked}
        onChange={setPicked}
        options={(data || []).map((s) => ({
          value: `${s.date}|${s.slotIndex}|${s.rooms[0]._id}`,
          label: `${s.date} (${s.weekdayLabel}) ${s.timeLabel} — ${s.rooms[0].name}`,
        }))}
        showSearch
        optionFilterProp="label"
      />
      <Button
        type="primary"
        block
        disabled={!picked}
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        Нөхөх хичээл товлох
      </Button>
    </Space>
  );
}

export default function LessonDrawer({
  lessonId,
  onClose,
}: {
  lessonId: string | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [shiftOpen, setShiftOpen] = useState(false);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => (await api.get(`/lesson/${lessonId}`)).data,
    enabled: !!lessonId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
    qc.invalidateQueries({ queryKey: ["attendance"] });
  };

  const cancel = useMutation({
    mutationFn: async () => api.delete(`/lesson/${lessonId}`),
    onSuccess: () => {
      message.success("Хичээл цуцлагдлаа");
      refresh();
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const canMakeup =
    lesson && ["EXCUSED", "TEACHER_LEAVE"].includes(lesson.status);

  // Мөн өдрийн дотор урагш/хойш зөөх — сурагч хоцорсон үеийн түгээмэл кейс.
  const canShift =
    lesson &&
    lesson.status === "SCHEDULED" &&
    !lesson.salaryPayout &&
    can("LESSON", "isEdit");
  const moves = lesson?.moveHistory || [];

  return (
    <Drawer
      title="Хичээлийн мэдээлэл"
      open={!!lessonId}
      onClose={onClose}
      width={460}
      loading={isLoading}
    >
      {lesson && (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Сурагч">
              {studentName(lesson.student)}{" "}
              <Typography.Text type="secondary">
                {lesson.student?.code}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Багш">
              {lesson.teacher?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Хөгжим">
              <Tag color={lesson.instrument?.color}>
                {lesson.instrument?.name}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Огноо">
              {lesson.date} ({WEEKDAY_LABEL[lesson.weekday]})
            </Descriptions.Item>
            <Descriptions.Item label="Цаг">
              {minuteLabel(lesson.startMinute)}–{minuteLabel(lesson.endMinute)}
            </Descriptions.Item>
            <Descriptions.Item label="Өрөө">
              {lesson.room?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Төрөл">
              {LESSON_TYPE_LABEL[lesson.type] || lesson.type}
            </Descriptions.Item>
            <Descriptions.Item label="Төлөв">
              <LessonStatusTag status={lesson.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Цалин">
              {lesson.payable ? (
                <b>{money(lesson.rate)}</b>
              ) : (
                <Typography.Text type="secondary">Тооцохгүй</Typography.Text>
              )}
              {lesson.salaryPayout && <Tag color="green">Олгогдсон</Tag>}
            </Descriptions.Item>
            {lesson.makeupOf && (
              <Descriptions.Item label="Нөхөж буй">
                {lesson.makeupOf.date}
              </Descriptions.Item>
            )}
            {lesson.movedFrom && (
              <Descriptions.Item label="Зөөгдөж ирсэн">
                {lesson.movedFrom.date}
              </Descriptions.Item>
            )}
            {lesson.movedTo && (
              <Descriptions.Item label="Зөөгдсөн">
                {lesson.movedTo.date}
              </Descriptions.Item>
            )}
            {lesson.note && (
              <Descriptions.Item label="Тэмдэглэл">
                {lesson.note}
              </Descriptions.Item>
            )}
          </Descriptions>

          {moves.length > 0 && (
            <>
              <Divider orientation="left" plain>
                Зөөлтийн түүх
              </Divider>
              <Timeline
                items={[
                  ...moves.map((m: any) => ({
                    color: "gray",
                    children: (
                      <div style={{ fontSize: 12 }}>
                        <b>
                          {m.date} {minuteLabel(m.startMinute)}–
                          {minuteLabel(m.endMinute)}
                        </b>{" "}
                        · {m.room?.name}
                        <div style={{ color: "#999" }}>
                          {m.reason || "шалтгаан бичээгүй"} —{" "}
                          {m.byModel === "Teacher" ? "багш" : "админ"}
                          {m.by?.name ? ` (${m.by.name})` : ""}
                        </div>
                      </div>
                    ),
                  })),
                  {
                    color: "blue",
                    children: (
                      <div style={{ fontSize: 12 }}>
                        <b>
                          {lesson.date} {minuteLabel(lesson.startMinute)}–
                          {minuteLabel(lesson.endMinute)}
                        </b>{" "}
                        · {lesson.room?.name}
                        <div style={{ color: "#999" }}>одоогийн цаг</div>
                      </div>
                    ),
                  },
                ]}
              />
            </>
          )}

          {canShift && (
            <>
              <Divider orientation="left" plain>
                Цаг зөөх
              </Divider>
              <Button
                block
                icon={<SwapOutlined />}
                onClick={() => setShiftOpen(true)}
              >
                Мөн өдрийн сул цаг руу зөөх
              </Button>
              <ShiftLessonModal
                lesson={lesson}
                mode="admin"
                open={shiftOpen}
                onClose={() => setShiftOpen(false)}
              />
            </>
          )}

          {can("ATTENDANCE", "isWrite") && !lesson.salaryPayout && (
            <>
              <Divider orientation="left" plain>
                Ирц
              </Divider>
              <AttendanceButtons lesson={lesson} size="middle" block />
            </>
          )}

          {canMakeup && can("LESSON", "isWrite") && (
            <>
              <Divider orientation="left" plain>
                Нөхөх хичээл
              </Divider>
              <MakeupPicker lesson={lesson} onDone={refresh} />
            </>
          )}

          {can("LESSON", "isRemove") &&
            !lesson.salaryPayout &&
            lesson.status !== "CANCELLED" && (
              <>
                <Divider />
                <Popconfirm
                  title="Хичээлийг цуцлах уу?"
                  onConfirm={() => cancel.mutate()}
                >
                  <Button danger block loading={cancel.isPending}>
                    Хичээл цуцлах
                  </Button>
                </Popconfirm>
              </>
            )}
        </>
      )}
    </Drawer>
  );
}
