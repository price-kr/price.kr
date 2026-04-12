# User Action Tracking 배포 가이드

이 문서는 `feature/tracking-user-action` 브랜치의 트래킹 기능을 프로덕션에 배포하는 절차입니다.
순서대로 따라하세요.

---

## 사전 준비

- [ ] Cloudflare 계정 로그인 상태
- [ ] `wrangler` CLI 설치됨 (`npm i -g wrangler`)
- [ ] `wrangler login` 완료
- [ ] GitHub repo push 권한 확인

---

## Step 1: D1 데이터베이스 생성

```bash
wrangler d1 create price-kr-tracking
```

출력에서 `database_id`를 복사합니다:

```
✅ Successfully created DB 'price-kr-tracking'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← 이 값을 복사
```

---

## Step 2: wrangler.toml에 실제 database_id 반영

`workers/wrangler.toml`의 placeholder를 실제 ID로 교체합니다:

```toml
[[d1_databases]]
binding = "TRACKING"
database_name = "price-kr-tracking"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← 여기에 붙여넣기
migrations_dir = "migrations"
```

> **주의:** `placeholder-tracking-db-id`를 실제 값으로 반드시 교체하세요.

---

## Step 3: D1 마이그레이션 적용

```bash
cd workers
wrangler d1 migrations apply price-kr-tracking
```

확인 메시지가 뜨면 `y`를 입력합니다.

적용 결과를 확인합니다:

```bash
wrangler d1 execute price-kr-tracking --command "SELECT name FROM sqlite_master WHERE type='table'"
```

`events` 테이블이 보이면 성공입니다.

---

## Step 4: Cloudflare WAF Rate Limiting 설정

Cloudflare Dashboard에서 설정합니다:

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. `가격.kr` (xn--o39aom.kr) 도메인 선택
3. **Security** > **WAF** > **Rate limiting rules** 이동
4. **Create rule** 클릭

설정값:

| 항목 | 값 |
|------|---|
| Rule name | `Tracking endpoint rate limit` |
| Expression | `http.request.uri.path eq "/e" and http.request.method eq "POST"` |
| Characteristics | IP |
| Period | 1 minute |
| Requests | 60 |
| Action | **Block** |
| Duration | 1 minute |

5. **Deploy** 클릭

---

## Step 5: Workers 배포

```bash
cd workers
wrangler deploy
```

배포 완료 후 확인:

```bash
# 트래킹 엔드포인트 테스트 (Origin 헤더 필수)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://t.xn--o39aom.kr/e \
  -d '{"type":"pageview","keyword":"/"}' \
  -H "Origin: https://xn--o39aom.kr"
```

`204`가 반환되면 성공입니다.

추가 확인:

```bash
# Origin 없이 보내면 403
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://t.xn--o39aom.kr/e \
  -d '{"type":"pageview","keyword":"/"}'
```

`403`이 반환되면 Origin 검증이 정상 동작합니다.

---

## Step 6: D1에 데이터 기록 확인

Step 5의 curl 테스트 후 D1에 데이터가 들어왔는지 확인합니다:

```bash
wrangler d1 execute price-kr-tracking --command "SELECT * FROM events ORDER BY id DESC LIMIT 5"
```

이벤트 row가 보이면 전체 파이프라인이 정상입니다.

> **참고:** curl 테스트의 Origin이 `https://xn--o39aom.kr`이어야 기록됩니다. 다른 Origin이면 403으로 거부됩니다.

---

## Step 7: Web 배포 (Vercel)

main 브랜치에 머지하면 Vercel이 자동 배포합니다:

```bash
# PR 생성 (아직 안 했다면)
gh pr create --title "feat: add user action tracking (D1-based)" --body "..."

# 또는 직접 머지
git checkout main
git merge feature/tracking-user-action
git push origin main
```

Vercel 배포 완료 후 확인:
1. https://가격.kr 접속
2. 브라우저 DevTools > Network 탭 열기
3. 검색 키워드를 선택하거나 페이지 이동
4. `t.xn--o39aom.kr/e`로의 POST 요청이 보이면 성공

---

## Step 8: 전체 파이프라인 검증

### 8-1. Redirect 트래킹 확인

등록된 키워드(예: `만두.가격.kr`)에 접속한 뒤:

```bash
wrangler d1 execute price-kr-tracking \
  --command "SELECT type, keyword, COUNT(*) as cnt FROM events GROUP BY type, keyword ORDER BY cnt DESC LIMIT 10"
```

`redirect` 타입 이벤트가 있으면 성공. (10% 샘플링이므로 10번 접속 시 ~1건 기록)

### 8-2. Pageview 트래킹 확인

https://가격.kr 접속 후:

```bash
wrangler d1 execute price-kr-tracking \
  --command "SELECT * FROM events WHERE type='pageview' ORDER BY id DESC LIMIT 5"
```

### 8-3. Search 트래킹 확인

검색 후 키워드 선택:

```bash
wrangler d1 execute price-kr-tracking \
  --command "SELECT * FROM events WHERE type='search' ORDER BY id DESC LIMIT 5"
```

---

## 문제 발생 시

### 트래킹이 작동하지 않는 경우

1. **Workers 로그 확인:**
   ```bash
   wrangler tail
   ```
   실시간 로그에서 에러 메시지를 확인합니다.

2. **D1 연결 확인:**
   ```bash
   wrangler d1 execute price-kr-tracking --command "SELECT COUNT(*) FROM events"
   ```

3. **WAF 규칙 확인:**
   Cloudflare Dashboard > Security > WAF에서 rate limit 규칙이 정상 요청을 차단하고 있지 않은지 확인.

### 트래킹을 긴급 비활성화해야 하는 경우

트래킹이 redirect 기능에 영향을 주지는 않지만, D1 오류 로그가 과다하거나 할 때:

**옵션 1: Workers 코드 수정 없이 WAF에서 차단**
- Cloudflare Dashboard > WAF > 새 규칙 추가
- Expression: `http.request.uri.path eq "/e"`
- Action: Block
- 이렇게 하면 `/e` 엔드포인트가 완전히 차단됩니다.

**옵션 2: Web에서 beacon 전송 중단**
- `web/lib/track.ts`의 첫 줄에 `return;` 추가 후 배포

---

## 배포 체크리스트 (최종 확인)

- [ ] D1 데이터베이스 생성 완료
- [ ] wrangler.toml에 실제 database_id 반영
- [ ] D1 마이그레이션 적용 (events 테이블 생성)
- [ ] WAF Rate Limiting 규칙 설정 (60 req/min/IP)
- [ ] Workers 배포 (`wrangler deploy`)
- [ ] curl로 204/403 응답 확인
- [ ] D1에 이벤트 데이터 기록 확인
- [ ] Web 배포 (main 머지 → Vercel 자동)
- [ ] 브라우저에서 beacon 전송 확인
- [ ] Redirect/Pageview/Search 3종 이벤트 모두 기록 확인
