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

export interface AliasEntry {
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

export interface LoadResults {
  keywords: KeywordEntry[];
  aliases: AliasEntry[];
}

export async function loadData(dataDir: string): Promise<LoadResults> {
  const files = await findJsonFiles(dataDir);
  const keywords: KeywordEntry[] = [];
  const aliases: AliasEntry[] = [];
  const canonicalMap = new Map<string, KeywordEntry>();
  const pendingAliases: AliasEntry[] = [];

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed.keyword !== "string") continue;

      if (typeof parsed.url === "string") {
        const entry = parsed as KeywordEntry;
        keywords.push(entry);
        canonicalMap.set(parsed.keyword, entry);
      } else if (typeof parsed.alias_of === "string") {
        const entry = parsed as AliasEntry;
        aliases.push(entry);
        pendingAliases.push(entry);
      }
    } catch {
      // Skip malformed JSON files
    }
  }

  for (const alias of pendingAliases) {
    const canonical = canonicalMap.get(alias.alias_of);
    if (canonical) {
      keywords.push({
        keyword: alias.keyword,
        url: canonical.url,
        created: alias.created,
      });
    }
  }

  return { keywords, aliases };
}

export async function loadAllKeywords(dataDir: string): Promise<KeywordEntry[]> {
  const { keywords } = await loadData(dataDir);
  return keywords;
}

export async function loadAllAliases(dataDir: string): Promise<AliasEntry[]> {
  const { aliases } = await loadData(dataDir);
  return aliases;
}

/** Compute data file path for a keyword (Korean/English/Numeric) */
function keywordFilePath(keyword: string): string {
  if (keyword.includes("/") || keyword.includes("..")) {
    throw new Error("Invalid keyword");
  }
  const CHOSEONG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const first = keyword[0];
  const code = first?.charCodeAt(0) ?? 0;
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const cho = CHOSEONG[Math.floor((code - 0xAC00) / 588)];
    return join(cho, first, `${keyword}.json`);
  } else if (/\d/.test(first)) {
    return join("_num", `${keyword}.json`);
  }
  return join("_en", `${keyword.toLowerCase()}.json`);
}

/** Return keywords of alias files that point to the given canonical */
export async function findAliasesOf(canonicalKeyword: string, dataDir: string): Promise<string[]> {
  const { aliases } = await loadData(dataDir);
  return aliases.filter((a) => a.alias_of === canonicalKeyword).map((a) => a.keyword);
}

/** Load raw JSON data for a single keyword (canonical or alias). Returns null if not found. */
export async function loadKeywordFile(
  keyword: string,
  dataDir: string
): Promise<Record<string, unknown> | null> {
  const relPath = keywordFilePath(keyword);
  const fullPath = join(dataDir, relPath);
  try {
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
