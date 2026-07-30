"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Divider,
  Tag,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import CrudPage from "@/components/CrudPage";
import { api } from "@/lib/api";

export default function ServicesPage() {
  const { data: categories } = useQuery({
    queryKey: ["service-categories-select"],
    queryFn: async () =>
      (await api.get("/service-category", { params: { limit: 200 } })).data
        .rows,
  });

  return (
    <CrudPage
      title="Үйлчилгээ"
      endpoint="/service"
      permission="SERVICE"
      queryKey="services"
      modalWidth={640}
      columns={[
        { title: "Нэр", dataIndex: "name", key: "name" },
        {
          title: "Ангилал",
          dataIndex: ["category", "name"],
          key: "category",
          render: (v) => v || "-",
        },
        {
          title: "Хугацаа/үнэ",
          key: "variants",
          render: (_, r: any) => (
            <Space wrap>
              {(r.variants || []).map((v: any, i: number) => (
                <Tag key={i}>
                  {v.name}: {v.price?.toLocaleString()}₮
                </Tag>
              ))}
            </Space>
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
      toInitialValues={(r) => ({
        ...r,
        category: r.category?._id || r.category,
      })}
      renderFormItems={() => (
        <>
          <Form.Item
            name="name"
            label="Нэр"
            rules={[{ required: true, message: "Нэр оруулна уу" }]}
          >
            <Input placeholder="Тайван массаж" />
          </Form.Item>
          <Form.Item name="category" label="Ангилал">
            <Select
              allowClear
              placeholder="Ангилал сонгох"
              options={(categories || []).map((c: any) => ({
                value: c._id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="description" label="Тайлбар">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>Хугацаа / үнэ хувилбарууд</Divider>
          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: "flex" }}>
                    <Form.Item
                      {...rest}
                      name={[name, "name"]}
                      rules={[{ required: true, message: "Нэр" }]}
                    >
                      <Input placeholder="90 мин" />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, "duration"]}
                      rules={[{ required: true, message: "Хугацаа" }]}
                    >
                      <InputNumber placeholder="мин" min={1} />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, "price"]}
                      rules={[{ required: true, message: "Үнэ" }]}
                    >
                      <InputNumber
                        placeholder="үнэ"
                        min={0}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  Хувилбар нэмэх
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item
            name="isActive"
            label="Идэвхтэй"
            valuePropName="checked"
            initialValue={true}
            style={{ marginTop: 16 }}
          >
            <Switch />
          </Form.Item>
        </>
      )}
    />
  );
}
