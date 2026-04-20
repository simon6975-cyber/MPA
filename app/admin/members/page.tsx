"use client";

import React, { useState, useMemo, useEffect } from "react";
import { subscribeToOrders } from "../../_lib/adminOrderService";
import { Order } from "../../_lib/types";
import { isFirebaseConfigured } from "../../_lib/firebase";

interface Member {
  userId: string;
  name: string;
  phone: string;
  email: string;
  provider: "kakao" | "naver" | "demo";
  firstOrderAt: string;
  lastOrderAt: string;
  orderCount: number;
  totalSpent: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminMembersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "orders" | "spent">("recent");

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError("Firebase가 설정되지 않았습니다.");
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToOrders(
      (data) => { setOrders(data); setLoading(false); },
      (err) => { setError(err.message); setLoading(false); }
    );
    return () => unsubscribe();
  }, []);

  // 주문에서 고유 고객 추출
  const members = useMemo<Member[]>(() => {
    const map = new Map<string, Member>();
    orders.forEach(o => {
      const existing = map.get(o.userId);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += o.payment.amount;
        if (new Date(o.createdAt) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = o.createdAt;
        }
        if (new Date(o.createdAt) < new Date(existing.firstOrderAt)) {
          existing.firstOrderAt = o.createdAt;
        }
      } else {
        map.set(o.userId, {
          userId: o.userId,
          name: o.customer.name,
          phone: o.customer.phone,
          email: o.customer.email,
          provider: o.customer.provider,
          firstOrderAt: o.createdAt,
          lastOrderAt: o.createdAt,
          orderCount: 1,
          totalSpent: o.payment.amount,
        });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const filtered = useMemo(() => {
    let list = members.filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return m.name.includes(search) || m.phone.includes(search) || m.email.toLowerCase().includes(q);
    });
    if (sortBy === "recent") list.sort((a, b) => new Date(b.firstOrderAt).getTime() - new Date(a.firstOrderAt).getTime());
    else if (sortBy === "orders") list.sort((a, b) => b.orderCount - a.orderCount);
    else list.sort((a, b) => b.totalSpent - a.totalSpent);
    return list;
  }, [members, search, sortBy]);

  const totalMembers = members.length;
  const kakaoCount = members.filter(m => m.provider === "kakao").length;
  const naverCount = members.filter(m => m.provider === "naver").length;
  const activeCount = members.filter(m => m.orderCount > 0).length;

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
        <p style={{ color: "#888", fontSize: 13 }}>회원 데이터 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#FFEBEE", borderRadius: 10, padding: 40, border: "1px solid #FFCDD2" }}>
        <p style={{ fontSize: 13, color: "#C62828" }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>회원 관리</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>
          주문 경험이 있는 고객 {totalMembers}명 · 주문 데이터 기반 실시간 집계
        </p>
      </div>

      <div style={{ padding: "12px 14px", background: "#FFF8E1", border: "1px dashed #F9A825", borderRadius: 8, marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "#E65100", margin: 0, lineHeight: 1.6 }}>
          💡 <b>안내</b>: 현재는 주문 데이터에서 고객을 집계합니다. 별도 회원가입/프로필 관리 기능은 카카오·네이버 OAuth 연동 이후 추가됩니다.
        </p>
      </div>

      {members.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 14, margin: 0 }}>아직 주문 고객이 없습니다</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "전체 회원", value: totalMembers, color: "#1a1a1a", suffix: "명" },
              { label: "주문 경험 회원", value: activeCount, color: "#2E7D32", suffix: "명" },
              { label: "카카오 가입", value: kakaoCount, color: "#F57C00", suffix: "명" },
              { label: "네이버 가입", value: naverCount, color: "#2E7D32", suffix: "명" },
            ].map(c => (
              <div key={c.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #e8eaed" }}>
                <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 500 }}>{c.label}</p>
                <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, color: c.color }}>
                  {c.value}<span style={{ fontSize: 13, color: "#aaa", fontWeight: 400, marginLeft: 4 }}>{c.suffix}</span>
                </p>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e8eaed", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="이름, 연락처, 이메일로 검색"
              style={{ flex: 1, minWidth: 200, padding: "9px 12px", background: "#f5f6f8", border: "1px solid transparent", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "recent" | "orders" | "spent")}
              style={{ padding: "9px 12px", background: "#f5f6f8", border: "1px solid transparent", borderRadius: 8, fontSize: 13, cursor: "pointer", outline: "none" }}>
              <option value="recent">최근 주문순</option>
              <option value="orders">주문수 순</option>
              <option value="spent">총 결제액 순</option>
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid #e8eaed" }}>
                    {["회원ID", "이름", "연락처", "이메일", "첫 주문", "주문수", "총 결제액"].map((h, i) => (
                      <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.userId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 11, color: "#888" }}>{m.userId.slice(0, 10)}...</td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: m.provider === "kakao" ? "#FEE500" : m.provider === "naver" ? "#03C75A" : "#999",
                            color: m.provider === "kakao" ? "#191919" : "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                          }}>
                            {m.provider === "kakao" ? "K" : m.provider === "naver" ? "N" : "D"}
                          </div>
                          <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#666", whiteSpace: "nowrap" }}>{m.phone}</td>
                      <td style={{ padding: "14px 16px", color: "#666" }}>{m.email || "-"}</td>
                      <td style={{ padding: "14px 16px", color: "#666", whiteSpace: "nowrap" }}>
                        {formatDate(m.firstOrderAt)}
                        <span style={{ marginLeft: 6, fontSize: 10, color: "#aaa" }}>({daysAgo(m.firstOrderAt)}일 전)</span>
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{m.orderCount}건</span>
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{m.totalSpent.toLocaleString()}원</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
