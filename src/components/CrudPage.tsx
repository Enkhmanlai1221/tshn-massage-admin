"use client";

import { useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Space,
  Table,
  Typography,
  App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export interface CrudPageProps {
  title: string;
  endpoint: string; // "/service" гэх мэт
  permission: string;
  queryKey: string;
  columns: ColumnsType<any>;
  renderFormItems: (editing: any | null) => React.ReactNode;
  toInitialValues?: (record: any) => any;
  toPayload?: (values: any) => any;
  searchable?: boolean;
  drawerWidth?: number;
  extraListParams?: Record<string, any>;
}

export default function CrudPage({
  title,
  endpoint,
  permission,
  queryKey,
  columns,
  renderFormItems,
  toInitialValues,
  toPayload,
  searchable = true,
  drawerWidth = 520,
  extraListParams,
}: CrudPageProps) {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page, search, extraListParams],
    queryFn: async () => {
      const { data } = await api.get(endpoint, {
        params: { page, limit, query: search, ...extraListParams },
      });
      return data as { rows: any[]; count: number };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = toPayload ? toPayload(values) : values;
      if (editing) return api.put(`${endpoint}/${editing._id}`, payload);
      return api.post(endpoint, payload);
    },
    onSuccess: () => {
      message.success("Хадгаллаа");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      qc.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      message.success("Устгалаа");
      qc.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(toInitialValues ? toInitialValues(record) : record);
    setOpen(true);
  };

  const actionColumn: ColumnsType<any> = [
    {
      title: "Үйлдэл",
      key: "actions",
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          {can(permission, "isEdit") && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          )}
          {can(permission, "isRemove") && (
            <Popconfirm
              title="Устгах уу?"
              onConfirm={() => deleteMutation.mutate(record._id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {can(permission, "isWrite") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Нэмэх
          </Button>
        )}
      </div>
      {searchable && (
        <Input.Search
          placeholder="Хайх..."
          allowClear
          style={{ maxWidth: 320, marginBottom: 16 }}
          onSearch={(v) => {
            setPage(1);
            setSearch(v);
          }}
        />
      )}
      <Table
        bordered
        rowKey="_id"
        loading={isLoading}
        columns={[...columns, ...actionColumn]}
        dataSource={data?.rows || []}
        pagination={{
          current: page,
          pageSize: limit,
          total: data?.count || 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        scroll={{ x: true }}
      />
      <Drawer
        title={editing ? "Засах" : "Шинэ"}
        open={open}
        width={drawerWidth}
        onClose={closeForm}
        footer={
          <Space style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={closeForm}>Болих</Button>
            <Button
              type="primary"
              loading={saveMutation.isPending}
              onClick={() => form.submit()}
            >
              Хадгалах
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate(values)}
        >
          {renderFormItems(editing)}
        </Form>
      </Drawer>
    </div>
  );
}
