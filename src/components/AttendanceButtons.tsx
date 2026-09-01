"use client";

import { App, Button, Space, Tooltip } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { LESSON_STATUS_COLOR, LESSON_STATUS_LABEL } from "@/lib/labels";

const OPTIONS = ["ATTENDED", "ABSENT", "EXCUSED"] as const;

/**
 * Ирц бүртгэх товчнууд.
 *
 * Segmented ашиглаж болохгүй: ирц бүртгээгүй (SCHEDULED) хичээл дээр Segmented
 * эхний сонголтыг СОНГОГДСОН мэт харуулж, дарахад onChange асдаггүй — багш
 * "Ирсэн" дарж байгаад юу ч болохгүй. Тусдаа товчнууд үргэлж ажиллана.
 */
export default function AttendanceButtons({
  lesson,
  size = "small",
  block,
}: {
  lesson: any;
  size?: "small" | "middle";
  block?: boolean;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const mark = useMutation({
    mutationFn: async (status: string) =>
      api.post(`/attendance/${lesson._id}`, { status }),
    onSuccess: (res) => {
      const { absences, strikeLimit, lesson: updated } = res.data;
      if (updated.status === "ABSENT") {
        message.warning(
          `Тасалсан — энэ сард ${absences} дахь удаа${
            absences > strikeLimit
              ? ". Хязгаар хэтэрсэн тул багшид цалин тооцогдоно."
              : ` (${strikeLimit} хүртэл сануулга).`
          }`,
          5,
        );
      } else {
        message.success(`${LESSON_STATUS_LABEL[updated.status]} гэж бүртгэлээ`);
      }
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["lesson", lesson._id] });
      qc.invalidateQueries({ queryKey: ["student-lessons"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Space.Compact block={block}>
      {OPTIONS.map((status) => {
        const active = lesson.status === status;
        return (
          <Tooltip
            key={status}
            title={
              active
                ? "Одоогийн төлөв"
                : `${LESSON_STATUS_LABEL[status]} болгох`
            }
          >
            <Button
              size={size}
              loading={mark.isPending && mark.variables === status}
              onClick={() => mark.mutate(status)}
              style={
                active
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
          </Tooltip>
        );
      })}
    </Space.Compact>
  );
}
