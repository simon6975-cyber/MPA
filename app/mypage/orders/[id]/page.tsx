"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CustomerPageLayout from "../../../_components/CustomerPageLayout";
import { fetchOrderByIdForCustomer } from "../../../_lib/orderService";
import { Order, STATUS_LABELS, STATUS_COLORS, OrderStatus } from "../../../_lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 주문 진행 단계 정의 */
const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: "pending",   label: "결제완료", icon: "💳" },
  { key: "producing", label: "제작중",   icon: "🎨" },
  { key: "shipping",  label: "배송중",   icon: "🚚" },
  { key: "delivered", label: "배송완료", icon: "📦" },
];

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchOrderByIdForCustomer(orderId);
        if (!data) {
          setError("주문을 찾을 수 없습니다.");
        } else {
          setOrder(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "조회 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) {
    return (
      <CustomerPageLayout title="주문 상세" backHref="/mypage">
        <Card><p style={{ margin: 0, fontSize: 13, color: "#888", textAlign: "center" }}>불러오는 중...</p></Card>
      </CustomerPageLayout>
    );
  }

  if (error || !order) {
    return (
      <CustomerPageLayout title="주문 상세" backHref="/mypage">
        <Card><p style={{ margin: 0, fontSize: 13, color: "#888", textAlign: "center" }}>
          {error || "주문을 찾을 수 없습니다."}
        </p></Card>
      </CustomerPageLayout>
    );
  }

  // 취소된 주문은 진행 단계 표시 안 함
  const isCancelled = order.status === "cancelled";
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);

  return (
    <CustomerPageLayout title="주문 상세" backHref="/mypage">
      {/* 주문 번호 + 상태 */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            padding: "3px 10px",
            background: STATUS_COLORS[order.status].bg,
            color: STATUS_COLORS[order.status].text,
            borderRadius: 10, fontSize: 11, fontWeight: 700,
          }}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#666" }}>주문번호</p>
        <p style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 700, color: "#1a1a1a", fontFamily: "monospace" }}>
          {order.orderNumber}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#999" }}>
          {formatDate(order.createdAt)} 주문
        </p>
      </Card>

      {/* 진행 단계 (배송 추적) */}
      {!isCancelled && (
        <Card>
          <Label>진행 상태</Label>
          <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginTop: 10 }}>
            {/* 연결선 배경 */}
            <div style={{
              position: "absolute", top: 20, left: "12.5%", right: "12.5%",
              height: 2, background: "#eee", zIndex: 0,
            }} />
            {/* 연결선 진행 */}
            <div style={{
              position: "absolute", top: 20, left: "12.5%",
              width: currentStepIdx > 0 ? `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 75}%` : 0,
              height: 2, background: "#1a1a1a", zIndex: 1,
              transition: "width 0.3s",
            }} />

            {STATUS_STEPS.map((step, idx) => {
              const done = idx < currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <div key={step.key} style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 2,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: active || done ? "#1a1a1a" : "#f0f0f0",
                    color: active || done ? "#fff" : "#bbb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, boxShadow: active ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                    transition: "all 0.2s",
                  }}>
                    {step.icon}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: active ? 700 : 500,
                    color: active ? "#1a1a1a" : done ? "#666" : "#bbb",
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 상품 정보 */}
      <Card>
        <Label>상품 정보</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 60, height: 74,
            background: order.product.coverHex,
            borderRadius: "2px 6px 6px 2px",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
              {order.product.tierName}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>
              사진 {order.product.photoCount}장
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>
              커버: {order.product.coverColor}
            </p>
          </div>
        </div>
      </Card>

      {/* 배송 정보 */}
      <Card>
        <Label>배송 정보</Label>
        <InfoRow label="주소">{order.shipping.address}</InfoRow>
        {order.shipping.addressDetail && (
          <InfoRow label="상세">{order.shipping.addressDetail}</InfoRow>
        )}
        {order.shipping.message && (
          <InfoRow label="배송 메시지">{order.shipping.message}</InfoRow>
        )}
      </Card>

      {/* 결제 정보 */}
      <Card>
        <Label>결제 정보</Label>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 0", borderTop: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 13, color: "#666" }}>결제 수단</span>
          <span style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>
            {order.payment.method === "applepay" ? "Apple Pay" : "신용카드"}
          </span>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 0", borderTop: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 700 }}>결제 금액</span>
          <span style={{ fontSize: 18, color: "#1a1a1a", fontWeight: 700 }}>
            {order.payment.amount.toLocaleString()}원
          </span>
        </div>
      </Card>

      {/* 문의하기 CTA */}
      <Link href={`/mypage/inquiries/new?orderNumber=${order.orderNumber}`} style={{
        display: "block", padding: "14px", textAlign: "center",
        background: "#fff", borderRadius: 12,
        border: "1px solid #e0e0e0", textDecoration: "none", color: "#1a1a1a",
        fontSize: 13, fontWeight: 600,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        marginTop: 4,
      }}>
        💬 이 주문에 대해 문의하기
      </Link>
    </CustomerPageLayout>
  );
}

/* ─── 유틸 컴포넌트 ─── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
      {children}
    </p>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "6px 0", fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ width: 100, color: "#888", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#1a1a1a", flex: 1 }}>{children}</span>
    </div>
  );
}
