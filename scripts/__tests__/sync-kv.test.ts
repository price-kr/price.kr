import { describe, it, expect } from "vitest";
import { buildKvEntries } from "../sync-kv.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("buildKvEntries", () => {
  it("reads JSON files and returns KV key-value pairs", async () => {
    const tmp = join(tmpdir(), `test-kv-${Date.now()}`);
    mkdirSync(join(tmp, "ㅁ", "만"), { recursive: true });
    writeFileSync(
      join(tmp, "ㅁ", "만", "만두.json"),
      JSON.stringify({ keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" })
    );

    const entries = await buildKvEntries(tmp);
    expect(entries).toEqual([{ key: "만두", value: "https://example.com/mandu" }]);
  });
});
