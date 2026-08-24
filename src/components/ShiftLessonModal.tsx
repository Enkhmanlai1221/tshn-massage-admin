"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Empty,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";
import { minuteLabel, studentName } from "@/lib/labels";

/** Түгээмэл шалтгаанууд — нэг товшилтоор бөглөнө. */
const REASONS = [
  "Сурагч хоцорсон",
  "Сурагч эрт ирсэн",
  "Сурагчийн хүсэлт",
  "Багшийн хүсэлт",
];

export interface ShiftOption {
  date: string;
  slotIndex: number;
  startMinute: number;
  endMinute: number;
  timeLabel: string;
  direction: "EARLIER" | "LATER";
  rooms: { _id: string; name: string }[];
  keepsRoom: boolean;
}

/**
 * Хичээлийг ТУХАЙН ӨДРИЙН дотор урагш / хойш зөөх модал.
 *
 * Багш, админ хоёрын API зам өөр ч урсгал ижил тул нэг компонент:
 *   teacher → GET  /schedule/:id/shift-options,  PATCH /schedule/:id/shift
 *   admin   → GET  /lesson/:id/shift-options,    PATCH /lesson/:id/move
 *
 * Хичээл байрандаа шинэчлэгддэг (шинэ бичлэг үүсэхгүй) тул сурагч зөөсөн
 * цагтаа орвол ердийн журмаар «Ирсэн» гэж бүртгэгдэж, цалин БҮТНЭЭР тооцогдоно.
 */
export default function ShiftLessonModal({
  lesson,
  mode,
  open,
  onClose,
}: {
  lesson: any;
  mode: "teacher" | "admin";
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<number | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const isTeacher = mode === "teacher";
  const client = isTeacher ? teacherApi : api;
  const errorOf = isTeacher ? teacherApiError : apiError;
  const base = isTeacher ? "/schedule" : "/lesson";

  useEffect(() => {
    if (open) {
      setPicked(null);
      setRoom(null);
      setReason("");
    }
  }, [open, lesson?._id]);

  const { data, isLoading } = useQuery({
    queryKey: ["shift-options", mode, lesson?._id],
    queryFn: async () =>
      (await client.get(`${base}/${lesson._id}/shift-options`)).data
        .rows as ShiftOption[],
    enabled: open && !!lesson?._id,
  });

  const options = data || [];
  const selected = options.find((o) => o.slotIndex === picked) || null;
  const currentRoom = String(lesson?.room?._id ?? lesson?.room ?? "");

  /** Цаг сонгоход өрөөг автоматаар тохируулна — боломжтой бол хэвээр. */
  const pick = (option: ShiftOption) => {
    setPicked(option.slotIndex);
    setRoom(
      option.keepsRoom
        ? currentRoom
        : (option.rooms[0]?._id ?? null),
    );
  };

  const shift = useMutation({
    mutationFn: async () => {
      const body = { slotIndex: picked, room, reason: reason.trim() || null };
      return isTeacher
        ? teacherApi.patch(`/schedule/${lesson._id}/shift`, body)
        : api.patch(`/lesson/${lesson._id}/move`, body);
    },
    onSuccess: (res) => {
      message.success(res.data.message, 4);
      for (const key of [
        "teacher-schedule",
        "calendar",
        "lesson",
        "attendance",
        "shift-options",
      ]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      onClose();
    },
    onError: (e) => message.error(errorOf(e), 5),
  });

  return (
    <Modal
      title="Цаг зөөх"
      open={open}
      onCancel={onClose}
      // Гар утсанд доороос гарах "sheet" — эрхий хуруунд ойр.
      className="sheet-modal"
      wrapClassName="sheet-modal-wrap"
      width={420}
      style={{ maxWidth: "calc(100vw - 16px)" }}
      footer={
        <div style={{ display: "flex", gap: 8 }}>
          <Button className="touch-btn" style={{ flex: 1 }} onClick={onClose}>
            Болих
          </Button>
          <Button
            type="primary"
            className="touch-btn"
            style={{ flex: 2 }}
            disabled={picked === null}
            loading={shift.isPending}
            onClick={() => shift.mutate()}
          >
            {selected ? `${selected.timeLabel} руу зөөх` : "Зөөх"}
          </Button>
        </div>
      }
    >
      {/* Одоогийн байрлал — нэг мөрөнд нягт. */}
      <div style={{ marginBottom: 10, lineHeight: 1.4 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>
          {studentName(lesson?.student)}
        </div>
        <div style={{ fontSize: 13, color: "#888" }}>
          <b>
            {minuteLabel(lesson?.startMinute ?? 0)}–
            {minuteLabel(lesson?.endMinute ?? 0)}
          </b>{" "}
          · {lesson?.room?.name} · {lesson?.date?.slice(5)}
        </div>
      </div>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, display: "block", marginBottom: 10 }}
      >
        Зөөсөн цагтаа орвол хичээл <b>бүтэн орсонд</b> тооцогдоно.
      </Typography.Text>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : options.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Энэ өдөр сул цаг алга"
        />
      ) : (
        <div
          style={{
            maxHeight: "min(46vh, 320px)",
            overflowY: "auto",
            marginBottom: 12,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {options.map((o) => {
            const on = o.slotIndex === picked;
            return (
              <div
                key={o.slotIndex}
                onClick={() => pick(o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 52,
                  padding: "10px 12px",
                  marginBottom: 6,
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1.5px solid ${on ? "#7c3aed" : "#f0f0f0"}`,
                  background: on ? "#f5f0ff" : "#fff",
                }}
              >
                {o.direction === "EARLIER" ? (
                  <ArrowUpOutlined style={{ color: "#52c41a" }} />
                ) : (
                  <ArrowDownOutlined style={{ color: "#fa8c16" }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  {o.timeLabel}
                </span>
                <Tag color={o.direction === "EARLIER" ? "green" : "orange"}>
                  {o.direction === "EARLIER" ? "урагш" : "хойш"}
                </Tag>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: "#999",
                    maxWidth: "38%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {o.keepsRoom
                    ? lesson?.room?.name
                    : `${o.rooms.length} өрөө сул`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {selected && !selected.keepsRoom && (
        <Space direction="vertical" style={{ width: "100%", marginBottom: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {lesson?.room?.name} тэр цагт завгүй — өөр өрөө сонгоно уу:
          </Typography.Text>
          <Select
            size="large"
            style={{ width: "100%" }}
            value={room}
            onChange={setRoom}
            options={selected.rooms.map((r) => ({
              value: r._id,
              label: r.name,
            }))}
          />
        </Space>
      )}

      <Input
        size="large"
        placeholder="Шалтгаан (заавал биш)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
      />
      <Space size={6} wrap style={{ marginTop: 8 }}>
        {REASONS.map((r) => (
          <Tag
            key={r}
            style={{
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 13,
              lineHeight: "18px",
              marginInlineEnd: 0,
            }}
            color={reason === r ? "purple" : undefined}
            onClick={() => setReason(reason === r ? "" : r)}
          >
            {r}
          </Tag>
        ))}
      </Space>
    </Modal>
  );
}
