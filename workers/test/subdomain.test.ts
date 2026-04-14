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

  it("rejects non-decodable punycode (toUnicode returns original, double-hyphen fails regex)", () => {
    // punycode.toUnicode("xn--invalid") returns the original "xn--invalid" unchanged.
    // The double hyphen "--" does not match validSubdomainRegex, so the result is null.
    const result = extractSubdomain("xn--invalid.xn--o39aom.kr", "xn--o39aom.kr");
    expect(result).toBeNull();
  });
});
