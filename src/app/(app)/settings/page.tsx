"use client";

import { useEffect } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Typography,
  Spin,
  App,
  Row,
  Col,
  TimePicker,
} from "antd";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

const WEEKDAYS = [
  { value: 1, label: "Даваа" },
  { value: 2, label: "Мягмар" },
  { value: 3, label: "Лхагва" },
  { value: 4, label: "Пүрэв" },
  { value: 5, label: "Баасан" },
  { value: 6, label: "Бямба" },
  { value: 0, label: "Ням" },
];

// минут → dayjs (өнөөдрийн эхэн + минут)
const minToDayjs = (min: number) => dayjs().startOf("day").add(min, "minute");
const dayjsToMin = (d: dayjs.Dayjs) => d.hour() * 60 + d.minute();

export default function SettingsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["setting"],
    queryFn: async () => (await api.get("/setting")).data,
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        ...data,
        open: minToDayjs(data.openMinute),
        close: minToDayjs(data.closeMinute),
      });
    }
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        openMinute: dayjsToMin(values.open),
        closeMinute: dayjsToMin(values.close),
      };
      delete payload.open;
      delete payload.close;
      return api.put("/setting", payload);
    },
    onSuccess: () => {
      message.success("Хадгаллаа");
      qc.invalidateQueries({ queryKey: ["setting"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  if (isLoading) return <Spin />;

  return (
    <div>
      <Typography.Title level={3}>Салоны тохиргоо</Typography.Title>
      <Card style={{ maxWidth: 640 }}>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="name" label="Салоны нэр">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Утас">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currency" label="Валют">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Хаяг">
            <Input />
          </Form.Item>
          <Form.Item name="workingDays" label="Ажлын өдрүүд">
            <Select mode="multiple" options={WEEKDAYS} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="open" label="Нээх цаг">
                <TimePicker
                  format="HH:mm"
                  minuteStep={15}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="close" label="Хаах цаг">
                <TimePicker
                  format="HH:mm"
                  minuteStep={15}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="slotMinutes" label="Slot (мин)">
                <Select
                  options={[5, 10, 15, 30, 60].map((v) => ({
                    value: v,
                    label: `${v} мин`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="defaultBufferMinutes" label="Завсарлага (мин)">
                <InputNumber min={0} max={240} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="loyaltyEarnPercent" label="Loyalty оноо (%)">
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            Хадгалах
          </Button>
        </Form>
      </Card>
    </div>
  );
}
