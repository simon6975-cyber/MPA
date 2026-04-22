"use client";

import React, { useState, useEffect } from "react";
import { Notice } from "../../_lib/types";
import {
  fetchAllNotices, createNotice, updateNotice, deleteNotice, togglePinned, NoticeInput,
} from "../../_lib/noticeService";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 에디터 상태 (등록 또는 수정)
  const [editingId, setEditingId] = useState<string | null>(null); // null = 신규, string = 수정
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<NoticeInput>({ title: "", content: "", pinned: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchAllNotices();
      setNotices(list);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ title: "", content: "", pinned: false });
    setEditorOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditingId(n.id);
    setForm({ title: n.title, content: n.content, pinned: n.pinned });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm({ title: "", content: "", pinned: false });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await updateNotice(editingId, form);
      } else {
        await createNotice(form);
      }
      closeEditor();
      await load();
    } catch (err) {
      alert(`저장 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (n: Notice) => {
    if (!confirm(`"${n.title}" 공지를 삭제하시겠습니까?`)) return;
    try {
      await deleteNotice(n.id);
      await load();
    } catch (err) {
      alert(`삭제 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  const handleTogglePin = async (n: Notice) => {
    try {
      await togglePinned(n.id, !n.pinned);
      await load();
    } catch (err) {
      alert(`고정 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>공지사항 관리</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>등록된 공지 {notices.length}건</p>
        </div>
        <button onClick={openNew} style={{
          padding: "10px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>＋ 새 공지 작성</button>
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={{ background: "#FFEBEE", borderRadius: 10, padding: 20, color: "#C62828", fontSize: 13 }}>{error}</div>
      ) : notices.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>등록된 공지사항이 없습니다.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
          {notices.map((n, i) => (
            <div key={n.id} style={{
              padding: "16px 20px", borderTop: i === 0 ? "none" : "1px solid #f0f0f0",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flexShrink: 0 }}>
                {n.pinned && (
                  <span style={{
                    padding: "3px 8px", background: "#FFF3E0", color: "#E65100",
                    borderRadius: 4, fontSize: 10, fontWeight: 700,
                  }}>📌 고정</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.title}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#888" }}>
                  {formatDate(n.updatedAt)} {n.updatedAt !== n.createdAt && "(수정됨)"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleTogglePin(n)} style={{
                  padding: "6px 10px", background: "#fff", border: "1px solid #ddd",
                  borderRadius: 6, fontSize: 12, cursor: "pointer",
                }}>
                  {n.pinned ? "📌 고정 해제" : "📌 고정"}
                </button>
                <button onClick={() => openEdit(n)} style={{
                  padding: "6px 12px", background: "#f5f6f8", border: "1px solid #ddd",
                  borderRadius: 6, fontSize: 12, cursor: "pointer",
                }}>수정</button>
                <button onClick={() => handleDelete(n)} style={{
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
              {editingId ? "공지 수정" : "새 공지 작성"}
            </h2>

            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#666", fontWeight: 500 }}>제목</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="공지 제목을 입력하세요"
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#666", fontWeight: 500 }}>내용</span>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="공지 내용을 입력하세요"
                rows={10}
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
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span>상단 고정 (고객 공지사항 목록에서 맨 위에 표시)</span>
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
