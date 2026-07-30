import { Tag } from "antd";

// Захиалгын төлөв — монгол шошго + өнгө (нэг эх сурвалж)
export const STATUS_LABEL: Record<string, string> = {
  BOOKED: "Захиалсан",
  CONFIRMED: "Баталгаажсан",
  COMPLETED: "Дууссан",
  CANCELED: "Цуцалсан",
  NO_SHOW: "Ирээгүй",
};

export const STATUS_COLOR: Record<string, string> = {
  BOOKED: "#3b82f6",
  CONFIRMED: "#8b5cf6",
  COMPLETED: "#22c55e",
  CANCELED: "#ef4444",
  NO_SHOW: "#a1a1aa",
};

// Төлбөрийн арга — монгол шошго + өнгө
export const METHOD_LABEL: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
};

export const METHOD_COLOR: Record<string, string> = {
  CASH: "#22c55e",
  CARD: "#3b82f6",
};

export function StatusTag({ status }: { status?: string }) {
  if (!status) return <Tag>—</Tag>;
  return (
    <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status] || status}</Tag>
  );
}

export function MethodTag({ method }: { method?: string }) {
  if (!method) return <Tag>—</Tag>;
  return (
    <Tag color={METHOD_COLOR[method]}>{METHOD_LABEL[method] || method}</Tag>
  );
}
