"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Button,
  Grid,
  Form,
  Select,
  Switch,
  Input,
  InputNumber,
  Alert,
  Spin,
  Tag,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiError } from "@/lib/api";
import { App } from "antd";

interface Props {
  open: boolean;
  bedId: string | null;
  bedName?: string;
  startAt: Date | null;
  onClose: () => void;
}

const SOURCES = [
  { value: "WALK_IN", label: "Өөрөө ирсэн" },
  { value: "PHONE", label: "Утсаар" },
  { value: "TOUR_OPERATOR", label: "Тур оператор" },
];

// Үйлчлүүлэгчийг утас/нэрээр хайх сонголт
function CustomerSelect({ value, onChange }: any) {
  const [q, setQ] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["customer-search", q],
    queryFn: async () =>
      (await api.get("/customer", { params: { query: q, limit: 20 } })).data
        .rows,
  });
  return (
    <Select
      showSearch
      value={value}
      placeholder="Утас эсвэл нэрээр хайх"
      filterOption={false}
      onSearch={setQ}
      onChange={onChange}
      notFoundContent={isFetching ? <Spin size="small" /> : "Олдсонгүй"}
      options={(data || []).map((c: any) => ({
        value: c._id,
        label: `${c.firstName} ${c.lastName || ""} · ${c.phone}`,
      }))}
    />
  );
}

export default function AppointmentCreateModal({
  open,
  bedId,
  bedName,
  startAt,
  onClose,
}: Props) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm();
  const serviceId = Form.useWatch("serviceId", form);
  const variantId = Form.useWatch("variantId", form);
  const therapistId = Form.useWatch("therapistId", form);
  const exclusiveRoom = Form.useWatch("exclusiveRoom", form);
  const source = Form.useWatch("source", form);

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const { data: services } = useQuery({
    queryKey: ["services-select"],
    queryFn: async () =>
      (await api.get("/service", { params: { limit: 200 } })).data.rows,
    enabled: open,
  });
  const { data: therapists } = useQuery({
    queryKey: ["therapists-select"],
    queryFn: async () =>
      (await api.get("/therapist", { params: { limit: 200 } })).data.rows,
    enabled: open,
  });
  const { data: operators } = useQuery({
    queryKey: ["operators-select"],
    queryFn: async () =>
      (await api.get("/tour-operator", { params: { limit: 200 } })).data.rows,
    enabled: open && source === "TOUR_OPERATOR",
  });

  const variants = useMemo(() => {
    const s = (services || []).find((x: any) => x._id === serviceId);
    return s?.variants || [];
  }, [services, serviceId]);

  // Сул чөлөө шалгах (заавал талбарууд бөглөгдсөн үед)
  const canCheck = !!(bedId && startAt && serviceId && variantId);
  const { data: availability, isFetching: checking } = useQuery({
    queryKey: [
      "availability",
      bedId,
      startAt?.toISOString(),
      serviceId,
      variantId,
      therapistId,
      exclusiveRoom,
    ],
    queryFn: async () =>
      (
        await api.post("/appointment/availability", {
          bedId,
          startAt,
          serviceId,
          variantId,
          therapistId: therapistId || undefined,
          exclusiveRoom: !!exclusiveRoom,
        })
      ).data,
    enabled: open && canCheck,
  });

  const create = useMutation({
    mutationFn: async (values: any) =>
      api.post("/appointment", {
        ...values,
        bedId,
        startAt,
        exclusiveRoom: !!values.exclusiveRoom,
      }),
    onSuccess: () => {
      message.success("Захиалга үүслээ");
      qc.invalidateQueries({ queryKey: ["appointments-calendar"] });
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Drawer
      title="Шинэ цаг захиалга"
      open={open}
      onClose={onClose}
      destroyOnClose
      width={screens.sm ? 480 : "100%"}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Болих</Button>
          <Button
            type="primary"
            loading={create.isPending}
            disabled={!!(canCheck && availability && !availability.available)}
            onClick={() => form.submit()}
          >
            Захиалах
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Tag color="blue">{bedName || "Ор"}</Tag>
        <Tag>{startAt ? dayjs(startAt).format("MM/DD HH:mm") : ""}</Tag>
      </div>

      {canCheck && (
        <div style={{ marginBottom: 12 }}>
          {checking ? (
            <Spin size="small" />
          ) : availability?.available ? (
            <Alert
              type="success"
              showIcon
              message={`Сул байна · ${dayjs(availability.startAt).format("HH:mm")}–${dayjs(availability.endAt).format("HH:mm")} · ${availability.price?.toLocaleString()}₮`}
            />
          ) : (
            <Alert
              type="error"
              showIcon
              message={availability?.reasons?.join(" ") || "Завгүй байна"}
            />
          )}
        </div>
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => create.mutate(v)}
        initialValues={{ source: "WALK_IN", exclusiveRoom: false }}
      >
        <Form.Item
          name="customerId"
          label="Үйлчлүүлэгч"
          rules={[{ required: true, message: "Үйлчлүүлэгч сонгоно уу" }]}
        >
          <CustomerSelect />
        </Form.Item>
        <Form.Item
          name="serviceId"
          label="Үйлчилгээ"
          rules={[{ required: true, message: "Үйлчилгээ сонгоно уу" }]}
        >
          <Select
            placeholder="Үйлчилгээ"
            onChange={() => form.setFieldValue("variantId", undefined)}
            options={(services || []).map((s: any) => ({
              value: s._id,
              label: s.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="variantId"
          label="Хугацаа / үнэ"
          rules={[{ required: true, message: "Хугацаа сонгоно уу" }]}
        >
          <Select
            placeholder="Хугацаа"
            disabled={!serviceId}
            options={variants.map((v: any) => ({
              value: v._id,
              label: `${v.name} · ${v.duration} мин · ${v.price?.toLocaleString()}₮`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="therapistId"
          label="Бариач (хоосон = дараа хуваарилах)"
        >
          <Select
            allowClear
            placeholder="Бариач сонгох"
            options={(therapists || []).map((t: any) => ({
              value: t._id,
              label: t.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="exclusiveRoom"
          label="Өрөөг дангаар (танихгүй хүнтэй хуваалцахгүй)"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item name="source" label="Эх сурвалж">
          <Select options={SOURCES} />
        </Form.Item>
        {source === "TOUR_OPERATOR" && (
          <Form.Item
            name="tourOperatorId"
            label="Тур оператор"
            rules={[{ required: true, message: "Оператор сонгоно уу" }]}
          >
            <Select
              placeholder="Оператор"
              options={(operators || []).map((o: any) => ({
                value: o._id,
                label: `${o.name} (${o.commissionPercent}%)`,
              }))}
            />
          </Form.Item>
        )}
        <Form.Item name="discount" label="Хөнгөлөлт (₮)">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="note" label="Тэмдэглэл">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
