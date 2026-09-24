# 완성도 후속 보강과 검증 경계

## 의존성

애플리케이션 의존성과 Gradle 플러그인 classpath는 별도로 검사한다. 루트 `buildscript`
constraints는 Dependency-Check/Boot 플러그인이 사용하는 HttpClient/cache 5.6.4,
HttpCore/h2 5.4.3을 하한으로 둔다. 애플리케이션 BOM만 바꾸면 이 경로는 보호되지 않는다.
프론트엔드의 Hono 4.13.5, qs 6.16.0, postcss-selector-parser 7.1.3은 기존 의존 경로의 패치다.
상위 패키지가 패치 버전을 직접 공급하면 override 제거 후 실제 해석 결과와 감사를 재검증한다.

PIT 1.19.0의 JUnit Launcher 자동 탐색은 BOM override를 상속하지 않는 임시 configuration을
생성했다. 로컬 resolution listener에서 이 경로에만 Boot 3.4.2·Log4j API 2.25.3이 나타나고,
실제 compile/runtime/test 경로는 각각 3.5.16·2.25.5임을 확인했다. 공통 `testRuntimeOnly`에
Launcher를 명시하고 `addJUnitPlatformLauncher=false`로 중복 탐색을 제거한다. JUnit의 기존
버전 관리와 PIT 분석 범위·임계값은 유지하며, 의존성 제출 필터나 보안 예외를 추가하지 않는다.

GitHub 경고는 선언·전이 그래프와 실제 Gradle 해석 결과를 대조한다. 로컬 패치만으로 원격 경고가
닫혔다고 판정하지 않는다. 재현 절차는 [Dependabot 런북](dependabot-alert-census.md)을 따른다.

기존 SAST 예외 6건의 규칙·위치·만료일은 유지한다. FP-001/002의 JWT 필터는 DB 장애에
503으로 체인을 중단하도록 바뀌었으며 stateless Bearer·Origin 검사의 근거를 다시 확인한다.
FP-007의 두 Gradle 지원 파일은 플러그인 패치·Launcher 선언·테스트 자식 JVM classpath만 바뀌고 H2의
테스트 전용 범위를 유지한다. 해당 지원 파일 해시만 갱신한다. 하네스 동결 manifest는 새
날짜 계약 검사와 첨부 참조 PostgreSQL 검사 등록, 이 지원 근거의 해시 변경을 반영한다.

## 날짜·입력 계약

`foundation/.../core/validation/Ymd.java`의 달력 정규식이 Bean Validation `@Pattern`에서
OpenAPI와 생성 Zod로 전파된다. 일정 2, 행사 3, 설문지 2, 온라인 설문 2, 업무보고·메모보고·
외부인력 각 1개, 총 12필드가 대상이다. 윤년·월별 말일·0000년·공백을 검사하며 선택 날짜의
null/빈 문자열은 보존한다. 일정·행사·설문지·온라인 설문의 종료일은 시작일보다 빠를 수 없다.
행사 정원은 음수가 될 수 없고, 온라인 설문의 폐기 여부는 Y/N이다.

기존 조회 응답과 쓰기 입력의 차이는 `EventInfoRequest`, `OnlinePollManageRequest`로 표현한다.
조회 데이터가 과거 입력 기준을 따르더라도 관리자가 읽고 보정할 수 있어야 한다.
2026-09-10 OCI 읽기 전용 집계에서 다음 데이터 보정 필요성을 확인했다.

| 대상 | 실측 | 보정 조건 |
|---|---|---|
| `tb_onln_poll_manage` | 3행의 시작일·종료일 모두 길이 8의 `YYYY-MM-` 형태, 숫자 8자리 아님 | 원래 일자를 확인해 수정 화면에서 재입력. 빠진 일을 추정하지 않는다. |
| `tb_event_info` | 107행 중 이름이 null 또는 공백인 행 24개 | 실제 행사명을 확인해 수정. 이후 쓰기는 공백 이름을 거부한다. |

이 작업은 OCI 값을 변경하지 않았다. 나머지 대상 날짜의 형식 오류, 행사 음수 정원·기간 역전,
온라인 설문 Y/N 오류는 실측 집계에서 0건이었다. 표본 데이터 값을 문서에 복제하지 않는다.

## API와 화면 연결

설문 템플릿 수정은 상세 API에서 최신 상태를 읽고 유형·설명을 수정하며, 화면에 없는 템플릿
경로는 상세 응답의 값을 보존한다. 조회 실패 시 목록 값을 대신 사용하지 않고 재시도를 허용한다.
생성/수정/삭제의 중복 요청과 겹치는 작업을 막는다.
격리 API·DB와 실제 브라우저에서 수정 후 재조회·새로고침, 숨겨진 경로 값 보존,
삭제 후 404 응답까지 확인했다.

미소비 operation은 11에서 10으로 감소했다. 미소비·화면 고아의 현재 수치는 이 문서가 아니라
[operation census](../../config/governance/operation-consumer-census.json)의 `expected`가 정본이며, 그 값은
공용 메모리 계약이 GAP-WIRING-001 행과 양방향으로 대조한다.
이 수치는 이름 기반의 보수적 정적 분석이며 완전한 호출 그래프는 아니다. 예를 들어 다른
서비스의 `updateTemplate` 호출만으로 설문 서비스까지 소비 중인 것으로 집계될 수 있었다.
현재 설문 수정은 실제 화면 호출과 동작 테스트로 확인한다. 새로운 상세 메서드 이름도
`getSurveyTemplate`로 구체화해 다른 템플릿 도메인의 고아 메서드를 가리지 않는다.

나머지 미소비 API를 일괄 연결하지 않는다. 가입·중복 ID 검사는 관리자 계정 발급 결정,
기관코드 상세는 공급 명세, health 경로 폐기는 배포 환경 확인에 묶여 있다. 알림·일정·메뉴·
통계의 별도 단건/평면 조회는 현재 화면의 목록·범위 조회와 목적을 대조해야 한다.
관리자 메일 이력에 본문 조회를 붙이는 것은 DEC-OPS-022의 프라이버시 경계를 위반한다.
원장은 [operation census](../../config/governance/operation-consumer-census.json)와
[활성 gap](../../.agent/memory/known-gaps.md)의 GAP-WIRING-001이다.

## 화면 문구 규범 편차

2026-09-15 화면 용어 원장의 계약 수준 규범 검토([DEC-OPS-100](../../.agent/memory/decisions.md))에서 확인했지만 그 변경에서
고치지 않은 편차다. 결함으로 고친 것은 `mustNotImply` 위반, 미측정의 0 표시, 기능을 과장하거나 대상을 잘못 부르는
용어뿐이다. 아래는 필수 정보가 빠졌지만 잘못 암시하지는 않는 문구, 예외 검토가 필요한 용어, 소유자 결정이
필요한 항목이다. 원장 `reviewBy`의 다음 규범 검토에서 화면별로 처분하며 일괄 치환하지 않는다.

| 분류 | 대표 위치 | 규범 | 처분 조건 |
|---|---|---|---|
| 날짜 형식 | 원시 `yyyyMMdd`: 포상·메모보고·업무 허브 보고·기관코드·외부인사 목록. 점 구분: 부서 일정·행사·주소록·게시판 템플릿·설문 관리. 전송 원문: 쪽지 목록, 로그 내보내기 | `formatRules.date`, `formatRules.time.dateTimeDisplay` | 날짜 표기 가드가 템플릿 조합 구분자를 보도록 넓히면서 함께 고친다 |
| 시간대 고지 | 로그·예약 화면, 메일 발송 화면의 로케일 시각 | `formatRules.time.zoneDisclosure` | 화면·내보내기마다 기준 시간대 한 번 |
| 파괴적 확인 | 권한 그룹 편집·프로그램 등록·부서 권한·결재 반려의 기본 `확인` 버튼, 기안 취소 옆의 `취소` 닫기 | `actionRules.destructive-action` | 확인 대화 가드를 `confirmText` 검사로 넓힐지 결정 |
| 안내용 확인 대화 | 게시판 목록의 영구 삭제 불가 안내 | `actionRules.verb-object` | toast·단일 버튼 모달 |
| 대기·저장 라벨 | 부서·사용자 폼의 대상 없는 `처리 중…`, `수정 완료`, 저장 동작의 `배포`·`동기화` | `actionRules.pending-action` | 해당 폼 수정 시 |
| 허브 | 협업·공통코드·결재·모니터링 제목과 breadcrumb, 메뉴 9010100 이름, 템플릿 표시 이름 `지식 허브` | `term-hub` | 메뉴 이름은 메뉴 결정과 Flyway, 화면 제목은 화면별 |
| 장식용 기술 용어 | 관리자 화면의 `아키텍처`·`프로토콜`·`코어`(보안 그룹 등록 알림, 공통코드 명세 제목, 배너 상태 라벨 등) | `term-architecture-protocol-core` | 대상 독자·의미 예외 검토 또는 결과 중심 표현 |
| 영문·약어 | 모니터링 게이지 제목(e2e 고정), 게이지 임계 배지, 토폴로지 노드 이름, 사용자 폼의 이중 번역 | ADR-0002, `term-standard-acronyms` | e2e 갱신과 함께 |
| 필수 정보 누락 | 실패한 작업 없이 서버 메시지만 보이는 오류, 대체 경로 없는 미지원 고지, 홈 권한 안내의 문의 경로, 목록 수준 403 을 일시 오류로 보이는 공용 오류 표시 | `server-error`·`unavailable`·`permission-denied` | 화면별 |
| 서버 메시지 규칙 | 가이드 §5 의 "서버 메시지를 그대로 보여 주지 않는다" 와 DEC-OPS-037·095 의 서버 문구 표시 | 소유자 결정 | `Accept-Language` 전달을 확인한 뒤 가이드나 결정을 정정 |
| route capability 원장 | 부재·검색·알림 health·결재·재가 엔진 상태 행의 낡은 판정, 알림 목록 capability 표시 이름 ⚠ 이 중 부재 행은 2026-09-23 실측으로 정정했다(DEC-OPS-115) — 나머지는 그대로 남는다. | `normativeSources` | route 원장 소유자 재검증 |
| 한 화면의 두 이름 | 행정구역 코드(메타 제목·PageHeader·셸 제목 3종), 투표 참여(제목 `투표 참여` ↔ breadcrumb `여론조사 참여`), 감사 이력(대시보드 h2·위젯 h2·푸터 3종) | `term-hub`·ADR-0002 | 화면별로 정본 이름 하나를 정한다 |
| 한 용어의 두 표기 | 온라인 투표 관리의 `설문 명`↔`설문명`, 게시판 마스터 모달의 `게시판 이름`↔`게시판 명칭` | `term-standard-acronyms` | 같은 화면 안에서 먼저 통일한다 |
| 파괴 동사 불일치 | 게시판 마스터 한 화면의 `영구 물리삭제`·`영구 삭제`·`완전 말소`, `일괄 비활성`↔`비활성화 처리 중...` | `actionRules.destructive-action`·`verb-object` | 화면 단위로 동사 하나를 정한다 |
| 은유·콘솔 용어 | 게시판 마스터의 `마스터 아이템`·`메타 정보`·`작업 컨트롤`·`콘솔`·`생성 마법사`(e2e·메뉴 시드 고정), 결재 양식 허브의 `아키텍처` | `term-architecture-protocol-core` | e2e·메뉴 시드와 함께 바꾼다 |

## 정기 첨부 점검

운영 프로파일은 매일 03:15 Asia/Seoul에 읽기 전용 점검을 실행한다.
`ATTACHMENT_INTEGRITY_ENABLED=false`로 끌 수 있고, cron과 `MAX_ITEMS`는 각각
`ATTACHMENT_INTEGRITY_CRON`, `ATTACHMENT_INTEGRITY_MAX_ITEMS`로 조정한다(기본 50,000).
전용 단일 스레드 executor를 사용해 대시보드 등의 공용 스케줄러를 점유하지 않는다.

파일 점검은 DB/저장소 열거 항목 수와 I/O 사이의 60초 경과를 검사한다. DB 트랜잭션도
60초 timeout을 둔다. 저장소 드라이버가 한 번의 I/O에서 멈추는 시간을 강제로 보장하는 것은
아니므로 네트워크 스토리지는 별도 드라이버 timeout도 설정해야 한다. 상한에 도달한 실행은
부분 결과를 성공으로 반환하지 않는다.

업무 참조 점검은 활성 `AttachmentSourceContributor`의 숫자 참조와 팝업의 두 파일 URL
형식을 대조한다. 개인정보 값·원본 파일명은 결과에 넣지 않는다. 접근권을 부여하지 않는
파생 다운로드 이력은 업무 참조 점검에서 제외하며, 인가 정책 자체는 바꾸지 않는다.
OCI에서 대상 11종의 물리 컬럼을 확인했고, 2026-09-10 집계 당시 대조할 업무 참조 값은
0건이었다. 누락 참조 탐지는 격리 PostgreSQL의 정상/누락 숫자·URL 참조로 별도 검증한다.

결과는 `storage/diagnostics/attachment-integrity/latest.json`과 `last-complete.json` 두 개다.
전자는 실패·미완료도 기록하고 후자는 완주한 결과만 갱신한다. 기존 Compose의 `/app/storage`
볼륨 아래에 있어 컨테이너 교체 후에도 유지된다. `ATTACHMENT_INTEGRITY_REPORT_DIRECTORY`로
위치를 바꾸면 지속 볼륨 내부인지 확인한다. 심볼릭 링크를 통과하는 기록 경로는 거부한다.

`nuri.attachment.integrity.runs{outcome=...}` 카운터의 PASS/DRIFT/INCOMPLETE/FAILED/REPORT_FAILED를
수집한다. 고아 후보는 커밋 전 업로드일 수 있으므로 자동 삭제하거나 확정 유실로 취급하지 않는다.
파일·업무 행·권한·보존 기간은 이 점검으로 변경하지 않는다. 운영에서 실제 실행됐다는 증거는
해당 환경의 결과 파일과 메트릭으로 확인한다.

## 혼합 부하와 장애 복구

재현 명령은 `./gradlew compileJava :api-server:readinessRuntimeClasspath -I scripts/readiness-runtime-classpath.gradle`
후 `node scripts/run-isolated-readiness.mjs`다. 설치된 k6, Docker, Java와 e2e 시드용
`TEST_USERNAME`/`TEST_PASSWORD` 환경변수가 필요하다. `K6_BINARY`로 실행 파일 위치를 지정한다.
8080 포트가 사용 중이면 중단하고, 새 loopback PostgreSQL만 생성한다. 기존 `.env`나 운영 DB
접속 설정은 적재하지 않는다. 컨테이너 소유 label을 확인한 뒤 장애를 주입하며 종료 시 제거한다.

5 VU smoke 후 60초 증가·60초 유지·15초 감소로 최대 100 VU를 실행한다. 매 반복은 사용자
목록·대시보드를 읽고, 다섯 반복마다 일정 생성→조회→수정→재조회→삭제→404 확인을 수행한다.
HTTP 성공뿐 아니라 실제 저장 결과를 검사하며, `checks == 1`, HTTP 오류율 <1%, p95 <1초가
종료 코드에 연결된다. 의도적으로 잘못된 HTTP 200 본문을 돌려주는 대조 서버에서 k6가
종료 코드 99로 실패하는 것도 확인했다.

2026-09-10 격리 Windows/Java 21/PostgreSQL 17, Hikari 최대 10의 첫 실행은 요청 15,429건,
check 24,930건, 오류율 0%, p95 41.93ms였다. 최종 소스로 백엔드·프론트 전체 검사와 함께
재실행한 결과는 요청 14,575건, check 23,534건, 오류율 0%, p95 180.01ms, 최대 779.98ms다.
두 실행 모두 남은 합성 일정은 0건이다. 동시 작업 조건이 다르므로 성능 증감 비교나 운영
데이터 규모·500/1000 VU 용량 보장의 근거로 사용하지 않는다.

장애 단계는 별도 API 프로세스의 풀을 2개로 제한한다. 두 연결의 DB lock 대기를 관측한 뒤
추가 요청의 실패를 검사하고, DB pause/unpause도 실행한다. `--recovery-only`는 혼합 부하를
생략하고 이 단계만 재현한다. JDBC connect/socket timeout은 격리 시험 프로세스에만 설정한다.

실측에서 JWT 자체가 유효해도 사용자 DB 조회 예외를 삼켜 401이 되는 경로를 발견했다.
`JwtAuthenticationFilter`는 저장소/트랜잭션/인증 서비스 장애에 503과 `Retry-After: 5`를 반환한다.
쿠키를 제거하지 않고 체인을 중단하며, 실제 잘못된 자격의 인증 거부는 유지한다. 프론트의
503 처리도 재발급·로그인 이동을 일으키지 않는지 검사한다. 재검증에서는 두 장애 모두 약
3초 후 503, 복구 후 같은 토큰으로 30~34ms의 정상 PageResponse를 확인했다.

## 이관 원천 탐색의 실제 Oracle 실측

2026-09-14에 `oracle-catalog` 어댑터를 실제 Oracle에 직접 실행했다. 대상은 Oracle AI Database 26ai Free 23.26.3(Docker `gvenzl/oracle-free:23-slim-faststart`), 드라이버는 Maven Central ojdbc11 23.26.3이다.
원천 스키마에는 테이블·파티션·identity·CLOB/BLOB·TIMESTAMP WITH TIME ZONE·뷰·구체화 뷰·시퀀스·동의어·타입·
프로시저·함수·패키지·트리거·주석·제약을 두었다. 저장소 밖 일회용 프로브로 CLI 승인 게이트를 거치지 않고
`discover`만 호출해 드라이버 동작을 봤다.

| 결함(실측) | 원인 | 수정 |
|---|---|---|
| 기본값 있는 테이블의 컬럼이 중간에서 끊김(`ORA-17027`) | `getColumns`의 LONG 열(`COLUMN_DEF`)을 뒤 열보다 늦게 읽음 | 열을 명세 순서대로 한 번씩 읽는다 |
| 탐색이 원천 테이블 통계를 수집(`LAST_ANALYZED` 갱신), 읽기 전용 연결에서는 인덱스 조회 실패 | `getIndexInfo(approximate=false)`에서 드라이버가 `DBMS_STATS.GATHER_TABLE_STATS` 실행 | `approximate=true`로 호출한다 |
| 스키마 하나를 요청해도 364초 | 사전 조회에 스키마를 넘기지 않아 전체 딕셔너리를 조회 | 요청 스키마를 이스케이프해 `getTables`·`getProcedures`·`getFunctions`에 넘긴다 |
| 파티션·권한 조회 실패 | `HIGH_VALUE`(LONG) 뒤 열을 먼저 읽음, `ALL_TAB_PRIVS`에 `OWNER` 열 없음 | LONG 열을 SELECT 마지막으로, `TABLE_SCHEMA AS OWNER` |

수정 후 같은 스키마에서 탐색은 364.5초에서 5.9초가 됐고, 객체는 55개에서 69개가 됐다(컬럼 20개 전부, 기본값·identity·권한·파티션 포함).
조회 실패 판정은 0건이고, 통계가 생긴 테이블도 0개였다. 일부 테이블에만 SELECT 권한이 있는 계정은 권한 있는 테이블만 보았고,
"빈 결과가 부재를 증명하지 않는다"는 PARTIAL 판정을 남겼다. 네 결함은 `JdbcMetadataRealDriverBehaviorTest`가 고정한다.
이 테스트는 LONG 스트림처럼 앞선 열 재읽기를 거부하는 결과 집합을 쓰며, 수정을 하나씩 되돌리면 각각 red가 된다.

이 실측은 원천 탐색의 증거이며, 후속 단계의 2026-09-15 검증은 아래에 구분한다. Oracle 어댑터 증거 수준은
`UNVERIFIED`로 유지한다. SCN 스냅샷, 운영 규모, 19c 등 다른 버전과 외부 드라이버 commit 자격은 검증하지 않았다.
Tibero는 당시 실행 환경을 확보하지 못해 실측하지 못했다. 후속 준비 상태는 [실행 환경 점검](#tibero-및-oracle-19c-실행-환경-점검)을 따른다.

## 이관 Oracle 후속 단계 실측

2026-09-15 로컬 Docker의 폐기용 Oracle AI Database 26ai Free `23.26.3.0.0`
(`gvenzl/oracle-free:23-slim-faststart`)와 PostgreSQL `17.10`, ojdbc11 `23.26.3.0.0`으로 후속 단계를 시험했다.
합성 원천 데이터만 사용한다. 첫 실측에서는 가시성 미증명으로 plan이 차단되고, BLOB 기록 실패와 CLOB의
large object OID 문자열 저장을 확인했다. 후속 구현은 소유자 범위의 가시성과 LOB 본문 처리를 보완한다.
Oracle의 `UNVERIFIED` 등급과 외부 driver의 공개 commit 금지는 유지한다.
`commitReady=true`는 plan의 승인·분류 완성을 뜻하며, load 단계의 vendor/driver 자격 검사를 대신하지 않는다.

| 경로·단계 | 실제 결과 | 근거 |
|---|---|---|
| 공개 workflow: discover → plan → 객체별 review → validate | 명시한 local owner의 TABLE/COLUMN/PRIMARY_KEY 범위에서 가시성을 증명하고 승인된 plan의 `commitReady=true` 확인 | [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/OracleWorkflowPostgresIntegrationTest.java) |
| 공개 workflow: dry-run | scalar 501행과 BLOB/CLOB 본문 변환, `DRY_RUN/PASS` 실행 artifact. target 업무 행·control 스키마 무변경 | 같은 workflow 테스트 |
| 공개 workflow: 승인 누락·commit·환경 변경 | 미승인 plan, adapter/freeze 확인 누락, `UNVERIFIED` commit 거절. target fingerprint 변경 시 이전 review·plan 재사용 거절 | 같은 workflow 테스트 |
| 가시성·권한 경계 | CREATE SESSION만 부여한 local owner의 테이블·컬럼·PK와 빈 스키마 탐색. 다른 소유자의 일부 SELECT 권한·CURRENT_SCHEMA 변경·미존재 스키마·미지원 객체 범위는 차단. 메타데이터 조회 실패도 차단 유지 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/OracleDiscoveryVisibilityIntegrationTest.java) |
| 직접 ETL 엔진: scalar dry-run·load·오류 복구 | Oracle NUMBER/VARCHAR2 1,001행. 오류 행 501만 미기록, 나머지 1,000행과 checkpoint 보존. 오류 행 정정 후 전체 값 일치·재반복 무중복·target 변조 탐지 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlOraclePostgresIntegrationTest.java) |
| 직접 ETL 엔진: 프로세스 종료·재개 | 1,001행 중 8행에 합계 152MiB LOB. 최대 힙 128MiB JVM을 500 checkpoint와 504 checkpoint(LOB 4행 포함)에서 각각 종료하고 새 JVM으로 재개·재반복·전체 내용·무중복·BLOB/CLOB 변조 탐지 | [Oracle JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlOracleCrashRecoveryIntegrationTest.java) |
| 직접 ETL 엔진: 16MiB BLOB → bytea | 전체 바이트·checksum, NULL/EMPTY_BLOB 구분, 재반복 무중복, 마지막 바이트 변조 탐지. PostgreSQL large object 증가 없음 | 엔진 통합 테스트 |
| 직접 ETL 엔진: 대형 Unicode CLOB → text | 전체 본문·checksum, NULL/EMPTY_CLOB 구분, 재반복 무중복, 마지막 문자 변조 탐지. PostgreSQL large object 증가 없음 | 엔진 통합 테스트 |
| 직접 ETL 엔진: LOB 오류 행 재시도·변환 | batch 제약 실패 후 BLOB/CLOB 본문으로 행별 재시도, 미기록 행 수정 후 재개. CLOB trim 결과와 영속 checksum 결속 | 엔진 통합 테스트 |
| 직접 ETL 엔진: 크기 초과 | 실제 32MiB+1 byte BLOB은 `LOB_SIZE_LIMIT_EXCEEDED`, target/checkpoint 0행, 검증 FAIL | 엔진 통합 테스트 |

CLOB fixture는 `본문🙂-` 1,048,576회 반복이다(Java UTF-16 5,242,880 단위, UTF-8 11MiB).
긴 `setCharacterStream`으로 fixture를 넣었을 때 이모지가 손상되는 현상도 관측하여, 최종 fixture는 Oracle 내부
LOB 연결 연산으로 생성하고 `getCharacterStream` 전체 내용과 먼저 대조한다. 일반 로그에는 본문을 남기지 않는다.

현재 엔진은 ResultSet이 열린 동안 BLOB을 `byte[]`, CLOB을 `String`으로 읽고 locator를 해제한 뒤
변환·checksum·target 바인딩에 같은 본문을 사용한다. 바이너리를 내장 문자열 변환·codemap·`type: text`에
통과시켜 객체 주소 문자열로 저장하는 경로는 거절한다. 기존 SHA-256 framing은 유지하며 Base64·UTF-8 인코딩을
유계 버퍼로 처리한다. 대상 검증은 `fetchSize=1` cursor로 행마다 checksum을 계산하고 키·건수·hash만 보관한다.
구현 digest는 새 helper를 포함한 모듈 전체 class/JAR bytes에 결속되므로 기존 승인 plan은 재작성·재승인해야 한다.

값별 상한은 **BLOB 32MiB, CLOB 16,777,216 UTF-16 단위**다. 행 보관 크기 추정치는 64MiB까지이며,
페이지는 최대 500행 또는 누적 8MiB에 도달하면 나눈다. 8MiB는 마지막 행을 포함한 뒤 검사하는 분할 기준이다.
CLOB 임시 복사·JDBC 버퍼·identity/checkpoint 목록을 포함한 JVM 전체 힙 상한이 아니며, 임의 크기 LOB를
디스크로 spool하는 구현도 아니다. source와 target의 `fetchSize=1`은 JDBC 힌트이며 드라이버 버퍼의 강제 상한이 아니다.
크기 초과·길이 불일치는 잘라 저장하지 않고 실패한다.
Oracle의 `NCLOB`, `LONG*`, `SQLXML`, quoted identifier와 vendor-specific type은 공개 load에서 계속 차단한다.
아래 MySQL의 `LONGVARCHAR`/`LONGVARBINARY` 처리는 MySQL 전용 capability이며 Oracle의 범위를 넓히지 않는다.

가시성 증명은 로그인 사용자·현재 사용자·현재 스키마·local owner가 일치하고 시스템/공통 계정이 아닌 경우만 적용한다.
catalog를 지정하지 않고 시스템 객체를 제외한 단일 스키마 범위여야 한다.
`--schemas=<정확한 owner>`와 `--object-kinds=TABLE,COLUMN,PRIMARY_KEY`처럼 범위를 명시한다.
소유자는 객체에 대한 암묵적 쓰기 권한도 있으므로 이 증명은 SELECT-only 계정이나 source freeze 증명이 아니다.
다른 스키마의 일부 객체 권한과 기본 전체 객체 범위는 아직 완전한 가시성을 증명하지 못한다.

재현: `npm run verify:migration`(기존 CI와 같은 독립 모듈 compile/test/bootJar 경로).
2026-09-15 전체 회차는 493건 중 489건 통과, 복구 시험 2건 시간 초과, Windows 심볼릭 링크 시험 2건 skip이었다.
이후 아래 명령으로 Oracle·PostgreSQL 복구 시험을 재실행하여 2건 모두 통과했다. 각 시험의 최신 결과는
**491건 통과·2건 환경 skip**이며, 실제 Oracle 통합 시험은 총 17건이다. 증거는 전체 회차와 복구 재실행의
조합이고, 단일 전체 회차의 green 결과는 확보하지 않았다. compileJava·compileTestJava와 bootJar도 확인했다.

```sh
./gradlew :migration-tool:compileJava :migration-tool:compileTestJava :migration-tool:test \
  --tests '*EtlOracleCrashRecoveryIntegrationTest' --tests '*EtlCrashRecoveryPostgresIntegrationTest' \
  --no-daemon --warning-mode fail --console=plain "-Dfile.encoding=UTF-8"
```

Windows PowerShell에서는 `./gradlew` 대신 `.\gradlew.bat`를 사용하고 JVM 속성의 따옴표를 유지한다.
각 실행의 JUnit XML이 결과의 정본이다. 로컬 결과는 `migration-tool/build/reports/oracle-lob-before-crash-diagnostics/`와
`migration-tool/build/reports/oracle-lob-crash-final/`에 분리 보존했으며 후자의 `verification-summary.json`에 집계를 남겼다.
Oracle 복구 회귀의 hang 방지 상한은 worker 완료·checkpoint 도달 각각 180초, DB 초기화 5분이다.
큰 fixture에서 기존 45초·90초 및 초기화 3분 제한에 걸린 사례를 반영했다. 최종 Oracle 재개·반복 PASS는
JVM 내부 측정으로 각각 약 91.5초·118.4초였다. advisory lock으로 고정한 500·504 종료 지점,
최대 힙 128MiB와 데이터 검증은 유지하며 checkpoint 초과는 즉시 실패한다. 단계 시간과 checkpoint 증가,
45초 시점의 상태를 기록한다. 최종 두 번째 종료 회차는 45초에 501건, 약 68.7초에 504건을 기록했다.
자식 콘솔의 문자셋과 무관하게 ASCII 단계 기록을 수집한다.
이 시간 상한은 처리 성능 보장값이 아니다. PostgreSQL 복구 회귀의 기존 45초·90초 제한은 유지했다.

프로파일 표본에서는 PostgreSQL 원천 cursor 읽기·대상 검증의 JDBC 응답 대기와 Oracle LOB 읽기·문자 변환이
관측됐다. 같은 표본의 GC 시간은 작고 PostgreSQL lock 대기는 관측되지 않았다. `fetchSize=1`의 왕복 비용과
실행 환경에 따른 시간 변동은 후속 성능 검증 대상이며, 이 표본만으로 전체 지연 원인을 확정하지 않는다.
Oracle 테스트만 실행할 때는 `./gradlew :migration-tool:test --tests '*Oracle*IntegrationTest'`를 사용한다.
Oracle 의존성은 테스트 전용이며 배포 bootJar에 포함되지 않는다. 공개 workflow는 실제 runner·adapter와 테스트
classpath 드라이버를 사용하므로, 외부 driver JAR를 전달한 배포 CLI의 승인형 전체 성공 증거로 해석하면 안 된다.
직접 엔진 시험은 승인 게이트 아래의 구현 검증이며 Oracle의 운영 사용을 승인하거나 차단을 해제하지 않는다.

구현 감사(L2): 백엔드·DB 헌법과 현재 diff를 대조했다. 변경은 독립 `migration-tool`의 JDBC 경로이며
온라인 API·Entity·운영 Flyway/메타 표준을 변경하지 않는다. 실제 스키마 확인과 DDL/DML은 폐기용 DB에 한정한다.
소스 freeze 확인, 승인 digest 재대조, target INSERT와 checkpoint의 원자적 기록을 유지한다.
검증기는 자신이 시작한 읽기 트랜잭션만 정리하며 호출자의 미커밋 트랜잭션은 보존한다.
오류 보고에는 고정 reason code를 사용하고 자격증명·LOB 본문을 담지 않는다. 가시성 누락·승인 누락·크기 초과·
잘못된 LOB 길이·정렬 키 중복·본문 변조를 거부하는 음성 사례가 기존 모듈 테스트/CI 실행 경로에 연결된다.

남은 작업은 실제 도입 버전·외부 driver digest별 commit 자격, 다른 스키마를 읽는 최소권한 계정의 완전한 가시성,
SCN·운영 규모·상한 초과 LOB의 별도 처리 검증이다. 이번 결과를 19c 등 미실측 버전의 지원으로 승격하지 않는다.
verify/report는 load 내부 단계이고 resume는 같은 run의 재실행이다. 전체 rollback CLI는 없으며,
백업 복원·운영 cutover는 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 절차로 이번에 실행하지 않았다.

## 이관 MySQL 후속 단계 실측

2026-09-15 폐기용 Docker의 MySQL `8.4.11`과 Connector/J `26.7.0`, PostgreSQL `17.10` 대상을 사용했다.
원천 이미지는 `mysql@sha256:85b9bf2e29cf836ecb8c2a15a935d4ba0c606631dff1dd79531a11983c638f2a`로 고정한다.
DB·driver 버전은 연결의 실제 JDBC 메타데이터로 기록하며, 계정과 데이터는 합성 fixture만 사용한다.
MySQL 어댑터의 증거 수준은 `UNVERIFIED`이며 공개 COMMIT 자격과 기관 운영 승인을 부여하지 않는다.

`npm run verify:migration` 전체 회차는 **599건 중 597건 통과, 실패·오류 0건, Windows 심볼릭 링크 2건 skip**이었다.
MySQL 실제 DB 시험 33건과 기존 Oracle 17건은 모두 통과했다. 이후 드라이버 확인·치명 오류 보존·상한 단위 시험·
3단 source 조기 거절을 보완한 뒤 `compileJava compileTestJava`와 표적 검사를 실행해
**331건 중 330건 통과, 실패·오류 0건, 심볼릭 링크 1건 skip**을 확인했다.
이 후속 회차는 가시성 14건·workflow 5건·배포 JAR 1건의 실제 MySQL 재검증을 포함하며 전체 회차와 구분한다.

| 범위 | 확인된 결과·경계 | 근거 |
|---|---|---|
| 최소권한 가시성 | 단일 존재 DB의 database-wide SELECT 계정에서 TABLE/COLUMN/PRIMARY_KEY와 빈 DB를 확인한다. 일부 테이블·컬럼 권한, 미존재 DB, 기본 CATALOG 모드, 범위 확장과 메타데이터/권한 조회 실패는 완전한 가시성 증명으로 취급하지 않는다 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MySqlDiscoveryVisibilityIntegrationTest.java) |
| 직접 엔진의 scalar 복구 | 1,001행에서 오류 행 501의 기록과 checkpoint만 누락시키고 나머지 1,000행을 보존한다. 정정 후 같은 run으로 재개·재반복해 전체 값과 무중복을 확인하고 target 변조를 탐지한다 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlMySqlPostgresIntegrationTest.java) |
| 직접 엔진의 LONGBLOB | 16MiB 전체 바이트와 checksum, NULL/빈 값 구분, 재반복 무중복과 마지막 바이트 변조를 확인한다. 대상은 PostgreSQL bytea이며 large object 증가는 없다 | 같은 엔진 통합 테스트 |
| 직접 엔진의 LONGTEXT | 11MiB UTF-8 Unicode 전체 본문과 checksum, NULL/빈 값 구분, 재반복 무중복과 마지막 문자 변조를 확인했다. 최초 긴 Reader fixture 업로드는 이관 전 원본 비교에서 실패했으며, 서버 REPEAT로 합성 원본을 만들고 원본·대상 전체 비교를 유지해 재검증했다 | 같은 엔진 통합 테스트 |
| 직접 엔진의 프로세스 종료 | 1,001행 중 8행의 LONGBLOB/LONGTEXT 합계 152MiB를 최대 힙 128MiB JVM에서 읽는다. 500·504 영속 checkpoint에서 각각 강제 종료하고 새 JVM으로 재개·재반복한다. 전체 본문 hash·무중복과 바이너리/문자 본문의 변조 탐지를 확인했다 | [MySQL JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlMySqlCrashRecoveryIntegrationTest.java) |
| 수치·고정 문자 | decimal(38,9)의 양수·음수는 PostgreSQL numeric(38,9)에, unsigned bigint 최댓값은 numeric(20,0)에 보존했다. signed long 범위를 넘는 unsigned 값은 target 행·checkpoint 기록 전에 거절했다. CHAR의 Unicode·앞 공백과 MySQL 조회에서 뒤 padding을 제거한 실제 값, NULL/빈 값·재반복·변조 탐지를 확인했다 | [값 타입 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MySqlValueTypesIntegrationTest.java) |
| 날짜·시간 | DATE와 DATETIME(6)을 PostgreSQL date·timestamp(6)에 적재해 날짜와 6자리 소수초를 보존했다. 최초 Java/JDBC 시간 표현 차이로 실패한 checksum은 정규화 후 전체 행 대조·재반복과 1마이크로초 변조 탐지를 통과했다 | 같은 값 타입 통합 테스트 |

DATETIME(6)에 대해 Connector/J의 `getColumns`는 `DECIMAL_DIGITS=0`을 보고했지만,
실제 `information_schema.COLUMNS.datetime_precision`은 6이었다. 시험은 driver 메타데이터와 물리 정밀도를
각각 확인하고 적재한 전체 값을 직접 비교한다. 메타데이터의 0을 소수초가 없는 물리 타입의 증거로 취급하지 않는다.

`RowChecksum`은 `LocalDateTime`을 기존 JDBC `Timestamp`와 같은 공백 구분·소수초 표현으로 정규화하도록
수정했다. 기존 JDBC `Timestamp`의 영속 hash는 유지하지만, 이전 `LocalDateTime.toString()`의 `T` 구분 표현으로
계산한 hash는 달라진다. 구현 digest가 바뀌므로 기존 승인 plan은 재작성·재승인해야 한다. 이전 `T` 표현의
checkpoint가 있는 run의 자동 재개 호환성은 보장하지 않는다. checkpoint를 지우지 말고 기존 승인·run·원천과
대상 근거를 보존해 별도 reconciliation과 승인을 거친다([복구 절차](migration-recovery-runbook.md#재개와-reconciliation)).

MySQL `LONGTEXT`/`LONGBLOB`의 실제 JDBC 타입 `LONGVARCHAR`/`LONGVARBINARY`만 MySQL 전용 capability로 허용한다.
열의 스트림을 ResultSet이 열린 동안 읽고 문자 본문은 `String`, 바이너리는 `byte[]`로 변환해 기존 변환·checksum·
target INSERT와 checkpoint에 결속한다. NULL과 빈 값은 구분한다. 다른 vendor의 `LONG*` 타입을 같은 근거로 허용하지 않는다.

값별 제한은 **바이너리 32MiB, 문자 16,777,216 UTF-16 단위**이며 보관할 행의 추정치는 64MiB까지다.
페이지는 최대 500행 또는 마지막 행을 포함한 뒤 누적 추정치가 8MiB에 도달하면 나눈다.
이 기준은 전체 JVM 힙 상한이 아니다. 스트림 취합과 최종 문자열/바이트 배열의 일시 복사, JDBC 버퍼와 checkpoint/identity
목록이 추가 메모리를 사용한다. 128MiB 복구 성공은 이번 8MiB 바이너리·11MiB UTF-8 문자 본문 fixture의 증거이며,
최대 허용 값이나 임의 크기 LOB·GB/TB 규모의 메모리와 처리 시간을 보장하지 않는다. 초과 값은 잘라 저장하지 않고 실패한다.

원천 조회는 실제 Connector/J property의 `useCursorFetch`와 `useServerPrepStmts`가 모두 true일 때
forward-only/read-only statement에 `fetchSize=1`을 적용한다. property는 외부 driver를 배포 JAR에 포함하지 않고
읽기 전용 reflection으로 확인한다. cursor 설정이 없거나 확인되지 않으면 Connector/J의 `Integer.MIN_VALUE` sentinel로
행 단위 읽기를 유지한다. sentinel 방식은 조기 종료한 결과의 나머지 행을 driver가 끝까지 읽고 버리므로, 큰 행으로
페이지가 자주 나뉘면 중복 원천 I/O가 증가한다. source driver가 Connector/J인지 증명되지 않으면 유계 조회를 가정하지 않고
차단한다. 조회 설정 실패 뒤 자원 정리가 추가로 실패해도 원래 JVM 치명 오류를 보존하고,
일반 오류 뒤 발생한 치명 오류는 전파하도록 부정 조합을 검증한다.
대상 검증은 기존 PostgreSQL `fetchSize=1` cursor에서 행별 checksum을 계산한다.

가시성 증명에는 Connector/J `databaseTerm=SCHEMA`, 명시한 단일 DB와 TABLE/COLUMN/PRIMARY_KEY 범위,
현재 계정에 직접 부여한 해당 DB 전체의 SELECT 권한과 `partial_revokes=0`이 필요하다. 밑줄·퍼센트 문자는
권한 카탈로그의 리터럴 escape 철자와 실제 DB 철자를 각각 정확히 대조한다. wildcard·global·role·table/column만의
권한과 미실측 partial revokes 모드는 완전한 가시성을 증명하지 않는다. SCHEMA 모드에서 `getCatalog()=null`이지만
컬럼 metadata의 `TABLE_CAT=def`인 실측을 반영해 누락된 기본 catalog만 보정한다.
mapping의 원천 SQL 이름은 `table` 또는 `schema.table`을 사용한다. `def.schema.table`을 포함한
3단 이름은 metadata 조회 전에 `MYSQL_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED`로 거절한다.
계획의 catalog를 포함한 객체 식별 정보는 입력 mapping의 SQL 이름을 바꾸지 않는다
([MySQL 식별자 문법](https://dev.mysql.com/doc/refman/8.4/en/identifier-qualifiers.html)).
단일 InnoDB REPEATABLE READ 트랜잭션과 operator freeze 확인을 사용하며,
가시성 증명 자체가 freeze나 재시작 사이의 동일 snapshot을 증명하지 않는다.

공개 [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MySqlWorkflowPostgresIntegrationTest.java)는
discover → review → plan → validate → dry-run과 승인 누락·환경 변경·미검증 COMMIT의 차단을 통과했다.
업무 target 행과 control 스키마가 생기지 않는 것, LONG 필드의 전체 변환 본문과 `DRY_RUN/PASS` artifact를 확인했다.
[배포 CLI 시험](../../migration-tool/src/test/java/nuri/migration/MySqlPackagedCliIntegrationTest.java)도 실제 bootJar와
외부 JDBC JAR로 같은 단계와 정확한 driver digest 확인을 통과했다. bootJar의 Spring 구성에는
`SourceJdbcEndpointFactory`의 주입 생성자를 명시하고, 중첩 JAR 경로는 실제 outer JAR 전체 bytes에 결속하도록 보완했다.
정상 실행 가능한 JAR에 합성 리소스만 추가해 이전 승인 plan이 execution digest 불일치로 쓰기 전에 거절되는 것을 확인했다.
isolated 외부 driver COMMIT과 driver digest ack 누락도 artifact·DB 쓰기 전에 거절한다.
어댑터 `UNVERIFIED`와 isolated 외부 driver의 공개 COMMIT 금지는 유지한다.

MySQL·MariaDB·Oracle driver와 Testcontainers는 테스트 전용이며 배포 bootJar에 포함되지 않는다.
MySQL·MariaDB 프로세스 종료·배포 CLI 시험은 일반 `test`와 독립 migration CI에서 계속 실행한다.
PIT는 targetClasses가 `nuri.migration.transform.*` 단독 또는 `nuri.migration.validate.*`와 `nuri.migration.verify.*`의
정확한 집합인 기존 CI 두 작업에서만 두 vendor의 이 네 시험을 정확한 클래스 이름으로 제외한다.
자식 JVM은 일반 classpath/bootJar를 실행하므로 그 범위의 mutant를 검사하지 않는다.
기본 `nuri.*` 분석에서는 부모의 artifact/adapter 검증을 보존하기 위해 포함한다. 기존 Oracle/PostgreSQL 시험과 생산 코드
mutation 분모는 유지하며, 정확한 제외·조건과 일반 통합 실행 경로는 기존 [독립 이관 계약](../../scripts/migration-verification-contract.test.mjs)이 검사한다.

로컬 Delta PIT는 `STRICT_MUTATION=true`로 9개 변경 경계 클래스와 관련 단위 시험 42개 클래스를 검사해
**382/475개 탐지(80.42%)**로 75% 기준을 통과했다. 범위는 `SourceReadStatements`, `JdbcLobReader`,
`RowChecksum`, `SourceLoadSurfaceGate`, `MySqlDiscoveryVisibilityProof`, `MappingValidator`,
`MigrationExecutionContract`, `SourceReadSessionPolicy`, `MySqlSourceAdapter`다.
결과는 정상 탐지 380개·제한시간 탐지 2개·미탐지 59개·미실행 34개이며 run/memory error는 없다.
점수는 이 범위의 합산이며 각 클래스의 75%나 전체 ETL 변이 검증을 뜻하지 않는다.
이후 MySQL 어댑터의 `visibilityProof` 전달 경로를 검증하는 단위 시험을 추가해 관련 시험 44건이 모두 통과했다.
`MySqlSourceAdapter` 단독 후속 PIT도 null-return 변이 1/1개를 탐지해 통과했다. 이 결과는 위 9개 클래스 회차와 별도다.
`MigrationExecutionContract`는 43/72개 탐지였다. 신규 outer JAR 경로 4개와 기존 JAR 처리 14개 변이는
미실행 상태이며, 일반 bootJar를 실행하는 자식 JVM의 성공·거절 시험은 이 변이들을 검사하지 않는다.
기존 class digest의 hash 읽기와 디렉터리 경로 결속·필터에서 생존한 11개 변이도 단위 시험의 탐지 공백으로 남는다.
배포 JAR 자식 JVM의 실제 동작은 위 CLI 회차에서 따로 확인했다. 현재 변경의 required CI·CodeQL은 실행하지 않았다.

재현은 `npm run verify:migration`이며 부분 실행은 `./gradlew :migration-tool:test --tests '*MySql*IntegrationTest'`다.
Windows에서는 `.\gradlew.bat`를 사용한다. verify/report는 load의 내부 단계이며 resume는 같은 run의 재실행이다.
실제 도입 버전·driver digest별 COMMIT 자격, 운영 규모·일관성·cutover와 전체 백업 복원은
[복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다. MariaDB·SQL Server·Tibero에는 이 결과를 승계하지 않는다.

## 이관 MariaDB 후속 단계 실측

2026-09-15~16 폐기용 Docker의 MariaDB `11.4.13-MariaDB-ubu2404`, MariaDB Connector/J `3.5.10`,
PostgreSQL `17.10`으로 별도 시험했다. 원천 이미지는
`mariadb@sha256:80494b9810694179889f7281ec44ca928241df577159c0356a1070e2e94616a1`로 고정하며,
실제 연결의 JDBC 메타데이터와 합성 fixture를 사용한다. MySQL의 성공 결과를 MariaDB 자격으로 승계하지 않는다.
2026-09-15 최초 표적 검사 **128건 통과**에는 실제 MariaDB 시험 **36건 통과**가 포함된다.
이 회차는 추가 서버 행 제한·namespace 경계 시험 전의 결과이며 전체 모듈의 최종 회차 결과가 아니다.
2026-09-16 추가 표적 3건은 12분 29초에 완료했다. 프로세스 종료 1건·배포 CLI 1건은 통과했으며,
`Rows_sent` 1건은 예상 3과 실제 2의 차이로 실패했다. 아래에 최초 실패와 assertion 수정 후 통과를 구분한다.
수정한 Rows_sent 시험은 별도 2건의 의도적 red 회차에서 통과했으며, 같은 회차의 기존 namespace 구현은 실패했다.
namespace 수정 후 `compileJava compileTestJava`와 영향 검사는 **BUILD SUCCESS(3분 13초)**였고,
**324건 중 323건 통과, 기존 Windows 심볼릭 링크 1건 skip, 실패·오류 0건**을 확인했다.
이 최신 회차의 실제 MariaDB 시험은 가시성 18건·workflow 5건의 **23건 통과**다. 여러 회차에서 통과를 확인한
서로 다른 실제 MariaDB 시험은 **40건**(초기 36건 + Rows_sent·프로세스 종료·배포 CLI·namespace 각 1건)이며,
40건을 최신 회차에서 모두 실행했거나 현재 전체 모듈을 실행했다는 뜻은 아니다.
MariaDB 가시성 증명 단위 51건·JDBC metadata edge case 6건·실제 driver 조회 순서 행동을 모사한 단위 4건도 통과했다.

| 범위 | 확인된 결과·경계 | 근거 |
|---|---|---|
| 실제 metadata | 기본 CATALOG 모드의 DB catalog·null schema를 확인했다. 명시적 `useCatalogTerm=SCHEMA`에서는 `getCatalog()=def`, `getSchema()=<DB>`와 컬럼의 `TABLE_CAT=def`, `TABLE_SCHEM=<DB>`를 확인한다 | [metadata 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbMetadataIntegrationTest.java), [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbWorkflowPostgresIntegrationTest.java) |
| 최소권한 가시성 | 존재하는 단일 DB에 현재 계정의 직접 database-wide SELECT 권한과 활성 role 없음이 필요하다. TABLE/COLUMN/PRIMARY_KEY·빈 DB와 리터럴 `_`/`%` escape 철자를 확인한다. wildcard·global·role·PUBLIC·table/column 권한, 기본 CATALOG와 조회 실패는 완전한 증명으로 취급하지 않는다 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbDiscoveryVisibilityIntegrationTest.java) |
| 직접 엔진의 scalar·LONG 값 | scalar 1,001행의 오류 행 재개·재반복·무중복·변조 탐지, 16MiB LONGBLOB과 11MiB UTF-8 Unicode LONGTEXT의 전체 내용·checksum·NULL/빈 값 구분을 확인했다. 크기 초과는 target 행·checkpoint 기록 전에 거절한다 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlMariaDbPostgresIntegrationTest.java) |
| LONG 변환·batch 오류 복구 | LONGTEXT 본문 변환 결과와 영속 checksum을 대조하고, binary/text batch 실패 뒤 본문을 유지한 행별 재시도·미기록 오류 행 정정·같은 run 재개를 확인했다 | 같은 엔진 통합 테스트 |
| 수치·고정 문자·시간 | decimal(38,9), unsigned bigint 최댓값의 BigInteger → numeric(20,0) 보존과 signed long 범위 초과 거절, CHAR Unicode·padding 조회 의미를 확인했다. DATE·DATETIME(6)의 전체 값·checksum과 PostgreSQL timestamp(6)의 6자리 소수초를 대조한다 | [값 타입 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbValueTypesIntegrationTest.java) |
| 공개 workflow | 명시한 DB의 discover → 객체별 review → plan → validate → dry-run을 확인했다. scalar 501행과 LONG 본문 변환을 검증하고 target 업무 행·control 스키마 무변경을 확인한다. 승인 누락·target drift·UNVERIFIED COMMIT을 차단한다 | workflow 통합 테스트 |
| 직접 엔진의 프로세스 종료 | **통과**. 1,001행·8쌍 LONG 값 합계 152MiB를 최대 힙 128MiB 자식 JVM의 실제 StreamingResult에서 읽었다. 500·504 영속 checkpoint에서 각각 강제 종료하고 새 JVM으로 재개·재반복했다. 전체 1,001행의 본문 hash·checkpoint·무중복과 target binary/text 변조의 종료 코드 2를 확인했다 | [MariaDB JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlMariaDbCrashRecoveryIntegrationTest.java) |
| 배포 CLI | **통과**. 실제 bootJar·외부 JDBC JAR에서 13단계의 성공·거절 결과를 확인했다. discover·review·validate·dry-run, 정상 실행 가능한 app/driver JAR에 합성 리소스를 추가한 digest 변경과 ack 누락의 거절·무 artifact·무 DB 쓰기를 확인했다. isolated 외부 driver COMMIT 금지는 유지한다 | [배포 CLI 시험](../../migration-tool/src/test/java/nuri/migration/MariaDbPackagedCliIntegrationTest.java) |
| 서버 행 제한 | **통과**. 10행 fixture에 `setMaxRows(2)`를 적용해 `selectedRows=2`, `serverRowsSentDelta=2`, `statusRows=1`을 기록했다. 최초 예상 3은 SHOW 자신의 행까지 세는 잘못된 assertion이었다. 수정 후 연속 SHOW의 counter 무증가와 예상 delta 2를 모두 확인했다 | 엔진 통합 테스트 |

공개 운용에는 명시적 `useCatalogTerm=SCHEMA`, `--schemas=<정확한 DB>`와 단일 DB의 관계형 객체 범위가 필요하다.
기본 CATALOG metadata의 탐색 성공은 이 경로의 승인 가시성 증명이 아니다. 원천 mapping은 `table` 또는
`DB.table`을 사용한다. `def.DB.table`을 포함한 3단 이름은 metadata 조회 전에
`MARIADB_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED`로 거절한다. MySQL의 null catalog 보정을 MariaDB에 적용하지 않는다.
권한 증명은 `CURRENT_ROLE() IS NULL`과 현재 계정의 직접 권한만 대조하며, 실제 DB 철자와 grant의 리터럴
escape 철자를 구분한다. SELECT 증명은 다른 쓰기 권한의 부재나 source freeze를 증명하지 않는다.
리터럴 DB 권한의 가시성 시험은 기존 unquoted mapping SQL 식별자 문법을 넓히지 않는다.
추가 namespace 경계도 **red → 수정 → green을 확인했다**. raw schema를 JDBC LIKE pattern으로 넘기고 테이블
이름만 대조한 기존 컬럼 수집은 `md_<suffix>`와 `mdX<suffix>`의 같은 이름 테이블에서 인접 DB의
전용 컬럼 `neighbor_only`까지 섞어 실패했다. 공통 컬럼 수집에서 null schema 처리와 schema pattern escape를
유지하고, catalog·schema·table을 정확히 대조한 뒤 컬럼과 default를 읽도록 보완했다.
같은 fixture의 서로 다른 payload 타입·인접 DB 전용 컬럼 구분을 수정 후 통과했으며, 최신 23건에 포함된다.

MariaDB LONGTEXT/LONGBLOB의 실제 JDBC 타입 `LONGVARCHAR`/`LONGVARBINARY`는 명시적 adapter capability로 허용한다.
ResultSet 안에서 본문을 `String`/`byte[]`로 읽어 변환·checksum·target 기록과 checkpoint에 결속한다.
값별 상한은 **바이너리 32MiB, 문자 16,777,216 UTF-16 단위**, 행 보관 추정치는 64MiB다.
페이지는 최대 500행 또는 마지막 행을 포함한 뒤 누적 8MiB 기준으로 나누며 전체 JVM 힙 상한은 아니다.
Oracle의 LONG* 차단과 다른 미실측 vendor의 제한은 유지한다. DATETIME은 실제 JDBC `Timestamp`로 읽히고,
driver `DECIMAL_DIGITS=0`과 물리 `information_schema.COLUMNS.datetime_precision=6`을 각각 확인한다.
메타데이터의 0을 물리 소수초 부재의 증거로 취급하지 않는다. 이전 LocalDateTime hash 표현과 run의 호환성은
위 MySQL 관측 및 [reconciliation 절차](migration-recovery-runbook.md#재개와-reconciliation)를 따른다.

원천 조회는 실제 MariaDB Connector/J를 확인한 forward-only/read-only statement의 **positive fetchSize=1**을 사용한다.
MySQL cursor URL이나 MIN_VALUE sentinel 조건을 요구하지 않는다. 현재 ETL의 네 조회 경로는 ResultSet을 먼저 닫고
Statement를 닫은 뒤 다음 source query를 실행한다. Connector/J 3.5.10의 ResultSet.close는 잔여 패킷을 읽어 버리지만,
Statement만 먼저 닫거나 미완료 결과를 둔 채 같은 연결에 query를 내면 `fetchRemaining`이 잔여 행을 배열에 모을 수 있다
([Result.close 공식 소스](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/Result.java#L357),
[StreamingResult 공식 소스](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/StreamingResult.java#L146)).
행별 ResultSet.getMetaData/getColumnType은 기존 column decoder를 참조하며 별도 query를 내지 않는다
([결과 metadata](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/Result.java#L768),
[column type](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/ResultSetMetaData.java#L213)).
공식 driver 소스에서 MariaDB 10.3 이상은 `setMaxRows`를 `SET STATEMENT SQL_SELECT_LIMIT=<n> FOR`로 전달한다
([Connection 조건](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/Connection.java#L95),
[client prepared 경로](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/ClientPreparedStatement.java#L59)).
위 시험의 실제 SELECT 2행과 session Rows_sent 증가 2를 확인했다. 같은 서버의 독립 읽기 전용 프로브에서도
session counter 0 → SELECT 2행 → counter 2 → SELECT 3행 → counter 5를 관측했으며,
SHOW는 자신의 status 행을 session counter에 남기지 않았다. 연속 SHOW 무증가와 delta 2의 수정 assertion도 통과했다.
MariaDB 11.4.13의 `execute_show_status`도 SHOW 실행 뒤 session status snapshot을 복원한다
([서버 공식 소스](https://github.com/MariaDB/server/blob/mariadb-11.4.13/sql/sql_parse.cc#L5904)).
실제 관측은 10행 fixture의 `setMaxRows(2)`에 대한 증거이며 최대 크기 payload나 전체 운영 I/O 비용의 보장이 아니다.
byte 기준으로 일찍 나누면 해당 결과의 미처리 패킷 드레인과 다음 keyset 재조회에 추가 I/O가 남는다.
fetch1은 한 행의 큰 패킷·LOB 취합·임시 복사에 대한 일정한 메모리 상한을 보장하지 않는다.

MariaDB 어댑터는 **UNVERIFIED**이며 공개 및 isolated 외부 driver COMMIT은 계속 거절한다.
직접 엔진 시험은 승인형 공개 load의 자격을 부여하지 않는다. 단일 InnoDB REPEATABLE READ와 수동 freeze 확인은
운영 freeze의 실제 이행이나 재시작 사이의 같은 snapshot을 증명하지 않는다. 최대 허용 LOB·GB/TB 규모·처리량·
운영 cutover와 전체 백업 복원은 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다.
이번 보완 후 검증은 영향받은 MariaDB 가시성·workflow 실제 DB 시험, 공통 adapter/JDBC/validator 단위 경계와
백엔드 compile을 실행했다. 기존 Oracle/MySQL runtime 전체나 기본 `verify:migration` 전체는 이 회차에서 실행하지 않았다.
scoped Delta PIT는 `SourceReadStatements`, `MariaDbDiscoveryVisibilityProof`, `MariaDbSourceAdapter`,
`MappingValidator`, `JdbcMetadataSourceAdapter`의 정확한 5개 클래스와 관련 adapter/JDBC/validator/ETL 단위를
`STRICT_MUTATION=true`·75% 기준으로 검사해 **443/510개 탐지(86.86%)**로 통과했다.
관련 단위 시험은 40개 클래스이며 결과는 정상 탐지 436개·제한시간 탐지 7개·미탐지 44개·미실행 23개,
run/memory error 0개다. 점수는 이 5개 클래스의 합산이며 전체 ETL·운영 이관의 검증 점수가 아니다.
`JdbcMetadataSourceAdapter`는 207/233개, MariaDB 가시성 증명은 43/44개, MariaDB adapter는 1/1개,
`SourceReadStatements`는 23/23개, `MappingValidator`는 169/209개를 탐지했다.
새 컬럼 수집의 schema null 처리와 catalog·schema·table 대조 분기 변이는 모두 탐지했다.
현재 변경의 required CI·CodeQL은 실행하지 않았다. 실제 DB 표적 명령은
`./gradlew :migration-tool:test --tests '*MariaDbDiscoveryVisibilityIntegrationTest' --tests '*MariaDbWorkflowPostgresIntegrationTest'`다.
Windows에서는 `.\gradlew.bat`를 사용한다. 일반 모듈 시험과 독립 CI의 전체 통합 시험 등록은 유지하며,
위 두 scoped PIT 작업의 정확한 subprocess 네 클래스 제외는 일반 classpath/JAR의 mutant 미실행 경계에만 적용한다.

## 이관 SQL Server 후속 단계 실측

2026-09-16 폐기용 Docker의 SQL Server 2022 `16.00.4295`, Microsoft JDBC Driver 13.6 for SQL Server
`13.6.0.0`, PostgreSQL `17.10`으로 별도 시험했다. 원천 이미지는
`mcr.microsoft.com/mssql/server@sha256:4402d880dd4c34bfa7d8705e56a86cd6c88da80a1f6bbbe741f999e76264a090`로 고정한다.
전용 `migration_fixture` DB의 `dbo` 스키마와 합성 데이터만 사용하며 운영 DB·표준 엔티티는 변경하지 않았다.
SQL Server 어댑터의 증거 수준은 **UNVERIFIED**로 유지한다.

회차별 JUnit XML에서 서로 다른 실제 SQL Server 시험 **47건의 통과**를 확인했다.
metadata 1건·직접 엔진 14건·가시성 19건·값 타입 4건·workflow 7건·프로세스 종료 1건·배포 CLI 1건이다.
이는 여러 회차의 개별 시험 최종 성공을 합친 수이며, 47건을 한 회차에서 모두 실행하거나 전체 모듈이 통과했다는 뜻은 아니다.
초기 회차에는 공개 workflow 5건과 CONTROL SERVER 권한 경계 1건의 실패가 있었다.
후속 MAX lookahead의 의도적 red도 확인했으며, 수정 후 해당 시험과 workflow·권한 경계 시험의 통과를 별도로 확인했다.
로컬 정본 XML은 `migration-tool/build/reports/sqlserver-rehearsal-*`에 회차별로 보존한다.
`boundaries-green` 폴더에도 후속 수정 전 실패가 남아 있으므로 폴더 이름을 전체 성공 판정으로 사용하지 않는다.

| 범위 | 확인된 결과·경계 | 근거 |
|---|---|---|
| 실제 metadata | catalog `migration_fixture`·schema `dbo`, JDBC 및 물리 `sys.columns`를 대조했다. MAX는 LONG 코드가 아니라 `VARBINARY(-3)`·`NVARCHAR(-9)`·`VARCHAR(12)`이며 JDBC COLUMN_SIZE는 모두 2,147,483,647이다. nvarchar의 ResultSet precision은 1,073,741,823으로 별도 확인했다 | [metadata 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerMetadataIntegrationTest.java) |
| 가시성 | 현재 비시스템 DB의 `dbo`에서 original/current login 일치·현재 사용자 dbo·sysadmin membership이 필요하다. SCHEMA/TABLE/COLUMN/PRIMARY_KEY만 증명하며 일반 schema SELECT·VIEW DEFINITION·table/column/role·CONTROL SERVER 권한과 impersonation은 미증명으로 유지한다 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerDiscoveryVisibilityIntegrationTest.java) |
| 직접 엔진의 scalar 복구 | BIGINT/VARCHAR 1,001행의 오류 행 501만 기록·checkpoint가 없고 나머지 1,000행은 보존한다. 미기록 행 정정 후 같은 run 재개·재반복·전체 값·무중복과 target 변조 탐지를 확인했다 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlSqlServerPostgresIntegrationTest.java) |
| MAX 전체 내용·변환 | 16MiB varbinary(max) → bytea, 11MiB UTF-8 Unicode nvarchar(max) → text의 전체 내용·SHA-256·NULL/빈 값·재반복·마지막 값 변조를 확인했다. binary/text batch 실패 뒤 본문을 유지한 행별 재시도·미기록 행 정정·재개와 text trim 결과의 영속 checksum을 대조했다 | 같은 엔진 통합 테스트 |
| MAX 크기 경계 | 바이너리 32MiB와 nvarchar/varchar 16,777,216 UTF-16 단위는 전체 값을 보존했다. 각 상한+1은 `LOB_SIZE_LIMIT_EXCEEDED`로 target/checkpoint 0행이다. 페이지 lookahead의 초과 MAX 정렬 키도 이전 페이지 기록 전에 거절한다 | 엔진 통합 테스트, [자기 참조 키 단위 회귀](../../migration-tool/src/test/java/nuri/migration/etl/SqlServerSelfReferenceReadTest.java) |
| 수치·고정 값·시간 | decimal(38,9) → numeric(38,9), signed BIGINT 경계·DATE·DATETIME2(6) → timestamp(6)의 전체 값·checksum을 대조했다. long 범위 초과·소수 포함 decimal → bigint는 기록 전에 거절한다. binary(8) padding·GUID의 JDBC CHAR/String → text·BIT → boolean·VARCHAR 공백·NULL과 변조 탐지를 확인했다 | [값 타입 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerValueTypesIntegrationTest.java) |
| 원천 읽기·서버 행 제한 | forward-only/read-only statement·positive fetchSize=1에서 외부 `responseBuffering=full`을 adaptive로 덮어쓴 실제 값을 확인했다. 10행 fixture의 setMaxRows(2)는 첫 결과 2행과 같은 SQL batch의 `@@ROWCOUNT=2`로 서버 제한을 대조했다 | 엔진 통합 테스트, [statement 단위 회귀](../../migration-tool/src/test/java/nuri/migration/jdbc/SourceReadStatementsTest.java) |
| 공개 workflow·물리 읽기 전용 | 실제 READ_ONLY DB에서 discover → 객체별 review → plan → validate → dry-run의 scalar/MAX 본문 변환·PASS artifact·target/control 무변경을 확인했다. JDBC read-only 신호는 false로 보존하며 실제 INSERT·UPDATE는 오류 3906으로 거절된다. READ_WRITE source·승인/ack/freeze 누락·target drift·UNVERIFIED COMMIT을 차단한다 | [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerWorkflowPostgresIntegrationTest.java) |
| 직접 엔진의 프로세스 종료 | 1,001행·8쌍 MAX 값은 SQL Server 물리 저장량 144MiB, PostgreSQL UTF-8 대상 내용 합계 152MiB다. 최대 힙 128MiB JVM을 500·504 영속 checkpoint에서 각각 강제 종료하고 새 JVM으로 재개·재반복했다. 전체 내용 SHA-256·checkpoint·무중복과 binary/text 변조의 종료 코드 2를 확인했다 | [SQL Server JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlSqlServerCrashRecoveryIntegrationTest.java) |
| 배포 CLI | 실제 bootJar·외부 JDBC JAR의 13단계에서 discover·review·validate·dry-run을 확인했다. source driver 누락·실행 가능한 app/driver JAR의 digest 변경·driver ack 누락/불일치를 거절하며 업무/control 쓰기는 없다. isolated 외부 driver COMMIT 거절과 adapter UNVERIFIED는 각각 유지한다 | [배포 CLI 시험](../../migration-tool/src/test/java/nuri/migration/SqlServerPackagedCliIntegrationTest.java) |

MAX reader와 SQL Server preflight·가시성 proof는 본문 오류 뒤 자원 정리 중 발생한 JVM fatal 오류를 전파한다.
수정 전 실패·수정 후 통과를 확인했고, 최종 관련 단위 시험 148건과 `compileJava compileTestJava`가 통과했다.
변경한 adapter·visibility proof·source statement·LOB reader·fatal boundary 5개 클래스의 strict Delta PIT는
145/149(97.32%)로 75% 기준을 통과했다. 기존 incremental 결과 114개를 재사용했고, survivor 4개·미실행/무커버리지 0개다.
이는 전체 ETL 클래스나 제품 전체의 변이 분석 결과가 아니다. 관련 문서·메모리·Atlas·PIT 실행 경로·SAST 계약 70건도 통과했다.

공개 가시성 범위는 catalog 옵션 없이 `--schemas=dbo`와 위 관계형 객체 종류를 명시한다.
sysadmin은 DENY를 우회하므로 이 증명은 최소권한 SELECT-only 계정의 가시성 자격이 아니다.
원천 SQL 이름의 `DB.schema.table`은 현재 DB일 때만 허용하며 다른 catalog는 target 상태 생성 전에 차단한다.
Microsoft driver의 `setReadOnly(true)`만으로 쓰기 금지를 판단하지 않는다. 해당 driver 버전의 preflight는
실제 연결 catalog와 `DB_NAME()`이 같고 `DATABASEPROPERTYEX(...,'Updateability')=READ_ONLY`인 비시스템 DB에서만
누락된 JDBC 힌트의 차단을 물리 증거 경고로 바꾼다. `connectionReadOnlySignal=false`, privilege·UNVERIFIED 경고와
기존 `--ack-adapter`·`--ack-source-freeze`·공개 COMMIT 금지는 유지한다.

SQL Server의 VARBINARY/VARCHAR/NVARCHAR는 ResultSet 안에서 bounded stream으로 읽어 `byte[]`/`String` 본문을
변환·checksum·target/checkpoint에 결속한다. MAX 정렬 키의 페이지 lookahead와 자기 참조 키 pre-mint에도 같은 읽기 제한을 적용한다.
자기 참조 초과 키는 ID 생성·target 접근 전에 실패하고 Reader·ResultSet·Statement가 닫히는 것을 별도 단위 시험으로 확인했다.
값별 상한은 **바이너리 32MiB, 문자 16,777,216 UTF-16 단위**, 행 보관 추정치는 64MiB다.
페이지는 최대 500행 또는 마지막 행을 포함한 뒤 누적 8MiB로 나눈다. 임시 본문 복사·JDBC 버퍼·keymap/checkpoint를
포함한 전체 JVM 힙의 고정 상한이 아니며, 128MiB 시험과 최대 크기 단일 값 시험도 서로 다른 fixture다.
앞선 ResultSet 컬럼을 다시 읽지 않고 왼쪽부터 한 번씩 소비한다. 기존 JDBC Timestamp의 영속 checksum 의미와
이전 LocalDateTime 표현 run의 [reconciliation 절차](migration-recovery-runbook.md#재개와-reconciliation)는 유지한다.

직접 엔진의 COMMIT 시험은 승인형 공개 load의 vendor/driver 자격을 부여하지 않는다.
최소권한 계정·database snapshot/SNAPSHOT isolation·운영 freeze의 이행·재시작 사이 snapshot·GB/TB 규모·처리량·
전체 힙 보장·운영 cutover와 전체 백업 복원은 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다.
Oracle 19c `19.3.0.0.0`은 별도로 실측했으며 범위와 결과는 [Oracle 19c 후속 단계 실측](#이관-oracle-19c-후속-단계-실측)을 따른다.
Tibero는 라이선스 파일 부재로 기동하지 못해 discover·load를 아직 실측하지 않았다.
이번 SQL Server 및 Oracle Free 결과를 이들 환경의 자격으로 승계하지 않는다.

## Tibero 및 Oracle 19c 실행 환경 점검

2026-09-16 `tiberoofficial/tibero:7.2.6`을 실제로 내려받았다. linux/amd64 이미지 digest는
`sha256:9132b7e399d5f5384848823c531b63c2d060f9e0b297b0afc6aaa6c6d0905614`다.
이미지의 설치 압축파일에서 `tibero7-jdbc-17.jar`를 확보하고 `com.tmax.tibero.jdbc.TbDriver` 클래스를 확인했다.
드라이버 SHA-256은 `2e8ad3e9bdb8bfb8c2cdc03692f504e3f43c8b7f7c546fc705ffb37785425de2`다.
드라이버와 실행 근거는 Git에서 제외하는 로컬 build 경로에 보관하며 운영 의존성에는 추가하지 않았다.

설치 압축파일에는 license 디렉터리만 있고 `license.xml`이 없다. hostname `egov-migration-tibero`,
2 CPU·4GiB 메모리·외부 네트워크 없는 폐기용 컨테이너의 실제 설치·기동은 종료 코드 1로 실패했다.
고정 오류는 `Can't open the license file`이며 요구 경로는 `/opt/tibero7/license/license.xml`이다.
이 이미지는 별도 발급한 demo/유료 라이선스와 발급 hostname의 일치를 요구한다([배포 안내](https://hub.docker.com/r/tiberoofficial/tibero)).
점검용 컨테이너와 생성한 자격증명 파일을 정리하고 이미지·드라이버만 보존했다.

Oracle 19c의 `container-registry.oracle.com/database/enterprise:19.3.0.0`도 실제 `docker pull`로 확인했지만
anonymous token 요청이 `401 Unauthorized`로 거절돼 내려받지 못했다. Oracle Registry의 licensed 이미지는
계정·저장소별 약관 수락·Auth Token 인증이 필요하다([현재 인증 문서](https://docs.oracle.com/en/operating-systems/oracle-linux/podman/registries.html)).
별도 직접 빌드는 사용할 수 있는 `LINUX.X64_193000_db_home.zip`을 제공해야 한다([공식 빌드 지침](https://github.com/oracle/docker-images/blob/main/OracleDatabase/SingleInstance/README.md)).

별도로 공개 community 게시자의 `fugeritorg/oracle-19.3.0-ee:2025.0` linux/amd64 이미지를 내려받았다.
시험에 사용하는 pin은 `fugeritorg/oracle-19.3.0-ee@sha256:6a29a3c7924de980b9cf10ef8c7e6120fe2db8e3fc32b2087aa59a845e4c63ac`이다.
이는 공식 Oracle Registry 이미지가 아니며, 게시자는 개발용 이미지로 안내한다([게시자 배포 안내](https://hub.docker.com/r/fugeritorg/oracle-19.3.0-ee)).
이 community 이미지를 폐기용 Oracle 19c EE/PDB로 기동해 [후속 단계](#이관-oracle-19c-후속-단계-실측)를 실측했다.
Tibero discover·load는 유효한 `license.xml`과 발급 hostname을 확보한 뒤 검증할 미완료 항목이다.
어댑터의 `UNVERIFIED`와 공개 COMMIT 금지는 유지한다.
로컬 근거는 `migration-tool/build/reports/tibero-availability-20260916`과 `migration-tool/build/reports/oracle19c-rehearsal-20260916`이다.

## 이관 Oracle 19c 후속 단계 실측

2026-09-16 Oracle Database 19c Enterprise Edition **19.3.0.0.0**, CDB·PDB `ORCLPDB1`,
문자 집합 `AL32UTF8`, ojdbc11 **23.26.3.0.0**, PostgreSQL **17.10**을 실제 JDBC와 Oracle 사전 조회로 확인했다.
위 community 이미지 pin을 사용했으며 일반 local 계정의 `ORACLE_MAINTAINED=N`, `COMMON=NO`와
CREATE SESSION·CREATE TABLE·CREATE SEQUENCE·UNLIMITED TABLESPACE 네 권한을 대조했다.
서로 다른 시험 **22건이 모두 통과**했으며 skip은 0건이다.

| 검증 범위 | 고유 시험 수 | 확인한 결과 |
|---|---:|---|
| 직접 엔진 | 6 | scalar·native BLOB/CLOB의 COMMIT·ROLLBACK, NULL/빈 값, 오류 행 정정 후 재개·재반복·전체 값·무중복·변조 탐지 |
| 승인 workflow | 4 | discover → plan → 객체별 review → validate → DRY_RUN, source 본문 대조·target 무쓰기·target drift·UNVERIFIED 공개 COMMIT 거절 |
| JVM 종료와 복구 | 1 | 1,001행·8쌍의 큰 BLOB/CLOB, 합계 152MiB를 최대 힙 128MiB JVM의 영속 checkpoint 500·504에서 각각 강제 종료 후 재개·재반복·전체 SHA-256·무중복·본문 변조 종료 코드 2 |
| 가시성 | 6 | owner·빈/미존재 schema·다른 owner 일부 SELECT·CURRENT_SCHEMA 변경·미지원 범위·메타데이터 실패의 판정 |
| 값 타입·checkpoint | 3 | NUMBER(38,9)/(38,0)·RAW·자정이 아닌 DATE·TIMESTAMP(6)·finite BINARY_FLOAT/DOUBLE·Unicode NCLOB의 전체 값, namespace/소문자 table에 결속한 checkpoint SHA·재개·변조 탐지 및 시간대→local timestamp 변환 거절 |
| 배포 bootJar | 1 | 별도 자식 JVM 16단계 통과: driver 누락·원본 raw isolated manifest 거절·discover·미검토 plan 거절·review·validate·app/driver JAR 변조·adapter/freeze ack 거절·501행 DRY_RUN·UNVERIFIED 공개 COMMIT 거절, target/control 무쓰기 |
| 물리 메타데이터 | 1 | 12개 컬럼의 JDBC/물리 구조·NULL/빈 LOB, native TIMESTAMP 원본 표현·typed microseconds·시간대 대조 |

최초 22건 실행의 12건 통과·10건 실패, 영향 회귀 11건 실행의 10건 통과·1건 실패,
마지막 메타데이터 1건 실행의 1건 통과를 보존했다.
첫 회차의 엔진 6·workflow 4·JVM 복구 1, 두 번째 회차의 가시성 6·값 타입 3·배포 JAR 1에서
21건의 통과를 집계하고 마지막 물리 메타데이터 1건을 더해 고유 22건을 확인했다.
두 회차에 중복된 시간대 변환 거절 시험은 한 번만 센다. 최종 22건은 각 회차의 성공 근거를 합산한 결과다.
테스트 계정의 비밀번호를 Oracle 19c의 30-byte 제한 안으로 보정했고, 실제 RAW JDBC 코드
`VARBINARY(-3)`와 native `oracle.sql.TIMESTAMP` 표현에 맞춰 기대값을 수정했다.
마지막 메타데이터 시험은 12개 컬럼의 DatabaseMetaData·ResultSetMetaData·USER_TAB_COLUMNS,
native TIMESTAMP 원본 소수초와 별도 `getTimestamp()`의 `123456000` nanos·`OffsetDateTime`을 대조한다.

배포 JAR 시험은 **수정하지 않은 원본 Oracle JAR을 명시 JVM module path에 넣고 BUNDLED evidence와 전체 JAR SHA-256을 결속**한다.
원본의 `Class-Path: oraclepki.jar`를 가진 raw isolated JAR은 기존 `LocalDriverJarPolicy`에서 계속 거절한다.
별도 Java 21 probe에서도 module path의 암묵 manifest 의존성 미노출과 원본 CodeSource·전체 JAR SHA를 확인했다.
Oracle driver와 Testcontainers는 테스트 전용이며 배포 bootJar에 포함하지 않는다.
이 경로가 isolated driver의 공개 COMMIT 허용이나 어댑터 자격 승격을 부여하지 않는다.

19c fixture는 Test JVM마다 원천 하나를 공유하고 JVM 종료 시 정리한다. 원천은 4 CPU·6GiB 메모리·1GiB shared memory이며
최초 cold DBCA는 약 20분이었다. cold-start 상한은 30분이고 ready 로그·JDBC·실제 버전·PDB·charset 확인은 모두 필수다.
전체 범위를 재현하려면 아래처럼 하나의 Test task에 여섯 클래스를 선택한다.

```powershell
$env:MIGRATION_ORACLE19C_IMAGE = 'fugeritorg/oracle-19.3.0-ee@sha256:6a29a3c7924de980b9cf10ef8c7e6120fe2db8e3fc32b2087aa59a845e4c63ac'
./gradlew.bat :migration-tool:test --no-daemon --warning-mode fail --console=plain `
  --tests 'nuri.migration.EtlOraclePostgresIntegrationTest' `
  --tests 'nuri.migration.OracleWorkflowPostgresIntegrationTest' `
  --tests 'nuri.migration.EtlOracleCrashRecoveryIntegrationTest' `
  --tests 'nuri.migration.OracleDiscoveryVisibilityIntegrationTest' `
  --tests 'nuri.migration.OracleMetadataIntegrationTest' `
  --tests 'nuri.migration.OraclePackagedCliIntegrationTest'
```

직접 엔진 COMMIT의 성공과 공개 승인 load의 vendor/driver 자격은 별도다. `UNVERIFIED`·`MANUAL_ONLY`,
adapter/freeze 승인과 공개 COMMIT 금지는 유지한다. 다른 Oracle release/RU, 최소권한·SCN/일관성·운영 freeze,
GB/TB 규모·전체 JVM 힙 보장·cutover·전체 백업 복원은 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다.
Tibero는 위 라이선스 기동 실패로 discover·load를 아직 실측하지 않았다.

## 이관 CUBRID 실행 환경과 검증 경계

2026-09-16 공식 `cubrid/cubrid:11.4` 이미지의 고정 digest
`sha256:1248b77ad39888df9e064655937188ab99fe056ed7e35b57d06155a015dc1791`와
로컬 엔진 **11.4.6.1963**, JDBC **11.3.1.0050**을 확인했다. 사용한 원본
`JDBC-11.3.1.0050-cubrid.jar`의 SHA-256은
`38C1293B629FEF5C4F6F57A1F4E52C98BAAD4872BC4C0EB59587CE03DE54AC66`이다.
엔진·JDBC 버전은 서로 다른 번호 체계를 사용하므로 같은 숫자로 맞춰 쓰지 않는다.
공급자 공개 이미지·드라이버를 사용하는 환경이며 별도 hostname 결속 라이선스 파일은 필요하지 않다.
엔진은 Apache 2.0, JDBC 등 커넥터는 BSD 3-Clause 조건을 따른다
([공식 이미지](https://hub.docker.com/r/cubrid/cubrid),
[공식 엔진 릴리스](https://github.com/CUBRID/cubrid/releases/tag/v11.4.6.1963),
[공식 라이선스](https://dev.cubrid.org/dev-guide/license)).

같은 환경의 UTF-8 DB에서 전용 adapter preflight와 owner 한정 discovery를 실행했다. CUBRID의 공개
`db_class`·`db_auth`는 현재 계정 권한으로 결과가 줄어드므로 완전성·SELECT-only 증명에는 사용할 수 없다.
준비 계정에는 원천 테이블 SELECT 외에 아래 두 내부 catalog의 SELECT가 필요하다. adapter는 이를 통해
권한이 없는 테이블과 UPDATE-only 테이블도 포함한 owner 전체 객체·권한을 대조하며, catalog 권한 누락,
SELECT 누락, 쓰기 권한, grant option, PUBLIC 외 그룹 상속 중 하나라도 있으면 preflight를 차단한다.

```sql
GRANT SELECT ON _db_class TO <migration_user>;
GRANT SELECT ON _db_auth TO <migration_user>;
```

실제 reader 계정에서 숨은 테이블과 UPDATE-only 테이블을 만든 부정 시험은
`READ_ONLY_SIGNAL_MISSING` 차단을 유지했고, 해당 객체를 제거하거나 SELECT-only로 교정한 뒤에는
preflight blocking 0, schema 1, table 3, column 9, identity 1, non-system grant 3을 수집했다.
AUTO_INCREMENT는 JDBC `getColumns`의 누락 필드에 의존하지 않고 `db_serial`의 class/attribute
연결을 사용하며, 일반 sequence 목록에서는 이 내부 serial을 제외한다.

실측 fixture의 scalar 1행과 BLOB/CLOB 1행은 `EtlExecutor` DRY_RUN에서 각각 read 1,
transformed 1, written 0, error 0이었다. BLOB 4 bytes와 한글·emoji CLOB(UTF-16 17 code units,
UTF-8 23 bytes)은 JDBC LOB 객체에서 `byte[]`·`String`으로 분리된 뒤 원본과 일치했다.
별도 PostgreSQL 17.9 target에 대한 내부 엔진 COMMIT rehearsal도 2행·checkpoint 2개 적재,
동일 run 무중복 재개, BLOB/CLOB 변조 checksum 실패와 복구 후 PASS를 확인했다. 이 직접 호출은
공개 workflow 밖의 엔진 rehearsal이며 승인·driver 격리 gate를 해제하거나 충족한 것으로 보지 않는다.

CUBRID 전용 adapter는 **UNVERIFIED·MANUAL_ONLY**를 유지하며 공개 COMMIT을 차단한다.
외부 JDBC JAR의 digest 결속·격리 driver COMMIT 금지와 source freeze 승인도 그대로 적용한다.
이번 데이터 경계는 작은 LOB와 테이블당 1행이다. 500행 초과 page 전환, 32 MiB BLOB/
16,777,216 UTF-16 code-unit CLOB 상한, 저메모리 대용량, 프로세스 장애복구, 운영 cutover는 아직
CUBRID 실측이 아니다.
로컬 근거의 위치는 `build/cubrid-verification`이며 자격증명이나 원시 행을 이 문서에 옮기지 않는다.

## 이관 프로세스 종료와 큰 필드

`./gradlew :migration-tool:test --tests '*EtlCrashRecoveryPostgresIntegrationTest'`는 별도 JVM을
실제로 강제 종료한다. 격리 PostgreSQL에 1,501행, 최대 1MiB binary 필드와 대형 Unicode text,
합계 30MB를 넘는 payload를 만들고, 자식 JVM heap은 128MiB로 제한한다.

첫 500행과 체크포인트가 커밋된 뒤 다음 청크의 DB 작업을 대기시켜 JVM을 종료한다. 미완료
청크가 남지 않는지 확인한 다음 새 JVM으로 재개하고 전체 값의 일치, 재반복의 무중복,
바이너리 변조의 검증 실패를 확인한다. `EtlPartialLoadRecoveryPostgresIntegrationTest`의
일반 오류 후 재개 시험도 함께 유지한다.

Gradle `test`와 PIT의 minion JVM 모두 `migration.drill.classpath`를 전달한다. 전달이 빠지면
테스트 자체가 실패하며, 기존 PostgreSQL 종료·재개 검사는 PIT에도 계속 포함한다. 자식 JVM은 별도로
실행되므로 그 프로세스의 코드를 PIT가 변이했다는 뜻은 아니다. 동일 JVM의 검증·변환 단위
테스트가 각 변이 분석 범위의 탐지율을 책임진다.

이것은 PostgreSQL text/bytea와 ETL·체크포인트 엔진의 복구 증거다. 다른 vendor의 JDBC
Blob/Clob 스트리밍, GB/TB 규모, 운영 승인·cutover 전체 절차를 검증했다는 뜻은 아니다.
실제 도입 DB의 버전·최소권한·스냅샷·LOB 형식에 대한 도입 시험은 계속 필요하다.

## 클라이언트 IP 신뢰 경계 리허설

2026-09-14에 운영 오버레이(`docker-compose.yml` + `docker-compose.prod.yml`)를 격리 Docker 스택으로 올려
[ADR-0019](../02-architecture/decisions/ADR-0019-client-ip-trust-boundary.md)의 경계를 전체 경로로 실측했다.
환경은 Windows Docker Desktop 29.1이다. 이 PC의 기존 컨테이너·네트워크와 겹치지 않게 저장소 밖 오버레이로
컨테이너 이름·서브넷(172.29.50.0/24)·루프백 호스트 포트만 바꿨다. edge 덮어쓰기, Next 비공개,
`TRUSTED_EDGE_PROXY`, `SPRING_PROFILES_ACTIVE: prod`는 그대로 뒀다.

재현 순서는 다음과 같다. 비밀값은 폐기용으로 생성해 파일로만 전달한다.

1. 현재 작업 트리로 api·frontend 이미지를 빌드한다.
2. 새 운영 DB이므로 [인가 전환 런북](authorization-cutover-runbook.md)과 같은 순서를 따른다.
   앱의 Flyway를 `SPRING_FLYWAY_TARGET=2.99`로 실행하고, 폐기용 표식 해시로 Contract SQL을 실행한 뒤 스택을 올린다.
3. 네트워크 안의 고정 주소(172.29.50.200) 컨테이너와 호스트에서 초기 관리자로 로그인한다.
   성공 로그인만 `tb_login_log.lgn_ip_addr`에 남으므로 그 값을 판정에 쓰고,
   `tb_login_policy.ip_addr`로 허용 IP를 하나만 둔 뒤 거부 여부를 본다.

| 경로 | 수정 전(신뢰 = 서브넷 /24) | 수정 후(신뢰 = Next 고정 주소 /32) |
|---|---|---|
| 컨테이너 → edge, 위조 XFF | 실제 주소 기록 | 실제 주소 기록 |
| 호스트 → edge, 위조 XFF | 게이트웨이 주소 기록(위조 무시) | 같음 |
| 호스트 → api 공개 포트, 위조 XFF | **위조 IP 기록** | 게이트웨이 주소 기록 |
| 컨테이너 → api:8080, 위조 XFF | **위조 IP 기록** | 실제 주소 기록 |
| IP 제한: 호스트 → edge, 허용 IP로 위조 | 403 | 403 |
| IP 제한: 호스트 → api 공개 포트, 허용 IP로 위조 | **200(우회)** | 403 |
| 컨테이너 → Next:3000 직접, 위조 XFF | 위조 IP 기록 | 위조 IP 기록(잔여 위험) |

원인은 신뢰 대역에 도커 게이트웨이가 포함된 것이다. 공개 포트로 직접 온 요청은 Docker Desktop·rootless Docker·
호스트 루프백 경유에서 출발지가 게이트웨이 주소로 바뀐다. 그래서 Next 컨테이너에 고정 주소를 주고 운영
`TRUSTED_PROXIES`를 그 /32 하나로 좁혔다. 동적 할당은 `ip_range`로 분리하고, 게이트웨이는 명시한다.
`ip_range`를 주면 도커가 게이트웨이를 그 구간 첫 주소로 잡는 것도 이 리허설에서 확인했다.
`ConfigSafetyLinterTest`가 이 정합과 위반 형태 12종을 고정한다.

남은 경계는 다음과 같다.

- egov-net 안의 다른 컨테이너가 edge를 거치지 않고 Next에 직접 요청하면 위조 XFF가 전달된다.
  Next는 edge만 도달한다는 네트워크 가정에 의존한다. 스크레이퍼 등 부가 컨테이너를 같은 네트워크에 둘 때 이 가정이 약해진다.
- 기존 배포에 `ip_range`를 더하면 compose가 네트워크를 다시 만들어야 하므로 점검 창에서 `down` 뒤 `up`으로 반영한다.
- 운영 호스트의 실제 LB·TLS 종단·Linux iptables 경로와 IPv6는 이 리허설 범위 밖이다.

## Spring Boot 4 호환 실측

2026-09-23 GAP-DEP-002(Boot 3.5 라인 OSS 지원 종료·미수정 CVE 16건)의 라인 결정에 앞서, `main`(c58bb9e89) 기준
별도 워크트리에서 **Spring Boot 4.0.8**(Framework 7.0.9·Security 7.0.7·Integration 7.0.6·Jackson 3.1.5·Hibernate 7.2.24·
Tomcat 11.0.24)로 올렸을 때 컴파일이 어디서 막히는지를 반복 실측했다. 목적은 이행이 아니라 **표면 측정**이며,
프로브 보정은 원본에 반영하지 않았다(로컬 브랜치 `probe/boot4-compat`, 워크트리 `D:/project/egov-boot4-probe`).
`./gradlew compileJava compileTestJava --continue`를 13회 반복하며 한 층씩 막힌 원인을 걷어낸 뒤, 전체 Spring
컨텍스트 기동과 eGovFrame 암호 실행까지 측정했다.

### 결과 — 본체·testFixtures 컴파일 통과까지 필요한 변경

| 축 | 변경 | 근거 |
|---|---|---|
| 빌드 — BOM·플러그인 | Boot 플러그인·`spring-boot-dependencies` 3.5.16 → 4.0.8, springdoc 2.8.5 → 3.1.1, spring-boot-admin 3.4.1 → 4.1.2 | Boot 4 BOM 실측 |
| 빌드 — 오버라이드 | `jackson-bom.version` 2.21.5 오버라이드 제거(Boot 4 는 Jackson 3 BOM 좌표, Jackson 2 는 `jackson-2-bom` 2.21.5 로 별도 관리) · `tomcat.version` 10.1.59 오버라이드 제거(Boot 4 는 Tomcat 11 이라 다운그레이드가 됨) | 1차 해석 실패 |
| 빌드 — 관리 이탈 | `spring-retry` 가 BOM 관리에서 빠져 버전 명시 필요(2.0.13) · `spring-boot-starter-aop` → `spring-boot-starter-aspectj` 개명 · Flyway autoconfig 가 `spring-boot-flyway` 모듈로 분리돼 의존 추가 필요 | 2·3·8차 |
| 빌드 — 테스트 | Boot 4 테스트 모듈 분할: `DataJpaTest`·`AutoConfigureMockMvc`·`AutoConfigureTestDatabase` 는 `spring-boot-starter-data-jpa-test`·`spring-boot-starter-webmvc-test`·`spring-boot-starter-jdbc-test` 계열 · Testcontainers 2.0.5 좌표 개명(`testcontainers-postgresql`·`-mariadb`·`-mysql`·`-mssqlserver`·`-oracle-free`·`-junit-jupiter`) · testFixtures 의 Jackson 2 모듈(`jackson-datatype-jsr310`·`jackson-module-parameter-names`) 명시 | 6~8차 |
| 본체 코드 | `-Werror` 아래 Framework 7 deprecation: `org.springframework.lang.NonNull/Nullable` → JSpecify(foundation 42건, 온라인 모듈 전체 51파일 사용) · `@EntityScan` → `org.springframework.boot.persistence.autoconfigure` · `DataSourceAutoConfiguration` → `org.springframework.boot.jdbc.autoconfigure` · `MultipartProperties` → `org.springframework.boot.servlet.autoconfigure` · Security 7 `AuthorizationManager.check` → `authorize(Supplier<? extends Authentication>, T)`(`OperationAuthorizationManager`) · `FlywayMigrationStrategy`(위 모듈 추가 후 재배치) | 2~8차, 6파일 |
| 테스트 코드 | `HibernatePropertiesCustomizer` → `org.springframework.boot.hibernate.autoconfigure` 외 위 테스트 모듈 재배치 | 7~8차 |

13차에 **`compileJava`·`compileTestFixturesJava`·`compileTestJava` 가 5개 모듈 전부 통과**했다(BUILD SUCCESSFUL).
위 표의 빌드·코드 보정 외에 추가로 필요했던 것은 `spring-boot-starter-test` → `spring-boot-starter-test-classic`(테스트
slice 모듈 분할을 다시 모으는 starter), `WebMvcTest`·`AutoConfigureMockMvc` 등의 패키지 재배치(25+4 파일), Spring Messaging 7
에서 모호해진 `convertAndSend(String, Map)` 오버로드 1건이다.

### 결과 — 런타임(컨텍스트 기동·eGovFrame)

컴파일이 끝난 뒤 전체 Spring 컨텍스트를 올려 봤다(`@SpringBootTest(classes = ApiServerApplication.class)`). 두 층이 더 막혔고
둘 다 **메이저 축 전환**이라 이행 비용의 실제 무게는 여기에 있다.

| 막힌 층 | 증상 | 뜻 |
|---|---|---|
| JUnit | `NoSuchMethodError: ExtensionContext$Store.computeIfAbsent(...)` (SpringExtension) | Boot 4 BOM 은 **JUnit Jupiter 6.0.3** 을 관리한다. 저장소는 `junit-bom:5.12.2` + `resolutionStrategy` 로 platform 1.11.4·jupiter 5.11.4 를 강제하는데, Spring 7 의 `SpringExtension` 은 JUnit 6 API 를 요구한다. 고정을 풀자 해소됐다(JUnit 5 → 6 메이저 이행이 전제) |
| Jackson | `NoSuchBeanDefinitionException: com.fasterxml.jackson.databind.ObjectMapper` | Boot 4 는 **Jackson 3**(`tools.jackson`)가 기본이라 자동 설정이 Jackson 2 `ObjectMapper` 빈을 더 이상 만들지 않는다. 그 타입을 주입받는 빈이 컨텍스트 로드 단계에서 실패한다(실측: `AttachmentIntegrityReportStore`) |

⚠ **애노테이션은 영향이 없다.** Jackson 3 도 `com.fasterxml.jackson.annotation` 패키지를 유지하므로 DTO 의 `@JsonProperty`·
`@JsonInclude` 38파일은 그대로다. 이행 대상은 `databind`·`core` 를 쓰는 **main 11파일**(migration-tool 6 · 온라인 5)이다.

Jackson 2 `ObjectMapper` 를 임시 빈으로 공급하자 **컨텍스트가 올라왔다** — `SecurityHardeningRegressionTest` 3/3 통과.
그 컨텍스트에는 `ProjectCryptoConfig` 의 eGovFrame 빈(`EgovARIACryptoServiceImpl`·`EgovPasswordEncoder`)이 포함된다.
이어서 eGovFrame 암호를 실제로 호출하는 테스트도 통과했다 — `CryptoUtilTest`(ARIA 암·복호, 약한 키 경고, 레거시 래퍼) **18/18**,
`RrnoEncryptionConverterTest`(주민번호 암호화 컨버터) **9/9**.

⚠ 즉 **가장 큰 미지수였던 eGovFrame 5.0.0 의 Spring Framework 7 런타임 호환은 이 범위에서 확인됐다.** Spring 6 기준으로
컴파일된 eGovFrame jar 가 Framework 7 위에서 빈 생성·암호 연산을 수행했다. 다만 이것은 컨텍스트 기동과 암호 경로의 증거이며,
eGovFrame 의 배치·엑셀·ID 생성 등 다른 모듈의 런타임 증거는 아니다.
### 4.1.1 재실측 — 전체 검증 (2026-09-24)

전환 목표가 다음 minor 이므로 같은 프로브에 `main`(2071e5984)을 병합하고 **Boot 4.1.1**(현재 최신 GA, 4.2 는 M1)로 올려
위에서 측정하지 않은 항목을 전부 돌렸다. 4.0.8 → 4.1.1 에서 새로 막히는 컴파일은 없었다.

첫 전체 테스트는 3,778건 중 **206건이 실패**했고(하네스 98건은 통과) 그중 205건이 Jackson 2 `ObjectMapper` 빈 부재였다(테스트 64파일이 필드로
주입받고, 본체 `AttachmentIntegrityReportStore` 가 주입받아 business-core·app 통합 컨텍스트가 연쇄로 뜨지 못했다). 그래서
Boot 4 의 **Jackson 2 호환 모듈** `spring-boot-jackson2`(deprecated)를 붙이고 HTTP 변환기를
`spring.http.converters.preferred-json-mapper: jackson2` 로 두었다. 이 모듈은 테스트 슬라이스(`AutoConfigureJson`)에도 등록된다.

| 검증 | Boot 4.1.1 + Jackson 2 호환 결과 | 비교 |
|---|---|---|
| 전 모듈 컴파일 | 통과 | — |
| 전체 테스트(JUnit 6) | 3,778건 중 실패 2 | 둘 다 아래 ② 의 standalone MockMvc — 원인 확정 |
| 하네스 | 98/98 | — |
| 실제 PostgreSQL 스키마 검증 | 74/74 | Hibernate 7.2 매핑·Flyway 새 모듈·Testcontainers 2.x |
| PIT(foundation-jwt) | 63 중 59 사멸(94%), 테스트 강도 97% | main 과 같다(DEC-OPS-094) |
| `api-docs.json` | 줄 끝을 맞추면 **바이트까지 동일** | 생성 zod·타입 무변경 |
| 격리 E2E | 136건 기대대로, 재시도 통과 0 | main 도 같다 |

**JUnit 6 는 코드 비용이 거의 없다** — 전체 테스트와 PIT(JUnit 5 플러그인 1.2.1)가 그대로 돌았다. eGovFrame 은 본체가 쓰는
것이 암호 계열(ARIA·비밀번호 인코더·환경 암호 서비스)뿐이라, 위 "암호 외 모듈" 은 측정할 런타임 사용처가 없다.

**전환에서 챙길 것** — ①·⑤·⑥은 테스트와 E2E 가 **모두 통과하는 채로** 조용히 바뀌므로 점검 목록으로 둔다.

1. **Jackson 설정 키** — Boot 4 에서 `spring.jackson.*` 은 Jackson 3 에만 적용된다. 앱의 `fail-on-unknown-properties: true`
   등을 `spring.jackson2.*` 로도 주지 않으면 **모르는 필드가 든 요청의 거부가 풀린다.**
2. **Jackson 2 타입을 쓰는 DTO** — `MemoInstructionRequest` 의 `JsonNode` 필드는 Jackson 3 변환기에서 500 이다. 호환 모듈
   단계에서는 문제가 없고 Jackson 3 단계의 이행 대상이다. 남은 테스트 실패 2건은 standalone MockMvc 가 Boot 설정 밖에서
   Spring 7 기본값(Jackson 3)을 써서 이 DTO 를 읽지 못한 것이다.
3. **Spring 7 내부 필드 변경** — `EgovMessageConfigTest` 가 리플렉션으로 읽던 `defaultEncoding` 이 `defaultCharset` 으로
   바뀌었다. 게터로 읽으면 Spring 6·7 양쪽에서 통해 먼저 반영할 수 있다(반영함).
4. **Hibernate 7 로그** — SQL 오류가 `SqlExceptionHelper` ERROR 대신 `org.hibernate.orm.jdbc.error` WARN 으로 남는다.
   로그 등급·이름으로 경보를 거는 곳이 있으면 바뀐다. Hibernate Validator 9 는 `List` 에 붙인 `@Valid` 를 deprecated 로
   경고한다(E2E 로그 11건 — 원소 타입에 옮긴다).
5. **추적이 꺼진다** — Boot 4 는 추적 자동 설정을 actuator 에서 `spring-boot-micrometer-tracing*` 모듈로 뺐다.
   `micrometer-tracing-bridge-otel`·OTLP 라이브러리만 있으면 Tracer 가 생기지 않아 로그의 `[traceId-spanId]` 와 OTLP
   내보내기가 사라진다. `spring-boot-starter-opentelemetry` 를 붙이자 되살아났다. 메트릭(Prometheus)은 영향이 없다.
6. **스케줄 작업 스레드** — `@Scheduled` 작업이 main 에서는 `scheduling-*` 스레드에서, Boot 4 에서는 WebSocket 브로커 스케줄러
   (`MessageBroker-*`)에서 돈다. 하트비트용 풀을 나눠 쓰게 되므로 전용 스케줄러를 명시한다.

E2E 백엔드 로그의 "사용자 활동 로그 누적 실패"·`tb_user_log` 외래 키 위반 약 40건은 main(Boot 3.5.16)에도 같은 수가 있어
**Boot 4 와 무관**하다.

### 측정하지 않은 것

- Jackson 3 로 옮긴 뒤의 응답 직렬화 차이 — 위 결과는 호환 모듈로 Jackson 2 를 유지한 상태다.
- 재사용 생성기(`base:verify`) 세 프로필과 PIT 나머지 스코프, CodeQL·릴리스 이미지 빌드 — CI 에서만 도는 경로다.
- 호환 모듈 `spring-boot-jackson2` 의 제거 시점 — deprecated 로 표시돼 있고 제거 버전은 확인하지 않았다.

### 지원 라인 선택지

지원 종료일은 2026-09-23 [endoflife.date](https://endoflife.date/spring-boot) 조회다. 상용 지원은 Broadcom 의
유료 구독(Tanzu Spring)을 뜻하며, 패치가 Maven Central 이 아니라 **구독자 전용 비공개 저장소**로만 배포된다.

| 라인 | OSS 지원 종료 | 상용 지원 종료 |
|---|---|---|
| Boot 3.5 · Framework 6.2 (전환 전) | 2026-06-30 | 2032-06-30 |
| Boot 4.0 · Framework 7.0 | 2026-12-31 · 2027-07-31 | 2027-12-31 · 2028-07-31 |
| Boot 4.1 (현행, [ADR-0024](../02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md)) | 2027-07-31 | 2028-07-31 |

⚠ **상용 지원(ⓑ)은 이 저장소가 내릴 수 있는 결정이 아니다.** 여기는 재사용 템플릿이고 구독 자격증명은 저장소·CI·
생성 산출물 어디에도 넣을 수 없으므로, 도입 기관이 각자의 구독으로 선택하는 축이다(이미 구독이 있는 기관에는 코드
변경 0 인 선택지다). eGovFrame 센터가 Spring 패치를 백포트하지 않으므로 그 경로도 ⓑ 의 대안이 아니다.

⚠ ⓐ 를 택할 때 목표는 4.0 이 아니라 **다음 minor** 다. 4.0 의 OSS 지원은 2026-12-31 에 끝나므로 지금 4.0 으로 올리면
연내에 다시 올려야 한다. OSS 라인을 따라가는 선택은 minor 상향이 정례 작업이 된다는 뜻이다.

### 판정

컴파일 수준의 이행 표면은 **작다**(빌드 보정 약 14건, 본체 7파일, 테스트 import 재배치 30여 파일). 가장 컸던 미지수인
**eGovFrame 런타임 호환은 확인됐다.** 대신 실측이 드러낸 진짜 비용은 **두 개의 메이저 축 전환**이다.

1. **JUnit 5 → 6** — Boot 4 가 Jupiter 6.0.3 을 관리하고 Spring 7 의 `SpringExtension` 이 그 API 를 요구한다. 선택이 아니라 전제다.
2. **Jackson 2 → 3** — 자동 설정이 Jackson 2 `ObjectMapper` 를 주지 않는다. main 11파일이 대상이고, 응답 직렬화 계약(`api-docs.json`·생성 zod)에 주는 차이는 아직 측정하지 않았다.

두 축 모두 이 저장소의 게이트(생성 계약·하네스·PIT·재사용 산출물)가 직접 보는 영역이라, 이행은 "버전만 올리는 일" 이 아니다.
다음 단계는 사용자 결정(ⓐ 전환 ADR → 두 축의 이행 계획과 게이트 영향 산정 / ⓑ 상용 지원 / ⓒ accepted-risk)이며 GAP-DEP-002 가 추적한다.

**2026-09-24 재실측으로 판정을 고친다.** JUnit 6 는 전제이지만 코드 비용이 거의 없고, Jackson 3 는 호환 모듈로 뒤로 미룰
수 있다. 그래서 ⓐ 는 두 단계로 나뉜다.

1. **Boot 4.1 + Jackson 2 호환** — 빌드 보정과 위 "전환에서 챙길 것" ①·③~⑥. 테스트·하네스·스키마·PIT·E2E·API 계약이
   이 단계에서 유지됨을 확인했다. 4.1 의 OSS 지원은 2027-07-31 까지다.
2. **Jackson 3 이행** — 본체 11파일·테스트 64파일, Jackson 2 타입 DTO, standalone MockMvc 테스트, `spring.jackson2.*` →
   `spring.jackson.*` 되돌림. 호환 모듈이 deprecated 이므로 그 제거 전에 마쳐야 한다.

### 1단계 적용 결과 (2026-09-24)

[ADR-0024](../02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md) 1단계를 `main`(04db2b3c5) 위에 정식
변경으로 옮겼다. 프로브와 달리 `-Werror -Xlint:deprecation`을 끄지 않았고, 프로브 보정 표식을 모두 걷었다. 적용하면서
프로브가 보지 못한 것이 다섯 드러났다. 모두 테스트가 통과한 채로 지나갈 수 있던 것이다.

| 발견 | 증상 | 조치 |
|---|---|---|
| 테스트와 운영의 JSON 변환기 불일치 | api-server 테스트 `application.yml`이 main의 같은 이름 파일을 가려, 테스트 컨텍스트에만 매퍼 선택이 없었다. 테스트는 Jackson 3, 운영·E2E는 Jackson 2로 HTTP 본문을 읽었다. 프로브의 "전체 테스트 실패 2"는 이 차이를 가리고 있었다. | 테스트 설정에 같은 선택을 두고 [동등성 테스트](../../api-server/src/test/java/nuri/api/config/JsonConverterParityIntegrationTest.java)로 고정. 두 매퍼에서 해석이 갈리던 `MemoInstructionRequest`는 `Object` 위임 생성자로 바꿨다. WebSocket 메시지 변환도 같은 매퍼에 둔다. |
| `@Scheduled` 스레드 | Boot는 `TaskScheduler` 빈이 하나라도 있으면 기본 스케줄러를 만들지 않는다. WebSocket 브로커의 스케줄러 때문에 로그 누적 작업이 `MessageBroker-*`에서 돌았다. | Boot 빌더로 `taskScheduler` 명시, [스케줄러 테스트](../../foundation/src/test/java/nuri/foundation/core/config/SchedulingTaskSchedulerTest.java) |
| HV000271 | 컨테이너에 붙인 `@Valid`가 Hibernate Validator 9에서 deprecated다(E2E 로그 11건). | DTO 8곳·컨트롤러 파라미터 4곳을 원소 타입으로. 입력 계약 게이트가 원소 타입 `@Valid`를 요구하고 컨테이너 쪽을 거부한다. |
| JSpecify와 springdoc | JSpecify `@NonNull`은 TYPE_USE 전용이라 springdoc이 필드 선언에서 읽지 못해 `UserAuthorityDto.scrtyDcsnTrgtId`의 required가 빠졌다. Lombok null 검사는 이름으로 인식해 종전과 같다(null 검사 클래스 10개 동일). | `@Schema(requiredMode = REQUIRED)`로 보존. `api-docs.json` 차이는 설명 문구 한 줄뿐이다. |
| JSpecify와 결합 스캐너 | `pkg.@NonNull Type` 형태가 한정 이름을 쪼개 결합 원장의 edge 하나를 가렸다. | import와 단순 이름으로 되돌림 |

PR의 dependency review가 하나를 더 잡았다. 4.1.1 BOM의 Tomcat 11.0.24에는 10.1.x에서 막았던 Critical 3건
(GHSA-gcx9-497g-6cp6·GHSA-9xv2-5v5q-p794·GHSA-h3x4-894j-xpx5, 수정 11.0.25)이 그대로 걸려, 첫 적용본이 "BOM이
수정선을 충족한다"고 적은 주석은 틀렸다. WebSocket 보안 제약 우회 등 Important 수정을 더 담은 11.0.26으로 고정했다.

그 밖에 okhttp 5 경유 `kotlin-stdlib`가 1.9.25에서 2.3.21로 바뀌어 NVD 오탐 억제의 버전을 옮겼고, SAST 예외 4건의 보완
소스를 재검토해 해시를 재결속했다. Testcontainers 2의 컨테이너 클래스가 제네릭이 아니어서 CI 이미지 사전 pull 계약의
정규식을 두 형태 모두 읽게 고쳤다.

로컬 검증: 5개 모듈 컴파일(`-Werror`), 전체 테스트 3,788건(foundation 338·business-core 962·business-app 841·
api-server 689·migration-tool 958), 하네스 99/99, SAST 예외 계약 17/17. migration-tool의 자식 JVM 종료·재개 시험
1건은 Docker 재기동 직후 다른 컨테이너와 겹친 부하에서 90초 제한을 넘었고, 단독 재실행에서 82초(재개 단계 21초)로
통과했다. `api-docs.json`은 설명 문구 한 줄만 달라 생성 계약은 그대로다. 실제 PostgreSQL 스키마 검증·PIT·격리 E2E·
재사용 산출물 세 프로필은 PR의 required CI로 확인한다.

⚠ **2단계에 쓸 사실 하나.** 프로브의 전체 통합 테스트는 모르는 사이 HTTP 본문을 Jackson 3로 검증했고,
`JsonNode` DTO 하나 말고는 통과했다. Jackson 3 변환기 쪽 HTTP 계층의 위험은 그만큼 작다는 증거다.

### 2단계 적용 결과 (2026-09-24)

온라인 앱의 HTTP·WebSocket 변환기와 Boot 매퍼를 Jackson 3로 옮기고 호환 모듈 `spring-boot-jackson2`를 걷었다.
본체 5개·테스트 57개 파일이 `tools.jackson`으로 옮겨졌다.

**wire 규칙은 설정 두 줄로 유지한다.** Jackson 3는 기본값이 바뀌었다(날짜 타임스탬프, primitive의 null, 뒤따르는 토큰,
속성 알파벳 정렬, 파라미터 이름 감지 등). `spring.jackson.use-jackson2-defaults: true`는 Boot가 Jackson 3의
`MapperBuilder.configureForJackson2()`를 부르게 해 대부분을 되돌린다. 다만 그 메서드는 순수 Jackson 2 기본값이라
파라미터 이름 감지를 끈다 — Boot 3.5는 파라미터 이름 모듈을 등록해 켜 두었으므로
`spring.jackson.mapper.detect-parameter-names: true`로 되돌렸다.
[동등성 테스트](../../api-server/src/test/java/nuri/api/config/JsonConverterParityIntegrationTest.java)가 Boot 매퍼의 기능값 8개를 고정한다.

| 발견 | 증상 | 조치 |
|---|---|---|
| 알 수 없는 필드 메시지 | 예외 처리기가 원인을 Jackson 2 예외 타입으로 판별해, Jackson 3 변환기에서는 조용히 빗나가 필드 이름이 없는 일반 메시지가 된다. 기존 단위 테스트는 원인 예외를 직접 만들어 넣어 이것을 보지 못한다. | Jackson 3 타입으로 판별하고, 실제 변환기를 거치는 테스트를 추가 |
| `api-docs.json` 포맷터 | 빈 컨테이너를 `[]`로 쓰던 PrettyPrinter 서브클래스가 Jackson 3 API와 맞지 않았다. | Jackson 3 `Separators`의 빈 컨테이너 구분자로 대체. 재생성본이 main과 바이트까지 같다 |
| 기계적 이름 바꾸기 | JsonNode의 `fields()` → `properties()` 치환이 같은 이름의 record 접근자 17곳까지 건드렸다(H4). | 컴파일 오류로 드러나 그 파일만 되돌림 |
| SAST 예외의 행 결속 | FP-008 탐지 파일에 주석 한 줄을 더하면 탐지 행(69)이 밀려 CodeQL 예외가 빗나간다. | 줄 수를 유지하고 보완 소스를 재검토 |

**migration-tool은 Jackson 2에 둔다.** 온라인 앱과 분리된 CLI라 Boot의 HTTP 변환기를 쓰지 않고, 승인 산출물이
정규화 JSON의 digest에 결속돼 직렬화가 조금만 달라져도 기존 승인이 무효가 된다. deprecated인 것은 Boot 호환
모듈이지 Jackson 2 자체가 아니다(DEC-OPS-124).

로컬 검증: 전체 테스트 3,790건(foundation 339·business-core 962·business-app 841·api-server 690·migration-tool 958).
migration-tool 종료·재개 시험 1건은 1단계와 같은 부하 조건에서 90초를 넘었고 단독 재실행에서 통과했다.
하네스 99/99, SAST 예외 계약 17/17, `api-docs.json` 바이트 동일, red 증명 3종(예외 타입 오판·Jackson 2 기본값
제거·파라미터 이름 끄기가 각각 해당 테스트만 실패).

### 후속 정리 (2026-09-24)

**NVD 확인.** #734 병합 뒤 main(f93c19d7c)에서 주간 스캔을 수동 실행했다(run 35968660686). 억제되지 않은 CVSS 7 이상
탐지가 기준선(2026-09-20 주간 실행) **198건 → 0건**이다. 모듈별 전체 탐지도 약 300건에서 6건(모두 7 미만)으로 줄었고,
Spring Framework 6.2.19(12종)·Security 6.5.11(2종)·Integration 6.5.10(3종)의 CVE가 모두 사라졌다. 리포트는 루트와 5개
모듈(migration-tool 포함) 6개다. kotlin-stdlib 2.3.21·OpenTelemetry 오탐은 기한부 억제가 적용됐다.

**테스트 starter 축소.** 이행용 `spring-boot-starter-test-classic`을 기술별 test starter로 좁혔다. 공통은
`spring-boot-starter-test`이고, business-core 테스트 픽스처가 webmvc·data-jpa·security·opentelemetry test starter를,
api-server가 직접 쓰는 webmvc·security·opentelemetry test starter를 선언한다. 5개 모듈의 테스트 실행 클래스패스를
main과 비교했을 때 빠진 것은 쓰지 않는 test 모듈(cache·data-cassandra 등 20여 개)뿐이고 공통 라이브러리의 버전
변화는 0건이다. 조심할 곳은 import 없이 클래스패스만으로 동작하는 두 모듈이다.

| 모듈 | 빠뜨리면 | 고정 |
|---|---|---|
| security-test | `@WebMvcTest`가 앱의 보안 필터를 빼고 MockMvc가 테스트 보안 컨텍스트를 잃는다 | 두 선언처에서 빼면 `ApiSecurityConfigTest` 2건 red(실측) |
| opentelemetry-test | 전체 컨텍스트 테스트에서 메트릭·추적 export가 켜지고 OTLP가 기본 주소로 전송을 시도한다 — 어떤 테스트도 실패하지 않는다 | [관측성 차단 테스트](../../api-server/src/test/java/nuri/api/config/TestObservabilityIsolationIntegrationTest.java) 신설, 빼면 red(실측) |

**spring-retry는 유지한다.** Spring Framework 7 core retry(`@EnableResilientMethods`·`org.springframework.resilience`의
`@Retryable`)로 옮기는 안을 조사 1건과 반박 검증 3건으로 검토했고, 옮기지 않기로 했다. 근거는 넷이다.

1. **동작이 바뀐다.** Spring 7에는 `@Recover`가 없어 대체 처리를 호출부 catch로 옮겨야 한다. 그러면 (가) SMS 발송
   루프에서 `NoClassDefFoundError` 같은 `Error`가 루프를 멈춰 남은 수신자가 `P`로 남고(지금은 `ExhaustedRetryException`
   으로 감싸져 다음 수신자로 넘어간다), (나) 백오프 중 인터럽트가 지금과 달리 `F` 기록을 시도하며, (다) 지연값
   placeholder 해석 실패가 발송 없이 모든 메일·SMS를 `F`로 기록하는 경로가 생긴다. 시도 횟수 표기도 다르다
   (`maxAttempts=3`은 `maxRetries=2`).
2. **공급망 이득이 없다.** spring-retry 2.0.13은 사용처 0건인 Spring Batch(spring-batch-infrastructure 6.0.5, compile)
   경유로 api-server bootJar에 그대로 남는다.
3. **헌법 문구가 바뀐다.** 백엔드 헌법 제10조 1항이 'Spring Retry'와 '@Recover'를 명시한다 — 사용자의 명시적 요청이 필요하다.
4. **지금 동작한다.** Framework 7.0.9에서 재시도 경계 테스트(발송 3회 시도·커밋 재시도·소진 후 기록)가 모두 통과한다.

재검토 조건: Framework 7 minor에서 spring-retry 호환이 깨지거나, Spring Batch·egovframe-rte-bat-core 의존을 걷어
spring-retry가 bootJar에서도 빠질 때. 그때는 위 세 가지 의미 차이를 테스트로 먼저 고정한 뒤 옮긴다.

## ZAP 주간 스캔 경고 분류

주간 실행 `35489408892`(2026-09-20, 리포트 아티팩트 `zap_baseline_frontend`·`zap_fullscan_api`)의
WARN-NEW 11건을 인스턴스 근거까지 열어 전수 분류했다. 이 워크플로는 2026-08-02 이후 매주 성공했지만
경고를 사람이 읽은 기록이 없었다 — WARN 은 빌드를 막지 않으므로 신호가 쌓이기만 했다.

### 수리한 것

| 규칙 | 실측 근거 | 조치 |
|---|---|---|
| `10024` 민감정보 URL 노출 | 스캐너가 `/login?password=…&userId=…` 를 실제로 만들어 냈다. 로그인 `<form>` 에 `method` 가 없어 HTML 기본값이 GET 이었다. | 폼에 `method="post"`. `handleSubmit` 이 `preventDefault` 하므로 하이드레이션 뒤 동작은 불변이고, 그 전 제출만 URL 에 값을 남기지 않게 된다. |
| `90004` COOP 부재(프런트 3건) | 문서 응답에 `Cross-Origin-Opener-Policy` 가 없었다. | `same-origin` 을 문서 응답 공통으로 부여한다. 새 창 링크 3곳은 이미 `rel="noopener noreferrer"` 라 동작 변화가 없고, 규율이 개별 링크에서 문서 단위로 올라간다. |
| `90004` CORP 부재(API 1건) | `/v3/api-docs` 에 `Cross-Origin-Resource-Policy` 가 없었다. | `same-origin`. 브라우저가 이 서버 바이트를 직접 `<img src>` 로 읽는 경로가 없다(첨부는 전부 인증 axios → object URL) 하고 CORS fetch 는 이 헤더의 대상이 아니라 안전하다. |

분류 중 ZAP 이 지목하지 않은 결함 하나가 함께 드러났다 — 두 CSP 가 `report-to csp-endpoint` 를
선언하는데 그 그룹을 정의하는 `Reporting-Endpoints` 헤더가 저장소 어디에도 없어 **최신 리포팅
경로가 선언만 있고 동작하지 않았다.** 수집기는 이미 `application/reports+json` 을 파싱하고 있었으므로
빠진 것은 그룹 정의 하나였다. 선언·그룹 정의·수집기 세 자리가 같은 경로를 가리키는지는
`csp-policy` 계약이 묶는다.

### URL-state census 가 같은 자리를 다르게 판정하고 있었다

`method="post"` 를 넣고 census 를 재생성하자 기록 하나가 사라졌다(form-producer 55 → 54).
지워진 `URL-B5F403F23CA8B7` 은 이 로그인 폼을 `form-producer`·`intercepted-submit` 으로 분류하고
`currentBehavior` 에 이렇게 적고 있었다 — *"Form submission is intercepted before native navigation
(named-handler-prevent-default); no URL state is emitted."*

그 문장은 **하이드레이션 뒤에만 참이다.** census 는 소스의 `preventDefault` 를 보고 "URL 상태가
나오지 않는다" 고 판정했고, 스캐너는 그 판정이 성립하지 않는 창에서 실제로 그 URL 을 만들어 냈다.
정적 분석이 런타임 가정을 사실로 승격한 형태이며, 같은 축의 다른 `intercepted-submit` 기록도
같은 가정 위에 있다 — 이 절은 그 사실을 남기고 일괄 점검은 하지 않는다.

### 기록하고 유지하는 것

| 규칙 | 판정 근거 |
|---|---|
| `10055` style-src unsafe-inline (10) | [GAP-FE-001](../../.agent/memory/known-gaps.md) 의 accepted-risk. 재개 조건은 sonner 의 nonce 지원 또는 교체이며 `csp-policy` 계약이 세분화 시도를 red 로 잡는다. |
| `10049` Non-Storable Content (8) | nonce CSP 가 전 페이지를 동적 렌더로 돌린 결과의 `no-store`([DEC-OPS-011](../../.agent/memory/decisions.md)). 의도한 동작이다. |
| `10094` Base64 Disclosure (5) | 근거가 CSS module 해시 클래스명과 생성 operation 이름이다. 오탐이지만 우리 응답 내용을 보는 규칙이라 끄지 않는다 — 진짜 base64 노출이 생기면 같은 규칙이 말해야 한다. |
| `10019` Content-Type 부재 (2) | `/help` 는 307 리다이렉트, `/sitemap.xml` 은 라우트가 없어 404 다. 둘 다 본문 없는 응답이다. |
| `10031` 사용자 제어 HTML 속성 (2) | `redirect` 파라미터다. `resolveInternalRedirect` 가 내부 절대경로만 통과시킨다. |
| `10111` 인증 요청 식별 (1) | 로그인 폼을 찾았다는 정보성 보고다. |
| `40042` Spring Actuator 정보 노출 (1) | `/actuator/health` 의 `{"status":"UP"}`. health probe 를 이 경로로 두는 것은 [DEC-OPS-069](../../.agent/memory/decisions.md) ④ 의 결정이고, 운영 오버레이는 actuator 를 앱 포트에 노출하지 않는다. |
| `10104` User Agent Fuzzer (5) | 스캐너가 User-Agent 를 바꿔 응답 차이를 보는 정보성 규칙이다. |

`90005`(Sec-Fetch-* 부재, 12건)만 [.zap/rules.tsv](../../.zap/rules.tsv) 에 `IGNORE` 로 등재했다 —
그 헤더는 브라우저가 요청에 붙이는 것이고 ZAP 의 클라이언트는 붙이지 않으므로 응답 쪽에서
고칠 대상 자체가 없다. 나머지는 WARN 으로 남겨 다음 실행에서도 보이게 한다.

### 이 분류가 증명하지 않는 것

이 스캔은 **미인증 공개 표면**만 본다(baseline 40 URL · full 8 URL). 로그인 뒤 관리자 화면은
대상이 아니며, 인증 ZAP 증거는 [DEC-OPS-111](../../.agent/memory/decisions.md) 로 기관 채택 수명의
`operational-assurance` 통제로 이전했다. WARN 이 0 이 되는 것도 목표가 아니다 — 유지 판정한
8건은 다음 실행에서도 그대로 보고된다.
