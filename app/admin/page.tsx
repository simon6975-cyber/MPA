"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { subscribeToOrders } from "../_lib/adminOrderService";
import { STATUS_LABELS, STATUS_COLORS, Order, OrderStatus } from "../_lib/types";
import { isFirebaseConfigured } from "../_lib/firebase";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatPrice(n: number): string {
  return n.toLocaleString() + "원";
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError("Firebase가 설정되지 않았습니다. Vercel 환경 변수를 확인하세요.");
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToOrders(
      (data) => { setOrders(data); setLoading(false); },
      (err) => { setError(err.message); setLoading(false); }
    );

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return o.orderNumber.toLowerCase().includes(q) || o.customer.name.includes(search) || o.customer.phone.includes(search);
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => {
    const base: Record<OrderStatus | "all", number> = { all: orders.length, pending: 0, producing: 0, shipping: 0, delivered: 0, cancelled: 0 };
    orders.forEach(o => { base[o.status]++; });
    return base;
  }, [orders]);

  const statusTabs: { key: OrderStatus | "all"; label: string }[] = [
    { key: "all", label: "전체" }, { key: "pending", label: "결제완료" }, { key: "producing", label: "제작중" },
    { key: "shipping", label: "배송중" }, { key: "delivered", label: "배송완료" }, { key: "cancelled", label: "취소됨" },
  ];

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
        <div style={{ width: 32, height: 32, margin: "0 auto 16px", border: "3px solid #eee", borderTopColor: "#1a1a1a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#888", fontSize: 13, margin: 0 }}>주문 데이터 불러오는 중...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#FFEBEE", borderRadius: 10, padding: 40, border: "1px solid #FFCDD2" }}>
        <h2 style={{ margin: 0, fontSize: 16, color: "#C62828" }}>⚠ 오류 발생</h2>
        <p style={{ marginTop: 8, fontSize: 13, color: "#C62828", lineHeight: 1.6 }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>주문 관리</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>
          전체 {orders.length}건 · <span style={{ color: "#4CAF50" }}>● 실시간 동기화</span>
        </p>
      </div>

      {orders.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 14, margin: 0 }}>아직 주문이 없습니다</p>
          <p style={{ marginTop: 8, fontSize: 12, color: "#aaa" }}>고객이 결제하면 여기에 실시간으로 표시됩니다</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {(["pending", "producing", "shipping", "delivered"] as OrderStatus[]).map(s => (
              <div key={s} onClick={() => setStatusFilter(s)} style={{
                background: "#fff", borderRadius: 10, padding: "14px 16px",
                border: statusFilter === s ? `2px solid ${STATUS_COLORS[s].text}` : "1px solid #e8eaed",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 500 }}>{STATUS_LABELS[s]}</p>
                <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, color: STATUS_COLORS[s].text }}>
                  {counts[s]}<span style={{ fontSize: 13, color: "#aaa", fontWeight: 400, marginLeft: 4 }}>건</span>
                </p>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e8eaed" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {statusTabs.map(tab => (
                <button key={tab.key} onClick={() => setStatusFilter(tab.key)} style={{
                  padding: "6px 12px",
                  background: statusFilter === tab.key ? "#1a1a1a" : "#f5f6f8",
                  color: statusFilter === tab.key ? "#fff" : "#666",
                  border: "none", borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>
                  {tab.label} ({counts[tab.key]})
                </button>
              ))}
            </div>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="주문번호, 고객명, 연락처로 검색"
              style={{ width: "100%", padding: "9px 12px", background: "#f5f6f8", border: "1px solid transparent", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid #e8eaed" }}>
                    {["주문번호", "주문일시", "고객", "상품", "금액", "상태", "출력파일", ""].map((h, i) => (
                      <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: "60px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>조건에 맞는 주문이 없습니다</td></tr>
                  ) : (
                    filtered.map(o => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#1a1a1a", fontWeight: 500, whiteSpace: "nowrap" }}>{o.orderNumber}</td>
                        <td style={{ padding: "14px 16px", color: "#666", whiteSpace: "nowrap" }}>{formatDate(o.createdAt)}</td>
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: "50%",
                              background: o.customer.provider === "kakao" ? "#FEE500" : o.customer.provider === "naver" ? "#03C75A" : "#999",
                              color: o.customer.provider === "kakao" ? "#191919" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                            }}>
                              {o.customer.provider === "kakao" ? "K" : o.customer.provider === "naver" ? "N" : "D"}
                            </div>
                            <div>
                              <div style={{ color: "#1a1a1a", fontWeight: 500 }}>{o.customer.name}</div>
                              <div style={{ color: "#aaa", fontSize: 11 }}>{o.customer.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 14, height: 20, background: o.product.coverHex, borderRadius: "1px 3px 3px 1px", flexShrink: 0 }} />
                            <div>
                              <div style={{ color: "#1a1a1a" }}>{o.product.tierName}</div>
                              <div style={{ color: "#aaa", fontSize: 11 }}>{o.product.photoCount}장 · {o.product.coverColor}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#1a1a1a", fontWeight: 600, whiteSpace: "nowrap" }}>{formatPrice(o.payment.amount)}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ display: "inline-block", padding: "3px 9px", background: STATUS_COLORS[o.status].bg, color: STATUS_COLORS[o.status].text, borderRadius: 10, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                            {STATUS_LABELS[o.status]}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          {o.pdf?.generated ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "#E8F5E9", color: "#2E7D32", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                              ✓ {o.pdf.totalPages}p
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "#FFF3E0", color: "#E65100", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                              ⏳ 미생성
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          <Link href={`/admin/orders/${o.id}`} style={{ padding: "5px 10px", background: "#f5f6f8", color: "#1a1a1a", borderRadius: 6, fontSize: 11, fontWeight: 500, textDecoration: "none" }}>
                            상세 →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ marginTop: 12, fontSize: 11, color: "#aaa", textAlign: "center" }}>총 {filtered.length}건 표시</p>
        </>
      )}
    </div>
  );
}
