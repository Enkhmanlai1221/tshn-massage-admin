"use client";

import { useState } from "react";
import { App, Button, Tag, Tooltip, Typography } from "antd";
import {
  PhoneOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";
import {
  LESSON_STATUS_COLOR,
  LESSON_STATUS_LABEL,
  minuteLabel,
  studentName,
} from "@/lib/labels";
import ShiftLessonModal from "./ShiftLessonModal";

const OPTIONS = ["ATTENDED", "ABSENT", "EXCUSED"] as const;

/**
 * Нэг хичээлийн карт — гар утсанд зориулсан.
 *
 * Хүснэгт биш карт ашиглах шалтгаан: 360px өргөнтэй дэлгэцэд 6 багана
 * багтахгүй, хэвтээ гүйлгэх шаардлагатай болдог. Карт нь мэдээллийг
 * босоо байрлуулж, ирцийн товчийг бүтэн өргөнөөр өгнө.
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

  const lockedReason = lesson.salaryPayout
    ? "Цалин олгогдсон — өөрчлөх боломжгүй"
    : lesson.date > new Date().toISOString().slice(0, 10)
      ? "Хичээл хараахан болоогүй"
      : "Засах хугацаа өнгөрсөн — админд хандана уу";

  return (
    <div className={`lesson-card${marked ? " lesson-card--done" : ""}`}>
      {/* Мөр 1: цаг + сурагч + төлөв */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flexShrink: 0, textAlign: "center", minWidth: 48 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>
            {start}
          </div>
          <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.3 }}>
            {end && `–${end}`}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Нэр + шошго — нэрийг 2 мөр хүртэл таслана. */}
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
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

          {/* Өрөө + утас — ҮРГЭЛЖ нэг мөр. Урт өрөөний нэр таслагдана. */}
          <div className="lesson-card__meta">
            {showDate && (
              <span style={{ flexShrink: 0 }}>
                <ClockCircleOutlined /> {lesson.date}
              </span>
            )}
            <span className="lesson-card__room">
              <HomeOutlined /> {lesson.room?.name}
            </span>
            {phone && (
              <a href={`tel:${phone}`} className="lesson-card__phone">
                <PhoneOutlined /> {phone}
              </a>
            )}
          </div>
        </div>
        <Tag
          color={LESSON_STATUS_COLOR[lesson.status]}
          style={{ marginInlineEnd: 0, flexShrink: 0 }}
        >
          {LESSON_STATUS_LABEL[lesson.status]}
        </Tag>
      </div>

      {/* Мөр 2: ирц бүртгэх */}
      <div style={{ marginTop: 10 }}>
        {lesson.editable ? (
          <div style={{ display: "flex", gap: 6 }}>
            {OPTIONS.map((status) => {
              const on = lesson.status === status;
              return (
                <Button
                  key={status}
                  className="touch-btn"
                  block
                  loading={mark.isPending && mark.variables === status}
                  onClick={() => mark.mutate(status)}
                  style={
                    on
                      ? {
                          background: LESSON_STATUS_COLOR[status],
                          borderColor: LESSON_STATUS_COLOR[status],
                          color: "#fff",
                          fontWeight: 600,
                        }
                      : undefined
                  }
                >
                  {LESSON_STATUS_LABEL[status]}
                </Button>
              );
            })}
          </div>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {lockedReason}
          </Typography.Text>
        )}
      </div>

      {/* Сурагч хоцорсон / эрт ирсэн үед мөн өдрийн сул цаг руу зөөнө. */}
      {lesson.shiftable && (
        <Button
          block
          className="touch-btn"
          icon={<SwapOutlined />}
          onClick={() => setShiftOpen(true)}
          style={{ marginTop: 6 }}
        >
          Цаг зөөх
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
