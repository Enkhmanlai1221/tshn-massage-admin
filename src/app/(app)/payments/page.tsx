"use client";

import { useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTeachers } from "@/lib/hooks";
import { BalanceTag, money, PURCHASE_METHOD_LABEL, studentName } from "@/lib/labels";
import { PurchaseModal } from "@/components/PurchaseModal";
import { AdjustmentModal } from "@/components/AdjustmentModal";

/**
 * Сурагчийн төлбөр — ОРОЛТООР.
 *
 * Сурагч «сар» биш «N оролт» худалдаж авна (8, 16, 24 …). Сард 8-аас илүү
 * орох, эсвэл удаан хугацаанд цөөн орох нь элбэг тул сараар тэмдэглэх нь
 * үлдэгдлийг зөрүүлдэг байв.
 *
 *  - «Үлдэгдэл»: сурагч бүрийн төлсөн / орсон / үлдсэн оролт, өртэй нь эхэндээ.
 *  - «Түүх»: бүх төлбөр (QPay автоматаар, бэлэн/шилжүүлэг гараар), орлогын нийлбэр.
 */
export default function PaymentsPage() {
  return (
    <div>
      <Typography.Title level={4}>Сурагчийн төлбөр</Typography.Title>
      <Tabs
        items={[
          { key: "balance", label: "Үлдэгдэл", children: <BalanceTab /> },
          { key: "history", label: "Төлбөрийн түүх", children: <HistoryTab /> },
        ]}
      />
    </div>
  );
}

function BalanceTab() {
  const { can } = useAuth();
  const [teacher, setTeacher] = useState<string | undefined>();
  const [filter, setFilter] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<any | null>(null);
  const [adjusting, setAdjusting] = useState<any | null>(null);
  const { data: teachers } = useTeachers();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-balance", teacher],
    queryFn: async () =>
      (await api.get("/payment/balance", { params: { teacher } })).data,
  });

  const q = search.trim().toLowerCase();
  const rows = (data?.rows || []).filter((r: any) => {
    const b = r.balance;
    if (filter === "debt" && !(b.balance < 0)) return false;
    if (filter === "low" && !(b.hasRecords && b.balance >= 0 && b.balance <= 2)) return false;
    if (filter === "none" && b.hasRecords) return false;
    if (!q) return true;
    const s = r.student;
    return [s.code, s.firstName, s.lastName, s.phone, s.parentPhone]
      .filter(Boolean)
      .some((v: string) => String(v).toLowerCase().includes(q));
  });

  const canApprove = can("PAYMENT", "isApprove");
  const all = data?.rows || [];

  return (
    <Card size="small">
      <Space wrap style={{ marginBottom: 12, display: "flex" }}>
        <Input.Search
          allowClear
          placeholder="Код, нэр, утас"
          style={{ width: 220 }}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          allowClear
          placeholder="Багш"
          style={{ width: 170 }}
          options={(teachers || []).map((t: any) => ({ value: t._id, label: t.name }))}
          onChange={setTeacher}
        />
        <Select
          allowClear
          placeholder="Шүүлт"
          style={{ width: 170 }}
          options={[
            { value: "debt", label: "Өртэй (илүү орсон)" },
            { value: "low", label: "Дуусах дөхсөн (≤2)" },
            { value: "none", label: "Төлбөр бүртгээгүй" },
          ]}
          onChange={setFilter}
        />
      </Space>

      <Space size={48} style={{ marginBottom: 12 }}>
        <Statistic title="Сурагч" value={all.length} />
        <Statistic
          title="Өртэй"
          value={data?.inDebt ?? 0}
          valueStyle={{ color: "#ef4444" }}
        />
        <Statistic
          title="Дуусах дөхсөн"
          value={all.filter((r: any) => r.balance.hasRecords && r.balance.balance >= 0 && r.balance.balance <= 2).length}
          valueStyle={{ color: "#d97706" }}
        />
        <Statistic title="1 оролтын үнэ" value={money(data?.lessonPrice)} />
      </Space>

      <Table
        size="small"
        rowKey={(r: any) => r.student._id}
        loading={isLoading}
        dataSource={rows}
        pagination={{ pageSize: 30, showSizeChanger: false }}
        columns={[
          { title: "Код", dataIndex: ["student", "code"], width: 110 },
          {
            title: "Сурагч",
            key: "name",
            render: (_, r: any) => studentName(r.student),
          },
          {
            title: "Хөгжим",
            dataIndex: ["student", "instrument", "name"],
            render: (v, r: any) => <Tag color={r.student.instrument?.color}>{v}</Tag>,
          },
          { title: "Багш", dataIndex: ["student", "teacher", "name"] },
          {
            title: "Утас",
            key: "phone",
            render: (_, r: any) => r.student.phone || r.student.parentPhone || "—",
          },
          {
            title: "Төлсөн / орсон",
            key: "used",
            width: 130,
            render: (_, r: any) =>
              r.balance.hasRecords ? `${r.balance.entitled} / ${r.balance.used}` : "—",
          },
          {
            title: "Үлдэгдэл",
            key: "balance",
            width: 140,
            sorter: (a: any, b: any) => a.balance.balance - b.balance.balance,
            render: (_, r: any) => <BalanceTag pkg={r.balance} />,
          },
          {
            title: "Сүүлд төлсөн",
            key: "last",
            width: 190,
            render: (_, r: any) =>
              r.lastPurchase ? (
                <Tooltip title={PURCHASE_METHOD_LABEL[r.lastPurchase.method]}>
                  {dayjs(r.lastPurchase.paidAt).format("YYYY-MM-DD")} ·{" "}
                  {r.lastPurchase.lessons} оролт
                </Tooltip>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
          ...(canApprove
            ? [
                {
                  title: "",
                  key: "act",
                  width: 190,
                  render: (_: any, r: any) => (
                    <Space size={4}>
                      <Button size="small" type="primary" ghost onClick={() => setPaying(r.student)}>
                        Төлбөр авах
                      </Button>
                      <Button size="small" onClick={() => setAdjusting(r)}>
                        ±
                      </Button>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      <PurchaseModal student={paying} open={!!paying} onClose={() => setPaying(null)} />
      <AdjustmentModal
        student={adjusting?.student ?? null}
        balance={adjusting?.balance?.balance ?? 0}
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
      />
    </Card>
  );
}

function HistoryTab() {
  const { message, modal } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [method, setMethod] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const params = {
    from: range[0].startOf("day").toISOString(),
    to: range[1].endOf("day").toISOString(),
    method,
    status,
    limit: 500,
  };
  const { data, isLoading } = useQuery({
    queryKey: ["purchases", params],
    queryFn: async () => (await api.get("/payment/purchase", { params })).data,
  });

  const voidIt = useMutation({
    mutationFn: async (p: { id: string; reason: string }) =>
      api.post(`/payment/purchase/${p.id}/void`, { reason: p.reason }),
    onSuccess: (res) => {
      message.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["payment-balance"] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const askVoid = (r: any) => {
    let reason = "";
    modal.confirm({
      title: `${r.lessons} оролтын төлбөрийг хүчингүй болгох уу?`,
      content: (
        <Input.TextArea
          rows={2}
          placeholder="Шалтгаан (заавал)"
          onChange={(e) => (reason = e.target.value)}
        />
      ),
      okText: "Хүчингүй болгох",
      okButtonProps: { danger: true },
      cancelText: "Болих",
      onOk: () => {
        if (reason.trim().length < 2) {
          message.error("Шалтгаанаа бичнэ үү.");
          return Promise.reject();
        }
        return voidIt.mutateAsync({ id: r._id, reason });
      },
    });
  };

  const t = data?.totals;
  return (
    <Card size="small">
      <Space wrap style={{ marginBottom: 12, display: "flex" }}>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
        />
        <Select
          allowClear
          placeholder="Арга"
          style={{ width: 160 }}
          options={Object.entries(PURCHASE_METHOD_LABEL).map(([value, label]) => ({ value, label }))}
          onChange={setMethod}
        />
        <Select
          allowClear
          placeholder="Төлөв"
          style={{ width: 140 }}
          options={[
            { value: "PAID", label: "Хүчинтэй" },
            { value: "VOID", label: "Хүчингүй" },
          ]}
          onChange={setStatus}
        />
      </Space>

      <Space size={48} style={{ marginBottom: 12 }} wrap>
        <Statistic title="Орлого" value={money(t?.amount)} />
        <Statistic title="Зарагдсан оролт" value={t?.lessons ?? 0} />
        <Statistic title="Төлбөрийн тоо" value={t?.count ?? 0} />
        {(t?.byMethod || []).map((m: any) => (
          <Statistic
            key={m.method}
            title={PURCHASE_METHOD_LABEL[m.method] || m.method}
            value={money(m.amount)}
          />
        ))}
      </Space>

      <Table
        size="small"
        rowKey="_id"
        loading={isLoading}
        dataSource={data?.rows || []}
        pagination={{ pageSize: 30, showSizeChanger: false }}
        columns={[
          {
            title: "Огноо",
            dataIndex: "paidAt",
            width: 110,
            render: (v) => dayjs(v).format("YYYY-MM-DD"),
          },
          { title: "Код", dataIndex: ["student", "code"], width: 110 },
          { title: "Сурагч", key: "name", render: (_, r: any) => studentName(r.student) },
          { title: "Оролт", dataIndex: "lessons", width: 80 },
          {
            title: "Дүн",
            dataIndex: "amount",
            width: 120,
            render: (v) => (v == null ? "—" : money(v)),
          },
          {
            title: "Арга",
            dataIndex: "method",
            width: 140,
            render: (v, r: any) => (
              <Tag>
                {PURCHASE_METHOD_LABEL[v] || v}
                {r.legacyMonthKey ? ` · ${r.legacyMonthKey}` : ""}
              </Tag>
            ),
          },
          {
            title: "Тэмдэглэл",
            key: "note",
            render: (_, r: any) =>
              r.status === "VOID" ? (
                <Tooltip title={r.voidReason}>
                  <Tag color="red">Хүчингүй</Tag> {r.voidReason}
                </Tooltip>
              ) : (
                r.note || ""
              ),
          },
          ...(can("PAYMENT", "isApprove")
            ? [
                {
                  title: "",
                  key: "act",
                  width: 110,
                  render: (_: any, r: any) =>
                    r.status === "PAID" ? (
                      <Button size="small" danger type="text" onClick={() => askVoid(r)}>
                        Хүчингүй
                      </Button>
                    ) : null,
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
