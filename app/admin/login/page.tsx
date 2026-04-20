"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyPassword, createSession, checkSession } from "../_lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인되어 있으면 대시보드로
    if (checkSession()) {
      router.replace("/admin");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 약간의 지연 (너무 빠르면 사용자가 인지 못 함)
    setTimeout(() => {
      if (verifyPassword(password)) {
        createSession();
        router.replace("/admin");
      } else {
        setError("비밀번호가 일치하지 않습니다.");
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
      padding: 20,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400,
        background: "#fff", borderRadius: 16,
        padding: "40px 32px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", gap: 4, marginBottom: 16 }}>
            {["#E8593C", "#F9A825", "#4CAF50"].map((c, i) => (
              <div key={i} style={{ width: 32, height: 44, background: c, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 19, fontFamily: "Georgia, serif" }}>{"MPA"[i]}</span>
              </div>
            ))}
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>
            관리자 로그인
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>
            MPA 운영자 전용 페이지입니다
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="관리자 비밀번호 입력"
              autoFocus
              disabled={loading}
              style={{
                width: "100%", padding: "13px 14px",
                background: "#f5f6f8", border: "1px solid transparent",
                borderRadius: 10, fontSize: 15, color: "#1a1a1a",
                outline: "none", boxSizing: "border-box",
                transition: "border 0.15s",
              }}
              onFocus={(e) => e.target.style.border = "1px solid #1a1a1a"}
              onBlur={(e) => e.target.style.border = "1px solid transparent"}
            />
          </div>

          {error && (
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#D32F2F" }}>
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            style={{
              width: "100%", padding: "14px 0",
              background: !password || loading ? "#ccc" : "#1a1a1a",
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 600,
              cursor: !password || loading ? "default" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>

        {/* 데모 안내 */}
        <div style={{
          marginTop: 24, padding: "12px 14px",
          background: "#FFF8E1", border: "1px dashed #F9A825",
          borderRadius: 8,
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#E65100", fontWeight: 700, letterSpacing: 0.3 }}>
            ⚠ DEMO · 임시 비밀번호
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#795548", lineHeight: 1.6 }}>
            데모용 비밀번호: <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontFamily: "monospace" }}>mpa2026!</code><br />
            실제 서비스 전 Firebase Auth로 교체 예정
          </p>
        </div>
      </div>
    </div>
  );
}
