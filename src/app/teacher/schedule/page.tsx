"use client";

import { useState } from "react";
import { Button, Empty, Segmented, Skeleton } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { teacherApi } from "@/lib/teacher-api";
import { TeacherLessonRow } from "@/components/TeacherLessonCard";
import { money } from "@/lib/labels";

type Range = "week" | "month";

/** Долоо хоногийн нүдний богино гарчиг — Да, Мя, Лх... */
const DAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

/**
 * Багшийн бүтэн хуваарь — ЗӨВХӨН ХАРНА, ирцийн товч байхгүй.
 *
 * Ирц тавих ажил бүхэлдээ «Өнөөдөр» дэлгэц дээр: энд тавиагүй өдөр байвал
 * баннер гарч, нэг товшилтоор тэр өдөр рүү аваачна. Ингэснээр хоёр дэлгэц
 * дээр зэрэг ирц тавьж болдог байсан будлиан арилна.
 */
export default function TeacherSchedulePage() {
  const router = useRouter();
  const [range, setRange] = useState<Range>("week");
  const [anchor, setAnchor] = useState<Dayjs>(dayjs());

  // Даваагаас эхэлсэн 7 хоног. dayjs-ийн startOf("week") нь Ням гараг тул
  // шууд ашиглавал НЯМ гарагт дараагийн долоо хоног харагдаж, өнөөдөр
  // мужаас гарч унана. Тиймээс Давааг гараас нь тооцно.
  const monday = anchor.add(anchor.day() === 0 ? -6 : 1 - anchor.day(), "day");
  const from = range === "week" ? monday.startOf("day") : anchor.startOf("month");
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

  const todayKey = dayjs().format("YYYY-MM-DD");
  // Өнгөрсөн/өнөөдрийн тавиагүй хичээлүүд — баннерын эх сурвалж.
  const unmarked = rows.filter(
    (r: any) => r.status === "SCHEDULED" && r.editable && r.date <= todayKey,
  );
  const firstUnmarkedDate = unmarked.map((r: any) => r.date).sort()[0];

  const shift = (dir: number) =>
    setAnchor(
      range === "week" ? anchor.add(dir * 7, "day") : anchor.add(dir, "month"),
    );

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
          Хуваарь
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
          {rows.length} хичээл · {attended} ирсэн · {money(payable)}
        </div>
      </div>

      <Segmented
        block
        value={range}
        onChange={(v) => setRange(v as Range)}
        options={[
          { label: "7 хоног", value: "week" },
          { label: "Сар", value: "month" },
        ]}
        style={{ margin: "14px 0 12px" }}
      />

      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}
      >
        <Button
          icon={<LeftOutlined />}
          onClick={() => shift(-1)}
          aria-label="Өмнөх"
          style={{ width: 36, height: 36 }}
        />
        <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600 }}>
          {range === "week"
            ? `${from.format("MM/DD")} — ${to.format("MM/DD")}`
            : anchor.format("YYYY оны MM сар")}
        </div>
        <Button
          icon={<RightOutlined />}
          onClick={() => shift(1)}
          aria-label="Дараах"
          style={{ width: 36, height: 36 }}
        />
      </div>

      {/* Долоо хоногийн зураглал — өдөр бүрийн хичээлийн тоо. Өнөөдөр ягаан. */}
      {range === "week" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 16,
          }}
        >
          {Array.from({ length: 7 }, (_, i) => {
            const d = from.add(i, "day");
            const key = d.format("YYYY-MM-DD");
            const count = byDate.get(key)?.length ?? 0;
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                style={{
                  background: isToday ? "#f5f3ff" : "#fff",
                  border: `1px solid ${isToday ? "#c4b5fd" : "#e2e4e9"}`,
                  borderRadius: 8,
                  padding: "7px 0",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: isToday ? "#7c3aed" : "#9ca3af",
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {DAY_SHORT[d.day()]}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 600,
                    color: count
                      ? isToday
                        ? "#6d28d9"
                        : "#374151"
                      : "#d1d5db",
                    marginTop: 2,
                  }}
                >
                  {count || "·"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Тавиагүй ирц — нэг товшилтоор тэр өдрийн Өнөөдөр дэлгэц рүү. */}
      {unmarked.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
              {unmarked.length} хичээлийн ирц тавиагүй
            </div>
            <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
              {dayjs(firstUnmarkedDate).format("MM/DD")} ·{" "}
              {unmarked[0]?.weekdayLabel ??
                dayjs(firstUnmarkedDate).format("dd")}
            </div>
          </div>
          <Button
            type="primary"
            onClick={() => router.push(`/teacher?date=${firstUnmarkedDate}`)}
          >
            Тавих
          </Button>
        </div>
      )}

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
          <div key={date} style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {dayjs(date).format("MM/DD")} · {items[0].weekdayLabel}
              </span>
              {date === todayKey && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#6d28d9",
                    background: "#f5f3ff",
                    border: "1px solid #ddd6fe",
                    borderRadius: 5,
                    padding: "1px 6px",
                    fontWeight: 600,
                  }}
                >
                  өнөөдөр
                </span>
              )}
            </div>
            <div className="row-card">
              {items.map((l: any) => (
                <TeacherLessonRow key={l._id} lesson={l} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
