"use client";

import { useMemo } from "react";

interface FloatingChipsProps {
  keywords: string[];
  excludeKeyword?: string;
  width?: number;
  height?: number;
}

export function FloatingChips({
  keywords,
  excludeKeyword,
  width = 1280,
  height = 820,
}: FloatingChipsProps) {
  const chips = useMemo(() => {
    const list = keywords.filter((k) => k !== excludeKeyword);
    return list.map((kw, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const r1 = (seed % 1000) / 1000;
      const r2 = ((seed * 7) % 1000) / 1000;
      const r3 = ((seed * 13) % 1000) / 1000;
      const top =
        i % 2 === 0
          ? 40 + r1 * (height * 0.28)
          : height * 0.66 + r1 * (height * 0.28);
      const left = 40 + r2 * (width - 200);
      const scale = 0.55 + r3 * 0.55;
      const dur = 9 + r2 * 8;
      const delay = -r1 * dur;
      return { kw, top, left, scale, dur, delay, lane: i % 4 };
    });
  }, [keywords, excludeKeyword, width, height]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {chips.map((c, i) => (
        <div
          key={`${c.kw}-${i}`}
          className="absolute whitespace-nowrap font-medium"
          style={{
            top: `${(c.top / height) * 100}%`,
            left: `${(c.left / width) * 100}%`,
            fontSize: `${14 * c.scale + 14}px`,
            color: "var(--chip-ink)",
            letterSpacing: "-0.02em",
            animation: `chip-drift-${c.lane} ${c.dur}s ease-in-out ${c.delay}s infinite`,
          }}
        >
          {c.kw}
          <span style={{ color: "var(--chip-accent)" }}>.가격.kr</span>
        </div>
      ))}
    </div>
  );
}
