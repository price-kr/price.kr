"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { searchKeywords } from "@/lib/hangul";

export function SearchBar({ keywords }: { keywords: string[] }) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return searchKeywords(query, keywords).slice(0, 10);
  }, [query, keywords]);

  const handleSelect = useCallback((keyword: string) => {
    if (/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/.test(keyword)) {
      window.location.href = `https://${keyword}.가격.kr`;
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150);
  }

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setShowSuggestions(true);
  }

  const listboxId = "search-suggestions";

  return (
    <div className="w-full max-w-md relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
          setActiveIndex(-1);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="키워드 검색 (예: 만두, 가방, iphone)"
        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
        role="combobox"
        aria-expanded={showSuggestions && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        aria-autocomplete="list"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10 max-h-60 overflow-y-auto"
        >
          {suggestions.map((kw, i) => (
            <li key={kw} id={`suggestion-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(kw)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  i === activeIndex ? "bg-gray-100" : ""
                }`}
              >
                {kw}
                <span className="text-gray-400 text-sm ml-2">
                  {kw}.가격.kr
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
