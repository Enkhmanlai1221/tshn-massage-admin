"use client";

import { useQuery } from "@tanstack/react-query";
import { Form, Input, Select, Switch, Tag } from "antd";
import CrudPage from "@/components/CrudPage";
import { api } from "@/lib/api";

export default function TherapistsPage() {
  const { data: services } = useQuery({
    queryKey: ["services-select"],
    queryFn: async () =>
      (await api.get("/service", { params: { limit: 200 } })).data.rows,
  });

  return (
    <CrudPage
      title="Бариач"
      endpoint="/therapist"
      permission="THERAPIST"
      queryKey="therapists"
      columns={[
        { title: "Нэр", dataIndex: "name", key: "name" },
        {
          title: "Утас",
          dataIndex: "phone",
          key: "phone",
          render: (v) => v || "-",
        },
        {
          title: "Чадвар",
          dataIndex: "skills",
          key: "skills",
          render: (skills: any[]) => (
            <>
              {(skills || []).map((s: any) => (
                <Tag key={s._id || s}>{s.name || ""}</Tag>
              ))}
            </>
          ),
        },
        {
          title: "Идэвхтэй",
          dataIndex: "isActive",
          key: "isActive",
          render: (v) => (v ? "Тийм" : "Үгүй"),
        },
      ]}
      toInitialValues={(r) => ({
        ...r,
        skills: (r.skills || []).map((s: any) => s._id || s),
      })}
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
          <Form.Item name="phone" label="Утас">
            <Input />
          </Form.Item>
          <Form.Item name="skills" label="Хийж чадах үйлчилгээ (хоосон = бүгд)">
            <Select
              mode="multiple"
              allowClear
              placeholder="Үйлчилгээ сонгох"
              options={(services || []).map((s: any) => ({
                value: s._id,
                label: s.name,
              }))}
            />
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
