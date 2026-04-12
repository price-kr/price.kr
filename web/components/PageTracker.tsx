"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

export function PageTracker({ page }: { page: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("pageview", page);
  }, [page]);

  return null;
}
