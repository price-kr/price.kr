# 가격.kr — Design System (Concept A: Typing)

> 페이지 자체가 거대한 주소창. 사이트의 핵심 인터랙션(주소창에 한글 키워드 입력)을 그대로 시연한다.

핵심 메시지: **"한 단어로 끝나는 최저가 검색."**
핵심 인터랙션: 자동 타이핑 → Enter 플래시 → 다음 키워드 (반복)

---

## 1. Tokens (Design Tokens)

`web/app/globals.css`에 CSS 변수로 등록한다. Tailwind 4의 `@theme inline { ... }` 블록 안에 매핑.

### 1.1 Color

| Token             | Value     | 용도                                       |
| ----------------- | --------- | ------------------------------------------ |
| `--bg`            | `#FAF8F4` | 페이지 배경 (따뜻한 베이지)                 |
| `--bg-elev-1`     | `#FFFFFF` | Address bar surface                         |
| `--bg-elev-2`     | `#FAFAF8` | Address bar inner field                     |
| `--ink`           | `#1A1815` | 본문 텍스트, 헤드라인                       |
| `--ink-mute`      | `#555555` | 보조 텍스트 (메타 정보)                     |
| `--ink-faint`     | `#888888` | https://, 힌트 텍스트                       |
| `--ink-ghost`     | `#999999` | 비활성, 도움말                              |
| `--accent`        | `#E55A2B` | **유일한 액센트** — 키워드, CTA, 강조       |
| `--accent-soft`   | `#FFF4EE` | accent의 8% 배경 (배지, flash 상태)        |
| `--chip-ink`      | `rgba(26,24,21,0.18)` | 떠다니는 키워드 (배경 레이어)    |
| `--chip-accent`   | `rgba(229,90,43,0.25)` | 떠다니는 키워드의 .가격.kr 부분 |

> **원칙:** 액센트 색은 오직 1개. 그 외는 모두 무채색의 톤 변주. 그라디언트 금지(아주 약한 radial 워시 제외).

### 1.2 Typography

| Token              | Value                                                     | 용도                       |
| ------------------ | --------------------------------------------------------- | -------------------------- |
| `--font-sans`      | `Pretendard, -apple-system, "Helvetica Neue", sans-serif` | 본문, 헤드라인              |
| `--font-mono`      | `"SF Mono", "JetBrains Mono", ui-monospace, monospace`    | URL, 키워드, 메타 데이터    |
| `--text-display`   | `clamp(40px, 5.5vw, 56px) / 1.05 / -0.04em`               | "한 단어로 끝나는…"         |
| `--text-url`       | `clamp(28px, 3vw, 38px) / 1 / -0.02em`                    | 주소창 안의 URL             |
| `--text-eyebrow`   | `13px / 1.4 / 0.02em / 600`                               | "주소창에 바로 입력하세요"  |
| `--text-helper`    | `14px / 1.5`                                              | 주소창 아래 도움말          |
| `--text-meta`      | `12–13px`                                                 | 상단/하단 메타 정보          |

폰트는 Pretendard CDN에서 로드한다 (한글 표시 품질 + 무료):

```html
<!-- web/app/layout.tsx 의 <head>에 추가 -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
/>
```

### 1.3 Spacing & Radius

- 베이스 단위: 4px. 사용하는 스텝: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 80
- Radius: `--r-sm: 10px`, `--r-md: 14px`, `--r-lg: 18px`, `--r-pill: 999px`
- Bar shadow (idle): `0 24px 80px -20px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.04)`
- Bar shadow (flash): `0 0 0 6px rgba(229,90,43,0.25), 0 24px 80px -20px rgba(229,90,43,0.5), 0 8px 24px rgba(0,0,0,0.06)`

### 1.4 Motion

| 이름              | Duration | Easing            | 용도                  |
| ----------------- | -------- | ----------------- | --------------------- |
| typing            | 70–220ms | linear            | 글자별 타이핑 (한글이 더 느림) |
| post-type pause   | 600ms    | —                 | 다 친 후 잠깐 대기     |
| flash             | 450ms    | ease-out          | Enter 직후 강조        |
| clear             | 22ms/char| linear            | 백스페이스             |
| chip drift        | 9–17s    | ease-in-out infinite | 배경 키워드 부유      |
| pulse             | 1.6s     | ease-in-out infinite | 라이브 인디케이터    |

`prefers-reduced-motion`이 `reduce`이면: 자동 타이핑 멈추고 첫 키워드만 정적으로 보여줌. chip drift는 0으로.

---

## 2. 페이지 구조

```
┌──────────────────────────────────────────────────────────────────┐
│  [가격.kr]                       1,247개 · 12,394회 · GitHub →   │ 28px top
│                                                                    │
│                       (배경: 떠다니는 키워드 chips)                  │
│                                                                    │
│              ● 주소창에 바로 입력하세요                            │ eyebrow
│                                                                    │
│              한 단어로 끝나는                                       │ display
│              최저가 검색.                                           │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │ 🔒 https://  만두.가격.kr             [Enter ↵]            │   │ Address Bar
│   └────────────────────────────────────────────────────────────┘   │
│            주소창에 만두.가격.kr 입력 → 즉시 최저가로                │ helper
│                                                                    │
│  01 입력  02 리다이렉트  03 최저가          오픈소스 / 커뮤니티     │ 32px bottom
└──────────────────────────────────────────────────────────────────┘
```

**Hero 영역은 100vh fixed**. 첫 화면에 모든 핵심 요소가 들어간다.
스크롤하면(선택사항) 아래에 사용법 / 등록된 키워드 그리드 / FAQ 추가 가능 — 본 시안은 hero만.

---

## 3. Component 구조

```
web/
├── app/
│   ├── globals.css            ← 디자인 토큰 (CSS 변수)
│   ├── layout.tsx             ← Pretendard 로드, body class
│   └── page.tsx               ← 새 hero 레이아웃 적용
└── components/
    ├── SearchBar.tsx          ← (기존, 유지) 자동완성 검색
    ├── AddressBar.tsx         ← NEW: 자동 타이핑 주소창
    ├── FloatingChips.tsx      ← NEW: 배경 떠다니는 키워드
    └── HeroStats.tsx          ← NEW: 상단 메타 (등록 개수, 오늘 이동 횟수)
```

### 3.1 `<AddressBar />`

Props:
```ts
interface AddressBarProps {
  keywords: string[];          // 순환할 키워드 목록 (서버에서 전달)
  cycleMs?: number;            // 키워드 1개당 총 주기, default: typing이 끝까지 결정
  onSelect?: (kw: string) => void; // 사용자가 직접 입력했을 때
  interactive?: boolean;       // false면 데모 모드 (타이핑만), true면 입력 가능
}
```

상태머신: `typing → full → flash → clearing → typing(next)`

접근성:
- 자동 타이핑은 `aria-hidden="true"`인 데코레이션 레이어에서 진행
- 실제 input은 그 위에 투명하게 겹쳐 두고, 사용자가 focus하면 자동 모드 정지
- `prefers-reduced-motion: reduce`면 정적으로 표시

### 3.2 `<FloatingChips />`

Props:
```ts
interface FloatingChipsProps {
  keywords: string[];          // 떠다닐 키워드들 (보통 12~24개)
  excludeKeyword?: string;     // 현재 타이핑 중인 키워드는 제외
}
```

- 결정론적 시드(인덱스 기반)로 위치 계산해 SSR/CSR 일치
- `pointer-events: none`, `aria-hidden`
- mobile에서는 chip 개수 절반으로

### 3.3 `<HeroStats />`

서버 컴포넌트. 빌드 시 `data/`에서 등록된 키워드 개수를 읽어 표시.
오늘 이동 횟수는 일단 정적 placeholder 또는 KV Analytics 연동 후 ISR로.

---

## 4. 기존 코드와의 통합

### 4.1 `web/app/page.tsx` 교체
기존 `<SearchBar />`만 있던 가운데 정렬 hero를 새 레이아웃으로 대체.
**기존 SearchBar는 hero 아래 보조 영역**으로 옮겨 모바일 사용자나 자동완성이 필요한 사용자에게 제공.

### 4.2 `app/[keyword]/page.tsx`
미등록 / 별칭 / 등록됨 3가지 상태 모두 같은 디자인 토큰을 사용하도록 클래스 정리. 현재 `text-blue-600`, `bg-blue-600` 등의 임시 컬러를 `text-[var(--accent)]` 등으로 마이그레이션 (별도 PR 권장).

### 4.3 SearchBar 마이그레이션
`bg-blue-500` → `var(--accent)`, `border-gray-300` → `border-[var(--ink-faint)]/30` 등 토큰 사용.

---

## 5. 마이그레이션 체크리스트

- [ ] `globals.css`에 토큰 추가 + Tailwind theme inline 매핑
- [ ] `layout.tsx`에 Pretendard CDN preconnect/link 추가
- [ ] `components/AddressBar.tsx` 추가 (Client Component)
- [ ] `components/FloatingChips.tsx` 추가 (Client Component)
- [ ] `components/HeroStats.tsx` 추가 (Server Component)
- [ ] `app/page.tsx` 새 레이아웃 적용, 기존 SearchBar는 보조 영역으로
- [ ] `prefers-reduced-motion` 분기 테스트
- [ ] 모바일 (390px) 레이아웃 테스트 — display 폰트 38px로, chip 개수 ½, 주소창 폭 100%
- [ ] `__tests__/page.test.tsx` 업데이트 (새 헤드라인 텍스트로 assert)
- [ ] Lighthouse: LCP < 2s 유지 (Pretendard preload 또는 font-display: swap)

---

## 6. Open Questions

1. 자동 타이핑 키워드 셋: 인기 24개 하드코딩 vs `data/`에서 무작위 샘플링? — 후자가 더 라이브한 느낌
2. `interactive=true` 모드: 사용자가 input에 focus하면 자동 타이핑 멈추고 검색바처럼 동작? → 이걸 권장
3. 다크 모드: A 시안은 라이트 단일이지만 invert 토큰 세트만 정의해두면 추후 추가 용이
