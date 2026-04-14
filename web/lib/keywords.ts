import "server-only";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

export function getDataDir(): string {
  return join(process.cwd(), "..", "data");
}

export interface KeywordEntry {
  keyword: string;
  url: string;
  created: string;
}

interface AliasData {
  keyword: string;
  alias_of: string;
  created: string;
}

const NON_KEYWORD_FILES = new Set([
  "blocklist.json",
  "whitelist.json",
  "profanity-blocklist.json",
]);

async function findJsonFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findJsonFiles(fullPath)));
    } else if (entry.name.endsWith(".json") && !NON_KEYWORD_FILES.has(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function loadAllKeywords(
  dataDir: string
): Promise<KeywordEntry[]> {
  const files = await findJsonFiles(dataDir);
  const canonicalMap = new Map<string, KeywordEntry>();
  const pendingAliases: AliasData[] = [];

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed.keyword !== "string") continue;

      if (typeof parsed.url === "string") {
        canonicalMap.set(parsed.keyword, parsed as KeywordEntry);
      } else if (typeof parsed.alias_of === "string") {
        pendingAliases.push(parsed as AliasData);
      }
    } catch {
      // Skip malformed JSON files
    }
  }

  const entries: KeywordEntry[] = Array.from(canonicalMap.values());

  for (const alias of pendingAliases) {
    const canonical = canonicalMap.get(alias.alias_of);
    if (canonical) {
      entries.push({
        keyword: alias.keyword,
        url: canonical.url,
        created: alias.created,
      });
    }
  }

  return entries;
}
