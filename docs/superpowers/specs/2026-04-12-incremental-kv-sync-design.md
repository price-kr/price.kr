# Design: Incremental KV Sync (commit-based diff)

## 목표

sync-kv가 마지막으로 KV에 반영한 commit 이후 변경된 데이터만 증분으로 동기화한다. full sync의 KV write 비용(현재 1,047회, 스케일 시 증가)을 일반 push에서 1~10회 수준으로 줄여 Cloudflare KV free tier(1K writes/day) 내에서 안정적으로 운영한다.

## 배경

**현재 문제:**
- full sync: ~1,047개 항목 = 1,047 KV writes → free tier(1K/day) 초과
- `sync-kv.yml` incremental 모드: 변경 파일마다 개별 `wrangler kv key put` → 순차 처리로 15-25분 CI 소요
- 어떤 commit까지 반영되었는지 추적하지 않음 → sync 실패 시 재시도 범위 불명확

**해결:**
- KV에 마지막 sync commit SHA를 저장하여 diff 기준점 확보
- 변경분만 `wrangler kv bulk put` (1회 API 호출)으로 처리
- 삭제분은 `wrangler kv bulk delete`로 처리

---

## Sync commit 저장소

KV 자체에 메타 키로 저장:

```
KV key:   "__sync_commit__"
KV value: "84a3c5b2f..."  (full SHA)
```

**안전성:** `__sync_commit__`은 키워드 검증 regex(`/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/`)를 통과하지 못하므로, Workers에서 유효한 키워드로 조회될 수 없다. `extractSubdomain()`도 `__`가 포함된 서브도메인을 생성하지 않는다.

---

## 동작 흐름

```
┌─ sync-kv 실행 ─────────────────────────────────────────┐
│                                                         │
│  1. KV에서 "__sync_commit__" 읽기                       │
│     ├─ 없음 → full sync (최초 실행)                     │
│     └─ 있음 → LAST_COMMIT 확보                         │
│                                                         │
│  2. git rev-parse --verify $LAST_COMMIT                 │
│     ├─ 실패 → full sync fallback (force push 등)        │
│     └─ 성공 → incremental 진행                          │
│                                                         │
│  3. git diff --name-only $LAST_COMMIT..HEAD -- data/    │
│     → 변경된 JSON 파일 목록                             │
│                                                         │
│  4. 변경 분류:                                          │
│     ├─ 추가/수정 (파일 존재) → upsert 목록              │
│     └─ 삭제 (파일 미존재) → delete 목록                 │
│         └─ git show $LAST_COMMIT:<file> 로 keyword 추출 │
│                                                         │
│  5. (확장점) Alias 인식:                                │
│     ├─ canonical 변경 → alias 탐색 → upsert에 추가     │
│     └─ canonical 삭제 → alias 탐색 → delete에 추가     │
│     → alias spec 구현 시 이 지점에 로직 추가            │
│                                                         │
│  6. wrangler kv bulk put (upsert 목록)                  │
│     wrangler kv bulk delete (delete 목록)               │
│                                                         │
│  7. 성공 시 "__sync_commit__" ← HEAD SHA 저장           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## sync-kv.ts 변경

### 신규 함수: incrementalKvEntries

```typescript
interface IncrementalResult {
  upsert: KvEntry[];
  delete: string[];  // keywords to delete
}

async function incrementalKvEntries(
  dataDir: string,
  lastCommit: string
): Promise<IncrementalResult> {
  const { execFileSync } = await import("child_process");

  // 1. Get changed data files
  const diffOutput = execFileSync(
    "git", ["diff", "--name-only", `${lastCommit}..HEAD`, "--", "data/"],
    { encoding: "utf-8" }
  );
  const changedFiles = diffOutput
    .split("\n")
    .filter(f => f.endsWith(".json") && !NON_KEYWORD_FILES.has(basename(f)));

  const upsert: KvEntry[] = [];
  const deleteKeys: string[] = [];

  for (const file of changedFiles) {
    const fullPath = join(process.cwd(), file);

    if (existsSync(fullPath)) {
      // Added or modified
      const content = await readFile(fullPath, "utf-8");
      const data = JSON.parse(content);
      if (data.keyword && data.url) {
        upsert.push({ key: data.keyword, value: data.url });
      }
      // 확장점: alias 처리 (alias spec 구현 시 추가)
    } else {
      // Deleted — extract keyword from old content
      try {
        const oldContent = execFileSync(
          "git", ["show", `${lastCommit}:${file}`],
          { encoding: "utf-8" }
        );
        const data = JSON.parse(oldContent);
        if (data.keyword) {
          deleteKeys.push(data.keyword);
        }
      } catch {
        console.warn(`Cannot read deleted file from git: ${file}`);
      }
    }
  }

  return { upsert, delete: deleteKeys };
}
```

### CLI 진입점 변경

```typescript
if (isMainModule) {
  const mode = process.argv[2]; // "full" | 없으면 auto
  const dataDir = process.argv[3] || join(process.cwd(), "..", "data");
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;

  // Auto mode: KV에서 __sync_commit__ 읽어서 판단
  if (mode !== "full") {
    const lastCommit = await readSyncCommit(namespaceId);
    if (lastCommit && isValidCommit(lastCommit)) {
      // Incremental sync
      const { upsert, delete: deleteKeys } = await incrementalKvEntries(dataDir, lastCommit);
      await bulkPut(namespaceId, upsert);
      await bulkDelete(namespaceId, deleteKeys);
      await writeSyncCommit(namespaceId, getCurrentCommit());
      console.log(`Incremental sync: ${upsert.length} upserted, ${deleteKeys.length} deleted`);
      return;
    }
  }

  // Full sync (fallback or explicit)
  const entries = await buildKvEntries(dataDir);
  await bulkPut(namespaceId, entries);
  await writeSyncCommit(namespaceId, getCurrentCommit());
  console.log(`Full sync: ${entries.length} entries`);
}
```

---

## sync-kv.yml 변경

push 트리거 시 mode 인자 없이 실행 → auto mode → `__sync_commit__` 기반 incremental.
workflow_dispatch 시 `mode: "full"` 전달 → 강제 full sync.

---

## Edge cases

| 상황 | 처리 |
|------|------|
| 최초 실행 (`__sync_commit__` 없음) | full sync → commit SHA 저장 |
| force push (stored commit이 히스토리에 없음) | `git rev-parse --verify` 실패 → full sync fallback |
| sync 도중 실패 (bulk put 성공, SHA 저장 실패) | 다음 실행에서 같은 diff 재처리 — KV put은 idempotent |
| sync 도중 실패 (bulk put 실패) | commit SHA 미갱신 → 다음 실행에서 재시도 |
| `workflow_dispatch` 수동 트리거 | full sync (기존과 동일) |
| 변경 파일 0개 | upsert/delete 비어있음 → commit SHA만 갱신 |
| 삭제된 파일의 keyword 추출 불가 | warn 로그, skip → full sync로 정리 |

---

## KV write 비용 비교

| 시나리오 | 현재 (full sync) | 변경 후 (incremental) |
|----------|-----------------|---------------------|
| 일반 push (1~3 파일 변경) | ~1,047 writes | 1~3 writes + 1 meta |
| 키워드 100개 일괄 추가 | ~1,047 writes | ~100 writes + 1 meta |
| workflow_dispatch full sync | ~1,047 writes | ~1,047 writes (동일) |

---

## Alias spec과의 관계

이 Spec은 alias 기능과 독립적으로 구현 가능하다. 동작 흐름 Step 5는 alias spec 구현 시 `incrementalKvEntries`에 alias 탐색 로직을 추가하는 확장점이다.

**구현 순서: 이 Spec 먼저 → alias spec에서 확장점에 로직 추가**

---

## 영향 범위

| 파일 | 변경 |
|------|------|
| `scripts/sync-kv.ts` | `incrementalKvEntries` 추가, CLI auto/full mode |
| `.github/workflows/sync-kv.yml` | mode 인자 전달 방식 변경 |
| `scripts/__tests__/sync-kv.test.ts` | incremental 테스트 추가 |
| `workers/` | **없음** |
| `web/` | **없음** |
