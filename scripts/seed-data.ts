import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { getKeywordPath } from "./hangul-path.js";

export interface KeywordEntry {
  keyword: string;
  url: string;
  created: string;
}

export function buildKeywordEntry(keyword: string, url: string): KeywordEntry {
  return {
    keyword,
    url,
    created: new Date().toISOString().split("T")[0],
  };
}

export function writeKeywordFile(
  dataDir: string,
  keyword: string,
  url: string
): void {
  const relativePath = getKeywordPath(keyword);
  // getKeywordPath returns "data/..." but we want to write to dataDir directly
  const pathWithoutDataPrefix = relativePath.replace(/^data\//, "");
  const fullPath = join(dataDir, pathWithoutDataPrefix);
  mkdirSync(dirname(fullPath), { recursive: true });
  const entry = buildKeywordEntry(keyword, url);
  writeFileSync(fullPath, JSON.stringify(entry, null, 2) + "\n");
}

// CLI entry point: generate seed data from a CSV/TSV of keyword-URL pairs
// Usage: npx tsx seed-data.ts <input-file> <output-data-dir>
const isMain =
  process.argv[1]?.endsWith("seed-data.ts") ||
  process.argv[1]?.endsWith("seed-data.js");

if (isMain) {
  const inputFile = process.argv[2];
  const outputDir = process.argv[3] || join(process.cwd(), "..", "data");

  if (!inputFile) {
    console.log("Usage: npx tsx seed-data.ts <keywords.tsv> [output-dir]");
    console.log("TSV format: keyword<TAB>url (one per line)");
    process.exit(1);
  }

  const { readFileSync } = await import("fs");
  const lines = readFileSync(inputFile, "utf-8")
    .split("\n")
    .filter((l) => l.trim());

  let count = 0;
  for (const line of lines) {
    const [keyword, url] = line.split("\t");
    if (keyword && url) {
      writeKeywordFile(outputDir, keyword.trim(), url.trim());
      count++;
    }
  }
  console.log(`Generated ${count} keyword files in ${outputDir}`);
}
