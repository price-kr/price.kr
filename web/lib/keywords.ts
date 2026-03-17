import "server-only";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

export interface KeywordEntry {
  keyword: string;
  url: string;
  created: string;
}

async function findJsonFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findJsonFiles(fullPath)));
    } else if (entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function loadAllKeywords(
  dataDir: string
): Promise<KeywordEntry[]> {
  const files = await findJsonFiles(dataDir);
  const entries: KeywordEntry[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    entries.push(JSON.parse(content));
  }

  return entries;
}
