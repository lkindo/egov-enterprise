# E2E 최적화 감사 — 중복 제거 · 계약 소유권 정리 · 커버리지 공백 보강

> **작성 근거**: 스펙 26개 · POM 24개 전수 정독 + Playwright `--list` 실측 + CI run 31321924801 스텝별 실측
> **등급**: L2 (다중 파일 · 테스트 아키텍처 · 게이트 신설)
> **상태**: ✅ **완료** — 정적 게이트 4종 + CI 전량 green (PR #380 · run 31374696692 · `mergeStateStatus: CLEAN`)
>
> ⚠ **착수 시점에는 인프라 다운으로 런타임 검증이 불가능했고 그 사실을 보류로 명시했다.**
> 이후 PR CI 로 실증을 완료했으며, 그 과정에서 **앱 결함 1건을 발견**했다(§8). 아래 §5 는
> 최종 결과로 갱신됐다 — 보류 상태의 서술을 그대로 두면 문서가 거짓이 된다.

---

## 0. 요약

| 지표 | 변경 전 | 변경 후 | 비고 |
|---|---:|---:|---|
| **로컬 기본 실행**(`test:e2e`) | **226건** | **122건** | -46%. 전 테스트가 2회 돌고 있었다 |
| CI 실행(`--project=full-suite`) | 114건 | 122건 | 실행 수는 +8, **구성은 대폭 교체** |
| 스펙 테스트 | 112 | 120 | 삭제 **-10** / 신설 **+18** |
| Playwright 프로젝트 | 28 | **2** | tier-N-* 26개 제거 |
| E2E 타입 검사 | **없음** | pre-push 강제 | 루트 tsconfig 가 `e2e` 를 exclude 중이었다 |
| 미사용 스냅샷 | 4 | 1 | 295KB 회수 |

핵심은 **테스트 수가 아니라 신호 대비 비용**이다. 같은 계약을 네 파일이 중복 검사하는 동안
그 계약의 나머지 케이스는 한 번도 검증되지 않고 있었다.

---

## 1. 최대 낭비: 로컬 실행이 항상 2배였다

`playwright.config.ts` 의 `full-suite` 프로젝트는 `testMatch: /.*\.spec\.ts/` 로 **모든 스펙을 매칭**했고,
그와 별도로 스펙 파일마다 `tier-N-*` 프로젝트가 하나씩(26개) 같은 파일을 다시 매칭했다.

```
[변경 전] npx playwright test --list              → Total: 226 tests   ← npm run test:e2e 의 실제 동작
[변경 전] npx playwright test --list --project=full-suite → Total: 114 tests   ← ci.yml 이 쓰는 경로
[변경 후] 두 경로 모두                            → Total: 122 tests
```

`ci.yml` 은 2026-07-28 에 `--project=full-suite` 를 붙여 이 문제를 **CI 에서만** 우회했다
(그 커밋 본문에 "226건 = full-suite 112 + tier-* 112 + setup 2" 실측이 남아 있다).
**로컬은 그 뒤로도 계속 2배를 돌고 있었고**, 아무도 눈치채지 못했다 — 문서(`e2e-test-guide.md`)가
`npm run test:e2e` 를 "전체 25 Tier 순차 실행" 이라고 안내하고 있었기 때문이다.

`tier-N-*` 의 용도("특정 tier 만 빠르게")는 파일/제목 지정으로 그대로 달성된다.
프로젝트 이름 `full-suite` 는 **의도적으로 유지**했다 — `ci.yml` 의 `--project=full-suite` 와
스냅샷 파일명(`dashboard-baseline-full-suite-linux.png`)이 그 이름에 묶여 있어 개명하면 둘 다 깨진다.

---

## 2. 신설: E2E 타입 게이트 (가장 큰 구조적 공백)

`frontend/tsconfig.json` 의 `exclude` 에 **`"e2e"`** 가 들어 있다. 따라서:

- §0.6 HARD 게이트(`npx tsc --noEmit`) — E2E 미검사
- `.githooks/pre-push` — E2E 미검사
- CI `frontend-build` — E2E 미검사
- Playwright 러너 — transpile-only, **타입을 검사하지 않는다**

즉 **E2E 스펙 26개와 POM 24개는 지금까지 어떤 게이트에서도 타입 검사를 받은 적이 없다.**
E2E 의 타입 오류는 오직 4분짜리 CI e2e 잡이 실패해야만 드러났다.

`frontend/tsconfig.e2e.json` + `type-check:e2e` 스크립트를 신설하고 pre-push 에 결속했다.

**첫 실행에서 즉시 검출된 기존 死선언 3건** (내 변경과 무관한, 이미 있던 것):

| 위치 | 내용 |
|---|---|
| `pages/SurveyPage.ts:42` | `selectDate()` — 호출부 0 (캘린더 좌표 의존 死코드) |
| `pages/SurveyPage.ts:153` | `ensurePopoverClosed()` — 호출부 0 |
| `05-public-experience.spec.ts:166` | `searchKeyword` 미사용 지역변수 |

**게이트 red 증명** (§0.7-H5 — 그린만 확인하는 것은 vacuous 통과와 구분되지 않는다):

```
$ # e2e/__gate-probe.spec.ts 에 위반 주입
e2e/__gate-probe.spec.ts(3,11): error TS2322: Type 'string' is not assignable to type 'number'.
e2e/__gate-probe.spec.ts(5,10): error TS2339: Property 'nonExistentMethod' does not exist on type 'Page'.
INJECTED_EXIT=2
$ # 프로브 제거 후
CLEAN_EXIT=0
```

---

## 3. 삭제 10건 — 전부 "중복이거나, 실패할 수 없거나, 이름이 거짓"

### 3.1 접근통제 계약을 네 파일이 중복 검사하고 있었다

미들웨어 `§4`(`/admin` deny-by-default) 한 곳의 계약을 **03·04·22·23 이 서로 모르게** 검사했다.
그러면서 정작 정책 목록의 대부분은 **한 번도 검증된 적이 없었다**.

| 삭제 | 사유 |
|---|---|
| `03-board-master` › `Access Denied for Regular User` | 최상위 if/else **양 갈래 모두 통과 경로**. else 의 `expect(url).not.toContain('admin')` 은 목적지가 `/?auth_error=` 라 우연히 성립하던 단언. `if (wizardBtn.count()>0)` 가드 안 단언은 버튼 부재 시 미검사 |
| `04-quality` › `Denied Admin Access for Regular User` | `url === 'http://localhost:3001/'` **하드코딩**(baseURL 변경 시 조용히 else 로 샘) + if/else 양방향 통과 |
| `22-deep-security` › `Access Denied for Direct User ID Manipulation` | **이름이 IDOR 인데 실제로는 경로 RBAC**. 쿼리스트링이 붙었을 뿐 |
| `22-deep-security` › `API Boundary: Unauthorized Direct API Access` | 토큰 없는 **익명** 요청(주석이 스스로 인정). 23-E3 가 유효 비관리자 토큰으로 검증하는 쪽이 더 강함 |

→ 23-E4 **매트릭스 한 곳**으로 통합. 진짜 IDOR 는 23 상단 TODO 의 **E6** 로 남아 있으며,
   삭제된 테스트가 그것을 검증한 적은 없으므로 **커버리지 손실 0**.

### 3.2 엄격히 약한 부분집합

| 삭제 | 사유 |
|---|---|
| `04-quality` › `Accessibility Audit (axe-core)` | 01 의 `Accessibility Audit for Admin Dashboard` 와 **동일 페이지(`/admin`)**, 그런데 `heading-order` 까지 추가로 비활성 → 01 이 잡는 위반의 부분집합. 게다가 01 과 달리 h1 렌더 대기가 없어 Suspense 폴백을 감사할 여지도 있었다 |
| `01-core-base` › `User Authentication Flow (UI based)` | 23-E0 가 상위집합 — 동일 UI 로그인에 더해 Route Handler 200 관측(이중 프리픽스 회귀)과 **HttpOnly 쿠키**까지 단언 |
| `07-productivity` › `Smart Toolkit: Business Extensions` | 25 가 dept-job/work-report 를 8건으로 전면 소유. 보고 단언 `/…없습니다\|작성자: /` 는 **빈 목록도 통과**하는 or-폴백 |
| `11-enterprise` › `Work Report Matrix` | 유일한 탭 단언이 `if (tabs.count()>0)` 안 → **탭이 사라져도 그린** |

### 3.3 실패할 수 없던 테스트

| 삭제/교정 | 사유 |
|---|---|
| `09` › `Integrated Neural Search Verification` **삭제** | `if(results>0) … else …` **양 갈래 통과**, else 분기는 바로 아래 테스트와 **완전 동일**. '관리자' 가 결과를 낼지는 색인 상태에 달려 결정적으로 만들 수 없다 |
| `21` › `Rapid Interaction Stress Test` **삭제** | 스트레스 전부가 `if (nextBtn.isVisible())` 안. CI 는 **빈 DB** 라 페이저가 없어 **클릭 0회** → 실제로 한 일은 `expect(body).toBeVisible()`(항상 참)뿐 |
| `19` › 'data-driven routes' 블록 **제거** | 셀렉터가 `a[href^="/admin/"]` 인데 단언이 `href` 가 `/^\/admin\/.+/` 인지 — **동어반복**. 게다가 전역 셀렉터라 메뉴 트리가 아닌 **사이드바**를 잡았다 |
| `10` › `Memo Report Matrix` **교정** | 꼬리의 `if (noData) console.log(…)` 는 **단언 0개**. 탭 전환 후 허브 생존을 실단언으로 교체 |
| `15` › scraps **교정** | if/else 양 갈래 통과. 무엇을 검증하는지가 **앞선 테스트의 잔여 데이터**에 따라 달라졌다 |
| `20` › `Rapid Menu Switching` **개명·축소** | `await page.goto()` 로 완전히 기다리므로 **rapid 하지 않고** 교착 판정 단언도 없었다. 4경로 중 3개는 타 스펙 소유 → `/admin/system/programs` 만 남김 |

---

## 4. 신설 18건 — 전부 "구현돼 있으나 아무도 지키지 않던 계약"

### 4.1 미들웨어 경로 정책 매트릭스 (23-E4, 18건)

`middleware.ts` 를 정독해 **정책 목록 전량**을 고정했다. 종전 커버리지는 괄호 안.

| 축 | 건수 | 종전 |
|---|---:|---|
| 기본 차단 경로 | 6 | (2) |
| `ADMIN_ONLY_SUBPATHS` carve-out 전량 | 3 | (1) — `boards/maker`·`templates` **미검증** |
| `USER_ACCESSIBLE_ADMIN_PATHS` 전량(과잉차단 방어) | 5 | (1) — **로그인 기본 착지점 `/admin/work-hub` 포함 미검증** |
| 대소문자 우회(`/Admin/…`·`/ADMIN/…`) | 1 | **(0)** |
| 접두사 오매칭(`/admin/helpdesk` ↛ `/admin/help`) | 1 | **(0)** |
| 쿼리스트링 교란 | 1 | (1, 22에서 이관) |
| 무토큰 → `/login`(권한거부와 구분) | 1 | **(0)** |

`toLowerCase()` 정규화와 `matchesPrefix()` 세그먼트 경계 비교는 **주석에 방어 목적이 명시된 코드인데
회귀 방어가 0** 이었다. `/admin/work-hub` 가 허용 목록에서 빠지면 로그인 직후가 곧바로 깨지는데
그것을 잡는 테스트도 없었다.

**층위 설계**: 이 계약의 집행자는 미들웨어고 관측 지점은 리다이렉트 응답이다. 그래서 브라우저를
띄우지 않고 `request.get(path, { maxRedirects: 0 })` 로 **HTTP 층에서** 묻는다 — 페이지 렌더·하이드레이션·
ConsoleGuard 가 개입하지 않아 판정이 결정적이고, 경로 1건당 비용이 페이지 로드에서 단순 요청으로 내려간다.
브라우저 쿠키가 실제로 미들웨어까지 도달하는지는 **카나리아 1건**(E4c)이 따로 지킨다.

> ⚠ 이 describe 에는 `storageState` 를 **의도적으로 지정하지 않았다**. Playwright 의 `request` 픽스처는
> `storageState` 를 상속하므로, 지정하면 컨텍스트 쿠키와 명시 `Cookie` 헤더가 섞여
> '어느 토큰으로 판정됐는지'가 불분명해진다.

**전제 실증 — `maxRedirects: 0` 의 의미**: Playwright 문서는 "An error will be thrown if the number is
exceeded" 라고만 적혀 있어, `0` 이 **예외를 던지는지** 3xx 응답을 그대로 돌려주는지가 모호하다.
이 21건 전부가 그 동작에 걸려 있으므로 로컬 스텁 서버(307 + Location)로 직접 확인했다:

```
[maxRedirects=0]         예외 없음 · status=307 · location=/?auth_error=unauthorized
[maxRedirects=undefined] 예외 없음 · status=200 · location=(없음)   ← 기본값은 따라간다
```

→ `0` 은 **리다이렉트를 따라가지 않고 3xx 응답과 Location 헤더를 그대로 반환**한다. 단언 방식이 성립한다.
(Next 의 `NextResponse.redirect(new URL(...))` 는 절대 URL 을 싣지만 `toContain` 판정이므로 무관하다.)

### 4.2 Zero-Trust Origin 가드 (23-E5, 3건)

`middleware.ts` 최상단은 상태변경 `/api` 요청의 Origin 을 검사해 403 `INVALID_ORIGIN` 으로 끊는다.
**E2E 가 하나도 없었다.** 특히 그 코드에는 이미 한 번 고쳐진 우회가 있다 — 종전 구현은 부분문자열
비교라 `https://localhost.attacker.com` 같은 **접미사 도메인**이 통과했다. 그 수정을 지키는 회귀 방어가
없어 되돌아가도 알 수 없었다.

부작용 없는 `POST /api/auth/logout` 을 쓴다(쿠키 없이 호출해도 fail-safe 200 — 세션·감사로그 무오염).
접미사 도메인 · 무관한 외부 Origin · 동일 출처(과잉차단 방어) 3방향으로 고정.

### 4.3 사용자 정보 수정 (02, 1건) — ⚠ 실행 결과 앱 결함이 드러나 `test.fixme` 로 전환됐다(§8)

테스트 이름은 줄곧 `Create-Search-Update-Delete Flow` 였으나 **Update 단계가 존재한 적이 없다**.
그 공백 기간에 상세 패널의 '정보 수정' 버튼은 **onClick 이 없는 死버튼**이었다가 수리됐고
(`UserOrgHubClient`: "종전에는 onClick 이 없는 死버튼이라 눌러도 아무 일도 없었다"),
회귀 방어는 붙지 않았다. 이름이 약속한 단계를 실제로 채웠다.

토스트만 보고 통과하지 않는다 — 이 저장소에는 **API 를 부르지 않고 성공 토스트만 띄우던** 결재 상신
사례가 있어(11 티어 주석), 목록 반영까지 확인한다.

### 4.4 익명 API 접근 차단 (23-E3, 1건) — 22 에서 이관

### 4.5 로그아웃 세션 실무효화 (01, 강화)

제목이 `Session Cleanup` 인데 **정리를 검증하지 않았다** — 리다이렉트만 봤다. 그런데 리다이렉트는
클라이언트가 수행하므로 **쿠키가 남아 있어도 `/login` 으로 간다**. 쿠키 소멸 + 보호 경로 재진입 차단을
추가해 제목이 약속한 것을 실제로 검증한다.

---

## 5. 검증 증적

```
① E2E 타입 게이트   npx tsc -p tsconfig.e2e.json --noEmit   → PASS (신설, 위반주입 red 확인)
② 앱 타입 게이트     npx tsc --noEmit                        → PASS (§0.6 HARD)
③ ESLint            pnpm run lint                           → 0 errors (360 warnings, 기존 수준)
④ 구성 무결성        --list 미지정 == --list --project=full-suite → 122 == 122 ✅
```

### CI 실증 (착수 시점의 보류를 해소)

착수 시점에는 `:8080` · `:3001` · Docker 가 모두 다운이라 런타임 검증이 불가능했고, 그 사실을
보류로 명시한 채 PR 을 열었다. **PR CI 로 4회차에 걸쳐 실증을 완료했다.**

| run | 결과 | 무엇을 배웠나 |
|---|---|---|
| 31369018355 | `frontend-build` red → **e2e 전량 skip** | blind-wait 하향 래칫이 개선분 확정을 요구(68→63). E2E 는 실행조차 안 됐다 |
| 31370824912 | e2e 실행 · shard1 42/1F · shard2 66/1F · shard3 pass | 신규 21건 중 **20건 통과**. 실패 2건은 성격이 갈렸다(§7·§8) |
| 31372885301 | shard2 1F | 별칭 사슬 테스트가 2차 홉에서 세션을 잃음(§7) |
| **31374696692** | ✅ **전량 green** | shard1 42P/1S · shard2 68P/1S · shard3 13P · `mergeStateStatus: CLEAN` |

> 이 저장소는 pre-push 에 E2E 가 없어 **UI 변경은 CI 초록이 유일한 증거**다(SOP §4.1).
> 로컬 게이트가 전부 초록이던 상태에서 CI 가 3회 red 였다는 사실이 그 규정의 근거를 다시 보여 준다.

---

## 7. CI 가 가르쳐 준 두 가지 메커니즘 (둘 다 실증했다)

테스트를 고치기 전에 **왜 그렇게 되는지**를 스텁 서버로 직접 관측했다. 둘 다 문서만으로는
알 수 없었고, 추정으로 넘어갔다면 엉뚱한 곳을 고쳤을 것이다.

### 7.1 `next.config.redirects()` 는 미들웨어보다 **먼저** 실행된다

`/admin/system/audit` 을 deny 매트릭스에 넣었더니 Location 이 `auth_error` 가 아니라
`/admin/system/monitoring/hub?tab=system` 이었다. 그 경로는 `next.config.ts:130` 의 레거시 별칭이라
**인증 게이트에 도달조차 하지 않는다.**

보안 구멍은 아니다 — 목적지가 `/admin/system` 하위라 2차 홉에서 차단된다. 삭제된 04 의 테스트가
통과했던 것은 `page.goto()` 가 리다이렉트를 끝까지 따라가 최종 URL 만 봤기 때문이다.

→ deny 매트릭스에는 **실제 종착 경로만** 넣는다(주석으로 못박음). 별칭은 사슬 테스트가 따로 지킨다.

### 7.2 Playwright 의 `Cookie` 헤더는 리다이렉트를 넘지 못한다

별칭 사슬을 HTTP 층에서 따라가게 했더니 `/login?redirect=…` 에 착지했다 — 권한거부가 아니라
**인증실패**다. 즉 2차 홉이 무토큰으로 도착했다. 로컬 307 서버로 확인:

```
/hop1    cookie=accessToken=TESTVALUE
/hop2    cookie=(없음)
```

`APIRequestContext` 는 **수동 지정한 `Cookie` 헤더를 다음 홉으로 전달하지 않는다.**
E4 매트릭스의 단일 홉 20건이 멀쩡히 통과한 것도 같은 이유로 설명된다.

→ 사슬 검증은 쿠키 저장소를 쓰는 **브라우저(E4c)** 가 소유한다. 편의가 아니라 필요다.

> 참고로 `maxRedirects: 0` 이 예외를 던지는지 3xx 를 반환하는지도 같은 방식으로 미리 실증했고
> (예외 없이 307 + Location 반환), 그 덕에 단일 홉 매트릭스 21건은 처음부터 옳게 작성됐다.
> **확인한 전제는 맞았고 확인하지 않은 전제(쿠키 전달)만 틀렸다** — 실증의 비용 대비 효과가 명확하다.

---

## 8. 🚨 발견한 앱 결함 — 관리자의 사용자 정보 수정이 항상 400

**이 감사의 가장 큰 산출물은 테스트 정리가 아니라 이것이다.**

02 스펙의 이름은 오랫동안 `Create-Search-**Update**-Delete Flow` 였지만 **Update 단계가 존재한
적이 없었다.** 이름이 약속한 것을 채워 넣고 CI 에서 처음 돌리자 곧바로 드러났다:

```
❌ [HTTP 400 PUT] /api/v1/admin/system/users/e2e_lsezbi (xhr)
```

### 근본 원인 (소스 대조로 확정)

| 층 | 사실 | 판정 |
|---|---|---|
| `UserManageForm` | edit 모드에서 비밀번호를 **선택**으로 두고 `pswd: ''` 를 싣는다 | ✅ 올바른 설계 — 비번 변경은 `PATCH .../{id}/password` 책임 |
| `UserAdminService.updateUser` | 폼 값을 **그대로** PUT (빈 값 제거 없음) | ⚠ 통과 |
| `UserApiController.updateUser` | 등록과 **같은 `UserDto` 를 `@Valid`** 로 받는다 | 🚨 **여기가 결함** |
| `UserDto.pswd` | `@NotBlank` + `@Size(min=8)` + `@Pattern` | 🚨 수정 요청이 원리적으로 통과 불가 |

**비밀번호를 함께 보내지 않는 한 사용자 정보 수정은 항상 400 이다.**

### 왜 지금까지 아무도 몰랐나

검증하는 테스트가 프런트·백엔드 어디에도 없었다. 화면에는 폼이 뜨고 제출도 되며 실패는 일반
에러 토스트로만 나타나므로, 눈으로 보면 '동작하는 것처럼' 보인다.
같은 화면의 '정보 수정' 버튼은 과거 onClick 이 없는 死버튼이었다가 수리된 이력이 있다 —
**UI 는 고쳐졌지만 그 아래 API 계약은 여전히 깨져 있었다.**

### 처리: `test.fixme` 로 박제 (결함을 계약으로 동결하지 않는다)

올바른 기대값을 **그대로 둔 채** fixme 로 표시했다. "수정하면 에러가 난다" 를 단언하면 11 티어의
가짜 성공 토스트와 같은 함정에 빠진다 — 결함이 계약이 되어 고쳐질 때 red 가 난다.
**백엔드가 고쳐지면 `.fixme` 만 떼면 그대로 통과해야 한다.**

### 권장 수정 (별건 — 이 PR 에 섞지 않았다)

수정 전용 DTO 분리 또는 검증 그룹 도입. 어느 쪽이든 **API 계약 변경**이라
`api-docs.json` → `generated-api.d.ts` → `generated-zod.ts` 연쇄 재생성이 따르고,
백엔드 헌법 제3조(DTO 전문 클래스) 관점의 설계 판단이 필요하다.
E2E 최적화와 무관하므로 독자적으로 진행해야 한다.

> ※ 첫 시도에서 수정 이름에 `_UPD` 를 붙여 **별개의 400 도 함께** 유발했다 —
> `UserDto.userNm` 의 `@Pattern(^[a-zA-Z0-9가-힣\s]{2,50}$)` 은 밑줄을 허용하지 않는다.
> 이 건은 앱이 옳고 테스트가 틀렸던 쪽이라 공백으로 고쳤다. 두 원인을 분리해 판정하지 않았다면
> "패턴만 고치면 되겠지" 로 끝나 진짜 결함을 놓쳤을 것이다.

---

## 9. 미적용 — 근거와 함께 남기는 후속 과제

### 6.1 CI 인프라가 E2E 잡의 절반 이상 (권고: 별건 처리)

CI run 31321924801(main, 전량 success) 스텝별 실측:

| 샤드 | 테스트 실행 | 잡 전체 | 테스트 비중 |
|---|---:|---:|---:|
| 1/3 | **3m 44s** | 8m 00s | 47% |
| 2/3 | 2m 20s | 6m 29s | 36% |
| 3/3 | **1m 00s** | 5m 18s | 19% |

두 가지가 드러난다:

1. **샤드 불균형 3.7배** (224s vs 60s). Playwright `--shard` 는 **테스트 개수** 기준 균등 분할이라
   소요시간을 고려하지 않는다.
2. **인프라 준비가 샤드마다 중복** — API 이미지 빌드 1m57s × 3 = 5m51s, Next 프로덕션 빌드 44s × 3.
   샤드 3 은 인프라 4분 + 테스트 1분이다.

산술: 단일 잡이면 인프라 4m16s + 테스트 424s ≈ 11m20s. 3샤드는 max 8m00s.
**시간 이득 30%에 러너-시간은 2배 이상**(24분 vs 11분)이다.

→ 개선 방향은 샤드 수가 아니라 **인프라 재사용**(`backend-build` 잡의 이미지를 GHCR/아티팩트로 공유)이다.
   `ci.yml` 수정은 팀 전체 CI 에 영향을 주는 외부 영향 변경이라 **이번 범위에서 제외**했다.

### 6.2 고정 대기 95.2초 (권고: 런타임 검증 후)

`waitForTimeout` 이 스펙·POM 합계 **68개소 · 95.2초**. 최다는 `SurveyPage`(8) · `05`(7) · `BoardMasterPage`(6) · `CollabPage`(6).
대부분 뒤에 auto-wait 단언이 따라와 제거 가능해 보이나, **런타임 검증 없이 손대면 플레이키를 만든다.**
이 저장소에는 E2E 파손이 8커밋 누적된 이력(#305~#312)이 있어 인프라 복구 후 1건씩 실측 제거를 권고한다.

### 6.3 `workers: 1` 유지 (병렬화 **비권고**)

이론상 424초를 워커 2~3개로 150~200초까지 줄일 수 있으나 **채택하지 않는다**:
02(사용자 CRUD) · 06(로그인 정책) · 03(게시판 마스터) · 05(배너/팝업 누적)가 **공유 DB 전역 상태**를 바꾼다.
05 의 배너 캐러셀 주석은 누적 데이터로 인한 100% 실패를 이미 기록하고 있다.
병렬화하려면 스펙별 데이터 격리가 선행돼야 한다.
(부수 정리: 03 의 `test.describe.configure({ mode: 'parallel' })` 는 `workers:1` 하에서 **무효**였고
"병렬 최적화" 주석이 잘못된 인상을 주고 있어 제거했다.)

### 6.4 잔여 커버리지 공백

| 공백 | 비고 |
|---|---|
| 진짜 IDOR (A의 리소스를 B가 조회/삭제) | 23 TODO **E6** |
| 토큰 재발급(`/api/auth/reissue`) | 라우트는 구현·단위테스트 존재, **E2E 0** |
| 첨부파일 업로드 (`aria-label="파일 첨부 선택"`) | 06 에서 자기충족 목이라 삭제된 뒤 **미복원** |
| 댓글 수정/삭제 (`data-testid="comment-edit-button"` 등) | 단위테스트는 mock 으로 커버, 실 왕복 없음 |
| 계정 잠금(lockout) | 23 에 `test.fixme` 로 등록됨 |
| 반응형 브레이크포인트 | 전 스펙 Desktop Chrome — FE 헌법 제6조 대비 E2E **0** |
| E2E ESLint | `lint` 스크립트가 `eslint src` 라 e2e 는 lint 대상 밖 |
| **vitest 가 pre-push 에 없다** | 유닛 64파일·337건은 CI 에서만 돈다. 유닛 1건 실패가 **e2e 3샤드를 통째로 skip** 시킨다(이번 run 31369018355 가 실증). 훅 추가 시 +52.6s |
| **사용자 정보 수정 400** | §8 — 백엔드 DTO 계약 변경 필요(별건) |

---

## 10. 변경 파일

**설정·게이트**: `frontend/playwright.config.ts` · `frontend/tsconfig.e2e.json`(신설) ·
`frontend/package.json` · `.githooks/pre-push`

**스펙**: 01 · 02 · 03-board-community · 03-board-master · 04 · 05 · 07 · 09 · 10 · 11 · 15 · 19 · 20 · 21 · 22 · 23

**POM**: `pages/SurveyPage.ts`

**스냅샷 삭제**: `dashboard-baseline-{full-suite-win32, tier-4-quality-linux, tier-4-quality-win32}.png`
(win32 2개는 테스트가 `platform !== 'linux'` 에서 skip 이라 **영구 미사용**, tier-4 2개는 프로젝트 제거로 무효)

**문서**: `docs/03-guides/e2e-test-guide.md` · `docs/03-guides/testing-guide.md`

---

*작성: 2026-08-10 · Claude Code (dual-operator)*

---

## 11. 후속 과제 3건 처리 결과 (2026-08-11)

§9 에 남겼던 후속 과제를 모두 처리했다. 처리 과정에서 **앱 결함 2건을 추가로 발견**했다.

### 11.1 ✅ 사용자 수정 400 — 원인이 **두 겹**이었다

| # | 원인 | 수정 |
|---|---|---|
| ① | `UserDto.pswd` 의 `@NotBlank`+`@Size`+`@Pattern` 이 기본 그룹이라 **수정 요청에도 적용** | `UserValidationGroups.OnCreate` 로 등록 경로에만 한정 |
| ② | `UserDto.emlAddr` 의 `@Pattern` 이 **빈 문자열을 거부** (@Pattern 은 null 은 건너뛰지만 "" 는 검사) | 정규식에 `^$\|` 를 더해 선택 필드의 미입력을 허용 |

①만 고쳤을 때 **CI 는 여전히 400** 이었다. 그때 배운 것이 이 절의 핵심이다.

**standalone MockMvc 그린이 실 앱 동작을 보장하지 못했다.** `UserApiControllerTest` 는
`BaseControllerTest` 기반이라 컨트롤러를 손으로 띄운다 — 실제 ObjectMapper·Validator 구성이
그대로 적용된다는 보장이 없다. 그래서 `UserUpdateContractIntegrationTest`(실 `@SpringBootTest`)
를 신설했고, 이제 이 계약은 두 층에서 검증된다.

**그리고 원격 추론을 멈추고 관측을 심었다.** 02 의 수정 제출을 성공 토스트가 아니라
**API 응답으로 직접 단언**하고, 실패 시 상태코드·응답 본문·보낸 페이로드를 단언 메시지에 싣게 했다.
그 한 회차가 5회차 동안 못 찾던 원인을 확정했다:

```
errors: [{"field":"emlAddr","message":"이메일 형식이 올바르지 않습니다"}]
보낸 페이로드: {..., "emlAddr":""}
```

> **교훈**: 실패가 "무엇이 안 보였다" 까지만 말하면 원격 디버깅은 추측이 된다.
> 단언 메시지가 원인을 담게 만드는 것이 회차를 줄이는 가장 싼 방법이었다.
> 부수적으로 단언 자체도 강해졌다 — 토스트만 보는 검증은 'API 를 부르지 않고 토스트만 띄우는'
> 회귀를 놓친다(11 티어 전례).

### 11.2 ✅ vitest 계층 배치

pre-push 에 vitest 가 없어 유닛 1건이 **E2E 3샤드를 통째로 skip** 시켰다(run 31369018355 실증).
전수는 로컬 147초라 pre-push(~2분) 예산에 맞지 않으므로 계층을 나눴다:

* **pre-push** → `frontend/src/__tests__` 불변식 게이트 5파일·18건 (**10초**)
* **localGate** → `frontendUnitTest` 태스크 신설, 전수 (147초)

### 11.3 ⏸ CI 샤드 3→2 — 측정은 마쳤으나 **되돌렸다**

측정상 2샤드가 두 축 모두 낫다(wall 432→~399s, runner 1008→~798s). 그러나 적용하자
**§11.5 의 하이드레이션 결함이 드러나** CI 가 red 가 됐다. 그 결함을 고친 뒤 다시 내리기로 하고
이번에는 3 을 유지한다. 측정값과 되돌린 사유는 `ci.yml` 주석에 그대로 남겼다.

* 타임아웃 75→30분은 **유지**했다(실측 최장 7.2분의 4배 여유).
* "이미지를 한 번만 빌드해 공유" 안은 계산상 **wall 이 나빠져** 채택하지 않았다(약 492s).

---

## 12. 🚨 추가로 발견한 앱 결함 2건 (별건 — 이 PR 범위 밖)

### 12.1 등록이 선택 필드를 **버린다**

`UserService.registerUser(userId, pswd, userNm, pswdHint, pswdCrans, roleName)` —
인자에 **`emlAddr`·`mblTelno`·`ognzId` 가 없다.** 등록 폼은 이 값들을 수집해 전송하지만
서비스가 저장하지 않는다. 그래서 갓 만든 사용자는 항상 이메일이 비어 있고,
그것이 §11.1 ②를 촉발한 조건이었다.

고치려면 `registerUser` 의 시그니처와 저장 로직을 바꿔야 한다(도메인 동작 변경).

### 12.2 ✅ `/search` 하이드레이션 불일치 (React #418) — 원인 규명·수정 완료

> **⚠ 이 절의 최초 판단은 틀렸다. 정정 내용을 그대로 남긴다.**
>
> 처음에는 "샤드 재분배로 실행 순서가 바뀌며 드러난 결함" 이라고 적었다. 근거는
> 2샤드 2회 실패 / 3샤드 3회 통과라는 상관뿐이었고 **메커니즘이 없었다.**
> 실제로 확인해 보니 3샤드 green 회차(run 31486547325)의 shard 1 은 `01 → 10` 을 돌아
> **09 의 선행 테스트가 2샤드 때와 완전히 동일**했다(01–08). 샤드 수는 09 의 맥락을
> 바꾸지 않는다 — 상관을 인과로 읽은 오판이었다.

**진짜 사실**: 이 오류는 **제 작업 이전부터 main 에 있던 간헐 결함**이다.
2026-08-09 main 회차(run 31321924801)의 로그에 같은 `React #418` 이 있고,
당시에는 `09:32 Integrated Neural Search Verification` 을 때려 **`1 flaky`** 로 기록됐다
(재시도에서 통과). #380 에서 그 비결정적 테스트를 삭제하자 같은 플레이크가 남은
`/search` 테스트로 옮겨 앉은 것이다.

**메커니즘 (CI 로그 2건으로 확정)**: 오류는 항상 **검색 내비게이션 직후 ~0.3초**에만 났고
`/search` 초기 진입에서는 한 번도 나지 않았다.

* `/search` 는 PPR 대상이다(`next.config` `cacheComponents: true`, 빌드 산출물 `◐ /search`).
* 정적 셸은 **검색 파라미터 없이** 프리렌더되므로 입력값이 항상 빈 문자열이다.
* 그런데 `SearchClient` 가 `useState(searchParams.get('q'))` 로 초기 상태를 만들어,
  `/search?q=X` 진입 시 클라이언트 첫 렌더가 `value="X"` 가 되며 셸과 어긋난다.

**수정**: 첫 렌더는 서버·프리렌더와 동일한 값으로 두고 마운트 후 URL 과 동기화한다.

**회귀 방어 — 간헐 신호를 게이트로 삼지 않는다**: E2E 는 이 결함을 **간헐적으로만** 드러냈고
때로는 재시도로 통과해 flaky 로 묻혔다. 그런 신호로는 "고쳐졌는가"를 판정할 수 없다.
그래서 같은 불변식을 **결정적으로** 고정하는 단위 테스트를 신설했다
(`SearchClient.hydration.test.tsx`) — `renderToString` 으로 **effect 이전의 첫 렌더**를 잡아
검색 파라미터가 서버 HTML 에 새어 들어가지 않음을 단언한다.
(Testing Library 의 `render` 는 `act()` 로 effect 를 flush 해 이 시점을 볼 수 없다.)
수정을 되돌려 재현하니 정확히 그 1건만 red 가 됐다.

**파급**: 이 결함이 §11.3 의 샤드 3→2 최적화를 막고 있다고 적었으나 그 인과도 함께 정정된다 —
막고 있던 것은 샤드와 무관한 간헐 플레이크였다. 이제 그 값을 내리는 것을 막는 알려진 요인은
없으나, 실패가 간헐적이었던 만큼 **한 회차 green 이 증명은 아니므로** 별도 변경으로 분리해
관찰하며 내린다.

---

## 13. 변경 파일 (2026-08-11 추가분)

**백엔드**: `UserApiController.java` · `UserDto.java` · `UserValidationGroups.java`(신설) ·
`UserApiControllerTest.java` · `UserUpdateContractIntegrationTest.java`(신설)

**계약**: `api-docs.json` · `generated-api.d.ts` · `generated-zod.ts`

**게이트**: `.githooks/pre-push` · `build.gradle` · `baseline-manifest.properties` · `ci.yml`

**E2E**: `02-admin-system.spec.ts`
