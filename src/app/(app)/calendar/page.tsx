"use client";

import { useState } from "react";
import {
  App,
  Alert,
  Button,
  Card,
  DatePicker,
  Space,
  Segmented,
  Spin,
  Tag,
  Typography,
} from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LessonDrawer from "@/components/LessonDrawer";
import WeekCalendar from "@/components/WeekCalendar";
import LessonCreateDrawer, {
  CreateTarget,
} from "@/components/LessonCreateDrawer";
import {
  LESSON_STATUS_LABEL,
  LESSON_STATUS_SOFT,
  studentName,
} from "@/lib/labels";

const CELL_H = 46;

/**
 * Календарын үндсэн харагдац — ӨДӨР × ӨРӨӨ.
 * Мөр нь цаг, багана нь өрөө. Хичээлийг чирж зөөнө (HTML5 drag & drop).
 */
export default function CalendarPage() {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();

  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const dateKey = date.format("YYYY-MM-DD");
  const step = view === "week" ? 7 : 1;

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", "day", dateKey],
    queryFn: async () =>
      (await api.get("/calendar", { params: { date: dateKey } })).data,
    enabled: view === "day",
  });

  const move = useMutation({
    mutationFn: async (p: { id: string; slotIndex: number; room: string }) =>
      api.patch(`/lesson/${p.id}/move`, {
        date: dateKey,
        slotIndex: p.slotIndex,
        room: p.room,
      }),
    onSuccess: (res) => {
      const conflicts = res.data.conflicts || [];
      if (conflicts.length) {
        message.warning(
          `Зөөлөө, гэхдээ давхцалтай: ${conflicts.map((c: any) => c.message).join("; ")}`,
          6,
        );
      } else {
        message.success(res.data.message);
      }
      qc.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  // room#slotIndex → хичээлүүд
  const byCell = new Map<string, any[]>();
  for (const l of data?.lessons || []) {
    const key = `${l.room?._id ?? l.room}#${l.slotIndex}`;
    byCell.set(key, [...(byCell.get(key) || []), l]);
  }

  const canWrite = can("LESSON", "isWrite");
  const canEdit = can("LESSON", "isEdit");

  return (
    <div>
      <Space
        style={{
          marginBottom: 16,
          width: "100%",
          justifyContent: "space-between",
        }}
        wrap
      >
        <Space wrap>
          <Segmented
            value={view}
            onChange={(v) => setView(v as "day" | "week")}
            options={[
              { label: "Өдөр", value: "day" },
              { label: "7 хоног", value: "week" },
            ]}
          />
          <Button
            icon={<LeftOutlined />}
            onClick={() => setDate(date.add(-step, "day"))}
          />
          <DatePicker
            value={date}
            onChange={(v) => v && setDate(v)}
            allowClear={false}
            format="YYYY-MM-DD"
            picker={view === "week" ? "week" : "date"}
          />
          <Button
            icon={<RightOutlined />}
            onClick={() => setDate(date.add(step, "day"))}
          />
          <Button onClick={() => setDate(dayjs())}>Өнөөдөр</Button>
        </Space>
        {view === "day" && (
          <Space>
            <Typography.Text strong>
              {dateKey} · {data?.weekdayLabel}
            </Typography.Text>
            {data && !data.isWorkingDay && (
              <Tag color="red">Ажлын бус өдөр</Tag>
            )}
          </Space>
        )}
      </Space>

      {view === "day" && data?.leaves?.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Чөлөөтэй багш"
          description={data.leaves
            .map(
              (l: any) =>
                `${l.teacher?.name}${l.reason ? ` (${l.reason})` : ""}`,
            )
            .join(", ")}
        />
      )}
      {view === "day" && data?.conflicts?.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={`${data.conflicts.length} нүдэнд давхцал байна`}
        />
      )}

      {view === "week" ? (
        <WeekCalendar date={dateKey} onOpenLesson={setOpenLesson} />
      ) : isLoading ? (
        <Spin />
      ) : (
        <Card styles={{ body: { padding: 0, overflowX: "auto" } }}>
          <table
            style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}
          >
            <thead>
              <tr>
                <th style={th(90)}>Цаг</th>
                {(data?.rooms || []).map((r: any) => (
                  <th key={r._id} style={th()}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.slots || []).map((slot: any) => (
                <tr key={slot.index}>
                  <td style={{ ...td, ...timeCell }}>{slot.label}</td>
                  {(data?.rooms || []).map((room: any) => {
                    const key = `${room._id}#${slot.index}`;
                    const items = byCell.get(key) || [];
                    const isHover = hover === key && dragging;
                    return (
                      <td
                        key={room._id}
                        style={{
                          ...td,
                          background: isHover ? "#e6f4ff" : undefined,
                          cursor:
                            !items.length && canWrite ? "pointer" : undefined,
                        }}
                        onDragOver={(e) => {
                          if (!dragging) return;
                          e.preventDefault();
                          setHover(key);
                        }}
                        onDragLeave={() => setHover(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setHover(null);
                          if (dragging) {
                            move.mutate({
                              id: dragging,
                              slotIndex: slot.index,
                              room: room._id,
                            });
                            setDragging(null);
                          }
                        }}
                        onClick={() => {
                          if (items.length || !canWrite) return;
                          setCreateTarget({
                            date: dateKey,
                            slotIndex: slot.index,
                            room: room._id,
                            roomName: room.name,
                            slotLabel: slot.label,
                          });
                        }}
                      >
                        {items.map((l) => (
                          <div
                            key={l._id}
                            draggable={canEdit && l.status === "SCHEDULED"}
                            onDragStart={() => setDragging(l._id)}
                            onDragEnd={() => {
                              setDragging(null);
                              setHover(null);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenLesson(l._id);
                            }}
                            style={chip(l, items.length > 1)}
                            title={`${studentName(l.student)} · ${l.teacher?.name} · ${
                              LESSON_STATUS_LABEL[l.status]
                            }`}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {studentName(l.student)}
                              {l.type === "MAKEUP" && " ↻"}
                            </div>
                            <div style={{ opacity: 0.85, fontSize: 11 }}>
                              {l.teacher?.name}
                            </div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Space style={{ marginTop: 12 }} wrap size={4}>
        {Object.entries(LESSON_STATUS_LABEL)
          .filter(([k]) => !["MOVED", "CANCELLED"].includes(k))
          .map(([k, v]) => {
            const soft = LESSON_STATUS_SOFT[k];
            return (
              <Tag
                key={k}
                style={{
                  background: soft.bg,
                  borderColor: soft.border,
                  color: soft.text,
                }}
              >
                {v}
              </Tag>
            );
          })}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          ↻ = нөхөх хичээл · товлогдсон хичээлийг чирж зөөнө
          {view === "week" && " (7 хоногийн харагдацад өрөө сонгосон үед)"}
        </Typography.Text>
      </Space>

      <LessonDrawer lessonId={openLesson} onClose={() => setOpenLesson(null)} />
      <LessonCreateDrawer
        target={createTarget}
        onClose={() => setCreateTarget(null)}
      />
    </div>
  );
}

const th = (w?: number): React.CSSProperties => ({
  border: "1px solid #f0f0f0",
  background: "#fafafa",
  padding: "8px 6px",
  fontSize: 13,
  width: w,
  position: "sticky",
  top: 0,
  zIndex: 1,
});

const td: React.CSSProperties = {
  border: "1px solid #f0f0f0",
  padding: 3,
  height: CELL_H,
  verticalAlign: "top",
};

const timeCell: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
  whiteSpace: "nowrap",
  textAlign: "center",
  background: "#fafafa",
};

const chip = (l: any, conflict: boolean): React.CSSProperties => {
  const soft = LESSON_STATUS_SOFT[l.status] || LESSON_STATUS_SOFT.SCHEDULED;
  return {
    background: soft.bg,
    color: soft.text,
    borderRadius: 4,
    padding: "3px 6px",
    fontSize: 12,
    lineHeight: 1.25,
    cursor: "pointer",
    marginBottom: 2,
    border: conflict ? "1.5px solid #ef4444" : `1px solid ${soft.border}`,
  };
};
