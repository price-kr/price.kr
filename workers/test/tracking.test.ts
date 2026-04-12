import { describe, it, expect, vi } from "vitest";
import { writeEvent } from "../src/tracking";

function createMockD1(): D1Database {
  const mockStmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStmt),
    dump: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  } as unknown as D1Database;
}

describe("writeEvent", () => {
  it("inserts event with type, keyword, and value", async () => {
    const db = createMockD1();
    await writeEvent(db, "search", "가방", "가");

    expect(db.prepare).toHaveBeenCalledWith(
      "INSERT INTO events (type, keyword, value) VALUES (?, ?, ?)"
    );
    const stmt = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(stmt.bind).toHaveBeenCalledWith("search", "가방", "가");
    expect(stmt.run).toHaveBeenCalled();
  });

  it("inserts event with null value when omitted", async () => {
    const db = createMockD1();
    await writeEvent(db, "redirect", "만두");

    const stmt = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(stmt.bind).toHaveBeenCalledWith("redirect", "만두", null);
  });
});
