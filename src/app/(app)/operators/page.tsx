"use client";

import { Form, Input, InputNumber, Switch } from "antd";
import CrudPage from "@/components/CrudPage";

export default function OperatorsPage() {
  return (
    <CrudPage
      title="Тур оператор"
      endpoint="/tour-operator"
      permission="TOUR_OPERATOR"
      queryKey="operators"
      columns={[
        { title: "Нэр", dataIndex: "name", key: "name" },
        {
          title: "Холбоо барих",
          dataIndex: "contactName",
          key: "contactName",
          render: (v) => v || "-",
        },
        {
          title: "Утас",
          dataIndex: "phone",
          key: "phone",
          render: (v) => v || "-",
        },
        {
          title: "Хувь (%)",
          dataIndex: "commissionPercent",
          key: "commissionPercent",
          render: (v) => `${v || 0}%`,
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
            <Input />
          </Form.Item>
          <Form.Item name="contactName" label="Холбоо барих хүн">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Утас">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Имэйл">
            <Input />
          </Form.Item>
          <Form.Item
            name="commissionPercent"
            label="Commission хувь (%)"
            rules={[{ required: true, message: "Хувь оруулна уу" }]}
          >
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="note" label="Тэмдэглэл">
            <Input.TextArea rows={2} />
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
