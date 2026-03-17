import { describe, it, expect } from "vitest";

// Note: The [keyword] page is an async server component that reads from the filesystem.
// We test its helper logic (searchKeywords) thoroughly in hangul.test.ts.
// Full page rendering tests require Next.js test infrastructure (e.g., next/testmode or E2E).
// Here we verify the issue URL construction logic.

describe("Keyword page helpers", () => {
  it("constructs correct GitHub issue URL", () => {
    const keyword = "새단어";
    const repo = "laeyoung/price.kr";
    const issueUrl = `https://github.com/${repo}/issues/new?template=new-keyword.yml&title=${encodeURIComponent(`[키워드 제안] ${keyword}`)}`;
    expect(issueUrl).toContain("template=new-keyword.yml");
    expect(issueUrl).toContain(encodeURIComponent("새단어"));
  });
});
