"use client";

import { useState, useMemo } from "react";
import { searchKeywords } from "@/lib/hangul";

export function SearchBar({ keywords }: { keywords: string[] }) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return searchKeywords(query, keywords).slice(0, 10);
  }, [query, keywords]);

  function handleSelect(keyword: string) {
    window.location.href = `https://${keyword}.가격.kr`;
  }

  return (
    <div className="w-full max-w-md relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="키워드 검색 (예: 만두, 가방, iphone)"
        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10 max-h-60 overflow-y-auto">
          {suggestions.map((kw) => (
            <li key={kw}>
              <button
                onClick={() => handleSelect(kw)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
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
