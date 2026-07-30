"use client";

import AppointmentCreateModal from "@/components/AppointmentCreateModal";
import AppointmentDetailDrawer from "@/components/AppointmentDetailDrawer";
import GroupBookingModal from "@/components/GroupBookingModal";
import { api } from "@/lib/api";
import { STATUS_COLOR } from "@/lib/labels";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, DatePicker, Space, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useRef, useState } from "react";

const LICENSE =
  process.env.NEXT_PUBLIC_FULLCALENDAR_LICENSE ||
  "CC-Attribution-NonCommercial-NoDerivatives";

const MN_LOCALE = {
  code: "mn",
  week: { dow: 1, doy: 4 },
  buttonText: {
    prev: "Өмнөх",
    next: "Дараах",
    today: "Өнөөдөр",
    day: "Өдөр",
    week: "7 хоног",
  },
  weekText: "7х",
  allDayText: "Өдөржин",
  moreLinkText: (n: number) => `+${n} нэмэлт`,
  noEventsText: "Захиалга алга",
};

// Минут → "HH:MM:SS"
const minToTime = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

export default function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [date, setDate] = useState(() => dayjs().startOf("day"));
  // Харагдаж буй мужаар өгөгдөл татна (өдөр/7 хоног аль ч view-д зөв)
  const [range, setRange] = useState(() => ({
    from: dayjs().startOf("day").toISOString(),
    to: dayjs().endOf("day").toISOString(),
  }));

  // Захиалга үүсгэх modal (хоосон нүд дарсан ор + цаг)
  const [newSlot, setNewSlot] = useState<{
    bedId: string;
    bedName: string;
    startAt: Date;
  } | null>(null);
  // Дэлгэрэнгүй drawer (event дарсан)
  const [detailId, setDetailId] = useState<string | null>(null);
  // Бүлгээр (тур оператор) захиалах modal
  const [groupOpen, setGroupOpen] = useState(false);

  const { data: setting } = useQuery({
    queryKey: ["setting"],
    queryFn: async () => (await api.get("/setting")).data,
  });

  const { data: beds, isLoading: bedsLoading } = useQuery({
    queryKey: ["beds-all"],
    queryFn: async () =>
      (await api.get("/bed", { params: { limit: 500 } })).data.rows,
  });

  const { data: appointments, isLoading: apptLoading } = useQuery({
    queryKey: ["appointments-calendar", range.from, range.to],
    queryFn: async () =>
      (
        await api.get("/appointment/calendar", {
          params: { from: range.from, to: range.to },
        })
      ).data.rows,
  });

  const resources = useMemo(
    () =>
      (beds || []).map((b: any) => ({
        id: b._id,
        title: b.name,
        room: b.room?.name || "Өрөө",
      })),
    [beds],
  );

  const events = useMemo(
    () =>
      (appointments || []).map((a: any) => ({
        id: a._id,
        resourceId: typeof a.bed === "object" ? a.bed._id : a.bed,
        title: `${a.customer?.firstName || ""} · ${a.serviceName || ""}`,
        start: a.startAt,
        end: a.endAt,
        backgroundColor: STATUS_COLOR[a.status] || "#3b82f6",
        borderColor: STATUS_COLOR[a.status] || "#3b82f6",
        extendedProps: { therapist: a.therapist?.name || "" },
      })),
    [appointments],
  );

  const slotMin = setting ? minToTime(setting.openMinute) : "09:00:00";
  const slotMax = setting ? minToTime(setting.closeMinute) : "22:00:00";
  const slotDuration = setting ? minToTime(setting.slotMinutes) : "00:15:00";

  return (
    <div>
      <Typography.Title level={3}>Цаг захиалгын календарь</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">Огноо:</Typography.Text>
        <DatePicker
          value={date}
          allowClear={false}
          format="YYYY-MM-DD"
          onChange={(d) =>
            d && calendarRef.current?.getApi().gotoDate(d.toDate())
          }
        />
        <Button type="primary" onClick={() => setGroupOpen(true)}>
          Бүлгээр захиалах
        </Button>
      </Space>
      <Card styles={{ body: { padding: 12 } }}>
        {bedsLoading || apptLoading ? (
          <Spin />
        ) : (
          <FullCalendar
            ref={calendarRef}
            schedulerLicenseKey={LICENSE}
            plugins={[resourceTimelinePlugin, interactionPlugin]}
            initialView="resourceTimelineDay"
            initialDate={date.toDate()}
            // headerToolbar={{
            //   left: "prev,next today",
            //   center: "title",
            //   right: "resourceTimelineDay,resourceTimelineWeek",
            // }}
            locale={MN_LOCALE}
            titleFormat={(arg) => {
              const fmt = (m: { year: number; month: number; day: number }) =>
                `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(
                  m.day,
                ).padStart(2, "0")}`;
              if (arg.end) {
                return `${fmt(arg.start)} — ${dayjs(arg.end.marker)
                  .subtract(1, "day")
                  .format("YYYY-MM-DD")}`;
              }
              return fmt(arg.date);
            }}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            resourceGroupField="room"
            resourceAreaHeaderContent="Ор"
            resources={resources}
            events={events}
            eventContent={(arg) => {
              const t = arg.event.extendedProps.therapist as string;
              return (
                <div
                  style={{
                    padding: "1px 4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    lineHeight: 1.3,
                  }}
                >
                  <b>{dayjs(arg.event.start).format("HH:mm")}</b>{" "}
                  {arg.event.title}
                  {t ? ` · 👤${t}` : ""}
                </div>
              );
            }}
            slotMinTime={slotMin}
            slotMaxTime={slotMax}
            slotDuration={slotDuration}
            nowIndicator
            height="calc(100vh - 300px)"
            selectable
            dateClick={(arg) => {
              const resource = arg.resource;
              if (!resource) return;
              setNewSlot({
                bedId: resource.id,
                bedName: resource.title,
                startAt: arg.date,
              });
            }}
            eventClick={(arg) => setDetailId(arg.event.id)}
            datesSet={(arg) => {
              setRange({
                from: arg.start.toISOString(),
                to: arg.end.toISOString(),
              });
              const newDate = dayjs(arg.start);
              if (!newDate.isSame(date, "day")) setDate(newDate.startOf("day"));
            }}
          />
        )}
      </Card>

      <AppointmentCreateModal
        open={!!newSlot}
        bedId={newSlot?.bedId || null}
        bedName={newSlot?.bedName}
        startAt={newSlot?.startAt || null}
        onClose={() => setNewSlot(null)}
      />

      <GroupBookingModal
        open={groupOpen}
        defaultDate={date}
        onClose={() => setGroupOpen(false)}
      />

      <AppointmentDetailDrawer
        appointmentId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
