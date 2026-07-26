# E2E 전수 실패 인벤토리 (로컬 CI 재현 기준)

- **일자**: 2026-07-27
- **등급**: L2 (앱·테스트·인프라 3계층에 걸친 다건 결함)
- **측정 조건**: CI와 동일 스택을 로컬에 재현 — 신규 `postgres:17` 컨테이너 + 최신 시드 반영 api 이미지 +
  프론트 **프로덕션 빌드**(`next build` → `next start -p 3001`) + 백엔드·프론트 **대칭 JWT_SECRET**.
  `--project=full-suite`(28개 프로젝트 중 중복 없는 전 스펙), `retries: 0`.

## 결과

```
23 failed · 1 skipped · 89 passed   (43.5m)
```

**의미**: 신규 DB 환경에서 **약 79% 통과**다. 직전까지는 인프라 문제로 *한 건도 실행되지 못했다*
(compose v1 → Dockerfile 정체 → gradlew 실행비트 → actuator 기대값 → dev 인자 → 계정/게시판 시드 →
JWT 대칭, 7단계). 남은 23건은 **테스트 계층**의 문제이며 인프라 문제가 아니다.

## 유형별 집계

| 유형 | 건수 | 성격 | 주체 |
|---|:---:|---|---|
| 요소없음(셀렉터/렌더) | 7 | 앱 UI 변경 미반영 또는 데이터 부재 | 대부분 테스트 |
| 타임아웃 | 4 | 흐름 중단(선행 데이터·모달 대기) | 테스트/데이터 |
| 콘솔 가드 | 4 | 앱이 콘솔 오류를 남김 | **앱** |
| a11y 위반(axe-core) | 3 | color-contrast·nested-interactive·label 등 | **앱** |
| 값 불일치(메일 3건) | 3 | 발송 결과 검증 — SMTP 미비 | **인프라** |
| 비주얼 기준선 | 1 | 신규 환경에 baseline 스냅샷 없음 | 결정 필요 |
| 중복 요소(strict) | 1 | `부서 검색` 입력이 3개 매칭 | **앱 or 테스트** |

## 개별 목록

| # | 유형 | 테스트 |
|:--:|---|---|
| 1 | 요소없음 | Widgets and Charts Rendering |
| 2 | a11y | Accessibility Audit for Admin Dashboard |
| 3 | 타임아웃 | Create-Search-Update-Delete Flow |
| 4 | 요소없음 | Event Operations: Full Event Lifecycle |
| 5 | 콘솔가드 | CRUD Flow for General List |
| 6 | 콘솔가드 | Community of Practice (COP) Matrix Verification |
| 7 | 요소없음 | Optimistic UI: Post Like/Reaction |
| 8 | a11y | Accessibility Audit (axe-core) |
| 9 | 비주얼 | Visual Regression Baseline |
| 10 | 콘솔가드 | Online Poll Full Lifecycle |
| 11 | 타임아웃 | Admin: Configure Layer Popup |
| 12 | 콘솔가드 | Business Logic: One Person One Vote |
| 13 | 요소없음 | Admin: Navigate and Verify Departmental Jobs |
| 14 | 타임아웃 | Collaboration: Register New Identity Node (Address Book) |
| 15 | 요소없음 | Intelligence: Dashboard Interaction & Excel Export |
| 16 | 값불일치 | should send a mail and verify it in history |
| 17 | 값불일치 | should search and delete a mail from history |
| 18 | 값불일치 | Mail: Multi-recipient Dispatch |
| 19 | 요소없음 | Mail: Invalid Email Address Validation |
| 20 | 타임아웃 | should verify system topology visualization |
| 21 | 요소없음 | Department Topology Tree (Hub) |
| 22 | strict | Dept Hierarchy D&D — 가로 드래그 상위 부서 변경 저장 |
| 23 | a11y | [documented contract] non-sensitive admin route is NOT redirected |

## 확정된 앱 결함 (테스트 문제가 아님)

1. **`[BoardRegistClient] Submit error thrown: TypeError: Failed to fetch`** (콘솔가드 4건의 공통 원인 후보)
   게시글 등록 클라이언트가 fetch 실패를 잡아 콘솔에 남긴다. 프로덕션 빌드에서도 재현되므로
   *next-dev Server-Action 플레이키*(기존 기록)와는 **다른 사안**이다. 요청 대상/CSRF 토큰/프록시 경로를
   확인해야 한다.
2. **a11y 위반 3건** — `color-contrast`·`nested-interactive`(= CI 로그의 "nested button")·`label`·
   `heading-order`·`aria-*` 계열. E2E 가 axe-core 로 강제하므로 앱을 고쳐야 통과한다.
   `nested-interactive` 는 CI 개발모드 콘솔 경고와 동일 뿌리다.
3. **`부서 검색` 입력 3개 중복 매칭** — 동일 `aria-label` 요소가 한 화면에 3개다. 접근성상으로도
   중복 라벨은 결함이며, 테스트 셀렉터를 좁히는 것으로 덮으면 원인이 남는다.

## 인프라 갭

- **메일 3건**: `docker-compose.yml` 에 SMTP 서비스가 없다. 발송 결과를 검증하는 테스트는
  MailHog/Mailpit 같은 캡처 서버 없이는 CI 에서 통과할 수 없다.
- **비주얼 기준선 1건**: 신규 환경에 baseline 스냅샷이 없다. baseline 을 저장소에 커밋할지(OS/폰트 차이로
  러너-로컬 불일치 위험), CI 전용으로 생성할지 결정이 필요하다.

## 권고 순서

1. **앱 결함 3종**(fetch 실패 · a11y · 중복 라벨) — 사용자 가치가 직접 걸린 항목. 콘솔가드·a11y 7건이 여기서 해소된다.
2. **셀렉터/데이터 11건** — 03 스펙과 같은 방식(로컬 재현 + 스크린샷 판정)으로 개별 처리. 하드코딩된
   `pstId` 류는 **자체 생성으로 전환**한다(시드로 풀면 누적 쓰레기가 재발한다).
3. **메일 인프라** — compose 에 Mailpit 추가 여부 결정.
4. **비주얼 기준선** — 정책 결정 후 생성.

> 그 전까지 E2E 잡은 red 로 남는다. **CI 를 억지로 그린으로 만들기 위해 `continue-on-error` 를 붙이지
> 않는다** — 그것은 게이트인 척하는 스텝을 만드는 일이고(§0.7-H5), 이 저장소에서 이미 정리한 안티패턴이다.

---

## 처리 이력

### ✅ 해소: 게시글 등록 409 (소프트 삭제 필터 ↔ 유니크 제약 불일치)

콘솔가드 4건의 공통 원인으로 지목했던 `Failed to fetch` 를 추적한 결과, **앱의 실제 운영 결함**이었다.

```
브라우저 "Failed to fetch" → Next 서버 로그 409 C008
  → api 로그 duplicate key "uk_tb_bbs_item_thread_pos"
    → 제약 = UNIQUE(bbs_id, sort_ordr, ans_sn)
      → Board 엔티티 @Filter(softDeleteFilter) 가 MAX 집계에서 숨김 행을 제외
```

숨김(use_yn='N') 행은 **제약에는 잡히지만 JPQL MAX 에는 안 잡힌다.** 그래서 상위 순번 글이 숨김
처리되면 신규 글이 이미 점유된 순번을 받아 **영구 409**. `findMaxSortOrdr`/`findMaxAnsSn` 을
네이티브 쿼리로 전환해 해소(커밋 `c62e59b8c`). 검증: duplicate key 0건 · 신규 글 sort_ordr=5 생성.

### ❌ 잔존: Server Action 응답이 클라이언트에 도달하지 못함 (신규 분리 항목)

409 해소 후에도 콘솔가드 3건은 남는다. 성격이 **완전히 다른 문제**임이 드러났다:

- 서버는 **성공**한다 — 글이 DB 에 정상 생성됨(`pst_id=10`)
- 그런데 브라우저는 해당 Server Action POST 를 `net::ERR_ABORTED` 로 기록하고
  `saveBoardArticle` 의 await 가 `TypeError: Failed to fetch` 로 거절됨
- 결과: **저장은 됐는데 UI 는 "등록 중 오류" 토스트를 띄우고 목록으로 이동하지 않는다**

사용자 관점 영향: 성공을 실패로 오인해 **재시도 → 중복 등록** 위험. E2E 는 이동 후 `pstId` 추출에
실패해 red 로 남는다.

관측된 사실: 같은 요청에 대해 `200` 응답과 `ERR_ABORTED` 가 동시에 기록된다. 즉 응답이 시작된 뒤
연결이 끊긴다. 다음 후보를 순서대로 확인해야 한다 — ① 폼의 네이티브 submit 과 action fetch 경쟁
② 액션 중 발생하는 소프트 네비게이션/리렌더로 인한 abort ③ CSP·프록시 계층의 스트리밍 차단.

### ⚠ 판정 보류: 게시글 등록 콘솔 오류 — 격리 재현 불가(부하 의존 flaky)

409 해소 후 남은 `03-board-community` 3건은 **모두 같은 콘솔 오류 하나**에서 온다:
`[BoardRegistClient] Submit error thrown: TypeError: Failed to fetch`.

**측정 사실**
- 액션 POST 는 **1회**만 발생하고 `200` 을 받는다 → 중복 제출 아님
- **DB 쓰기는 항상 성공**한다(진단 14회 전부 게시글 생성 확인)
- 브라우저는 같은 POST 를 `net::ERR_ABORTED` 로도 기록한다 = 응답 스트림이 중간에 끊김
- **격리 재현 14회(4+10) 전부 정상** — 콘솔 오류 0건. 전체 스펙 실행에서만 발현

**기각된 가설**
- 중복 제출(POST 1회로 확인) · WebSocket 기반 `router.refresh()`(전부 사용자 클릭 트리거) ·
  "성공 후 우리 `router.push` 가 스트림을 끊는다"(실패 시 프로미스가 거절되므로 성공 분기의 push 는
  실행되지 않는다 → **논리적으로 성립 불가**. 초기 가설을 철회했다)

**따라서 서버측 `redirect()` 전환(A안)은 보류한다.** 그 처방은 "우리 push 가 원인"이라는 전제에
의존하는데 그 전제가 반증됐다. 전제 없는 리팩터는 이 저장소가 배제하는 패턴이다(§0.7-H1).

**CI 관점**: `retries: process.env.CI ? 2 : 0` 이므로 CI 에서는 재시도로 통과할 가능성이 높고,
그 경우 **flaky 로 표시되되 잡을 실패시키지 않는다**. 로컬(retries 0)에서만 red 로 보인다.
→ 실제 flake 율은 CI 리포트의 flaky 집계로 관측한 뒤 판단하는 것이 비용 대비 정확하다.

**다음 조사 방법(필요 시)**: 전체 스펙 실행에 `--trace on` 을 걸어 실패 회차의 trace 를 확보하고,
abort 직전 이벤트(네비게이션 주체·요청 취소자)를 trace 뷰어로 특정한다.
