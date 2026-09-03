"use client";

import { useState } from "react";
import { App, Button, Tag, Tooltip, Typography } from "antd";
import { PhoneOutlined, SwapOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";
import {
  LESSON_STATUS_LABEL,
  minuteLabel,
  studentName,
} from "@/lib/labels";
import ShiftLessonModal from "./ShiftLessonModal";

/**
 * Өнгөний дэглэм — дэлгэц даяар 4 утгатай өнгө л хэрэглэнэ:
 * ягаан = дарж болох, ногоон = ирсэн, улаан = тасалсан, шар = анхаарал.
 * Бусад бүх зүйл саарал. (Цэнхэрийг багшийн хэсгээс бүрэн хассан.)
 */
export const ATTENDANCE_COLORS: Record<string, string> = {
  ATTENDED: "#16a34a",
  ABSENT: "#dc2626",
  EXCUSED: "#d97706",
};

const SEGMENTS = [
  { status: "ATTENDED", label: "Ирсэн" },
  { status: "ABSENT", label: "Тасалсан" },
  { status: "EXCUSED", label: "Чөлөө" },
] as const;

/**
 * Мөрөн дээр харуулах төлөвийн байдал — цэг + бичвэр.
 * Товлогдсон нь ТОД БИШ (саарал): тод өнгө зөвхөн болсон үйл явдалд.
 * Өнгөрсөн атлаа тавиагүй нь шараар анхааруулна.
 */
export function lessonStatusMeta(lesson: any): {
  label: string;
  color: string;
  dot?: string;
} {
  const s = lesson.status;
  if (s === "ATTENDED") return { label: "ирсэн", color: "#15803d", dot: "#16a34a" };
  if (s === "ABSENT") return { label: "тасалсан", color: "#b91c1c", dot: "#dc2626" };
  if (s === "EXCUSED") return { label: "чөлөө", color: "#b45309", dot: "#d97706" };
  if (s === "SCHEDULED") {
    const past = lesson.date <= new Date().toISOString().slice(0, 10);
    if (past && lesson.editable)
      return { label: "тавиагүй", color: "#b45309", dot: "#d97706" };
    return { label: "товлогдсон", color: "#9ca3af" };
  }
  return {
    label: (LESSON_STATUS_LABEL[s] ?? s).toLowerCase(),
    color: "#9ca3af",
  };
}

/**
 * Хумигдсан НЭГ МӨР — тавигдсан/уншихад зориулсан хичээл.
 * `row-card` контейнер дотор хэрэглэнэ (хилийг контейнер зурна).
 */
export function TeacherLessonRow({
  lesson,
  onEdit,
}: {
  lesson: any;
  onEdit?: () => void;
}) {
  const meta = lessonStatusMeta(lesson);
  const [start] = String(lesson.timeLabel ?? "").split("–");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          width: 44,
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 600,
          color: "#4b5563",
        }}
      >
        {start}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {studentName(lesson.student)}
          {lesson.type === "MAKEUP" && (
            <span style={{ color: "#9ca3af", fontWeight: 400 }}> · нөхөх</span>
          )}
        </div>
        {lesson.room?.name && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
            {lesson.room.name}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: meta.color,
          flexShrink: 0,
        }}
      >
        {meta.dot && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: meta.dot,
              display: "inline-block",
            }}
          />
        )}
        {meta.label}
      </div>
      {onEdit && (
        <div
          onClick={onEdit}
          style={{
            fontSize: 13,
            color: "#7c3aed",
            fontWeight: 500,
            padding: "6px 2px 6px 8px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Засах
        </div>
      )}
    </div>
  );
}

/**
 * Нэг хичээлийн БҮТЭН карт — ирц тавихад зориулсан.
 *
 * Дизайн: зүүн талд цаг (том), голд нэр + өрөө, баруун талд 44px утасны
 * дүрс товч (цэнхэр линк БИШ — дугаарыг уншихаас илүү залгах нь чухал),
 * доор нь 3 хэсэгтэй сегмент сонголт (Ирсэн/Тасалсан/Чөлөө).
 */
export default function TeacherLessonCard({
  lesson,
  showDate,
}: {
  lesson: any;
  showDate?: boolean;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [shiftOpen, setShiftOpen] = useState(false);

  const mark = useMutation({
    mutationFn: async (status: string) =>
      teacherApi.post(`/attendance/${lesson._id}`, { status }),
    onSuccess: (res) => {
      const { absences, strikeLimit, lesson: updated } = res.data;
      if (updated.status === "ABSENT") {
        message.warning(
          `Тасалсан — энэ сард ${absences} дахь удаа (${strikeLimit} хүртэл сануулга)`,
          4,
        );
      } else {
        message.success(`${LESSON_STATUS_LABEL[updated.status]} гэж бүртгэлээ`);
      }
      qc.invalidateQueries({ queryKey: ["teacher-schedule"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const marked = ["ATTENDED", "ABSENT", "EXCUSED"].includes(lesson.status);
  const lastMove = lesson.moveHistory?.[lesson.moveHistory.length - 1];
  const [start, end] = String(lesson.timeLabel ?? "").split("–");
  const phone = lesson.student?.phone || lesson.student?.parentPhone;

  /**
   * Ирц тавих боломжгүйн ЖИНХЭНЭ шалтгаан.
   *
   * Төлөвийг огт харалгүй «Засах хугацаа өнгөрсөн» гэж буруу шалтгаан
   * хэлбэл багш нар админ руу дэмий залгадаг тул төлөв бүрд нь тайлбарлана.
   */
  const STATUS_REASON: Record<string, string> = {
    CANCELLED: "Энэ хичээл цуцлагдсан — ирц тавихгүй",
    MOVED: "Өөр цаг руу зөөгдсөн — шинэ хичээл дээр нь ирцээ тавина",
    TEACHER_LEAVE: "Багшийн чөлөөнд таарсан — нөхөх хичээл товлоно",
  };
  const lockedReason =
    STATUS_REASON[lesson.status] ??
    (lesson.salaryPayout
      ? "Цалин олгогдсон — өөрчлөх боломжгүй"
      : lesson.date > new Date().toISOString().slice(0, 10)
        ? "Хичээл хараахан болоогүй"
        : "Засах хугацаа өнгөрсөн — админд хандана уу");

  return (
    <div className="lesson-card">
      {/* Мөр 1: цаг + сурагч + утас */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flexShrink: 0, width: 52 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>
            {start}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.3 }}>
            {end && `–${end}`}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
            <span className="lesson-card__name">
              {studentName(lesson.student)}
            </span>
            {lesson.type === "MAKEUP" && (
              <Tag color="gold" className="lesson-card__chip">
                нөхөх
              </Tag>
            )}
            {lastMove && (
              <Tooltip
                title={`${minuteLabel(lastMove.startMinute)}–${minuteLabel(
                  lastMove.endMinute,
                )} цагаас зөөсөн${lastMove.reason ? ` · ${lastMove.reason}` : ""}`}
              >
                <Tag color="purple" className="lesson-card__chip">
                  <SwapOutlined /> зөөсөн
                </Tag>
              </Tooltip>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {showDate && <span>{lesson.date} · </span>}
            {lesson.room?.name}
          </div>
        </div>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="icon-btn"
            title={`${phone} руу залгах`}
            aria-label={`${phone} руу залгах`}
          >
            <PhoneOutlined />
          </a>
        )}
      </div>

      {/* Мөр 2: ирц бүртгэх сегмент */}
      {lesson.editable ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 3,
            background: "#f2f3f5",
            borderRadius: 9,
            padding: 3,
            marginTop: 12,
          }}
        >
          {SEGMENTS.map((o) => {
            const on = lesson.status === o.status;
            const busy = mark.isPending && mark.variables === o.status;
            return (
              <button
                key={o.status}
                onClick={() => mark.mutate(o.status)}
                disabled={mark.isPending}
                style={{
                  minHeight: 40,
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: on ? ATTENDANCE_COLORS[o.status] : "transparent",
                  color: on ? "#fff" : "#374151",
                  boxShadow: on ? "0 1px 3px rgba(16,24,40,.18)" : "none",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ) : (
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, display: "block", marginTop: 10 }}
        >
          {lockedReason}
        </Typography.Text>
      )}

      {/* Сурагч хоцорсон / эрт ирсэн үед мөн өдрийн сул цаг руу зөөнө. */}
      {lesson.shiftable && (
        <Button
          block
          className="touch-btn"
          icon={<SwapOutlined />}
          onClick={() => setShiftOpen(true)}
          style={{ marginTop: 8 }}
        >
          Энэ өдрийн өөр цаг руу зөөх
        </Button>
      )}

      <ShiftLessonModal
        lesson={lesson}
        mode="teacher"
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
      />
    </div>
  );
}
