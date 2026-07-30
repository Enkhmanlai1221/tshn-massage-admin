"use client";

import { Form, Input, Select, Tag } from "antd";
import CrudPage from "@/components/CrudPage";

export default function CustomersPage() {
  return (
    <CrudPage
      title="Үйлчлүүлэгч"
      endpoint="/customer"
      permission="CUSTOMER"
      queryKey="customers"
      columns={[
        { title: "Код", dataIndex: "code", key: "code" },
        {
          title: "Нэр",
          key: "name",
          render: (_, r: any) =>
            `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        },
        { title: "Утас", dataIndex: "phone", key: "phone" },
        {
          title: "Оноо",
          dataIndex: "loyaltyBalance",
          key: "loyaltyBalance",
          render: (v) => <Tag color="purple">{v || 0}</Tag>,
        },
        { title: "Ирсэн", dataIndex: "totalVisits", key: "totalVisits" },
      ]}
      renderFormItems={() => (
        <>
          <Form.Item
            name="firstName"
            label="Нэр"
            rules={[{ required: true, message: "Нэр оруулна уу" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Овог">
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Утас"
            rules={[{ required: true, message: "Утас оруулна уу" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Имэйл">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Хүйс">
            <Select
              allowClear
              options={[
                { value: "MALE", label: "Эрэгтэй" },
                { value: "FEMALE", label: "Эмэгтэй" },
                { value: "OTHER", label: "Бусад" },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Тэмдэглэл">
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      )}
    />
  );
}
