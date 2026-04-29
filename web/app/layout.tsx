import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가격.kr - 한 단어로 끝나는 최저가 검색",
  description:
    "주소창에 한글 키워드 한 단어만 입력하세요. 커뮤니티가 투표로 선정한 최저가 페이지로 즉시 이동합니다.",
  openGraph: {
    title: "가격.kr",
    description: "한 단어로 끝나는 최저가 검색",
    url: "https://가격.kr",
    siteName: "가격.kr",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
