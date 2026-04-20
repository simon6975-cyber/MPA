"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createOrder, OrderCreationProgress } from "./_lib/orderService";
import { isFirebaseConfigured } from "./_lib/firebase";
import { subscribeToProductSettings } from "./_lib/productService";
import type { ProductSettings } from "./_lib/types";
import { DEFAULT_PRODUCT_SETTINGS } from "./_lib/types";

/* ─── 타입 ─── */
interface PhotoItem {
  id: string;
  file: File;
  url: string;
  lastModified: number;
}

/* ─── 상수 ─── */
const MAX_PHOTOS = 100;

/**
 * ▼ 상품 설정 (가격·커버 색상·부가세·배송비)은 Firestore `settings/product`에서
 *   실시간으로 가져옵니다. 관리자 화면(/admin/products)에서 저장하면 고객 앱에도
 *   즉시 반영됩니다. Firestore 연결 전이거나 로딩 중엔 DEFAULT_PRODUCT_SETTINGS 값 사용.
 *
 * v1.11부터 단일 상품 구조 (최대 100장, 10,000원, 부가세 별도).
 */
let COLORS: { name: string; hex: string; light: string }[] =
  DEFAULT_PRODUCT_SETTINGS.colors
    .filter(c => c.enabled)
    .sort((a, b) => a.order - b.order)
    .map(c => ({ name: c.name, hex: c.hex, light: c.light }));

/**
 * 현재 상품 정보를 고객 앱이 필요로 하는 형태로 가공해 반환.
 * 기존 `tier` 인터페이스를 유지해 UI 코드 변경을 최소화함.
 *   - name: 상품명
 *   - max: 최대 수록 장수
 *   - price: "12,100" (부가세 포함, 콤마 포함 문자열)
 *   - priceNumber: 결제 금액 (원 단위 정수, 부가세 포함, 배송비 별도)
 *   - basePrice: 부가세 별도 금액
 *   - vat: 부가세
 */
let CURRENT_SETTINGS: ProductSettings = { ...DEFAULT_PRODUCT_SETTINGS };

function getProduct() {
  const p = CURRENT_SETTINGS.product;
  const vat = Math.round(p.basePrice * p.vatRate);
  const total = p.basePrice + vat;
  return {
    name: p.name,
    description: p.description ?? "",
    max: p.maxPhotos,
    basePrice: p.basePrice,
    vat,
    priceNumber: total,               // 부가세 포함 금액 (배송비 제외)
    price: total.toLocaleString(),    // 표시용 콤마 문자열
    enabled: p.enabled,
    vatRate: p.vatRate,
  };
}

/** 장수와 무관하게 단일 상품을 반환 (기존 getTier 자리). */
function getTier(_n: number) {
  return getProduct();
}

/** Firestore 설정을 모듈 변수에 반영하고, 구독자에게 변경을 알림 */
const _productListeners = new Set<() => void>();
function applyProductSettings(s: ProductSettings) {
  CURRENT_SETTINGS = s;
  COLORS = s.colors
    .filter(c => c.enabled)
    .sort((a, b) => a.order - b.order)
    .map(c => ({ name: c.name, hex: c.hex, light: c.light }));
  _productListeners.forEach(l => l());
}

/** 앱 마운트 시 한 번 호출 — Firestore 구독 시작 + rerender 유발 */
function useProductSettingsSync() {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force(v => v + 1);
    _productListeners.add(rerender);

    let unsub: (() => void) | undefined;
    if (isFirebaseConfigured()) {
      unsub = subscribeToProductSettings(
        (s) => { applyProductSettings(s); },
        (err) => { console.error("상품 설정 구독 실패:", err); }
      );
    }
    return () => {
      _productListeners.delete(rerender);
      unsub?.();
    };
  }, []);
}

const APP_VERSION = "v1.11 · Firebase";

/* ─── 사용자 세션 (간편 로그인) ─── */
interface UserSession {
  provider: "kakao" | "naver";
  name: string;
  phone: string;
  email?: string;
}

/* ─── 공통 컴포넌트 ─── */

function StatusBar() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ height: "env(safe-area-inset-top, 44px)", minHeight: 44, display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 24px 6px", fontSize: 14, fontWeight: 600, color: "#1a1a1a", background: "transparent", flexShrink: 0 }}>
      <span>{time}</span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="#1a1a1a">
          <rect x="0" y="6" width="3" height="5" rx="0.8" />
          <rect x="4.5" y="3.5" width="3" height="7.5" rx="0.8" />
          <rect x="9" y="1" width="3" height="10" rx="0.8" />
          <rect x="13" y="0" width="3" height="11" rx="0.8" opacity=".3" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="#1a1a1a">
          <rect x="0" y="1" width="21" height="10" rx="2.2" fill="none" stroke="#1a1a1a" strokeWidth="1" />
          <rect x="22" y="3.5" width="2.5" height="5" rx="1" opacity=".4" />
          <rect x="1.5" y="2.5" width="15" height="7" rx="1" />
        </svg>
      </div>
    </div>
  );
}

function NavHeader({ title, left, right, onLeft }: { title: string; left?: string; right?: string; onLeft?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 20px 14px", flexShrink: 0 }}>
      <span onClick={onLeft} style={{ fontSize: 15, color: "#888", minWidth: 50, cursor: onLeft ? "pointer" : "default" }}>{left || ""}</span>
      <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
      <span style={{ fontSize: 15, color: "#888", minWidth: 50, textAlign: "right" }}>{right || ""}</span>
    </div>
  );
}

function BottomButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div style={{ padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 20px))", flexShrink: 0 }}>
      <button onClick={onClick} disabled={disabled} style={{
        width: "100%", padding: "16px 0", background: disabled ? "#ddd" : "#1a1a1a",
        color: disabled ? "#999" : "#fff", border: "none", borderRadius: 14, fontSize: 16,
        fontWeight: 600, cursor: disabled ? "default" : "pointer", transition: "background 0.2s",
      }}>
        {label}
      </button>
    </div>
  );
}

/* ─── 데모 모드 배너 (네이티브 전환 시 제거) ─── */

function DemoBanner({ variant = "info", title, message }: {
  variant?: "info" | "warning";
  title: string;
  message: string;
}) {
  const colors = variant === "warning"
    ? { bg: "#FFF3E0", border: "#FFB74D", text: "#E65100", icon: "#F57C00" }
    : { bg: "#E3F2FD", border: "#90CAF9", text: "#1565C0", icon: "#1976D2" };

  return (
    <div style={{
      margin: "0 20px 12px",
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: colors.text, letterSpacing: 0.3 }}>
          {title}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: colors.text, lineHeight: 1.5, opacity: 0.9 }}>
          {message}
        </p>
      </div>
    </div>
  );
}

/* ─── 스플래시 ─── */

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ height: "100%", background: "#0d0d0d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, animation: "fadeIn 0.6s ease" }}>
      <div style={{ display: "flex", gap: 5 }}>
        {["#E8593C", "#F9A825", "#4CAF50"].map((c, i) => (
          <div key={i} style={{ width: 44, height: 64, background: c, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", animation: `slideUp 0.5s ease ${i * 0.12}s both` }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 28, fontFamily: "Georgia, serif" }}>{"MPA"[i]}</span>
          </div>
        ))}
      </div>
      <p style={{ color: "#555", fontSize: 12, letterSpacing: 3, margin: 0 }}>MOBILE PHOTO ALBUM</p>
      <p style={{ color: "#444", fontSize: 10, margin: "8px 0 0", letterSpacing: 1 }}>{APP_VERSION}</p>
      <div style={{
        marginTop: 14,
        padding: "4px 12px",
        border: "1px solid #555",
        borderRadius: 12,
        fontSize: 9,
        color: "#888",
        letterSpacing: 1.5,
        fontWeight: 600,
      }}>
        PROTOTYPE · 데모 모드
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

/* ─── 홈 ─── */

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* 전역 데모 배너 */}
      <DemoBanner
        variant="info"
        title="PROTOTYPE · 데모 모드"
        message="이 앱은 iOS/Android 네이티브 출시 전 웹 프로토타입입니다. 일부 동작은 실제와 다를 수 있어요."
      />

      <div style={{ flex: 1, padding: "8px 24px 24px", overflow: "auto" }}>
        <h1 style={{ fontSize: 30, fontWeight: 300, color: "#1a1a1a", lineHeight: 1.35, fontFamily: "Georgia, serif", margin: 0 }}>
          나만의<br /><span style={{ fontWeight: 700 }}>포토앨범</span>을<br />만들어보세요
        </h1>
        <p style={{ color: "#999", fontSize: 15, marginTop: 16, lineHeight: 1.7 }}>
          사진 보관함에서 사진을 선택하면<br />최대 100장까지 자동으로 앨범에 담깁니다
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 32, overflow: "auto", paddingBottom: 4 }}>
          {COLORS.map((c) => (
            <div key={c.name} style={{ minWidth: 46, height: 64, background: c.hex, borderRadius: 6, boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }} />
          ))}
        </div>
        <p style={{ color: "#ccc", fontSize: 11, marginTop: 8 }}>6가지 컬러 커버</p>
        <button onClick={onStart} style={{ width: "100%", marginTop: 36, padding: "17px 0", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 600, cursor: "pointer" }}>
          사진 보관함에서 선택하기
        </button>

        {/* 사진 선택 팝업 관련 안내 */}
        <div style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "#FFF8E1",
          border: "1px dashed #F9A825",
          borderRadius: 10,
        }}>
          <p style={{ fontSize: 11, color: "#E65100", fontWeight: 700, margin: 0, letterSpacing: 0.3 }}>
            ⚠ 웹 브라우저 제한 안내
          </p>
          <p style={{ fontSize: 11, color: "#795548", margin: "4px 0 0", lineHeight: 1.6 }}>
            웹 환경에서는 버튼 클릭 시 브라우저가 <b>[사진보관함 / 사진찍기 / 파일선택]</b> 팝업을 띄웁니다. 이는 OS 보안 정책상 웹에서 제거할 수 없습니다.<br />
            <span style={{ color: "#1a1a1a", fontWeight: 600 }}>iOS/Android 네이티브 앱 출시 시에는 팝업 없이 사진 보관함이 바로 열립니다.</span>
          </p>
        </div>

        <p style={{ fontSize: 12, color: "#bbb", marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
          사진을 많이 선택할수록 좋아요 (최대 100장)<br />선택한 사진은 이후 화면에서 조정할 수 있어요
        </p>
        <div style={{ marginTop: 20, padding: 16, background: "#f0eeeb", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "#999", margin: 0 }}>최근 주문</p>
          <p style={{ fontSize: 15, color: "#444", margin: "6px 0 0", fontWeight: 500 }}>2026 봄 여행 앨범</p>
          <p style={{ fontSize: 13, color: "#4CAF50", margin: "4px 0 0" }}>배송 완료</p>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 0", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 16px))", borderTop: "1px solid #eee", flexShrink: 0 }}>
        {["홈", "주문내역", "설정"].map((t, i) => (
          <span key={t} style={{ fontSize: 12, color: i === 0 ? "#1a1a1a" : "#ccc", fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── 사진 선택 (실제 사진 보관함) ─── */

function GalleryScreen({
  allPhotos, selectedIds, setSelectedIds, onNext, onBack, onAddMore,
}: {
  allPhotos: PhotoItem[];
  selectedIds: string[];
  setSelectedIds: (fn: (prev: string[]) => string[]) => void;
  onNext: () => void;
  onBack: () => void;
  onAddMore: () => void;
}) {
  const toggle = (id: string) => {
    setSelectedIds((prev: string[]) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PHOTOS) return prev;
      return [...prev, id];
    });
  };

  const selectAll = () => {
    const ids = allPhotos.slice(0, MAX_PHOTOS).map(p => p.id);
    setSelectedIds(() => ids);
  };

  const deselectAll = () => {
    setSelectedIds(() => []);
  };

  const count = selectedIds.length;
  const allSelected = count === Math.min(allPhotos.length, MAX_PHOTOS);

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="사진 선택" left="취소" right={`${count}/${MAX_PHOTOS}`} onLeft={onBack} />

      {/* 상태 안내 */}
      <div style={{ padding: "0 20px 6px", flexShrink: 0 }}>
        <div style={{
          background: count > 0 ? "#E8F5E9" : "#FFF3E0", borderRadius: 10, padding: "10px 14px",
          fontSize: 13, color: count > 0 ? "#2E7D32" : "#E65100", lineHeight: 1.5,
        }}>
          {count > 0
            ? `${allPhotos.length}장 중 ${count}장이 앨범에 포함됩니다. 탭하여 추가/제거하세요.`
            : "사진을 탭하여 앨범에 포함할 사진을 선택하세요."}
        </div>
      </div>

      {/* 도구 바 */}
      <div style={{ padding: "0 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={allSelected ? deselectAll : selectAll} style={{
            padding: "6px 12px", background: "none", border: "1px solid #ddd",
            borderRadius: 8, fontSize: 12, color: "#666", cursor: "pointer",
          }}>
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
          <button onClick={onAddMore} style={{
            padding: "6px 12px", background: "#f0eeeb", border: "none",
            borderRadius: 8, fontSize: 12, color: "#555", fontWeight: 500, cursor: "pointer",
          }}>
            + 사진 추가
          </button>
        </div>
        <span style={{ fontSize: 12, color: "#bbb" }}>
          총 {allPhotos.length}장
        </span>
      </div>

      {/* 사진 그리드 */}
      <div style={{
        flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch",
        padding: "0 2px 2px",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2,
        }}>
          {allPhotos.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            const orderNum = isSelected ? selectedIds.indexOf(p.id) + 1 : -1;
            const maxReached = count >= MAX_PHOTOS;

            return (
              <div key={p.id} onClick={() => toggle(p.id)} style={{
                position: "relative", cursor: "pointer",
                paddingBottom: "100%", /* 정사각형 보장 */
                border: isSelected ? "2.5px solid #1a1a1a" : "2.5px solid transparent",
                transition: "border 0.15s", overflow: "hidden",
              }}>
                <img src={p.url} alt="" loading="lazy" style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                  opacity: isSelected ? 0.85 : 1, transition: "opacity 0.15s",
                }} />
                {isSelected && (
                  <div style={{
                    position: "absolute", top: 4, right: 4, width: 24, height: 24,
                    background: "#1a1a1a", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 11, fontWeight: 700, zIndex: 2,
                  }}>
                    {orderNum}
                  </div>
                )}
                {!isSelected && maxReached && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(250,250,248,0.6)", zIndex: 1 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomButton
        label={count > 0 ? `${count}장 선택 완료` : "사진을 선택하세요"}
        onClick={onNext}
        disabled={count === 0}
      />
    </div>
  );
}

/* ─── 순서 정렬 (v1.81) ─── */

function ArrangeScreen({ allPhotos, selectedIds, setSelectedIds, onNext, onBack }: {
  allPhotos: PhotoItem[]; selectedIds: string[]; setSelectedIds: (fn: (prev: string[]) => string[]) => void; onNext: () => void; onBack: () => void;
}) {
  const photoMap = useMemo(() => new Map(allPhotos.map(p => [p.id, p])), [allPhotos]);

  const dragFrom = useRef<number | null>(null);
  const dragTo = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const lastX = useRef(0);
  const lastY = useRef(0);
  const scrollRafId = useRef<number | null>(null);
  const layoutRef = useRef({ colW: 1, rowH: 1 });
  // 하이라이트 중인 셀 (DOM 직접 조작 — state 리렌더 없음)
  const prevHighlight = useRef<{ sourceEl: HTMLElement | null; targetEl: HTMLElement | null }>({ sourceEl: null, targetEl: null });

  const clearAll = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (scrollRafId.current) { cancelAnimationFrame(scrollRafId.current); scrollRafId.current = null; }
  }, []);

  // 그리드 측정
  const measure = useCallback(() => {
    if (!gridRef.current) return;
    const ch = gridRef.current.children;
    if (ch.length < 4) return;
    const c0 = (ch[0] as HTMLElement).getBoundingClientRect();
    const c1 = (ch[1] as HTMLElement).getBoundingClientRect();
    const c3 = (ch[3] as HTMLElement).getBoundingClientRect();
    layoutRef.current = { colW: c1.left - c0.left, rowH: c3.top - c0.top };
  }, []);

  // 좌표 → 인덱스
  const hitTest = useCallback((cx: number, cy: number): number | null => {
    if (!gridRef.current) return null;
    const { colW, rowH } = layoutRef.current;
    if (colW <= 0 || rowH <= 0) return null;
    const r = gridRef.current.getBoundingClientRect();
    const lx = cx - r.left, ly = cy - r.top;
    if (lx < 0 || ly < 0) return null;
    const col = Math.min(Math.max(Math.floor(lx / colW), 0), 2);
    const row = Math.max(Math.floor(ly / rowH), 0);
    const idx = row * 3 + col;
    return (idx >= 0 && idx < selectedIds.length) ? idx : null;
  }, [selectedIds.length]);

  // DOM 직접 하이라이트 — state 변경 없이 시각 피드백
  const highlightCell = useCallback((newIdx: number | null) => {
    const { sourceEl, targetEl } = prevHighlight.current;
    // 이전 타겟 해제
    if (targetEl) {
      targetEl.style.outline = "none";
      const badge = targetEl.querySelector("[data-badge]") as HTMLElement | null;
      if (badge) { badge.style.background = "rgba(0,0,0,0.55)"; badge.textContent = badge.dataset.orig || ""; }
    }
    dragTo.current = newIdx;
    if (newIdx === null || newIdx === dragFrom.current || !gridRef.current) return;
    const el = gridRef.current.children[newIdx] as HTMLElement | null;
    if (!el) return;
    el.style.outline = "2.5px solid #1976D2";
    const badge = el.querySelector("[data-badge]") as HTMLElement | null;
    if (badge && dragFrom.current !== null) {
      badge.style.background = "rgba(25,118,210,0.85)";
      badge.textContent = dragFrom.current < newIdx ? `← ${dragFrom.current + 1}` : `${dragFrom.current + 1} →`;
    }
    prevHighlight.current.targetEl = el;
  }, []);

  const highlightSource = useCallback((idx: number) => {
    if (!gridRef.current) return;
    const el = gridRef.current.children[idx] as HTMLElement | null;
    if (!el) return;
    el.style.transform = "scale(1.06)";
    el.style.zIndex = "10";
    el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
    el.style.opacity = "0.85";
    const badge = el.querySelector("[data-badge]") as HTMLElement | null;
    if (badge) badge.style.background = "rgba(25,118,210,0.85)";
    prevHighlight.current.sourceEl = el;
  }, []);

  const clearHighlights = useCallback(() => {
    const { sourceEl, targetEl } = prevHighlight.current;
    if (sourceEl) {
      sourceEl.style.transform = ""; sourceEl.style.zIndex = "";
      sourceEl.style.boxShadow = ""; sourceEl.style.opacity = "";
      const badge = sourceEl.querySelector("[data-badge]") as HTMLElement | null;
      if (badge) { badge.style.background = "rgba(0,0,0,0.55)"; badge.textContent = badge.dataset.orig || ""; }
    }
    if (targetEl) {
      targetEl.style.outline = "none";
      const badge = targetEl.querySelector("[data-badge]") as HTMLElement | null;
      if (badge) { badge.style.background = "rgba(0,0,0,0.55)"; badge.textContent = badge.dataset.orig || ""; }
    }
    prevHighlight.current = { sourceEl: null, targetEl: null };
  }, []);

  // 자동 스크롤 + 셀 추적 루프
  const startScrollLoop = useCallback(() => {
    const tick = () => {
      if (!scrollRef.current || !isDraggingRef.current) { scrollRafId.current = null; return; }
      const rect = scrollRef.current.getBoundingClientRect();
      const y = lastY.current;
      const edge = 80, speed = 20;
      let d = 0;
      if (y < rect.top + edge) {
        const ratio = Math.min(1, (rect.top + edge - y) / edge);
        d = -speed * ratio * ratio;
      } else if (y > rect.bottom - edge) {
        const ratio = Math.min(1, (y - rect.bottom + edge) / edge);
        d = speed * ratio * ratio;
      }
      if (d !== 0) {
        scrollRef.current.scrollTop += d;
      }
      // 스크롤 여부와 무관하게 항상 셀 추적
      const idx = hitTest(lastX.current, lastY.current);
      if (idx !== null && idx !== dragTo.current) {
        highlightCell(idx);
      }
      scrollRafId.current = requestAnimationFrame(tick);
    };
    if (scrollRafId.current) cancelAnimationFrame(scrollRafId.current);
    scrollRafId.current = requestAnimationFrame(tick);
  }, [hitTest, highlightCell]);

  // 네이티브 이벤트 리스너로 non-passive touchmove 등록
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];

      if (!isDraggingRef.current) {
        // 롱프레스 대기 중 움직임 → 취소
        if (longPressTimer.current) {
          if (Math.abs(t.clientX - touchStartPos.current.x) > 8 || Math.abs(t.clientY - touchStartPos.current.y) > 8) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        return; // 기본 스크롤 허용
      }

      // 드래그 중 — 스크롤 차단
      e.preventDefault();
      e.stopPropagation();
      lastX.current = t.clientX;
      lastY.current = t.clientY;
    };

    // { passive: false }로 등록해야 iOS Safari에서 preventDefault 동작
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => container.removeEventListener("touchmove", handleTouchMove);
  }, []);

  // 터치 시작
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const el = (e.target as HTMLElement).closest("[data-ci]") as HTMLElement | null;
    if (!el) return;
    const ci = parseInt(el.dataset.ci!, 10);
    if (isNaN(ci)) return;

    touchStartPos.current = { x: t.clientX, y: t.clientY };
    lastX.current = t.clientX;
    lastY.current = t.clientY;

    longPressTimer.current = setTimeout(() => {
      measure();
      dragFrom.current = ci;
      dragTo.current = ci;
      isDraggingRef.current = true;
      setIsDragging(true);
      highlightSource(ci);
      if (navigator.vibrate) navigator.vibrate(30);
      startScrollLoop();
    }, 400);
  }, [measure, highlightSource, startScrollLoop]);

  const onTouchEnd = useCallback(() => {
    clearAll();
    const from = dragFrom.current;
    const to = dragTo.current;
    if (isDraggingRef.current && from !== null && to !== null && from !== to) {
      setSelectedIds((prev: string[]) => {
        const arr = [...prev];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return arr;
      });
    }
    clearHighlights();
    dragFrom.current = null;
    dragTo.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
  }, [clearAll, clearHighlights, setSelectedIds]);

  useEffect(() => () => clearAll(), [clearAll]);

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column", userSelect: "none" }}>
      <StatusBar />
      <NavHeader title="순서 정렬" left="이전" right={`${selectedIds.length}장`} onLeft={onBack} />
      <div style={{ padding: "0 20px", flexShrink: 0 }}>
        <div style={{
          background: isDragging ? "#E3F2FD" : "#f0eeeb", borderRadius: 10, padding: "10px 14px",
          fontSize: 13, color: isDragging ? "#1565C0" : "#999", lineHeight: 1.5,
          marginBottom: 8,
        }}>
          {isDragging ? "손가락을 움직여 원하는 위치에 놓아주세요" : "사진을 꾹 눌러 순서를 변경할 수 있어요"}
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", padding: "4px 20px 20px" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {selectedIds.map((id, i) => {
            const photo = photoMap.get(id);
            return (
              <div key={id} data-ci={i} style={{
                position: "relative", paddingBottom: "100%", borderRadius: 10, overflow: "hidden",
                transition: "transform 0.15s, opacity 0.15s",
              }}>
                {photo ? (
                  <img src={photo.url} alt="" draggable={false} loading="lazy" style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    objectFit: "cover", display: "block", pointerEvents: "none",
                  }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, background: "#ddd" }} />
                )}
                <span data-badge="" data-orig={`${i + 1}`} style={{
                  position: "absolute", bottom: 5, left: 5,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff", fontSize: 10, padding: "2px 7px", borderRadius: 5, fontWeight: 600, zIndex: 2,
                }}>{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
      <BottomButton label="다음" onClick={onNext} />
    </div>
  );
}

/* ─── 커버 색상 (실물 사진) ─── */

function CoverScreen({ colorIdx, setColorIdx, onNext, onBack }: { colorIdx: number; setColorIdx: (i: number) => void; onNext: () => void; onBack: () => void }) {
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="커버 색상" left="이전" onLeft={onBack} />
      <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", padding: "0 20px" }}>
        {/* 선택된 커버 대형 미리보기 */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          marginBottom: 24, paddingTop: 8,
        }}>
          <div style={{
            width: "55%", maxWidth: 220, aspectRatio: "1", borderRadius: 12,
            overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            transition: "box-shadow 0.3s",
            position: "relative",
          }}>
            <img
              src={`/cover-${colorIdx}.jpg`}
              alt={COLORS[colorIdx].name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: COLORS[colorIdx].hex, margin: "16px 0 0", transition: "color 0.3s" }}>
            {COLORS[colorIdx].name}
          </p>
          <p style={{ fontSize: 13, color: "#aaa", margin: "4px 0 0" }}>커버를 터치하여 색상을 선택하세요</p>
        </div>

        {/* 6가지 커버 그리드 (2x3) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, paddingBottom: 20 }}>
          {COLORS.map((c, i) => {
            const isSelected = colorIdx === i;
            return (
              <div
                key={c.name}
                onClick={() => setColorIdx(i)}
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: isSelected ? `3px solid ${c.hex}` : "3px solid transparent",
                  boxShadow: isSelected ? `0 4px 16px ${c.hex}40` : "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "all 0.25s ease",
                  transform: isSelected ? "scale(1.03)" : "scale(1)",
                }}
              >
                <div style={{ paddingBottom: "100%", position: "relative" }}>
                  <img
                    src={`/cover-${i}.jpg`}
                    alt={c.name}
                    style={{
                      position: "absolute", top: 0, left: 0,
                      width: "100%", height: "100%", objectFit: "cover", display: "block",
                    }}
                  />
                  {/* 선택 표시 체크마크 */}
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      width: 24, height: 24, borderRadius: "50%",
                      background: c.hex, display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  {/* 색상명 */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                    padding: "16px 8px 6px",
                  }}>
                    <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                      {c.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomButton label="이 색상으로 선택" onClick={onNext} />
    </div>
  );
}

/* ─── 로그인 / 간편 회원가입 ─── */

function LoginScreen({ onLogin, onBack }: {
  onLogin: (session: UserSession) => void;
  onBack: () => void;
}) {
  const [loggingIn, setLoggingIn] = useState<"kakao" | "naver" | null>(null);

  // ▼ 네이티브 앱 포팅 가이드 ▼
  // Kakao SDK: KakaoSDK.initSDK(AppKey) 후 UserApi.shared.loginWithKakaoTalk { ... }
  // Naver SDK: NaverThirdPartyLoginConnection.getSharedInstance().requestThirdPartyLogin()
  // 웹에서는 OAuth redirect 플로우 (Firebase Auth의 OAuthProvider 사용 가능)
  // 현재는 UI/UX 데모를 위한 모의 로그인
  const handleSocialLogin = useCallback((provider: "kakao" | "naver") => {
    setLoggingIn(provider);
    // 모의 OAuth 플로우 (1.5초 지연 후 자동 로그인)
    setTimeout(() => {
      const mockSession: UserSession = {
        provider,
        name: provider === "kakao" ? "김용주" : "이용주",
        phone: "010-1234-5678",
        email: provider === "kakao" ? "user@kakao.com" : "user@naver.com",
      };
      setLoggingIn(null);
      onLogin(mockSession);
    }, 1500);
  }, [onLogin]);

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="로그인" left="이전" onLeft={onBack} />

      {/* 데모 경고 배너 */}
      <DemoBanner
        variant="warning"
        title="⚠ 데모 로그인 · 실제 인증 아님"
        message="현재는 프로토타입으로, 실제 카카오/네이버 계정으로 인증되지 않습니다. 어떤 버튼을 눌러도 모의 계정으로 로그인됩니다. 네이티브 앱 출시 시 실제 SDK가 연동됩니다."
      />

      <div style={{ flex: 1, padding: "8px 28px 0", display: "flex", flexDirection: "column" }}>
        {/* 상단 안내 */}
        <div style={{ textAlign: "center", marginTop: 12, marginBottom: 30 }}>
          <div style={{ display: "inline-flex", gap: 4, marginBottom: 18 }}>
            {["#E8593C", "#F9A825", "#4CAF50"].map((c, i) => (
              <div key={i} style={{ width: 28, height: 40, background: c, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 17, fontFamily: "Georgia, serif" }}>{"MPA"[i]}</span>
              </div>
            ))}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
            간편 로그인
          </h2>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, margin: 0 }}>
            주문 진행을 위해 로그인이 필요합니다<br />
            소셜 계정으로 간편하게 시작하세요
          </p>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 카카오 */}
          <button
            onClick={() => handleSocialLogin("kakao")}
            disabled={loggingIn !== null}
            style={{
              width: "100%", padding: "16px 20px",
              background: "#FEE500", border: "none", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 16, fontWeight: 600, color: "#191919",
              cursor: loggingIn ? "default" : "pointer",
              opacity: loggingIn && loggingIn !== "kakao" ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {/* 카카오 말풍선 아이콘 */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.9 1.92 5.44 4.78 6.82L5.5 21.5c-.14.41.29.75.65.52l4.32-2.88c.5.06 1.01.1 1.53.1 5.52 0 10-3.58 10-8.24S17.52 3 12 3z"/>
            </svg>
            {loggingIn === "kakao" ? "모의 로그인 처리 중..." : "카카오로 시작하기 (데모)"}
          </button>

          {/* 네이버 */}
          <button
            onClick={() => handleSocialLogin("naver")}
            disabled={loggingIn !== null}
            style={{
              width: "100%", padding: "16px 20px",
              background: "#03C75A", border: "none", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 16, fontWeight: 600, color: "#fff",
              cursor: loggingIn ? "default" : "pointer",
              opacity: loggingIn && loggingIn !== "naver" ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {/* 네이버 N 아이콘 */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
            {loggingIn === "naver" ? "모의 로그인 처리 중..." : "네이버로 시작하기 (데모)"}
          </button>
        </div>

        {/* 안내 문구 */}
        <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", lineHeight: 1.7, marginTop: 28 }}>
          로그인 시 <span style={{ color: "#888", textDecoration: "underline" }}>서비스 이용약관</span> 및<br />
          <span style={{ color: "#888", textDecoration: "underline" }}>개인정보 처리방침</span>에 동의하는 것으로 간주됩니다
        </p>

        <div style={{ flex: 1 }} />

        {/* 하단 보안 안내 */}
        <div style={{
          background: "#f0eeeb", borderRadius: 10, padding: "12px 14px",
          marginBottom: "calc(20px + env(safe-area-inset-bottom, 16px))",
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ fontSize: 11, color: "#888", margin: 0, lineHeight: 1.5 }}>
            MPA는 소셜 로그인 정보(이름·연락처) 외<br />
            추가 개인정보를 수집하지 않습니다
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── 주문 정보 ─── */

function OrderScreen({ selectedIds, colorIdx, session, onNext, onBack, onOrderInfoChange }: {
  selectedIds: string[];
  colorIdx: number;
  session: UserSession;
  onNext: () => void;
  onBack: () => void;
  onOrderInfoChange: (info: { name: string; phone: string; address: string; addressDetail: string; message: string }) => void;
}) {
  const tier = getTier(selectedIds.length);
  const [name, setName] = useState(session.name);
  const [phone, setPhone] = useState(session.phone);
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [message, setMessage] = useState("");

  // 필드 변경 시마다 상위에 전달
  useEffect(() => {
    onOrderInfoChange({ name, phone, address, addressDetail, message });
  }, [name, phone, address, addressDetail, message, onOrderInfoChange]);

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="주문 정보" left="이전" onLeft={onBack} />
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 16px" }}>
        {/* 로그인 사용자 정보 배너 */}
        <div style={{
          background: "#fff", border: "1px solid #eee", borderRadius: 12,
          padding: "10px 14px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: session.provider === "kakao" ? "#FEE500" : "#03C75A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            color: session.provider === "kakao" ? "#191919" : "#fff",
          }}>
            {session.provider === "kakao" ? "K" : "N"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>
              {session.name}님 로그인됨
              <span style={{
                marginLeft: 6,
                fontSize: 9,
                fontWeight: 700,
                color: "#E65100",
                background: "#FFF3E0",
                padding: "1px 5px",
                borderRadius: 4,
                letterSpacing: 0.3,
              }}>
                DEMO
              </span>
            </p>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: "#999" }}>
              {session.provider === "kakao" ? "카카오 계정 (모의)" : "네이버 계정 (모의)"} · {session.email}
            </p>
          </div>
        </div>

        <div style={{ background: COLORS[colorIdx].light, borderRadius: 14, padding: 16, display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 50, height: 66, background: COLORS[colorIdx].hex, borderRadius: "2px 7px 7px 2px", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{tier.name}</p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#888" }}>{selectedIds.length}장 · {COLORS[colorIdx].name}</p>
            <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>₩{tier.price}</p>
          </div>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "0 0 14px" }}>배송 정보</p>

        {/* 받는 분 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 5 }}>받는 분</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            style={{ width: "100%", padding: "13px 14px", background: "#f0eeeb", border: "none", borderRadius: 10, fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* 연락처 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 5 }}>연락처</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            style={{ width: "100%", padding: "13px 14px", background: "#f0eeeb", border: "none", borderRadius: 10, fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* 주소 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 5 }}>주소</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소를 검색하세요"
            style={{ width: "100%", padding: "13px 14px", background: "#f0eeeb", border: "none", borderRadius: 10, fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* 상세주소 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 5 }}>상세주소</label>
          <input
            type="text"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="동/호수를 입력하세요"
            style={{ width: "100%", padding: "13px 14px", background: "#f0eeeb", border: "none", borderRadius: 10, fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "20px 0 14px" }}>배송 메시지</p>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="부재 시 문 앞에 놓아주세요"
          style={{ width: "100%", padding: "13px 14px", background: "#f0eeeb", border: "none", borderRadius: 10, fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" }}
        />
      </div>
      <BottomButton label="결제하기" onClick={onNext} />
    </div>
  );
}

/* ─── 결제 ─── */

function PaymentScreen({
  allPhotos, selectedIds, colorIdx, session, orderInfo, onNext, onBack,
}: {
  allPhotos: PhotoItem[];
  selectedIds: string[];
  colorIdx: number;
  session: UserSession;
  orderInfo: { name: string; phone: string; address: string; addressDetail: string; message: string };
  onNext: (orderId: string) => void;
  onBack: () => void;
}) {
  const tier = getTier(selectedIds.length);
  const [method, setMethod] = useState(0);
  const [processing, setProcessing] = useState<null | "paying" | "uploading" | "saving">(null);
  const [progress, setProgress] = useState<OrderCreationProgress | null>(null);
  const [error, setError] = useState("");
  const totalPages = Math.ceil(selectedIds.length / 8);

  // Firebase 설정 여부 확인 (개발 중 환경변수 누락 감지)
  const firebaseReady = isFirebaseConfigured();

  const handlePay = useCallback(async () => {
    setError("");

    // ─ 1단계: 결제 시뮬레이션 (실제는 PG사 결제 API) ─
    setProcessing("paying");
    await new Promise(r => setTimeout(r, 1200));

    // ─ 2단계: 사진 업로드 + 주문 저장 (Firebase) ─
    try {
      // 선택된 사진들을 순서대로 File 객체와 함께 준비
      const selectedPhotos = selectedIds
        .map((id, idx) => {
          const photo = allPhotos.find(p => p.id === id);
          if (!photo) return null;
          return { file: photo.file, order: idx };
        })
        .filter((p): p is { file: File; order: number } => p !== null);

      const tierKey: "mini" | "standard" | "premium" = "standard"; // v1.11부터 단일 상품 → 항상 "standard"

      setProcessing("uploading");

      const orderId = await createOrder(
        {
          photos: selectedPhotos,
          customer: {
            name: orderInfo.name || session.name,
            phone: orderInfo.phone || session.phone,
            email: session.email || "",
            provider: session.provider,
          },
          product: {
            tier: tierKey,
            tierName: tier.name,
            photoCount: selectedIds.length,
            coverColor: COLORS[colorIdx].name,
            coverHex: COLORS[colorIdx].hex,
          },
          shipping: {
            address: orderInfo.address,
            addressDetail: orderInfo.addressDetail,
            message: orderInfo.message,
          },
          payment: {
            amount: tier.priceNumber, // 부가세 포함 (배송비는 현재 고객 화면에 표시만 하고 결제엔 포함 X)
            method: method === 0 ? "applepay" : "card",
          },
        },
        (p) => {
          setProgress(p);
          if (p.stage === "saving") setProcessing("saving");
        }
      );

      // 성공! 다음 화면으로 (주문 ID 전달)
      setProcessing(null);
      onNext(orderId);
    } catch (err) {
      console.error("주문 생성 실패:", err);
      setError(err instanceof Error ? err.message : "주문 생성 중 오류가 발생했습니다");
      setProcessing(null);
      setProgress(null);
    }
  }, [allPhotos, selectedIds, colorIdx, session, orderInfo, method, tier, onNext]);

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column", position: "relative" }}>
      <StatusBar />
      <NavHeader title="결제" left={processing ? "" : "이전"} onLeft={processing ? undefined : onBack} />
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px" }}>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#999" }}>결제 금액</p>
          <p style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>₩{tier.price}</p>
          <div style={{ marginTop: 14, borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#888", marginBottom: 6 }}>
              <span>{tier.name}</span><span>₩{tier.price}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#888" }}>
              <span>배송비</span><span style={{ color: "#4CAF50" }}>무료</span>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "24px 0 12px" }}>결제 수단</p>
        {[
          { label: "Apple Pay", sub: "간편결제", icon: "" },
          { label: "신용/체크카드", sub: "카드 결제", icon: "💳" },
        ].map((m, i) => (
          <div key={m.label} onClick={() => !processing && setMethod(i)} style={{
            padding: "16px", background: method === i ? "#1a1a1a" : "#fff",
            border: method === i ? "none" : "1px solid #eee", borderRadius: 14,
            display: "flex", alignItems: "center", gap: 14, cursor: processing ? "default" : "pointer",
            marginBottom: 10, transition: "all 0.2s", opacity: processing ? 0.5 : 1,
          }}>
            <div style={{ width: 40, height: 40, background: method === i ? "#fff" : "#f0eeeb", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {m.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: method === i ? "#fff" : "#1a1a1a" }}>{m.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: method === i ? "#888" : "#bbb" }}>{m.sub}</p>
            </div>
          </div>
        ))}

        {/* 출력 파일 안내 */}
        <div style={{
          marginTop: 16, padding: "12px 14px",
          background: "#F3E5F5", borderRadius: 10,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6A1B9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#6A1B9A" }}>제작용 출력 파일 자동 생성</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6A1B9A", lineHeight: 1.5, opacity: 0.85 }}>
              결제 완료 시 {selectedIds.length}장의 사진으로 <b>{totalPages}페이지</b>짜리 인쇄용 PDF가 자동 생성되어 관리자에게 전달됩니다.
            </p>
          </div>
        </div>
      </div>
      <BottomButton
        label={processing ? "처리 중..." : (method === 0 ? " Pay로 결제" : `₩${tier.price} 결제하기`)}
        onClick={handlePay}
        disabled={!!processing || !firebaseReady}
      />

      {/* Firebase 미설정 경고 */}
      {!firebaseReady && (
        <div style={{
          position: "absolute", bottom: 80, left: 20, right: 20,
          padding: "10px 12px",
          background: "#FFEBEE", border: "1px solid #FFCDD2",
          borderRadius: 8, fontSize: 11, color: "#C62828",
          lineHeight: 1.5,
        }}>
          ⚠ Firebase 환경 변수가 설정되지 않았습니다. Vercel 대시보드에서 환경 변수를 등록해주세요.
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          position: "absolute", bottom: 80, left: 20, right: 20,
          padding: "10px 12px",
          background: "#FFEBEE", border: "1px solid #FFCDD2",
          borderRadius: 8, fontSize: 12, color: "#C62828",
          lineHeight: 1.5,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* 처리 중 오버레이 */}
      {processing && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(250,250,248,0.95)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 200, gap: 20, padding: "0 40px", textAlign: "center",
        }}>
          <div style={{ width: 52, height: 52, border: "4px solid #eee", borderTopColor: "#1a1a1a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />

          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>
              {processing === "paying" && "결제 진행 중..."}
              {processing === "uploading" && "사진 업로드 중..."}
              {processing === "saving" && "주문 정보 저장 중..."}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888", lineHeight: 1.6 }}>
              {processing === "paying" && "결제 정보를 확인하고 있어요"}
              {processing === "uploading" && progress
                ? `${progress.current} / ${progress.total}장 업로드 완료`
                : processing === "uploading" && "사진을 Firebase Storage에 전송하고 있어요"}
              {processing === "saving" && "주문 데이터를 Firestore에 저장하고 있어요"}
            </p>
          </div>

          {/* 진행률 바 (업로드 중) */}
          {processing === "uploading" && progress && (
            <div style={{ width: 240 }}>
              <div style={{ height: 4, background: "#eee", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${(progress.current / progress.total) * 100}%`,
                  background: "#1a1a1a",
                  transition: "width 0.3s",
                }} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 10, color: "#aaa" }}>
                {Math.round((progress.current / progress.total) * 100)}%
              </p>
            </div>
          )}

          {/* 진행 단계 표시 */}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {["paying", "uploading", "saving"].map((stage, i) => {
              const stages = ["paying", "uploading", "saving"];
              const currentIdx = stages.indexOf(processing);
              const isDone = i < currentIdx;
              const isActive = i === currentIdx;
              return (
                <div key={stage} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isDone ? "#4CAF50" : isActive ? "#1a1a1a" : "#ddd",
                  transition: "all 0.3s",
                }} />
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

/* ─── 주문 완료 ─── */

function ConfirmScreen({ selectedIds, colorIdx, orderId, onReset }: {
  selectedIds: string[];
  colorIdx: number;
  orderId: string | null;
  onReset: () => void;
}) {
  const tier = getTier(selectedIds.length);
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const dateStr = `${deliveryDate.getMonth() + 1}월 ${deliveryDate.getDate()}일`;
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const [orderNumber, setOrderNumber] = useState<string>("");

  // Firestore에서 실제 주문번호 가져오기
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const { getDb } = await import("./_lib/firebase");
        const snap = await getDoc(doc(getDb(), "orders", orderId));
        if (snap.exists()) {
          setOrderNumber(snap.data().orderNumber || "");
        }
      } catch (err) {
        console.error("주문번호 조회 실패:", err);
      }
    })();
  }, [orderId]);

  const displayOrderNumber = orderNumber || (orderId ? orderId.slice(0, 10).toUpperCase() : "준비 중...");

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#4CAF50", marginBottom: 24, animation: "scaleIn 0.4s ease" }}>✓</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>주문 완료!</h2>
      <p style={{ fontSize: 15, color: "#888", lineHeight: 1.7, margin: "0 0 28px" }}>
        {selectedIds.length}장의 사진으로<br />{COLORS[colorIdx].name} 앨범을 제작합니다
      </p>
      <div style={{ width: "100%", background: "#f0eeeb", borderRadius: 14, padding: 18, textAlign: "left", marginBottom: 32 }}>
        {[
          ["주문번호", displayOrderNumber],
          ["상품", `${tier.name} (${selectedIds.length}장)`],
          ["결제 금액", `₩${tier.price}`],
          ["예상 제작기간", "3~5일"],
          ["예상 배송일", `${dateStr} (${dayNames[deliveryDate.getDay()]})`],
        ].map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < 4 ? 10 : 0, fontSize: 14 }}>
            <span style={{ color: "#999" }}>{k}</span>
            <span style={{ color: "#1a1a1a", fontWeight: i === 0 || i === 2 ? 600 : 400, fontFamily: i === 0 ? "monospace" : undefined }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={onReset} style={{ width: "100%", padding: "16px 0", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
        홈으로 돌아가기
      </button>
      <style>{`@keyframes scaleIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
    </div>
  );
}

/* ─── 로딩 오버레이 ─── */

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(250,250,248,0.92)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100, gap: 16,
    }}>
      <div style={{ width: 40, height: 40, border: "3px solid #eee", borderTopColor: "#1a1a1a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#888", fontSize: 14, margin: 0 }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   메인 페이지
   ═══════════════════════════════════════════════ */

type Screen = "splash" | "home" | "gallery" | "arrange" | "cover" | "login" | "order" | "payment" | "confirm";

export default function Page() {
  useProductSettingsSync(); // Firestore 상품 설정 실시간 구독 (관리자가 값 바꾸면 여기도 즉시 반영)

  const [screen, setScreen] = useState<Screen>("splash");
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [colorIdx, setColorIdx] = useState(0);
  const [session, setSession] = useState<UserSession | null>(null);
  const [orderInfo, setOrderInfo] = useState({ name: "", phone: "", address: "", addressDetail: "", message: "" });
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const go = useCallback((s: Screen) => {
    setTransitioning(true);
    setTimeout(() => { setScreen(s); setTransitioning(false); }, 150);
  }, []);

  // File[] → PhotoItem[] 변환
  const processFiles = useCallback((files: File[]): PhotoItem[] => {
    return files
      .filter(f => f.type.startsWith("image/"))
      .map((f, i) => ({
        id: `${Date.now()}-${i}-${f.name}`,
        file: f,
        url: URL.createObjectURL(f),
        lastModified: f.lastModified,
      }));
  }, []);

  // "사진 보관함에서 선택하기" → 사진 보관함 바로 열기
  //
  // ▼ 네이티브 앱 포팅 가이드 ▼
  // iOS(Swift): PHPickerViewController를 호출 (중간 팝업 없이 바로 사진 보관함 오픈)
  //   let config = PHPickerConfiguration(photoLibrary: .shared())
  //   config.selectionLimit = 100
  //   config.filter = .images
  //   let picker = PHPickerViewController(configuration: config)
  //
  // Android(Kotlin): ActivityResultContracts.PickMultipleVisualMedia 사용
  //   val pickMultipleMedia = registerForActivityResult(
  //     PickMultipleVisualMedia(100)) { uris -> ... }
  //   pickMultipleMedia.launch(PickVisualMediaRequest(PickVisualMedia.ImageOnly))
  //
  // 웹 환경에서는 브라우저 정책상 3가지 옵션 시트가 뜨지만,
  // 네이티브 앱에서는 이 함수를 위 API 호출로 교체하면 사진 보관함으로 바로 이동합니다.
  const handleStartAlbum = useCallback(() => {
    // 웹: 숨겨진 input 클릭 (네이티브에서는 PHPickerViewController 호출로 교체)
    fileInputRef.current?.click();
  }, []);

  // 최초 사진 선택 완료 시
  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    setLoadingMsg(`${files.length}장의 사진을 불러오는 중...`);

    setTimeout(() => {
      const photos = processFiles(files);
      // 최신 사진이 위에 오도록 정렬
      photos.sort((a, b) => b.lastModified - a.lastModified);
      setAllPhotos(photos);

      // ★ 핵심: 최신 사진부터 역순으로 최대 100장 자동 선택
      const autoSelected = photos.slice(0, MAX_PHOTOS).map(p => p.id);
      setSelectedIds(autoSelected);

      setLoading(false);
      go("gallery");
    }, 300);

    e.target.value = "";
  }, [processFiles, go]);

  // 갤러리에서 "사진 추가"
  const handleAddMore = useCallback(() => {
    addMoreRef.current?.click();
  }, []);

  const handleAddMoreFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = processFiles(files);
    setAllPhotos(prev => {
      const existingKeys = new Set(prev.map(p => `${p.file.name}-${p.file.size}`));
      const unique = newPhotos.filter(p => !existingKeys.has(`${p.file.name}-${p.file.size}`));
      const merged = [...unique, ...prev];
      merged.sort((a, b) => b.lastModified - a.lastModified);
      return merged;
    });

    e.target.value = "";
  }, [processFiles]);

  // 메모리 정리
  useEffect(() => {
    return () => { allPhotos.forEach(p => URL.revokeObjectURL(p.url)); };
  }, []);

  const reset = useCallback(() => {
    allPhotos.forEach(p => URL.revokeObjectURL(p.url));
    setAllPhotos([]);
    setSelectedIds([]);
    setColorIdx(0);
    setCreatedOrderId(null);
    setOrderInfo({ name: "", phone: "", address: "", addressDetail: "", message: "" });
    // 세션은 유지 (재주문 시 재로그인 불필요)
    // 로그아웃을 원하면 설정 화면에서 별도로 처리
    go("home");
  }, [allPhotos, go]);

  // 커버 선택 완료 후 → 로그인 여부에 따라 분기
  const handleCoverNext = useCallback(() => {
    if (session) {
      go("order");
    } else {
      go("login");
    }
  }, [session, go]);

  // 간편 로그인 성공 콜백
  const handleLoginSuccess = useCallback((s: UserSession) => {
    setSession(s);
    go("order");
  }, [go]);

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100dvh", overflow: "hidden", background: "#fafaf8", position: "relative" }}>
      {/* 숨겨진 file input: iOS Safari에서 사진 보관함 접근 */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} style={{ display: "none" }} />
      <input ref={addMoreRef} type="file" accept="image/*" multiple onChange={handleAddMoreFiles} style={{ display: "none" }} />

      {loading && <LoadingOverlay message={loadingMsg} />}

      <div style={{ width: "100%", height: "100%", opacity: transitioning ? 0 : 1, transition: "opacity 0.15s ease" }}>
        {screen === "splash" && <SplashScreen onDone={() => setScreen("home")} />}
        {screen === "home" && <HomeScreen onStart={handleStartAlbum} />}
        {screen === "gallery" && (
          <GalleryScreen
            allPhotos={allPhotos}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onNext={() => go("arrange")}
            onBack={() => go("home")}
            onAddMore={handleAddMore}
          />
        )}
        {screen === "arrange" && (
          <ArrangeScreen allPhotos={allPhotos} selectedIds={selectedIds} setSelectedIds={setSelectedIds} onNext={() => go("cover")} onBack={() => go("gallery")} />
        )}
        {screen === "cover" && (
          <CoverScreen colorIdx={colorIdx} setColorIdx={setColorIdx} onNext={handleCoverNext} onBack={() => go("arrange")} />
        )}
        {screen === "login" && (
          <LoginScreen onLogin={handleLoginSuccess} onBack={() => go("cover")} />
        )}
        {screen === "order" && session && (
          <OrderScreen
            selectedIds={selectedIds}
            colorIdx={colorIdx}
            session={session}
            onNext={() => go("payment")}
            onBack={() => go("cover")}
            onOrderInfoChange={setOrderInfo}
          />
        )}
        {screen === "payment" && session && (
          <PaymentScreen
            allPhotos={allPhotos}
            selectedIds={selectedIds}
            colorIdx={colorIdx}
            session={session}
            orderInfo={orderInfo}
            onNext={(orderId) => { setCreatedOrderId(orderId); go("confirm"); }}
            onBack={() => go("order")}
          />
        )}
        {screen === "confirm" && (
          <ConfirmScreen
            selectedIds={selectedIds}
            colorIdx={colorIdx}
            orderId={createdOrderId}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}
