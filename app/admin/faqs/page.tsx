"use client";

import React, { useState, useEffect } from "react";
import { Faq } from "../../_lib/types";
import {
  fetchAllFaqs, createFaq, updateFaq, deleteFaq, getNextOrder, reorderFaqs, FaqInput,
} from "../../_lib/faqService";

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FaqInput>({ question: "", answer: "", order: 0, published: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchAllFaqs();
      setFaqs(list);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = async () => {
    const nextOrder = await getNextOrder();
    setEditingId(null);
    setForm({ question: "", answer: "", order: nextOrder, published: true });
    setEditorOpen(true);
  };

  const openEdit = (f: Faq) => {
    setEditingId(f.id);
    setForm({ question: f.question, answer: f.answer, order: f.order, published: f.published });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm({ question: "", answer: "", order: 0, published: true });
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      alert("질문과 답변을 모두 입력해주세요.");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await updateFaq(editingId, form);
      } else {
        await createFaq(form);
      }
      closeEditor();
      await load();
    } catch (err) {
      alert(`저장 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: Faq) => {
    if (!confirm(`"${f.question}" FAQ를 삭제하시겠습니까?`)) return;
    try {
      await deleteFaq(f.id);
      await load();
    } catch (err) {
      alert(`삭제 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  // 순서 이동: 위/아래 버튼
  const handleMove = async (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= faqs.length) return;

    // 두 항목의 order 값을 서로 교환
    const a = faqs[index];
    const b = faqs[target];
    try {
      await reorderFaqs([
        { id: a.id, order: b.order },
        { id: b.id, order: a.order },
      ]);
      await load();
    } catch (err) {
      alert(`순서 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  const handleTogglePublished = async (f: Faq) => {
    try {
      await updateFaq(f.id, { published: !f.published });
      await load();
    } catch (err) {
      alert(`공개 상태 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>FAQ 관리</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
            등록 {faqs.length}건 · 공개 {faqs.filter(f => f.published).length}건
          </p>
        </div>
        <button onClick={openNew} style={{
          padding: "10px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>＋ 새 FAQ 추가</button>
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={{ background: "#FFEBEE", borderRadius: 10, padding: 20, color: "#C62828", fontSize: 13 }}>{error}</div>
      ) : faqs.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>등록된 FAQ가 없습니다.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
          {faqs.map((f, i) => (
            <div key={f.id} style={{
              padding: "16px 20px", borderTop: i === 0 ? "none" : "1px solid #f0f0f0",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              {/* 순서 변경 버튼 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                <button
                  onClick={() => handleMove(i, "up")}
                  disabled={i === 0}
                  style={{
                    padding: "2px 6px", fontSize: 10, background: i === 0 ? "#f5f6f8" : "#fff",
                    border: "1px solid #ddd", borderRadius: 4, cursor: i === 0 ? "default" : "pointer",
                    color: i === 0 ? "#ccc" : "#666",
                  }}
                >▲</button>
                <button
                  onClick={() => handleMove(i, "down")}
                  disabled={i === faqs.length - 1}
                  style={{
                    padding: "2px 6px", fontSize: 10, background: i === faqs.length - 1 ? "#f5f6f8" : "#fff",
                    border: "1px solid #ddd", borderRadius: 4, cursor: i === faqs.length - 1 ? "default" : "pointer",
                    color: i === faqs.length - 1 ? "#ccc" : "#666",
                  }}
                >▼</button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {!f.published && (
                    <span style={{
                      padding: "2px 6px", background: "#FAFAFA", color: "#888",
                      borderRadius: 3, fontSize: 10, fontWeight: 600,
                    }}>비공개</span>
                  )}
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Q. {f.question}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  A. {f.answer}
                </p>
              </div>

              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleTogglePublished(f)} style={{
                  padding: "6px 10px", background: "#fff", border: "1px solid #ddd",
                  borderRadius: 6, fontSize: 12, cursor: "pointer",
                }}>
                  {f.published ? "공개 중" : "비공개"}
                </button>
                <button onClick={() => openEdit(f)} style={{
                  padding: "6px 12px", background: "#f5f6f8", border: "1px solid #ddd",
                  borderRadius: 6, fontSize: 12, cursor: "pointer",
                }}>수정</button>
                <button onClick={() => handleDelete(f)} style={{
                  padding: "6px 12px", background: "#fff", border: "1px solid #FFCDD2",
                  color: "#C62828", borderRadius: 6, fontSize: 12, cursor: "pointer",
                }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 에디터 모달 */}
      {editorOpen && (
        <div
          onClick={closeEditor}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, padding: 24,
              width: "90%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto",
            }}
          >
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
              {editingId ? "FAQ 수정" : "새 FAQ 추가"}
            </h2>

            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#666", fontWeight: 500 }}>질문</span>
              <input
                type="text"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="예: 배송은 얼마나 걸리나요?"
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#666", fontWeight: 500 }}>답변</span>
              <textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="답변 내용을 입력하세요"
                rows={8}
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8,
                  fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical",
                  lineHeight: 1.6, fontFamily: "inherit",
                }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span>공개 (고객 FAQ 화면에 표시)</span>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={closeEditor} disabled={saving} style={{
                padding: "10px 18px", background: "#fff", border: "1px solid #ddd",
                borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#666",
              }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "10px 18px", background: saving ? "#ccc" : "#1a1a1a", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: saving ? "default" : "pointer",
              }}>
                {saving ? "저장 중..." : editingId ? "수정 완료" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
