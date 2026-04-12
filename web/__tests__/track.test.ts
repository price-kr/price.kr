import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("track", () => {
  const originalEnv = process.env.NODE_ENV;
  let sendBeaconMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendBeaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, "navigator", {
      value: { sendBeacon: sendBeaconMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = originalEnv;
  });

  it("sends beacon with correct JSON for pageview", async () => {
    process.env.NODE_ENV = "production";
    const { track } = await import("../lib/track");
    track("pageview", "/");
    expect(sendBeaconMock).toHaveBeenCalledWith(
      "https://t.xn--o39aom.kr/e",
      '{"type":"pageview","keyword":"/"}'
    );
  });

  it("sends beacon with value for search", async () => {
    process.env.NODE_ENV = "production";
    const { track } = await import("../lib/track");
    track("search", "가방", "가");
    expect(sendBeaconMock).toHaveBeenCalledWith(
      "https://t.xn--o39aom.kr/e",
      '{"type":"search","keyword":"가방","value":"가"}'
    );
  });

  it("logs to console in development mode instead of sending beacon", async () => {
    process.env.NODE_ENV = "development";
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { track } = await import("../lib/track");
    track("pageview", "/");
    expect(sendBeaconMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("[track]", "pageview", "/", undefined);
    consoleSpy.mockRestore();
  });
});
