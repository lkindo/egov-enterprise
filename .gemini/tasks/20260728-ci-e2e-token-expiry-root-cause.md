# CI E2E 대량 실패의 근본 원인 — 액세스 토큰 만료 (실증·수정)

- **일자**: 2026-07-28
- **등급**: L2 (백엔드 보안 설정 · CI 워크플로 · 빌드 인프라 3계층)
- **대상 CI 실행**: run `30279822185` (main, `5578180a4`)
- **오퍼레이터**: Claude Code

---

## 1. 관측된 실패

```
backend-build      success
mutation-test      success
frontend-build     success          ← 실패 아님
e2e-tests (1/3)    cancelled        75분 timeout 초과
e2e-tests (2/3)    failure          13건 실패 / 29건 통과 (1.1시간)
e2e-tests (3/3)    cancelled        75분 timeout 초과
e2e-merge-reports  failure          상류 결손으로 인한 파생 실패
```

> **주의**: 최초 보고에 `frontend-build exit 1` 이 포함돼 있었으나, 이 실행에서 해당 잡은 **success** 다.
> 로컬에서 그 잡의 전 게이트(codegen drift / ESLint / audit / vitest / build)를 재현했을 때도 전량 그린이었다.

## 2. 근본 원인

**액세스 토큰이 테스트 실행 도중 만료된다.**

| 항목 | 값 | 출처 |
|---|---|---|
| accessToken 수명 | **60분** | `JwtTokenProvider` 상수 (당시) |
| shard 2 실행 시간 | **66분** | CI 실측 |
| storageState 갱신 | **없음** (setup 1회 생성, 쿠키 `expires=-1`) | `auth.setup.ts` |
| 만료 시 미들웨어 동작 | `return null` → `/login` 리다이렉트, **재발급 시도 없음** | `middleware.ts:112,232` |

실패가 뒤로 갈수록 몰린 분포가 이 설명과 일치한다 — 04 후반부터 시작해 **05·06·07 은 전량**,
앞쪽 29건은 통과.

**증상이 원인을 가린 구조**: 실패 메시지는 `expect(locator).toBeVisible() failed / element(s) not found`
라서 셀렉터·렌더 결함으로 보인다. 그러나 `error-context.md` 의 DOM 스냅샷을 열면 렌더된 것은 대상
화면이 아니라 **로그인 폼**(`heading "전자정부 Enterprise 로그인"`)이다.

## 3. 실증 (추정 아님)

CI 와 동일 스택을 로컬에 재현 — 빈 PostgreSQL 17 + Flyway 전량 + `next build` 프로덕션 기동 +
백엔드/프론트 대칭 JWT(지문 `f8506256` 일치 확인).

| 조건 | 06 스펙 결과 |
|---|---|
| 유효 토큰 | **2 passed** (7.8초) |
| 서명 유효 + `exp` 만 1시간 전으로 조작 | **2 failed** — CI 와 동일, DOM 도 로그인 폼 |

CI 에서 실패한 스펙을 유효 토큰으로 전수 재실행한 결과:

| 스펙 | CI | 로컬 | 판정 |
|---|:--:|:--:|---|
| 05-public-experience | 5 실패 | **5 통과** (53초) | 토큰 만료 |
| 06-ops-governance | 2 실패 | **2 통과** (7.8초) | 토큰 만료 |
| 07-productivity-suite | 4 실패 | **4 통과** (16초) | 토큰 만료 |
| 04 · Audit Log Consistency | 실패 | **통과** (2.7초) | 토큰 만료 |
| 04 · Visual Regression Baseline | 실패 | skip(비-리눅스) | **별개** (§6) |

→ **13건 중 12건이 단일 원인.** 로컬에서 각 2~15초에 끝나므로 셀렉터·데이터 결함이 아니다.

## 4. 수정

| # | 파일 | 변경 |
|:--:|---|---|
| 1 | `foundation/.../JwtTokenProvider.java` | 토큰 수명 상수 → `@Value` 주입. **기본값은 종전과 동일**(1시간/7일) |
| 2 | `api-server/src/main/resources/application.yml` | `jwt.access-token-validity-ms` / `refresh-token-validity-ms` 신설 |
| 3 | `docker-compose.yml` | `JWT_ACCESS_TOKEN_VALIDITY_MS` 전달 (기본 3600000) |
| 4 | `.github/workflows/ci.yml` | **e2e 잡에서만** 6시간(21600000)으로 연장 |

운영 기본값을 바꾸지 않으므로 보안 회귀가 없다. 이것은 개별 테스트 결함을 덮는 우회가 아니다 —
**잡이 느려질수록 더 많은 테스트가 만료 구간에 들어가는 구조적 축**이라, 테스트를 하나씩 고쳐도
재발한다. 실행 시간 자체를 줄이는 과제(§7)와는 별개로 이 축을 먼저 제거한다.

### 4.1 함께 잡은 결함 2건

| # | 파일 | 내용 |
|:--:|---|---|
| 5 | `.gitattributes` + `api-server/Dockerfile` | **`gradlew` CRLF → 이미지 빌드 exit 127.** `* text=auto` 만 있고 `eol=lf` 가 없어 `core.autocrlf=true` 인 Windows 체크아웃에서 shebang 이 `#!/bin/sh\r` 가 된다. CI(ubuntu)는 LF 로 받아 드러나지 않았고, **Windows 개발자만 로컬 이미지 빌드가 불가능**했다. `gradlew`·`*.sh` 에 `eol=lf`(반대로 `*.bat` 은 `eol=crlf`) 지정 + Dockerfile 에 `sed -i 's/\r$//'` 2곳. ⚠ `COPY . .` 가 gradlew 를 다시 덮어쓰므로 **복사 직후에도** 넣어야 실효가 있다(그 자리가 없으면 앞의 방어는 vacuous). |
| 6 | `frontend/next.config.ts` | **`/ws/:path*` 백엔드 주소 하드코딩.** 옆의 두 rewrite 는 `BACKEND_API_URL`/`NEXT_PUBLIC_API_URL` 을 따르는데 ws 만 예외라, 백엔드를 다른 포트에 띄우면 WebSocket 만 엉뚱한 서비스로 프록시된다(실측: 8080 을 점유한 무관한 앱의 index.html 이 돌아와 콘솔 가드가 131건 검출). 동일 규칙으로 유도하도록 교체. |

## 5. 검증 증적

```
./gradlew compileJava compileTestJava   → BUILD SUCCESSFUL in 1m 40s      (§0.6 HARD)
npx tsc --noEmit                        → EXIT=0                          (§0.6 HARD)
docker compose build api                → egov-enterprise-api Built       (CRLF 수정 전에는 exit 127)
```

**설정 실효 양방향 확인** (§0.7-H5 — "설정을 추가했다"로 동작을 주장하지 않는다):

| 주입값 | 실제 토큰 수명 | 판정 |
|---|:--:|---|
| `JWT_ACCESS_TOKEN_VALIDITY_MS=120000` | **2분** | 반영됨 |
| 미설정 | **60분** | 기본값 유지 = 운영 동작 불변 |

## 6. 보류 (로컬에서 해결 불가)

**`Visual Regression Baseline`** — 커밋된 기준선이 `dashboard-baseline-*-win32.png` 뿐이라
CI(리눅스)가 찾는 `-linux.png` 가 없다. 스펙 주석이 이 상황을 이미 예견하고 있으며, 해결은
**CI(리눅스)에서** `pnpm exec playwright test -g "Visual Regression Baseline" --update-snapshots`
로 생성해 커밋하는 것뿐이다. Windows 로컬에서 만들면 `-win32.png` 가 하나 더 생길 뿐이므로
착수하지 않았다.

## 7. 남은 과제

1. ~~**E2E 실행 시간 단축**~~ → **§8 에서 부분 처리**(단언 타임아웃 · 스텝 분리). `workers:1`
   병렬화와 샤드 수 증설은 다음 CI 실행의 실측을 보고 판단한다.
2. **cancelled 잡의 아티팩트 결손** — `Upload Playwright Report` 에 `if: always()` 가 있음에도
   timeout 강제 종료 시 업로드까지 잘려, shard 1/3 의 리포트가 없다(shard 2 것만 남았다).
   진단이 가장 필요한 경우에 진단 자산이 사라지는 구조다(§0.7-H5 계열).
3. **로컬 개발 환경의 JWT 비대칭 함정** — 루트 `.env` 의 `JWT_SECRET` 은 docker compose 가
   자동 주입하지만 `next start` 는 읽지 않는다. 양쪽을 맞추지 않으면 "로그인은 200 인데 페이지
   진입에서 /login" 무음 루프가 된다(이번 재현에서 실제로 겪었고 지문 대조로 판정했다).

---

## 8. 후속 조치 — 실행 시간 구조 (2026-07-28 2차)

### 8.1 실측 분해 (run 30279822185, 스텝별 소요)

```
Build API image          1m50s
Start Docker (DB & API)  0m16s
Wait for API healthy     0m26s
Node/pnpm/Playwright     0m39s
──────────────────────────────
셋업 합계                 약 3분
Run E2E Tests (Sharded)  71m56s   ← 잡 전체의 96%
```

**인프라는 병목이 아니다.** 시간을 먹는 것은 실패한 테스트의 대기다:

```
expect.timeout 60s × 재시도 2회 = 단언 1개당 120초
test timeout 180s × 2 = 테스트 1건 상한 6분
workers:1 · fullyParallel:false → 이 대기가 하나도 겹치지 않고 벽시계에 직렬 누적
shard 2 실패 13건 × 2~6분 = 26~78분   (실측 67분이 이 범위 안)
```

성공 경로는 빠르다 — 로컬 실측 06 1.5~4.0s, 07 2.0~2.8s, 05 1.6~16.7s.

**되먹임 구조**: 토큰 만료 → 실패 급증 → 실패 1건당 최대 6분 → 잡이 길어짐 → 더 많은 테스트가
만료 구간 진입 → 실패 급증 ⟲. **시간 초과와 토큰 만료는 별개 문제가 아니라 한 고리였다.**
§4 의 토큰 수정이 실패 12건을 없애면 12 × 약 4분 ≈ **48분**이 함께 사라진다(산술 추정, 확정은
다음 CI 실행).

### 8.2 적용

| # | 파일 | 변경 |
|:--:|---|---|
| 7 | `frontend/playwright.config.ts` | `expect.timeout` **60s → 20s**. 요소가 **없는** 실패에서 60초를 기다려도 결과가 바뀌지 않는다(순수 낭비). 실패 비용을 1/3로 줄인다 |
| 8 | `.github/workflows/ci.yml` | `Run E2E Tests` 한 덩어리 → **3스텝 분리**(`Build frontend` / `Start frontend and wait` / `Run E2E Tests`) + 애노테이션 판정에 `fe-build`·`fe-start` 추가 |

스텝 분리 이유: 종전에는 빌드·기동·테스트가 한 run 블록이라 **70분 중 빌드가 몇 분인지조차
알 수 없었고**(이번 진단에서 실제로 막혔다), 실패가 빌드인지 기동인지 테스트인지도 outcome
하나로 뭉개졌다. ⚠ 분리 시 각 스텝이 별도 셸이므로 프론트 서버는 `nohup` 으로 세션에서 떼어낸다.

### 8.3 검증

```
ci.yml YAML 파싱          → 성공, e2e-tests 스텝 18개 순서 정상
npx tsc --noEmit          → EXIT=0
expect.timeout=20s 로 04·05·06·07 전량 재실행 → 19 passed / 1 skipped (1.7분)
```

값만 낮추고 통과를 확인하지 않으면 게이트 약화와 구분되지 않으므로, 하향 후 대상 스펙을
실제로 재실행해 그린을 확인했다. 최장 테스트가 16.7초이고 그 안에 여러 단언·액션이 들어 있으므로
단일 단언의 여유는 충분하다. ⚠ CI 에서 특정 단언이 20초를 넘겨 회귀하면 **전역값을 되돌리지 말고
그 단언에만** `{ timeout: N }` 을 주고 이유를 남길 것.

## 9. 재현 절차 (다른 프로젝트 컨테이너를 건드리지 않는 격리 방식)

이 머신은 8080/5432/3000 을 다른 프로젝트가 점유하고 있어, 별도 프로젝트명과 포트로 격리했다.
오버라이드 파일은 저장소에 커밋하지 않는다(세션 스크래치패드에 보관).

```yaml
# compose.local-e2e.yml
services:
  db:
    container_name: egov-e2e-postgres
    ports: !override ["15432:5432"]   # ports 는 기본 병합이 합집합이라 !override 필수
  api:
    image: egov-enterprise-api
    container_name: egov-e2e-api
    ports: !override ["18080:8080"]
```

```bash
docker compose -p egov-e2e -f docker-compose.yml -f compose.local-e2e.yml up -d db api
# 프론트: BACKEND_API_URL/NEXT_PUBLIC_API_URL 을 18080 으로, JWT_SECRET 을 .env 와 동일하게
pnpm run build && pnpm run start:3001
npx playwright test --project=full-suite e2e/06-ops-governance.spec.ts
```

⚠ 기존 `egov-postgres` 볼륨에는 옛 1.x 마이그레이션 이력이 남아 있어 현재 코드로 기동하면
Flyway validation 이 실패한다(`Detected applied migration not resolved locally: 1.4`).
CI 는 매 회차 빈 볼륨이므로 재현 조건이 아니다 — 별도 프로젝트명으로 새 볼륨을 받아야 한다.

---
*Last Updated: 2026-07-28*
