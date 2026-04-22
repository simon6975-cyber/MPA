"use client";

import React, { useState, useEffect } from "react";
import { Faq } from "../_lib/types";
import { subscribePublishedFaqs } from "../_lib/faqService";
import CustomerPageLayout from "../_components/CustomerPageLayout";

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribePublishedFaqs((list) => {
      setFaqs(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <CustomerPageLayout title="자주 묻는 질문" backHref="/">
      {loading ? (
        <LoadingCard />
      ) : faqs.length === 0 ? (
        <EmptyCard />
      ) : (
        <>
          {/* 안내 카드 */}
          <div style={{
            background: "linear-gradient(135deg, #fffbf2 0%, #fff8e6 100%)",
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#866b2e", lineHeight: 1.5 }}>
              💡 궁금한 점을 미리 확인해보세요.
              여기서 해결되지 않으면 마이페이지에서 1:1 문의를 이용해주세요.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {faqs.map((f) => (
              <FaqCard
                key={f.id}
                faq={f}
                isOpen={openId === f.id}
                onToggle={() => setOpenId(openId === f.id ? null : f.id)}
              />
            ))}
          </div>
        </>
      )}
    </CustomerPageLayout>
  );
}

/* ─── 카드 컴포넌트 ─── */

function FaqCard({ faq, isOpen, onToggle }: {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
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
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <span style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: isOpen ? "#1a1a1a" : "#f0ece0",
          color: isOpen ? "#fff" : "#866b2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          marginTop: 1,
          transition: "all 0.2s",
        }}>
          Q
        </span>
        <h3 style={{
          margin: 0,
          flex: 1,
          fontSize: 15,
          fontWeight: 600,
          color: "#1a1a1a",
          lineHeight: 1.5,
        }}>
          {faq.question}
        </h3>
        <div style={{
          fontSize: 12,
          color: "#999",
          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.2s",
          flexShrink: 0,
          marginTop: 6,
        }}>
          ▼
        </div>
      </button>

      {isOpen && (
        <div style={{
          padding: "0 18px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}>
          <span style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#fffbf2",
            color: "#b89140",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
          }}>
            A
          </span>
          <div style={{
            flex: 1,
            fontSize: 14,
            color: "#444",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            paddingTop: 2,
          }}>
            {faq.answer}
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

function EmptyCard() {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: 60,
      textAlign: "center",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>❓</div>
      <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
        아직 등록된 FAQ가 없습니다
      </p>
    </div>
  );
}
