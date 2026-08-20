"use client";

import { Form, Input, InputNumber, Switch } from "antd";
import CrudPage from "@/components/CrudPage";

export default function RoomsPage() {
  return (
    <CrudPage
      title="Өрөө"
      endpoint="/room"
      permission="ROOM"
      queryKey="rooms"
      columns={[
        { title: "Нэр", dataIndex: "name", key: "name" },
        { title: "Тайлбар", dataIndex: "description", key: "description" },
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
            label="Өрөөний нэр"
            rules={[{ required: true, message: "Нэр оруулна уу" }]}
          >
            <Input placeholder="Өрөө 1" />
          </Form.Item>
          <Form.Item name="description" label="Тайлбар">
            <Input placeholder="Төгөлдөр хууртай" />
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
