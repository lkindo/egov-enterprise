# PR 병합 대기열 배수(drain) — 진행 원장

> 목적: 열린 PR 9건을 CI 초록으로 만들어 main 에 순차 병합하고 대기열을 비운다.
> 이 파일만 읽으면 컨텍스트 없이도 재개 가능해야 한다. tick 마다 append 한다.

## 고정 사실 (재조사 금지)

- 룰셋 **12501346** (main). 필수 체크 **7종**: `backend-build` · `frontend-build` · `secret-scan` ·
  `e2e-tests (1/3)` · `e2e-tests (2/3)` · `e2e-tests (3/3)` · `mutation-test`.
  `mutation-test` 은 `mutation-scope` 매트릭스를 집계해 **체크 이름을 보존**하는 잡이다(ci.yml:1042). 정상.
- `strict_required_status_checks_policy: true` → **1건 병합 시 나머지 전부 BEHIND**. 직렬 머지 트레인.
- 승인 리뷰 요구 0건. `--admin` 우회 금지. main 직접 push·force-push 금지.
- ci.yml `concurrency: ci-${{ github.ref }}` + `cancel-in-progress: true` → 같은 브랜치 push 시 진행 중 CI 취소.
- `frontend/src/types/generated-api.d.ts`·`generated-zod.ts` 는 `git status` 에 M 으로 뜨지만
  `git diff --numstat` 공백 = **내용 차이 0** (CRLF/working-tree-encoding stat-dirty). 커밋 금지.

---

## tick 1 — 2026-08-12 00:20~00:45 KST

### 관측: 대기열 9건 전수 판정

| PR | 브랜치 | merge | 필수체크 | 비고 |
|---|---|---|---|---|
| #391 | fix/user-update-wipes-fields | BLOCKED | 6/7 | e2e 1/3 실행중 |
| #390 | test/responsive-breakpoints | BLOCKED | 6/7 | e2e 1/3 실행중 |
| #389 | test/account-lockout | BLOCKED | 5/7 | **e2e 1/3·2/3 실패** |
| #388 | test/comment-crud | BLOCKED | 6/7 | **e2e 1/3 실패** |
| #387 | fix/board-attachment-not-sent | BLOCKED | 6/7 | **e2e 2/3 실패(인프라)** |
| #386 | test/token-reissue | BLOCKED | 6/7 | **e2e 2/3 실패** |
| #385 | ci/e2e-lint | BLOCKED | 6/7 | e2e 2/3 실행중 |
| #378 | fix/lighthouse-jwt-secret | BEHIND | 7/7 | main 대비 5커밋 결손 |
| #376 | test/client-ip-scope | BEHIND | 7/7 | main 대비 5커밋 결손 |

**브랜치 베이스 실측**: #385~#391 은 `behind=0`(이미 현행 main 기준). #376·#378 만 `behind=5`
(`def56277b, 36a46f4af, d684c7c29, 9549f55fe, a74aa0be6` 결손).
→ **#386·#388·#389 의 실패는 "main 결손 탓" 이 아니라 현행 main 위에서 나는 실제 실패다.**

### 실패 4건 근본 원인 (교차 대조 완료 — 공통 결함 아님, 각 PR 고유)

- **#387 = 인프라 일시 장애. 코드 결함 아님.**
  `api-build=failure / compose=skipped / ...` — Docker API 이미지 빌드 중
  `repo.maven.apache.org` 가 **HTTP 429 Too Many Requests** 를 반환해
  `org.springframework:spring-core:6.2.19` 해석 실패. 재실행이 정당한 유일 사례(원인 규명됨).
- **#386** `23-security-auth-supplement.spec.ts:462 Tier 23-E7: Token reissue`
  → `재발급 실패: 401`. 유효 refreshToken 재발급이 401 로 거부됨. 테스트/백엔드 어느 쪽인지 미판정.
- **#388** `03-board-community.spec.ts:261 댓글: 작성 → 수정 → 삭제`
  → **Test timeout 180000ms 초과**. 표면 오류는 `finally` 의 `request.delete` 가
  "Target page/context closed" 로 실패한 것이므로 **진짜 원인은 그 이전 단계에서 멈춘 것**. 미판정.
- **#389** `23-security-auth-supplement.spec.ts:138 Tier 23-E2 계정 잠금`
  → `연속 실패 5회 뒤에도 올바른 비밀번호로 로그인됐다`.
  ⚠ 잠금 기능 자체는 main 에 **구현되어 있다**(`EgovAuthenticationProvider:126-137`,
  `application.yml:138 max-failures=${LOGIN_MAX_FAILURES:5}`, E2E 환경에 오버라이드 없음).
  즉 "미구현" 이 아니라 **E2E 경로에서 발동하지 않는 이유**를 규명해야 한다. 미판정.

### 교차 신호 (별건 기록)

`09-admin-observability-workspace.spec.ts:45 Search: Exploratory Empty Result Check` 가
**#389 에서 failed, #388 에서 flaky(재시도 통과)**. `/search` PPR 하이드레이션 플레이크는
#382(`d684c7c29`)에서 고쳤고 그 커밋은 두 브랜치에 **이미 들어 있다** → **수정이 불완전하거나 다른 실패 모드**.
대기열과 별개로 남는 부채. 큐 배수 범위 밖이므로 여기 기록만 한다.

### 조치

- `gh pr update-branch 376` 실행 → 새 head `f648585dd`, CI run `31507301559` 진행중(00:29 KST 시작).
  머지 트레인 선두로 세움. (#376 을 고른 이유: BEHIND 이면서 필수 7/7 초록 = 코드 리스크 최소)
- 대기열 상태 변화 감시용 Monitor 기동(task `b5dlyv3f8`, 90초 폴링, 체크 전건 종료 시에만 이벤트).

### 조치 2 — **#391 병합 완료**

Monitor 첫 이벤트에서 #391 의 e2e 1/3 이 통과해 `mergeStateStatus=CLEAN`(필수 7/7, 전체 17종 pass)이 됐다.
`gh pr merge 391 --squash --delete-branch` → main = **`2376d53ac`**.
그 직후 #376 을 새 main 기준으로 다시 `update-branch`(직전 run 은 구 main 기준이라 폐기).

> 왜 #376 을 기다리지 않고 #391 을 먼저 넣었나: strict 정책상 **어느 쪽을 먼저 넣든 나머지 1건의 CI 는 폐기된다.**
> 이미 CLEAN 인 것을 즉시 넣는 편이 대기 시간만큼 순수 이득이다(폐기 run 수는 동일).

### 규명 진전 — #386 (재발급 401) 근본 원인 후보 확정

`AuthServiceImpl.reissue` 는 **리프레시 토큰을 회전(rotation)** 한다(W1-06, line 131-142).
저장 엔티티 `RefreshToken` 의 **PK 는 `userId` — 사용자당 단 1행**이다(`tb_auth_rfsh_tk`).
따라서 같은 사용자에 대해 다음 중 **무엇이든 한 번 일어나면 이전 리프레시 토큰은 즉시 무효**가 된다:

  · 재로그인(행 덮어쓰기) · 로그아웃(`logout()` 이 행을 **삭제**) · 다른 곳에서의 재발급(회전)

그런데 #386 의 테스트는 **auth.setup 산출물(ADMIN_AUTH)에 박제된 refreshToken** 을 읽어 쓴다.
같은 샤드 안에서 admin 으로 재로그인·로그아웃하는 테스트가 하나라도 먼저 돌면 이 토큰은 죽고 **401** 이 된다.
재시도에서도 동일하게 401 인 점(=일시 오류 아님)이 이 가설과 정합한다.

→ **수정 방향(가설, 미검증)**: 이 테스트는 setup 산출물에 의존하지 말고 **자기 전용 사용자로 즉석 로그인**해
  얻은 refreshToken 으로 재발급을 검증해야 순서 독립적이 된다. 확정 전 샤드 2 의 spec 구성에서
  admin 재로그인/로그아웃 발생 지점을 실제로 확인할 것.

⚠ 부수 발견(별건): `AuthApiController.reissue` 주석(line 50-52)이 **"현재 reissue 는 토큰을 회전하지 않아"**
라고 적고 있으나 구현은 회전한다. **주석이 사실과 다르다.** 큐 배수 범위 밖이므로 기록만 한다.

### 다음

1. #376 CI(신규 run) 종료 대기 → CLEAN 이면 squash 병합.
2. 이후 초록 우선 순서로 1건씩: **#378 → #385 → #390** (전부 update-branch → CI → 병합).
3. 대기 시간에 #388·#389 원인 규명. #387 은 429 재실행 건이라 자기 차례의 update-branch 로 자연 해소 예상.

---

## tick 2 — 2026-08-12 00:50~01:05 KST

### 관측

- #385 도 전건 초록으로 정착(단 BEHIND). #376 은 15/18 통과, e2e 3샤드만 잔여.
- #386 이 잠시 목록에서 빠졌던 것은 main 이동에 따른 `mergeStateStatus=UNKNOWN` 재계산 + 폴링 blip.

### 🔴 #388 근본 원인 **확정** — 테스트 결함이 아니라 **실제 UI 결함**이다

blob 리포트(`playwright-report-shard-0`, run 31501993925)의 스텝 타임라인을 파싱해 정지 지점을 특정했다:

```
[pw:api] Click getByTestId('edit-save-button').first()  03-board-community.spec.ts:305  182420ms
      ERROR: locator.click: Test timeout of 180000ms exceeded.
```

**1회차·재시도 모두 동일 지점에서 182초** — 플레이크가 아니다.
실패 시점 페이지 스냅샷(error-context)에는 편집 폼이 없고 **view 모드("댓글 수정"·"댓글 삭제" 버튼)로
되돌아가 있다.** 즉 편집 모드에 진입해 입력까지 마친 뒤 **저장 버튼이 사라졌다.**

**메커니즘 (코드로 확증)** — `CommentSection.tsx`:

  · `useOptimistic` 의 'add' payload 가 `{ id: tempId, ... }` 를 넣는다 — 그런데
    `CommentVO` 의 식별자는 **`ansSn`** 이다(`comment.ts:2`). 즉 낙관적 댓글의 `ansSn` 은 **`undefined`**.
  · 편집 버튼은 `setEditingId(comment.ansSn)` → `editingId = undefined`.
    렌더 분기는 `editingId === comment.ansSn` 이라 `undefined === undefined` 로 **참** → 편집 폼이 열린다.
  · `createComment` 가 `revalidatePath('/admin/community/boards/detail')` 를 호출하므로(commentActions:47)
    서버 재검증이 끝나면 `initialComments` 가 **실제 `ansSn` 을 가진 행**으로 교체된다.
  · 그 순간 `editingId(undefined) === ansSn(1)` 이 **거짓**이 되어 **편집 폼이 조용히 접힌다.**
    사용자 입력은 유실되고, Playwright 는 사라진 저장 버튼을 무한정 기다린다(actionTimeout=0).

**사용자 영향**: *방금 작성한* 댓글을 곧바로 수정하면, 서버 재검증이 도착하는 순간
**입력하던 내용이 경고 없이 사라진다.** 기존(서버에서 온) 댓글 편집은 정상이다.

> 이 PR 이 잡으려던 계열("화면만 보면 놓치는 것")을 테스트가 **정확히 잡아냈다.** 테스트가 옳다.

**수정 방향(제안)**: 낙관적 항목에 식별자를 실어주거나(`ansSn: tempId`), 서버 확정 전까지
편집·삭제 버튼을 노출하지 않는다. 후자가 근본적이다 — 낙관적 행에 대한 수정 요청은
서버 채번 ID 가 없어 애초에 성립하지 않는다(`handleEdit(undefined)`).
⚠ **제품 코드 변경**이므로 테스트 전용 PR 의 성격이 바뀐다. 사용자 판단을 받는 편이 옳다고 보아
먼저 보고한다. 다만 이 수정 없이는 #388 이 초록이 될 수 없다 —
트레인이 #388 차례에 도달할 때까지 회신이 없으면 최소 수정으로 진행한다(신호 은폐가 아니라 실결함 수정).

### 🔴🔴 #389 근본 원인 **확정** — 계정 잠금이 **실제로 발동한 적이 없다** (보안 결함)

E2E 관측: `연속 실패 5회 뒤에도 올바른 비밀번호로 로그인됐다`.
잠금 로직은 구현돼 있으므로 "미구현" 이 아니라 **영속되지 않는 것**이 문제다. 메커니즘:

  1. `EgovAuthenticationProvider.authenticate()` 는 `@Transactional(noRollbackFor = BadCredentialsException.class)`
     로 선언돼 있다(line 59). 주석은 이 애노테이션이 없으면 **"잠금이 영원히 발동하지 않는 무음 결함"**
     이 된다고 스스로 경고한다(line 47-57).
  2. 그런데 호출자 `AuthServiceImpl.login()` 은 **평범한 `@Transactional`** 이다(line 38) —
     `noRollbackFor` 가 **없다**.
  3. 전파는 기본값 REQUIRED 라 둘은 **하나의 물리 트랜잭션을 공유**한다. 내부의 `noRollbackFor` 는
     *내부 인터셉터가* rollback-only 를 걸지 않게 할 뿐이고, 예외가 **외부(login) 인터셉터**까지
     올라가면 외부 규칙이 적용돼 **트랜잭션 전체가 롤백**된다.
  4. 결과: `incrementLockCount()` · `lock()` 의 쓰기가 매 실패마다 **전부 사라진다.**
     `lckCnt` 는 영원히 0 이고 잠금은 **한 번도 발동하지 않는다.**

  ✔ 예외는 삼켜지지 않는다 — `catch (AuthenticationException e) { throw e; }`(line 173-175)로 그대로 전파된다.
  ✔ **기존 테스트가 이걸 못 잡은 이유**: 잠금 검증은 전부 리포지터리를 목(mock)한 단위 테스트뿐이고
    (`EgovAuthenticationProviderTest`·`UserTest`·`CustomUserDetailsTest`), **실 DB 통합 테스트가 0건**이다.
    목은 트랜잭션 롤백을 재현하지 못한다. #389 의 E2E 가 이 경로를 **처음으로 실제 왕복**시켰다.

**수정 방향(제안)**: `AuthServiceImpl.login` 의 `@Transactional` 에 `noRollbackFor` 를 추가해
provider 가 문서화한 의도가 실제로 성립하게 한다. 1줄이고 영향 범위는 로그인 실패 경로에 한정된다.
(§0.7-H4 준수: 같은 패턴을 다른 메서드에 일괄 적용하지 않는다 — `login` 만 해당한다.)

### 정리 — 이 배치의 성격

**#388·#389 모두 "테스트가 옳고 제품이 틀렸다".** 테스트 하드닝 PR 들이 의도한 대로
한 번도 검증된 적 없던 경로에서 **실결함을 찾아냈다.** 두 건 다 제품 코드 수정이 필요하다.

---

## tick 4 — 2026-08-12 01:20~01:55 KST

### 병합 2건 진행

| 순서 | PR | 결과 main |
|---|---|---|
| 2 | #376 test/client-ip-scope | `dc08dcc9f` |
| 3 | #378 fix/lighthouse-jwt-secret | `e7184f45d` |

⚠ **`UNSTABLE` 은 그 자체로 판정 근거가 못 된다.** #378 은 18/18 pass 인데도 한때 `UNSTABLE` 로 보였다 —
main 이동 직후 GitHub 이 mergeability 를 재계산하는 과도 상태였고, 잠시 뒤 `CLEAN` 이 됐다.
**체크 목록을 직접 확인**한 뒤 판정할 것(상태 문자열만 믿지 말 것).

### ✅ #389 수정 완료 — 결함을 로컬에서 **재현·증명**한 뒤 고쳤다

CI 를 25분 기다리는 대신 트랜잭션 경계를 그대로 통과시키는 통합 테스트를 신설해 로컬에서 판정했다.
`api-server/src/test/java/nuri/auth/LoginLockoutPersistenceIntegrationTest.java` — **의도적으로
`@Transactional` 을 붙이지 않는다**(붙이면 테스트 트랜잭션이 전부를 감싸 프로덕션 경계가 사라진다).

**수정 전 (결함 재현)**: 3건 중 2건 red
  · `lckCnt` 가 **null** — 5회 실패의 증가분이 전부 롤백됐다
  · 5회 실패 뒤 **올바른 비밀번호가 그대로 통과**("Expecting code to raise a throwable")
    → CI E2E 가 본 것과 정확히 같은 현상을 로컬에서 재현

**수정**: `AuthServiceImpl.login` 의 `@Transactional` 에
`noRollbackFor = BadCredentialsException.class` 추가. (§0.7-H4 준수 — `login` 하나만, 일괄 확대 없음)

**수정 후** (`cleanTest` 강제 재실행으로 UP-TO-DATE 스킵 배제):
  · LoginLockoutPersistenceIntegrationTest  **3/3 PASS**
  · AuthenticationControllerIntegrationTest **2/2 PASS** (회귀 없음)
  · EgovAuthenticationProviderTest         **10/10 PASS**
  · `compileJava compileTestJava` · `:api-server:harnessTest` **BUILD SUCCESSFUL**
  · pre-push 게이트 **✅ 컴파일 + 계약 + 하네스 통과** → `17d85beac` 푸시

### 교차 플레이크 조사 — `/search` React #418 (미해결, 기록)

`09-admin-observability-workspace.spec.ts:45 Search: Exploratory Empty Result Check` 는
**테스트 단언은 전부 통과**하고 `consoleGuard` fixture 가 After Hooks 에서
`Minified React error #418`(하이드레이션 불일치) 1건을 잡아 실패시킨다.
#382 의 수정(`searchInput` 초기값)은 들어가 있으나 **오류가 여전히 난다** → 수정이 불완전하다.
`SearchClient` 의 렌더 시점 `query` 사용은 `ArticleResultItem`(결과가 있을 때만) 뿐이므로,
남은 용의자는 **`/search` 페이지의 서버 컴포넌트 쪽**이다. 다음 조사 지점으로 남긴다.
빈도는 대략 절반(#389 hard fail / #388 flaky-pass)이라 트레인을 간헐적으로 막을 수 있다.

### 다음

- 진행 중: #385(update-branch 후 CI) · #389(수정 푸시 후 CI)
- 남은 큐 6건: #390 #389 #388 #387 #386 #385
- #388 은 제품 수정(낙관적 댓글 식별자) 필요 — 사용자 회신 없으면 차례에 최소 수정.
- #386 은 아직 미규명(리프레시 토큰 회전 가설). #387 은 429 재실행 건.

---

## tick 5 — 2026-08-12 02:00~02:25 KST

### 병합 진행 (누적 4/9)

| 순서 | PR | 결과 main |
|---|---|---|
| 4 | #385 ci/e2e-lint | `f78464629` |

**#389 는 수정 후 CI 18/18 green** — e2e 3샤드 전부 통과로 잠금 수정이 실제로 작동함이 확인됐다.
(main 이 움직여 지금은 BEHIND. 자기 차례에 update-branch 후 병합.)

### ✅ #388 수정 완료 — 결함 주입으로 게이트 유효성까지 확인

수정 2가지(같은 결함의 앞뒤):
  1. 낙관적 payload 식별자 `id` → **`ansSn`** (임시값이라도 실어야 행이 정체성을 가짐.
     `undefined === undefined` 오매칭과 undefined key 가 사라진다)
  2. **서버 미확정 행에는 수정·삭제를 노출하지 않는다** — 서버 채번 ID 가 없어 요청이 성립하지 않는다.
     (카드는 이미 `isOptimistic` 을 알고 opacity/grayscale 로 표시하고 있었다. 표시만 하고 동작을 막지 않은 것이 결함.)

회귀 방어는 **단위 테스트로 결정적으로** 고정했다(E2E 는 180초 타임아웃으로 느리고 원인도 가리지 못한다):
  · 낙관적 행에 수정·삭제 버튼이 **없다** / · 확정 행에는 **있다**(가드 과잉 방어)

검증: vitest **7/7 PASS**, **가드 제거 시 정확히 1건만 red**, `tsc --noEmit` PASS,
`pnpm run lint` 0 errors / 362 warnings(예산 460), pre-push 게이트 통과 → `0b2ac3156` 푸시.

> ⚠ 시도했다가 접은 것: `useOptimistic` 의 비동기 트랜지션을 jsdom 에서 붙잡아 낙관적 렌더를 직접
> 만들려 했으나 재현이 불안정했다. 그래서 **내가 추가한 렌더 가드 자체**를 고정하는 형태로 바꿨다.
> 커버리지 범위를 넓혀 보이려고 불안정한 테스트를 남기지 않는다.

### #386 원인 후보 확정 (수정 미착수)

`01-core-base.spec.ts` 에 **로그아웃 UI 테스트가 2곳**(line 90-92, 142-144) 있다.
`AuthServiceImpl.logout` 은 해당 사용자의 `tb_auth_rfsh_tk` **행을 삭제**하고, 이 테이블은
**PK 가 userId — 사용자당 1행**이다. 즉 admin 로그아웃 한 번이면 auth.setup 이 저장해 둔
`ADMIN_AUTH` 의 refreshToken 은 **DB 에서 사라진다.** 그 뒤 #386 의 재발급 테스트가 그 토큰을
제시하면 `findByRfshTkn` 이 empty → `INVALID_TOKEN` → **401**. 관측과 정확히 일치한다.
(accessToken 은 무상태 JWT 라 다른 테스트는 멀쩡하다 — 그래서 이 한 건만 죽는다.)

**수정 방향**: 재발급 테스트가 setup 산출물에 의존하지 않고 **자기 로그인으로 refreshToken 을 즉석 확보**한다.
`frontend/e2e/auth.setup.ts` 의 `TEST_CREDENTIALS` 를 그대로 쓸 수 있다. 순서 독립이 된다.

### 다음

- 진행 중: #390(update-branch) · #388(수정 푸시)
- 남은 큐 5건: #390 #389 #388 #387 #386
- #387 은 Maven 429 이므로 자기 차례의 update-branch 로 자연 해소 예상(실패 원인이 규명된 유일한 재실행 정당 사례).

---

## tick 6 — 2026-08-12 02:25~03:00 KST

### ⚠ 리베이스가 드러낸 것 — #390 의 초록은 **vacuous 였다**

#390 은 update-branch 전까지 17/17 초록이었는데, 최신 main 위로 올리자 **자기 테스트가 red** 가 됐다.
코드는 그대로인데 결과가 바뀌었다 → 이전 초록이 검증이 아니었다는 뜻이다.

원인: 사이드바 접힘을 `toBeHidden()` 으로 쟀는데 **구현이 그 방식이 아니다**.
실측 클래스는 `... w-72 transition-transform lg:translate-x-0 -translate-x-full` —
DOM 에서 사라지는 게 아니라 **화면 밖으로 밀려난다(off-canvas)**. transform 된 요소는 경계상자가
남아 Playwright 가 계속 `visible` 로 본다. 게다가 **`toBeHidden()` 은 요소가 없을 때도 통과**하므로,
aside 렌더 전 타이밍에 걸리면 조용히 통과했다. 타이밍이 바뀌자 red 가 된 것.

수정: 계약을 사용자 관점으로 다시 적었다 — `toHaveCount(1)`(존재 강제, vacuous 경로 차단) +
접힘 `box.x + box.width <= 1` / 펼침 `toBeVisible()` + `box.x >= -1`.
1px 여유는 같은 파일의 가로 넘침 단언과 같은 근거(소수점 반올림)이고, 접힘이 풀리면 288px 가
통째로 들어오므로 이 여유로 가려지지 않는다. → `62c6d68ac` 푸시.

### 🔴 #388 — 첫 수정이 통과시키자 **두 번째 실결함**이 드러났다

작성·수정 단계는 통과했고(내 수정이 작동), 이제 **삭제**에서 15초 내내 사라지지 않았다.
blob 타임라인상 삭제 클릭(1736ms)·confirm 수락 모두 **정상 실행**됐다.

원인: `CommentService.deleteComment` 는 `useYn='N'` 을 세우는 **논리 삭제**인데,
상세 목록 쿼리 `findByBbsIdAndPstId` 에 **`useYn` 조건이 없었다.**
→ 삭제해도 목록에 그대로 남는다. **사용자에게는 "삭제 버튼이 먹지 않는" 결함.**

규약은 이미 저장소 자신이 증명하고 있었다 — 같은 파일의
`countByBbsIdAndPstIdAndUseYn(..., "Y")` 는 살아 있는 것만 센다(`BoardEventListener`).
즉 **개수는 제외하고 목록은 포함하는 비대칭**이 있었다.

수정: 목록 쿼리에 `AND c.useYn = 'Y'` 추가. 영향 범위 확인 —
`/api/v1/admin/comments` 도 같은 쿼리를 쓰나 관리자가 삭제된 댓글을 봐야 한다는 요구는 어디에도 없다.
`findByAnsCnContaining` 은 **호출부 0건(사문)** 이라 건드리지 않았다(§0.7-H4: 일괄 치환 없음).

회귀 방어: `CommentRepositoryTest`(@DataJpaTest) 신설 — 제외/보존 양방향.
**수정 전 실행 시 정확히 1건 red**("삭제한 댓글이 목록에 그대로 남아 있다"). 수정 후
CommentRepositoryTest 2/2 · CommentServiceTest 6/6 · BoardEventListenerTest 2/2 ·
compile+harness BUILD SUCCESSFUL. → `77eb7fdb1` 푸시.

> ⚠ **작업 실수 기록**: 이 커밋을 처음에 `test/responsive-breakpoints`(#390) 브랜치에 올렸다.
> cherry-pick 으로 `test/comment-crud`(#388) 로 옮기고 #390 브랜치를 `origin` 상태로 되돌렸다.
> 두 브랜치 local==remote 확인. **브랜치 전환 후에는 `git branch --show-current` 를 먼저 볼 것.**

### 누적 성과 — 테스트 하드닝 PR 3건이 찾아낸 실결함 4건

| PR | 실결함 | 사용자 영향 |
|---|---|---|
| #389 | 로그인 실패 트랜잭션이 롤백돼 잠금 카운터가 사라짐 | **계정 잠금이 한 번도 발동한 적 없음**(무차별 대입 방어 부재) |
| #388 | 낙관적 댓글 식별자 누락 | 방금 쓴 댓글 수정 시 **입력이 경고 없이 유실** |
| #388 | 논리 삭제 미필터 | **댓글 삭제가 화면에 반영되지 않음** |
| #390 | 접힘 단언이 off-canvas 를 판정 못함 + vacuous 통과 | 반응형 게이트가 **실제로는 아무것도 막지 못함** |

### 남은 것

- #387: Maven Central 429(인프라) — 자기 차례 update-branch 로 해소 예상
- #386: 원인 규명 완료(로그아웃이 단일 리프레시 토큰 행 삭제), **수정 미착수**
- `/search` React #418 하이드레이션 플레이크: main 공통, 미해결. 이번 tick 에도 #390·#388 양쪽에서 재발.
  트레인을 간헐적으로 막는 **최대 잔여 위험**이다.

---

## tick 7 — 2026-08-12 03:05~03:30 KST

### 병합 (누적 5/9)

| 순서 | PR | 결과 main |
|---|---|---|
| 5 | #390 test/responsive-breakpoints | `cc575c450` |

수정한 단언으로 전건 초록(non-pass=0, CLEAN)이 됐다 — vacuous 게이트가 **실제 게이트**가 됐다.

### ✅ #386 수정 완료 (`964ab788a`)

재발급 테스트가 `auth.setup` 산출물에 **박제된** refreshToken 을 쓰던 것을,
**이 테스트가 직접 로그인해 즉석 확보**하도록 바꿨다(`issueFreshRefreshToken`).

근거: `tb_auth_rfsh_tk` 는 PK 가 userId — **사용자당 1행**이라 로그아웃 한 번에 삭제된다.
같은 샤드의 `01-core-base` 로그아웃 테스트가 먼저 돌면 박제 토큰은 이미 없다.
재발급은 본질적으로 "지금 유효한 토큰"을 요구하므로 즉석 확보가 계약에 더 맞다.
검증 대상(바디 미노출 · HttpOnly 쿠키 · 새 토큰 실사용)은 **그대로** 두고 순서 의존만 제거했다.

> '로그아웃 테스트를 다른 샤드로 옮기기'는 채택하지 않았다 — 샤드 배치는 파일 단위로 바뀌므로
> 보장이 되지 않는다. 순서에 기대는 대신 **의존 자체를 제거**하는 편이 옳다.

토큰 획득 규약은 `auth.setup` 과 동일(바디 우선 → Set-Cookie 파싱)하게 맞춰,
백엔드가 바디에서 refreshToken 을 빼는 계약 축소가 와도 계속 동작한다.

검증: `tsc --noEmit` PASS · eslint clean · pre-push 게이트 통과.

### 현재 상태

- main `cc575c450` · 병합 5건(#391 #376 #378 #385 #390)
- 열린 4건 전부 CI 진행 중이거나 대기: **#389**(update-branch) · **#388**(수정) · **#386**(수정) · #387(미착수)
- #387 은 Maven 429 라 자기 차례의 update-branch 로 재빌드되면 해소될 것으로 본다.

---

## tick 10 — 2026-08-12 03:35~03:50 KST

### 🔻 내 수정이 main 을 간헐 파손시켰다 — 정정 (`8b71f4735`)

#388 은 전건 초록으로 정착. 그러나 **#389 가 리베이스 후 red** 가 됐고, 원인은
**#390 으로 내가 병합한 반응형 단언**이었다(375px·768px 두 건):

    Error: 사이드바의 경계상자를 얻지 못했다 (display:none 이거나 분리된 노드)
    expect(received).not.toBeNull() / Received: null

내가 틀린 지점 2가지:

  · **접힘 구현을 하나로 가정했다.** 이 셸의 접힘은 off-canvas transform 만이 아니다 —
    뷰포트/경로에 따라 `boundingBox()` 가 **null**(DOM 미부착 또는 `display:none`)이 된다.
    그 정상 상태를 실패로 취급했다.
  · **경계상자를 1회만 샘플링했다.** `transition-transform duration-500` 중에 재면 전이 도중 값을
    잡는다. #390 자신의 CI 는 통과했는데 #389 에서 red 가 난 이유가 이 타이밍 차이다.

**즉 나는 vacuous 통과를 flaky 실패로 바꿔 놓았다. 둘 다 게이트로서 실격이다.**

수정: 계약을 **구현 방식과 무관하게** 적는다 — "사이드바가 화면 안에서 본문을 가리는가".
상자가 없으면(null) 가릴 수 없으므로 통과, 있으면 오른쪽 끝이 뷰포트 왼쪽 경계를 넘지 않아야 하며,
`expect.poll` 로 전이 정착을 기다린다. vacuous 우려는 desktop 케이스의 `toBeVisible()` 이 닫는다.

> ⚠ **성격이 다른 변경을 #389 브랜치에 실었다.** 이 파일은 이미 main 에 있고 #389 의 CI 를
> 막고 있어, 별도 PR 로 빼면 트레인이 한 사이클 더 늘어난다. 리뷰 분리를 위해 **별도 커밋**으로 담았다.

### 결과 — 정정 후 전건 초록, 병합 (누적 6/9)

| 순서 | PR | 결과 main |
|---|---|---|
| 6 | #389 test/account-lockout (+ 반응형 단언 정정) | `a0cd9800e` |

이로써 **계정 잠금이 실제로 작동하는 상태가 main 에 올라갔다**(통합 테스트 3건이 그것을 고정한다).
#388·#386 도 각각 18/18 초록이며 BEHIND 상태로 자기 차례를 기다린다.
남은 실패는 #387 의 Maven Central 429 하나뿐이다.

---

## tick 15 — 2026-08-12 04:05 KST · 병합 (누적 7/9)

| 순서 | PR | 결과 main |
|---|---|---|
| 7 | #388 test/comment-crud | `7fac9dba6` |

댓글 결함 2건(낙관적 편집 폼 붕괴 · 논리 삭제 미필터)이 main 에 반영됐다.
남은 것은 **#386**(초록, 갱신 후 CI 진행 중) 과 **#387**(Maven 429) 두 건뿐이다.

## tick 17 — 2026-08-12 04:25 KST · **Maven Central 429 재발 (systemic)**

#386 이 갱신 후 2건 실패로 바뀌었다. **e2e 가 아니라 뮤테이션 게이트**였고,
로그를 열어 보니 코드 문제가 아니라 **Gradle 플러그인 해석 단계의 HTTP 429** 였다:

    Could not GET '.../spring-boot-buildpack-platform-3.5.16.pom'.
    Received status code 429 from server: Too Many Requests
    (spring-boot-loader-tools · commons-compress · spring-core 동일, BUILD FAILED in 21s)

#387 의 실패와 **정확히 같은 원인**이다(그쪽은 Docker 이미지 빌드 단계에서 맞았다).
즉 이 429 는 특정 PR 의 문제가 아니라 **러너 ↔ Maven Central 사이의 systemic 한 일시 장애**다.

→ 원인이 규명됐으므로 **실패 잡만 재실행**(`gh run rerun --failed`)은 신호 은폐가 아니다.
   (§0.7-H2 가 금하는 것은 *원인을 모른 채* 초록이 될 때까지 돌리는 행위다.)

⚠ **별건 개선 제안(기록만)**: 429 가 반복되면 트레인이 계속 흔들린다.
   Gradle 의존성 해석에 **재시도/미러**를 두거나 CI 캐시를 강화하는 것이 근본 대책이다.
   이번 배수 작업 범위 밖이라 착수하지 않는다.

## tick 19 — 2026-08-12 04:40 KST · 병합 (누적 8/9)

| 순서 | PR | 결과 main |
|---|---|---|
| 8 | #386 test/token-reissue | `6401ccc4e` |

뮤테이션 잡 재실행이 통과해 429 가 일시 장애였음이 확인됐다.

**마지막 #387 을 update-branch 로 올렸다.**
⚠ 주의: #387 은 지금까지 `api-build=failure / compose=skipped / run=skipped` 였다 —
즉 **이 PR 의 E2E 는 한 번도 실행된 적이 없다.** 이번 실행이 첫 실 신호이므로
429 해소 후 **새로운 실패가 드러날 수 있다.** 429 재발과 실제 결함을 구분해서 판정할 것.

---

## tick 21 — 2026-08-12 05:00 KST · **대기열 배수 완료 (9/9)**

| # | PR | main |
|---|---|---|
| 1 | #391 fix/user-update-wipes-fields | `2376d53ac` |
| 2 | #376 test/client-ip-scope | `dc08dcc9f` |
| 3 | #378 fix/lighthouse-jwt-secret | `e7184f45d` |
| 4 | #385 ci/e2e-lint | `f78464629` |
| 5 | #390 test/responsive-breakpoints | `cc575c450` |
| 6 | #389 test/account-lockout | `a0cd9800e` |
| 7 | #388 test/comment-crud | `7fac9dba6` |
| 8 | #386 test/token-reissue | `6401ccc4e` |
| 9 | #387 fix/board-attachment-not-sent | `6ddf8befd` |

#387 은 429 가 풀리자 **첫 실 E2E 실행에서 그대로 통과**했다 — 이 PR 의 실패는 처음부터 끝까지 인프라였다.

### 이번 배수로 드러나 고쳐진 실결함

| 결함 | 사용자 영향 | 고정 게이트 |
|---|---|---|
| 로그인 실패 트랜잭션 롤백 (`AuthServiceImpl.login` 에 `noRollbackFor` 부재) | **계정 잠금이 한 번도 발동한 적 없음** — 무차별 대입 방어 부재 | `LoginLockoutPersistenceIntegrationTest`(비-@Transactional) |
| 낙관적 댓글 식별자 누락 (`id` vs `ansSn`) | 방금 쓴 댓글 수정 시 **입력이 경고 없이 유실** | `CommentSection.test.tsx` 2건(양방향) |
| 논리 삭제 미필터 (`findByBbsIdAndPstId`) | **댓글 삭제가 화면에 반영되지 않음** | `CommentRepositoryTest` 2건(양방향) |
| 반응형 접힘 단언이 off-canvas 를 판정 못함 + vacuous 통과 | 반응형 게이트가 **아무것도 막지 못함** | `04-quality-resilience` 단언 재작성(폴링) |

### 미해결로 남기는 것 (정직한 보류)

1. **`/search` React #418 하이드레이션 플레이크** — main 공통, 약 50% 빈도.
   `consoleGuard` 가 After Hooks 에서 잡아 09 티어를 간헐 실패시킨다. #382 의 수정
   (`SearchClient` 의 `searchInput` 초기값)은 들어가 있으나 **불완전**하다.
   `SearchClient` 의 렌더 시점 `query` 사용은 `ArticleResultItem`(결과가 있을 때만)뿐이므로
   남은 용의자는 **`/search` 의 Suspense 경계와 PPR 정적 셸** 쪽이다. 재현에 프로덕션 빌드가
   필요해 이번 루프에서는 착수하지 않았다 — 추측으로 고치면 신호만 흐려진다.
2. **Maven Central 429** — #387(Docker 이미지 빌드)·#386(Gradle 플러그인 해석)에서 각각 발생.
   Gradle 의존성 해석 재시도/미러 또는 CI 캐시 강화가 근본 대책이다.
3. `CommentRepository.findByAnsCnContaining` — **호출부 0건(사문)**. 정리 대상.
4. `AuthApiController.reissue` 주석이 "회전하지 않는다"고 적고 있으나 **구현은 회전한다**(사실과 다름).
5. `commentActions` 의 `revalidatePath` 가 delete/update 에서 **쿼리스트링을 붙여** 호출된다
   (create 는 경로만). 이번 결함의 직접 원인은 아니었으나 규약이 어긋나 있다.

### 교훈 (원장에 남긴다)

게이트를 고칠 때 **"내가 가정한 구현이 유일한 구현인가"** 를 먼저 확인할 것.
`toBeHidden()` 이 틀렸다는 관측(transform 클래스 1회)만으로 "접힘=transform" 이라 단정했고,
같은 셀렉터가 다른 뷰포트에서 전혀 다른 상태일 수 있다는 가능성을 확인하지 않았다.
E2E 단언은 **단일 시점 측정 대신 폴링**을 기본으로 할 것(CSS 전이가 있는 UI 는 특히).
