"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { studentName } from "@/lib/labels";

const QUICK = [-3, -2, -1, 1, 2, 3];

/** Үлдэгдэлд нөлөөлсөн тул шинэчлэх query-ууд. */
const INVALIDATE = [
  "payment-balance",
  "students",
  "student-prior",
  "student",
  "adjustments",
  "teacher-salary-sheet",
];

/**
 * ОРОЛТ ЗАСАХ — админ сурагчийн оролтын эрхийг +N / −N засна, шалтгаантай.
 *
 * Мөнгөгүй (орлогод орохгүй), зөвхөн үлдэгдэлд. Залруулга бүр түүхэнд
 * үлдэнэ; буруу оруулсныг «Буцаах»-аар хүчингүй болгоно.
 */
export function AdjustmentModal({
  student,
  balance,
  open,
  onClose,
}: {
  student: any | null;
  /** Одоогийн үлдэгдэл (урьдчилан харуулахад). */
  balance?: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [delta, setDelta] = useState<number>(1);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setDelta(1);
      setReason("");
    }
  }, [open]);

  const studentId = student?._id;
  const { data: history } = useQuery({
    queryKey: ["adjustments", studentId],
    enabled: open && !!studentId,
    queryFn: async () => (await api.get(`/payment/${studentId}/adjustment`)).data,
  });

  const refresh = () => {
    for (const key of INVALIDATE) qc.invalidateQueries({ queryKey: [key] });
  };

  const save = useMutation({
    mutationFn: async () =>
      api.post(`/payment/${studentId}/adjustment`, { delta, reason }),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const undo = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/payment/adjustment/${id}/void`, { reason: "Андуурч оруулсан" }),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const canEdit = can("PAYMENT", "isApprove");
  const valid = delta !== 0 && reason.trim().length >= 2;
  const after = balance != null ? balance + delta : null;

  return (
    <Modal
      open={open}
      title={`Оролт засах — ${student ? studentName(student) : ""}`}
      okText={delta > 0 ? `+${delta} оролт нэмэх` : `${delta} оролт хасах`}
      okButtonProps={{ danger: delta < 0, disabled: !valid || !canEdit }}
      cancelText="Болих"
      onCancel={onClose}
      onOk={() => save.mutate()}
      confirmLoading={save.isPending}
      width={560}
      destroyOnClose
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap>
          {QUICK.map((n) => (
            <Button
              key={n}
              type={delta === n ? "primary" : "default"}
              danger={n < 0}
              onClick={() => setDelta(n)}
            >
              {n > 0 ? `+${n}` : n}
            </Button>
          ))}
          <InputNumber
            value={delta}
            min={-96}
            max={96}
            style={{ width: 90 }}
            onChange={(v) => setDelta(Math.trunc(Number(v) || 0))}
          />
        </Space>

        {after != null && (
          <Typography.Text>
            Үлдэгдэл: <b>{balance}</b> → <b style={{ color: after < 0 ? "#dc2626" : undefined }}>{after}</b>
          </Typography.Text>
        )}

        <Input.TextArea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Шалтгаан (заавал): урамшуулал, импортын зөрүү, буруу ирц г.м."
        />

        <Typography.Text type="secondary">
          Мөнгөн дүнд нөлөөлөхгүй — төлбөр авсан бол «Төлбөр авах»-ыг ашиглана уу.
        </Typography.Text>

        {(history?.rows?.length ?? 0) > 0 && (
          <Table
            size="small"
            rowKey="_id"
            pagination={false}
            dataSource={history.rows}
            scroll={{ y: 200 }}
            columns={[
              {
                title: "Огноо",
                dataIndex: "createdAt",
                width: 95,
                render: (v) => dayjs(v).format("YYYY-MM-DD"),
              },
              {
                title: "Оролт",
                dataIndex: "delta",
                width: 70,
                render: (v, r: any) => (
                  <Tag color={r.voidedAt ? "default" : v > 0 ? "green" : "red"}>
                    {v > 0 ? `+${v}` : v}
                  </Tag>
                ),
              },
              {
                title: "Шалтгаан",
                dataIndex: "reason",
                render: (v, r: any) => (
                  <span style={{ textDecoration: r.voidedAt ? "line-through" : undefined }}>
                    {v}
                    {r.createdBy?.name ? ` · ${r.createdBy.name}` : ""}
                  </span>
                ),
              },
              {
                title: "",
                key: "act",
                width: 80,
                render: (_, r: any) =>
                  r.voidedAt ? (
                    <Typography.Text type="secondary">буцаасан</Typography.Text>
                  ) : canEdit ? (
                    <Popconfirm
                      title="Энэ залруулгыг буцаах уу?"
                      okText="Буцаах"
                      cancelText="Үгүй"
                      onConfirm={() => undo.mutate(r._id)}
                    >
                      <Button size="small" type="text" danger>
                        Буцаах
                      </Button>
                    </Popconfirm>
                  ) : null,
              },
            ]}
          />
        )}
      </Space>
    </Modal>
  );
}
