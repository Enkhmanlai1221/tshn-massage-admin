"use client";

import { useState } from "react";
import { Button, DatePicker, Form, Input, Select, Space, Tag } from "antd";
import dayjs from "dayjs";
import CrudPage from "@/components/CrudPage";
import StudentDrawer from "@/components/StudentDrawer";
import { useInstruments, useTeachers } from "@/lib/hooks";
import {
  STUDENT_LEVEL_LABEL,
  STUDENT_STATUS_LABEL,
  StudentStatusTag,
  studentName,
} from "@/lib/labels";

const opts = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));

export default function StudentsPage() {
  const { data: instruments } = useInstruments();
  const [instrument, setInstrument] = useState<string | undefined>();
  const { data: teachers } = useTeachers(instrument ? { instrument } : undefined);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Record<string, any>>({});

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          allowClear
          placeholder="Хөгжим"
          style={{ width: 160 }}
          options={(instruments || []).map((i: any) => ({
            value: i._id,
            label: i.name,
          }))}
          onChange={(v) => setFilter({ ...filter, instrument: v })}
        />
        <Select
          allowClear
          placeholder="Багш"
          style={{ width: 160 }}
          options={(teachers || []).map((t: any) => ({
            value: t._id,
            label: t.name,
          }))}
          onChange={(v) => setFilter({ ...filter, teacher: v })}
        />
        <Select
          allowClear
          placeholder="Статус"
          style={{ width: 140 }}
          options={opts(STUDENT_STATUS_LABEL)}
          onChange={(v) => setFilter({ ...filter, status: v })}
        />
      </Space>

      <CrudPage
        title="Сурагч"
        endpoint="/student"
        permission="STUDENT"
        queryKey="students"
        extraListParams={filter}
        modalWidth={620}
        columns={[
          { title: "Код", dataIndex: "code", key: "code", width: 110 },
          {
            title: "Нэр",
            key: "name",
            render: (_, r: any) => (
              <a onClick={() => setOpen(r._id)}>{studentName(r)}</a>
            ),
          },
          {
            title: "Хөгжим",
            dataIndex: ["instrument", "name"],
            key: "instrument",
            render: (v, r: any) => (
              <Tag color={r.instrument?.color}>{v || "—"}</Tag>
            ),
          },
          { title: "Багш", dataIndex: ["teacher", "name"], key: "teacher" },
          {
            title: "Түвшин",
            dataIndex: "level",
            key: "level",
            render: (v) => STUDENT_LEVEL_LABEL[v] || "—",
          },
          {
            title: "Утас",
            key: "phone",
            render: (_, r: any) => r.phone || r.parentPhone || "—",
          },
          {
            title: "Төлбөр",
            dataIndex: "lastPaidMonth",
            key: "lastPaidMonth",
            render: (v) =>
              v === dayjs().format("YYYY-MM") ? (
                <Tag color="green">Төлсөн</Tag>
              ) : (
                <Tag color="red">Төлөөгүй</Tag>
              ),
          },
          {
            title: "Статус",
            dataIndex: "status",
            key: "status",
            render: (v) => <StudentStatusTag status={v} />,
          },
          {
            title: "",
            key: "detail",
            width: 90,
            render: (_, r: any) => (
              <Button size="small" onClick={() => setOpen(r._id)}>
                Дэлгэрэнгүй
              </Button>
            ),
          },
        ]}
        toInitialValues={(r) => ({
          ...r,
          instrument: r.instrument?._id ?? r.instrument,
          teacher: r.teacher?._id ?? r.teacher,
          birthday: r.birthday ? dayjs(r.birthday) : undefined,
        })}
        toPayload={(v) => ({
          ...v,
          birthday: v.birthday ? v.birthday.toISOString() : null,
        })}
        renderFormItems={(editing) => (
          <>
            <Space style={{ width: "100%" }} size="middle">
              <Form.Item
                name="lastName"
                label="Овог"
                style={{ width: 160 }}
              >
                <Input placeholder="Б" />
              </Form.Item>
              <Form.Item
                name="firstName"
                label="Нэр"
                rules={[{ required: true, message: "Нэр оруулна уу" }]}
                style={{ width: 240 }}
              >
                <Input placeholder="Ану" />
              </Form.Item>
            </Space>
            <Space style={{ width: "100%" }} size="middle">
              <Form.Item
                name="instrument"
                label="Хөгжим"
                rules={[{ required: true, message: "Хөгжим сонгоно уу" }]}
                style={{ width: 200 }}
              >
                <Select
                  placeholder="Сонгох"
                  onChange={setInstrument}
                  options={(instruments || []).map((i: any) => ({
                    value: i._id,
                    label: i.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="teacher"
                label="Багш"
                rules={[{ required: true, message: "Багш сонгоно уу" }]}
                style={{ width: 200 }}
                extra={editing ? "Солихдоо дэлгэрэнгүйгээс" : undefined}
              >
                <Select
                  placeholder="Сонгох"
                  disabled={!!editing}
                  options={(teachers || []).map((t: any) => ({
                    value: t._id,
                    label: `${t.name} (${t.instrument?.name})`,
                  }))}
                />
              </Form.Item>
            </Space>
            <Space style={{ width: "100%" }} size="middle">
              <Form.Item name="level" label="Түвшин" style={{ width: 200 }}>
                <Select options={opts(STUDENT_LEVEL_LABEL)} />
              </Form.Item>
              {editing && (
                <Form.Item name="status" label="Статус" style={{ width: 200 }}>
                  <Select options={opts(STUDENT_STATUS_LABEL)} />
                </Form.Item>
              )}
            </Space>
            <Space style={{ width: "100%" }} size="middle">
              <Form.Item name="phone" label="Утас" style={{ width: 200 }}>
                <Input placeholder="99001122" />
              </Form.Item>
              <Form.Item name="birthday" label="Төрсөн өдөр" style={{ width: 200 }}>
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item name="gender" label="Хүйс" style={{ width: 120 }}>
                <Select
                  allowClear
                  options={[
                    { value: "MALE", label: "Эрэгтэй" },
                    { value: "FEMALE", label: "Эмэгтэй" },
                  ]}
                />
              </Form.Item>
            </Space>
            <Space style={{ width: "100%" }} size="middle">
              <Form.Item
                name="parentName"
                label="Эцэг эхийн нэр"
                style={{ width: 260 }}
              >
                <Input placeholder="Бага насны сурагчид" />
              </Form.Item>
              <Form.Item
                name="parentPhone"
                label="Эцэг эхийн утас"
                style={{ width: 200 }}
              >
                <Input placeholder="88001122" />
              </Form.Item>
            </Space>
            <Form.Item name="note" label="Тэмдэглэл">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        )}
      />
      <StudentDrawer studentId={open} onClose={() => setOpen(null)} />
    </>
  );
}
