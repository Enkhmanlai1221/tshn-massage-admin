"use client";

import { useState } from "react";
import { Button, Empty, Segmented, Skeleton, Tag } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { teacherApi } from "@/lib/teacher-api";
import TeacherLessonCard from "@/components/TeacherLessonCard";
import { money } from "@/lib/labels";

type Range = "week" | "month";

/**
 * Багшийн бүтэн хуваарь — 7 хоног эсвэл сараар.
 * Хичээлүүдийг ӨДРӨӨР бүлэглэж, наалддаг толгойтой харуулна — гар утсанд
 * урт жагсаалтыг гүйлгэхэд байрлалаа алдахгүй.
 */
export default function TeacherSchedulePage() {
  const [range, setRange] = useState<Range>("week");
  const [anchor, setAnchor] = useState<Dayjs>(dayjs());

  const from =
    range === "week"
      ? anchor.startOf("week").add(1, "day")
      : anchor.startOf("month");
  const to = range === "week" ? from.add(6, "day") : anchor.endOf("month");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-schedule", range, from.format("YYYY-MM-DD")],
    queryFn: async () =>
      (
        await teacherApi.get("/schedule", {
          params: { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") },
        })
      ).data,
  });

  const rows = data?.rows || [];
  const attended = rows.filter((r: any) => r.status === "ATTENDED").length;
  const payable = rows
    .filter((r: any) => r.payable)
    .reduce((s: number, r: any) => s + r.rate, 0);

  // Өдрөөр бүлэглэнэ
  const byDate = new Map<string, any[]>();
  for (const l of rows) byDate.set(l.date, [...(byDate.get(l.date) || []), l]);

  const shift = (dir: number) =>
    setAnchor(
      range === "week" ? anchor.add(dir * 7, "day") : anchor.add(dir, "month"),
    );

  return (
    <div>
      <Segmented
        block
        value={range}
        onChange={(v) => setRange(v as Range)}
        options={[
          { label: "7 хоног", value: "week" },
          { label: "Сар", value: "month" },
        ]}
        style={{ marginBottom: 10 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Button className="touch-btn" icon={<LeftOutlined />} onClick={() => shift(-1)} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {range === "week"
              ? `${from.format("MM/DD")} — ${to.format("MM/DD")}`
              : anchor.format("YYYY оны MM сар")}
          </div>
          <div style={{ fontSize: 12, color: "#999" }}>
            {rows.length} хичээл · {attended} ирсэн · {money(payable)}
          </div>
        </div>
        <Button className="touch-btn" icon={<RightOutlined />} onClick={() => shift(1)} />
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Энэ хугацаанд хичээл алга"
          style={{ padding: "40px 0" }}
        />
      ) : (
        [...byDate.entries()].map(([date, items]) => (
          <div key={date}>
            <div
              style={{
                position: "sticky",
                top: 56,
                zIndex: 5,
                background: "#f6f6f7",
                padding: "6px 2px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {dayjs(date).format("MM/DD")} · {items[0].weekdayLabel}
              </span>
              <Tag style={{ fontSize: 11 }}>{items.length}</Tag>
              {date === dayjs().format("YYYY-MM-DD") && (
                <Tag color="blue" style={{ fontSize: 11 }}>
                  өнөөдөр
                </Tag>
              )}
            </div>
            {items.map((l: any) => (
              <TeacherLessonCard key={l._id} lesson={l} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
