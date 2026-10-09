"use client";

/**
 * 7 ХОНОГИЙН ЦАГ СОНГОГЧ — багш хуваарь тогтоох хамгийн хялбар арга.
 *
 * Мөр = цаг, багана = гараг. Сул нүд цагаан, завгүй нүд саарал (дарагдахгүй),
 * сонгосон нүд ягаан ✓. Нэг харцаар «хаана сул байна» гэдгийг харж, нүдэн
 * дээр дарахад л болно — dropdown сонгох шаардлагагүй.
 *
 * Өрөө сонгохгүй — хичээл үүсэх мөчид сул өрөө автоматаар оноогдоно.
 */
export interface WeekSlot {
  weekday: number;
  slotIndex: number;
}

/** Даваагаас эхэлсэн дараалал (0 = Ням-ийг төгсгөлд). */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

const key = (w: number, s: number) => `${w}#${s}`;

export default function WeekSlotPicker({
  workingDays,
  slots,
  available,
  value,
  onChange,
  max = 7,
}: {
  workingDays: number[];
  slots: { index: number; label: string }[];
  /** Сул гараг × цаг (сервер `/student/options`-оос). */
  available: { weekday: number; slotIndex: number }[];
  value: WeekSlot[];
  onChange: (v: WeekSlot[]) => void;
  max?: number;
}) {
  const days = ORDER.filter((d) => workingDays.includes(d));
  const free = new Set(available.map((a) => key(a.weekday, a.slotIndex)));
  const picked = new Set(value.map((v) => key(v.weekday, v.slotIndex)));

  const toggle = (weekday: number, slotIndex: number) => {
    const k = key(weekday, slotIndex);
    if (picked.has(k)) {
      onChange(value.filter((v) => key(v.weekday, v.slotIndex) !== k));
    } else if (value.length < max) {
      onChange(
        [...value, { weekday, slotIndex }].sort(
          (a, b) =>
            ORDER.indexOf(a.weekday) - ORDER.indexOf(b.weekday) ||
            a.slotIndex - b.slotIndex,
        ),
      );
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `44px repeat(${days.length}, minmax(34px, 1fr))`,
          gap: 3,
          fontSize: 11,
          minWidth: 44 + days.length * 37,
        }}
      >
        <div />
        {days.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontWeight: 600,
              color: d === 0 || d === 6 ? "#b45309" : "#374151",
              padding: "4px 0",
              position: "sticky",
              top: 0,
              background: "#fff",
            }}
          >
            {SHORT[d]}
          </div>
        ))}

        {slots.map((s) => (
          <Row
            key={s.index}
            label={s.label.split(/[–-]/)[0]}
            days={days}
            slotIndex={s.index}
            free={free}
            picked={picked}
            onToggle={toggle}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          fontSize: 11,
          color: "#6b7280",
          flexWrap: "wrap",
        }}
      >
        <Legend bg="#fff" border="#d1d5db" text="Сул" />
        <Legend bg="#7c3aed" border="#7c3aed" text="Сонгосон" />
        <Legend bg="#f3f4f6" border="#f3f4f6" text="Завгүй" />
      </div>
    </div>
  );
}

function Row({
  label,
  days,
  slotIndex,
  free,
  picked,
  onToggle,
}: {
  label: string;
  days: number[];
  slotIndex: number;
  free: Set<string>;
  picked: Set<string>;
  onToggle: (w: number, s: number) => void;
}) {
  return (
    <>
      <div
        style={{
          textAlign: "right",
          paddingRight: 4,
          color: "#6b7280",
          alignSelf: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {label}
      </div>
      {days.map((d) => {
        const k = key(d, slotIndex);
        const on = picked.has(k);
        const ok = on || free.has(k);
        return (
          <button
            key={d}
            type="button"
            disabled={!ok}
            onClick={() => onToggle(d, slotIndex)}
            aria-label={`${SHORT[d]} ${label}${on ? " сонгосон" : ok ? " сул" : " завгүй"}`}
            aria-pressed={on}
            style={{
              height: 32,
              borderRadius: 6,
              border: `1px solid ${on ? "#7c3aed" : ok ? "#d1d5db" : "#f3f4f6"}`,
              background: on ? "#7c3aed" : ok ? "#fff" : "#f3f4f6",
              color: on ? "#fff" : "#9ca3af",
              cursor: ok ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 700,
              padding: 0,
            }}
          >
            {on ? "✓" : ""}
          </button>
        );
      })}
    </>
  );
}

function Legend({ bg, border, text }: { bg: string; border: string; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: bg,
          border: `1px solid ${border}`,
        }}
      />
      {text}
    </span>
  );
}
