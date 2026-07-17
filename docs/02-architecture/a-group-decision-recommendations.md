# A그룹(제품/아키텍처 결정 대기) — 세부 구현 추천안

> 작성: 2026-07-17 · 방법론: 7항목 병렬 코드/DB 실측 조사(각 high-effort) → 항목당 2렌즈 적대적 검증(Paranoid Engineer / Migration-Ops) → 누락·의존 점검(Completeness Critic) → **메인 에이전트 직접 재검증**(SOP §2.3). 총 22개 서브에이전트, 오류 0.
> 관련: [quality-score-root-cause-analysis.md](quality-score-root-cause-analysis.md)(A~H 근본원인), [framework-reusability-assessment.md](framework-reusability-assessment.md), [user-reference-key-policy.md](user-reference-key-policy.md)
> ⚠ 이 문서는 **결정 자료**다. 파괴적 항목(leader 도메인 제거, biz_cd DROP, 가비지 DML)은 착수 전 **개별 명시 승인** 필요(글로벌 §5).

---

## 0. 🚨 최우선 발견 — fe-auth는 "결정 대기"가 아니라 라이브 회귀(P0)

조사 중 적대검증이 반증하고 **메인이 직접 확증**한 사실: **UI 로그인·로그아웃·자동 토큰재발급이 2026-07-15(`45855eb43`) 이후 파손 상태로 의심된다.**

**메커니즘(정적 확증)**:
1. [authService.ts:25](../../frontend/src/services/foundation/auth/authService.ts#L25)는 `client.post('/api/auth/login')`을 호출한다.
2. [client.ts:13-17](../../frontend/src/lib/api/client.ts#L13-L17) — 브라우저 axios `baseURL='/api/v1'`. axios는 상대 URL에 baseURL을 무조건 전치한다. **실측**(`axiosInstance.getUri`): `/api/auth/login` → **`/api/v1/api/auth/login`**.
3. [middleware.ts:44](../../frontend/src/middleware.ts#L44) — `/api/v1` 프리픽스라 프록시 분기로 낚아채 [next.config.ts:88](../../frontend/next.config.ts#L88) rewrite로 백엔드 전달.
4. 백엔드 `AuthApiController`는 `/api/v1/auth`에 매핑 — `/api/v1/api/auth/login` 엔드포인트는 **없음** → `anyRequest().authenticated()` → **401**.
5. 결과: **HttpOnly 쿠키를 심는 [login/route.ts:30-36](../../frontend/src/app/api/auth/login/route.ts#L30-L36)에 영원히 도달하지 못한다.** logout·reissue도 동일(`/api/v1/api/auth/logout|reissue`).

**E2E가 못 잡은 이유(실측)**: 전 22티어는 [auth.setup.ts](../../frontend/e2e/auth.setup.ts)가 백엔드 `:8080`에 **직접** 로그인해 만든 storageState를 재사용한다. 성공 UI 로그인 테스트가 없고([23-security-auth-supplement.spec.ts](../../frontend/e2e/23-security-auth-supplement.spec.ts)는 실패 케이스만), reissue 테스트는 `test.fixme`. 즉 E2E는 green인데 UI 로그인은 파손.

**상태**: 정적 증거는 결정적(axios 기전은 순수함수로 실증 완료). **런타임 확증은 서버 다운으로 보류**(SOP §4.1 정직 보류) — 재개조건: 백엔드+Next 기동 후 UI 로그인 HTTP 실증.

**→ 이건 fe-auth 항목의 "Phase 0"으로, 다른 어떤 결정보다 먼저 검증·수정해야 한다.** (수정 자체는 [authService.ts](../../frontend/src/services/foundation/auth/authService.ts)·[client.ts:121](../../frontend/src/lib/api/client.ts#L121)의 Route Handler 호출에 `{ baseURL: '' }`를 주거나 전용 클라이언트로 분리하는 소규모 델타.)

---

## 1. 실행 순서 · 의존성 · 마이그레이션 번호 배정 (교차 관심사)

Completeness Critic이 식별한 항목 간 결속 — **개별 항목보다 이 조율이 먼저다.**

### 1.1 의존성 그래프
```
fe-auth Phase 0 (P0 로그인 수정)  ──필수선행──▶  fe-auth Phase 1-3 ──▶ fe-csp (CSP Report-Only는 auth 전환 후 트래픽 기준)
                                                   │
                                          (둘 다 middleware.ts 단일 파일 + auth.setup.ts/cleanup-db.ts 공유)

log-privacy ◀──사용자 삭제 훅 공유(UserDeletionEvent)──▶ note-rcptn
   (V2_12 동기 리스너를 공용 삭제 훅으로 — 각자 별도 메커니즘 신설 금지)

biz_cd · leader-stts · deptjob : 상호 독립 (단 마이그레이션 번호는 공유 자원)
```

### 1.2 마이그레이션 번호 배정 — ⚠ 최신 적용본은 **V2_19**(이번 세션 완료). 5항목이 V2_20+ 경합
공유 OCI DB + 이중 오퍼레이터 환경이라 번호 충돌 시 Flyway 파손. **한 항목씩 순차 적용·커밋** 원칙, 착수 시점 `flyway_schema_history` 최신 rank 재실측 후 다음 번호 배정:

| 항목 | 제안 버전 | DDL 성격 | ZeroDowntime 린터 |
|---|---|---|---|
| deptjob FK 위생(선택) | V2_20 | ADD CONSTRAINT | 통과 |
| note-rcptn del_yn | V2_21 | ADD COLUMN DEFAULT | 통과 |
| log-privacy 인덱스 | V2_22 | CREATE INDEX | 통과 |
| biz_cd 재모델링 | V2_23 | ADD+UPDATE+**DROP** | DROP `-- linter:ignore` |
| leader 도메인 제거 | V2_24 | **DROP TABLE ×2**+DELETE | DROP `-- linter:ignore` |

> 번호는 착수 순서에 따라 재배정하되 **연속·유일**해야 한다. 각 적용 후 즉시 커밋+push(타 오퍼레이터 pull 전까지 validate 실패 상태가 됨을 인수인계 기록).

### 1.3 공통 리스크(전 항목 적용)
- **이중 오퍼레이터**: 각 Phase 착수 시 `git status` + 대상 파일 디스크 재실측(오늘 Gemini가 `1681d7a76`·`6a876be9c`로 api-docs/generated-* 이동). 커밋은 `git commit --only -- <경로>`.
- **codegen 정본**: `codegen:file`은 **루트** `../api-docs.json`을 읽는다([frontend/package.json:15](../../frontend/package.json#L15)). `frontend/api-docs.json` 재생성 금지(`6a876be9c`가 정리한 계보역전 재발). api-docs 재생성은 **백엔드 기동 필요**(오프라인 불가).
- **파괴적 경계**: leader DROP·biz_cd DROP·note 가비지 DML은 개별 승인 + 백업 덤프 선행(V2_13 orphan-backup 선례).

---

## 2. 결정 요약 매트릭스

| # | 항목 | 추천 옵션 | 성격 | 공수 | 파괴성 | 검증 |
|---|---|---|---|---|---|---|
| 1 | **fe-auth** | **Phase 0(P0 버그수정) 선행** + Opt1 잔여완결(jose 서명검증·E2E 잔재·바디토큰 Contract) | 🚨 회귀+하드닝 | 2d+ | 계약(refreshToken 바디) | NEEDS_AMEND ×2 |
| 2 | **fe-csp** | **Opt C** 단계형: unsafe-eval 즉시제거 → Report-Only 실측 → nonce는 PPR 결정에 게이트 | 하드닝 | 1.5d(+조건부 2-4d) | 없음(Phase1-3) | NEEDS_AMEND ×2 |
| 3 | **note-rcptn** | **Opt (a)** 파티별 논리삭제(rcptn del_yn + 양측삭제 시 물리수거) | 잠복버그+정책 | 2d | 가비지 DML | NEEDS_AMEND ×2 |
| 4 | **biz_cd** | **Opt A** evnt_nm 신설+이관+biz_cd DROP(Expand-Sync-Contract) | 계약정화 | 0.5d | 컬럼 DROP | NEEDS_AMEND ×2 |
| 5 | **log-privacy** | **Opt (a)** 보존기간 배치삭제 + user_log 삭제정리(하이브리드) | 정책+법규 | 2d | 없음 | NEEDS_AMEND ×2 |
| 6 | **deptjob** | **Opt (c)** 관리자 전용 @PreAuthorize + FK 위생 + (a)승격조건 문서화 | 인가확정 | 0.5d(+0.5d) | 없음 | NEEDS_AMEND ×2 |
| 7 | **leader-stts** | **Opt (b)** 도메인 일괄 제거(0행·계약파손·사경화 실측) | 死도메인 정리 | 1.5d | **DROP ×2** | NEEDS_AMEND ×2 |

> **전 7항목 이중 NEEDS_AMENDMENT** = 무수정 통과안이 하나도 없음(FLAWED 0). 아래 각 항목의 "검증 반영" 절이 필수 수정을 담는다.

---

## 3. 항목별 상세 추천안

### 3-1. fe-auth — 인증 아키텍처 완결 (🚨 P0 선행)

**현황**: HttpOnly 쿠키+동일출처 프록시 전환은 이미 커밋됨(`45855eb43`,`30fba0530`)이나 §0의 이중 프리픽스로 **UI 로그인 경로가 무력화** 의심. 잔여 하드닝 2건: ①미들웨어가 JWT 서명 미검증([middleware.ts:5-35](../../frontend/src/middleware.ts#L5-L35) base64 디코드만 — 위조 토큰의 `role=ADMIN` 통과) ②백엔드 로그인/재발급 응답 바디에 토큰 노출([AuthApiController.java](../../api-server/src/main/java/nuri/api/controller/business/auth/AuthApiController.java)).

**추천: Phase 0 선행 + Option 1(잔여 완결 패키지)** — 비대칭 전환(Opt2)은 세션 전량 무효화 비용 대비 이득 작음(백엔드가 이미 authoritative). 현상유지(Opt3)는 §F 로드맵 미완.

**단계 계획**:
- **Phase 0 (P0, 최우선)**: 이중 프리픽스 수정 — [authService.ts:25,30,35](../../frontend/src/services/foundation/auth/authService.ts#L25)·[client.ts:121](../../frontend/src/lib/api/client.ts#L121)의 Route Handler 호출에 `{ baseURL: '' }` 명시 또는 Route Handler 전용 클라이언트 분리. 서버 기동 후 UI 로그인 HTTP 실증 + 성공 UI 로그인 E2E 신설 + reissue `test.fixme` 해제([23-security-auth-supplement.spec.ts:120,128](../../frontend/e2e/23-security-auth-supplement.spec.ts#L120)).
- **Phase 1 (미들웨어 서명검증)**: `+jose`, [middleware.ts](../../frontend/src/middleware.ts) `getRoleFromToken`→`jose.jwtVerify`. **⚠ 알고리즘: HS256 아님** — jjwt `signWith(SecretKey)`가 키 비트수로 자동 추론, dev 시크릿 88바이트=HS512. `algorithms:['HS256','HS384','HS512']`로 핀. 키는 `new TextEncoder().encode(JWT_SECRET)` — **base64 디코드 금지**([JwtTokenProvider.java:43](../../foundation/src/main/java/nuri/foundation/jwt/JwtTokenProvider.java#L43) `getBytes()` raw 정합). prod에서 `JWT_SECRET` 미설정 시 모듈 스코프 `throw`(fail-fast). 검증 실패 시 accessToken·session_exp 쿠키 삭제 후 `/login` 리다이렉트(무한루프 차단).
- **Phase 2 (E2E 잔재)**: [auth.setup.ts](../../frontend/e2e/auth.setup.ts) `origins.localStorage`에서 **accessToken만** 제거(⚠ `egov_smart_tour_v1`은 투어억제 살아있는 의존 — 보존). userRole 쿠키 제거(소비처 mocks뿐). ⚠ **선행 필수**: [SurveyPage.ts:111-122,199](../../frontend/e2e/pages/SurveyPage.ts#L111)가 localStorage accessToken을 직접 소비 → storageState JSON 파싱 방식(tier-19 패턴)으로 교체 안 하면 **tier-05 즉사**.
- **Phase 3 (Contract, 계약변경)**: [TokenResponse.java](../../business-core/src/main/java/nuri/business/service/auth/dto/TokenResponse.java) refreshToken `@JsonIgnore`. ⚠ **reissue 쿠키 발급 대칭화 동반**: [AuthApiController](../../api-server/src/main/java/nuri/api/controller/business/auth/AuthApiController.java) reissue에 `addRefreshTokenCookie` 추가(현재 비회전이라 no-op이나 향후 회전 도입 시 전달경로 소멸 함정 차단). [AuthApiControllerTest.java:71,105,111](../../api-server/src/test/java/nuri/api/controller/business/auth/AuthApiControllerTest.java) 바디 단언 수정. 백엔드 기동→루트 api-docs.json 재생성→codegen. **3a(소비자 전환)/3b(공급자 축소) 분리** — auth.setup.ts를 set-cookie 파싱으로 먼저 착지·22티어 green 확인 후 계약 축소.
- **Phase 4 (제품결정 후)**: admin 게이트 커버리지 확장 — [열린 질문 3-1.①](#열린-질문-집약).

**검증 반영(필수)**: ①HS256→HS512 정정(위 반영) ②reissue 쿠키 대칭화 ③Phase 3 3a/3b 분리 ④SurveyPage localStorage 선전환 ⑤egov_smart_tour_v1 보존 ⑥prod fail-fast를 Phase1 설계에 ⑦검증실패 루프차단 ⑧E2E 페어링 규약([e2e-test-guide.md](../03-guides/e2e-test-guide.md)에 "JWT_SECRET은 백엔드·Next 동시 설정 or 양쪽 미설정" 명문화 — playwright.config에 webServer 없음).

**마이그레이션**: 없음(DB 무관). **테스트**: tsc+next build(각 Phase)+gradle(P3), 위조토큰 방어 E2E, 정상 로그인→401→reissue E2E(Phase0 후), 22티어 회귀.

---

### 3-2. fe-csp — CSP 하드닝

**현황**: CSP는 [next.config.ts:45-46](../../frontend/next.config.ts#L45) 단일 정의, 전경로 정적. `script-src 'unsafe-inline' 'unsafe-eval'` 허용. 앱 소스 eval 0건(unsafe-eval 요구원=프레임워크). unsafe-inline 요구원=RSC 부트스트랩+테마 스크립트(nonce 없이 제거 불가). nonce는 `cacheComponents`(PPR, [next.config.ts:8](../../frontend/next.config.ts#L8))와 구조 충돌.

**추천: Option C(단계형)** — 파손 0 이득을 즉시 선취, 고비용 결정(PPR vs strict)은 실측 후 판단.

**단계 계획**:
- **Phase 1(0.5d)**: prod/dev CSP 분리(`NODE_ENV` 분기) — prod `script-src`에서 `unsafe-eval` 제거, `img-src` 죽은 allowance(`grainy-gradients` 참조0) 제거. `Reporting-Endpoints` + `report-to`/`report-uri` 추가. `/api/csp-report/route.ts` 신설 — **⚠ 방어 설계 필수**: Content-Type 허용목록(415), 바디상한(32KB→413), 필드 화이트리스트만 로깅(원문 통짜 금지), 레이트리밋/샘플링, 204 고정(비인증 공개 쓰기 엔드포인트라 DoS·위조리포트 공격면). **prod `connect-src`에서 bare `ws: wss:` 제거**(same-origin `/ws` rewrite + CSP3 `'self'` 승격 커버 — bare 스킴은 XSS 시 무제한 유출 채널). `X-XSS-Protection` `'0'`으로(deprecated·XS-Leaks).
- **Phase 2(0.5d)**: `Content-Security-Policy-Report-Only`로 목표정책 병행 송출 — **isProd 한정**(dev turbopack HMR eval + RSC 인라인이 상시 위반→E2E 오염). 계측은 `next build && next start -p 3001`(prod 빌드) 기반 전티어 1사이클+수동 스모크. ⚠ [error-detector.ts](../../frontend/e2e/fixtures/error-detector.ts) ignorePattern은 `/^\[Report Only\]/` 접두 한정 — `'Content-Security-Policy'` 광역 매치 금지(enforce 위반 `Refused to...`까지 은폐해 회귀게이트 자멸).
- **Phase 3(0.5d)**: 위반 0건 확인 후 fonts.googleapis/gstatic 제거(next/font 셀프호스팅). style-src → `style-src-elem 'self'` + `style-src-attr 'unsafe-inline'` — ⚠ **sonner·framer-motion 런타임 `<style>` 주입**을 Report-Only로 먼저 검증(존재 시 style-src-elem에 unsafe-inline 유지). 세분 미지원 브라우저 위해 기본 `style-src` 폴백 존치.
- **Phase 4(조건부, 2-4d)**: nonce+strict-dynamic — [middleware.ts](../../frontend/src/middleware.ts) crypto nonce→`x-nonce`+CSP, [next.config.ts](../../frontend/next.config.ts) CSP 제거(이중송출 차단, **모든 middleware return 경로 공통 응답래퍼**), [layout.tsx](../../frontend/src/app/layout.tsx)+[theme-provider.tsx](../../frontend/src/app/components/theme-provider.tsx) nonce 전파. **cacheComponents 비활성(PPR 포기) 결정 후에만** 착수([열린 질문 3-2.①](#열린-질문-집약)). atlas는 경로분기 완화 CSP.

**검증 반영(필수)**: ①csp-report 방어설계 ②ignorePattern 접두한정 ③Report-Only isProd한정 ④connect-src bare ws 제거 ⑤sonner/framer-motion 특정 ⑥Phase4 응답래퍼+이중송출 차단 ⑦enforce 게이트=prod빌드 E2E(리포트는 보조) ⑧X-XSS-Protection 정리 ⑨원자 커밋(next.config CSP 제거+middleware 신설 동시).

**마이그레이션**: 없음. **테스트**: prod 헤더 실측(unsafe-eval 부재)·리포팅 동작·22티어 prod빌드·핵심화면 수동스모크(recharts/tiptap/sockjs/테마/framer).

---

### 3-3. note-rcptn — 쪽지 삭제 정책

**현황**: [NoteServiceImpl.deleteNote](../../business-app/src/main/java/nuri/business/service/note/NoteServiceImpl.java) sent 분기가 **물리삭제** — `fk_tb_note_rcptn_tb_note_sndng`(NO ACTION) 때문에 수신사본 보유 쪽지(실측 14/34건)에서 **23503 잠복 결함**([page.tsx:109](../../frontend/src/app/note/page.tsx#L109) Mock 버튼 덕에 미발현). 코드베이스가 이미 (a)를 의도(`tb_note_sndng.del_yn`+필터 기존재, SSOT `DEL_YN`/`RCVR_DEL_YN` 등재). 운영 데이터 0건(전량 E2E 가비지).

**추천: Option (a) 파티별 논리삭제** — 반쪽 구현의 완성. DB헌법 제8조 3항(양당사자 통신기록=한쪽 삭제가 상대 이력 소멸 금지) 정합.

**단계 계획**: Phase1 V2_21 `tb_note_rcptn.del_yn ADD COLUMN DEFAULT 'N'` → Phase2 [NoteRecptn.java](../../business-app/src/main/java/nuri/business/domain/note/NoteRecptn.java) 소프트삭제 전환+수거 → Phase3 FE 실배선([page.tsx:106-115](../../frontend/src/app/note/page.tsx#L106) Mock→confirm+실삭제) → Phase4 위생.

**검증 반영(필수·중대)**:
- ⚠ **NULL 수신자 = 수거 영구불능**: `sendNote`가 `rcverId` blank 검증 없어 rcvr_id NULL rcptn 생성(실측 14행 중 13행 NULL). NULL-rcvr는 IDOR 가드를 누구도 통과 못 해 `del_yn='Y'` 전환 불가 → "전원삭제 시 수거" 영원히 거짓. **입력검증(blank 거부) 필수**.
- ⚠ **레이스**: READ COMMITTED에서 양측 동시 자기플래그만 UPDATE→상대 count하면 "아무도 수거 안 함"이 더 개연적 → 수거 판정 전 부모 sndng `PESSIMISTIC_WRITE` 잠금.
- ⚠ **cascade 혼용 금지**: [Note.java:42-46](../../business-app/src/main/java/nuri/business/domain/note/Note.java#L42) `cascade=ALL`+`orphanRemoval` 2개와 리포지토리 직접 delete 혼용 시 형제 컬렉션 삭제순서 미보장→23503 재발. rcptn→flush→sndng→(참조0 확인)info 명시순서.
- getNoteDetail 가드 **양 분기**(sent도). V2_21 선적용이 business-app 테스트 전제(Flyway drift). [convertToDto(NoteTrnsmit)](../../business-app/src/main/java/nuri/business/service/note/NoteServiceImpl.java) noteId·rcverId 미세팅(sent탭 표면화). cleanup-db.ts는 **E2E esntl_id 스코프** 삭제(전량 DELETE 금지 — 운영 쪽지 보호).

**테스트**: 회귀 red 선행(수신사본 보유 sent 삭제=DataIntegrityViolation 재현→green), 동시삭제 레이스, NULL수신자 거부.

---

### 3-4. biz_cd — EventInfo 코드컬럼 오용 정화

**현황**: [tb_event_info.biz_cd](../../business-app/src/main/java/nuri/business/domain/operation/EventInfo.java) varchar(30)에 DTO가 '행사명칭' 저장(V2_18 DEFER). 실데이터 0행(비NULL 83행 전량 E2E 가비지). SSOT에 `BIZ_CD` 용어 0건, `EVNT_NM`/명V200 표준 존재. 소비처=admin FE 단일.

**추천: Option A(Expand-Sync-Contract)** — evnt_nm 신설+이관+biz_cd DROP. "진짜 코드로 복원"은 SSOT 미등재라 헌법 제9조 승인 선행 필요, 명칭 전환이 유일한 무승인 정합 경로.

**단계**: Phase1 V2_23(ADD evnt_nm varchar(200)→DO가드 UPDATE 이관→DROP biz_cd `-- linter:ignore`)+[V1__init_test_schema.sql](../../foundation/src/test/resources/db/migration/V1__init_test_schema.sql) 동기화 → Phase2 엔티티/DTO/Service/Repository `bizCd→evntNm` → Phase3 백엔드기동→api-docs 재생성→codegen → Phase4 FE 6개소(라벨 불변→OpsDetailPage 무수정) → Phase5 게이트.

**검증 반영(필수)**: ①**루트 [db_columns.json](../../db_columns.json) 갱신**(biz_cd 행 제거+evnt_nm 추가) — [MappingValidator.java](../../migration-tool/src/main/java/nuri/migration/validate/MappingValidator.java)가 소비, 미갱신 시 stale 검증기 ②testPlan의 "SchemaNamingLinter가 컬럼명 기계검증" **허위** — 린터는 CREATE 이름/char/감사컬럼만 검사, ADD COLUMN 컬럼명 미검증 → 수동 SSOT 3단계 조인 SELECT 증거를 태스크기록에 ③ADD COLUMN에 명시적 `NULL` 키워드 금지(`IF NOT EXISTS`의 NOT과 결합해 린터 4번룰 오탐) ④@Deprecated 브리지 도입 시 `@Schema(hidden=true)`+`@JsonProperty(WRITE_ONLY)` 필수(미병기 시 bizCd 계약 재오염) — 기본은 미도입(동시배포).

**마이그레이션 리스크**: 롤링 스큐(구FE가 bizCd POST→`@JsonIgnoreProperties`가 조용히 무시→행사명 NULL) — BE+FE 동시 커밋으로 회피. api-docs 재생성 순서 엄수(미재생성 시 tsc 통과하나 런타임 필드 불일치).

---

### 3-5. log-privacy — 로그 개인정보 정책

**현황**: [tb_user_log](../../business-core/src/main/java/nuri/business/domain/log/UserLog.java)(2행, `fk...→esntl_id`)·tb_web_log(20,841)·tb_sys_log(12)·tb_login_log(0). `deleteOldLogs` 4종 **死코드**(호출자 0). [UserDeletionCleanupListener](../../business-app/src/main/java/nuri/business/service/user/UserDeletionCleanupListener.java)가 user_log 미참조(**잠복 FK 결함**).

**추천: Option (a) 하이브리드** — 보존기간 배치삭제 + user_log 삭제정리. 한국 규제상 접속기록은 삭제자유보다 **보존의무**(안전성 확보조치 기준 제8조, 1~2년) 우선 → 즉시 익명화(b)는 법적이득 없이 고비용. 무기한 보존(c)은 PIPA 파기원칙 소명 불가.

**단계**: Phase1 [UserLogRepository](../../business-core/src/main/java/nuri/business/domain/log/UserLogRepository.java) 벌크 JPQL 삭제→[UserService.cleanupDependentsAndDelete](../../business-core/src/main/java/nuri/business/service/user/UserService.java) publishEvent 직전 호출 → Phase2 `LogRetentionScheduler` 신설(`@ConditionalOnProperty` 기본 false) → Phase3 V2_22 인덱스 → Phase4 [log-retention-policy.md](../04-operations/) 문서 → Phase5(선택) login_log 기록 복원.

**검증 반영(필수·중대)**:
- ⚠ **months 하한 가드 = 감사로그 전량파기 방지**: `enabled=true`+months 미설정(기본0)/음수면 `cutoff='오늘'`→당일 이전 전량삭제(설정 실수/탈취 공격면). **Integer 바인딩+법정최저(12개월) 미만이면 skip+WARN**. 4개 Impl 무가드 실측.
- ⚠ **tb_privacy_log 편입**: 개인정보 조회로그(dmnd_user_id·IP)인데 `deleteOldLogs` 부재. 현재 0행·기록경로 死지만 인수처 활성화 시 무기한 보존 갭 → 보존체계 편입 or 정책표 명시.
- Phase1은 **벌크 JPQL**(`@Modifying @Query`) — 파생 deleteBy는 @IdClass 복합키를 로드후 건별삭제. `deleteOldLogs`는 LIMIT 배치루프(초대형 단일tx 방지). resolveUserId `:65 fallback`(`getName()`=esntlId 가능)을 web_log 행위자 표기 편차로 명기.

**테스트**: user_log 삭제 시 FK 위반 없음(현 테스트 갭 보강), months=0/음수/미설정 no-op, 고정 Clock 경계일.

---

### 3-6. deptjob — 부서업무 소유모델

**현황**: [DeptJobBox](../../business-core/src/main/java/nuri/business/domain/deptjob/DeptJobBox.java)·task 두 테이블 **0행**, FE 쓰기화면 0개(살아있는 소비처=admin work-hub 읽기뿐), 부서매핑 0/24. 쓰기 엔드포인트 무가드(아무 인증 사용자나 생성·삭제) — [SecurityAuthAnnotationLinterTest allow-list](../../api-server/src/test/java/nuri/api/harness/SecurityAuthAnnotationLinterTest.java) 등재.

**추천: Option (c) 관리자 전용** — 소유모델은 데이터·사용처가 증명하는 만큼만. (a)부서스코프는 매핑 0이라 전원403 죽은가드, (b)담당자소유는 한 도메인에 loginId/esntlId 이원축 도입(최다 재발결함 증폭). (c)는 0.5d로 실위험 봉쇄+린터 allow-list "제거" 졸업+스키마 무변경으로 (a)승격 여지 유지.

**단계**: Phase1 [DeptJobApiController](../../api-server/src/main/java/nuri/api/controller/business/smarttoolkit/DeptJobApiController.java) 쓰기 3메서드 `@PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")` + [DeptJobBoxService](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobBoxService.java) 서비스 재검증(헌법 8조 2차) + 린터 allow-list 제거 + 컨트롤러 테스트(ADMIN 200/USER 403). Phase2(선택) V2_20 FK 위생 3건(pic_id→esntl_id 등, 0행 재실측 후). Phase3(제품결정 후) 죽은 표면 정리.

**검증 반영(필수)**: ①물리 테이블명 `tb_dept_job_bx`+`tb_dept_task_info`(FK안 정확명 확인) ②`deleteDeptJobBox`가 산하 task 정리 없이 삭제 → Phase2 FK 후 산하 task 존재 시 삭제가 500 표면화 → **산하 task 검사 후 409** 로직 동반 ③allow-list 제거를 Phase1 커밋에 원자적 포함(누락 시 무가드 재유입 계속 통과) ④V2_20 적용 직전 0행 재실측(E2E 잔여 554행 선례).

---

### 3-7. leader-stts — 死도메인 처분

**현황**: 모든 계층 사망 실측 — DB 0행·인바운드 FK 0, 부모 생성경로 코드·시드 전무([LeaderScheduleService.java:117](../../business-app/src/main/java/nuri/business/service/schedule/LeaderScheduleService.java#L117) orElseThrow), FE 필드명 계약파손+죽은 등록버튼+쓰기 호출부 0, E2E는 렌더 가시성만. V2_16 `tb_club_*`·`tb_leader_schdl_dtl` 0행 DROP 선례와 동형.

**추천: Option (b) 도메인 일괄 제거** — 저장소 목적(신규 SI 베이스, [framework-reusability-assessment.md](framework-reusability-assessment.md) "파생 프로젝트에서 C 삭제")상 파손 쇼케이스는 재사용 자산이 아니라 반복 삭제비용. (a)소생은 수요증거 없는 투기, (c)부모교체는 생성UI 없어 형식적.

**단계**: Phase1 백엔드 코드 제거(컨트롤러/엔티티/서비스/DTO/테스트 ~13파일 + [BusinessIdGnrConfig.java:61-64](../../business-core/src/main/java/nuri/business/core/config/BusinessIdGnrConfig.java#L61) 빈 제거) → Phase2 백엔드기동→api-docs 재생성→codegen(leader 오퍼레이션 6본 소멸) → Phase3 FE 제거([lsm 페이지](../../frontend/src/app/admin/system/lsm/)·서비스·E2E tier18 케이스) → Phase4 **V2_24 DROP**(개별 승인 후) → Phase5 문서 정합.

**⚠ 파괴적 — 개별 명시 승인 필수**. **검증 반영(필수)**: ①assessment B등급 분류와 표면 상충 → 승인 전 착수 금지, 반려 시 (c)로 전환(0행이라 되돌림 무비용) ②**FE 라우트 삭제 = 2026-07-11 "문자열 URL 참조 오삭제" 사고 재현 위험** → tb_menu URL행·e2e 스펙 전수 확인 절차 포함 ③api-docs 재생성 백엔드 기동 의존 ④menu_sn 9030300 하위 자식메뉴 커밋 전 재확인 ⑤`git commit --only`로 leader 경로 한정.

**마이그레이션**: V2_24 `DROP TABLE IF EXISTS tb_leader_schdl/tb_leader_stts -- linter:ignore` + tb_role_prgrm_map/tb_prgrm_lst/tb_menu_info의 LSM 행 DELETE(V2_2 원본 시드는 체크섬 보존 위해 불수정, fresh 경로 INSERT→DELETE 정합).

---

## 4. 열린 질문 집약 (코드로 답 안 나오는 순수 제품 결정)

이것들만 사용자 판단이 필요하다. 나머지는 위 추천안대로 실행 가능.

| # | 항목 | 결정 포인트 | 판단 재료 |
|---|---|---|---|
| 3-1.① | fe-auth | **admin 게이트 커버리지**: /admin 17세그먼트 중 work-hub·workspace·collaboration은 일반 사용자 기능(메뉴 92행 중 79행이 /admin 하위). 현 5 sensitive prefix 외 편입 범위 or URL 재편(/admin 관리자 전용 분리)? | 로그인 기본 리다이렉트가 /admin/work-hub |
| 3-1.② | fe-auth | **바디 accessToken 최종 제거(순수 쿠키 계약)** 여부 — 비브라우저 소비자(E2E setup·cleanup·향후 외부연동) 지원 정책 | "API 직접 소비자 지원" 정책 |
| 3-2.① | fe-csp | **strict nonce CSP 위해 PPR(cacheComponents) 포기?** 성능 vs 보안 순수 트레이드오프 | HttpOnly 전환 완료로 토큰탈취면 이미 축소 |
| 3-2.② | fe-csp | CSP 위반 리포트 수집처: 자체 winston vs 외부(Sentry) | 현재 외부 수집기 부재 |
| 3-3.① | note-rcptn | 양측 삭제 시 물리수거 시점: 즉시 vs 야간배치 | 권고 기본값=즉시(현 규모) |
| 3-3.② | note-rcptn | '회수(recall)' 기능(미개봉 한정) 제품 채택 여부 | 삭제정책과 독립 |
| 3-4.① | biz_cd | '사업코드' 개념 향후 지원? (별도 BIZ 마스터 연계 로드맵) | 현 코드·데이터·SSOT 어디에도 흔적 0 |
| 3-4.② | biz_cd | biz_yr(실질 '행사연도')도 evnt_yr 개명 동승? | EVNT_YR 표준 존재 |
| 3-5.① | log-privacy | **보존기간 수치**: 접속기록 1년 vs 2년(고유식별정보/5만명↑=2년) | 인수처 프로파일(공공/기업) |
| 3-5.② | log-privacy | 법적 트랙: 보존의무 원형보존 vs 사용자삭제 시 가명화 추가 | 얹으면 전 감사컬럼 일관성 범위도 결정 |
| 3-5.③ | log-privacy | tb_login_log 기록경로 복원 vs 死코드 제거 | 0행+호출자0(어느쪽도 데이터 무파손) |
| 3-6.① | deptjob | 부서업무(task) 대면기능 **소생 vs 폐기** | 소생=부서배정 프로세스 전제, 폐기=페이지5+서비스 삭제 |
| 3-7.① | leader | **'간부일정' 데모 도메인 유지 가치?** (assessment B등급 vs 실측 파손 쇼케이스) | 유지=(c)계약수리, 폐기=(b)제거 |

---

## 5. 권장 실행 순서

1. **즉시(P0)**: fe-auth Phase 0 — UI 로그인 파손 런타임 확증 + 수정 (다른 모든 것에 선행).
2. **저위험·독립 (승인 불요, 파손0)**: deptjob (c) → log-privacy (a) → note-rcptn (a). 무결성·인가·정책 결손 해소.
3. **하드닝**: fe-auth Phase 1-3 → fe-csp Phase 1-3(auth 후행).
4. **파괴적 (개별 승인)**: biz_cd DROP → leader 도메인 제거.
5. **고비용 조건부 (제품결정 후)**: fe-csp Phase 4(PPR 결정) · fe-auth Phase 4(admin 커버리지) · deptjob 소생/폐기 · leader 유지/제거.

> 각 항목은 SOP 파이프라인(Dispatch→Execution→Audit→Verification) + §0.6 HARD 게이트(tsc/next build/gradle) + 해당 시 bootRun Flyway 수렴으로 집행한다.
