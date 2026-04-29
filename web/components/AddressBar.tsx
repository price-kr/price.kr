"use client";

import { useEffect, useState, useCallback } from "react";

interface AddressBarProps {
  keywords: string[];
  interactive?: boolean;
}

type Phase = "typing" | "full" | "flash" | "clearing";

const TYPE_DELAY_HANGUL = () => 130 + Math.random() * 90;
const TYPE_DELAY_LATIN = () => 70 + Math.random() * 50;
const POST_TYPE_HOLD = 600;
const FLASH_MS = 450;
const CLEAR_PER_CHAR = 22;

export function AddressBar({ keywords, interactive = true }: AddressBarProps) {
  const [keywordIdx, setKeywordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [paused, setPaused] = useState(false);
  const [userValue, setUserValue] = useState("");
  const [userActive, setUserActive] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const currentKeyword =
    keywords.length > 0 ? keywords[keywordIdx % keywords.length] : "만두";
  const fullUrl = `${currentKeyword}.가격.kr`;

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(m.matches);
    const onChange = () => setReduceMotion(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || userActive) return;
    if (reduceMotion) {
      setTyped(fullUrl);
      setPhase("full");
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (typed.length < fullUrl.length) {
        const next = fullUrl.slice(0, typed.length + 1);
        const ch = fullUrl[typed.length];
        const delay = /[가-힣]/.test(ch) ? TYPE_DELAY_HANGUL() : TYPE_DELAY_LATIN();
        timeout = setTimeout(() => setTyped(next), delay);
      } else {
        timeout = setTimeout(() => setPhase("full"), POST_TYPE_HOLD);
      }
    } else if (phase === "full") {
      timeout = setTimeout(() => setPhase("flash"), 700);
    } else if (phase === "flash") {
      timeout = setTimeout(() => setPhase("clearing"), FLASH_MS);
    } else if (phase === "clearing") {
      if (typed.length > 0) {
        timeout = setTimeout(() => setTyped(typed.slice(0, -1)), CLEAR_PER_CHAR);
      } else {
        timeout = setTimeout(() => {
          setKeywordIdx((i) =>
            keywords.length > 0 ? (i + 1) % keywords.length : 0
          );
          setPhase("typing");
        }, 200);
      }
    }
    return () => clearTimeout(timeout);
  }, [phase, typed, fullUrl, paused, userActive, reduceMotion, keywords.length]);

  const handleSubmit = useCallback((kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    if (/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/.test(trimmed)) {
      window.location.href = `https://${trimmed}.가격.kr`;
    }
  }, []);

  const onFocus = () => {
    if (!interactive) return;
    setUserActive(true);
    setPaused(true);
    setUserValue("");
  };

  const onBlur = () => {
    if (!userActive) return;
    setUserActive(false);
    setUserValue("");
    setTyped("");
    setPhase("typing");
    setPaused(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(userValue);
    }
  };

  const dotIdx = typed.indexOf(".");
  const keywordPart = dotIdx === -1 ? typed : typed.slice(0, dotIdx);
  const tldPart = dotIdx === -1 ? "" : typed.slice(dotIdx);

  const showCursor = phase === "typing" && !userActive;
  const isFlash = phase === "flash";
  const isFull = phase === "full" || phase === "flash";

  return (
    <div className="w-full max-w-[78%] mx-auto">
      <div
        data-bar-shell
        className="rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--bg-elev-1)] p-1 transition-shadow duration-300"
        style={{
          boxShadow: isFlash ? "var(--shadow-bar-flash)" : "var(--shadow-bar)",
        }}
      >
        <div
          data-bar-inner
          className="flex items-center gap-3.5 rounded-[var(--r-md)] px-7 py-6 transition-colors duration-200"
          style={{
            background: isFlash ? "var(--accent-soft)" : "var(--bg-elev-2)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke="#888" strokeWidth="1.6" />
            <path d="M8 11V7a4 4 0 018 0v4" stroke="#888" strokeWidth="1.6" />
          </svg>

          <span
            data-bar-prefix
            className="font-mono text-[22px] tracking-tight text-[var(--ink-faint)]"
            aria-hidden="true"
          >
            https://
          </span>

          <div data-bar-url className="relative flex-1 min-h-[50px] flex items-center">
            {!userActive && (
              <span
                className="font-mono font-semibold tracking-tight whitespace-nowrap"
                style={{
                  fontSize: "clamp(22px, 2.6vw, 38px)",
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
                aria-hidden="true"
              >
                <span style={{ color: "var(--accent)" }}>{keywordPart}</span>
                <span>{tldPart}</span>
                {showCursor && (
                  <span
                    className="inline-block align-middle ml-[2px]"
                    style={{
                      width: 3,
                      height: "0.9em",
                      background: "var(--ink)",
                      animation: "cursor-blink 1s step-end infinite",
                    }}
                  />
                )}
              </span>
            )}

            {interactive && (
              <input
                type="text"
                value={userActive ? userValue : ""}
                onChange={(e) => setUserValue(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                placeholder={userActive ? "키워드 입력 후 Enter" : ""}
                aria-label="키워드 검색"
                spellCheck={false}
                autoComplete="off"
                className="absolute inset-0 w-full bg-transparent outline-none font-mono font-semibold tracking-tight"
                style={{
                  fontSize: "clamp(22px, 2.6vw, 38px)",
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  caretColor: "var(--accent)",
                  opacity: userActive ? 1 : 0,
                  // Reserve space so typed text doesn't slide under the
                  // ".가격.kr" suffix overlay when the input grows long.
                  paddingRight: userActive ? "clamp(80px, 9vw, 130px)" : 0,
                }}
              />
            )}

            {userActive && userValue && (
              <span
                className="absolute right-0 top-1/2 -translate-y-1/2 font-mono pointer-events-none"
                style={{
                  fontSize: "clamp(18px, 2vw, 28px)",
                  color: "var(--ink-faint)",
                }}
                aria-hidden="true"
              >
                .가격.kr
              </span>
            )}
          </div>

          <div
            data-bar-go
            className="rounded-[var(--r-sm)] text-sm font-semibold flex items-center gap-1.5 transition-all duration-200"
            style={{
              background: isFull || userActive ? "var(--accent)" : "#E8E6E1",
              color: isFull || userActive ? "#fff" : "var(--ink-ghost)",
              padding: "10px 18px",
            }}
            aria-hidden="true"
          >
            {isFlash ? "이동 중..." : "Enter ↵"}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[14px] text-[var(--ink-faint)]">
        {isFlash ? (
          <span className="font-semibold text-[var(--accent)]">
            → 최저가 페이지로 이동합니다
          </span>
        ) : userActive ? (
          <>
            검색할 키워드를 입력하고 <kbd className="font-mono text-[var(--ink)]">Enter</kbd>
          </>
        ) : (
          <>
            주소창에{" "}
            <span className="font-mono font-semibold text-[var(--ink)]">
              {currentKeyword}.가격.kr
            </span>{" "}
            입력 → 즉시 최저가 사이트로 리다이렉트
          </>
        )}
      </p>
    </div>
  );
}
