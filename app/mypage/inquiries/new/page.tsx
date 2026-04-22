"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CustomerPageLayout from "../../../_components/CustomerPageLayout";
import { ensureAuth } from "../../../_lib/orderService";
import { createInquiry, INQUIRY_MAX_IMAGES, INQUIRY_MAX_IMAGE_SIZE } from "../../../_lib/inquiryService";

/**
 * 새 문의 작성 페이지.
 *
 * 이미지 업로드:
 *   - 최대 5장, 각 5MB 이하
 *   - 선택 즉시 썸네일 미리보기 (URL.createObjectURL)
 *   - 각 이미지 개별 삭제 가능
 *
 * 제출 시:
 *   1. ensureAuth()로 익명 UID 확보
 *   2. createInquiry()에 이미지와 함께 전달 → Firestore 문서 생성 + Storage 업로드
 *   3. 성공 시 마이페이지 문의 탭으로 이동
 */

interface LocalImage {
  file: File;
  previewUrl: string;
}

export default function NewInquiryPage() {
  return (
    <Suspense fallback={
      <CustomerPageLayout title="1:1 문의 작성" backHref="/mypage?tab=inquiries">
        <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
        </div>
      </CustomerPageLayout>
    }>
      <NewInquiryContent />
    </Suspense>
  );
}

function NewInquiryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // 주문 상세에서 "이 주문에 대해 문의"로 진입 시 쿼리에서 주문번호 자동 수신
  const [orderNumber, setOrderNumber] = useState(() => searchParams.get("orderNumber") || "");
  const [images, setImages] = useState<LocalImage[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  // 언마운트 시 objectURL 정리
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainSlots = INQUIRY_MAX_IMAGES - images.length;
    if (remainSlots <= 0) {
      alert(`이미지는 최대 ${INQUIRY_MAX_IMAGES}장까지 첨부 가능합니다.`);
      return;
    }

    const toAdd: LocalImage[] = [];
    for (const file of files.slice(0, remainSlots)) {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}: 이미지 파일이 아닙니다.`);
        continue;
      }
      if (file.size > INQUIRY_MAX_IMAGE_SIZE) {
        alert(`${file.name}: 파일 크기가 ${INQUIRY_MAX_IMAGE_SIZE / 1024 / 1024}MB를 초과합니다.`);
        continue;
      }
      toAdd.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setImages([...images, ...toAdd]);

    // 같은 파일을 다시 선택할 수 있도록 input 값 초기화
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    const removed = images[idx];
    URL.revokeObjectURL(removed.previewUrl);
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!userId) {
      setError("인증이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      setError("문의 내용을 입력해주세요.");
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("이름, 이메일, 연락처를 모두 입력해주세요.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const imageFiles = images.map(img => img.file);
      await createInquiry(
        {
          userId,
          customer: { name: name.trim(), email: email.trim(), phone: phone.trim() },
          title: title.trim(),
          content: content.trim(),
          orderNumber: orderNumber.trim() || undefined,
        },
        imageFiles,
      );
      router.replace("/mypage?tab=inquiries");
    } catch (err) {
      setError(err instanceof Error ? err.message : "문의 등록에 실패했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <CustomerPageLayout title="1:1 문의 작성" backHref="/mypage?tab=inquiries">
      {authError ? (
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "#C62828" }}>인증 오류: {authError}</p>
        </Card>
      ) : (
        <>
          {/* 안내 카드 */}
          <div style={{
            background: "linear-gradient(135deg, #fffbf2 0%, #fff8e6 100%)",
            borderRadius: 14, padding: "14px 16px", marginBottom: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}>
            <p style={{ margin: 0, fontSize: 12, color: "#866b2e", lineHeight: 1.6 }}>
              💡 상세한 내용을 작성해주시면 더 정확한 답변을 드릴 수 있습니다.
              문제 상황을 보여주는 사진을 함께 첨부해주세요. (최대 {INQUIRY_MAX_IMAGES}장)
            </p>
          </div>

          {/* 제목 */}
          <Card>
            <Label>제목</Label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문의 제목을 입력해주세요"
              maxLength={100}
              style={inputStyle}
            />
          </Card>

          {/* 내용 */}
          <Card>
            <Label>내용</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문의 내용을 자세히 작성해주세요"
              rows={6}
              maxLength={2000}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
            />
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#999", textAlign: "right" }}>
              {content.length} / 2000
            </p>
          </Card>

          {/* 이미지 첨부 */}
          <Card>
            <Label>
              이미지 첨부 <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>
                ({images.length}/{INQUIRY_MAX_IMAGES}장)
              </span>
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {images.map((img, i) => (
                <div key={i} style={{
                  position: "relative", paddingBottom: "100%", borderRadius: 10,
                  overflow: "hidden", background: "#f5f5f3",
                }}>
                  <img
                    src={img.previewUrl}
                    alt={`첨부 ${i + 1}`}
                    style={{
                      position: "absolute", top: 0, left: 0,
                      width: "100%", height: "100%", objectFit: "cover",
                    }}
                  />
                  <button
                    onClick={() => removeImage(i)}
                    type="button"
                    aria-label="이미지 삭제"
                    style={{
                      position: "absolute", top: 4, right: 4,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)", color: "#fff", border: "none",
                      cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < INQUIRY_MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: "relative", paddingBottom: "100%",
                    background: "#fafaf8", border: "2px dashed #ddd",
                    borderRadius: 10, cursor: "pointer",
                  }}
                >
                  <span style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#888", gap: 2,
                  }}>
                    <span style={{ fontSize: 22, opacity: 0.5 }}>＋</span>
                    사진 추가
                  </span>
                </button>
              )}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#999" }}>
              각 이미지는 {INQUIRY_MAX_IMAGE_SIZE / 1024 / 1024}MB 이하, 최대 {INQUIRY_MAX_IMAGES}장까지 첨부 가능합니다
            </p>
          </Card>

          {/* 연락처 정보 */}
          <Card>
            <Label>답변받을 정보</Label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="연락처 (예: 010-1234-5678)"
              style={inputStyle}
            />
          </Card>

          {/* 주문번호 (선택) */}
          <Card>
            <Label>
              관련 주문번호 <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>(선택)</span>
            </Label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="예: MPA-2026030001"
              style={inputStyle}
            />
          </Card>

          {error && (
            <div style={{
              background: "#FFEBEE", color: "#C62828", borderRadius: 10,
              padding: "12px 14px", fontSize: 13, marginBottom: 14,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !userId}
            style={{
              width: "100%", padding: "16px",
              background: submitting || !userId ? "#ccc" : "#1a1a1a",
              color: "#fff", border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            {submitting ? "등록 중..." : "문의 등록하기"}
          </button>
        </>
      )}
    </CustomerPageLayout>
  );
}

/* ─── 스타일 유틸 ─── */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #e0e0e0",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fafafa",
};

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
