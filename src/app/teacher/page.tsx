"use client";

import { Suspense, useState } from "react";
import { Alert, Button, Empty, Skeleton, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { teacherApi } from "@/lib/teacher-api";
import TeacherLessonCard, {
  TeacherLessonRow,
} from "@/components/TeacherLessonCard";
import { WEEKDAY_LABEL } from "@/lib/labels";

/**
 * Багшийн үндсэн дэлгэц — ЗӨВХӨН ирц тавихад зориулагдана (харах нь Хуваарь).
 *
 * Дизайн: тавих шаардлагатай хичээл том картаар, тавьсан нь нэг картад
 * хумигдсан мөрөөр. Ингэснээр «юу хийх ёстой вэ» гэдэг л том харагдана.
 */
function TeacherTodayInner() {
  const params = useSearchParams();
  // Хуваарийн «Тавих» баннераас ?date=YYYY-MM-DD гэж ирдэг.
  const initial = params.get("date");
  const [date, setDate] = useState<Dayjs>(() =>
    initial && dayjs(initial).isValid() ? dayjs(initial) : dayjs(),
  );
  // Тавьсан ирцээ мөрнөөс буцааж дэлгэх — «Засах» дарсан хичээлийн id.
  const [editing, setEditing] = useState<string | null>(null);

  const dateKey = date.format("YYYY-MM-DD");
  const isToday = dateKey === dayjs().format("YYYY-MM-DD");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-schedule", dateKey],
    queryFn: async () =>
      (
        await teacherApi.get("/schedule", {
          params: { from: dateKey, to: dateKey },
        })
      ).data,
  });

  const rows = data?.rows || [];
  // Цуцлагдсан / зөөгдсөн хичээл болоогүй тул «Хичээл» тоонд оруулахгүй.
  const active = rows.filter(
    (r: any) => !["MOVED", "CANCELLED"].includes(r.status),
  );
  const markedRows = rows.filter((r: any) =>
    ["ATTENDED", "ABSENT", "EXCUSED"].includes(r.status),
  );
  const pendingRows = rows.filter(
    (r: any) => r.status === "SCHEDULED" && r.editable,
  );
  // Ирц тавигдахгүй бусад: цуцлагдсан, зөөгдсөн, багшийн чөлөө, ирээдүйн г.м.
  const otherRows = rows.filter(
    (r: any) => !markedRows.includes(r) && !pendingRows.includes(r),
  );
  const onLeave = (data?.leaves || []).length > 0;
  /** Ирээдүйн өдөр — хичээл болоогүй тул ирц тавихгүй. */
  const isFuture = date.isAfter(dayjs(), "day");

  const go = (d: Dayjs) => {
    setDate(d);
    setEditing(null);
  };

  return (
    <div>
      {/* Гарчиг + огнооны шилжүүлэгч */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
            {isToday ? "Өнөөдөр" : date.format("MM сарын DD")}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
            {isToday ? (
              <>
                {date.format("MM сарын DD")} · {WEEKDAY_LABEL[date.day()]}
              </>
            ) : (
              <>
                {WEEKDAY_LABEL[date.day()]} ·{" "}
                <a onClick={() => go(dayjs())}>Өнөөдөр рүү буцах</a>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button
            icon={<LeftOutlined />}
            onClick={() => go(date.add(-1, "day"))}
            aria-label="Өмнөх өдөр"
            style={{ width: 36, height: 36 }}
          />
          <Button
            icon={<RightOutlined />}
            onClick={() => go(date.add(1, "day"))}
            aria-label="Дараагийн өдөр"
            style={{ width: 36, height: 36 }}
          />
        </div>
      </div>

      {/* Явц — «2-оос 1 нь тавигдлаа» гэдгийг нэг харцаар. Ирээдүйд утгагүй. */}
      {!isFuture && active.length > 0 && (
        <div className="lesson-card" style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 13, color: "#4b5563" }}>Ирц тавьсан</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              <b style={{ fontSize: 15, color: "#111827" }}>
                {markedRows.length}
              </b>{" "}
              / {active.length} хичээл
            </div>
          </div>
          <div
            style={{
              height: 6,
              background: "#f0f1f3",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#16a34a",
                borderRadius: 3,
                transition: "width 240ms ease",
                width: `${(markedRows.length / active.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {isFuture && rows.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Ирээдүйн өдөр"
          description="Хичээл болоогүй тул ирц тавих боломжгүй. Болсны дараа энэ хуудаснаас тавина."
        />
      )}

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
          {/* ТАВИХ ШААРДЛАГАТАЙ — том карт, сегмент товчтой */}
          {pendingRows.length > 0 && (
            <>
              <div className="section-label" style={{ color: "#92400e" }}>
                ТАВИХ ШААРДЛАГАТАЙ · {pendingRows.length}
              </div>
              {pendingRows.map((l: any) => (
                <TeacherLessonCard key={l._id} lesson={l} />
              ))}
            </>
          )}

          {/* ТАВИГДСАН — нэг картад хумигдсан мөрүүд, «Засах» гэвэл дэлгэнэ */}
          {markedRows.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 18 }}>
                ТАВИГДСАН · {markedRows.length}
              </div>
              {markedRows.some((l: any) => l._id === editing) ? (
                markedRows.map((l: any) =>
                  l._id === editing ? (
                    <TeacherLessonCard key={l._id} lesson={l} />
                  ) : null,
                )
              ) : null}
              <div className="row-card">
                {markedRows
                  .filter((l: any) => l._id !== editing)
                  .map((l: any) => (
                    <TeacherLessonRow
                      key={l._id}
                      lesson={l}
                      onEdit={l.editable ? () => setEditing(l._id) : undefined}
                    />
                  ))}
              </div>
            </>
          )}

          {/* Бусад — товлогдсон (ирээдүй), цуцлагдсан, зөөгдсөн г.м. */}
          {otherRows.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 18 }}>
                {isFuture ? "ТОВЛОГДСОН" : "БУСАД"} · {otherRows.length}
              </div>
              <div className="row-card">
                {otherRows.map((l: any) => (
                  <TeacherLessonRow key={l._id} lesson={l} />
                ))}
              </div>
            </>
          )}

          {!isFuture && (
            <Typography.Paragraph
              type="secondary"
              style={{
                fontSize: 12,
                textAlign: "center",
                margin: "16px 0 0",
                lineHeight: 1.5,
              }}
            >
              Ирцийг {data?.editWindowDays ?? 7} хоногийн дотор засаж болно.
              <br />
              Дараа нь админд хандана.
            </Typography.Paragraph>
          )}
        </>
      )}
    </div>
  );
}

export default function TeacherTodayPage() {
  // useSearchParams нь prerender үед Suspense хүрээ шаарддаг.
  return (
    <Suspense>
      <TeacherTodayInner />
    </Suspense>
  );
}
