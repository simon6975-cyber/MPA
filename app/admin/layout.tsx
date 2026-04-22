"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { checkSession, clearSession } from "./_lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    const ok = checkSession();
    setAuthed(ok);
    setAuthChecked(true);
    if (!ok && !isLoginPage) {
      router.replace("/admin/login");
    }
  }, [isLoginPage, router]);

  // 로그인 페이지는 레이아웃 없이 독립적으로
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 인증 체크 중
  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8" }}>
        <div style={{ color: "#999", fontSize: 14 }}>인증 확인 중...</div>
      </div>
    );
  }

  // 인증 실패 - 리다이렉트 대기
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8" }}>
        <div style={{ color: "#999", fontSize: 14 }}>로그인 페이지로 이동 중...</div>
      </div>
    );
  }

  const handleLogout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      clearSession();
      router.replace("/admin/login");
    }
  };

  const navItems = [
    { href: "/admin", label: "주문 관리", icon: "📦" },
    { href: "/admin/members", label: "회원 관리", icon: "👥" },
    { href: "/admin/products", label: "상품 관리", icon: "🎨" },
    { href: "/admin/notices", label: "공지사항", icon: "📢" },
    { href: "/admin/faqs", label: "FAQ 관리", icon: "❓" },
    { href: "/admin/inquiries", label: "1:1 문의", icon: "💬" },
    { href: "/admin/stats", label: "매출 대시보드", icon: "📊" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f5f6f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* 사이드바 */}
      <aside style={{
        width: 240,
        background: "#1a1a1a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        flexShrink: 0,
      }}>
        {/* 로고 */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
            {["#E8593C", "#F9A825", "#4CAF50"].map((c, i) => (
              <div key={i} style={{ width: 20, height: 28, background: c, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 12, fontFamily: "Georgia, serif" }}>{"MPA"[i]}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>MPA 관리자</p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "#888", letterSpacing: 0.5 }}>ADMIN DASHBOARD</p>
        </div>

        {/* 네비 */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.map(item => {
            const active = item.href === "/admin"
              ? pathname === "/admin" || pathname.startsWith("/admin/orders")
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 14px", marginBottom: 2,
                borderRadius: 8,
                background: active ? "#2a2a2a" : "transparent",
                color: active ? "#fff" : "#aaa",
                textDecoration: "none",
                fontSize: 14, fontWeight: active ? 600 : 400,
                transition: "background 0.15s",
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 하단 */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #333" }}>
          <div style={{
            padding: "8px 10px",
            background: "#FFF3E0",
            borderRadius: 6,
            fontSize: 10,
            color: "#E65100",
            marginBottom: 10,
            lineHeight: 1.5,
          }}>
            <b>⚠ DEMO MODE</b><br />
            목업 데이터 · 실제 DB 미연결
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "8px 0",
            background: "transparent", border: "1px solid #444",
            color: "#aaa", borderRadius: 6, fontSize: 12, cursor: "pointer",
          }}>
            로그아웃
          </button>
          <Link href="/" style={{
            display: "block", textAlign: "center", marginTop: 8,
            fontSize: 11, color: "#666", textDecoration: "none",
          }}>
            고객용 앱 보기 →
          </Link>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={{ flex: 1, padding: "24px 32px", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
