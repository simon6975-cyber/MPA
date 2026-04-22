"use client";

import React, { useState, useEffect } from "react";
import { Notice } from "../_lib/types";
import { subscribeNotices } from "../_lib/noticeService";
import CustomerPageLayout from "../_components/CustomerPageLayout";

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeNotices((list) => {
      setNotices(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <CustomerPageLayout title="공지사항" backHref="/">
      {loading ? (
        <LoadingCard />
      ) : notices.length === 0 ? (
        <EmptyCard message="등록된 공지사항이 없습니다" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notices.map((n) => (
            <NoticeCard
              key={n.id}
              notice={n}
              isOpen={openId === n.id}
              onToggle={() => setOpenId(openId === n.id ? null : n.id)}
            />
          ))}
        </div>
      )}
    </CustomerPageLayout>
  );
}

/* ─── 카드 컴포넌트 ─── */

function NoticeCard({ notice, isOpen, onToggle }: {
  notice: Notice;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}>
      {/* 헤더 (클릭 영역) */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "16px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            {notice.pinned && (
              <span style={{
                padding: "2px 8px",
                background: "#fff2e6",
                color: "#E65100",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}>
                📌 중요
              </span>
            )}
            <span style={{ fontSize: 11, color: "#999" }}>{formatDateShort(notice.createdAt)}</span>
          </div>
          <h3 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "#1a1a1a",
            lineHeight: 1.4,
          }}>
            {notice.title}
          </h3>
        </div>
        <div style={{
          fontSize: 14,
          color: "#999",
          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.2s",
          flexShrink: 0,
        }}>
          ▼
        </div>
      </button>

      {/* 본문 (펼쳐졌을 때만) */}
      {isOpen && (
        <div style={{
          padding: "0 18px 18px",
          borderTop: "1px solid #f5f5f3",
          paddingTop: 16,
        }}>
          <div style={{
            fontSize: 14,
            color: "#333",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {notice.content}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingCard() {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: 40,
      textAlign: "center",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: 60,
      textAlign: "center",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📢</div>
      <p style={{ margin: 0, fontSize: 14, color: "#888" }}>{message}</p>
    </div>
  );
}
