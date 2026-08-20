"use client";

import { useState } from "react";
import { Alert, Button, Collapse, Empty, Skeleton, Space, Tag, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { teacherApi } from "@/lib/teacher-api";
import { SALARY_STATUS_LABEL, money } from "@/lib/labels";

/** Багшийн өөрийн цалин — зөвхөн харах, гар утсанд зориулсан. */
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Button
          className="touch-btn"
          icon={<LeftOutlined />}
          onClick={() => setMonth(month.add(-1, "month"))}
        />
        <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600 }}>
          {month.format("YYYY оны MM сар")}
        </div>
        <Button
          className="touch-btn"
          icon={<RightOutlined />}
          onClick={() => setMonth(month.add(1, "month"))}
        />
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <>
          {/* Гол дүн — том, тод */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #f0f0f0",
              borderRadius: 12,
              padding: 16,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, color: "#999" }}>Хүлээгдэж буй цалин</div>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25 }}>
              {money(data?.pendingAmount ?? 0)}
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>
              {data?.pendingLessons ?? 0} хичээл
            </div>
          </div>

          {!!data?.paidAmount && (
            <div
              style={{
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#389e0d" }}>Энэ сар олгогдсон</span>
              <b style={{ color: "#389e0d" }}>{money(data.paidAmount)}</b>
            </div>
          )}

          {data?.breakdown?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <Space wrap size={6}>
                {data.breakdown.map((b: any) => (
                  <Tag key={b.status} style={{ marginInlineEnd: 0 }}>
                    {b.label}: <b>{b.count}</b>
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          <Collapse
            size="small"
            style={{ marginBottom: 10 }}
            items={[
              {
                key: "rule",
                label: "Цалин хэрхэн тооцогддог вэ?",
                children: (
                  <Typography.Paragraph style={{ fontSize: 13, marginBottom: 0 }}>
                    Ирсэн хичээл цалинд орно. Сурагч сард <b>3 хүртэл</b> удаа
                    тасалбал сануулга — цалинд орохгүй, <b>4 дэх удаагаас</b>{" "}
                    цалинд орно. Чөлөө авсан хичээлийн цалин нөхөж орсон үед
                    тооцогдоно.
                  </Typography.Paragraph>
                ),
              },
            ]}
          />

          <Typography.Text strong style={{ fontSize: 13 }}>
            Олголтын түүх
          </Typography.Text>
          <div style={{ marginTop: 8 }}>
            {!data?.payouts?.length ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Олголт хараахан хийгдээгүй"
                style={{ padding: "20px 0" }}
              />
            ) : (
              data.payouts.map((p: any) => (
                <div key={p._id} className="lesson-card">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {money(p.totalAmount)}
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        {p.periodFrom} — {p.periodTo} · {p.lessonCount} хичээл
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Tag
                        color={p.status === "PAID" ? "green" : "orange"}
                        style={{ marginInlineEnd: 0 }}
                      >
                        {SALARY_STATUS_LABEL[p.status]}
                      </Tag>
                      {p.paidAt && (
                        <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>
                          {dayjs(p.paidAt).format("MM/DD")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Alert
            type="info"
            showIcon
            style={{ marginTop: 10 }}
            message="Асуулт байвал админд хандана уу"
          />
        </>
      )}
    </div>
  );
}
