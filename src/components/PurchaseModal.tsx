"use client";

import { useEffect } from "react";
import {
  App,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiError } from "@/lib/api";
import { money, studentName } from "@/lib/labels";

/** Гараар бүртгэх төлбөрийн арга (QPay нь автоматаар бүртгэгдэнэ). */
const METHOD_OPTIONS = [
  { value: "CASH", label: "Бэлэн" },
  { value: "TRANSFER", label: "Шилжүүлэг" },
  { value: "CARD", label: "Карт" },
];

/** Нэг оролтын үнэ + багцууд (PAYMENT эрхээр уншина). */
export const usePricing = () =>
  useQuery({
    queryKey: ["payment-pricing"],
    queryFn: async () => (await api.get("/payment/pricing")).data,
    staleTime: 60_000,
  });

/**
 * ОРОЛТЫН ТӨЛБӨР БҮРТГЭХ — бэлэн / шилжүүлэг / картаар авсан төлбөр.
 *
 * Нэгж нь ОРОЛТ: «8 оролт», «16 оролт» гэх мэт. Дүн нь `оролт × нэг оролтын
 * үнэ`-ээр автоматаар бөглөгдөнө, хямдрал бол гараар засна.
 */
export function PurchaseModal({
  student,
  open,
  onClose,
}: {
  student: any | null;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { data: pricing } = usePricing();
  const price: number = pricing?.lessonPrice ?? 0;
  const packages: number[] = (pricing?.packages ?? []).map((p: any) => p.lessons);

  useEffect(() => {
    if (open) {
      const lessons = packages[0] ?? 8;
      form.setFieldsValue({
        lessons,
        amount: lessons * price,
        method: "CASH",
        paidAt: dayjs(),
        note: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, price]);

  const save = useMutation({
    mutationFn: async (v: any) =>
      api.post(`/payment/${student._id}/purchase`, {
        ...v,
        paidAt: v.paidAt ? v.paidAt.toISOString() : null,
      }),
    onSuccess: (res) => {
      message.success(res.data.message);
      for (const key of ["payment-balance", "purchases", "students", "student-prior", "student"]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const setLessons = (n: number) =>
    form.setFieldsValue({ lessons: n, amount: n * price });

  return (
    <Modal
      open={open}
      title={`Төлбөр бүртгэх — ${student ? studentName(student) : ""}`}
      okText="Бүртгэх"
      cancelText="Болих"
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={save.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
        <Form.Item label="Багц">
          <Radio.Group
            optionType="button"
            options={packages.map((n) => ({ value: n, label: `${n} оролт` }))}
            onChange={(e) => setLessons(e.target.value)}
          />
        </Form.Item>
        <Space size={12} align="start">
          <Form.Item
            name="lessons"
            label="Оролтын тоо"
            rules={[{ required: true, message: "Оролтын тоо" }]}
          >
            <InputNumber
              min={1}
              max={96}
              style={{ width: 120 }}
              onChange={(v) => v && form.setFieldsValue({ amount: Number(v) * price })}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Төлсөн дүн (₮)"
            extra={price ? `1 оролт = ${money(price)}` : "Тохиргоонд оролтын үнэ тавиагүй"}
          >
            <InputNumber
              min={0}
              step={1000}
              style={{ width: 180 }}
              formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(v) => Number(String(v ?? "").replace(/,/g, "")) as any}
            />
          </Form.Item>
        </Space>
        <Space size={12} align="start">
          <Form.Item name="method" label="Төлбөрийн арга" rules={[{ required: true }]}>
            <Select options={METHOD_OPTIONS} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="paidAt" label="Төлсөн огноо">
            <DatePicker format="YYYY-MM-DD" allowClear={false} />
          </Form.Item>
        </Space>
        <Form.Item name="note" label="Тэмдэглэл">
          <Input.TextArea rows={2} placeholder="Хямдрал, баримтын дугаар г.м." />
        </Form.Item>
        <Typography.Text type="secondary">
          QPay-ээр төлсөн төлбөр автоматаар бүртгэгдэнэ — энд оруулах шаардлагагүй.
        </Typography.Text>
      </Form>
    </Modal>
  );
}
