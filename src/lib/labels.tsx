import { Tag } from "antd";

/** Хичээлийн төлөв — монгол шошго + өнгө (backend-ийн LESSON.ts-тэй нэг эх сурвалж). */
export const LESSON_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Товлогдсон",
  ATTENDED: "Ирсэн",
  ABSENT: "Тасалсан",
  EXCUSED: "Чөлөөтэй",
  TEACHER_LEAVE: "Багш чөлөөтэй",
  MOVED: "Зөөгдсөн",
  CANCELLED: "Цуцалсан",
};

export const LESSON_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "#3b82f6",
  ATTENDED: "#22c55e",
  ABSENT: "#ef4444",
  EXCUSED: "#f59e0b",
  TEACHER_LEAVE: "#a855f7",
  MOVED: "#a1a1aa",
  CANCELLED: "#71717a",
};

/**
 * Календарын нүднүүдэд зориулсан зөөлөн өнгө — товлогдсон (ирээгүй) хичээл
 * бодитоор болсон хичээлтэй ижил түвшний "тод" харагдвал андуурна.
 */
export const LESSON_STATUS_SOFT: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  SCHEDULED: { bg: "#e6f4ff", border: "#91caff", text: "#1554ad" },
  ATTENDED: { bg: "#f6ffed", border: "#b7eb8f", text: "#237804" },
  ABSENT: { bg: "#fff1f0", border: "#ffa39e", text: "#a8071a" },
  EXCUSED: { bg: "#fff7e6", border: "#ffd591", text: "#ad6800" },
  TEACHER_LEAVE: { bg: "#f9f0ff", border: "#d3adf7", text: "#6d24b3" },
  MOVED: { bg: "#fafafa", border: "#d9d9d9", text: "#595959" },
  CANCELLED: { bg: "#fafafa", border: "#d9d9d9", text: "#8c8c8c" },
};

export const LESSON_TYPE_LABEL: Record<string, string> = {
  REGULAR: "Ердийн",
  MAKEUP: "Нөхөх",
  TRIAL: "Туршилт",
};

export const STUDENT_LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Эхлэн суралцагч",
  INTERMEDIATE: "Дунд",
  ADVANCED: "Ахисан",
};

export const STUDENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Идэвхтэй",
  PAUSED: "Завсарласан",
  LEFT: "Гарсан",
};

export const STUDENT_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "green",
  PAUSED: "orange",
  LEFT: "default",
};

export const GENDER_LABEL: Record<string, string> = {
  MALE: "Эрэгтэй",
  FEMALE: "Эмэгтэй",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: "Төлсөн",
  UNPAID: "Төлөөгүй",
};

export const SALARY_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Ноорог",
  PAID: "Олгосон",
};

export const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Идэвхтэй",
  PAUSED: "Түр зогссон",
  ENDED: "Дууссан",
};

/** 0=Ням ... 6=Бямба */
export const WEEKDAY_LABEL = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];
export const WEEKDAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

export const money = (n?: number | null) =>
  `${(n ?? 0).toLocaleString("mn-MN")}₮`;

/** 555 → "09:15" */
export const minuteLabel = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function LessonStatusTag({ status }: { status?: string }) {
  if (!status) return <Tag>—</Tag>;
  return (
    <Tag color={LESSON_STATUS_COLOR[status]}>
      {LESSON_STATUS_LABEL[status] || status}
    </Tag>
  );
}

export function StudentStatusTag({ status }: { status?: string }) {
  if (!status) return <Tag>—</Tag>;
  return (
    <Tag color={STUDENT_STATUS_COLOR[status]}>
      {STUDENT_STATUS_LABEL[status] || status}
    </Tag>
  );
}

export const studentName = (s: any) =>
  s ? [s.lastName, s.firstName].filter(Boolean).join(" ") : "—";
