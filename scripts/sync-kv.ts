import { readdir, readFile } from "fs/promises";
import { join } from "path";

export interface KvEntry {
  key: string;
  value: string;
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

export async function buildKvEntries(dataDir: string): Promise<KvEntry[]> {
  const files = await findJsonFiles(dataDir);
  const entries: KvEntry[] = [];

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const data = JSON.parse(content);
      if (data && typeof data.keyword === "string" && typeof data.url === "string") {
        entries.push({ key: data.keyword, value: data.url });
      }
    } catch {
      console.warn(`Skipping malformed JSON: ${file}`);
    }
  }

  return entries;
}

// CLI entry point — only runs when executed directly
const isMainModule = process.argv[1]?.endsWith("sync-kv.ts") ||
                     process.argv[1]?.endsWith("sync-kv.js");

if (isMainModule) {
  const dataDir = process.argv[2] || join(process.cwd(), "..", "data");
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;

  if (!namespaceId) {
    console.error("CF_KV_NAMESPACE_ID environment variable required");
    process.exit(1);
  }

  const entries = await buildKvEntries(dataDir);
  console.log(`Found ${entries.length} keywords to sync`);

  // Bulk write via Wrangler CLI
  const bulkData = entries.map((e) => ({ key: e.key, value: e.value }));
  const tmpFile = `/tmp/kv-bulk-${Date.now()}.json`;
  const { writeFileSync } = await import("fs");
  writeFileSync(tmpFile, JSON.stringify(bulkData));

  const { execSync } = await import("child_process");
  execSync(
    `npx wrangler kv bulk put --namespace-id=${namespaceId} ${tmpFile}`,
    { stdio: "inherit" }
  );
  console.log("KV sync complete");
}
