"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const todayRange = () => ({
  from: dayjs().startOf("day").toISOString(),
  to: dayjs().endOf("day").toISOString(),
});

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-revenue", "today"],
    queryFn: async () => {
      const { data } = await api.get("/report/revenue", {
        params: todayRange(),
      });
      return data;
    },
  });

  return (
    <div>
      <Typography.Title level={3}>Өнөөдрийн тойм</Typography.Title>
      {isLoading ? (
        <Spin />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Орлого (₮)"
                value={data?.revenue || 0}
                groupSeparator=","
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Захиалга" value={data?.appointmentCount || 0} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Дууссан" value={data?.completedCount || 0} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Ашигласан оноо"
                value={data?.loyaltyUsed || 0}
                groupSeparator=","
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
