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
