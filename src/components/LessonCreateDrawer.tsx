"use client";

import { useEffect, useState } from "react";
import { App, Alert, Button, Drawer, Form, Select, Space, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { studentName } from "@/lib/labels";

export interface CreateTarget {
  date: string;
  slotIndex: number;
  room: string;
  roomName?: string;
  slotLabel?: string;
}

/**
 * Календарын хоосон нүд дээр дарж хичээл нэмнэ. Өрөө/цаг нь дарсан нүднээс
 * автоматаар ирнэ — админ зөвхөн сурагчаа сонгоно.
 */
export default function LessonCreateDrawer({
  target,
  onClose,
}: {
  target: CreateTarget | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [student, setStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      form.resetFields();
      setStudent(null);
    }
  }, [target, form]);

  const { data: students } = useQuery({
    queryKey: ["students", "picker"],
    queryFn: async () =>
      (await api.get("/student", { params: { limit: 300, status: "ACTIVE" } }))
        .data.rows as any[],
    enabled: !!target,
  });

  const save = useMutation({
    mutationFn: async (values: any) =>
      api.post("/lesson", {
        student: values.student,
        room: target!.room,
        date: target!.date,
        slotIndex: target!.slotIndex,
        type: values.type || "REGULAR",
      }),
    onSuccess: (res) => {
      const conflicts = res.data.conflicts || [];
      if (conflicts.length) {
        message.warning(
          `Хичээл товлогдлоо, гэхдээ давхцалтай: ${conflicts
            .map((c: any) => c.message)
            .join("; ")}`,
          6,
        );
      } else {
        message.success(res.data.message);
      }
      qc.invalidateQueries({ queryKey: ["calendar"] });
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const picked = (students || []).find((s: any) => s._id === student);

  return (
    <Drawer
      title="Хичээл нэмэх"
      open={!!target}
      onClose={onClose}
      width={460}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Болих</Button>
          <Button
            type="primary"
            loading={save.isPending}
            onClick={() => form.submit()}
          >
            Товлох
          </Button>
        </Space>
      }
    >
      {target && (
        <>
          <Typography.Paragraph>
            <b>{target.date}</b> · {target.slotLabel} · {target.roomName}
          </Typography.Paragraph>
          <Form
            form={form}
            layout="vertical"
            onFinish={(v) => save.mutate(v)}
          >
            <Form.Item
              name="student"
              label="Сурагч"
              rules={[{ required: true, message: "Сурагч сонгоно уу" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Хайж сонгох"
                onChange={setStudent}
                options={(students || []).map((s: any) => ({
                  value: s._id,
                  label: `${studentName(s)} — ${s.instrument?.name} (${s.teacher?.name})`,
                }))}
              />
            </Form.Item>
            <Form.Item name="type" label="Төрөл" initialValue="REGULAR">
              <Select
                options={[
                  { value: "REGULAR", label: "Ердийн" },
                  { value: "TRIAL", label: "Туршилт" },
                ]}
              />
            </Form.Item>
          </Form>
          {picked && (
            <Alert
              type="info"
              showIcon
              message={`Багш: ${picked.teacher?.name} (${picked.instrument?.name})`}
              description="Багш сурагчийн одоогийн багшаар автоматаар тавигдана."
            />
          )}
        </>
      )}
    </Drawer>
  );
}
