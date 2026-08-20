"use client";

import { useState } from "react";
import { Alert, Button, Empty, Skeleton, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { teacherApi } from "@/lib/teacher-api";
import TeacherLessonCard from "@/components/TeacherLessonCard";

/** Багшийн үндсэн дэлгэц — тухайн өдрийн хичээл, ирцийг шууд бүртгэнэ. */
export default function TeacherTodayPage() {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const dateKey = date.format("YYYY-MM-DD");
  const isToday = dateKey === dayjs().format("YYYY-MM-DD");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-schedule", dateKey],
    queryFn: async () =>
      (await teacherApi.get("/schedule", { params: { from: dateKey, to: dateKey } }))
        .data,
  });

  const rows = data?.rows || [];
  const marked = rows.filter((r: any) =>
    ["ATTENDED", "ABSENT", "EXCUSED"].includes(r.status),
  ).length;
  const pending = rows.filter(
    (r: any) => r.status === "SCHEDULED" && r.editable,
  ).length;
  const onLeave = (data?.leaves || []).length > 0;

  return (
    <div>
      {/* Огнооны шилжүүлэгч — том хүрэх талбайтай */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Button
          className="touch-btn"
          icon={<LeftOutlined />}
          onClick={() => setDate(date.add(-1, "day"))}
          aria-label="Өмнөх өдөр"
        />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
            {date.format("MM сарын DD")}
            {rows[0]?.weekdayLabel ? ` · ${rows[0].weekdayLabel}` : ""}
          </div>
          {!isToday && (
            <a style={{ fontSize: 12 }} onClick={() => setDate(dayjs())}>
              Өнөөдөр рүү буцах
            </a>
          )}
          {isToday && (
            <div style={{ fontSize: 12, color: "#999" }}>Өнөөдөр</div>
          )}
        </div>
        <Button
          className="touch-btn"
          icon={<RightOutlined />}
          onClick={() => setDate(date.add(1, "day"))}
          aria-label="Дараагийн өдөр"
        />
      </div>

      {/* Тойм — 3 нүд */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Хичээл", value: rows.length, color: "#262626" },
          { label: "Бүртгэсэн", value: marked, color: "#22c55e" },
          { label: "Үлдсэн", value: pending, color: pending ? "#f59e0b" : "#bfbfbf" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: "#fff",
              border: "1px solid #f0f0f0",
              borderRadius: 10,
              padding: "10px 6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "#999" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {onLeave && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Та энэ өдөр чөлөөтэй"
          description="Хичээлүүд зөөгдсөн эсвэл админ зохицуулж байна."
        />
      )}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Энэ өдөр хичээл алга"
          style={{ padding: "40px 0" }}
        />
      ) : (
        <>
          {rows.map((l: any) => (
            <TeacherLessonCard key={l._id} lesson={l} />
          ))}
          <Typography.Paragraph
            type="secondary"
            style={{ fontSize: 12, textAlign: "center", marginTop: 4 }}
          >
            Ирцийг {data?.editWindowDays ?? 7} хоногийн дотор засаж болно.
          </Typography.Paragraph>
        </>
      )}
    </div>
  );
}
