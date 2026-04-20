import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "MPA - 모바일 포토앨범",
    short_name: "MPA",
    description: "스마트폰 사진으로 만드는 나만의 포토앨범",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#1a1a1a",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
}
