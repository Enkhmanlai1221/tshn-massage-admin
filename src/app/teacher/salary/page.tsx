"use client";

import { App, Button, Skeleton } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { teacherApi, teacherApiError } from "@/lib/teacher-api";
import { money } from "@/lib/labels";

/**
 * Багшийн цалин — САРААР БИШ, сүүлд цалин авснаас хойш хуримтлагдсан
 * «авах ёстой» дүн. Цалингаа авмагц багш «Цалин авсан» дарна — тэр мөчөөс
 * тоолуур 0-ээс эхэлж, олголт түүхэнд бичигдэнэ.
 *
 * Өнгөний дэглэм: том ногоон хайрцаг байхгүй — зөвхөн ТОО нь ногоон.
 */
export default function TeacherSalaryPage() {
  const { message, modal } = App.useApp();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-salary", "owed"],
    queryFn: async () => (await teacherApi.get("/salary/owed")).data,
  });

  const received = useMutation({
    mutationFn: async (amount: number) =>
      (await teacherApi.post("/salary/received", { amount })).data,
    onSuccess: (res) => {
      message.success(res.message);
      qc.invalidateQueries({ queryKey: ["teacher-salary"] });
      qc.invalidateQueries({ queryKey: ["teacher-students"] });
      qc.invalidateQueries({ queryKey: ["teacher-student"] });
    },
    onError: (e) => {
      message.error(teacherApiError(e));
      qc.invalidateQueries({ queryKey: ["teacher-salary"] });
    },
  });

  const total: number = data?.total ?? 0;
  const lessons: number = (data?.lessonCount ?? 0) + (data?.priorCount ?? 0);
  const last = data?.lastPaid;

  const confirmReceived = () =>
    modal.confirm({
      title: "Цалингаа авсан уу?",
      content: (
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: "6px 0" }}>{money(total)}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            {lessons} хичээлийн цалин «авсан» гэж бүртгэгдэж, тоолуур 0-ээс
            эхэлнэ. Буцаах боломжгүй.
          </div>
        </div>
      ),
      okText: "Тийм, авсан",
      cancelText: "Болих",
      onOk: () => received.mutateAsync(total),
    });

  return (
    <div style={{ paddingBottom: 72 }}>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, marginBottom: 12 }}>
        Цалин
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          {/* АВАХ ЁСТОЙ ЦАЛИН — хамгийн чухал тоо */}
          <div className="lesson-card" style={{ padding: "20px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Авах цалин</div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
                lineHeight: 1.2,
                marginTop: 4,
                color: total ? "#15803d" : "#111827",
              }}
            >
              {money(total)}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {data?.lessonCount ?? 0} хичээл
              {data?.priorCount > 0 && ` · өмнө орсон ${data.priorCount}`}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
              {last
                ? `Сүүлд ${dayjs(last.paidAt).format("YYYY-MM-DD")}-нд ${money(last.totalAmount)} авсан`
                : "Одоогоор цалин аваагүй"}
            </div>
            {data?.draftAmount > 0 && (
              <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>
                Үүнээс админы бэлдсэн тооцоо {money(data.draftAmount)}
              </div>
            )}

            <Button
              type="primary"
              size="large"
              block
              icon={<CheckCircleOutlined />}
              disabled={!total}
              loading={received.isPending}
              onClick={confirmReceived}
              style={{ marginTop: 16, height: 48 }}
            >
              Цалин авсан
            </Button>
          </div>

          {/* СУРАГЧ БҮРЭЭР */}
          {!!data?.students?.length && (
            <>
              <div className="section-label" style={{ marginTop: 6 }}>
                СУРАГЧ БҮРЭЭР · {data.students.length}
              </div>
              <div className="row-card" style={{ marginBottom: 16 }}>
                {data.students.map((r: any) => {
                  const st = r.student ?? {};
                  const name = [st.lastName ? `${st.lastName.slice(0, 1)}.` : "", st.firstName]
                    .filter(Boolean)
                    .join("");
                  return (
                    <div
                      key={String(st._id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lesson-card__name" style={{ fontSize: 14, fontWeight: 600 }}>
                          {name || "—"}
                          {st.isGroup && (
                            <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 500 }}> · групп</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                          {r.lessons} хичээл
                          {r.prior > 0 && ` · өмнө орсон ${r.prior}`}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                        {money(r.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Дүрэм — үргэлж ил */}
          <div className="lesson-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Цалин хэрхэн тооцогддог вэ?</div>
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
              Чөлөө авсан хичээл нөхөгдсөн үед тооцогдоно. Цалингаа авмагц
              «Цалин авсан» дарна уу.
            </div>
          </div>

          {/* ОЛГОЛТЫН ТҮҮХ */}
          <div className="section-label">ОЛГОЛТЫН ТҮҮХ</div>
          {!data?.payouts?.length ? (
            <div className="lesson-card" style={{ padding: "28px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>Олголт хараахан хийгдээгүй</div>
            </div>
          ) : (
            <div className="row-card">
              {data.payouts.map((p: any) => {
                const paid = p.status === "PAID";
                return (
                  <div
                    key={p._id}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{money(p.totalAmount)}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {p.periodFrom} — {p.periodTo} · {(p.lessonCount ?? 0) + (p.priorCount ?? 0)} хичээл
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
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
                        {paid ? (p.confirmedByTeacher ? "Авсан" : "Олгосон") : "Ноорог"}
                      </div>
                      {p.paidAt && (
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                          {dayjs(p.paidAt).format("YYYY-MM-DD")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 14 }}>
            Асуулт байвал админд хандана уу.
          </div>
        </>
      )}
    </div>
  );
}
