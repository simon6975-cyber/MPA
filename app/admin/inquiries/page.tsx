"use client";

import React, { useState, useEffect } from "react";
import { Inquiry, InquiryStatus, INQUIRY_STATUS_LABELS, INQUIRY_STATUS_COLORS } from "../../_lib/types";
import {
  fetchAllInquiries, answerInquiry, updateAnswer, updateInquiryStatus, deleteInquiry,
} from "../../_lib/inquiryService";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const list = statusFilter === "all"
        ? await fetchAllInquiries()
        : await fetchAllInquiries(statusFilter);
      setInquiries(list);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const selected = inquiries.find(q => q.id === selectedId) || null;

  const openDetail = (q: Inquiry) => {
    setSelectedId(q.id);
    setAnswerText(q.answer?.content || "");
  };

  const closeDetail = () => {
    setSelectedId(null);
    setAnswerText("");
  };

  const handleSaveAnswer = async () => {
    if (!selected) return;
    if (!answerText.trim()) {
      alert("답변 내용을 입력해주세요.");
      return;
    }
    try {
      setSaving(true);
      if (selected.answer) {
        await updateAnswer(selected.id, answerText);
      } else {
        await answerInquiry(selected.id, { content: answerText, answeredBy: "관리자" });
      }
      await load();
      closeDetail();
    } catch (err) {
      alert(`저장 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (q: Inquiry) => {
    if (!confirm("이 문의를 종료 처리하시겠습니까?")) return;
    try {
      await updateInquiryStatus(q.id, "closed");
      await load();
    } catch (err) {
      alert(`상태 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  const handleDelete = async (q: Inquiry) => {
    if (!confirm(`"${q.title}" 문의를 삭제하시겠습니까?\n(첨부 이미지도 함께 삭제됩니다)`)) return;
    try {
      await deleteInquiry(q.id);
      if (selectedId === q.id) closeDetail();
      await load();
    } catch (err) {
      alert(`삭제 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  const filterCounts = {
    all: inquiries.length,
    pending: inquiries.filter(q => q.status === "pending").length,
    answered: inquiries.filter(q => q.status === "answered").length,
    closed: inquiries.filter(q => q.status === "closed").length,
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>1:1 문의</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
          전체 {filterCounts.all}건 · 대기 {filterCounts.pending}건 · 답변완료 {filterCounts.answered}건 · 종료 {filterCounts.closed}건
        </p>
      </div>

      {/* 상태 필터 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#fff", padding: 4, borderRadius: 8, border: "1px solid #e8eaed", width: "fit-content" }}>
        {(["all", "pending", "answered", "closed"] as const).map(s => {
          const label = s === "all" ? "전체" : INQUIRY_STATUS_LABELS[s as InquiryStatus];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "7px 14px", background: active ? "#1a1a1a" : "transparent",
                color: active ? "#fff" : "#666", border: "none", borderRadius: 6,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={{ background: "#FFEBEE", borderRadius: 10, padding: 20, color: "#C62828", fontSize: 13 }}>{error}</div>
      ) : inquiries.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
            {statusFilter === "all" ? "등록된 문의가 없습니다." : "해당 상태의 문의가 없습니다."}
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
          {inquiries.map((q, i) => (
            <div key={q.id} style={{
              padding: "16px 20px", borderTop: i === 0 ? "none" : "1px solid #f0f0f0",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}
            onClick={() => openDetail(q)}
            onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
            >
              <span style={{
                padding: "3px 10px",
                background: INQUIRY_STATUS_COLORS[q.status].bg,
                color: INQUIRY_STATUS_COLORS[q.status].text,
                borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>
                {INQUIRY_STATUS_LABELS[q.status]}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.title}
                  {q.images.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "#888" }}>📎 {q.images.length}</span>}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#888" }}>
                  {q.customer.name} · {q.customer.email} · {formatDate(q.createdAt)}
                  {q.orderNumber && <span style={{ marginLeft: 6 }}>· 주문 {q.orderNumber}</span>}
                </p>
              </div>

              <div style={{ flexShrink: 0, fontSize: 18, color: "#ccc" }}>›</div>
            </div>
          ))}
        </div>
      )}

      {/* 상세/답변 모달 */}
      {selected && (
        <div
          onClick={closeDetail}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, padding: 24,
              width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span style={{
                  padding: "4px 10px",
                  background: INQUIRY_STATUS_COLORS[selected.status].bg,
                  color: INQUIRY_STATUS_COLORS[selected.status].text,
                  borderRadius: 10, fontSize: 11, fontWeight: 600,
                }}>
                  {INQUIRY_STATUS_LABELS[selected.status]}
                </span>
                <h2 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
                  {selected.title}
                </h2>
              </div>
              <button onClick={closeDetail} style={{
                background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1,
              }}>×</button>
            </div>

            {/* 문의자 정보 */}
            <div style={{ background: "#f8f9fa", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, lineHeight: 1.8 }}>
              <div><b>작성자:</b> {selected.customer.name}</div>
              <div><b>이메일:</b> {selected.customer.email}</div>
              <div><b>연락처:</b> {selected.customer.phone}</div>
              <div><b>작성일:</b> {formatDate(selected.createdAt)}</div>
              {selected.orderNumber && <div><b>관련 주문:</b> {selected.orderNumber}</div>}
            </div>

            {/* 문의 내용 */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#666" }}>문의 내용</h3>
              <div style={{
                padding: 16, background: "#fafafa", borderRadius: 8,
                fontSize: 14, color: "#1a1a1a", lineHeight: 1.6, whiteSpace: "pre-wrap",
              }}>
                {selected.content}
              </div>
            </div>

            {/* 첨부 이미지 */}
            {selected.images.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#666" }}>
                  첨부 이미지 ({selected.images.length}장)
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                  {selected.images.map((img, i) => (
                    <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" style={{
                      position: "relative", paddingBottom: "100%", borderRadius: 8, overflow: "hidden",
                      background: "#f5f6f8", display: "block",
                    }}>
                      <img
                        src={img.url}
                        alt={img.filename}
                        loading="lazy"
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </a>
                  ))}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888" }}>이미지를 클릭하면 원본이 새 창에서 열립니다</p>
              </div>
            )}

            {/* 답변 작성/수정 */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#666" }}>
                답변 {selected.answer && <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>· {formatDate(selected.answer.answeredAt)}에 답변됨</span>}
              </h3>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="고객에게 전달할 답변을 작성해주세요"
                rows={8}
                style={{
                  width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: 8,
                  fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical",
                  lineHeight: 1.6, fontFamily: "inherit",
                }}
              />
            </div>

            {/* 액션 버튼 */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {selected.status !== "closed" && (
                  <button onClick={() => handleClose(selected)} style={{
                    padding: "10px 14px", background: "#fff", border: "1px solid #ddd",
                    borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#666",
                  }}>종료 처리</button>
                )}
                <button onClick={() => handleDelete(selected)} style={{
                  padding: "10px 14px", background: "#fff", border: "1px solid #FFCDD2",
                  color: "#C62828", borderRadius: 8, fontSize: 12, cursor: "pointer",
                }}>삭제</button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={closeDetail} style={{
                  padding: "10px 18px", background: "#fff", border: "1px solid #ddd",
                  borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#666",
                }}>닫기</button>
                <button onClick={handleSaveAnswer} disabled={saving} style={{
                  padding: "10px 18px", background: saving ? "#ccc" : "#1a1a1a", color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: saving ? "default" : "pointer",
                }}>
                  {saving ? "저장 중..." : selected.answer ? "답변 수정" : "답변 등록"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
