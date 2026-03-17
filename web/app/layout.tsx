import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가격.kr - 커뮤니티 기반 단축 URL 서비스",
  description:
    "한글 키워드로 최저가를 찾아보세요. 커뮤니티가 투표로 선정한 최적의 링크로 바로 이동합니다.",
  openGraph: {
    title: "가격.kr",
    description: "한글 키워드로 최저가를 찾아보세요",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
