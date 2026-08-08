# 검증 사각지대 — "빌드 성공"과 "실제로 작동함"은 다르다

> 2026-08-08, 보안 스캔 하나를 고치려다 **배포 이미지가 4개월간 기동 불가였다**는 것을 발견한 기록.
> 개별 PR 설명에는 *무엇을 고쳤는지*가 남지만, **왜 4개월간 아무도 몰랐는지**는 남지 않는다.
> 이 문서는 그 구조를 남긴다.

---

## 1. 사건 — 발견의 연쇄

`zap-scan` 을 실제로 돌려보자 문제가 층층이 드러났다. 각 단계가 다음 단계를 가리고 있었다.

| 순서 | 발견 | 그때까지 왜 안 보였나 |
|---|---|---|
| 1 | `zap-scan` 이 **한 번도 성공한 적 없음** | 주간 스케줄이라 조용히 red. 실행 이력을 세어본 적이 없었다 |
| 2 | 실패해도 **로그가 안 남음** | 진단 스텝이 없고 `docker compose down` 이 `always()` 로 흔적까지 지웠다 |
| 3 | **프론트 이미지가 기동 불가** | 이미지를 *띄우는* 유일한 경로가 1번이었고, 그게 고장나 있었다 |

**두 고장이 서로를 가리고 있었다** — zap-scan 이 고장나 이미지 파손이 안 보였고, 이미지가 파손돼 zap-scan 을 고쳐도 여전히 실패했다.

---

## 2. 핵심 결함 — 이미지를 아무도 실행하지 않았다

```dockerfile
CMD ["node", "node_modules/.bin/next", "start"]   # 2026-04-15 ~ 2026-08-08
```

pnpm 이 만드는 `node_modules/.bin/next` 는 **JS 파일이 아니라 셸 스크립트 shim**(`#!/bin/sh`)이다.
`node` 로 실행하면 JS 파서가 셸 스크립트를 읽어 즉시 죽는다.

```
/app/node_modules/.bin/next:2
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
          ^^^^^^^
SyntaxError: missing ) after argument list
```

실측: `Status=restarting`, `ExitCode=1`, healthcheck **검사 0회**(`restart: always` 라 죽고 재시작 반복).

### 왜 CI 는 초록이었나 — 소비처가 전부 비켜 있었다

| 소비처 | 이미지를 | 결과 |
|---|---|---|
| `ci.yml` E2E | **쓰지 않는다** — `compose up -d db api` 만, 프론트는 호스트에서 `pnpm run start:3001` | 초록 |
| `release.yml` | **빌드해서 푸시만** 한다 | 빌드는 성공 → 초록 |
| `zap-scan.yml` | **유일하게 띄운다** | 한 번도 성공한 적 없음 |

> **`docker build` 성공은 `docker run` 성공을 뜻하지 않는다.**
> CI 는 전자만 보고 있었고, 후자를 보는 유일한 경로가 죽어 있었다.
> 그 결과 **레지스트리에 푸시된 이미지는 `docker run` 하면 즉시 죽는 상태**로 4개월간 발행됐다.

부수 결함도 같은 이유로 숨어 있었다 — 이미지를 띄우면 `JWT_SECRET` 미전달로 **모든 요청이 500** 이다
(프론트 미들웨어가 JWT 를 자기가 검증한다). compose 는 `api` 에만 주고 `frontend` 에는 주지 않았다.

---

## 3. 워크플로 실행 이력 전수 — 그리고 **전수 추적 결과**

처음 세어본 것은 실행 횟수였다. 그 뒤 **0회·실패로 남아 있던 것들을 하나씩 실제로 돌려**
원인을 규명했다. 결과는 아래와 같다 — **"안 도는 데는 전부 이유가 있었다."**

| 워크플로 | 실행 | 조사 결과 |
|---|---:|---|
| `ci` | 100+ | ✅ 실제로 돈다 |
| `dependency-submission` | 65 | ✅ |
| `update-visual-baseline` | 1 | ✅ 수동 전용(정상) |
| `release` | 0 | ✅ 태그 푸시 없음(정상) |
| `zap-scan` | 3 | 🔧 **수리 완료** — 4단계 파손(§1). 현재 2회 연속 완전 성공 |
| `secret-scan-history` | 51 | ✅ **오진이었다.** 실패 10건은 전부 2026-08-03 의 invalid YAML `startup_failure` 이고 2026-08-04 에 이미 수정됨. 스케줄이 **주간 월요일**이라 수정 후 아직 안 돌았을 뿐 — 수동 실행으로 **정상 작동 확인**(leak 284건은 전부 과거 유출, 로테이션 대상) |
| `dependency-check` | 2 | 🔧 **거짓 초록이었다** — 아래 §3.1 |
| `load-test` | 0 | 🔧 **두 겹으로 막혀 있었다** — 아래 §3.2 |

### 3.1 `dependency-check` — 스텝은 red 인데 워크플로는 green

수동 실행 결과(run `31257035852`):

```
OWASP Dependency-Check              : success
Verify report was actually produced : failure   ← 리포트 0건
결론                                 : success   ← 그런데 전체는 성공
```

실제로는 스캔이 완주하지 못했다:

```
NVD_API_KEY:                              (빈 값)
NVD API request failures ... retrying for the 25th time
BUILD FAILED / 생성된 dependency-check 리포트 파일 수: 0
```

원인은 **잡 레벨 `continue-on-error: true`**. Verify 스텝은 주석에 *"continue-on-error 를
붙이지 않는다 — '리포트가 없다'는 사실만큼은 신호로 남아야 한다"* 고 적혀 있었는데,
**잡 레벨 플래그가 그 의도를 무력화**하고 있었다. 그 워크플로가 스스로 경계한 *"거짓 안전감"* 이
**형태만 바꿔 남아 있었다.**

조치: 잡 레벨 플래그는 유지하되(NVD 다운로드는 비결정적이라 게이트로 부적절) 리포트 0건일 때
**실행 요약 페이지에 드러나게** 했다. **로그를 파야만 보이는 신호는 없는 신호다.**

> ⚠ 근본 해결은 `secrets.NVD_API_KEY` 등록이다. 키 없이는 계속 미완주하며,
> 그것은 *"취약점 없음"* 이 아니라 **"확인 못 함"** 이다.

### 3.2 `load-test` — 수동 비활성 + 스텝 순서 버그

실행 0회의 이유는 스케줄이 아니었다. **워크플로가 `disabled_manually` 상태**였다
(사용자가 의도적으로 꺼 둔 것). 활성화하고 돌리자 **첫 실행에서 즉사**했다:

```
Set up Node.js: failure
  ##[error]Unable to locate executable file: pnpm
```

`setup-node` 의 `cache: "pnpm"` 은 캐시 경로를 알아내려고 **pnpm 실행 파일을 호출**하는데,
pnpm 설치가 **다음 스텝**이었다. `ci.yml` 은 3곳 모두 반대 순서(pnpm → setup-node)로
정상 동작 중이다 — `load-test.yml` 만 뒤집혀 있었고, **꺼져 있어서 아무도 몰랐다.**

> 끄는 것 자체가 문제는 아니다. 문제는 **꺼진 워크플로가 그 안의 버그까지 함께 덮는다**는 것이다.

---

## 4. 반복되는 형태

이 저장소에서 같은 형태의 사고가 반복됐다. 전부 **선언은 있는데 실행 경로가 없거나 죽어 있는** 경우다.

| 사례 | 선언 | 실태 |
|---|---|---|
| CI 과금차단 (문서) | *"CI 가 과금으로 막혀 있다"* | 돌고 있었다. 그 서술 탓에 E2E 파손이 8커밋 누적 |
| 프론트 헌법 제14조 | *"모든 핵심 UI 를 Storybook 으로 검증"* | 21개 중 2개, CI 미실행, 테스트 스크립트는 패키지 미설치로 실행 불가 |
| 뮤테이션 게이트 | 문서 3곳이 *"report-only"* | 2026-07-26부터 **75% 하드강제 중** |
| E2E required check | *"UI 변경은 CI 초록이 유일한 증거"* | required 가 아니어서 **빨개도 병합 가능**했다 |
| 게이트 클래스 census | *"게이트 삭제를 막는다"* | **미등재 게이트는 지워도 안 걸렸다** |
| `zap-scan` | 주간 보안 스캔 | **한 번도 성공한 적 없음** |
| 프론트 도커 이미지 | 릴리스마다 발행 | **4개월간 기동 불가** |
| `dependency-check` | 주간 CVE 스캔 | **NVD 키 부재로 매번 미완주**인데 워크플로는 초록 |
| `load-test` | 주간 부하 테스트 | **수동 비활성** + 그 안에 스텝 순서 버그 |

---

## 5. 그래서 무엇을 할 것인가

**게이트를 만들 때 묻는다 — "이게 실패하면 무엇이 보이는가?"**

`zap-scan` 은 진단 스텝이 없어 실패해도 `"unhealthy"` 한 단어만 남았다.
진단 스텝(`docker compose ps` · `logs` · `inspect .State`)을 넣고 나서야 원인이 보였다.
**실패했을 때 무엇을 볼 수 있는지가 게이트의 값을 결정한다.**

**주기적으로 실행 이력을 센다.** §3 의 표는 명령 한 줄이면 나온다.

```bash
for w in .github/workflows/*.yml; do
  n=$(basename "$w"); echo -n "$n: "
  gh run list --workflow="$n" -L 100 --json databaseId --jq '. | length'
done
```

실행 0회·최근 실패인 워크플로는 **"있다"가 아니라 "없다"** 로 취급한다.

**빌드와 실행을 구분한다.** 컨테이너 이미지는 `docker build` 가 아니라 **`docker run` 후 healthcheck 통과**까지 봐야 검증이다. 지금은 `zap-scan` 이 유일하게 그것을 하며, 그래서 이 워크플로는 보안 스캔인 동시에 **배포 이미지의 기동 검증**이기도 하다.

---

## 6. 남은 것

- **`secrets.NVD_API_KEY` 등록** — `dependency-check` 가 완주하려면 필요하다.
  키 없이는 이 스캔이 계속 *"확인 못 함"* 상태다. 발급은 사용자 영역
  ([NVD API Key 신청](https://nvd.nist.gov/developers/request-an-api-key)).
- **`load-test` 의 k6 단계 검증** — 스텝 순서를 고쳐 setup 은 통과하지만, 그 뒤
  `LOAD_TEST_BASE_URL`·`LOAD_TEST_USERNAME`/`PASSWORD` 시크릿이 필요할 수 있다.
  **setup 통과가 부하 테스트 성공을 뜻하지 않는다** — 실행해서 확인할 것.
- **`zap-scan` 경고 11종** — FAIL 0 이고 전수 판정 완료(4건 조치·3건 오탐·3건 조치불요·
  1건 기결정). 다만 **스캔이 도달한 곳은 미인증 공개 페이지 5개뿐**이다.
  로그인 뒤 `/admin/**` 은 스캔 범위 밖이며, 실제 취약점이 있다면 거기 있다.
  인증 스캔 도입 여부는 별도 판단 사항.
- **이미 공개된 과거 유출** — `secret-scan-history` 가 leak 284건을 보고한다.
  전부 현재 트리에 없는 과거 파일이며 목록화가 아니라 **로테이션**으로 닫힌다
  ([crypto-key-rotation.md](crypto-key-rotation.md) · [pending-decisions.md](pending-decisions.md) §2-B).

관련: [dependabot-alert-census.md](dependabot-alert-census.md) §11 — 같은 세션에서 발견한 하네스 구멍 3건
