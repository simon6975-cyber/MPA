"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import CustomerPageLayout from "../_components/CustomerPageLayout";
import { ensureAuth, subscribeOrdersByUserId } from "../_lib/orderService";
import { subscribeInquiriesByUserId } from "../_lib/inquiryService";
import { Order, Inquiry, STATUS_LABELS, STATUS_COLORS, INQUIRY_STATUS_LABELS, INQUIRY_STATUS_COLORS } from "../_lib/types";

/**
 * 마이페이지 - 주문 내역 + 1:1 문의
 *
 * 탭 전환은 URL 쿼리 파라미터 ?tab=orders|inquiries로 관리 (딥링크 지원).
 * 기본은 orders.
 *
 * 인증: 현재 세션의 익명 UID를 기준으로 본인의 주문/문의만 조회.
 * 브라우저가 다르거나 세션이 새로 시작되면 새 UID가 발급되므로
 * 이전 주문은 보이지 않습니다 (네이티브 앱에서는 로그인 계정 기반으로 개선 예정).
 */

function MyPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const activeTab: "orders" | "inquiries" = tabParam === "inquiries" ? "inquiries" : "orders";

  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const uid = await ensureAuth();
        setUserId(uid);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "인증 실패");
      }
    })();
  }, []);

  const setTab = (t: "orders" | "inquiries") => {
    router.replace(`/mypage?tab=${t}`);
  };

  return (
    <CustomerPageLayout title="마이페이지" backHref="/">
      {/* 탭 */}
      <div style={{
        display: "flex",
        background: "#fff",
        borderRadius: 12,
        padding: 4,
        marginBottom: 14,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <TabButton label="주문 내역" active={activeTab === "orders"} onClick={() => setTab("orders")} />
        <TabButton label="1:1 문의" active={activeTab === "inquiries"} onClick={() => setTab("inquiries")} />
      </div>

      {authError ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#C62828" }}>인증 오류: {authError}</p>
        </div>
      ) : !userId ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>준비 중...</p>
        </div>
      ) : activeTab === "orders" ? (
        <OrdersTab userId={userId} />
      ) : (
        <InquiriesTab userId={userId} />
      )}
    </CustomerPageLayout>
  );
}

/* Next.js requirement: useSearchParams needs Suspense */
export default function MyPage() {
  return (
    <Suspense fallback={
      <CustomerPageLayout title="마이페이지" backHref="/">
        <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
        </div>
      </CustomerPageLayout>
    }>
      <MyPageContent />
    </Suspense>
  );
}

/* ─── 탭 버튼 ─── */

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 0",
        background: active ? "#1a1a1a" : "transparent",
        color: active ? "#fff" : "#666",
        border: "none",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s",
      }}
    >
      {label}
    </button>
  );
}

/* ─── 주문 탭 ─── */

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function OrdersTab({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeOrdersByUserId(userId, (list) => {
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, padding: 60, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📦</div>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#1a1a1a", fontWeight: 600 }}>주문 내역이 없습니다</p>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>첫 앨범을 주문해보세요</p>
        <Link href="/" style={{
          display: "inline-block", marginTop: 20, padding: "10px 22px",
          background: "#1a1a1a", color: "#fff", borderRadius: 10, fontSize: 13,
          textDecoration: "none", fontWeight: 600,
        }}>
          앨범 만들기
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {orders.map((o) => (
        <Link key={o.id} href={`/mypage/orders/${o.id}`} style={{
          display: "block", background: "#fff", borderRadius: 14, padding: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)", textDecoration: "none", color: "inherit",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* 커버 색상 미리보기 */}
            <div style={{
              width: 50, height: 60,
              background: o.product.coverHex,
              borderRadius: "2px 6px 6px 2px",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  padding: "2px 8px",
                  background: STATUS_COLORS[o.status].bg,
                  color: STATUS_COLORS[o.status].text,
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                }}>
                  {STATUS_LABELS[o.status]}
                </span>
                <span style={{ fontSize: 11, color: "#999" }}>{formatDateShort(o.createdAt)}</span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
                {o.product.tierName}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>
                사진 {o.product.photoCount}장 · 커버 {o.product.coverColor}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1a1a1a", fontWeight: 700 }}>
                {o.payment.amount.toLocaleString()}원
              </p>
            </div>

            <div style={{ fontSize: 18, color: "#ccc", flexShrink: 0 }}>›</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─── 문의 탭 ─── */

function InquiriesTab({ userId }: { userId: string }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeInquiriesByUserId(userId, (list) => {
      setInquiries(list);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  return (
    <>
      {/* 새 문의 작성 버튼 */}
      <Link href="/mypage/inquiries/new" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "14px", background: "#1a1a1a", color: "#fff", borderRadius: 12,
        textDecoration: "none", fontSize: 14, fontWeight: 600, marginBottom: 14,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}>
        <span style={{ fontSize: 16 }}>＋</span> 새 문의 작성하기
      </Link>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 50, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>💬</div>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#1a1a1a", fontWeight: 600 }}>등록된 문의가 없습니다</p>
          <p style={{ margin: 0, fontSize: 12, color: "#888" }}>궁금한 점이 있으시면 문의해주세요</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {inquiries.map((q) => (
            <Link key={q.id} href={`/mypage/inquiries/${q.id}`} style={{
              display: "block", background: "#fff", borderRadius: 14, padding: 16,
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)", textDecoration: "none", color: "inherit",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  padding: "2px 8px",
                  background: INQUIRY_STATUS_COLORS[q.status].bg,
                  color: INQUIRY_STATUS_COLORS[q.status].text,
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                }}>
                  {INQUIRY_STATUS_LABELS[q.status]}
                </span>
                <span style={{ fontSize: 11, color: "#999" }}>{formatDateShort(q.createdAt)}</span>
                {q.images.length > 0 && (
                  <span style={{ fontSize: 11, color: "#888" }}>📎 {q.images.length}</span>
                )}
              </div>
              <p style={{
                margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a1a",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {q.title}
              </p>
              <p style={{
                margin: "4px 0 0", fontSize: 12, color: "#888",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {q.content}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
