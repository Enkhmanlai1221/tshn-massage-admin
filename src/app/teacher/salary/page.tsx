"use client";

import { useState } from "react";
import { Button, Skeleton } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { teacherApi } from "@/lib/teacher-api";
import { SALARY_STATUS_LABEL, money } from "@/lib/labels";

/**
 * Багшийн өөрийн цалин — зөвхөн харах, гар утсанд зориулсан.
 *
 * Өнгөний дэглэм: том ногоон хайрцаг байхгүй — зөвхөн ТОО нь ногоон.
 * Задаргаа нь өнгөт шошго биш, саарал мөрүүд (тод өнгө зөвхөн үйл явдалд).
 */
export default function TeacherSalaryPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const monthKey = month.format("YYYY-MM");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-salary", monthKey],
    queryFn: async () =>
      (await teacherApi.get("/salary", { params: { monthKey } })).data,
  });

  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}
      >
        <Button
          icon={<LeftOutlined />}
          onClick={() => setMonth(month.add(-1, "month"))}
          aria-label="Өмнөх сар"
          style={{ width: 36, height: 36, flexShrink: 0 }}
        />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
            Цалин
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
            {month.format("YYYY оны MM сар")}
          </div>
        </div>
        <Button
          icon={<RightOutlined />}
          onClick={() => setMonth(month.add(1, "month"))}
          aria-label="Дараагийн сар"
          style={{ width: 36, height: 36, flexShrink: 0 }}
        />
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <>
          {/* Гол дүн — том, тод */}
          <div
            className="lesson-card"
            style={{ padding: "20px 16px", textAlign: "center" }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>Хүлээгдэж буй</div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.2,
                marginTop: 4,
              }}
            >
              {money(data?.pendingAmount ?? 0)}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {data?.pendingLessons ?? 0} хичээл
            </div>
          </div>

          {/* Олгогдсон + задаргаа — нэг картад */}
          <div className="lesson-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#4b5563" }}>Энэ сар олгогдсон</span>
              <b style={{ color: "#15803d", fontSize: 15 }}>
                {money(data?.paidAmount ?? 0)}
              </b>
            </div>
            {!!data?.breakdown?.length && (
              <>
                <div
                  style={{ height: 1, background: "#f0f1f3", margin: "12px 0" }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                    fontSize: 13,
                  }}
                >
                  {data.breakdown.map((b: any) => (
                    <div
                      key={b.status}
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span style={{ color: "#4b5563" }}>{b.label}</span>
                      <span style={{ fontWeight: 600 }}>{b.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Дүрэм — үргэлж ил, нугалж нуухгүй (нэг л удаа уншина). */}
          <div className="lesson-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Цалин хэрхэн тооцогддог вэ?
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#4b5563",
                lineHeight: 1.6,
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid #f0f1f3",
              }}
            >
              Ирсэн хичээл цалинд орно. Сурагч сард{" "}
              <b style={{ color: "#111827" }}>3 хүртэл</b> удаа тасалбал
              сануулга — цалинд орохгүй.{" "}
              <b style={{ color: "#111827" }}>4 дэх удаагаас</b> цалинд орно.
              Чөлөө авсан хичээл нөхөгдсөн үед тооцогдоно.
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Олголтын түүх
          </div>
          {!data?.payouts?.length ? (
            <div
              className="lesson-card"
              style={{ padding: "28px 16px", textAlign: "center" }}
            >
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Олголт хараахан хийгдээгүй
              </div>
            </div>
          ) : (
            <div className="row-card">
              {data.payouts.map((p: any) => {
                const paid = p.status === "PAID";
                return (
                  <div
                    key={p._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {money(p.totalAmount)}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}
                      >
                        {p.periodFrom} — {p.periodTo} · {p.lessonCount} хичээл
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: paid ? "#15803d" : "#b45309",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: paid ? "#16a34a" : "#d97706",
                            display: "inline-block",
                          }}
                        />
                        {SALARY_STATUS_LABEL[p.status]}
                      </div>
                      {p.paidAt && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            marginTop: 3,
                          }}
                        >
                          {dayjs(p.paidAt).format("MM/DD")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              textAlign: "center",
              marginTop: 14,
            }}
          >
            Асуулт байвал админд хандана уу.
          </div>
        </>
      )}
    </div>
  );
}
