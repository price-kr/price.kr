# Operations Guide

가격.kr 서비스 운영 가이드. URL 장애 대응, KV 동기화, 모니터링 절차를 다룹니다.

---

## 아키텍처 개요

```
사용자 → 키워드.가격.kr → Cloudflare Workers → KV 조회 → 302 Redirect → 외부 사이트
                                      ↓ (KV 실패 시)
                              GitHub Raw Content fallback
```

- **KV**: Cloudflare Workers KV에 `keyword → url` 매핑 저장
- **동기화**: `data/` 디렉토리의 JSON 파일 → GitHub Actions(`sync-kv.yml`) → KV bulk write
- **Fallback**: KV 실패 시 GitHub Raw Content에서 JSON 파일 직접 fetch

---

## 외부 도메인 의존성

현재 약 1000개 키워드가 **78개 외부 도메인**에 의존합니다.

### 집중 리스크 (다수 키워드 의존)

| 도메인 | 키워드 수 | 비고 |
|--------|----------|------|
| search.danawa.com | 19 | 가전/전자 가격비교. dsearch.php 경로 변경 시 19개 키워드 영향 |
| search.shopping.naver.com | 13 | 식품류 fallback. 안정적 |
| www.musinsa.com | 11 | 패션 가격비교 |
| land.naver.com | 9 | 지역 부동산 시세 |
| www.hwahae.co.kr | 8 | 뷰티 가격비교 |

### 안정성 낮은 도메인 (스타트업/소규모)

| 도메인 | 키워드 | 리스크 |
|--------|--------|--------|
| hogangnono.com | 부동산 | 부동산 스타트업, 서비스 종료 가능 |
| www.da-gym.co.kr | 헬스 | 소규모 헬스장 가격비교 서비스 |
| www.siksinhot.com | 맛집 | 맛집 스타트업, 경쟁 치열 |
| statiz.co.kr | 야구 | 야구 통계 커뮤니티 사이트 |
| www.teescanner.com | 골프 | 골프 예약 니치 서비스 |

### 레거시 URL 경로 (변경 취약)

| 키워드 | URL 경로 | 위험 요소 |
|--------|---------|-----------|
| 택배 | `/iservice/usr/charge/EpoPstDmstcChargeList.jsp` | JSP 경로, 우체국 사이트 리뉴얼 시 변경 가능 |
| 커피 | `/menu/drink_list.do` | Spring MVC .do 경로, 스타벅스 리뉴얼 시 변경 |
| 치킨 | `/menu/chicken.asp` | Classic ASP 경로 |
| 공무원 | `/mpm/info/resultPay/bizSalary/` | 정부 사이트 구조 변경 시 영향 |

---

## URL 장애 대응

### 증상

사용자가 `키워드.가격.kr`에 접속했는데 목적지가 404이거나 빈 페이지일 때.

### 대응 절차

1. **문제 확인**: 해당 키워드의 JSON 파일에서 URL 확인
   ```bash
   # 예: 치킨 키워드 확인
   cat data/ㅊ/치/치킨.json
   ```

2. **새 URL 결정**: 해당 사이트의 변경된 URL을 찾거나, 대안 사이트 선정

3. **스크립트 수정**: `scripts/generate-top1000-tsv.ts`에서 해당 키워드 URL 변경

4. **재생성 및 커밋**:
   ```bash
   cd scripts
   npx tsx generate-top1000-tsv.ts > top1000-keywords.tsv
   npx tsx seed-data.ts top1000-keywords.tsv ../data
   cd ..
   git add scripts/generate-top1000-tsv.ts scripts/top1000-keywords.tsv data/
   git commit -m "fix: update broken URL for 키워드"
   git push
   ```

5. **KV 동기화**: push 후 `sync-kv.yml`이 자동 실행됨
   - Incremental sync: 변경된 키워드만 업데이트 (~1분)
   - 급한 경우: GitHub Actions에서 `sync-kv.yml` → `workflow_dispatch` → full-sync 수동 트리거

6. **전파 시간**: 커밋 → CI → KV 반영까지 약 **2-5분**

### 긴급 대응 (CLI 직접 수정)

CI를 거치지 않고 즉시 KV를 수정해야 할 때:

```bash
# 단일 키워드 KV 직접 업데이트
wrangler kv key put --namespace-id=<KV_ID> "치킨" "https://new-url.com/"
```

---

## KV 동기화

### 자동 동기화 (push 시)

`main` 브랜치에 push되면 `.github/workflows/sync-kv.yml`이 실행:
- **Incremental**: 변경된 파일만 `wrangler kv key put` 개별 실행
- **Delete**: 삭제된 키워드는 KV에서도 제거

### 수동 Full Sync

GitHub Actions → `sync-kv.yml` → "Run workflow" 버튼:
- `wrangler kv bulk put`으로 전체 키워드 일괄 동기화
- 100개 키워드 기준 ~30초

### 주의사항

- Cloudflare KV free tier: **1,000 writes/day**
- Incremental sync 100개 = 100 writes (한도의 10%)
- 대량 변경 시 반드시 full-sync 사용 (1 bulk write)

---

## 정기 점검 항목

### 월간 (권장)

- [ ] 레거시 URL 경로 4개 접속 확인 (택배, 커피, 치킨, 공무원)
- [ ] 스타트업 도메인 5개 접속 확인 (호갱노노, 다짐, 식신, 스탯티즈, 티스캐너)

### 분기별

- [ ] 전체 약 1000개 키워드 URL 접속 테스트
- [ ] whitelist.json 도메인 유효성 확인
- [ ] 다나와 `dsearch.php` 검색 경로 정상 작동 확인

### 연간

- [ ] 공무원 봉급표 URL 경로 확인 (정부 사이트 연도별 구조 변경 가능)
- [ ] 전체 URL 매핑의 적절성 재검토

---

## 트러블슈팅

### "키워드를 찾을 수 없습니다" (웹앱으로 리다이렉트)

1. KV에 키워드가 없음 → `sync-kv.yml` 실행 확인
2. `data/` 디렉토리에 JSON 파일 존재 확인
3. JSON 파일의 `keyword` 필드가 정확한지 확인 (대소문자 주의)

### KV sync 실패

1. GitHub Secrets에 `CLOUDFLARE_API_TOKEN`, `CF_KV_NAMESPACE_ID` 설정 확인
2. API 토큰 만료 여부 확인
3. KV 일일 쓰기 한도 초과 여부 확인

### Fallback도 실패

1. GitHub Raw Content 접근 가능 여부 확인
2. `GITHUB_TOKEN` Workers secret 설정 확인 (rate limit: 60 → 5000 req/hr)
3. 파일 경로가 choseong 규칙과 일치하는지 확인
