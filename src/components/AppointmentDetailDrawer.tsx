"use client";

import { useEffect, useRef, useState } from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Select,
  Button,
  Space,
  Divider,
  InputNumber,
  Spin,
  Popconfirm,
  App,
  Typography,
  Alert,
  QRCode,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiError } from "@/lib/api";
import { StatusTag, STATUS_LABEL, METHOD_LABEL } from "@/lib/labels";

// Төлбөрөөс өмнөх гар аргаар тохируулах төлвүүд.
// "Дууссан" төлөв нь зөвхөн төлбөр бүртгэснээр тавигдана (доорх товч).
const STATUS_OPTIONS = [
  { value: "BOOKED", label: STATUS_LABEL.BOOKED },
  { value: "CONFIRMED", label: STATUS_LABEL.CONFIRMED },
  { value: "NO_SHOW", label: STATUS_LABEL.NO_SHOW },
];

const METHODS = [
  { value: "CASH", label: METHOD_LABEL.CASH },
  { value: "CARD", label: METHOD_LABEL.CARD },
];

interface Props {
  appointmentId: string | null;
  onClose: () => void;
}

export default function AppointmentDetailDrawer({
  appointmentId,
  onClose,
}: Props) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [therapistId, setTherapistId] = useState<string>();
  const [payMethod, setPayMethod] = useState("CASH");
  const [loyaltyUse, setLoyaltyUse] = useState(0);
  // Оноогоор төлүүлэх QR token (хэрэглэгч утсаараа уншина).
  const [qrToken, setQrToken] = useState<string | null>(null);

  const { data: appt, isLoading } = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => (await api.get(`/appointment/${appointmentId}`)).data,
    enabled: !!appointmentId,
    // QR идэвхтэй үед захиалгыг тогтмол дахин ачаалж, оноо хасагдсан/дууссаныг барина.
    refetchInterval: qrToken ? 3000 : false,
  });

  const { data: therapists } = useQuery({
    queryKey: ["therapists-select"],
    queryFn: async () =>
      (await api.get("/therapist", { params: { limit: 200 } })).data.rows,
    enabled: !!appointmentId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["appointments-calendar"] });
    qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
  };

  const assign = useMutation({
    mutationFn: async () =>
      api.put(`/appointment/${appointmentId}/assign-therapist`, {
        therapistId,
      }),
    onSuccess: () => {
      message.success("Бариач оноолоо");
      invalidate();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const changeStatus = useMutation({
    mutationFn: async (status: string) =>
      api.put(`/appointment/${appointmentId}/status`, { status }),
    onSuccess: () => {
      message.success("Төлөв шинэчлэгдлээ");
      invalidate();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const cancel = useMutation({
    mutationFn: async () => api.put(`/appointment/${appointmentId}/cancel`),
    onSuccess: () => {
      message.success("Цуцаллаа");
      invalidate();
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const pay = useMutation({
    mutationFn: async () =>
      api.post("/payment", {
        appointmentId,
        method: payMethod,
        loyaltyPointsUsed: loyaltyUse || 0,
      }),
    onSuccess: () => {
      message.success("Төлбөр бүртгэлээ");
      invalidate();
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const genQr = useMutation({
    mutationFn: async () =>
      (await api.post("/payment/redeem-qr", { appointmentId })).data,
    onSuccess: (data) => setQrToken(data.token),
    onError: (e) => message.error(apiError(e)),
  });

  // Бүлгийн (тур) захиалгын бүх гишүүний төлбөрийг нэг дор бүртгэнэ.
  const payGroup = useMutation({
    mutationFn: async () =>
      (
        await api.post("/payment/group", {
          groupCode: appt?.groupCode,
          method: payMethod,
        })
      ).data,
    onSuccess: (res) => {
      const skipped = res.skippedCount
        ? ` · ${res.skippedCount} аль хэдийн төлөгдсөн`
        : "";
      message.success(
        `Бүлгийн төлбөр бүртгэлээ · ${res.paidCount} захиалга · ${res.totalAmount?.toLocaleString()}₮${skipped}`,
      );
      invalidate();
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const net = appt ? (appt.price || 0) - (appt.discount || 0) : 0;
  const applied = appt?.loyaltyApplied || 0;
  const remaining = Math.max(0, net - applied);

  // QR идэвхтэй үед оноо хасагдсан / захиалга дууссаныг polling-оор барьж мэдэгдэнэ.
  const prevApplied = useRef(applied);
  useEffect(() => {
    if (!qrToken) return;
    if (appt?.status === "COMPLETED") {
      message.success("Оноогоор бүрэн төлөгдөж, захиалга дууслаа");
      setQrToken(null);
      invalidate();
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    } else if (applied > prevApplied.current) {
      message.success(
        `Хэрэглэгч ${(applied - prevApplied.current).toLocaleString()} оноо ашиглалаа`,
      );
      setQrToken(null); // үлдэгдлийг admin бэлэн/картаар авна
    }
    prevApplied.current = applied;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.status, applied, qrToken]);

  // Захиалга солигдоход QR-ыг цэвэрлэнэ.
  useEffect(() => {
    setQrToken(null);
    setLoyaltyUse(0);
  }, [appointmentId]);

  return (
    <Drawer
      title={appt ? `Захиалга ${appt.code}` : "Захиалга"}
      open={!!appointmentId}
      onClose={onClose}
      width={440}
    >
      {isLoading || !appt ? (
        <Spin />
      ) : (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Үйлчлүүлэгч">
              {appt.customer?.firstName} {appt.customer?.lastName}
              <br />
              {appt.customer?.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Үйлчилгээ">
              {appt.serviceName} · {appt.variantName} ({appt.duration} мин)
            </Descriptions.Item>
            <Descriptions.Item label="Цаг">
              {dayjs(appt.startAt).format("MM/DD HH:mm")}–
              {dayjs(appt.endAt).format("HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label="Ор / өрөө">
              {appt.bed?.name} · {appt.room?.name}
              {appt.exclusiveRoom && <Tag color="orange">Дангаар</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Бариач">
              {appt.therapist?.name || <Tag color="gold">Хуваарилаагүй</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Үнэ">
              {net.toLocaleString()}₮
              {appt.discount > 0 && ` (−${appt.discount.toLocaleString()})`}
            </Descriptions.Item>
            <Descriptions.Item label="Төлөв">
              <StatusTag status={appt.status} />
            </Descriptions.Item>
            {appt.tourOperator && (
              <Descriptions.Item label="Оператор">
                {appt.tourOperator.name} ({appt.commissionPercent}%)
              </Descriptions.Item>
            )}
          </Descriptions>

          {appt.groupCode && (
            <>
              <Divider orientation="left">
                Бүлгийн захиалга · {appt.groupCode}
              </Divider>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Alert
                  type="info"
                  showIcon
                  message="Энэ захиалга бүлгийн нэг хэсэг. Доорх товч бүлгийн БҮХ гишүүний төлбөрийг нэг дор бүртгэнэ (аль хэдийн төлөгдсөнийг алгасна)."
                />
                <Popconfirm
                  title="Бүлгийн бүх төлбөрийг бүртгэх үү?"
                  description={`Төлбөрийн хэлбэр: ${METHOD_LABEL[payMethod] || payMethod}`}
                  onConfirm={() => payGroup.mutate()}
                >
                  <Button block loading={payGroup.isPending}>
                    Бүх бүлгийн төлбөрийг нэг дор авах
                  </Button>
                </Popconfirm>
              </Space>
            </>
          )}

          {appt.status !== "CANCELED" && appt.status !== "COMPLETED" && (
            <>
              <Divider orientation="left">Бариач хуваарилах</Divider>
              <Space.Compact style={{ width: "100%" }}>
                <Select
                  style={{ flex: 1 }}
                  placeholder="Бариач"
                  value={therapistId}
                  onChange={setTherapistId}
                  options={(therapists || []).map((t: any) => ({
                    value: t._id,
                    label: t.name,
                  }))}
                />
                <Button
                  type="primary"
                  disabled={!therapistId}
                  loading={assign.isPending}
                  onClick={() => assign.mutate()}
                >
                  Оноох
                </Button>
              </Space.Compact>

              <Divider orientation="left">Төлөв</Divider>
              <Select
                style={{ width: "100%" }}
                value={appt.status}
                options={STATUS_OPTIONS}
                onChange={(v) => changeStatus.mutate(v)}
              />
              <Typography.Text
                type="secondary"
                style={{ display: "block", marginTop: 6 }}
              >
                Захиалгыг дуусгахын тулд доор төлбөр бүртгэнэ үү.
              </Typography.Text>

              <Divider orientation="left">Төлбөр авах</Divider>
              <Space direction="vertical" style={{ width: "100%" }}>
                {applied > 0 && (
                  <Alert
                    type="success"
                    showIcon
                    message={`Оноогоор хасагдсан: ${applied.toLocaleString()}₮ · Үлдэгдэл төлбөр: ${remaining.toLocaleString()}₮`}
                  />
                )}

                {/* Оноогоор төлүүлэх — Admin QR үүсгэж, хэрэглэгч утсаараа уншина. */}
                {appt.customer && remaining > 0 && (
                  <>
                    {qrToken ? (
                      <Space
                        direction="vertical"
                        align="center"
                        style={{ width: "100%" }}
                      >
                        <QRCode value={qrToken} size={180} />
                        <Typography.Text type="secondary">
                          Хэрэглэгч апп-аараа уншиж оноогоо ашиглана. Хүлээж
                          байна… <Spin size="small" />
                        </Typography.Text>
                        <Button size="small" onClick={() => setQrToken(null)}>
                          QR болих
                        </Button>
                      </Space>
                    ) : (
                      <Button
                        block
                        loading={genQr.isPending}
                        disabled={!(appt.customer?.loyaltyBalance > 0)}
                        onClick={() => genQr.mutate()}
                      >
                        Оноогоор төлүүлэх (QR үүсгэх)
                      </Button>
                    )}
                  </>
                )}

                <Space>
                  <Select
                    value={payMethod}
                    onChange={setPayMethod}
                    options={METHODS}
                    style={{ width: 120 }}
                  />
                  <InputNumber
                    addonBefore="Оноо"
                    min={0}
                    max={Math.min(appt.customer?.loyaltyBalance || 0, remaining)}
                    value={loyaltyUse}
                    onChange={(v) => setLoyaltyUse(v || 0)}
                  />
                </Space>
                <Typography.Text type="secondary">
                  Төлөх дүн: {Math.max(0, remaining - loyaltyUse).toLocaleString()}
                  ₮ · Оноо үлдэгдэл: {appt.customer?.loyaltyBalance || 0}
                </Typography.Text>
                <Button
                  type="primary"
                  block
                  loading={pay.isPending}
                  onClick={() => pay.mutate()}
                >
                  Төлбөр бүртгэх & дуусгах
                </Button>
              </Space>

              <Divider />
              <Popconfirm title="Цуцлах уу?" onConfirm={() => cancel.mutate()}>
                <Button danger block loading={cancel.isPending}>
                  Захиалга цуцлах
                </Button>
              </Popconfirm>
            </>
          )}

          {appt.status === "COMPLETED" && (
            <Alert
              style={{ marginTop: 16 }}
              type="success"
              showIcon
              message="Энэ захиалга дууссан — төлбөр бүртгэгдсэн."
            />
          )}
          {appt.status === "CANCELED" && (
            <Alert
              style={{ marginTop: 16 }}
              type="error"
              showIcon
              message="Энэ захиалга цуцлагдсан."
            />
          )}
        </>
      )}
    </Drawer>
  );
}
