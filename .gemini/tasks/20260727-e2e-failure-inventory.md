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

---

### ✅ 잔여 4건 마감 (#7 · #9 · #13 · #23) — 커밋 `d975b1d2c`

인벤토리의 마지막 묶음. **넷 다 앱 결함이 아니라 테스트 드리프트**였다.

| # | 실체 | 처방 |
|:--:|---|---|
| 7 | `pstId=1108` 하드코딩이 신규 DB 에 없음 | 검증용 글을 테스트가 **직접 생성** |
| 9 | 기준선이 `…-win32.png` — 러너(ubuntu)와 OS 불일치 | **CI(리눅스) 전용**으로 고정, 로컬은 skip |
| 13 | 소유 스코프 도입으로 빈 문구가 분기됐는데 낡은 문구를 대기 | 업무를 **직접 생성**해 목록 렌더를 검증 |
| 23 | 미들웨어가 deny-by-default 로 강화됐는데 강화 **이전** 계약을 박제 | 현행 계약을 **양방향**으로 고정 |

**#13 은 종전 단언이 "빈 목록에서만 통과"하는 형태였다** — `/식별된 데이터 유닛이 없습니다|부서: /`
는 데이터가 있으면 오히려 실패한다. 자체 생성으로 바꾼 뒤 **담당자를 타인으로 바꾸는 위반 주입**으로
red 를 확인해 새 단언이 vacuous 하지 않음을 증명했다(§0.7-H5). 주입이 남긴 고아 행 1건은 회수했다.
`cleanup-db.ts` 는 부서 업무를 청소 대상에 넣고 있지 않으므로 테스트가 스스로 회수한다.

**#23 은 "테스트에 맞춰 앱을 되돌리는" 선택지를 배제했다.** 미들웨어의 deny-by-default 전환은
의도된 보안 강화이고, `/admin/community` 하위 관리 콘솔은 `ADMIN_ONLY_SUBPATHS` 로 다시 도려내진다.
낡은 계약에 맞추려면 차단을 풀어야 하는데 그것은 §0.7-H2(신호 은폐)다. 대신 허용경로는 통과·
도려낸 콘솔은 차단을 **둘 다** 고정해 계약이 한쪽으로만 무너지지 않게 했다.

**E11 a11y(로그인 color-contrast)**: 회차마다 갈린 원인은 설계가 아니라 **감사 시점**이었다.
framer-motion 진입 페이드 도중에는 전경·배경이 합성돼 대비가 낮게 측정된다. 정착 상태 실측은
≈8.2:1 로 기준을 크게 넘는다 — 앱은 정상. 대기만으로는 부하 시 재발해, 감사 대상 영역의 진입
애니메이션을 무력화해 **정착 상태를 강제**한 뒤 감사한다.

> ⚠ **직전 세션이 남긴 파괴적 편집을 복구했다.** `23-security-auth-supplement.spec.ts` 에 a11y 수정을
> 넣는 편집의 치환 범위가 어긋나 **E1(위조토큰 2) · E2(로그인 실패) · E3(권한상승 차단 3) · E4(미들웨어
> 리다이렉트 6) 총 12건이 삭제**되고 E11 본문이 E0 안으로 들어가 제목과 본문이 어긋나 있었다(-142줄).
> 보안 회귀 테스트가 조용히 사라지는 형태라 커밋됐다면 §0.7-H2 에 정면으로 걸린다. HEAD 에서 복구한
> 뒤 의도된 수정만 정위치에 재적용했다.

**갱신되는 선행 서술**: 위 "인프라 갭 — 메일 3건"은 `348a822e2` 로 해소됐다. **SMTP 서비스는 필요
없었고**(상세/목록 패널 좌표가 뒤바뀌어 있던 것이 실체), compose 에 Mailpit 을 넣을 이유도 사라졌다.
"비주얼 기준선" 결정도 위 #9 로 종결됐다 — **CI 플랫폼에서 생성·검증**한다.

### ✅ #15 인텔리전스 대시보드 — 가짜 컨트롤을 조작하며 통과하던 테스트

전량 재측정에서 유일하게 **새로 드러난** 항목이다(앞선 트리아지에서 `8760248a4` 에 묶여 해소된 줄
알았으나 실측은 달랐다 — 커밋 매핑 추정을 실측으로 대체한 결과다). 세 겹의 드리프트가 겹쳐 있었다.

1. **영문 라벨 3종 소멸** — `NETWORK TRAFFIC EVOLUTION`·`ENVIRONMENT DISTRIBUTION`·
   `HIGH-INTERACTION SERVICES`. 화면이 한글화됐고, 그중 '지리적 트래픽 분포'는 하드코딩 목 데이터를
   실측치처럼 표기하던 카드라 감사 P1-5 로 **의도적으로 삭제**됐다. → 현행 구성으로 단언 이동.
2. **`changePeriod` 가 겨냥한 기간 셀렉트가 부재** — 원인을 파고드니 그 `<select>` 는 `value` 도
   `onChange` 도 없는 **장식 컨트롤**이었다(옵션을 골라도 조회 조건이 바뀌지 않았다). 관리자 전수감사
   P0 '거짓 성공 제거'(`4dcee3014`)가 걷어낸 것이다. **즉 종전 테스트는 가짜 컨트롤을 조작하며
   통과하고 있었다** — 화면을 되돌려 테스트를 살리는 것은 거짓 UI 를 되살리는 일이므로 POM 메서드째
   삭제했다. ※ 백엔드 `GET /statistics/connect` 와 `StatsAdminService` 는 `fromDate`/`toDate` 를 이미
   받는다. **'진짜' 기간 필터 UI 도입은 제품 결정 사항**으로 남긴다.
3. **엑셀 파일명 기대값 stale** — `system_intelligence_stats` → 실제는
   `system_connect_stats_YYYY-MM-DD.csv`. 접속 집계를 내보내는 버튼이므로 현행 이름이 내용과 맞는다.

차트 제목·파일명 두 단언 모두 **위반 주입으로 red 를 확인**해 vacuous 하지 않음을 증명했다.

### 📊 최종 실측 (로컬 CI 재현 스택)

| 시점 | 결과 |
|---|---|
| 기준선(본 문서 상단) | **23 failed** · 1 skipped · 89 passed (43.5m) |
| 잔여 4건(#7·#9·#13·#23) 마감 직후 | **3 failed** · 2 skipped · 109 passed (9.7m) |
| #15 마감 후 (최종) | **1 failed** · 2 skipped · **111 passed** (10.4m) |

실행시간이 43.5m → 10m 대로 준 것은 COP 5분 타임아웃(`c03c07ad3`) 해소 효과다.
skipped 2건은 ① 계정 잠금 정책 미확정(`test.fixme`) ② 비주얼 회귀 CI 전용(#9) 로 **둘 다 의도된
건너뜀**이며 리포트에 사유가 남는다.

### ⏸ 잔여 — 03-board-community (부하 의존 flaky, 기존 '판정 보류' 항목)

인벤토리 23건은 전부 처리됐고, 남은 red 는 문서 상단에서 이미 **판정 보류**로 분리해 둔 그 항목이다.
실패 사유는 콘솔 오류 하나 — `[BoardRegistClient] Submit error thrown: TypeError: Failed to fetch`.

**flaky 임이 실측으로 굳어졌다.**

| 실행 | 결과 |
|---|---|
| full-suite 1회차 | `CRUD Flow for General List` · `CRUD Flow for Q&A Template` **2건** red |
| full-suite 2회차 | `CRUD Flow for General List` **1건**만 red |
| `--project=tier-3-business` 격리 | **8건 전량 통과** |

같은 코드·같은 환경에서 회차마다 실패 건수가 달라진다 = 결정적 결함이 아니라 부하 의존. 전체
실행에서만 발현한다는 종전 관측과 일치하며 새 정보는 없다. CI 는 `retries: 2` 라 flaky 로 표시되되
잡을 실패시키지 않는다.

**다만 이 항목을 '해결됨'으로 닫지 않는다.** 저장은 항상 성공하는데 UI 는 실패 토스트를 띄우므로
사용자에겐 **성공을 실패로 오인해 재시도 → 중복 등록** 위험이 남는다. 앱의 실 결함 후보로 열어 두고,
다음 조사는 문서 상단의 `--trace on` 절차(abort 직전 이벤트의 네비게이션 주체·요청 취소자 특정)를
따른다.

---

## 처리 이력 — 인프라 (2026-07-27 세션 재개)

재개 시점에 **Docker 데몬·:8080·:3001 이 전부 내려가 있었다**(SOP §3.1-2 인프라 실측 의무에 따라
가정하지 않고 측정). 복구 경로: Docker Desktop 기동 → `egov-postgres`(5432)·`egov-api`(8080) 자동
복구 → actuator 200 확인 → **프론트 프로덕션 빌드 재생성**(`.next` 에 dev 산출물만 있어 `next start`
가 거부) → 대칭 `JWT_SECRET` 으로 `next start -p 3001`.

> 🚨 **직전 세션이 남긴 파괴적 편집을 복구했다.** `23-security-auth-supplement.spec.ts` 에 a11y 수정을
> 넣는 편집의 치환 범위가 어긋나 **E1(위조토큰 2) · E2(로그인 실패) · E3(권한상승 차단 3) · E4(미들웨어
> 리다이렉트 6) 총 12건이 삭제**되고 E11 본문이 E0 안으로 들어가 제목과 본문이 어긋나 있었다(-142줄).
> 보안 회귀 테스트가 조용히 사라지는 형태라 커밋됐다면 §0.7-H2(신호 은폐)에 정면으로 걸린다.
> HEAD 에서 복구한 뒤 의도된 수정만 정위치에 재적용했다(복구 후 18 passed 로 확인).
>
> **재발 방지 교훈**: 큰 치환은 적용 후 `git diff --stat` 의 삭제 줄 수를 **의도한 규모와 대조**한다.
> `+22` 를 의도한 편집이 `-142` 를 냈다면 그 자체가 신호다.
