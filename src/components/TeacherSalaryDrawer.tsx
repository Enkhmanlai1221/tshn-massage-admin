"use client";

import { useEffect, useState } from "react";
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  InputNumber,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, studentName } from "@/lib/labels";

/**
 * БАГШИЙН ЦАЛИНГИЙН ХУУДАС — сурагч бүрээр задалсан оролт.
 *
 * «Энэ сурагчаас хэдэн оролтын цалинг аль хэдийн авсан бэ» гэдгийг мөр
 * бүрээс шууд тэмдэглэнэ. Үлдсэн оролт бүр ханшаараа цалинжих тул
 * үлдэгдэл × ханш = олгох дүн.
 *
 * Зөвхөн ГАРААР оруулсан оролтын тоолуур засагдана. Системд ирц тавигдсан
 * хичээлийн цалинг цуцлах нь олголтын бүртгэл эргүүлэхийг шаардах тул
 * «Цалин» цэсний ердийн урсгалаар явна.
 */
/**
 * «Цалингаа авсан» тоо — БИЧИЖ ДУУСМАГЦ хадгална (Enter эсвэл фокус алдах үед).
 *
 * Товшилт/товчлуур бүрд хадгалдаг байсан нь завсрын утгыг (ж: «12» бичихэд
 * эхлээд «1») сервер рүү илгээж, дахин ачаалалттай уралдан буруу тоо
 * үлдээдэг байв. Тиймээс утгыг эндээ барьж, ганц удаа илгээнэ.
 */
function PaidInput({
  value,
  max,
  disabled,
  onCommit,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(value);

  // Сервер талын утга шинэчлэгдвэл (хадгалсны дараа, сар солиход) дагана.
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft === null) return setDraft(value);
    const next = Math.min(Math.max(Math.trunc(draft), 0), max);
    if (next === value) return setDraft(value);
    onCommit(next);
  };

  return (
    <InputNumber
      size="small"
      min={0}
      max={max}
      style={{ width: 64 }}
      value={draft}
      disabled={disabled}
      onChange={(v) => setDraft(v as number | null)}
      onBlur={commit}
      onPressEnter={commit}
    />
  );
}

export default function TeacherSalaryDrawer({
  teacherId,
  onClose,
}: {
  teacherId: string | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const monthKey = month.format("YYYY-MM");

  const canWrite = can("SALARY", "isWrite");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-salary-sheet", teacherId, monthKey],
    queryFn: async () =>
      (
        await api.get(`/teacher/${teacherId}/salary-sheet`, {
          params: { monthKey },
        })
      ).data,
    enabled: !!teacherId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["teacher-salary-sheet", teacherId] });
    qc.invalidateQueries({ queryKey: ["teachers"] });
    qc.invalidateQueries({ queryKey: ["salary"] });
  };

  const save = useMutation({
    mutationFn: async (p: {
      student: string;
      count: number;
      paidBefore: number;
    }) => api.put(`/teacher/${teacherId}/salary-sheet`, { ...p, monthKey }),
    onSuccess: (res) => {
      message.success(res.data.message);
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  /** Бүх сурагчийн үлдэгдлийг «цалингаа авсан» болгож жигдрүүлнэ. */
  const levelAll = useMutation({
    mutationFn: async () => {
      const targets = (data?.rows || []).filter(
        (r: any) => r.prior > r.paidBefore + r.payoutCount,
      );
      for (const r of targets) {
        await api.put(`/teacher/${teacherId}/salary-sheet`, {
          student: r.student._id,
          count: r.prior,
          paidBefore: r.prior - r.payoutCount,
          monthKey,
        });
      }
      return targets.length;
    },
    onSuccess: (n) => {
      message.success(`${n} сурагчийн оролт цалинжсан гэж тэмдэглэгдлээ.`);
      refresh();
    },
    onError: (e) => message.error(apiError(e)),
  });

  const t = data?.totals;
  const busy = save.isPending || levelAll.isPending;

  return (
    <Drawer
      title={
        data?.teacher
          ? `${data.teacher.name} — цалингийн хуудас`
          : "Цалингийн хуудас"
      }
      open={!!teacherId}
      onClose={onClose}
      width={900}
      loading={isLoading}
    >
      {data && (
        <>
          <Space wrap style={{ marginBottom: 12 }}>
            <DatePicker
              picker="month"
              value={month}
              onChange={(v) => v && setMonth(v)}
              allowClear={false}
              format="YYYY-MM"
            />
            <Tag color={data.teacher.instrument?.color}>
              {data.teacher.instrument?.name}
            </Tag>
            <Typography.Text type="secondary">
              1 оролт = {money(data.teacher.instrument?.lessonRate)}
            </Typography.Text>
          </Space>

          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Нийт оролт"
                  value={t.entries}
                  suffix={
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      / {t.activeStudents} сурагч
                    </Typography.Text>
                  }
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Цалингаа авсан" value={t.paid} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Үлдэгдэл оролт"
                  value={t.remaining}
                  valueStyle={{ color: t.remaining ? "#d46b08" : undefined }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Олгох дүн"
                  value={money(t.amount)}
                  valueStyle={{ color: t.amount ? "#cf1322" : undefined }}
                />
              </Card>
            </Col>
          </Row>

          {canWrite && t.remaining > 0 && (
            <Popconfirm
              title="Бүх үлдэгдлийг цалинжсан гэж тэмдэглэх үү?"
              description={`${t.remaining} оролт «цалингаа авсан» болно. Дараа нь мөр бүр дээр засаж болно.`}
              okText="Тийм"
              cancelText="Болих"
              onConfirm={() => levelAll.mutate()}
            >
              <Button
                style={{ marginBottom: 12 }}
                loading={levelAll.isPending}
                disabled={busy}
              >
                Бүгдийг «цалинжсан» болгож жигдрүүлэх
              </Button>
            </Popconfirm>
          )}

          <Table
            size="small"
            rowKey={(r: any) => r.student._id}
            dataSource={(data.rows || []).filter((r: any) => r.entries > 0)}
            pagination={false}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <b>Нийт</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <b>{t.entries}</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <b>{t.paid}</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4}>
                  <b>{t.remaining}</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <b>{money(t.amount)}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            columns={[
              {
                title: "Сурагч",
                key: "name",
                render: (_, r: any) => (
                  <Space size={4}>
                    {studentName(r.student)}
                    {r.notPayable > 0 && (
                      <Tooltip
                        title={`${r.notPayable} тасалт сануулгад тооцогдож цалинд ороогүй`}
                      >
                        <Tag color="orange">−{r.notPayable}</Tag>
                      </Tooltip>
                    )}
                  </Space>
                ),
              },
              {
                title: "Оролт",
                key: "entries",
                width: 130,
                render: (_, r: any) =>
                  r.lessons > 0 ? (
                    <Tooltip
                      title={`системд ${r.lessons} + гараар ${r.prior}`}
                    >
                      <Tag>{r.entries}</Tag>
                    </Tooltip>
                  ) : (
                    <Tag>{r.entries}</Tag>
                  ),
              },
              {
                title: "Цалингаа авсан",
                key: "paid",
                width: 210,
                render: (_, r: any) => (
                  <Space size={4}>
                    <PaidInput
                      value={r.paidBefore}
                      max={r.prior}
                      disabled={!canWrite || busy || r.prior === 0}
                      onCommit={(v) =>
                        save.mutate({
                          student: r.student._id,
                          count: r.prior,
                          paidBefore: v,
                        })
                      }
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      / {r.prior}
                    </Typography.Text>
                    {(r.lessonsPaid > 0 || r.payoutCount > 0) && (
                      <Tooltip title="Системийн олголтоор цалинжсан — засагдахгүй">
                        <Tag color="green">
                          +{r.lessonsPaid + r.payoutCount}
                        </Tag>
                      </Tooltip>
                    )}
                  </Space>
                ),
              },
              {
                title: "Багц",
                key: "package",
                width: 150,
                render: (_, r: any) => {
                  const pk = r.package;
                  if (!pk || pk.paidMonths === 0) {
                    return (
                      <Typography.Text type="secondary">
                        төлбөргүй
                      </Typography.Text>
                    );
                  }
                  return (
                    <Tooltip
                      title={`${pk.paidMonths} сар төлсөн = ${pk.entitled} оролт, ${pk.used} нь орсон`}
                    >
                      {pk.balance >= 0 ? (
                        <Tag color="blue">
                          {pk.used}/{pk.entitled} · үлдсэн {pk.balance}
                        </Tag>
                      ) : (
                        <Tag color="red">
                          {pk.used}/{pk.entitled} · {Math.abs(pk.balance)} илүү
                        </Tag>
                      )}
                    </Tooltip>
                  );
                },
              },
              {
                title: "Үлдэгдэл",
                key: "remaining",
                width: 100,
                render: (_, r: any) => (
                  <Tag color={r.remaining ? "orange" : "green"}>
                    {r.remaining} оролт
                  </Tag>
                ),
              },
              {
                title: "Олгох дүн",
                key: "amount",
                width: 120,
                render: (_, r: any) => (
                  <b>{r.amount ? money(r.amount) : "—"}</b>
                ),
              },
            ]}
          />

          <Alert
            type="info"
            showIcon
            style={{ marginTop: 12 }}
            message="Үлдсэн оролт бүр ханшаараа цалинжина"
            description="«Цалингаа авсан» тоог засахад үлдэгдэл шууд өөрчлөгдөнө. Системийн олголтод орсон оролтыг эндээс буулгах боломжгүй — тэр нь «Цалин» цэсний бүртгэлээр хамгаалагдана."
          />
        </>
      )}
    </Drawer>
  );
}
