# 사용자 결정 대기 항목 (Pending Decisions Backlog)

> **목적**: 2026-07-18 대규모 개선 세션(quality-score §2.A~H 현행화 + 점수향상 발굴 + 승인군 A~E)에서
> "에이전트 단독으로 처리 불가 — 사용자/제품/아키텍처 결정이 필요"로 분류된 항목을 한 곳에 모은 백로그.
> **에이전트가 안전하게 할 수 있는 것은 이미 처리·커밋됨**(이 문서엔 미포함). 아래는 전부 결정이 선행돼야 하는 것.
> 각 항목: **[상태] 설명 / 옵션 / 권장 / 영향·축 / 출처**. 결정 후 해당 항목을 처리 지시하면 진행 가능.

---

## 1. 프레임워크 정체성 (§2.B — 가장 큰 결정)

### 1-A. 필수/샘플 분리의 "배포 형태"
- **결정 대상**: 이 저장소를 "복제→불필요 삭제→신규 구축" 베이스로 쓸 때 무엇을 base 로 확정할 것인가.
- **옵션**: (a) **모놀리식 유지 + fork-and-delete** — 초기 비용↓, 파생마다 수작업 삭제 / (b) **admin 을 별도 gradle 모듈로 추출** — 경계 강제·배포 명확, 리팩터 비용↑ / (c) **템플릿 브랜치에서 샘플 ~13 business-app 도메인 실삭제** — 가장 깨끗한 base, 되돌림 불가·데모 상실.
- **현황**: 옵션 (c) 의 핵심은 이미 반영됨 — `template/reusable-base` 브랜치가 로컬·origin 양쪽에 존재하며, business-app 서비스 도메인 main 22 → template 9(샘플 ~13 도메인 제거)로 정리됨.
- **권장**: 재사용을 강조하면 **(c) 템플릿 브랜치**(main 은 데모 보존). 구조는 이미 삭제 가능(business-core→app import 0).
- **영향**: 재사용 준비도(현 ≈70) 전 축. 브랜치는 이미 존재하므로 **남은 결정은 "삭제/추출 실행" 이 아니라 `template/reusable-base` 를 공식 base 로 채택·유지(main 데모 보존 병행)할지**이다.

### 1-B. business-core 내 "샘플-in-core" 처리
- **결정 대상**: `service.system.content.{banner,popup,community}` + `service.system.service.{survey(34파일),consult}` ≈50파일이 코어 모듈에 상주. admin 필수인가 데모인가?
- **옵션**: business-app 이관 / 삭제 / 코어 기능으로 유지.
- **영향**: "코어 모듈=순수 필수" 성립 여부(현재는 샘플 잔류). 판정은 제품 결정.

---

## 2. 보안

### 2-A. webmaster 기본 비밀번호 '1' — **✅ 코드 경로 해소(2026-08-01, Wave 0 W0-02)**
- **이전 기록**: 시드 계정(R__seed_framework)의 dev 편의용 약한 비번. 운영 전환 시 로테이션/최초 강제변경 정책 필요.
- **조치**: `R__seed_framework.sql` 은 이제 비밀번호를 시드하지 않는다 — 로그인 불가 sentinel(`{disabled}…`)을 넣는다. 알려진 개발 비밀번호와 `TEST1` 계정은 `db/seed-dev/R__zz_seed_dev_credentials.sql` 로 이설했고, 이 위치는 dev/local/e2e 프로파일과 개발용 compose 에서만 적재된다. 운영 최초 진입은 `ADMIN_INITIAL_PASSWORD` → `AdminPasswordProvisioner`(business-core) 가 1회 설정한다(이미 설정된 비밀번호는 덮어쓰지 않는다).
- **재발 방지 게이트**: `SeedLocationLinterTest` — 운영 마이그레이션 경로에 해시 리터럴이 있으면 pre-push 에서 red.
- **잔여(미결)**: 공유 OCI DB(129.154.54.178)의 기존 `webmaster`/`TEST1` 행은 `ON CONFLICT DO NOTHING` 이라 그대로다. 다만 이 DB 는 `application-e2e.yml` 기본값·db-bridge 가 **sandbox 로 명시한 개발/E2E DB** 이고, 그 비밀번호는 이제 `seed-dev` 가 의도적으로 제공하는 값이다 — 로테이션하면 양 오퍼레이터의 E2E 만 깨지고 보안 이득이 없어 수행하지 않았다. **별도의 실 운영 DB 를 세우는 시점에 이 판단을 재확인할 것.**

### 2-B. ssh 개인키 — **⚠ 기록 정정(2026-08-01 실측)**
- **이전 기록**: "개인키가 커밋(`11366ca48`)에 잔존(언트랙만 됨). 키 로테이션 + history 퍼지 대기."
- **실측 정정**: history 퍼지는 **원격 전 ref 기준 이미 완료**돼 있다 — 원격 5개 브랜치(`main`/`dev`/`template/reusable-base`/`feature/e2e-token-expiry-and-ci-timing`/`fix/e2e-hardcoded-api-url`) 전부에서 키 blob(`9a6c923df…`) 도달 0건. 2026-08-01 12축 감사가 주장한 "`template/reusable-base` 브랜치에 키가 남아 있다" 는 **거짓**이며, 그 브랜치를 지우는 것은 보안 효과 0 이다.
- **2026-08-01 조치(완료)**:
  - 로컬 `dev`·`template/reusable-base` 가 **재작성 이전 계보를 들고 있었고 HEAD 트리에 실물 키 파일을 포함**하고 있었다(force-push 하면 즉시 재공개되는 상태). origin 으로 정렬 + `reflog expire` + `gc --prune=now` 로 로컬 객체DB 에서 제거 완료.
  - 워킹트리 루트의 실물 키 `ssh-key-2026-01-18.key`(1675 bytes) 삭제. `.gitignore` 의 `*.key` 때문에 `git status` 에 보이지 않아 정리 목록에서 영구 누락되던 파일이다.
  - 저장소 **Secret scanning + Push protection 활성화**, ruleset `12501346` `enforcement: active`(force-push·브랜치 삭제 차단) — 재공개 경로를 서버 측에서 차단.
- **잔여(사용자 조치 — 대체 불가)**:
  1. **키 실물 로테이션**. 저장소가 PUBLIC 인 채로 최소 수일~수주 노출됐으므로 "이미 수집됐다"를 전제로 배포 대상 서버의 `~/.ssh/authorized_keys` 에서 해당 공개키를 제거하고 재발급할 것. 어느 서버에 배포됐는지는 사용자만 안다.
  2. **GitHub dangling 객체 purge**. 커밋 `11366ca480f927bfbe250f0261cb3aa3ce78784b` / blob `9a6c923df57290d3e2a42a3589e5be9376ad66ea` 가 어떤 ref 에서도 도달 불가인데 **PUBLIC API 로 여전히 200 을 반환한다**(2026-08-01 실측: blob size 1675). GitHub Support 티켓만이 유일 경로이며, 저장소 소유자도 API 로 수행할 수 없다. 따라서 키 교체가 시간적으로 선행돼야 한다.

### 2-C. 미들웨어 admin 민감경로 커버리지 — **✅ 해소(2026-07-20, `401c43f4c`)**
- **이전 기록**: 미들웨어가 `/admin/{system,user,security,stats,workflow}` 5개 접두사만 ADMIN 강제(allow-by-default), 그 외 /admin/* 는 인증만.
- **실제**: `401c43f4c`(2026-07-20)로 **deny-by-default 반전** 완료 — `/admin/**` 는 기본 ADMIN/SYSTEM 전용이며, `USER_ACCESSIBLE_ADMIN_PATHS`(work-hub·collaboration·help·community·survey polls participate) 화이트리스트 + `ADMIN_ONLY_SUBPATHS` 역예외로 통제(`frontend/src/middleware.ts`). **남은 것은 결정이 아니라 allow-list 큐레이션**(관리 콘솔 신규 추가 시 유지보수).

### 2-D. CSP `unsafe-inline` 제거
- prod CSP 에서 `unsafe-eval` 은 제거됨. `unsafe-inline` 은 **Next RSC nonce/PPR 인프라 도입**이 선행돼야 제거 가능(아키텍처 결정, 이전에 Phase4 포기).

### 2-E. RBAC 데이터주도化 — **⚠ 기록 정정(2026-07-20 실측): "하이브리드 유지" 는 STALE**
- **이전 기록**: "`hasRole` 하드코딩 24건 · 2026-07-11 '하이브리드 유지'로 제품결정 · 기본 현행 유지".
- **실제**: 그 결정 이후 **RBAC DB 일원화가 실제로 구현·전환됐다** — 커밋 `405d91932`(2026-07-16) + `V2_11__seed_authorization_chain.sql`, 그리고 `application.yml` 에 **`rbac.db-auth.enabled: true`(enforce)** 가 설정돼 있다. 즉 URL 인가는 이미 DB(`tb_prgrm_lst`↔`tb_role_prgrm_map`) 구동이다. 라이브 실측: 프로그램 25 · 롤-프로그램 매핑 48(ROLE_ADMIN 24 / ROLE_SYSTEM 24, **그 외 롤 0 = 권한 상승 0**).
- **"24건" 수치도 무효**: 현 실측 — 저장소 전체에서 롤 기반 `@PreAuthorize` **선언은 2건**(`foundation` 의 메타애노테이션 `@AdminOnly`·`@AdminOrSystem` 정의)이고 적용 지점 7곳(`DeptJobApiController` 3 · `InstitutionCodeService` 3 · `CommonCodeService` 1). 그 외 `SecurityUtil.hasRole(...)` 호출 17회(16개 지점: `UserService` 8 · `OnlinePollService` 3 · `BoardService` 2 · `SecurityUtil` 내부 4)는 **백엔드 헌법 제8조가 요구하는 서비스단 이중검증**이라 제거 대상이 아니다.
- **[결정 대기] 진짜 남은 것**은 방향 재결정이 아니라 **Phase 3 마무리 2건**이다:
  1. **Contract(폴백 제거)** — `ApiSecurityConfig` 의 하드코딩 폴백 분기(L119·L135·L137, 현재 비활성 사문)와 springdoc prod 리터럴(L213, legacy 체인이라 DB 미커버) 처리 승인.
  2. **섀도우 검증 공백** — 태스크 제약 §5-3(불일치 0 증명 전 enforce 전환 금지)을 **어긴 채 전환**됐다(운영 `rbac.shadow.enabled: false`, 섀도우 로그 0건). 사후 섀도우 재현으로 보완할지, 리스크를 수용할지 결정 필요.
- 상세 실측·재개 조건: `.gemini/tasks/20260716-rbac-db-unification.md` §7.

---

## 3. DB / 데이터 모델

### 3-A. 코드성 컬럼 무결성: CHECK vs FK
- `user_stts_cd`·`gndr_cd`·`ent_se_cd`·`user_type_cd` 등 코드 컬럼은 `tb_com_dtl_cd`/`tb_com_cd` 공통코드 주도(허용값 런타임 변동). **옵션**: (1) 공통코드 테이블로 **FK 신설**(데이터주도·유연) vs (2) 안정 소수 상태값만 **CHECK 하드코딩**(드리프트 위험). _yn 과 달리 자율 진행 부적합 → DB 소유자 결정. *(_yn 59컬럼 CHECK 는 V2_24 로 이미 처리.)*

### 3-B. `tb_menu_info.route_mdfcn_yn` 데이터모델 정정
- 이름은 `_yn`(불리언)이나 실제 값은 **'2'** 저장(86행). V2_24 CHECK 대상에서 제외함. **컬럼 rename(오명명 해소) 또는 용도 재정의** 필요. (데이터모델 결정)

### 3-C. `tb_com_dtl_cd` 공통상세코드 값 소싱
- 공통 상세코드(성별 M/F·게시판유형 등 드롭다운 실값) 미시드 — repo/라이브덤프에 권위 원천 부재(DB헌법 9조). **표준 코드값 export 제공** or **빈 값(드롭다운 공백) 수용** 결정.

### 3-D. 뮤테이션 게이트 STRICT flip
- 현재 report-only(`STRICT_MUTATION=false`·`mutationThreshold=0`). **임계값은 헌법·게이트·문서 전반 75%로 통일**(2026-07-18). 75% 하드게이트 활성은 **각 대상 클래스 실측 스코어 ≥75% 확인 후** `STRICT_MUTATION=true` 전환. **미달 상태 flip = 빌드 즉시 파손**이라 제품/품질 결정(사용자 선택: report-only 유지). (문서엔 report-only 정직 명시 완료)

### 3-E. DB 표준화 잔여 (이전 세션, 제품결정성) — **부분 종결(2026-07-20 실측 정정)**
원 항목은 `biz_cd`·`etc_cd`·로그 개인정보 보존정책·`leader_id` FK 4건 묶음이었다. 실측 결과 **2건은 이미 해소**되어 아래로 좁힌다.

- ~~**`biz_cd` 용도** — 해소~~: `V2_22__event_info_remodel_biz_cd_to_evnt_nm.sql`(커밋 `1ae18fa2c`)로 `tb_event_info.biz_cd`(코드컬럼 오용, 실데이터 0행) → `evnt_nm` 재모델링 후 **DROP**. 라이브 OCI 실측(2026-07-20) `information_schema` 전체 스키마에 **`biz_cd` 컬럼 0건**. 결정할 것 없음.
- ~~**`leader_id` FK 부여** — 해소~~: `V2_23__drop_leader_domain.sql`(동일 커밋, 사용자 개별 승인)로 간부일정(LSM) 死도메인 자체를 제거(`tb_leader_schdl`·`tb_leader_stts` 0행·인바운드 FK 0 실측 후 DROP). 라이브 실측 **`leader_id` 컬럼 0건** → FK 부여 대상이 소멸. 결정할 것 없음.
- **[결정 대기] `etc_cd` 원천 스펙**: `tb_inst_cd_rcptn_log.etc_cd`(varchar 20) 1건만 잔존(라이브 실측). `V2_18` 에서 **DEFER("원천 스펙" 미확정)** 로 남긴 것 — 기관코드 수신 연계의 외부 제공 스펙이 확정돼야 용도·길이·표준용어를 확정할 수 있다. **필요 결정**: 외부 스펙 제공 또는 컬럼 폐기.
- ~~**로그 테이블 개인정보 보존정책 — 수치·활성화 미정** — 해소~~: `LogRetentionScheduler`(business-app) + 술어 인덱스 `V2_20` + 정책 문서 `docs/04-operations/log-retention-policy.md` 구축에 더해, **보존기간이 2026-07-17 확정·활성화**됐다(`228bddb5d`) — `application.yml` `nuri.log.retention.enabled=true`(기본), 테이블별 보존월 `{web,sys,login,user}-months=24`(2년). 형제 문서 `log-retention-policy.md` §3/§5 와 정합. **[결정 대기] 남은 것**은 (1) 가명화 법적 트랙, (2) `tb_login_log` 접속기록 경로 복원 vs 제거 결정(log-retention-policy.md §5) 2건뿐.

---

## 4. 검증 / CI 인프라

### 4-A. CI 빌링 복구 — **⚠ 기록 정정(2026-08-05 실측): "과금 차단" 은 STALE**
- **이전 기록**: "CI(ci.yml) 과금 차단 상태 — 사용자 영역."
- **실측 정정**: **CI 는 돌고 있다.** PR #287 에서 `secret-scan` 이 19초 만에 pass 하고 `backend-build` 가 실제로 기동했다. 아울러 `main` 브랜치 룰셋이 활성화되어 **PR 필수 + required status checks 3종**(`backend-build`·`frontend-build`·`secret-scan`)이 강제된다(직접 push 는 `GH013` 으로 거부됨). 상세는 [wave2-carryover.md §7](wave2-carryover.md).
- **남은 것**: E2E 잡(22티어)까지 실제로 그린인지는 **미확인**이다. "CI 가 안 돈다" 를 전제로 보류한 작업(예: 코드 간결화 계획 Phase 4 의 FE 대규모 리팩터)은 착수 전 **E2E 실행 여부를 실측**하고 재판정할 것.

### 4-B. e2e 상시화
- e2e 는 backend(:8080)+FE(:3001) 기동 필요라 통합 `verify` 게이트에서 제외(별도 `test:e2e`). 상시화는 CI 복구 + 환경 결정.

### 4-C. backend-shape ↔ api-docs 필드레벨 게이트
- 경로레벨 커버리지 게이트는 신설 완료(ApiDocsPathCoverageLinterTest). **필드레벨(스키마 property↔DTO 필드) 대조**는 파싱 복잡·오탐 위험이라 스코프 밖 — 도입 여부/설계 결정.

---

## 5. 리팩터 (저우선 · 큰 비용, 착수 승인 필요)

- **5-A. 거대 클라이언트 컴포넌트 분할** — `UserOrgHubClient`(1035줄) 등. 리팩터 회귀 비용이 커 결정 필요.
- **5-B. api-server config 패키지 재배치** — config 가 `nuri.config`·`nuri.api.config`·`nuri.apiserver.config` 3곳 분산 + `AsyncConfig` 이중 선언(무해하나 중복). 재배치 리스크.
- **5-C. `boards/[id]` 고아 등록폼** — params.id 무시·하드코딩 bbsId 인 레거시 폼. 삭제 여부(제품 판정).
- **5-D. i18n 실채택** — next-intl 골격만(≈0.8% 채택), 하드코딩 한글 지배. **로케일 세트·키 추출 전략** 제품 결정(대규모).
- **5-E. FE 잔여 토큰화** — 액센트 잔여(라이트 파스텔 틴트·히트맵 명암스케일)·`surface-inverse-raised`(중첩 다크 패널) 토큰·캐시명 SSOT 상수화. 디자인 결정 일부.
- **5-F. D1② PK 타입 전면통일** — String PK→표준타입 빅뱅(5레이어). **비권장**(위험·저가치).

---

## 6. 참고: 이미 결정됨 / cosmetic (별도 조치 불요)

- **이미 결정**: 멀티테넌시 단일 테넌트 by design · 콘텐츠 보존정책(사용자 삭제 시 webmaster 재귀속).
  - ~~RBAC 하이브리드 유지~~ — **철회(2026-07-20 정정)**: 2026-07-11 의 "하이브리드 유지" 결정은 2026-07-16 DB 일원화 구현·enforce 전환(`405d91932`)으로 **사실상 뒤집혔다**. 현행은 URL 인가 DB 구동. 상세는 §2-E.
- **cosmetic(이름만, 안 해도 됨)**: `EgovProperty/MessageConfig`·`EgovPasswordEncoder`·`EgovAuthenticationProvider` 개명 — egov 라이브러리를 설정/사용하는 것이라 이름이 정직(개명=false-completion 경계).
- **전환기 필연(제거 불가)**: ARIA 데이터암호(`ariacryptoService`)·`EgovFileScrty` 레거시 해시 검증(로그인 시 BCrypt 마이그레이션 경로).

---

## 7. 관리자 전수감사 잔여 (2026-07-22 — `.gemini/tasks/20260722-admin-menu-completeness-ux-audit.md` §6)

294건 전수감사에서 **에이전트 단독 판단 불가(제품/보안 결정 필요)** 로 분류된 항목. D-9/D-10/D-11/D-14 는 이미 해소(`9504e1380`·`1e1ef8b7b`·`a5dad2b48`·`a73ab2eab`).

- **[결정 대기] 미결 D 항목(10건)** — (삭제 vs 구현) 결정 선행:
  - **D-1 로그 4종**(사용자/웹/개인정보/전송) — 컨트롤러 4개 신설 vs 라우트·서비스·타입 삭제. 개인정보 접근·전송 로그는 컴플라이언스 증적.
  - **D-2 네트워크 관리**(`/admin/system/network`) — GET도 mock 6건이라 도메인 자체 신설 vs CUD 501·화면 비활성.
  - **D-3 결재 양식/워크플로우 스튜디오** — 데모 스캐폴드가 최상위 메뉴 노출 중. 메뉴 하차/재매핑 vs `tb_sanctn_form`+컨트롤러 신설.
  - **D-4 설문 도메인 전체** — 문항·항목 CRUD 15엔드포인트 배선 vs 껍데기 5라우트 삭제(실데이터 존재).
  - **D-5 미노출 백엔드 API 4종**(휴일·상담·ISG·메인이미지) — 관리 화면 신설 vs 샘플 모듈 분리(재사용성 직결, 휴일 우선순위 높음).
  - **D-6 메뉴 SSOT 재편** — 중복 18메뉴·고아 19라우트·부모/자식 동일경로. 마이그레이션 1건이나 정보구조 결정 필요.
  - **D-7 테마 설정 저장 위치** — 사이트 테마 테이블+API+SSR vs "내 브라우저만" 문구 정직화(현 localStorage뿐인데 "전체 적용" 안내).
  - **D-8 댓글/평가 관리** — 만족도 도메인 실존·API 미노출. 컨트롤러 신설 vs 메뉴명 '댓글 관리'로 정정.
  - **D-12 FAQ 정본 경로** — 전용 `/api/v1/faqs` 채택(하드코딩 bbsId 제거) vs 게시판 통합 유지(FaqApiController 작성자 하드코딩·`@PreAuthorize` 부재 보강 선행).
  - **D-13 로그 검색조건 URL 반영** — 검색어 URL 포함 여부(개인정보 vs 공유편의). 페이지·탭만 URL 절충안 가능.
- **[승인 필요] 보안 사안**(코드 변경 전 사용자 승인 — 감사 §C.3): **F-2 · F-3 · F-5**.
- **i18n(F-1)**: 신규 항목 아님 — 위 **5-D. i18n 실채택**과 동일 이슈로 통합 추적.

---

> **처리 방법**: 위 항목 중 결정을 내리시면(예: "1-A는 (c) 템플릿 브랜치로", "3-B route_mdfcn_yn 을 mfcn_cd 로 rename") 해당 작업을 지시해 주시면 진행합니다.
> *Last updated: 2026-07-23 (현행화 감사 반영 — 2-C 미들웨어 deny-by-default 해소[`401c43f4c`]·3-E 로그보존 2026-07-17 확정 종결[`228bddb5d`, 24개월]·§7 관리자 전수감사 잔여(미결 D 10건 + 보안 F-2/3/5) 신설·2-B ssh 언트랙 재발 명시. 이전: 2026-07-20 3-E `biz_cd`·`leader_id` FK 종결·2-E "RBAC 하이브리드 유지" STALE 정정, 2026-07-18 §2 현행화 + 승인군 A~E)*
