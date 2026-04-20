"use client";

import React, { useState, useMemo, useEffect } from "react";
import { subscribeToOrders } from "../../_lib/adminOrderService";
import { Order } from "../../_lib/types";
import { isFirebaseConfigured } from "../../_lib/firebase";

export default function AdminStatsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const stats = useMemo(() => {
    const valid = orders.filter(o => o.status !== "cancelled");
    const totalRevenue = valid.reduce((sum, o) => sum + o.payment.amount, 0);
    const totalOrders = valid.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const daily: Record<string, { count: number; revenue: number }> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      daily[key] = { count: 0, revenue: 0 };
    }
    valid.forEach(o => {
      const d = new Date(o.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (daily[key]) { daily[key].count++; daily[key].revenue += o.payment.amount; }
    });

    const byTier: Record<string, { count: number; revenue: number }> = {
      mini: { count: 0, revenue: 0 }, standard: { count: 0, revenue: 0 }, premium: { count: 0, revenue: 0 },
    };
    valid.forEach(o => { byTier[o.product.tier].count++; byTier[o.product.tier].revenue += o.payment.amount; });

    const byColor: Record<string, { count: number; hex: string }> = {};
    valid.forEach(o => {
      if (!byColor[o.product.coverColor]) byColor[o.product.coverColor] = { count: 0, hex: o.product.coverHex };
      byColor[o.product.coverColor].count++;
    });

    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const thisMonthOrders = valid.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + o.payment.amount, 0);

    return { totalRevenue, totalOrders, avgOrderValue, daily, byTier, byColor, thisMonthOrders: thisMonthOrders.length, thisMonthRevenue };
  }, [orders]);

  const dailyEntries = Object.entries(stats.daily);
  const maxDailyRevenue = Math.max(...dailyEntries.map(([, v]) => v.revenue), 1);
  const maxTierCount = Math.max(...Object.values(stats.byTier).map(v => v.count), 1);

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
        <p style={{ color: "#888", fontSize: 13 }}>통계 계산 중...</p>
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
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>매출 대시보드</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>취소 건 제외 · 최근 30일 기준 · <span style={{ color: "#4CAF50" }}>● 실시간</span></p>
      </div>

      {orders.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 14 }}>아직 주문 데이터가 없습니다</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "총 매출", value: stats.totalRevenue.toLocaleString() + "원", color: "#1a1a1a" },
              { label: "총 주문 수", value: stats.totalOrders + "건", color: "#1565C0" },
              { label: "평균 주문 금액", value: stats.avgOrderValue.toLocaleString() + "원", color: "#6A1B9A" },
              { label: "이번 달 매출", value: stats.thisMonthRevenue.toLocaleString() + "원", color: "#2E7D32" },
            ].map(c => (
              <div key={c.label} style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", border: "1px solid #e8eaed" }}>
                <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 500 }}>{c.label}</p>
                <p style={{ margin: "8px 0 0", fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8eaed", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>최근 30일 일별 매출</h3>
            <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 3, overflowX: "auto", padding: "4px 2px" }}>
              {dailyEntries.map(([key, v]) => {
                const heightPct = maxDailyRevenue > 0 ? (v.revenue / maxDailyRevenue) * 100 : 0;
                return (
                  <div key={key} style={{ flex: 1, minWidth: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", position: "relative" }}>
                      <div style={{
                        width: "100%", height: `${Math.max(heightPct, v.count > 0 ? 2 : 0)}%`,
                        background: v.revenue > 0 ? "linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)" : "transparent",
                        borderRadius: "3px 3px 0 0", transition: "height 0.3s", position: "relative",
                      }} title={`${key}: ${v.count}건, ${v.revenue.toLocaleString()}원`}>
                        {v.count > 0 && (
                          <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#888", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {v.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: "#aaa", whiteSpace: "nowrap" }}>{key}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8eaed" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>상품별 판매 분포</h3>
              {(["mini", "standard", "premium"] as const).map(tier => {
                const info = stats.byTier[tier];
                const tierName = tier === "mini" ? "미니앨범" : tier === "standard" ? "스탠다드앨범" : "프리미엄앨범";
                const tierColor = tier === "mini" ? "#FFB74D" : tier === "standard" ? "#64B5F6" : "#BA68C8";
                const pct = maxTierCount > 0 ? (info.count / maxTierCount) * 100 : 0;
                return (
                  <div key={tier} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{tierName}</span>
                      <span style={{ color: "#888" }}>
                        <b style={{ color: "#1a1a1a" }}>{info.count}건</b>
                        <span style={{ margin: "0 6px", color: "#ddd" }}>·</span>
                        {info.revenue.toLocaleString()}원
                      </span>
                    </div>
                    <div style={{ height: 8, background: "#f5f6f8", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: tierColor, borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8eaed" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>인기 커버 색상</h3>
              {Object.entries(stats.byColor).sort(([, a], [, b]) => b.count - a.count).map(([name, info]) => {
                const maxColor = Math.max(...Object.values(stats.byColor).map(v => v.count), 1);
                const pct = (info.count / maxColor) * 100;
                return (
                  <div key={name} style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 16, height: 20, background: info.hex, borderRadius: "1px 3px 3px 1px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: "#1a1a1a" }}>{name}</span>
                        <span style={{ color: "#888", fontWeight: 500 }}>{info.count}건</span>
                      </div>
                      <div style={{ height: 6, background: "#f5f6f8", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: info.hex, borderRadius: 3, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
