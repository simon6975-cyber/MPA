"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerPageLayout from "../../../_components/CustomerPageLayout";
import { fetchInquiryById, closeInquiry, deleteInquiry } from "../../../_lib/inquiryService";
import { Inquiry, INQUIRY_STATUS_LABELS, INQUIRY_STATUS_COLORS } from "../../../_lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function InquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inquiryId = params.id as string;

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchInquiryById(inquiryId);
      if (!data) {
        setError("문의를 찾을 수 없습니다.");
      } else {
        setInquiry(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [inquiryId]);

  const handleClose = async () => {
    if (!inquiry) return;
    if (!confirm("이 문의를 종료하시겠습니까?\n종료 후에는 답변 확인만 가능합니다.")) return;
    setActionLoading(true);
    try {
      await closeInquiry(inquiry.id);
      await load();
    } catch (err) {
      alert(`종료 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!inquiry) return;
    if (!confirm("이 문의를 삭제하시겠습니까?\n첨부 이미지도 함께 삭제됩니다.")) return;
    setActionLoading(true);
    try {
      await deleteInquiry(inquiry.id);
      router.replace("/mypage?tab=inquiries");
    } catch (err) {
      alert(`삭제 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <CustomerPageLayout title="문의 상세" backHref="/mypage?tab=inquiries">
        <Card><p style={{ margin: 0, fontSize: 13, color: "#888", textAlign: "center" }}>불러오는 중...</p></Card>
      </CustomerPageLayout>
    );
  }

  if (error || !inquiry) {
    return (
      <CustomerPageLayout title="문의 상세" backHref="/mypage?tab=inquiries">
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "#888", textAlign: "center" }}>
            {error || "문의를 찾을 수 없습니다."}
          </p>
        </Card>
      </CustomerPageLayout>
    );
  }

  return (
    <CustomerPageLayout title="문의 상세" backHref="/mypage?tab=inquiries">
      {/* 상태 + 제목 */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            padding: "3px 10px",
            background: INQUIRY_STATUS_COLORS[inquiry.status].bg,
            color: INQUIRY_STATUS_COLORS[inquiry.status].text,
            borderRadius: 10, fontSize: 11, fontWeight: 700,
          }}>
            {INQUIRY_STATUS_LABELS[inquiry.status]}
          </span>
          <span style={{ fontSize: 12, color: "#999" }}>{formatDate(inquiry.createdAt)}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4 }}>
          {inquiry.title}
        </h2>
        {inquiry.orderNumber && (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>
            관련 주문: <b>{inquiry.orderNumber}</b>
          </p>
        )}
      </Card>

      {/* 문의 내용 */}
      <Card>
        <Label>문의 내용</Label>
        <div style={{
          fontSize: 14, color: "#333", lineHeight: 1.7,
          whiteSpace: "pre-wrap", padding: "10px 12px",
          background: "#fafafa", borderRadius: 10,
        }}>
          {inquiry.content}
        </div>
      </Card>

      {/* 첨부 이미지 */}
      {inquiry.images.length > 0 && (
        <Card>
          <Label>첨부 이미지 ({inquiry.images.length}장)</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {inquiry.images.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" style={{
                position: "relative", paddingBottom: "100%",
                borderRadius: 10, overflow: "hidden",
                background: "#f5f5f3", display: "block",
              }}>
                <img
                  src={img.url}
                  alt={img.filename}
                  loading="lazy"
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: "100%", height: "100%", objectFit: "cover",
                  }}
                />
              </a>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#888" }}>
            이미지를 탭하면 원본이 새 창에서 열립니다
          </p>
        </Card>
      )}

      {/* 답변 */}
      {inquiry.answer ? (
        <div style={{
          background: "linear-gradient(135deg, #f0f7ff 0%, #e3f2fd 100%)",
          borderRadius: 14, padding: 16, marginBottom: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#1565C0", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>
              답
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1565C0" }}>
                MPA 고객센터 답변
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#1565C0", opacity: 0.7 }}>
                {formatDate(inquiry.answer.answeredAt)}
              </p>
            </div>
          </div>
          <div style={{
            fontSize: 14, color: "#0d47a1", lineHeight: 1.7,
            whiteSpace: "pre-wrap", paddingLeft: 36,
          }}>
            {inquiry.answer.content}
          </div>
        </div>
      ) : (
        <div style={{
          background: "#fff", borderRadius: 14, padding: 30, textAlign: "center", marginBottom: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>⏳</div>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>답변을 준비 중입니다</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#bbb" }}>
            영업일 기준 1~2일 내에 답변드리겠습니다
          </p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {inquiry.status === "answered" && (
          <button
            onClick={handleClose}
            disabled={actionLoading}
            style={{
              flex: 1, padding: "12px",
              background: "#fff", color: "#666",
              border: "1px solid #ddd", borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            문의 종료
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={actionLoading}
          style={{
            flex: 1, padding: "12px",
            background: "#fff", color: "#C62828",
            border: "1px solid #FFCDD2", borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          삭제
        </button>
      </div>
    </CustomerPageLayout>
  );
}

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
