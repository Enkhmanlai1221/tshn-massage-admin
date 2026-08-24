"use client";

import { useState } from "react";
import { App, Alert, Card, Select, Space, Spin, Tag, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTeachers } from "@/lib/hooks";
import { LESSON_STATUS_LABEL, LESSON_STATUS_SOFT, studentName } from "@/lib/labels";

/**
 * 7 ХОНОГИЙН ХАРАГДАЦ — ЦАГ × ГАРАГ.
 *
 * Тогтмол хуваарь долоо хоногоор давтагддаг тул сул цаг олох, багшийн
 * ачаалал харахад энэ харагдац хамгийн тохиромжтой.
 *
 * Чирж зөөх нь ЗӨВХӨН нэг өрөө сонгосон үед идэвхжинэ — эс тэгвээс нүд
 * аль өрөөг заасан нь тодорхойгүй болно.
 */
export default function WeekCalendar({
  date,
  onOpenLesson,
}: {
  date: string;
  onOpenLesson: (id: string) => void;
}) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: teachers } = useTeachers();

  const [teacher, setTeacher] = useState<string | undefined>();
  const [room, setRoom] = useState<string | undefined>();
  const [dragging, setDragging] = useState<any | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", "week", date, teacher, room],
    queryFn: async () =>
      (await api.get("/calendar/week", { params: { date, teacher, room } })).data,
  });

  const move = useMutation({
    mutationFn: async (p: { id: string; date: string; slotIndex: number }) =>
      api.patch(`/lesson/${p.id}/move`, { date: p.date, slotIndex: p.slotIndex }),
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

  // "огноо#цаг" → хичээлүүд
  const byCell = new Map<string, any[]>();
  for (const l of data?.lessons || []) {
    const key = `${l.date}#${l.slotIndex}`;
    byCell.set(key, [...(byCell.get(key) || []), l]);
  }

  /**
   * Нэг нүдэнд олон хичээл байх нь ХЭВИЙН — өөр өрөөнүүдэд зэрэг хичээл
   * ордог. Жинхэнэ давхцал бол нэг нүдэнд ижил ӨРӨӨ, ижил БАГШ эсвэл ижил
   * СУРАГЧ давтагдах явдал.
   */
  const conflictIds = new Set<string>();
  for (const items of byCell.values()) {
    if (items.length < 2) continue;
    for (const field of ["room", "teacher", "student"] as const) {
      const seen = new Map<string, any[]>();
      for (const l of items) {
        const id = String(l[field]?._id ?? l[field] ?? "");
        if (!id) continue;
        seen.set(id, [...(seen.get(id) || []), l]);
      }
      for (const group of seen.values()) {
        if (group.length > 1) group.forEach((l) => conflictIds.add(l._id));
      }
    }
  }
  // Чөлөөтэй багш өдрөөр
  const leaveByDate = new Map<string, any[]>();
  for (const lv of data?.leaves || []) {
    for (const d of data.days) {
      if (lv.dateFrom <= d.date && d.date <= lv.dateTo) {
        leaveByDate.set(d.date, [...(leaveByDate.get(d.date) || []), lv]);
      }
    }
  }

  const canDrag = can("LESSON", "isEdit") && !!room;

  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      <Space wrap style={{ marginBottom: 12, display: "flex" }}>
        <Select
          allowClear
          placeholder="Багш"
          style={{ width: 180 }}
          value={teacher}
          onChange={setTeacher}
          options={(teachers || []).map((t: any) => ({
            value: t._id,
            label: t.name,
          }))}
        />
        <Select
          allowClear
          placeholder="Өрөө"
          style={{ width: 150 }}
          value={room}
          onChange={setRoom}
          options={(data?.rooms || []).map((r: any) => ({
            value: r._id,
            label: r.name,
          }))}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {data ? `${data.from} — ${data.to} · ${data.lessons.length} хичээл` : ""}
        </Typography.Text>
        {canDrag ? (
          <Tag color="blue">Чирж зөөх боломжтой</Tag>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Зөөхийн тулд өрөө сонгоно уу
          </Typography.Text>
        )}
      </Space>

      {isLoading ? (
        <Spin />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 88 }}>Цаг</th>
                {(data?.days || []).map((d: any) => (
                  <th
                    key={d.date}
                    style={{
                      ...th,
                      background: d.isToday ? "#e6f4ff" : "#fafafa",
                      opacity: d.isWorkingDay ? 1 : 0.5,
                    }}
                  >
                    <div>{d.label}</div>
                    <div style={{ fontWeight: 400, fontSize: 11, color: "#888" }}>
                      {d.date.slice(5)}
                    </div>
                    {leaveByDate.get(d.date)?.length ? (
                      <div style={{ fontSize: 10, color: "#a855f7" }}>
                        {leaveByDate
                          .get(d.date)!
                          .map((l: any) => l.teacher?.name)
                          .join(", ")}{" "}
                        чөлөөтэй
                      </div>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.slots || []).map((slot: any) => (
                <tr key={slot.index}>
                  <td style={{ ...td, ...timeCell }}>{slot.label}</td>
                  {(data?.days || []).map((d: any) => {
                    const key = `${d.date}#${slot.index}`;
                    const items = byCell.get(key) || [];
                    const isHover = hover === key && dragging;
                    return (
                      <td
                        key={d.date}
                        style={{
                          ...td,
                          background: isHover
                            ? "#e6f4ff"
                            : d.isWorkingDay
                              ? undefined
                              : "#fafafa",
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
                              id: dragging._id,
                              date: d.date,
                              slotIndex: slot.index,
                            });
                            setDragging(null);
                          }
                        }}
                      >
                        {items.map((l) => (
                          <div
                            key={l._id}
                            draggable={canDrag && l.status === "SCHEDULED"}
                            onDragStart={() => setDragging(l)}
                            onDragEnd={() => {
                              setDragging(null);
                              setHover(null);
                            }}
                            onClick={() => onOpenLesson(l._id)}
                            style={chip(l, conflictIds.has(l._id))}
                            title={`${studentName(l.student)} · ${l.teacher?.name} · ${
                              l.room?.name
                            } · ${LESSON_STATUS_LABEL[l.status]}`}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {studentName(l.student)}
                              {l.type === "MAKEUP" && " ↻"}
                            </div>
                            <div style={{ opacity: 0.85, fontSize: 10 }}>
                              {l.teacher?.name}
                              {!room && ` · ${l.room?.name}`}
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
        </div>
      )}

      {data?.lessons?.length === 0 && (
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          message="Энэ 7 хоногт хичээл алга"
        />
      )}
    </Card>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #f0f0f0",
  background: "#fafafa",
  padding: "6px 4px",
  fontSize: 12,
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const td: React.CSSProperties = {
  border: "1px solid #f0f0f0",
  padding: 2,
  height: 40,
  verticalAlign: "top",
};

const timeCell: React.CSSProperties = {
  fontSize: 11,
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
    borderRadius: 3,
    padding: "2px 4px",
    fontSize: 11,
    lineHeight: 1.2,
    cursor: "pointer",
    marginBottom: 2,
    border: conflict ? "1.5px solid #ef4444" : `1px solid ${soft.border}`,
  };
};
