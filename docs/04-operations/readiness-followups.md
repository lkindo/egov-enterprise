# 완성도 후속 보강과 검증 경계

## 의존성

애플리케이션 의존성과 Gradle 플러그인 classpath는 별도로 검사한다. 루트 `buildscript`
constraints는 Dependency-Check/Boot 플러그인이 사용하는 HttpClient/cache 5.6.3,
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

기존 SAST 예외 7건의 규칙·위치·만료일은 유지한다. FP-001/002의 JWT 필터는 DB 장애에
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

미소비 operation은 11에서 10으로 감소했다. 화면 호출 없는 서비스 메서드 래칫은 32를 유지한다.
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

이 실측은 원천 탐색의 증거일 뿐이다. Oracle 어댑터 증거 수준은 `UNVERIFIED`로 유지한다. plan·load, LOB 스트리밍,
SCN 스냅샷, 운영 규모, 19c 등 다른 버전은 검증하지 않았다. 외부 드라이버 commit 차단도 그대로다.
Tibero는 공개 실행 이미지가 없어 실측하지 못했다.

## 이관 프로세스 종료와 큰 필드

`./gradlew :migration-tool:test --tests '*EtlCrashRecoveryPostgresIntegrationTest'`는 별도 JVM을
실제로 강제 종료한다. 격리 PostgreSQL에 1,501행, 최대 1MiB binary 필드와 대형 Unicode text,
합계 30MB를 넘는 payload를 만들고, 자식 JVM heap은 128MiB로 제한한다.

첫 500행과 체크포인트가 커밋된 뒤 다음 청크의 DB 작업을 대기시켜 JVM을 종료한다. 미완료
청크가 남지 않는지 확인한 다음 새 JVM으로 재개하고 전체 값의 일치, 재반복의 무중복,
바이너리 변조의 검증 실패를 확인한다. `EtlPartialLoadRecoveryPostgresIntegrationTest`의
일반 오류 후 재개 시험도 함께 유지한다.

Gradle `test`와 PIT의 minion JVM 모두 `migration.drill.classpath`를 전달한다. 전달이 빠지면
테스트 자체가 실패하며, PIT에서도 종료·재개 검사를 제외하지 않는다. 자식 JVM은 별도로
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
