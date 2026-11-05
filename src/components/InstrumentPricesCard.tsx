"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, InputNumber, Table, Tag, Typography } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInstruments } from "@/lib/hooks";
import { money } from "@/lib/labels";

/** Үнийг «8 оролт = …» гэж харуулах багц. */
const PACK = 8;

const MoneyInput = (props: any) => (
  <InputNumber
    min={0}
    step={500}
    style={{ width: 130 }}
    formatter={(v) => (v == null || v === "" ? "" : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","))}
    parser={(v) => (v ? (Number(`${v}`.replace(/,/g, "")) as any) : null)}
    {...props}
  />
);

/**
 * ХӨГЖИМ БҮРИЙН ҮНЭ — сурагчийн нэг оролтын үнэ (ганцаарчилсан / групп).
 *
 * Хоосон бол дээрх ерөнхий үнээр төлнө. Хадгалахад `Instrument`-ийн
 * `lessonPrice` / `groupLessonPrice` шинэчлэгдэнэ (Хөгжим хуудастай ижил).
 */
export default function InstrumentPricesCard({ generalPrice }: { generalPrice: number }) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: instruments, isLoading } = useInstruments();
  const editable = can("INSTRUMENT", "isEdit");

  // Мөр бүрийн засаж буй утга: { [id]: { lessonPrice, groupLessonPrice } }
  const [draft, setDraft] = useState<Record<string, { lessonPrice: number | null; groupLessonPrice: number | null }>>({});
  useEffect(() => {
    const next: typeof draft = {};
    for (const i of instruments || []) {
      next[i._id] = { lessonPrice: i.lessonPrice ?? null, groupLessonPrice: i.groupLessonPrice ?? null };
    }
    setDraft(next);
  }, [instruments]);

  const save = useMutation({
    mutationFn: async (id: string) =>
      api.put(`/instrument/${id}`, {
        lessonPrice: draft[id]?.lessonPrice || null,
        groupLessonPrice: draft[id]?.groupLessonPrice || null,
      }),
    onSuccess: () => {
      message.success("Үнэ хадгалагдлаа.");
      qc.invalidateQueries({ queryKey: ["instruments"] });
      qc.invalidateQueries({ queryKey: ["payment-pricing"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const rows = (instruments || []).filter((i: any) => i.isActive !== false);
  const pack = (n: number | null | undefined) => (n ? money(n * PACK) : null);

  return (
    <Card size="small" title="Хөгжим бүрийн үнэ" style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 0 }}>
        Нэг оролтын үнэ. Хоосон бол ерөнхий үнээр ({money(generalPrice)}, {PACK} оролт ={" "}
        {money(generalPrice * PACK)}) төлнө. Групп хоосон бол ганцаарчилсан үнээр.
      </Typography.Paragraph>
      <Table
        size="small"
        rowKey="_id"
        loading={isLoading}
        pagination={false}
        dataSource={rows}
        columns={[
          {
            title: "Хөгжим",
            dataIndex: "name",
            render: (v, r: any) => <Tag color={r.color || "default"}>{v}</Tag>,
          },
          {
            title: "Ганцаарчилсан (1 оролт)",
            key: "lessonPrice",
            render: (_, r: any) => (
              <div>
                <MoneyInput
                  disabled={!editable}
                  placeholder="Ерөнхий үнэ"
                  value={draft[r._id]?.lessonPrice}
                  onChange={(v: number | null) =>
                    setDraft((d) => ({ ...d, [r._id]: { ...d[r._id], lessonPrice: v } }))
                  }
                />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {PACK} оролт = {pack(draft[r._id]?.lessonPrice) ?? money(generalPrice * PACK)}
                </div>
              </div>
            ),
          },
          {
            title: "Групп (1 оролт)",
            key: "groupLessonPrice",
            render: (_, r: any) => (
              <div>
                <MoneyInput
                  disabled={!editable}
                  placeholder="Ганцаарчилсантай адил"
                  value={draft[r._id]?.groupLessonPrice}
                  onChange={(v: number | null) =>
                    setDraft((d) => ({ ...d, [r._id]: { ...d[r._id], groupLessonPrice: v } }))
                  }
                />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {pack(draft[r._id]?.groupLessonPrice) ? `${PACK} оролт = ${pack(draft[r._id]?.groupLessonPrice)}` : "—"}
                </div>
              </div>
            ),
          },
          {
            title: "",
            key: "act",
            width: 100,
            render: (_, r: any) => {
              const d = draft[r._id];
              const changed =
                (d?.lessonPrice ?? null) !== (r.lessonPrice ?? null) ||
                (d?.groupLessonPrice ?? null) !== (r.groupLessonPrice ?? null);
              return editable ? (
                <Button
                  size="small"
                  type={changed ? "primary" : "default"}
                  disabled={!changed}
                  loading={save.isPending && save.variables === r._id}
                  onClick={() => save.mutate(r._id)}
                >
                  Хадгалах
                </Button>
              ) : null;
            },
          },
        ]}
      />
    </Card>
  );
}
