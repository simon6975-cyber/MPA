"use client";

import { useState, useEffect, useRef } from "react";

/* ─── 상수 ─── */
const COLORS = [
  { name: "딥그린", hex: "#1B5E20", light: "#E8F5E9" },
  { name: "라이트그린", hex: "#4CAF50", light: "#F1F8E9" },
  { name: "옐로우", hex: "#F9A825", light: "#FFFDE7" },
  { name: "오렌지", hex: "#EF6C00", light: "#FFF3E0" },
  { name: "퍼플", hex: "#6A1B9A", light: "#F3E5F5" },
  { name: "버건디", hex: "#4E342E", light: "#EFEBE9" },
];

const MOCK_PHOTOS = Array.from({ length: 30 }, (_, i) => ({
  id: `p${i + 1}`,
  color: `hsl(${(i * 41 + 15) % 360}, ${50 + (i % 3) * 10}%, ${58 + (i % 4) * 7}%)`,
}));

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
  return (
    <div
      style={{
        height: "env(safe-area-inset-top, 44px)",
        minHeight: 44,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "0 24px 6px",
        fontSize: 14,
        fontWeight: 600,
        color: "#1a1a1a",
        background: "transparent",
        flexShrink: 0,
      }}
    >
      <span>
        {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, "0")}
      </span>
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

function NavHeader({
  title,
  left,
  right,
  onLeft,
}: {
  title: string;
  left?: string;
  right?: string;
  onLeft?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 20px 14px",
        flexShrink: 0,
      }}
    >
      <span
        onClick={onLeft}
        style={{ fontSize: 15, color: "#888", minWidth: 50, cursor: onLeft ? "pointer" : "default" }}
      >
        {left || ""}
      </span>
      <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
      <span style={{ fontSize: 15, color: "#888", minWidth: 50, textAlign: "right" }}>
        {right || ""}
      </span>
    </div>
  );
}

function BottomButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 20px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 20px))",
        flexShrink: 0,
      }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "16px 0",
          background: disabled ? "#ddd" : "#1a1a1a",
          color: disabled ? "#999" : "#fff",
          border: "none",
          borderRadius: 14,
          fontSize: 16,
          fontWeight: 600,
          cursor: disabled ? "default" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {label}
      </button>
    </div>
  );
}

/* ─── 화면들 ─── */

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        height: "100%",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        animation: "fadeIn 0.6s ease",
      }}
    >
      <div style={{ display: "flex", gap: 5 }}>
        {["#E8593C", "#F9A825", "#4CAF50"].map((c, i) => (
          <div
            key={i}
            style={{
              width: 44,
              height: 64,
              background: c,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: `slideUp 0.5s ease ${i * 0.12}s both`,
            }}
          >
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 28, fontFamily: "Georgia, serif" }}>
              {"MPA"[i]}
            </span>
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

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, padding: "28px 24px 24px", overflow: "auto" }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 300,
            color: "#1a1a1a",
            lineHeight: 1.35,
            fontFamily: "Georgia, serif",
            margin: 0,
          }}
        >
          나만의
          <br />
          <span style={{ fontWeight: 700 }}>포토앨범</span>을
          <br />
          만들어보세요
        </h1>
        <p style={{ color: "#999", fontSize: 15, marginTop: 16, lineHeight: 1.7 }}>
          스마트폰 사진 최대 100장으로
          <br />
          하드커버 양장 앨범을 제작합니다
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 32, overflow: "auto", paddingBottom: 4 }}>
          {COLORS.map((c) => (
            <div
              key={c.name}
              style={{
                minWidth: 46,
                height: 64,
                background: c.hex,
                borderRadius: 6,
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </div>
        <p style={{ color: "#ccc", fontSize: 11, marginTop: 8 }}>6가지 컬러 커버</p>

        <button
          onClick={onStart}
          style={{
            width: "100%",
            marginTop: 36,
            padding: "17px 0",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          새 앨범 만들기
        </button>

        <div style={{ marginTop: 20, padding: 16, background: "#f0eeeb", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "#999", margin: 0 }}>최근 주문</p>
          <p style={{ fontSize: 15, color: "#444", margin: "6px 0 0", fontWeight: 500 }}>
            2026 봄 여행 앨범
          </p>
          <p style={{ fontSize: 13, color: "#4CAF50", margin: "4px 0 0" }}>배송 완료</p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "14px 0",
          paddingBottom: "calc(14px + env(safe-area-inset-bottom, 16px))",
          borderTop: "1px solid #eee",
          flexShrink: 0,
        }}
      >
        {["홈", "주문내역", "설정"].map((t, i) => (
          <span key={t} style={{ fontSize: 12, color: i === 0 ? "#1a1a1a" : "#ccc", fontWeight: i === 0 ? 600 : 400 }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function GalleryScreen({
  selected,
  setSelected,
  onNext,
  onBack,
}: {
  selected: string[];
  setSelected: (fn: (prev: string[]) => string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (id: string) => {
    setSelected((prev: string[]) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 100 ? [...prev, id] : prev
    );
  };

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="사진 선택" left="취소" right={`${selected.length}/100`} onLeft={onBack} />

      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
          padding: "0 2px",
          alignContent: "start",
        }}
      >
        {MOCK_PHOTOS.map((p) => {
          const sel = selected.includes(p.id);
          const idx = selected.indexOf(p.id);
          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                aspectRatio: "1",
                background: p.color,
                position: "relative",
                cursor: "pointer",
                border: sel ? "2.5px solid #1a1a1a" : "2.5px solid transparent",
                transition: "border 0.15s",
              }}
            >
              {sel && (
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    background: "#1a1a1a",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomButton label={`${selected.length}장 선택 완료`} onClick={onNext} disabled={!selected.length} />
    </div>
  );
}

function ArrangeScreen({
  selected,
  onNext,
  onBack,
}: {
  selected: string[];
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="순서 정렬" left="이전" right={`${selected.length}장`} onLeft={onBack} />
      <p style={{ padding: "0 20px", fontSize: 13, color: "#aaa", margin: "0 0 8px" }}>
        길게 눌러 사진 순서를 변경하세요
      </p>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "4px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          alignContent: "start",
        }}
      >
        {selected.map((id, i) => {
          const photo = MOCK_PHOTOS.find((p) => p.id === id);
          return (
            <div
              key={id}
              style={{
                aspectRatio: "1",
                background: photo?.color || "#ddd",
                borderRadius: 10,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  bottom: 5,
                  left: 5,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 5,
                  fontWeight: 600,
                }}
              >
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      <BottomButton label="다음" onClick={onNext} />
    </div>
  );
}

function CoverScreen({
  colorIdx,
  setColorIdx,
  onNext,
  onBack,
}: {
  colorIdx: number;
  setColorIdx: (i: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="커버 색상" left="이전" onLeft={onBack} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            width: 150,
            height: 200,
            background: COLORS[colorIdx].hex,
            borderRadius: "4px 14px 14px 4px",
            boxShadow: `10px 10px 30px rgba(0,0,0,0.25)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.35s ease, box-shadow 0.35s",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 3,
              writingMode: "vertical-rl",
              lineHeight: 1.6,
            }}
          >
            MOBILE PHOTO ALBUM
          </span>
        </div>

        <p
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: COLORS[colorIdx].hex,
            margin: 0,
            transition: "color 0.3s",
          }}
        >
          {COLORS[colorIdx].name}
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          {COLORS.map((c, i) => (
            <div
              key={c.name}
              onClick={() => setColorIdx(i)}
              style={{
                width: 46,
                height: 46,
                background: c.hex,
                borderRadius: "50%",
                cursor: "pointer",
                border: colorIdx === i ? "3px solid #1a1a1a" : "3px solid transparent",
                boxShadow:
                  colorIdx === i
                    ? `0 0 0 2.5px #fafaf8, 0 0 0 5px ${c.hex}40`
                    : "0 3px 10px rgba(0,0,0,0.15)",
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>
      </div>

      <BottomButton label="이 색상으로 선택" onClick={onNext} />
    </div>
  );
}

function OrderScreen({
  selected,
  colorIdx,
  onNext,
  onBack,
}: {
  selected: string[];
  colorIdx: number;
  onNext: () => void;
  onBack: () => void;
}) {
  const tier = getTier(selected.length);

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="주문 정보" left="이전" onLeft={onBack} />

      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 16px" }}>
        <div
          style={{
            background: COLORS[colorIdx].light,
            borderRadius: 14,
            padding: 16,
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 50,
              height: 66,
              background: COLORS[colorIdx].hex,
              borderRadius: "2px 7px 7px 2px",
              flexShrink: 0,
            }}
          />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{tier.name}</p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#888" }}>
              {selected.length}장 · {COLORS[colorIdx].name}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
              ₩{tier.price}
            </p>
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
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 5 }}>
              {f.label}
            </label>
            <input
              type="text"
              placeholder={f.ph}
              style={{
                width: "100%",
                padding: "13px 14px",
                background: "#f0eeeb",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                color: "#1a1a1a",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}

        <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "20px 0 14px" }}>
          배송 메시지
        </p>
        <input
          type="text"
          placeholder="부재 시 문 앞에 놓아주세요"
          style={{
            width: "100%",
            padding: "13px 14px",
            background: "#f0eeeb",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            color: "#1a1a1a",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <BottomButton label="결제하기" onClick={onNext} />
    </div>
  );
}

function PaymentScreen({
  selected,
  onNext,
  onBack,
}: {
  selected: string[];
  onNext: () => void;
  onBack: () => void;
}) {
  const tier = getTier(selected.length);
  const [method, setMethod] = useState(0);

  return (
    <div style={{ height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <NavHeader title="결제" left="이전" onLeft={onBack} />

      <div style={{ flex: 1, overflow: "auto", padding: "0 20px" }}>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#999" }}>결제 금액</p>
          <p style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>
            ₩{tier.price}
          </p>
          <div style={{ marginTop: 14, borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#888", marginBottom: 6 }}>
              <span>{tier.name}</span>
              <span>₩{tier.price}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#888" }}>
              <span>배송비</span>
              <span style={{ color: "#4CAF50" }}>무료</span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "24px 0 12px" }}>결제 수단</p>

        {[
          { label: "Apple Pay", sub: "간편결제", icon: "" },
          { label: "신용/체크카드", sub: "카드 결제", icon: "💳" },
        ].map((m, i) => (
          <div
            key={m.label}
            onClick={() => setMethod(i)}
            style={{
              padding: "16px",
              background: method === i ? "#1a1a1a" : "#fff",
              border: method === i ? "none" : "1px solid #eee",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              marginBottom: 10,
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: method === i ? "#fff" : "#f0eeeb",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              {m.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: method === i ? "#fff" : "#1a1a1a" }}>
                {m.label}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: method === i ? "#888" : "#bbb" }}>
                {m.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <BottomButton
        label={method === 0 ? " Pay로 결제" : `₩${tier.price} 결제하기`}
        onClick={onNext}
      />
    </div>
  );
}

function ConfirmScreen({
  selected,
  colorIdx,
  onReset,
}: {
  selected: string[];
  colorIdx: number;
  onReset: () => void;
}) {
  const tier = getTier(selected.length);
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const dateStr = `${deliveryDate.getMonth() + 1}월 ${deliveryDate.getDate()}일`;
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div
      style={{
        height: "100%",
        background: "#fafaf8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: "50%",
          background: "#E8F5E9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          color: "#4CAF50",
          marginBottom: 24,
          animation: "scaleIn 0.4s ease",
        }}
      >
        ✓
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
        주문 완료!
      </h2>
      <p style={{ fontSize: 15, color: "#888", lineHeight: 1.7, margin: "0 0 28px" }}>
        {selected.length}장의 사진으로
        <br />
        {COLORS[colorIdx].name} 앨범을 제작합니다
      </p>

      <div
        style={{
          width: "100%",
          background: "#f0eeeb",
          borderRadius: 14,
          padding: 18,
          textAlign: "left",
          marginBottom: 32,
        }}
      >
        {[
          ["주문번호", `MPA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}01`],
          ["상품", `${tier.name} (${selected.length}장)`],
          ["결제 금액", `₩${tier.price}`],
          ["예상 제작기간", "3~5일"],
          ["예상 배송일", `${dateStr} (${dayNames[deliveryDate.getDay()]})`],
        ].map(([k, v], i) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: i < 4 ? 10 : 0,
              fontSize: 14,
            }}
          >
            <span style={{ color: "#999" }}>{k}</span>
            <span style={{ color: "#1a1a1a", fontWeight: i === 0 || i === 2 ? 600 : 400 }}>{v}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onReset}
        style={{
          width: "100%",
          padding: "16px 0",
          background: "#1a1a1a",
          color: "#fff",
          border: "none",
          borderRadius: 14,
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        홈으로 돌아가기
      </button>

      <style>{`
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}

/* ─── 메인 페이지 ─── */

type Screen = "splash" | "home" | "gallery" | "arrange" | "cover" | "order" | "payment" | "confirm";

export default function Page() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [selected, setSelected] = useState<string[]>([]);
  const [colorIdx, setColorIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const go = (s: Screen) => {
    setTransitioning(true);
    setTimeout(() => {
      setScreen(s);
      setTransitioning(false);
    }, 150);
  };

  const reset = () => {
    setSelected([]);
    setColorIdx(0);
    go("home");
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background: "#fafaf8",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          opacity: transitioning ? 0 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        {screen === "splash" && <SplashScreen onDone={() => setScreen("home")} />}
        {screen === "home" && <HomeScreen onStart={() => go("gallery")} />}
        {screen === "gallery" && (
          <GalleryScreen
            selected={selected}
            setSelected={setSelected}
            onNext={() => go("arrange")}
            onBack={() => go("home")}
          />
        )}
        {screen === "arrange" && (
          <ArrangeScreen selected={selected} onNext={() => go("cover")} onBack={() => go("gallery")} />
        )}
        {screen === "cover" && (
          <CoverScreen
            colorIdx={colorIdx}
            setColorIdx={setColorIdx}
            onNext={() => go("order")}
            onBack={() => go("arrange")}
          />
        )}
        {screen === "order" && (
          <OrderScreen
            selected={selected}
            colorIdx={colorIdx}
            onNext={() => go("payment")}
            onBack={() => go("cover")}
          />
        )}
        {screen === "payment" && (
          <PaymentScreen selected={selected} onNext={() => go("confirm")} onBack={() => go("order")} />
        )}
        {screen === "confirm" && (
          <ConfirmScreen selected={selected} colorIdx={colorIdx} onReset={reset} />
        )}
      </div>
    </div>
  );
}
