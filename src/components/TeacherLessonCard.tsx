"use client";

import { App, Button, Space, Tag, Typography } from "antd";
import {
  PhoneOutlined,
  ClockCircleOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";
import {
  LESSON_STATUS_COLOR,
  LESSON_STATUS_LABEL,
  studentName,
} from "@/lib/labels";

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
        <div style={{ flexShrink: 0, textAlign: "center", minWidth: 54 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>
            {lesson.timeLabel?.split("–")[0]}
          </div>
          <div style={{ fontSize: 11, color: "#999" }}>
            {lesson.timeLabel?.split("–")[1]}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>
            {studentName(lesson.student)}
            {lesson.type === "MAKEUP" && (
              <Tag color="gold" style={{ marginLeft: 6, fontSize: 10 }}>
                нөхөх
              </Tag>
            )}
          </div>
          <Space size={10} wrap style={{ marginTop: 3, fontSize: 12, color: "#888" }}>
            {showDate && (
              <span>
                <ClockCircleOutlined /> {lesson.date} {lesson.weekdayLabel}
              </span>
            )}
            <span>
              <HomeOutlined /> {lesson.room?.name}
            </span>
            {phone && (
              <a href={`tel:${phone}`} style={{ fontWeight: 500 }}>
                <PhoneOutlined /> {phone}
              </a>
            )}
          </Space>
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
    </div>
  );
}
