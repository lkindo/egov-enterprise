# 벤더 증거 재기록 묶음 — 대기 목록

인증 벤더의 증거 입력을 바꾸는 작업은 바로 하지 않고 이 목록에 모았다가 한 브랜치에서 한 번에 처리한다([DEC-OPS-421](../archived/operational-decisions-history.md#dec-ops-421)). 모든 에이전트(Claude Code·Codex·Gemini)와 사람이 같은 목록을 쓴다. 이 문서는 대기 작업 목록이며 규범이 아니다 — 규칙은 [AGENTS.md 「연속 작업의 시간 예산」](../../AGENTS.md#연속-작업의-시간-예산)이 정본이다.

## 인증 중단과 재개

2026-11-21 부터 PostgreSQL 외 다섯 벤더(Oracle·MariaDB·MySQL·SQL Server·CUBRID)의 인증을 멈췄다([DEC-OPS-422](../archived/operational-decisions-history.md#dec-ops-422)). 원장에서 `preview` 이고 `ci`·증거가 없어 생성기는 PostgreSQL 만 고르고, `reusable-vendor` 잡은 돌지 않으며, `VENDOR_EVIDENCE_STALE` 은 나지 않는다. 화면·서버는 원장만 보므로 열리지 않고, 명령줄 도구 실행만 `COMPOSER_PREVIEW_VENDOR=<벤더 id>` 를 켜면 preview 벤더의 생성물을 만든다([판정](../../scripts/project-composer-recipe.mjs)) — 벤더 잡과 재개 때의 증거용 생성물이 쓰는 경로이며 인증을 뜻하지 않는다.

- **중단 동안**: 아래 목록의 항목은 벤더 입력이라는 이유로 기다리지 않는다. 스키마·데이터·공유 OCI·인가 같은 다른 승인만 지켜 바로 처리하고, 처리한 항목은 목록에서 지운다. 번역 게이트·벤더 SQL 린터·앱 SQL 포트는 그대로 돈다 — 기본 코드에 PostgreSQL 전용 SQL 이 쌓이지 않게 하는 것이 재개 비용을 줄인다.
- **재개(사용자가 정한 때)** — [DEC-OPS-400](../archived/operational-decisions-history.md#dec-ops-400) ② 순서를 따른다.
  1. 한 브랜치에서 다섯 벤더에 `ci: true` 를 되돌리고(승격 전 모양 — `preview`·사유 유지), 중단을 단언한 시험을 고친다: `scripts/project-composer-vendor.test.mjs` 의 ci 목록·preview 목록, `scripts/ci-change-scope.test.mjs` 의 인증 중단 시험과 출력 문자열 시험의 벤더 matrix. PR 과 main 의 벤더 잡이 그동안의 깨짐을 드러내면 그 브랜치에서 고친다.
  2. main 에서 두 레이아웃의 벤더 잡이 통과한 뒤 그 커밋의 demo 멀티모듈 생성물(아직 preview 라 `COMPOSER_PREVIEW_VENDOR` 를 켠 도구 실행으로 만든다)로 엔진마다 증거를 기록한다(`node scripts/project-composer-vendor-evidence.mjs --vendor <id> --version <엔진 버전> --artifact <생성물>`, 다섯 벤더·여섯 엔진에 약 4시간, 기록 중 트리 변경 금지). 그리고 `status` 를 `certified` 로 올리고 사유를 걷으며 선택 표시 시험(`selectableVendors`)을 고친다.
  3. 같은 변경에서 AGENTS.md 의 중단 문장, 이 절, 생성기 가이드·생성기 설계서(단계 표 E)·CI 가이드·다중 DB 설계서·인수인계 문서·공용 메모리 CTX-019 의 중단 문장을 걷는다.
  4. 마지막 증거는 원본 커밋 70cccd261 로 기록했다(fc59efbba). 재개 때 깨진 곳을 찾으면 그 커밋부터 벤더 입력의 변경을 거슬러 본다(`git log 70cccd261..main -- <입력 경로>`).

## 왜 모으는가

입력 파일을 하나라도 바꾸면 `regen --check` 의 `VENDOR_EVIDENCE_STALE` 이 인증 벤더 전부를 막고, 엔진마다 증거를 다시 기록해야 한다(엔진 하나에 수십 분, Oracle 은 약 76분, 기록 중에는 작업 트리를 바꿀 수 없다 — [ADR-0047](../02-architecture/decisions/ADR-0047-multi-database-composer-and-vendor-sql-boundary.md) D-9). 항목마다 따로 하면 이 비용이 항목 수만큼 곱해진다.

## 절차

1. **바꾸기 전에 입력인지 본다.** 판정 정본은 [`scripts/vendor-evidence-inputs.mjs`](../../scripts/vendor-evidence-inputs.mjs)다. 대략 다음이 입력이다.
   - [`config/db-vendors.json`](../../config/db-vendors.json) 의 `evidenceInputs` 가 적은 경로(루트 `build.gradle`·Flyway 마이그레이션·권한 원장 등)와 벤더별 선언 경로
   - [벤더 SQL 원장](../../config/governance/vendor-sql-ledger.json)이 적은 파일, `api-server/src/test/java/nuri/api/schema/` 의 시험 전부, 벤더 시험 원장의 대표 E2E
   - 엔티티·질의 표지(`@Entity`·`@Query`·`@Lock`·`JdbcTemplate`·`VendorSqlDialect`·네이티브 질의 등)를 담은 Java — **주석 속 같은 글자도 걸린다**
   - 모델 생성 도구와 그 import 클로저(import 한 줄을 더하면 그 모듈도 입력이 된다)
2. **바꾼 뒤 확인한다.** `node scripts/regenerate.mjs --check` 가 `VENDOR_EVIDENCE_STALE` 을 내면 입력을 바꾼 것이다(PowerShell 에서는 `npm run regen -- --check` 의 `--` 가 사라지므로 node 로 직접 부른다).
3. **입력이면 그 변경은 되돌리고 아래 목록에 항목을 더한다.** 무엇을·왜·어느 파일·어떻게 검증할지와 관련 GAP·DEC 를 적는다. 입력 밖에서 같은 목적을 이룰 수 있으면 그쪽으로 한다(예: 질의 애노테이션 대신 파생 질의, 입력 파일 대신 호출자 쪽).
4. **묶음은 사용자가 여는 때 한 번에 처리한다.** 인증 중단 동안에는 묶음 없이 바로 처리한다(위 절). 중단 전 계획: ADR-0060 2차 배포가 가능해지는 날(1차 배포 7일 뒤) 이후 Spring Boot 4.1.3 갱신과 함께 연다. 처리한 항목은 이 목록에서 지운다.
5. 사용자가 어떤 항목을 지금 하라고 명시하면 재기록 비용을 알린 뒤 따른다.

## 대기 항목

### 의존성·이미지

- **Dependabot #1052·#1056** — api-server Dockerfile 의 Gradle 이미지, Gradle 라이브러리.
- **MariaDB BOM ext 3.5.11** — 보안 알림을 닫는다(직접 판을 정한 드라이버도 BOM 관리 판이 그래프에 실린다).

### 인증·권한·보안

- **설문 응답 진입 권한(DEC-OPS-405)** — `permission-catalog.json` 의 `pagePermissions` 에서 `/survey/response`·`/survey/response/[id]` 를 `SURVEY_RSP_READ` 로 바꾸고, regen 뒤 라우트 원장 두 행(shell `admin-system`, surface `admin-console`, roles `ADMIN·SYSTEM`)과 처분 해시를 맞춘다. 권한 생성물은 regen 으로 다시 만들고, 두 경로의 허용·거부·권한 조회 실패를 시험으로 고정하며, `admin-link-visibility-census` 의 범위를 점검한다.
- **구 권한 API 7개 제거** — 권한 원장 변경.
- **메일 수신주소의 키링 이전** — 메일 수신주소는 ARIA 와 두 갈래 복호로 옮긴다. (주민번호 키링 운영 필수화는 2026-11-25 변환기 밖 — `ProdRequiredPropertiesGuard`·`application-prod.yml`·운영 오버레이 — 에서 끝냈고, JWT 2차 배포도 같은 날 반영했다. 인증 중단 중이라 벤더 증거 보류가 걸리지 않았다, DEC-OPS-422.)
- **`GlobalExceptionHandler` 의 `IllegalArgumentException` 원문 응답을 고정 문구로** — 먼저 그 문구를 화면 안내로 쓰는 호출부를 `BusinessException` 으로 옮긴다.

### 업무 도메인

- **메일 사용자별 발송 한도(GAP-MAIL-001 ②)** — `MAIL_SEND` 는 일반 사용자 기능으로 두고 `MailService` 에 기간별 수신자 수 한도를 둔다. 한도 값은 그때 DEC 로 정한다.
- **설문 문항·선택지 낙관적 버전(2026-11-19 평가)** — `SurveyQuestion`·`SurveyArticle` 에 `@Version`(스키마 변경, 승인 필요). 두 관리자가 같은 문항을 고치면 나중 저장이 앞 저장을 덮는다.
- **설문 객관식 글 답** — 지금은 거부 대신 저장하지 않는다. `SurveySubmissionConcurrencyIntegrationTest.answers()` 고정물을 고칠 때 거부(400)로 바꿀지 판단한다.
- **`User`·`DeptManage` 의 `@Version`, 공통코드 상세 표시 순서 컬럼** — 스키마 변경.
- **`MenuService` 단건 수정** — `updateMenuManage`·`updateMenuOrders` 가 구조 저장과 같은 검증(3단계·버전·숨김 그룹)을 지나게 하거나 퇴역한다.
- **부서 업무 이동 시 대상 부서 확인** — 업무 등록·이동은 대상 업무함 존재를 확인한다. 다른 부서 업무함 지정까지 제한할지는 현재 부서 간 배정 유스케이스를 확인한 뒤 결정한다.
- **부서 업무함 FK** — `tb_dept_job_bx.dept_id` → `tb_ognz_info`(NOT VALID → 고아 0건이면 VALIDATE). 스키마 승인 필요.
- **도움말·온라인 매뉴얼 공개 상태(초안/공개)** — 새 컬럼과 공개 목록 필터. 스키마 승인과 제품 판단이 먼저다.
- **인덱스 마이그레이션 둘** — `tb_ifml_atrz_info(aplcnt_id, ifml_atrz_sn DESC)`, `tb_note_rcptn(rcvr_id)`. 넣기 전에 EXPLAIN 으로 사용을 확인하고, 공유 OCI 적용은 병합 뒤 따로 승인받는다.
- **서버 메시지 어미(DEC-OPS-417)** — 화면과 짝인 네 곳의 '~하십시오' 를 '~해 주세요' 로(`BoardMasterService`·`XlsxExport`·`LoginLogApiController`·`GlobalExceptionHandler`·`messages_ko.properties`), 화면 시험의 흉내 문구도 맞춘다.

### 메뉴·IA

- **로그·모니터링 메뉴 정리 마이그레이션(2026-11-08 승인)** — 9040310 숨김 전에 그 메뉴만 배정된 그룹에 9040320 NAVIGATION 을 옮기고(V2_137 형식), 이름 여덟 개를 바꾼다. 병합 뒤 공유 OCI 적용.
- **IA 보류 행 결정(DEC-OPS-408)** — 조건 전문은 보관 원문 DEC-OPS-408 ③. `/admin` 관리 현황, `/admin/stats/data-usage` 숨김, `/survey/response` 응답 관리, `/admin/community/board` 게시판 둘러보기, `/admin/work-hub` → `/smart-toolkit/dept-job` 리다이렉트, `/smart-toolkit/schedule/dept` 일정 목록, 옛 별칭 네 건 삭제. 각 처분 행은 그 PR 에서 승인으로 바꾼다.
- **게시판 생성기 권한 문구** — 화면 용어 원장의 열린 지적. 대표 E2E `board-articles.spec.ts` 가 고정한다.

### 검증·CI·도구

- **백엔드 JaCoCo 하한 상향(2026-11-10 승인)** — LINE 0.85→0.88, BRANCH 0.70→0.75(세 검증 태스크 모두). 새 ADR 로 하한의 정본을 게이트 원장으로 옮긴다. 묶음 시점에 실측을 다시 재고 여유가 줄었으면 다시 묻는다.
- **표준 메타 1차 등록(GAP-STD-001, DEC-OPS-412 ③)** — 처분안의 준비 항목을 메타 전용 마이그레이션으로 등록하고, C 항목은 이관 원장에서 `nonStandardTarget` 으로 확정한다. 묶음 시점에 같은 쿼리로 다시 대조하고 공유 OCI 적용은 따로 승인받는다.
- **무거운 검증 대기열의 남은 연결(DEC-OPS-413)** — `run-isolated-e2e.mjs`·`generate-reusable-base-db.mjs` 의 CLI 분기에 `ensureQueued` 를 넣고, 가드의 해당 항목과 SOP §6.3·GAP-AGENT-001 의 '재기록 묶음에서 연결' 문구를 걷는다.
- **벤더 잡의 Gradle 데몬 재사용(ADR-0061 「하지 않은 것」 R2)** — `project-composer-vendor-integration.mjs` 의 `--no-daemon` 을 CI 에서만 걷고 끝에 `--stop` 한다.
- **`VendorTestSql.java` 의 CUBRID 관측 임시 파일** — 시험 스레드가 중단되면 프로세스를 끝내지 않고 지우며 실패를 무시해 임시 파일이 남는다.
- **벤더 대표 E2E 앱 기동 대기 하한(`240초`) 보장** — `scripts/run-isolated-e2e.mjs` 가 `vendorRuntime.engine.maxWaitSeconds * 1000`(`cubrid` `120초`)을 그대로 넘겨 기본값(`180초`)보다 짧아지면서 Windows Docker TCP 의 CUBRID Flyway(`77~92초`)+기동(`~60초`)이 시간 초과되는 문제를 `applicationReadyTimeoutMs`(`Math.max(240_000, maxWaitSeconds * 1000)`) 로 해소(`scripts/project-composer-vendor.test.mjs` 로 고정).
- **E2E 정리** — `security-administration.spec.ts` 의 완전 회수 단계를 BFF 로그인으로 되돌린다. `authentication.spec.ts` 에서는 로그아웃과 겹친 배너·팝업 조회의 간헐 실패를 고친다 — 허용 항목으로 덮지 않는다.
