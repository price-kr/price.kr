import { describe, it, expect } from "vitest";
import { extractSubdomain } from "../src/subdomain";

describe("extractSubdomain", () => {
  it("extracts and decodes Korean punycode subdomain", () => {
    // 만두 → xn--hu1b07h (verified with punycode library)
    expect(extractSubdomain("xn--hu1b07h.xn--o39aom.kr", "xn--o39aom.kr")).toBe("만두");
  });

  it("returns null for bare domain", () => {
    expect(extractSubdomain("xn--o39aom.kr", "xn--o39aom.kr")).toBeNull();
  });

  it("returns null for www", () => {
    expect(extractSubdomain("www.xn--o39aom.kr", "xn--o39aom.kr")).toBeNull();
  });

  it("handles ASCII subdomains", () => {
    expect(extractSubdomain("iphone.xn--o39aom.kr", "xn--o39aom.kr")).toBe("iphone");
  });

  it("rejects multi-level subdomains", () => {
    expect(extractSubdomain("a.b.xn--o39aom.kr", "xn--o39aom.kr")).toBeNull();
  });

  it("handles non-decodable punycode gracefully (toUnicode returns original)", () => {
    const result = extractSubdomain("xn--invalid.xn--o39aom.kr", "xn--o39aom.kr");
    expect(typeof result).toBe("string");
  });
});
