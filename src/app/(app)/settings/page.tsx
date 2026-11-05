"use client";

import { useEffect } from "react";
import {
  App,
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WEEKDAY_LABEL, minuteLabel } from "@/lib/labels";
import InstrumentPricesCard from "@/components/InstrumentPricesCard";

export default function SettingsPage() {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["setting"],
    queryFn: async () => (await api.get("/setting")).data,
  });

  useEffect(() => {
    if (data) form.setFieldsValue(data);
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (v: any) => api.put("/setting", v),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["setting"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const editable = can("SETTING", "isEdit");

  return (
    <div>
      <Typography.Title level={4}>Тохиргоо</Typography.Title>
      <Form
        form={form}
        layout="vertical"
        disabled={!editable}
        onFinish={(v) => save.mutate(v)}
      >
        <Card size="small" title="Ерөнхий" loading={isLoading}>
          <Space wrap align="start">
            <Form.Item name="name" label="Сургуулийн нэр" style={{ width: 280 }}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Утас" style={{ width: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Хаяг" style={{ width: 320 }}>
              <Input />
            </Form.Item>
          </Space>
        </Card>

        <Card size="small" title="Хичээлийн дүрэм" style={{ marginTop: 16 }}>
          <Space wrap align="start" size="large">
            <Form.Item
              name="lessonDuration"
              label="Хичээлийн үргэлжлэх хугацаа (мин)"
              style={{ width: 240 }}
            >
              <InputNumber min={5} max={240} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="absenceStrikeLimit"
              label="Тасалтын сануулгын хязгаар"
              extra="Сурагч сард энэ тооноос ИЛҮҮ тасалбал багшид цалин тооцно."
              style={{ width: 280 }}
            >
              <InputNumber min={0} max={20} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item name="workingDays" label="Ажлын өдрүүд">
            <Checkbox.Group
              options={WEEKDAY_LABEL.map((label, value) => ({ label, value }))}
            />
          </Form.Item>
        </Card>

        <Card size="small" title="Төлбөр (оролтоор)" style={{ marginTop: 16 }}>
          {data && (data.lessonPrice ?? 0) < 1000 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`Ерөнхий үнэ ${(data.lessonPrice ?? 0).toLocaleString()}₮ байна — өөрийн үнэгүй хөгжмийн сурагчид ${data.lessonPackages?.[0] ?? 8} оролтыг ${((data.lessonPrice ?? 0) * (data.lessonPackages?.[0] ?? 8)).toLocaleString()}₮-өөр төлнө.`}
            />
          )}
          <Space wrap align="start" size="large">
            <Form.Item
              name="lessonPrice"
              label="Ерөнхий нэг оролтын үнэ (₮)"
              extra="Өөрийн үнэгүй хөгжмийн сурагч энэ үнээр төлнө (доорх «Хөгжим бүрийн үнэ»). Төлбөр = оролтын тоо × үнэ."
              style={{ width: 300 }}
            >
              <InputNumber
                min={0}
                step={1000}
                style={{ width: "100%" }}
                formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => Number(String(v ?? "").replace(/,/g, "")) as any}
              />
            </Form.Item>
            <Form.Item
              name="lessonPackages"
              label="Санал болгох багц (оролтын тоо)"
              extra="Сурагчийн апп болон «Төлбөр авах» цонхонд харагдана."
              style={{ width: 320 }}
              getValueFromEvent={(v: any[]) =>
                (v || []).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 96)
              }
            >
              <Select mode="tags" tokenSeparators={[",", " "]} placeholder="8, 16, 24" />
            </Form.Item>
          </Space>
        </Card>

        {editable && (
          <Button
            type="primary"
            htmlType="submit"
            loading={save.isPending}
            style={{ marginTop: 16 }}
          >
            Хадгалах
          </Button>
        )}
      </Form>

      <InstrumentPricesCard generalPrice={data?.lessonPrice ?? 0} />

      <Card size="small" title="Хичээлийн цагийн сүлжээ" style={{ marginTop: 16 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Цагийн сүлжээ өөрчлөх нь зөвхөн ШИНЭ хичээлд нөлөөлнө"
          description="Аль хэдийн товлогдсон хичээлүүд өөрсдийн цагийг хадгалдаг тул хөндөгдөхгүй."
        />
        <Table
          size="small"
          rowKey="index"
          dataSource={data?.timeSlots || []}
          pagination={false}
          columns={[
            { title: "#", dataIndex: "index", width: 60 },
            {
              title: "Эхлэх",
              dataIndex: "startMinute",
              render: (v) => minuteLabel(v),
            },
            {
              title: "Дуусах",
              dataIndex: "endMinute",
              render: (v) => minuteLabel(v),
            },
            {
              title: "Үргэлжлэх",
              key: "dur",
              render: (_, r: any) => `${r.endMinute - r.startMinute} мин`,
            },
            {
              title: "Дараагийн хүртэл завсарлага",
              key: "gap",
              render: (_, r: any, i) => {
                const next = data?.timeSlots?.[i + 1];
                if (!next) return "—";
                const gap = next.startMinute - r.endMinute;
                return gap ? <Tag color="orange">{gap} мин</Tag> : "—";
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}
