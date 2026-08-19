# 성능 최적화 운영 가이드

성능 최적화는 “좋아 보이는 기법 적용”이 아니라 **사용자 증상 → 기준선 → 병목 증거 → 최소 변경 → 동일 조건
재측정** 순서로 수행한다. 과거의 단발 측정값이나 코드 주석의 예상 효과를 현재 성능 사실로 사용하지 않는다.

## 측정 도구 지도

| 층 | 정본·도구 | 무엇을 확인하는가 |
|---|---|---|
| 브라우저 runtime | [`lighthouse.yml`](../../.github/workflows/lighthouse.yml), [`frontend/lighthouserc.json`](../../frontend/lighthouserc.json) | production build의 `/login` 성능·접근성 관측 |
| 프론트 bundle | `pnpm -C frontend run analyze`, `bundle:check` | route chunk·dependency·예산 drift |
| API 부하 | [k6 가이드](load-test-guide.md) | 혼합 workload의 latency·error·JVM/DB 상관 |
| JVM·HTTP | Actuator metrics/prometheus | request latency, heap/GC, thread, Hikari 상태 |
| Hibernate | `dev,dev-performance` profile | SQL 호출·binding·session 통계 |
| PostgreSQL | [DB 최적화 가이드](database-optimization-guide.md) | query plan, lock, I/O, table/index 통계 |

각 도구가 보지 못하는 층을 명시한다. k6는 브라우저 렌더링을, Lighthouse는 인증된 업무 흐름과 DB 용량을,
bundle analyzer는 runtime latency를 증명하지 않는다.

## 1. 성능 문제 정의

다음 형식으로 목표를 고정한다.

```text
사용자 흐름:
측정 환경·SHA·데이터량:
현재 p50/p95/p99·오류율·처리량:
목표 SLO 또는 이전 기준선:
의심 병목과 반증 가능한 관측:
변경하지 않을 범위:
```

환경과 입력이 다른 두 숫자를 비교하지 않는다. “빨라졌다”는 주장은 같은 조건의 반복 측정과 raw artifact가 있어야 한다.

## 2. 병목 분리

### 프론트엔드

```bash
pnpm -C frontend run bundle:check
pnpm -C frontend run analyze
pnpm -C frontend run build
pnpm -C frontend run lighthouse
```

- LCP element와 blocking resource를 먼저 찾는다.
- 큰 client component는 bundle 크기뿐 아니라 hydration·interaction 비용으로 분리한다.
- dynamic import는 초기 경로에서 필요 없는 무거운 모듈에만 적용한다. 핵심 above-the-fold UI를 무조건 지연시키지 않는다.
- `next/image`, `next/font`, package import 최적화는 현재 [`next.config.ts`](../../frontend/next.config.ts)와 실제
  build artifact로 검증한다.

Lighthouse workflow의 performance threshold는 runner 변동 때문에 관측 경고이고 accessibility만 hard assertion이다.
주간 green을 사용자 환경 RUM으로 해석하지 않는다.

### API·서비스

- endpoint별 query count, 외부 호출, serialization, cache hit/miss, executor queue를 나눠 측정한다.
- N+1은 “연관관계가 있다”가 아니라 같은 요청에서 반복 SQL이 실제 발생하는지로 판정한다.
- fetch join·projection·batch fetch 중 하나를 workload cardinality에 맞게 선택한다.
- cache는 권한·tenant·사용자별 key 의미와 write invalidation을 검증한다. 잘못된 공유 cache는 빠른 정보 노출이다.

현재 메뉴·사용자·공통코드 등에 cache와 단일 조회 경로가 있지만, 존재만으로 효과를 단정하지 않는다.
구현 정본은 [`MenuService`](../../business-core/src/main/java/nuri/business/service/menu/MenuService.java),
[`UserService`](../../business-core/src/main/java/nuri/business/service/user/UserService.java)와 관련 harness다.

### DB·connection

[`application.yml`](../../api-server/src/main/resources/application.yml)의 Hikari·Hibernate 설정이 실제 binding되는지 확인하고,
[DB 최적화 가이드](database-optimization-guide.md)에 따라 plan·lock·pool pending을 대조한다. pool 확대, index 추가,
batch size 변경을 동시에 하지 않는다.

## 3. 변경 단위

한 번에 하나의 병목 가설만 검증한다.

| 가설 | 최소 변경 예 | 함께 확인할 회귀 |
|---|---|---|
| 반복 query가 지배 | projection/fetch/batch 중 한 가지 | row 폭증, pagination, memory |
| 비싼 순수 조회 반복 | 범위가 명확한 cache | stale data, 권한 key, invalidation |
| 초기 JS 과다 | route split 또는 dependency 제거 | loading UX, hydration, SEO |
| pool 대기 | transaction·query 단축 후 제한 조정 | DB 총 connection, timeout, 503 |
| index 부재 | 근거 있는 단일 migration | write 비용, lock, 중복 index |

소스에 특정 “95% 개선”, “200–800ms 단축”을 고정하지 않는다. 그런 값은 재현 가능한 benchmark artifact에만 둔다.

## 4. 검증 매트릭스

| 변경 | 최소 검증 |
|---|---|
| 프론트 bundle·render | type-check, 관련 test, production build, bundle budget; 필요 시 Lighthouse |
| cache·query | 관련 unit/integration test, query count 또는 metric 전후 비교, backend compile |
| pool·Hibernate | 설정 binding test, representative load, timeout/error/JVM·DB metric |
| index·SQL | live schema 확인, before/after plan, Flyway 검증, rollback |
| SLO·threshold | 같은 환경 반복 실행, artifact 보존, false-red/false-green 검토 |

AGENTS의 [변경 범위별 검증](../../AGENTS.md#verification-by-change-scope)이 항상 하한이다. 부하·Lighthouse·DB
실측을 하지 않았으면 compile/test 성공과 구분해 보고한다.

## 5. 결과 기록

장기 가치가 있는 성능 결정은 ADR 또는 코드 근거에 남긴다. 단발 benchmark는 다음 metadata와 함께 CI artifact나
승인된 운영 저장소에 둔다.

- commit SHA, profile, host·container 자원
- 데이터 snapshot과 warm-up·측정 회차
- 명령·시나리오·threshold
- raw report 위치
- 변경 전·후와 confidence/noise
- 부작용·rollback 여부

완료 과정 로그를 이 가이드에 누적하지 않는다.
