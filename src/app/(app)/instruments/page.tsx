"use client";

import { Form, Input, InputNumber, Switch, Tag, Tooltip } from "antd";
import CrudPage from "@/components/CrudPage";
import { money } from "@/lib/labels";
import dayjs from "dayjs";

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
          render: (v) => <b>{money(v)}</b>,
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
      toPayload={(v) => ({ ...v, isActive: v.isActive ?? true })}
      renderFormItems={() => (
        <>
          <Form.Item
            name="name"
            label="Нэр"
            rules={[{ required: true, message: "Нэр оруулна уу" }]}
          >
            <Input placeholder="Гитар" />
          </Form.Item>
          <Form.Item
            name="lessonRate"
            label="Нэг хичээлийн цалин (₮)"
            extra="Ханш өөрчлөхөд түүхэнд бичигдэнэ. Өмнөх сарын цалин хөндөгдөхгүй."
          >
            <InputNumber
              min={0}
              step={1000}
              style={{ width: "100%" }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(v) => Number(`${v}`.replace(/,/g, "")) as any}
            />
          </Form.Item>
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
