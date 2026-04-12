export async function writeEvent(
  db: D1Database,
  type: string,
  keyword: string,
  value?: string
): Promise<void> {
  await db
    .prepare("INSERT INTO events (type, keyword, value) VALUES (?, ?, ?)")
    .bind(type, keyword, value ?? null)
    .run();
}
