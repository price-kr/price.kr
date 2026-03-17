import { describe, it, expect } from "vitest";
import { loadAllKeywords } from "@/lib/keywords";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadAllKeywords", () => {
  it("loads keywords from data directory", async () => {
    const tmp = join(tmpdir(), `test-data-${Date.now()}`);
    mkdirSync(join(tmp, "ㅁ", "만"), { recursive: true });
    writeFileSync(
      join(tmp, "ㅁ", "만", "만두.json"),
      JSON.stringify({
        keyword: "만두",
        url: "https://example.com/mandu",
        created: "2026-01-01",
      })
    );

    const keywords = await loadAllKeywords(tmp);
    expect(keywords).toHaveLength(1);
    expect(keywords[0].keyword).toBe("만두");
    expect(keywords[0].url).toBe("https://example.com/mandu");
  });
});
