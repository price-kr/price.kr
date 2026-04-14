import { readdir, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { existsSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { isAliasData, isCanonicalData } from "./validate-keyword.js";

export interface KvEntry {
  key: string;
  value: string;
}

const NON_KEYWORD_FILES = new Set([
  "blocklist.json",
  "whitelist.json",
  "profanity-blocklist.json",
]);

export interface DiffEntry {
  status: "A" | "M" | "D" | "R";
  file: string;
  oldFile?: string;
}

export function parseGitDiffNameStatus(output: string): DiffEntry[] {
  const entries: DiffEntry[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const statusRaw = parts[0];

    const status = statusRaw.startsWith("R") ? "R" : statusRaw as "A" | "M" | "D";
    if (!["A", "M", "D", "R"].includes(status)) continue;

    if (status === "R") {
      const oldFile = parts[1];
      const newFile = parts[2];
      if (!newFile?.startsWith("data/") || !newFile.endsWith(".json")) continue;
      if (NON_KEYWORD_FILES.has(basename(newFile))) continue;
      entries.push({ status: "R", file: newFile, oldFile });
    } else {
      const file = parts[1];
      if (!file?.startsWith("data/") || !file.endsWith(".json")) continue;
      if (NON_KEYWORD_FILES.has(basename(file))) continue;
      entries.push({ status, file });
    }
  }
  return entries;
}

export function chunk<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export interface IncrementalResult {
  upsert: KvEntry[];
  delete: string[];
}

export async function incrementalKvEntries(
  repoDir: string,
  lastCommit: string
): Promise<IncrementalResult> {
  execFileSync("git", ["config", "core.quotepath", "false"], { cwd: repoDir });

  const diffOutput = execFileSync(
    "git",
    ["diff", "--name-status", `${lastCommit}..HEAD`, "--", "data/"],
    { cwd: repoDir, encoding: "utf-8" }
  );

  const changes = parseGitDiffNameStatus(diffOutput);
  const upsert: KvEntry[] = [];
  const deleteKeys: string[] = [];
  const dataDir = join(repoDir, "data");

  for (const change of changes) {
    if (change.status === "A" || change.status === "M") {
      const fullPath = join(repoDir, change.file);
      if (!existsSync(fullPath)) continue;
      try {
        const content = await readFile(fullPath, "utf-8");
        const data = JSON.parse(content);
        if (isCanonicalData(data)) {
          upsert.push({ key: data.keyword, value: data.url });
          // Back-propagate new URL to all aliases of this canonical
          const aliases = await findAliasesOf(data.keyword, dataDir);
          for (const aliasKeyword of aliases) {
            upsert.push({ key: aliasKeyword, value: data.url });
          }
        } else if (isAliasData(data)) {
          // Resolve canonical URL from data directory
          const allFiles = await findJsonFiles(dataDir);
          for (const f of allFiles) {
            try {
              const c = JSON.parse(await readFile(f, "utf-8"));
              if (isCanonicalData(c) && c.keyword === data.alias_of) {
                upsert.push({ key: data.keyword, value: c.url });
                break;
              }
            } catch { /* skip */ }
          }
        }
      } catch {
        console.warn(`Skipping malformed JSON: ${change.file}`);
      }
    } else if (change.status === "D") {
      try {
        const oldContent = execFileSync(
          "git", ["show", `${lastCommit}:${change.file}`],
          { cwd: repoDir, encoding: "utf-8" }
        );
        const data = JSON.parse(oldContent);
        if (isCanonicalData(data)) {
          deleteKeys.push(data.keyword);
          // Also delete all aliases still pointing to this canonical
          const aliases = await findAliasesOf(data.keyword, dataDir);
          deleteKeys.push(...aliases);
        } else if (isAliasData(data)) {
          deleteKeys.push(data.keyword);
        }
      } catch {
        console.warn(`Cannot read deleted file from git: ${change.file}`);
      }
    } else if (change.status === "R") {
      if (change.oldFile) {
        try {
          const oldContent = execFileSync(
            "git", ["show", `${lastCommit}:${change.oldFile}`],
            { cwd: repoDir, encoding: "utf-8" }
          );
          const data = JSON.parse(oldContent);
          if (typeof data.keyword === "string") {
            deleteKeys.push(data.keyword);
          }
        } catch {
          console.warn(`Cannot read renamed-from file from git: ${change.oldFile}`);
        }
      }
      const fullPath = join(repoDir, change.file);
      if (existsSync(fullPath)) {
        try {
          const content = await readFile(fullPath, "utf-8");
          const data = JSON.parse(content);
          if (isCanonicalData(data)) {
            upsert.push({ key: data.keyword, value: data.url });
          } else if (isAliasData(data)) {
            const allFiles = await findJsonFiles(dataDir);
            for (const f of allFiles) {
              try {
                const c = JSON.parse(await readFile(f, "utf-8"));
                if (isCanonicalData(c) && c.keyword === data.alias_of) {
                  upsert.push({ key: data.keyword, value: c.url });
                  break;
                }
              } catch { /* skip */ }
            }
          }
        } catch {
          console.warn(`Skipping malformed JSON: ${change.file}`);
        }
      }
    }
  }

  const upsertKeys = new Set(upsert.map((entry) => entry.key));
  const filteredDeleteKeys = [...new Set(deleteKeys.filter((key) => !upsertKeys.has(key)))];

  return { upsert, delete: filteredDeleteKeys };
}

export async function writeDiffJsonl(
  outputPath: string,
  upsert: KvEntry[],
  deleteKeys: string[]
): Promise<void> {
  const lines: string[] = [];
  for (const entry of upsert) {
    lines.push(JSON.stringify({ action: "put", key: entry.key, value: entry.value }));
  }
  for (const key of deleteKeys) {
    lines.push(JSON.stringify({ action: "delete", key }));
  }
  await writeFile(outputPath, lines.length > 0 ? lines.join("\n") + "\n" : "");
}

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

export async function findAliasesOf(canonicalKeyword: string, dataDir: string): Promise<string[]> {
  const files = await findJsonFiles(dataDir);
  const aliases: string[] = [];
  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const data = JSON.parse(content);
      if (isAliasData(data) && data.alias_of === canonicalKeyword) {
        aliases.push(data.keyword);
      }
    } catch {
      // skip malformed
    }
  }
  return aliases;
}

export async function buildKvEntries(dataDir: string): Promise<KvEntry[]> {
  const files = await findJsonFiles(dataDir);
  const canonicalMap = new Map<string, string>(); // keyword → url
  const pendingAliases: Array<{ keyword: string; alias_of: string }> = [];

  // 1st pass: collect canonicals and separate aliases
  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const data = JSON.parse(content);
      if (isCanonicalData(data)) {
        canonicalMap.set(data.keyword, data.url);
      } else if (isAliasData(data)) {
        pendingAliases.push({ keyword: data.keyword, alias_of: data.alias_of });
      }
    } catch {
      console.warn(`Skipping malformed JSON: ${file}`);
    }
  }

  const entries: KvEntry[] = [];

  // Add all canonicals
  for (const [keyword, url] of canonicalMap) {
    entries.push({ key: keyword, value: url });
  }

  // 2nd pass: resolve aliases to canonical URLs
  for (const { keyword, alias_of } of pendingAliases) {
    const url = canonicalMap.get(alias_of);
    if (url === undefined) {
      console.warn(`Skipping alias "${keyword}": canonical "${alias_of}" not found or is itself an alias`);
      continue;
    }
    entries.push({ key: keyword, value: url });
  }

  return entries;
}

// --- Wrangler helpers ---

const SYNC_COMMIT_KEY = "__sync_commit__";
const BULK_CHUNK_SIZE = 10_000;

export function buildBulkPutArgs(namespaceId: string, tmpFile: string): string[] {
  return ["wrangler", "kv", "bulk", "put", "--remote", `--namespace-id=${namespaceId}`, tmpFile];
}

export function buildBulkDeleteArgs(namespaceId: string, tmpFile: string): string[] {
  return ["wrangler", "kv", "bulk", "delete", "--remote", `--namespace-id=${namespaceId}`, tmpFile];
}

export function readSyncCommit(namespaceId: string): string | null {
  try {
    const result = execFileSync(
      "npx",
      ["wrangler", "kv", "key", "get", "--remote", `--namespace-id=${namespaceId}`, SYNC_COMMIT_KEY],
      { encoding: "utf-8", timeout: 30_000 }
    ).trim();
    return /^[a-f0-9]{40}$/.test(result) ? result : null;
  } catch {
    return null;
  }
}

export function writeSyncCommit(namespaceId: string, commitSha: string): void {
  execFileSync(
    "npx",
    ["wrangler", "kv", "key", "put", "--remote", `--namespace-id=${namespaceId}`, SYNC_COMMIT_KEY, commitSha],
    { stdio: "inherit", timeout: 30_000 }
  );
}

export function bulkPut(namespaceId: string, entries: KvEntry[]): void {
  if (entries.length === 0) return;
  const chunks = chunk(entries, BULK_CHUNK_SIZE);
  for (const [i, batch] of chunks.entries()) {
    const tmpFile = `/tmp/kv-bulk-put-${Date.now()}-${i}.json`;
    writeFileSync(tmpFile, JSON.stringify(batch.map(e => ({ key: e.key, value: e.value }))));
    execFileSync("npx", buildBulkPutArgs(namespaceId, tmpFile), {
      stdio: "inherit",
      timeout: 120_000,
    });
  }
}

export function bulkDelete(namespaceId: string, keys: string[]): void {
  if (keys.length === 0) return;
  const chunks = chunk(keys, BULK_CHUNK_SIZE);
  for (const [i, batch] of chunks.entries()) {
    const tmpFile = `/tmp/kv-bulk-delete-${Date.now()}-${i}.json`;
    writeFileSync(tmpFile, JSON.stringify(batch));
    execFileSync("npx", buildBulkDeleteArgs(namespaceId, tmpFile), {
      stdio: "inherit",
      timeout: 120_000,
    });
  }
}

function isValidCommit(repoDir: string, sha: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--verify", sha], { cwd: repoDir, encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

function getCurrentCommit(repoDir: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoDir, encoding: "utf-8" }).trim();
}

// --- CLI entry point ---

const isMainModule =
  process.argv[1]?.endsWith("sync-kv.ts") ||
  process.argv[1]?.endsWith("sync-kv.js");

if (isMainModule) {
  const args = process.argv.slice(2);
  const mode = args.find(a => a === "full" || a === "auto") || "auto";
  const dryRun = args.includes("--dry-run");
  const dataDir = join(process.cwd(), "..", "data");
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;
  const repoDir = join(process.cwd(), "..");

  if (!dryRun) {
    if (!namespaceId) {
      console.error("CF_KV_NAMESPACE_ID environment variable required");
      process.exit(1);
    }
    if (!/^[a-f0-9]+$/.test(namespaceId)) {
      console.error("CF_KV_NAMESPACE_ID must be a hex string");
      process.exit(1);
    }
  }

  let useIncremental = false;
  let lastCommit: string | null = null;

  if (mode !== "full" && namespaceId) {
    lastCommit = readSyncCommit(namespaceId);
    if (lastCommit && isValidCommit(repoDir, lastCommit)) {
      useIncremental = true;
    } else if (lastCommit) {
      console.log(`Stored commit ${lastCommit} not in history, falling back to full sync`);
    }
  }

  if (useIncremental && lastCommit) {
    const { upsert, delete: deleteKeys } = await incrementalKvEntries(repoDir, lastCommit);

    if (dryRun) {
      const outputPath = join(process.cwd(), "diff.jsonl");
      await writeDiffJsonl(outputPath, upsert, deleteKeys);
      console.log(`Dry run: wrote ${upsert.length} puts + ${deleteKeys.length} deletes to ${outputPath}`);
    } else {
      bulkPut(namespaceId!, upsert);
      bulkDelete(namespaceId!, deleteKeys);
      writeSyncCommit(namespaceId!, getCurrentCommit(repoDir));
      console.log(`Incremental sync: ${upsert.length} upserted, ${deleteKeys.length} deleted`);
    }
  } else {
    const entries = await buildKvEntries(dataDir);

    if (dryRun) {
      const outputPath = join(process.cwd(), "diff.jsonl");
      await writeDiffJsonl(outputPath, entries, []);
      console.log(`Dry run (full): wrote ${entries.length} puts to ${outputPath}`);
    } else {
      bulkPut(namespaceId!, entries);
      writeSyncCommit(namespaceId!, getCurrentCommit(repoDir));
      console.log(`Full sync: ${entries.length} entries`);
    }
  }
}
