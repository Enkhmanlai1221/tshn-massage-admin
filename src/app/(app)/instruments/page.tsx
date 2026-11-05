"use client";

import { Divider, Form, Input, InputNumber, Switch, Tag, Tooltip } from "antd";
import CrudPage from "@/components/CrudPage";
import { money } from "@/lib/labels";
import dayjs from "dayjs";

/** Нэг багцын оролт — үнийг «8 оролт = …» гэж харуулахад. */
const PACK = 8;

const MoneyInput = (props: any) => (
  <InputNumber
    min={0}
    step={500}
    style={{ width: "100%" }}
    formatter={(v) => (v == null || v === "" ? "" : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","))}
    parser={(v) => (v ? (Number(`${v}`.replace(/,/g, "")) as any) : null)}
    {...props}
  />
);

/** Талбарын доорх «8 оролт = 420,000₮» тайлбар. */
const PackHint = ({ name, fallback }: { name: string; fallback: string }) => (
  <Form.Item noStyle shouldUpdate>
    {({ getFieldValue }) => {
      const v = getFieldValue(name);
      return (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: -16, marginBottom: 16 }}>
          {v ? `${PACK} оролт = ${money(v * PACK)}` : fallback}
        </div>
      );
    }}
  </Form.Item>
);

export default function InstrumentsPage() {
  return (
    <CrudPage
      title="Хөгжмийн төрөл"
      endpoint="/instrument"
      permission="INSTRUMENT"
      queryKey="instruments"
      columns={[
        {
          title: "Нэр",
          dataIndex: "name",
          key: "name",
          render: (v, r: any) => (
            <Tag color={r.color || "default"} style={{ fontSize: 13 }}>
              {v}
            </Tag>
          ),
        },
        {
          title: "1 хичээлийн цалин",
          dataIndex: "lessonRate",
          key: "lessonRate",
          render: (v, r: any) => (
            <>
              <b>{money(v)}</b>
              {r.groupRate > 0 && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  групп {money(r.groupRate)}
                </div>
              )}
            </>
          ),
        },
        {
          title: `Сурагчийн үнэ (${PACK} оролт)`,
          key: "price",
          render: (_, r: any) =>
            r.lessonPrice > 0 ? (
              <>
                <b>{money(r.lessonPrice * PACK)}</b>
                {r.groupLessonPrice > 0 && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    групп {money(r.groupLessonPrice * PACK)}
                  </div>
                )}
              </>
            ) : (
              <span style={{ color: "#9ca3af" }}>Ерөнхий үнэ</span>
            ),
        },
        {
          title: "Ханшийн түүх",
          key: "rateHistory",
          render: (_, r: any) =>
            r.rateHistory?.length ? (
              <Tooltip
                title={r.rateHistory
                  .map(
                    (h: any) =>
                      `${dayjs(h.changedAt).format("YYYY-MM-DD")} — ${money(h.rate)}`,
                  )
                  .join("\n")}
              >
                <a>{r.rateHistory.length} өөрчлөлт</a>
              </Tooltip>
            ) : (
              "—"
            ),
        },
        {
          title: "Идэвхтэй",
          dataIndex: "isActive",
          key: "isActive",
          render: (v) => (v ? "Тийм" : "Үгүй"),
        },
      ]}
      toPayload={(v) => ({
        ...v,
        isActive: v.isActive ?? true,
        // Хоосолсон талбар = тохируулаагүй (null) — ганцаарчилсан / ерөнхий үнэ ашиглана.
        groupRate: v.groupRate || null,
        lessonPrice: v.lessonPrice || null,
        groupLessonPrice: v.groupLessonPrice || null,
      })}
      renderFormItems={() => (
        <>
          <Form.Item
            name="name"
            label="Нэр"
            rules={[{ required: true, message: "Нэр оруулна уу" }]}
          >
            <Input placeholder="Гитар" />
          </Form.Item>

          <Divider orientation="left" plain style={{ marginTop: 0 }}>
            Багшийн цалин (нэг оролт)
          </Divider>
          <Form.Item
            name="lessonRate"
            label="Ганцаарчилсан (₮)"
            extra="Ханш өөрчлөхөд түүхэнд бичигдэнэ. Ирц бүртгэгдсэн хичээл хөндөгдөхгүй."
          >
            <MoneyInput step={1000} />
          </Form.Item>
          <Form.Item
            name="groupRate"
            label="Групп (₮)"
            extra="Хоосон бол группийн сурагчид ч ганцаарчилсан ханшаар бодогдоно."
          >
            <MoneyInput step={1000} placeholder="Тохируулаагүй" />
          </Form.Item>

          <Divider orientation="left" plain>
            Сурагчийн төлбөр (нэг оролт)
          </Divider>
          <Form.Item name="lessonPrice" label="Ганцаарчилсан (₮)">
            <MoneyInput placeholder="Сургуулийн ерөнхий үнэ" />
          </Form.Item>
          <PackHint name="lessonPrice" fallback="Хоосон бол Тохиргоо → нэг оролтын үнэ ашиглана." />
          <Form.Item name="groupLessonPrice" label="Групп (₮)">
            <MoneyInput placeholder="Тохируулаагүй" />
          </Form.Item>
          <PackHint
            name="groupLessonPrice"
            fallback="Хоосон бол группийн сурагч ганцаарчилсан үнээр төлнө."
          />

          <Divider orientation="left" plain>
            Бусад
          </Divider>
          <Form.Item name="color" label="Өнгө (календарт)">
            <Input placeholder="#f59e0b" />
          </Form.Item>
          <Form.Item name="sort" label="Эрэмбэ">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Идэвхтэй"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </>
      )}
    />
  );
}
