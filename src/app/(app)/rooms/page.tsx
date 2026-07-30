"use client";

import { useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Drawer,
  List,
  Space,
  Popconfirm,
  App,
  Typography,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CrudPage from "@/components/CrudPage";
import { api, apiError } from "@/lib/api";

// Тухайн өрөөний орнуудыг удирдах Drawer
function BedsDrawer({
  room,
  onClose,
}: {
  room: any | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: beds, isLoading } = useQuery({
    queryKey: ["beds", room?._id],
    queryFn: async () =>
      (await api.get("/bed", { params: { room: room._id, limit: 50 } })).data
        .rows,
    enabled: !!room,
  });

  const addBed = useMutation({
    mutationFn: async () =>
      api.post("/bed", { name: name.trim(), room: room._id }),
    onSuccess: () => {
      setName("");
      message.success("Ор нэмлээ");
      qc.invalidateQueries({ queryKey: ["beds", room?._id] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const delBed = useMutation({
    mutationFn: async (id: string) => api.delete(`/bed/${id}`),
    onSuccess: () => {
      message.success("Устгалаа");
      qc.invalidateQueries({ queryKey: ["beds", room?._id] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  return (
    <Drawer
      title={room ? `${room.name} — орнууд` : ""}
      open={!!room}
      onClose={onClose}
      width={400}
    >
      <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
        <Input
          placeholder="Орны нэр (ж: Ор 1)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={() => name.trim() && addBed.mutate()}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={addBed.isPending}
          onClick={() => name.trim() && addBed.mutate()}
        >
          Нэмэх
        </Button>
      </Space.Compact>
      <List
        loading={isLoading}
        dataSource={beds || []}
        locale={{ emptyText: "Ор алга" }}
        renderItem={(bed: any) => (
          <List.Item
            actions={[
              <Popconfirm
                key="del"
                title="Устгах уу?"
                onConfirm={() => delBed.mutate(bed._id)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            {bed.name}
          </List.Item>
        )}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        Нэг өрөөнд 1–3 ор. Ор бол гол захиалгын нэгж.
      </Typography.Paragraph>
    </Drawer>
  );
}

export default function RoomsPage() {
  const [bedsRoom, setBedsRoom] = useState<any | null>(null);

  return (
    <>
      <CrudPage
        title="Өрөө / ор"
        endpoint="/room"
        permission="ROOM"
        queryKey="rooms"
        columns={[
          { title: "Нэр", dataIndex: "name", key: "name" },
          {
            title: "Идэвхтэй",
            dataIndex: "isActive",
            key: "isActive",
            render: (v) => (v ? "Тийм" : "Үгүй"),
          },
          {
            title: "Ор",
            key: "beds",
            render: (_, r: any) => (
              <Button size="small" onClick={() => setBedsRoom(r)}>
                Ор удирдах
              </Button>
            ),
          },
        ]}
        toPayload={(v) => ({ ...v, isActive: v.isActive ?? true })}
        renderFormItems={() => (
          <>
            <Form.Item
              name="name"
              label="Өрөөний нэр"
              rules={[{ required: true, message: "Нэр оруулна уу" }]}
            >
              <Input placeholder="Өрөө 1" />
            </Form.Item>
            <Form.Item name="sort" label="Эрэмбэ">
              <InputNumber min={0} style={{ width: "100%" }} />
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
      <BedsDrawer room={bedsRoom} onClose={() => setBedsRoom(null)} />
    </>
  );
}
