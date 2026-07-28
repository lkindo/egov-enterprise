# CI E2E 대량 실패 — 진단 정정: 프로젝트 중복 실행 (토큰 만료 가설 기각)

- **일자**: 2026-07-28
- **등급**: L2 (백엔드 보안 설정 · CI 워크플로 · 빌드 인프라 3계층)
- **대상 CI 실행**: run `30279822185` (main, `5578180a4`) → 검증 `30321966178` (feature 브랜치)
- **오퍼레이터**: Claude Code

---

## ⚠ 진단 정정 (2026-07-28 2차) — 아래 §2 의 결론은 **틀렸다**

**진짜 원인은 `playwright.config` 의 project 중복 실행이다.** §2~§5 의 토큰 만료 분석은
기각한다. 기록은 **지우지 않고 남긴다** — 무엇을 어떻게 잘못 판단했는지가 다음 진단에 필요하다.

```
full-suite 의 testMatch: /.*\.spec\.ts/   → 모든 스펙을 재매칭
실측: Total 226 tests = full-suite 112 + tier-* 112 + setup 2   ← 정확히 2배
```

`ci.yml` 이 `--project` 를 지정하지 않아 CI 만 226건을 돌렸다. config 상 full-suite 가 마지막이라
항상 나중에 도는데, 앞서 tier-* 가 사용자 CRUD(02)·로그인 정책(06) 등으로 상태를 바꿔 놓은 뒤라
**UI 로그인 자체가 실패**한다. CI 리포트 실측:

```
expect(page).toHaveURL(/\/admin/) failed
  60 × unexpected value "http://localhost:3001/login?redirect=%2Fadmin%2Fwork-hub"
```

실패 29건이 **전부 `[full-suite]`** 였고 `tier-*` 는 통과했다는 사실이 이를 뒷받침한다.

| 조건 | 결과 |
|---|---|
| CI (project 미지정, 226건) | 29 failed · 29 passed · **56.8분** |
| 로컬 (`--project=full-suite`, 112건) | 8 failed · 104 passed · **7.0분** |

남은 8건도 6건은 로컬 포트 우회 탓(`localhost:8080` 하드코딩 스펙), 1건은 SMTP 부재,
1건(`10-operational-extension`)만 실 조사 대상이다.

**수정**: `ci.yml` 의 e2e 실행에 `--project=full-suite` 를 지정한다.

### 내가 어디서 틀렸는가 (재발 방지)

1. **충분조건을 필요조건으로 착각했다.** 만료 토큰을 주입해 같은 증상을 만든 것은 "만료되면
   이렇게 된다"를 보인 것이지 "CI 에서 만료가 일어났다"를 증명한 게 아니다.
2. **상관을 인과로 읽었다.** "shard 2 가 66분 · 토큰 60분 · 실패가 뒤에 몰림"이 맞아떨어져 보였으나,
   실제 실패 목록은 **01 첫 테스트부터** 시작했다. 애노테이션이 2000자로 잘려 뒷부분만 보인 것을
   "뒤에 몰렸다"로 오독했다.
3. **CI 와 다른 조건을 재현하며 검증했다.** 로컬에서는 `--project=full-suite` 를 붙여 돌렸는데
   CI 는 그것이 없다. 재현 조건이 다르면 통과는 아무것도 증명하지 못한다.
4. **잘린 로그를 전체로 간주했다.** 13건으로 세었으나 실제는 29건이었다. 잘림 가능성을 확인하지
   않은 채 수를 확정한 것이 분포 오독으로 이어졌다.

> 토큰 수명 설정(§4)은 **되돌리지 않는다.** 원인은 아니었지만 운영 기본값이 불변이고,
> shard 가 실제로 70분 넘게 도는 이상 "1시간 넘는 실행에서 토큰이 만료될 수 있다"는 구조는
> 실재한다. 다만 그것이 이번 실패의 원인이 아니었음을 여기 명시한다.

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

## 9. 조사 종합 — 기각된 가설 9건과 확정 사실 (2026-07-28 마감)

CI e2e 실패를 하루에 걸쳐 추적했다. **원인은 끝내 확정하지 못했다.** 다음 세션이 같은 길을
다시 걷지 않도록, 무엇을 어떤 근거로 배제했는지와 어디서 막혔는지를 남긴다.

### 9.1 기각된 가설 (전부 실측 근거)

| # | 가설 | 기각 근거 |
|:--:|---|---|
| 1 | 액세스 토큰이 실행 중 만료 | 수명을 6시간으로 늘려도 실패 동일. 실패는 **01 첫 테스트부터** 시작했다(뒤에 몰린 게 아님 — 애노테이션 2000자 절단을 전체로 오독) |
| 2 | project 중복 실행이 실패 원인 | 중복 제거로 **시간은 71분→20.5분** 해결됐으나 실패는 잔존 |
| 3 | 샤딩이 테스트 간 데이터 의존성 절단 | 로컬 `--project=full-suite --shard=1/3` 이 빈 DB 에서 **3.7분 39건 전량 통과** |
| 4 | JWT 시크릿 비대칭 | CI 진단 실측: 프론트 `2e51fc3e` = 백엔드 `2e51fc3e` |
| 5 | 로그인 API·계정·시드 결함 | CI 진단 실측: 백엔드 직접 로그인 **HTTP 200**, Next 프록시 경유 **HTTP 200** + `{"role":"ROLE_ADMIN"}` |
| 6 | 인증 전반 | api 컨테이너 로그: `Successfully authenticated user: USRCNFRM_00000000001, [ROLE_ADMIN]` — 테스트 중에도 API 인증은 정상 |
| 7 | `Secure` 쿠키가 http 에서 저장 실패 | 로컬도 동일하게 `Secure; HttpOnly; SameSite=strict` 를 심는데 통과. Chromium 은 localhost 를 예외 취급 |
| 8 | `SameSite=strict` 차단 | 3001↔8080 은 same-site(포트 무관) |
| 9 | 빌드 캐시가 DEV 시크릿을 굳힘 (1차 판단: 성립) | 로컬 실증으로 **인라인 자체는 확인**됐다 — `.next/cache` 만 남기고 새 시크릿으로 재빌드하면 번들에 옛 DEV 시크릿이 그대로 남는다 |
| 10 | 위 캐시가 **CI 실패의 원인** | **기각.** `update-visual-baseline.yml` 에는 캐시 복원 스텝이 **아예 없는데도** 생성된 기준선이 로그인 폼이었다. 캐시 없이 깨끗이 빌드해도 인증이 깨진다 |
| 11 | 시크릿 길이 차이로 alg 가 갈려 HS512 경로가 깨짐 | **기각.** CI 와 동일한 `openssl rand -hex 44`(88바이트 → HS512)로 로컬 스택을 재기동·재빌드해 06 스펙 **4 passed (10.4초)**. 그간 로컬은 60바이트/HS384 만 검증했었기에 확인했으나 무관했다 |

> ⚠ 가설 9는 **현상 자체는 참**이다(캐시가 시크릿을 굳힌다). 다만 그것이 CI 실패의 원인은 아니었다.
> 캐시 제거 커밋(`b7fc2506a`)은 그대로 두는 편이 낫다 — 잡 간 시크릿 오염 가능성은 실재하므로.

### 9.2 확정된 사실

**미들웨어만 토큰을 거부한다.** 실패 스크린샷이 결정적이다 — 헤더의 "최고관리자 / 관리자"와
좌측 메뉴가 정상 렌더되는데(서버 컴포넌트는 인증 인식) 본문만 로그인 폼이다.

```
non-admin 이 /admin/* 접근 → 기대 auth_error=unauthorized / 실제 /login?redirect=...
```

권한 부족이 아니라 **미인증**으로 처리된다. 즉 `request.cookies.get('accessToken')` 또는
그 뒤의 `verifyAndExtractRole` 이 CI 에서만 실패한다.

로컬은 **완전히 같은 명령·같은 샤드·빈 DB·프로덕션 빌드**로 3.7분에 전량 통과한다.
환경 차이를 아홉 번 좁혔으나 남은 것을 특정하지 못했다.

### 9.3 다음 세션이 할 일 (한 걸음이면 확정 가능)

**미들웨어가 실제로 쓰는 시크릿 지문을 CI 에서 볼 수 없다는 것**이 아홉 번 막힌 유일한 이유다.
`middleware.ts` 의 `warnSignatureMismatchOnce()` 가 `if (!IS_DEV) return` 이라
**프로덕션에서 침묵**한다 — 정확히 이 문제가 나는 환경에서 진단이 꺼져 있다.

```ts
// frontend/src/middleware.ts
if (!IS_DEV || fingerprintLogged) return;   // ← E2E_DIAG 등 환경변수로도 열리게 바꾼다
```

이 조건을 열면 CI `next-start.log` 에 미들웨어의 지문이 찍히고, 이미 확보된 백엔드 지문과
대조해 **한 회차(약 25분)에 확정**된다. 프로덕션에서 서명 검증이 깨져도 신호가 없는 현재 구조는
그 자체로 관측 결함이므로(§0.7-H5), 고칠 가치가 별도로 있다.

그 외 후보:
- `trace.zip` 의 네트워크 이벤트 판독(이번엔 형식을 못 찾아 실패)
- 러너 리소스(2코어 7GB)에서의 브라우저 거동 — 로컬 대비 유일하게 남은 물리적 차이

### 9.3.1 비주얼 기준선 워크플로가 뜻밖의 진단 도구가 됐다 (2026-07-28)

`update-visual-baseline.yml` 을 `commit=false` 로 돌린 결과, 생성된 기준선이 **로그인 폼**이었다.
이 워크플로에는 **캐시 복원 스텝이 없고 E2E 스위트도 돌지 않는다** — 즉 가장 단순한 경로
(compose 기동 → 프론트 프로덕션 빌드 → `/admin` 진입)만으로도 CI 에서는 인증이 깨진다.

**이것이 지금까지 확보한 가장 깨끗한 재현 조건이다.** 다음 조사는 E2E 전체가 아니라 이
워크플로 하나로 회차를 돌리면 된다(약 15분, 스위트 실행 없음). 기준선 생성이 목적이 아니라
**최소 재현기**로 쓰는 것이다.

⚠ 그 기준선은 **커밋하지 않았다.** 로그인 폼을 정답으로 굳히면 인증이 고쳐진 뒤 오히려 red 가
된다. `commit=false` 로 돌린 판단이 실제로 사고를 막았다.

### 9.4 이번 조사에서 실제로 고친 것

| 커밋 | 내용 | 효과 |
|---|---|---|
| `242221a61` | `gradlew` CRLF (`.gitattributes` + Dockerfile 2중) | Windows 로컬 이미지 빌드 복구(exit 127 → Built) |
| `d6beb3902` | `/ws` 프록시 하드코딩 → 환경변수 유도 | 백엔드 포트 변경 시 WebSocket 오배송 제거 |
| `570882632` | 토큰 수명 설정화 + expect 20s + 스텝 분리 | 운영 기본값 불변. 관측성 확보 |
| `aaabc440a` | JWT `@Value` 회귀(초기화값 누락) | 위반 주입으로 16/16 red 확인 후 수정 |
| `3633fecf1` | 비주얼 기준선 갱신 워크플로 | ⚠ main 에 있어야 등록됨(workflow_dispatch 제약) |
| `fee2461fe` | `--project=full-suite` | **71분 cancelled → 20.5분 완주** |
| `63e185e52`·`ed63a5347` | 인증 진단 스텝(E2E 앞) | 가설 4·5·6 을 한 회차에 기각시킨 도구 |

### 9.5 방법론 반성

1. **충분조건을 필요조건으로 착각**(가설 1) — 만료 토큰으로 같은 증상을 만든 것은 "그렇게 되면
   이런다"이지 "실제로 그랬다"가 아니다.
2. **CI 와 다른 조건으로 검증**(가설 3) — 로컬에서 `--project=full-suite` 를 붙여 돌렸는데
   CI 는 그것이 없었다. 조건이 다르면 통과는 아무것도 증명하지 못한다.
3. **잘린 로그를 전체로 간주** — 13건으로 세었으나 실제 29건이었고, 이 오독이 "실패가 뒤에
   몰렸다"는 분포 판단으로 이어져 가설 1을 낳았다.
4. **관측 수단을 먼저 만들었어야 했다** — 진단 스텝 하나가 가설 4·5·6 을 한 번에 기각시켰다.
   조사 초반에 넣었다면 하루가 아니라 한두 회차로 끝났을 것이다.

---

## 10. 재현 절차 (다른 프로젝트 컨테이너를 건드리지 않는 격리 방식)

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

## 11. 3차 조사 — 미들웨어 거부 확정, 그리고 조사를 막은 것은 **진단 자체**였다 (2026-07-28)

**대상**: run `30343414155` (main, `96c088c69`). shard1 = **28 failed / 12 passed** (36.3분).
세 샤드 모두 failure — cancelled 는 사라졌으므로 §8 의 시간 축은 실제로 해결됐다.

### 11.1 관측 수단 확보

`gh` 를 설치·인증(스코프 `repo`·`workflow`·`read:org`)하니 **잡 로그 전문과 아티팩트를 직접 받을 수 있다.**
종전 기록의 "CI 로그는 admin 권한 필요(403)" 는 해소됐다. 이번 진단은 전부 이 경로로 얻었다:

```
gh run view --job <id> --log            # 751KB, 잘리지 않은 원문(애노테이션 2000자 제한 무관)
gh run download <run> -n playwright-report-shard-0   # trace.zip 포함
```

### 11.2 확정 — 미들웨어만 토큰을 거부한다 (§9.2 원래 결론이 옳았다)

실패 2번(`Widgets and Charts Rendering`, storageState admin)의 **트레이스 네트워크**가 결정적이다:

```
GET /admin                    → 307   [쿠키 동봉]   ← 미들웨어 거부
GET /login?redirect=%2Fadmin  → 200
GET /api/v1/auth/me           → 200   [같은 쿠키]   ← 백엔드는 수락
GET /help                     → 307   (admin 경로조차 아님)
```

`/login?redirect=<pathname>` 형태(`expired` 없음)는 `middleware.ts` 의 리다이렉트와 정확히 일치하고,
서버 컴포넌트의 `redirect()` 들은 전부 `?expired=true` 를 붙이므로 출처는 미들웨어로 확정된다.

### 11.3 ⚠ 이번 세션에서 내가 한 오판 (정정)

01 스펙의 `Global Layout & Navigation`(`aside`·`nav a[href*="/admin/"]`)과 `Logout`, `A11y Admin
Dashboard` 3건이 **passed** 인 것을 보고 "관리자 셸이 인증 상태로 렌더됐다 = 인증 정상" 이라고 판단했다.
**틀렸다.** 루트 `app/layout.tsx:44-46` 이 `cookies()` 로 accessToken 을 읽어 **서명 검증 없이**
GNB·사이드바 메뉴를 렌더한다. 그래서 미들웨어가 거부해 `/login` 으로 튕겨도 로그인 폼이
**인증된 셸에 감싸여** 나오고, 셸 요소를 겨눈 단언은 통과한다.

> **교훈**: 셸(헤더·사이드바·계정메뉴)의 존재로 인증을 단언하지 마라. 그것은 쿠키의 *존재*만
> 반영하며 *유효성*은 반영하지 않는다. 본문 고유 요소로 단언해야 한다.

### 11.4 로컬 실측으로 좁힌 것 (전부 실험 — 추정 아님)

| 검증 | 결과 | 함의 |
|---|---|---|
| CI 토큰 서명 vs CI `JWT_SECRET`(지문 01372418) | **일치** | 백엔드 정상 |
| **CI 실제 토큰 + CI 실제 시크릿 → 로컬 미들웨어** | **200 (3/3)** | 코드·알고리즘·토큰 모두 정상 |
| 빌드=A(a×88) / 실행=B(b×88) 로 기동 | **B 서명만 200** | 미들웨어는 **런타임 env** 사용. 빌드 시 인라인 아님 |
| `.next` 전체에서 빌드 시크릿 문자열 검색 | **없음** | 위 결론 교차확인 |
| `JWT_SECRET` 없이 기동 | **500** + 에러 로그 | fail-fast 정상 작동 |

CI 는 500 이 아니라 307 이었다 → **미들웨어는 truthy 하지만 다른 값을 쥐고 있었다.**

**추가 기각**: 로그아웃 토큰 무효화(`AuthServiceImpl.logout` 은 refresh 만 삭제) · accessToken 중복
쿠키(백엔드는 `refreshToken` 만 설정) · Origin 검증 차단(`localhost` 허용) · 쿠키 절단(발급·전송
220자 동일, 서명 86자) · 만료(exp−iat=21600).

### 11.5 🚨 아홉 번을 막은 진짜 원인 — 진단 스텝 2종이 거짓 신호였다

| # | 진단 | 실태 |
|:--:|---|---|
| 1 | 번들 DEV 시크릿 `grep` | **항상 위양성.** `DEV_JWT_SECRET` 은 소스 리터럴이라 올바른 시크릿으로 빌드해도 `.next/server/edge/chunks/*.js` 에 남는다(로컬 실증). `::error 빌드가 옛 시크릿을 굳혔다` 가 **매 회차 무조건** 떴고, 이것이 §9.1 가설 9(빌드 캐시)를 낳았다 |
| 2 | JWT 지문 대조 | **재는 대상이 틀렸다.** `sha256($JWT_SECRET)` 은 **셸 변수**이지 미들웨어가 쓰는 값이 아니다. "대칭 — 원인 아님" 이 반복됐지만 미들웨어 쪽은 **한 번도 관측된 적이 없다** |

> §0.7-H5 의 사례가 하나 더 늘었다. 게이트·진단을 신설하면 **위반을 주입해 red 가 되는지**까지
> 확인해야 한다. 1번은 "정상일 때 green 이 되는지" 를 확인하지 않았고(항상 red), 2번은
> "무엇을 재는지" 를 확인하지 않았다(항상 green).

### 11.6 적용한 수정

| # | 파일 | 변경 |
|:--:|---|---|
| 1 | `frontend/src/middleware.ts` | 진단 게이트 `if (!IS_DEV) return` → `IS_DEV \|\| E2E_DIAG==='true'`. 성공·실패 **무관하게** 최초 1회 지문 기록(그린일 때의 정상값을 알아야 red 를 해석할 수 있다). 남기는 것은 SHA-256 앞 8자뿐 |
| 2 | `.github/workflows/ci.yml` | 위양성 번들 grep **삭제** + **미들웨어 직접 판정** 신설 — 백엔드가 방금 발급한 진짜 토큰을 쿠키로 물려 `/admin/work-hub` 진입(200=수락·307=이번 사고·500=fail-fast). E2E 40분을 기다리지 않고 진단 스텝에서 확정된다 |
| 3 | `.github/workflows/ci.yml` | `Start frontend` 스텝에 `JWT_SECRET` 명시 전달 + `E2E_DIAG=true` |

### 11.7 다음 회차에서 볼 것

`Diagnose auth` 스텝 한 곳이면 갈린다:
- **미들웨어 판정이 200** → 시크릿 전달 문제였고 #3 이 고쳤다.
- **307** → `next-start.log` 의 `[Middleware] JWT 검증 실패 … 지문=XXXX` 를 바로 위 백엔드 지문과
  대조한다. **다르면 그것이 곧 원인**이며, 이번 조사에서 마지막까지 미관측이던 변수가 관측된다.
- **500** → `JWT_SECRET` 이 `next start` 프로세스에 아예 전달되지 않은 것.

남은 실패 중 `Visual Regression Baseline` 은 §6 의 기지 사항(리눅스 기준선 부재)이며 인증과 무관하다.

---
*Last Updated: 2026-07-28 (3차 — 미들웨어 거부 확정 · 진단 2종 거짓 신호 교정 · gh 로그/아티팩트 경로 확보)*
