"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Empty, InputNumber, Segmented, Skeleton } from "antd";
import { CheckCircleFilled, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";

/**
 * ОРОЛТЫН ҮЛДЭГДЭЛ ТААРУУЛАХ — ТҮР ХЭРЭГСЭЛ.
 *
 * Админы буруу бүртгэлээс зөрсөн үлдэгдлийг багш өөрийн сурагч бүр дээр
 * «одоо үлдсэн оролт = N» гэж оруулж жигдрүүлнэ. Сервер зөрүүгээр нь
 * залруулга үүсгэнэ — мөнгөн төлбөрт нөлөөлөхгүй, түүх нь админд харагдана.
 *
 * Жигдрүүлж дууссаны дараа энэ хуудас болон tab-ыг хасна.
 */
export default function TeacherBalancePage() {
  const [filter, setFilter] = useState<"todo" | "all">("todo");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-balance"],
    queryFn: async () => (await teacherApi.get("/balance")).data,
  });

  const rows: any[] = useMemo(() => data?.rows ?? [], [data]);
  const shown = filter === "todo" ? rows.filter((r) => !r.reconciledAt) : rows;
  const total = data?.count ?? 0;
  const done = data?.reconciled ?? 0;

  return (
    <div style={{ paddingBottom: 72 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
          Оролт тааруулах
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Сурагч бүрийн <b>одоо үлдсэн</b> оролтыг зөв тоогоор оруулаад
          хадгална уу. Мөнгөн төлбөрт нөлөөлөхгүй.
        </div>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <div
            className="lesson-card"
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Тааруулсан</div>
              <div
                style={{
                  height: 6,
                  background: "#f0f1f3",
                  borderRadius: 3,
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: `${total ? Math.round((done / total) * 100) : 0}%`,
                    height: "100%",
                    background: "#16a34a",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {done}
              <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 400 }}>
                {" "}
                / {total}
              </span>
            </div>
          </div>

          <Segmented
            block
            value={filter}
            onChange={(v) => setFilter(v as "todo" | "all")}
            options={[
              { value: "todo", label: `Тааруулаагүй (${total - done})` },
              { value: "all", label: `Бүгд (${total})` },
            ]}
            style={{ marginBottom: 10 }}
          />

          {shown.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                filter === "todo" && total > 0
                  ? "Бүх сурагчийн үлдэгдлийг тааруулсан байна"
                  : "Сурагч алга"
              }
            />
          ) : (
            <div className="row-card">
              {shown.map((r) => (
                <BalanceRow
                  key={r._id}
                  row={r}
                  min={data?.min ?? -96}
                  max={data?.max ?? 96}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BalanceRow({ row, min, max }: { row: any; min: number; max: number }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const current: number = row.balance?.balance ?? 0;
  const [value, setValue] = useState<number>(current);

  // Хадгалсны дараа (эсвэл өөр газраас өөрчлөгдвөл) шинэ утгаас эхэлнэ.
  useEffect(() => setValue(current), [current]);

  const save = useMutation({
    mutationFn: async () =>
      (await teacherApi.put(`/balance/${row._id}`, { remaining: value })).data,
    onSuccess: (res) => {
      message.success(res.message);
      qc.invalidateQueries({ queryKey: ["teacher-balance"] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-student"] });
    },
    onError: (e) => message.error(teacherApiError(e)),
  });

  const changed = value !== current;
  const name = [row.lastName ? `${row.lastName.slice(0, 1)}.` : "", row.firstName]
    .filter(Boolean)
    .join("");
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lesson-card__name" style={{ fontWeight: 600, fontSize: 15 }}>
            {name}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {row.code} · Системд:{" "}
            {current < 0 ? (
              <b style={{ color: "#b45309" }}>{Math.abs(current)} хэтэрсэн</b>
            ) : (
              <b style={{ color: "#111827" }}>үлдсэн {current}</b>
            )}
          </div>
        </div>
        {row.reconciledAt && (
          <div style={{ fontSize: 12, color: "#16a34a", flexShrink: 0, marginTop: 2 }}>
            <CheckCircleFilled /> {dayjs(row.reconciledAt).format("MM-DD")}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 10,
        }}
      >
        <Button
          icon={<MinusOutlined />}
          onClick={() => setValue((v) => clamp(v - 1))}
          aria-label="Хасах"
          style={{ width: 40, height: 40, flexShrink: 0 }}
        />
        <InputNumber
          value={value}
          min={min}
          max={max}
          precision={0}
          inputMode="numeric"
          controls={false}
          onChange={(v) => setValue(clamp(Math.trunc(Number(v ?? 0))))}
          size="large"
          className="balance-input"
          style={{ width: 64 }}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => setValue((v) => clamp(v + 1))}
          aria-label="Нэмэх"
          style={{ width: 40, height: 40, flexShrink: 0 }}
        />
        <Button
          type={changed ? "primary" : "default"}
          loading={save.isPending}
          onClick={() => save.mutate()}
          style={{ marginLeft: "auto", height: 40 }}
        >
          {changed ? "Хадгалах" : "Зөв"}
        </Button>
      </div>

      {changed && (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
          {current} → <b style={{ color: "#111827" }}>{value}</b> (
          {value - current > 0 ? `+${value - current}` : value - current} оролт)
          {value < 0 && (
            <span style={{ color: "#b45309" }}> · төлбөр хэтэрсэн гэж тооцогдоно</span>
          )}
        </div>
      )}
    </div>
  );
}
