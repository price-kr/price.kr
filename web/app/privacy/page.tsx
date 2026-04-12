import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 - 가격.kr",
  description: "가격.kr 서비스의 개인정보처리방침입니다.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>

      <section className="space-y-4 text-gray-700">
        <p>
          가격.kr(이하 &quot;서비스&quot;)은 사용자의 개인정보를 중요시하며,
          관련 법령을 준수합니다.
        </p>

        <h2 className="text-xl font-semibold mt-6">1. 수집하는 개인정보</h2>
        <p>
          본 서비스는 리다이렉트 과정에서 개인 식별 정보(PII)를 수집하지
          않습니다.
        </p>

        <h2 className="text-xl font-semibold mt-6">2. 통계 정보</h2>
        <p>
          서비스 개선을 위해 다음의 익명화된 데이터를 수집합니다:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>페이지 방문 기록 (방문한 페이지 경로, 시각)</li>
          <li>검색 쿼리 (검색창에 입력한 키워드 원문, 시각)</li>
          <li>리다이렉트 횟수 (키워드별 접속 빈도, 시각)</li>
        </ul>
        <p className="mt-2">
          IP 주소, 브라우저 정보, 쿠키 등 개인 식별 정보(PII)는 수집하지
          않습니다. 수집된 데이터는 Cloudflare D1에 저장되며, 키워드와
          UTC 타임스탬프만 포함합니다.
        </p>

        <h2 className="text-xl font-semibold mt-6">3. 쿠키</h2>
        <p>본 서비스는 쿠키를 사용하지 않습니다.</p>

        <h2 className="text-xl font-semibold mt-6">4. 문의</h2>
        <p>
          개인정보 관련 문의는 GitHub Issue를 통해 접수해 주세요.
        </p>
      </section>
    </main>
  );
}
