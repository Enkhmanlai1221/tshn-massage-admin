"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, InputNumber, Space, Table, Tag, Typography } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInstruments } from "@/lib/hooks";
import { money } from "@/lib/labels";

/** 1 сарын оролт — «8 оролт = …» гэж харуулахад. */
const PACK = 8;

type Tier = { months: number | null; monthPrice: number | null };
type Draft = { lessonPrice: number | null; groupLessonPrice: number | null; monthTiers: Tier[] };

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

const toDraft = (i: any): Draft => ({
  lessonPrice: i.lessonPrice ?? null,
  groupLessonPrice: i.groupLessonPrice ?? null,
  monthTiers: (i.monthTiers ?? []).map((t: any) => ({ months: t.months, monthPrice: t.monthPrice })),
});

const cleanTiers = (tiers: Tier[]) =>
  tiers
    .filter((t) => t.months && t.months >= 2 && t.monthPrice)
    .map((t) => ({ months: Number(t.months), monthPrice: Number(t.monthPrice) }))
    .sort((a, b) => a.months - b.months);

/**
 * ХӨГЖИМ БҮРИЙН ҮНЭ — сурагчийн нэг оролтын үнэ (ганцаарчилсан / групп) ба
 * олон сарын хямдрал.
 *
 * Хоосон бол дээрх ерөнхий үнээр (ерөнхий хямдралтай) төлнө. Хадгалахад
 * `Instrument`-ийн `lessonPrice` / `groupLessonPrice` / `monthTiers` шинэчлэгдэнэ.
 * Олон сарын хямдрал зөвхөн ганцаарчилсан үнэд хамаарна.
 */
export default function InstrumentPricesCard({ generalPrice }: { generalPrice: number }) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: instruments, isLoading } = useInstruments();
  const editable = can("INSTRUMENT", "isEdit");

  const [draft, setDraft] = useState<Record<string, Draft>>({});
  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const i of instruments || []) next[i._id] = toDraft(i);
    setDraft(next);
  }, [instruments]);

  const patch = (id: string, p: Partial<Draft>) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...p } }));

  const save = useMutation({
    mutationFn: async (id: string) =>
      api.put(`/instrument/${id}`, {
        lessonPrice: draft[id]?.lessonPrice || null,
        groupLessonPrice: draft[id]?.groupLessonPrice || null,
        monthTiers: cleanTiers(draft[id]?.monthTiers ?? []),
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
        Нэг оролтын үнэ. Хоосон бол ерөнхий үнээр ({money(generalPrice)}, 1 сар ={" "}
        {money(generalPrice * PACK)}) төлнө. Групп хоосон бол ганцаарчилсан үнээр. Олон сарын
        хямдрал ганцаарчилсан үнэд хамаарна: N сараас дээш нэг дор төлбөл тэр сарын үнээр.
      </Typography.Paragraph>
      <Table
        size="small"
        rowKey="_id"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 900 }}
        dataSource={rows}
        columns={[
          {
            title: "Хөгжим",
            dataIndex: "name",
            width: 120,
            render: (v, r: any) => <Tag color={r.color || "default"}>{v}</Tag>,
          },
          {
            title: "Ганцаарчилсан (1 оролт)",
            key: "lessonPrice",
            width: 170,
            render: (_, r: any) => (
              <div>
                <MoneyInput
                  disabled={!editable}
                  placeholder="Ерөнхий үнэ"
                  value={draft[r._id]?.lessonPrice}
                  onChange={(v: number | null) => patch(r._id, { lessonPrice: v })}
                />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  1 сар = {pack(draft[r._id]?.lessonPrice) ?? money(generalPrice * PACK)}
                </div>
              </div>
            ),
          },
          {
            title: "Олон сарын хямдрал (сарын үнэ)",
            key: "monthTiers",
            render: (_, r: any) => {
              const d = draft[r._id];
              if (!d?.lessonPrice) {
                return (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Ерөнхий хямдрал (дээрх тохиргоо)
                  </Typography.Text>
                );
              }
              const tiers = d.monthTiers ?? [];
              const setTier = (idx: number, p: Partial<Tier>) =>
                patch(r._id, { monthTiers: tiers.map((t, i) => (i === idx ? { ...t, ...p } : t)) });
              return (
                <Space direction="vertical" size={4}>
                  {tiers.map((t, idx) => (
                    <Space key={idx} size={6} wrap>
                      <InputNumber
                        disabled={!editable}
                        min={2}
                        max={12}
                        value={t.months}
                        onChange={(v) => setTier(idx, { months: v })}
                        addonAfter="сараар"
                        style={{ width: 120 }}
                      />
                      <MoneyInput
                        disabled={!editable}
                        step={10000}
                        value={t.monthPrice}
                        onChange={(v: number | null) => setTier(idx, { monthPrice: v })}
                        addonAfter="₮/сар"
                        style={{ width: 170 }}
                      />
                      {editable && (
                        <a
                          onClick={() =>
                            patch(r._id, { monthTiers: tiers.filter((_, i) => i !== idx) })
                          }
                        >
                          Хасах
                        </a>
                      )}
                    </Space>
                  ))}
                  {editable && (
                    <a
                      onClick={() =>
                        patch(r._id, {
                          monthTiers: [...tiers, { months: (tiers.at(-1)?.months ?? 1) + 1, monthPrice: null }],
                        })
                      }
                    >
                      + Шат нэмэх
                    </a>
                  )}
                </Space>
              );
            },
          },
          {
            title: "Групп (1 оролт)",
            key: "groupLessonPrice",
            width: 170,
            render: (_, r: any) => (
              <div>
                <MoneyInput
                  disabled={!editable}
                  placeholder="Ганцаарчилсантай адил"
                  value={draft[r._id]?.groupLessonPrice}
                  onChange={(v: number | null) => patch(r._id, { groupLessonPrice: v })}
                />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {pack(draft[r._id]?.groupLessonPrice) ? `1 сар = ${pack(draft[r._id]?.groupLessonPrice)}` : "—"}
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
              const orig = toDraft(r);
              const changed =
                (d?.lessonPrice ?? null) !== orig.lessonPrice ||
                (d?.groupLessonPrice ?? null) !== orig.groupLessonPrice ||
                JSON.stringify(cleanTiers(d?.monthTiers ?? [])) !== JSON.stringify(cleanTiers(orig.monthTiers));
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
