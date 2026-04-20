"use client";

import React, { useEffect, useState, useMemo } from "react";
import { subscribeToProductSettings, saveProductSettings, resetProductSettings } from "../../_lib/productService";
import { isFirebaseConfigured } from "../../_lib/firebase";
import type { ProductSettings, CoverColor, Product } from "../../_lib/types";
import { DEFAULT_PRODUCT_SETTINGS, calculatePrice } from "../../_lib/types";

/* ─── 유틸 ─── */

function formatPrice(n: number): string {
  return n.toLocaleString() + "원";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getTime() === 0) return "저장 이력 없음";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function isValidHex(v: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v.trim());
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function isEqualSettings(a: ProductSettings, b: ProductSettings): boolean {
  const strip = (s: ProductSettings) => {
    const { updatedAt, updatedBy, ...rest } = s;
    return rest;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/* ─── 페이지 ─── */

export default function AdminProductsPage() {
  const [serverSettings, setServerSettings] = useState<ProductSettings | null>(null);
  const [draft, setDraft] = useState<ProductSettings>(clone(DEFAULT_PRODUCT_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError("Firebase가 설정되지 않았습니다. Vercel 환경 변수를 확인하세요.");
      setLoading(false);
      return;
    }
    const unsub = subscribeToProductSettings(
      (s) => {
        setServerSettings(prev => {
          // 최초 로딩이거나, 사용자가 편집하지 않은 상태일 때만 draft도 함께 동기화
          setDraft(d => {
            if (prev === null) return clone(s);
            if (isEqualSettings(d, prev)) return clone(s);
            return d;
          });
          return s;
        });
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const isDirty = useMemo(() => {
    if (!serverSettings) return false;
    return !isEqualSettings(draft, serverSettings);
  }, [draft, serverSettings]);

  /* 유효성 검사 */
  const validation = useMemo(() => {
    const errs: string[] = [];

    // 상품
    if (!draft.product.name.trim()) errs.push("상품명이 비어있습니다.");
    if (draft.product.maxPhotos < 1 || draft.product.maxPhotos > 500) {
      errs.push("최대 장수는 1~500 사이여야 합니다.");
    }
    if (draft.product.basePrice < 0) errs.push("판매가는 0 이상이어야 합니다.");
    if (draft.product.vatRate < 0 || draft.product.vatRate > 1) {
      errs.push("부가세율은 0~100% 사이여야 합니다.");
    }

    // 커버 색상
    const activeColors = draft.colors.filter(c => c.enabled);
    if (activeColors.length === 0) errs.push("최소 1개 이상의 활성 커버 색상이 필요합니다.");
    draft.colors.forEach(c => {
      if (!c.name.trim()) errs.push(`[${c.id}] 색상명이 비어있습니다.`);
      if (!isValidHex(c.hex)) errs.push(`[${c.name || c.id}] 커버 색상 HEX가 올바르지 않습니다.`);
      if (!isValidHex(c.light)) errs.push(`[${c.name || c.id}] 밝은 배경 HEX가 올바르지 않습니다.`);
    });
    const ids = draft.colors.map(c => c.id);
    if (new Set(ids).size !== ids.length) errs.push("커버 색상 ID에 중복이 있습니다.");

    // 배송/포장
    if (draft.shippingFee < 0) errs.push("배송비는 0 이상이어야 합니다.");
    if (draft.freeShippingThreshold < 0) errs.push("무료배송 기준 금액은 0 이상이어야 합니다.");
    if (draft.giftWrapFee < 0) errs.push("선물 포장 추가 금액은 0 이상이어야 합니다.");

    return errs;
  }, [draft]);

  /* 편집 핸들러 */
  const updateProduct = (patch: Partial<Product>) => {
    setDraft(prev => ({ ...prev, product: { ...prev.product, ...patch } }));
  };

  const updateColor = (id: string, patch: Partial<CoverColor>) => {
    setDraft(prev => ({
      ...prev,
      colors: prev.colors.map(c => c.id === id ? { ...c, ...patch } : c),
    }));
  };

  const addColor = () => {
    const nextOrder = Math.max(-1, ...draft.colors.map(c => c.order)) + 1;
    const newId = `color_${Date.now().toString(36)}`;
    setDraft(prev => ({
      ...prev,
      colors: [
        ...prev.colors,
        { id: newId, name: "새 색상", hex: "#999999", light: "#F5F5F5", enabled: true, order: nextOrder },
      ],
    }));
  };

  const removeColor = (id: string) => {
    if (draft.colors.length <= 1) {
      setToast({ type: "err", msg: "색상은 최소 1개 이상 남아있어야 합니다." });
      return;
    }
    if (!confirm("이 커버 색상을 삭제할까요?\n이미 해당 색상으로 주문된 기존 주문 데이터는 그대로 보존됩니다.")) return;
    setDraft(prev => ({ ...prev, colors: prev.colors.filter(c => c.id !== id) }));
  };

  const moveColor = (id: string, dir: -1 | 1) => {
    setDraft(prev => {
      const sorted = [...prev.colors].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(c => c.id === id);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= sorted.length) return prev;
      [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
      const reordered = sorted.map((c, i) => ({ ...c, order: i }));
      return { ...prev, colors: reordered };
    });
  };

  /* 저장/취소/리셋 */
  const handleSave = async () => {
    if (validation.length > 0) {
      setToast({ type: "err", msg: `저장할 수 없습니다: ${validation[0]}` });
      return;
    }
    setSaving(true);
    try {
      await saveProductSettings(draft);
      setToast({ type: "ok", msg: "상품 설정이 저장되었습니다." });
    } catch (e: any) {
      setToast({ type: "err", msg: `저장 실패: ${e?.message ?? "알 수 없는 오류"}` });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!serverSettings) return;
    if (isDirty && !confirm("편집 중인 내용을 취소하고 저장된 값으로 되돌릴까요?")) return;
    setDraft(clone(serverSettings));
  };

  const handleReset = async () => {
    if (!confirm("기본값으로 리셋하시겠습니까?\n현재 서버에 저장된 값이 초기값으로 덮어써집니다.")) return;
    setSaving(true);
    try {
      await resetProductSettings();
      setToast({ type: "ok", msg: "기본값으로 리셋되었습니다." });
    } catch (e: any) {
      setToast({ type: "err", msg: `리셋 실패: ${e?.message ?? "알 수 없는 오류"}` });
    } finally {
      setSaving(false);
    }
  };

  /* ─── 렌더 ─── */

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
        <div style={{ width: 32, height: 32, margin: "0 auto 16px", border: "3px solid #eee", borderTopColor: "#1a1a1a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#888", fontSize: 13, margin: 0 }}>상품 설정 불러오는 중...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#FFEBEE", borderRadius: 10, padding: 40, border: "1px solid #FFCDD2" }}>
        <h2 style={{ margin: 0, fontSize: 16, color: "#C62828" }}>⚠ 오류 발생</h2>
        <p style={{ marginTop: 8, fontSize: 13, color: "#C62828", lineHeight: 1.6 }}>{error}</p>
      </div>
    );
  }

  const sortedColorsForDisplay = [...draft.colors].sort((a, b) => a.order - b.order);
  const priceSample = calculatePrice(draft);
  const priceSampleWithGift = calculatePrice(draft, { giftWrap: true });

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>상품 관리</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>
            단일 상품 · 최대 {draft.product.maxPhotos}장 · {formatPrice(draft.product.basePrice)} (부가세 별도)
            <br />
            <span style={{ fontSize: 11, color: "#aaa" }}>
              마지막 저장: {serverSettings ? formatDateTime(serverSettings.updatedAt) : "-"}
              {serverSettings?.updatedBy ? ` · ${serverSettings.updatedBy}` : ""}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleReset}
            disabled={saving}
            style={{
              padding: "9px 14px", background: "#fff", border: "1px solid #e8eaed",
              color: "#888", borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            기본값 복원
          </button>
          <button
            onClick={handleCancel}
            disabled={!isDirty || saving}
            style={{
              padding: "9px 14px", background: "#fff", border: "1px solid #e8eaed",
              color: isDirty ? "#1a1a1a" : "#ccc", borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: isDirty && !saving ? "pointer" : "not-allowed",
            }}
          >
            변경 취소
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving || validation.length > 0}
            style={{
              padding: "9px 18px",
              background: (isDirty && validation.length === 0 && !saving) ? "#1a1a1a" : "#ccc",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              cursor: (isDirty && validation.length === 0 && !saving) ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "저장 중..." : isDirty ? "변경사항 저장" : "저장됨"}
          </button>
        </div>
      </div>

      {/* 상단 알림 */}
      {isDirty && (
        <div style={{
          background: "#FFF8E1", border: "1px solid #FFE082", color: "#E65100",
          borderRadius: 8, padding: "10px 14px", fontSize: 12, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>●</span>
          저장하지 않은 변경사항이 있습니다.
        </div>
      )}
      {validation.length > 0 && (
        <div style={{
          background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#C62828",
          borderRadius: 8, padding: "10px 14px", fontSize: 12, marginBottom: 16,
        }}>
          <b style={{ display: "block", marginBottom: 4 }}>⚠ 저장 전 확인해주세요</b>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            {validation.slice(0, 4).map((v, i) => <li key={i}>{v}</li>)}
            {validation.length > 4 && <li>... 외 {validation.length - 4}건</li>}
          </ul>
        </div>
      )}

      {/* ═══ 섹션 1: 상품 기본 정보 ═══ */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>상품 정보</h2>
            <p style={sectionDescStyle}>
              MPA는 단일 상품입니다. 사진 장수에 관계없이 고정 가격이며, 선택한 장수가 최대 장수 이하이면 모두 같은 가격으로 판매됩니다.
            </p>
          </div>
          <ToggleSwitch
            checked={draft.product.enabled}
            onChange={(v) => updateProduct({ enabled: v })}
            label={draft.product.enabled ? "판매중" : "판매중지"}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <TextField
            label="상품명"
            value={draft.product.name}
            onChange={(v) => updateProduct({ name: v })}
            placeholder="예: 모바일 포토앨범"
          />
          <TextField
            label="한 줄 설명 (선택)"
            value={draft.product.description ?? ""}
            onChange={(v) => updateProduct({ description: v })}
            placeholder="예: 최대 100장 · 하드커버 양장"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <NumberField
            label="최대 수록 장수"
            value={draft.product.maxPhotos}
            onChange={(v) => updateProduct({ maxPhotos: v })}
            suffix="장"
            hint={`고객은 1~${draft.product.maxPhotos}장까지 선택 가능`}
          />
          <NumberField
            label="판매가 (부가세 별도)"
            value={draft.product.basePrice}
            onChange={(v) => updateProduct({ basePrice: v })}
            suffix="원"
            hint={`사진 장수 무관 고정가`}
          />
          <NumberField
            label="부가세율"
            value={Math.round(draft.product.vatRate * 100)}
            onChange={(v) => updateProduct({ vatRate: Math.max(0, Math.min(100, v)) / 100 })}
            suffix="%"
            hint={`${formatPrice(Math.round(draft.product.basePrice * draft.product.vatRate))} 부가세`}
          />
        </div>

        {/* 가격 요약 */}
        <div style={{
          marginTop: 14, padding: "12px 14px",
          background: "#f5f6f8", borderRadius: 8,
          fontSize: 12, lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>💰 고객이 보게 될 가격 (미리보기)</div>
          <PriceRow label="상품가 (부가세 별도)" value={formatPrice(priceSample.basePrice)} />
          <PriceRow label={`부가세 (${Math.round(draft.product.vatRate * 100)}%)`} value={formatPrice(priceSample.vat)} />
          <PriceRow label="상품 합계 (부가세 포함)" value={formatPrice(priceSample.productTotal)} bold />
          <PriceRow label="배송비" value={priceSample.shippingFee === 0 ? "무료" : formatPrice(priceSample.shippingFee)} />
          <div style={{ borderTop: "1px dashed #ccc", margin: "6px 0" }} />
          <PriceRow label="최종 결제액" value={formatPrice(priceSample.grandTotal)} bold accent />
          <PriceRow label="(선물 포장 추가 시)" value={formatPrice(priceSampleWithGift.grandTotal)} muted />
        </div>
      </section>

      {/* ═══ 섹션 2: 커버 색상 ═══ */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>커버 색상</h2>
            <p style={sectionDescStyle}>고객이 주문 시 선택할 수 있는 커버 색상 목록입니다. 비활성화된 색상은 고객 앱에 노출되지 않습니다.</p>
          </div>
          <button onClick={addColor} style={addBtnStyle}>+ 색상 추가</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {sortedColorsForDisplay.map((c, idx) => (
            <ColorCard
              key={c.id}
              color={c}
              canMoveUp={idx > 0}
              canMoveDown={idx < sortedColorsForDisplay.length - 1}
              onChange={(patch) => updateColor(c.id, patch)}
              onRemove={() => removeColor(c.id)}
              onMoveUp={() => moveColor(c.id, -1)}
              onMoveDown={() => moveColor(c.id, 1)}
            />
          ))}
        </div>
      </section>

      {/* ═══ 섹션 3: 배송/포장 ═══ */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>배송 · 선물 포장</h2>
            <p style={sectionDescStyle}>기본 배송비와 선물 포장 옵션 추가 금액을 설정합니다. 배송비는 부가세 포함 금액으로 입력하세요.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <NumberField
            label="배송비 (원)"
            value={draft.shippingFee}
            onChange={(v) => setDraft(prev => ({ ...prev, shippingFee: v }))}
            suffix="원"
            hint={draft.shippingFee === 0 ? "0원 = 무료배송" : `고객 결제 시 +${formatPrice(draft.shippingFee)}`}
          />
          <NumberField
            label="무료배송 기준 금액 (원)"
            value={draft.freeShippingThreshold}
            onChange={(v) => setDraft(prev => ({ ...prev, freeShippingThreshold: v }))}
            suffix="원"
            hint={draft.freeShippingThreshold === 0 ? "비활성 (항상 배송비 적용)" : `${formatPrice(draft.freeShippingThreshold)} 이상 구매 시 무료`}
          />
          <NumberField
            label="선물 포장 추가 금액 (원)"
            value={draft.giftWrapFee}
            onChange={(v) => setDraft(prev => ({ ...prev, giftWrapFee: v }))}
            suffix="원"
            hint={draft.giftWrapFee === 0 ? "무료 제공" : `선물 포장 선택 시 +${formatPrice(draft.giftWrapFee)}`}
          />
        </div>
      </section>

      {/* 하단 고정 저장 바 */}
      {isDirty && (
        <div style={{
          position: "sticky", bottom: 16, marginTop: 24,
          background: "#1a1a1a", color: "#fff",
          borderRadius: 10, padding: "12px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
        }}>
          <span style={{ fontSize: 13 }}>저장하지 않은 변경사항이 있습니다</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCancel} style={{ padding: "7px 14px", background: "transparent", color: "#fff", border: "1px solid #555", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>취소</button>
            <button onClick={handleSave} disabled={validation.length > 0 || saving} style={{ padding: "7px 14px", background: validation.length > 0 ? "#555" : "#4CAF50", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: validation.length > 0 || saving ? "not-allowed" : "pointer" }}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 1000,
          background: toast.type === "ok" ? "#2E7D32" : "#C62828",
          color: "#fff", padding: "10px 16px", borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ═══════════ 하위 컴포넌트 ═══════════ */

function PriceRow({ label, value, bold, accent, muted }: {
  label: string; value: string; bold?: boolean; accent?: boolean; muted?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      color: muted ? "#aaa" : accent ? "#1a1a1a" : "#555",
      fontWeight: bold ? 700 : 400,
      fontSize: accent ? 13 : 12,
    }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function ColorCard({ color, canMoveUp, canMoveDown, onChange, onRemove, onMoveUp, onMoveDown }: {
  color: CoverColor;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<CoverColor>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${color.enabled ? "#e8eaed" : "#eee"}`,
      borderRadius: 10, padding: 14,
      opacity: color.enabled ? 1 : 0.55,
      transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 48, height: 64,
          background: color.hex,
          borderRadius: "2px 5px 5px 2px",
          boxShadow: `inset 3px 0 0 rgba(0,0,0,0.2)`,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={color.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="색상명"
            style={{
              width: "100%", padding: "6px 8px",
              fontSize: 14, fontWeight: 600,
              border: "1px solid transparent", borderRadius: 6,
              background: "#f5f6f8", outline: "none", boxSizing: "border-box",
            }}
          />
          <input
            value={color.id}
            onChange={(e) => onChange({ id: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
            placeholder="id (영문)"
            style={{
              width: "100%", padding: "4px 8px", marginTop: 4,
              fontSize: 10, color: "#888", fontFamily: "monospace",
              border: "none", borderRadius: 4,
              background: "transparent", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <ToggleSwitch
          checked={color.enabled}
          onChange={(v) => onChange({ enabled: v })}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <HexField label="커버 HEX" value={color.hex} onChange={(v) => onChange({ hex: v })} />
        <HexField label="밝은 배경 HEX" value={color.light} onChange={(v) => onChange({ light: v })} />
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onMoveUp} disabled={!canMoveUp} title="위로" style={iconBtnStyle(canMoveUp)}>↑</button>
          <button onClick={onMoveDown} disabled={!canMoveDown} title="아래로" style={iconBtnStyle(canMoveDown)}>↓</button>
        </div>
        <button onClick={onRemove} style={{
          padding: "4px 10px", background: "transparent",
          color: "#C62828", border: "1px solid #FFCDD2",
          borderRadius: 5, fontSize: 11, cursor: "pointer",
        }}>
          삭제
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function NumberField({ label, value, onChange, suffix, hint }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          min={0}
          style={{ ...inputStyle, paddingRight: suffix ? 36 : 10, fontVariantNumeric: "tabular-nums" }}
        />
        {suffix && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 12, color: "#888", pointerEvents: "none",
          }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#aaa" }}>{hint}</p>}
    </label>
  );
}

function HexField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="color"
          value={valid ? value : "#999999"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{
            width: 28, height: 28, padding: 0, border: "1px solid #e8eaed",
            borderRadius: 4, cursor: "pointer", flexShrink: 0, background: "transparent",
          }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="#RRGGBB"
          style={{
            ...inputStyle,
            fontFamily: "monospace", fontSize: 11,
            borderColor: valid ? "transparent" : "#FFCDD2",
            background: valid ? "#f5f6f8" : "#FFEBEE",
          }}
        />
      </div>
    </label>
  );
}

function ToggleSwitch({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 18, borderRadius: 9,
          background: checked ? "#4CAF50" : "#ccc",
          position: "relative", transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, background: "#fff", borderRadius: "50%",
          transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }} />
      </div>
      {label && <span style={{ fontSize: 11, color: checked ? "#2E7D32" : "#999", fontWeight: 500 }}>{label}</span>}
    </label>
  );
}

/* ─── 공통 스타일 ─── */

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
  border: "1px solid #e8eaed",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a",
};

const sectionDescStyle: React.CSSProperties = {
  margin: "4px 0 0", fontSize: 11, color: "#888", lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, color: "#888", fontWeight: 600,
  letterSpacing: 0.3, marginBottom: 4, textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  background: "#f5f6f8", border: "1px solid transparent",
  borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box",
  color: "#1a1a1a",
};

const addBtnStyle: React.CSSProperties = {
  padding: "7px 12px", background: "#1a1a1a", color: "#fff",
  border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500,
  cursor: "pointer", whiteSpace: "nowrap",
};

function iconBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    width: 26, height: 26,
    background: enabled ? "#f5f6f8" : "#fafafa",
    color: enabled ? "#666" : "#ccc",
    border: "1px solid #e8eaed",
    borderRadius: 5,
    fontSize: 12,
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}
