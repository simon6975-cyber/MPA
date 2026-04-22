"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * 고객용 정보 페이지 공통 레이아웃.
 *
 * 카드 기반 디자인 특징:
 *   - 배경: 부드러운 연회색 (#f7f6f2) - 카드를 돋보이게
 *   - 상단 네비게이션: 뒤로가기 + 타이틀
 *   - iOS 안전 영역 지원 (노치, 홈바)
 *   - 모바일 우선, 데스크톱은 중앙 정렬 (max 480px)
 */
export default function CustomerPageLayout({
  title,
  children,
  backHref,
  rightAction,
}: {
  title: string;
  children: React.ReactNode;
  backHref?: string;         // 지정 시 Link 사용, 없으면 router.back()
  rightAction?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f7f6f2",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#1a1a1a",
    }}>
      {/* 데스크톱에서는 모바일 폭으로 중앙 정렬 */}
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        minHeight: "100vh",
        background: "#f7f6f2",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 40px rgba(0,0,0,0.03)",
      }}>
        {/* iOS 안전 영역 (상단) */}
        <div style={{
          height: "env(safe-area-inset-top, 0px)",
          background: "#fff",
          flexShrink: 0,
        }} />

        {/* 상단 네비 */}
        <header style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
          background: "#fff",
          borderBottom: "1px solid #eee",
          position: "sticky",
          top: 0,
          zIndex: 10,
          gap: 8,
        }}>
          {backHref ? (
            <Link href={backHref} style={{
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, color: "#1a1a1a", textDecoration: "none", fontSize: 20,
            }}>
              ←
            </Link>
          ) : (
            <button
              onClick={() => router.back()}
              style={{
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, color: "#1a1a1a", background: "transparent", border: "none",
                cursor: "pointer", fontSize: 20,
              }}
            >
              ←
            </button>
          )}
          <h1 style={{
            margin: 0, flex: 1, fontSize: 17, fontWeight: 600, color: "#1a1a1a",
            textAlign: "center", paddingRight: rightAction ? 0 : 36, // 우측 버튼 없으면 좌측 버튼 폭만큼 보정
          }}>
            {title}
          </h1>
          {rightAction ? (
            <div style={{ minWidth: 36, display: "flex", justifyContent: "flex-end" }}>
              {rightAction}
            </div>
          ) : null}
        </header>

        {/* 본문 */}
        <main style={{
          flex: 1,
          padding: "16px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
