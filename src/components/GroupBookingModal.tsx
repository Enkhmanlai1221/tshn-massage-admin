"use client";

import { useEffect, useMemo } from "react";
import {
  Drawer,
  Button,
  Grid,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Alert,
  Space,
  Divider,
  Typography,
  Card,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { App } from "antd";

interface Props {
  open: boolean;
  /** Календарь дээр сонгосон огноо — эхлэх цагийн анхны утга. */
  defaultDate?: Dayjs | null;
  onClose: () => void;
}

/**
 * Бүлгийн (тур оператор) захиалга — НЭГ цагт олон үйлчилгээ, олон зочин.
 * Үйлчилгээ бүрээр нэг мөр (үйлчилгээ + хугацаа + тоо). Backend сул орнуудыг
 * автоматаар хуваарилж, БҮГДийг нэг `groupCode`-оор холбоно
 * (`POST /appointment/group`, `items[]`). Ор хүрэлцэхгүй бол юу ч үүсгэхгүй.
 */
export default function GroupBookingModal({
  open,
  defaultDate,
  onClose,
}: Props) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm();
  const tourOperatorId = Form.useWatch("tourOperatorId", form);
  const items = Form.useWatch("items", form) || [];

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldValue(
        "startAt",
        defaultDate ? defaultDate.hour(10).minute(0).second(0) : undefined,
      );
    }
  }, [open, form, defaultDate]);

  const { data: services } = useQuery({
    queryKey: ["services-select"],
    queryFn: async () =>
      (await api.get("/service", { params: { limit: 200 } })).data.rows,
    enabled: open,
  });
  const { data: operators } = useQuery({
    queryKey: ["operators-select"],
    queryFn: async () =>
      (await api.get("/tour-operator", { params: { limit: 200 } })).data.rows,
    enabled: open,
  });

  const variantsOf = (serviceId?: string) => {
    const s = (services || []).find((x: any) => x._id === serviceId);
    return s?.variants || [];
  };
  const priceOf = (serviceId?: string, variantId?: string) =>
    variantsOf(serviceId).find((v: any) => v._id === variantId)?.price || 0;

  const selectedOperator = useMemo(
    () => (operators || []).find((o: any) => o._id === tourOperatorId),
    [operators, tourOperatorId],
  );

  // Нийт зочин / нийт үнэ (амьд тооцоо).
  const totals = useMemo(() => {
    let people = 0;
    let price = 0;
    for (const it of items) {
      if (!it) continue;
      const count = Number(it.count) || 0;
      const unit = priceOf(it.serviceId, it.variantId);
      const disc = Number(it.discount) || 0;
      people += count;
      price += Math.max(0, unit - disc) * count;
    }
    return { people, price };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, services]);

  const create = useMutation({
    mutationFn: async (values: any) => {
      const payloadItems = (values.items || []).map((it: any) => ({
        serviceId: it.serviceId,
        variantId: it.variantId,
        count: it.count,
        discount: it.discount || 0,
        guestNames: (it.guestNamesText || "")
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean),
      }));
      return (
        await api.post("/appointment/group", {
          startAt: values.startAt?.toISOString(),
          tourOperatorId: values.tourOperatorId || undefined,
          note: values.note || undefined,
          items: payloadItems,
        })
      ).data;
    },
    onSuccess: (res) => {
      message.success(
        `Бүлгийн захиалга үүслээ · ${res.count} зочин · ${res.groupCode}`,
      );
      qc.invalidateQueries({ queryKey: ["appointments-calendar"] });
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const commission = selectedOperator
    ? Math.round((totals.price * selectedOperator.commissionPercent) / 100)
    : 0;

  return (
    <Drawer
      title="Бүлгээр захиалах (тур оператор)"
      open={open}
      onClose={onClose}
      width={screens.md ? 640 : "100%"}
      destroyOnClose
      footer={
        <Space style={{ float: "right" }}>
          <Button onClick={onClose}>Болих</Button>
          <Button
            type="primary"
            loading={create.isPending}
            onClick={() => form.submit()}
          >
            Бүлгээр захиалах
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Бүгд нэг цагт эхэлнэ → зочин бүрд тусдаа ор хэрэгтэй. Сул орнуудыг автоматаар хуваарилна; хүрэлцэхгүй бол юу ч үүсгэхгүй."
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => create.mutate(v)}
        initialValues={{ items: [{ count: 1 }] }}
      >
        <Form.Item
          name="startAt"
          label="Эхлэх цаг"
          rules={[{ required: true, message: "Цаг сонгоно уу" }]}
        >
          <DatePicker
            showTime={{ format: "HH:mm", minuteStep: 5 }}
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            placeholder="Огноо / цаг"
          />
        </Form.Item>

        <Form.Item
          name="tourOperatorId"
          label="Тур оператор (сонгвол commission бодогдоно)"
        >
          <Select
            allowClear
            placeholder="Оператор сонгох"
            options={(operators || []).map((o: any) => ({
              value: o._id,
              label: `${o.name} (${o.commissionPercent}%)`,
            }))}
          />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 8 }}>
          Үйлчилгээнүүд
        </Divider>

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => {
                const row = items[name] || {};
                const variants = variantsOf(row.serviceId);
                return (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    styles={{ body: { paddingBottom: 0 } }}
                    extra={
                      fields.length > 1 ? (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        >
                          Хасах
                        </Button>
                      ) : null
                    }
                  >
                    <Form.Item
                      {...rest}
                      name={[name, "serviceId"]}
                      label="Үйлчилгээ"
                      rules={[
                        { required: true, message: "Үйлчилгээ сонгоно уу" },
                      ]}
                    >
                      <Select
                        placeholder="Үйлчилгээ"
                        onChange={() =>
                          form.setFieldValue(
                            ["items", name, "variantId"],
                            undefined,
                          )
                        }
                        options={(services || []).map((s: any) => ({
                          value: s._id,
                          label: s.name,
                        }))}
                      />
                    </Form.Item>

                    <Space
                      align="start"
                      style={{ display: "flex", width: "100%" }}
                    >
                      <Form.Item
                        {...rest}
                        name={[name, "variantId"]}
                        label="Хугацаа / үнэ"
                        rules={[
                          { required: true, message: "Хугацаа сонгоно уу" },
                        ]}
                        style={{ flex: 1, minWidth: 200 }}
                      >
                        <Select
                          placeholder="Хугацаа"
                          disabled={!row.serviceId}
                          options={variants.map((v: any) => ({
                            value: v._id,
                            label: `${v.name} · ${v.duration}мин · ${v.price?.toLocaleString()}₮`,
                          }))}
                        />
                      </Form.Item>

                      <Form.Item
                        {...rest}
                        name={[name, "count"]}
                        label="Хүн"
                        rules={[{ required: true, message: "Тоо" }]}
                      >
                        <InputNumber min={1} max={30} style={{ width: 80 }} />
                      </Form.Item>

                      <Form.Item
                        {...rest}
                        name={[name, "discount"]}
                        label="Хөнгөлөлт ₮"
                      >
                        <InputNumber min={0} style={{ width: 110 }} />
                      </Form.Item>
                    </Space>

                    <Form.Item
                      {...rest}
                      name={[name, "guestNamesText"]}
                      label="Нэрс (заавал биш · нэг мөрөнд нэг)"
                    >
                      <Input.TextArea
                        rows={2}
                        placeholder={"Болд\nДорж\n..."}
                      />
                    </Form.Item>
                  </Card>
                );
              })}

              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ count: 1 })}
                style={{ marginBottom: 12 }}
              >
                Үйлчилгээ нэмэх
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="note" label="Тэмдэглэл">
          <Input.TextArea rows={2} placeholder="Жш: Солонгос тур, 20 хүн" />
        </Form.Item>

        <Card size="small">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>
              Нийт зочин: <b>{totals.people}</b> · Нийт үнэ:{" "}
              <b>{totals.price.toLocaleString()}₮</b>
            </Typography.Text>
            {selectedOperator && (
              <Typography.Text type="secondary">
                Commission {selectedOperator.commissionPercent}% ≈{" "}
                {commission.toLocaleString()}₮ (захиалгын үед хөлдөнө)
              </Typography.Text>
            )}
          </Space>
        </Card>
      </Form>
    </Drawer>
  );
}
