"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── 타입 ─── */
interface PhotoItem {
  id: string;
  file: File;
  url: string;
  lastModified: number;
}

/* ─── 상수 ─── */
const MAX_PHOTOS = 100;

const COLORS = [
  { name: "딥그린", hex: "#1B5E20", light: "#E8F5E9" },
  { name: "라이트그린", hex: "#4CAF50", light: "#F1F8E9" },
  { name: "옐로우", hex: "#F9A825", light: "#FFFDE7" },
  { name: "오렌지", hex: "#EF6C00", light: "#FFF3E0" },
  { name: "퍼플", hex: "#6A1B9A", light: "#F3E5F5" },
  { name: "버건디", hex: "#4E342E", light: "#EFEBE9" },
];

const TIERS = [
  { name: "미니앨범", max: 40, price: "19,900" },
  { name: "스탠다드앨범", max: 70, price: "29,900" },
  { name: "프리미엄앨범", max: 100, price: "39,900" },
];

function getTier(n: number) {
  if (n <= 40) return TIERS[0];
  if (n <= 70) return TIERS[1];
  return TIERS[2];
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
      <div style={{ flex: 1, padding: "28px 24px 24px", overflow: "auto" }}>
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
        <p style={{ fontSize: 12, color: "#bbb", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
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
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2,
        padding: "0 2px", alignContent: "start",
      }}>
        {allPhotos.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          const orderNum = isSelected ? selectedIds.indexOf(p.id) + 1 : -1;
          const maxReached = count >= MAX_PHOTOS;

          return (
            <div key={p.id} onClick={() => toggle(p.id)} style={{
              aspectRatio: "1", position: "relative", cursor: "pointer",
              border: isSelected ? "2.5px solid #1a1a1a" : "2.5px solid transparent",
              transition: "border 0.15s", overflow: "hidden",
            }}>
              <img src={p.url} alt="" loading="lazy" style={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                opacity: isSelected ? 0.85 : 1, transition: "opacity 0.15s",
              }} />
              {isSelected && (
                <div style={{
                  position: "absolute", top: 4, right: 4, width: 24, height: 24,
                  background: "#1a1a1a", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                }}>
                  {orderNum}
                </div>
              )}
              {!isSelected && maxReached && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(250,250,248,0.6)" }} />
              )}
            </div>
          );
        })}
      </div>

      <BottomButton
        label={count > 0 ? `${count}장 선택 완료` : "사진을 선택하세요"}
        onClick={onNext}
        disabled={count === 0}
      />
    </div>
  );
}

/* ─── 순서 정렬 ─── */

function ArrangeScreen({ allPhotos, selectedIds, onNext, onBack }: {
  allPhotos: PhotoItem[]; selectedIds: string[]; onNext: () => void; onBack: () => void;
}) {
  const photoMap = new Map(allPhotos.map(p => [p.id, p]));
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="순서 정렬" left="이전" right={`${selectedIds.length}장`} onLeft={onBack} />
      <p style={{ padding: "0 20px", fontSize: 13, color: "#aaa", margin: "0 0 8px" }}>앨범에 들어갈 순서입니다</p>
      <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", padding: "4px 20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, alignContent: "start" }}>
        {selectedIds.map((id, i) => {
          const photo = photoMap.get(id);
          return (
            <div key={id} style={{ aspectRatio: "1", borderRadius: 10, position: "relative", overflow: "hidden" }}>
              {photo ? (
                <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#ddd" }} />
              )}
              <span style={{
                position: "absolute", bottom: 5, left: 5,
                background: "rgba(0,0,0,0.55)", color: "#fff",
                fontSize: 10, padding: "2px 7px", borderRadius: 5, fontWeight: 600,
              }}>{i + 1}</span>
            </div>
          );
        })}
      </div>
      <BottomButton label="다음" onClick={onNext} />
    </div>
  );
}

/* ─── 커버 색상 ─── */

function CoverScreen({ colorIdx, setColorIdx, onNext, onBack }: { colorIdx: number; setColorIdx: (i: number) => void; onNext: () => void; onBack: () => void }) {
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="커버 색상" left="이전" onLeft={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{
          width: 150, height: 200, background: COLORS[colorIdx].hex,
          borderRadius: "4px 14px 14px 4px", boxShadow: "10px 10px 30px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.35s ease",
        }}>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, letterSpacing: 3, writingMode: "vertical-rl", lineHeight: 1.6 }}>
            MOBILE PHOTO ALBUM
          </span>
        </div>
        <p style={{ fontSize: 20, fontWeight: 600, color: COLORS[colorIdx].hex, margin: 0, transition: "color 0.3s" }}>
          {COLORS[colorIdx].name}
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          {COLORS.map((c, i) => (
            <div key={c.name} onClick={() => setColorIdx(i)} style={{
              width: 46, height: 46, background: c.hex, borderRadius: "50%", cursor: "pointer",
              border: colorIdx === i ? "3px solid #1a1a1a" : "3px solid transparent",
              boxShadow: colorIdx === i ? `0 0 0 2.5px #fafaf8, 0 0 0 5px ${c.hex}40` : "0 3px 10px rgba(0,0,0,0.15)",
              transition: "all 0.25s ease",
            }} />
          ))}
        </div>
      </div>
      <BottomButton label="이 색상으로 선택" onClick={onNext} />
    </div>
  );
}

/* ─── 주문 정보 ─── */

function OrderScreen({ selectedIds, colorIdx, onNext, onBack }: { selectedIds: string[]; colorIdx: number; onNext: () => void; onBack: () => void }) {
  const tier = getTier(selectedIds.length);
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="주문 정보" left="이전" onLeft={onBack} />
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 16px" }}>
        <div style={{ background: COLORS[colorIdx].light, borderRadius: 14, padding: 16, display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 50, height: 66, background: COLORS[colorIdx].hex, borderRadius: "2px 7px 7px 2px", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{tier.name}</p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#888" }}>{selectedIds.length}장 · {COLORS[colorIdx].name}</p>
            <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>₩{tier.price}</p>
          </div>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "0 0 14px" }}>배송 정보</p>
        {[
          { label: "받는 분", ph: "이름을 입력하세요" },
          { label: "연락처", ph: "010-0000-0000" },
          { label: "주소", ph: "주소를 검색하세요" },
          { label: "상세주소", ph: "동/호수를 입력하세요" },
        ].map((f) => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 5 }}>{f.label}</label>
            <input type="text" placeholder={f.ph} style={{ width: "100%", padding: "13px 14px", background: "#f0eeeb", border: "none", borderRadius: 10, fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "20px 0 14px" }}>배송 메시지</p>
        <input type="text" placeholder="부재 시 문 앞에 놓아주세요" style={{ width: "100%", padding: "13px 14px", background: "#f0eeeb", border: "none", borderRadius: 10, fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" }} />
      </div>
      <BottomButton label="결제하기" onClick={onNext} />
    </div>
  );
}

/* ─── 결제 ─── */

function PaymentScreen({ selectedIds, onNext, onBack }: { selectedIds: string[]; onNext: () => void; onBack: () => void }) {
  const tier = getTier(selectedIds.length);
  const [method, setMethod] = useState(0);
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="결제" left="이전" onLeft={onBack} />
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
          <div key={m.label} onClick={() => setMethod(i)} style={{
            padding: "16px", background: method === i ? "#1a1a1a" : "#fff",
            border: method === i ? "none" : "1px solid #eee", borderRadius: 14,
            display: "flex", alignItems: "center", gap: 14, cursor: "pointer", marginBottom: 10, transition: "all 0.2s",
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
      </div>
      <BottomButton label={method === 0 ? " Pay로 결제" : `₩${tier.price} 결제하기`} onClick={onNext} />
    </div>
  );
}

/* ─── 주문 완료 ─── */

function ConfirmScreen({ selectedIds, colorIdx, onReset }: { selectedIds: string[]; colorIdx: number; onReset: () => void }) {
  const tier = getTier(selectedIds.length);
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const dateStr = `${deliveryDate.getMonth() + 1}월 ${deliveryDate.getDate()}일`;
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#4CAF50", marginBottom: 24, animation: "scaleIn 0.4s ease" }}>✓</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>주문 완료!</h2>
      <p style={{ fontSize: 15, color: "#888", lineHeight: 1.7, margin: "0 0 28px" }}>
        {selectedIds.length}장의 사진으로<br />{COLORS[colorIdx].name} 앨범을 제작합니다
      </p>
      <div style={{ width: "100%", background: "#f0eeeb", borderRadius: 14, padding: 18, textAlign: "left", marginBottom: 32 }}>
        {[
          ["주문번호", `MPA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}01`],
          ["상품", `${tier.name} (${selectedIds.length}장)`],
          ["결제 금액", `₩${tier.price}`],
          ["예상 제작기간", "3~5일"],
          ["예상 배송일", `${dateStr} (${dayNames[deliveryDate.getDay()]})`],
        ].map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < 4 ? 10 : 0, fontSize: 14 }}>
            <span style={{ color: "#999" }}>{k}</span>
            <span style={{ color: "#1a1a1a", fontWeight: i === 0 || i === 2 ? 600 : 400 }}>{v}</span>
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

type Screen = "splash" | "home" | "gallery" | "arrange" | "cover" | "order" | "payment" | "confirm";

export default function Page() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [colorIdx, setColorIdx] = useState(0);
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

  // "새 앨범 만들기" → iOS 사진 보관함 열기
  const handleStartAlbum = useCallback(() => {
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
    go("home");
  }, [allPhotos, go]);

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
          <ArrangeScreen allPhotos={allPhotos} selectedIds={selectedIds} onNext={() => go("cover")} onBack={() => go("gallery")} />
        )}
        {screen === "cover" && (
          <CoverScreen colorIdx={colorIdx} setColorIdx={setColorIdx} onNext={() => go("order")} onBack={() => go("arrange")} />
        )}
        {screen === "order" && (
          <OrderScreen selectedIds={selectedIds} colorIdx={colorIdx} onNext={() => go("payment")} onBack={() => go("cover")} />
        )}
        {screen === "payment" && (
          <PaymentScreen selectedIds={selectedIds} onNext={() => go("confirm")} onBack={() => go("order")} />
        )}
        {screen === "confirm" && (
          <ConfirmScreen selectedIds={selectedIds} colorIdx={colorIdx} onReset={reset} />
        )}
      </div>
    </div>
  );
}
