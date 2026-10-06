# 소스 간결화 정비 결과 — 2026-10-06

기준: [전체 조사 보고서](source-simplification-audit-2026-10-06.md), 커밋 `e0066946cb55c2135d9df3a66baa739f6ba8211b`. 사용자의 “권장 순서대로 작업 진행” 지시에 따른 소스 정비와 로컬 검증 결과다. 일반 정비는 L1, 권한·보안 설정·공유 입력 계약은 L2로 검토한다. 운영 DB는 변경하지 않았다.

조사한 29개 항목의 정비와 아래 로컬 검증을 완료했다. 운영 Java·TS/TSX는 같은 측정 기준으로 **1,901줄 감소**했다. 부서·그룹 권한 목록은 데이터 규모가 늘어도 조회를 각각 **4회·3회**로 유지하며, 조직도·부서 선택의 1,000건 상한과 정책 탭의 불필요한 초기 조회를 제거했다. 큰 파일의 전면 재작성은 하지 않고 확인된 책임 단위만 추출했다.

## 변경 범위

| 조사 항목 | 구현·판단 |
|---|---|
| BE-01 | 부서·그룹 권한 목록 일괄 조회. PostgreSQL에서 부서원 1→25명·그룹 24개 증가에도 각각 SELECT 4회·3회, 개별 응답/버전·정렬·ABA 의미 검증 |
| BE-02 | 사용자 삭제의 중복 조회 제거. loginId 우선·esntlId fallback과 인가 순서 유지 |
| BE-03~07 | 미사용 validator·projection·조건·predicate, Note 별칭, popup/notification/schedule stub, 이전 사용자 목록 메서드·JOIN 제거. 의미 있는 테스트는 현행 메서드로 이관 |
| BE-08 | `Ymd` 공통 검증·정규화. 아래 허용표 적용, API 정규식·Entity 매핑 불변 |
| BE-09 | API/core 암호 생성 정책을 `PasswordEncoders`에 통합, 미사용 Environment 주입 제거. BCrypt cost/id·fallback 조건·필터 체인 보존 |
| BE-10 | 결재 단계·차수이력·참조자·처리이력 응답 조립만 `InformalSanctionReadAssembler`로 추출. 조회·가시성 결정·인가·쓰기 tx는 서비스에 유지 |
| FE-01~03 | 미사용 UI 3개·테스트에서만 사용한 모듈 11개·작동하지 않는 project-modules 설정 제거. 설정 안내를 실제 profile projection 경로로 수정 |
| FE-04 | 미사용 ApiService CRUD/basePath/client와 값 전달만 하던 51개 생성자 제거. 생성 operation 실행·multipart 경계 유지 |
| FE-05~06 | community query·필수 page 검증 및 관리자 pagination 변환 통합. 사용자 page 우선/관리자 pageIndex 우선 차이 유지 |
| FE-07~08 | 전량 API와 별도 tree query key로 조직도·부서 선택의 1,000건 상한 제거. 5개 SSR 초기화 통합, 정책 탭의 두 요청 및 부서 탭의 사용자 요청 제거 |
| FE-09 | DeptJob의 미사용 bound export 10개 제거 |
| FE-10 | 일괄 변경 모달의 선택 UI 추출. 동기 잠금·권한·명령 버튼은 Hub에 남겨 secondary action 검사 경계 77개를 유지 |
| TL-01·03·04 | 검사 대상 0개였던 JPA 도구와 퇴역/개인 보조 도구 등 정확히 9개 제거. 현행 ArchUnit·부하 테스트 진입점 유지 |
| TL-02 | 코드 census 측정 정의 v2: 운영·테스트·생성물 분리, 실제 client directive 구문 확인, 명시 snapshot 경로·버전 불일치 거부 |
| TL-05~08 | 시스템 schema 판정, lexer 기초 함수 4개, typed tuple 생성, 진단용 key digest를 각각 동일 의미 범위에서 공유 |
| TL-09 | ETL 위치 기반 long 배열을 이름 있는 read/transformed/written 카운터로 변경. commit/rollback·keymap/checkpoint 경계 유지 |

`winston`·`@types/winston`·`cmdk`는 삭제된 logger/command UI 외 소비자가 없어 package/lock에서 함께 제거했다. 소비자가 사라진 Compose의 `LOG_LEVEL` 전달도 제거했다. 아래 보안 패치 3종 외의 의존성 버전은 바꾸지 않았다. 대형 서비스·거버넌스 도구의 전면 분해, blanket Stream/catch/import 치환, 과거 Flyway 삭제는 조사 보고서의 제외 판단을 유지한다.

원격 CI의 의존성 감사가 차단한 권고 4건은 취약 버전 범위를 한정한 기존 override 방식으로 수정했다. 정책·예외를 바꾸지 않았으며 lockfile의 패키지 버전 차이는 다음 3종뿐이다.

| 전이 의존성 | 변경 | 근거 |
|---|---|---|
| seroval | 1.5.6 → 1.6.3 | [Promise 역직렬화 권고](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-p6vx-979v-rg4c), [TypedArray 메모리 권고](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-jp82-f5mq-hwhp) |
| source-map-js | 1.2.1 → 1.2.2 | [수정 릴리스](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2) |
| proxy-addr | 2.0.7 → 2.0.8 | [IP 신뢰 판정 권고](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h) |

Seroval은 Solid의 기존 `~1.5.4` 범위를 넘어가므로 실제 소비 경로의 공개 진입점으로 Solid SSR과 JSON 왕복을 실행해 호환성을 확인했다. 감사 정책은 차단 0건으로 통과했고, 비차단 권고 3건(개발 전용 high 1·moderate 2)은 남아 있다.

## 사용자 삭제와 활동 집계의 경합

원격 E2E의 권한 회수 검증은 통과했으나, 테스트 사용자 정리에서 C008/409가 발생했다. 해당 시각의 서버 제약 로그는 보존되지 않아 CI의 정확한 제약명은 확정하지 못했다. 조사 중 Hibernate의 PostgreSQL `PESSIMISTIC_WRITE`가 `FOR NO KEY UPDATE`를 사용하므로 활동 로그 정리 후 새 FK 행이 들어올 수 있음을 확인했다. 실제 PostgreSQL의 두 연결로 후행 활동 UPSERT 후 사용자 DELETE가 `23503`과 `fk_tb_user_log_tb_user_info`로 실패하는 경합을 재현했다.

삭제 경로에만 명시적 `FOR UPDATE`를 적용해 종속 정리 중 새 FK 참조를 차단한다. 기존 MFA·상태 변경용 잠금은 유지한다. L2 감사에서 백엔드 헌법 제1~3조의 계층·엔티티 경계, 제8조의 권한 재검증, 제9조의 트랜잭션 범위가 보존됨을 확인했다. 관리 전역 잠금→정렬된 사용자 잠금→종속 정리→삭제 순서도 유지한다. 운영 DB는 `information_schema`와 FK 정의를 읽기 전용으로 확인했으며 Entity·DDL·인가 정책은 변경하지 않았다.

## 날짜 입력 호환성

| 입력 | 도메인 update/resubmit | 결재 등록 service | 결재 목록 filter |
|---|---|---|---|
| null·빈 문자열 | 허용·원문 유지 | 오늘 yyyyMMdd | null |
| 공백만 | 거부 | 오늘 yyyyMMdd | null |
| 정상 yyyyMMdd | 허용·원문 유지 | 그대로 | 그대로 |
| 정상 yyyy-MM-dd | 허용·원문 유지 | yyyyMMdd | yyyyMMdd |
| 날짜 앞뒤 공백 | 거부 | 거부 | trim 후 검사 |
| 중복/어긋난 하이픈·0000년·없는 날짜·비ASCII 숫자 | 거부 | 거부 | 거부 |

중복 구분자와 0000년 거부는 의도적인 검증 강화다. DTO의 기존 `Ymd.OPTIONAL_PATTERN`은 바꾸지 않았다. live `information_schema`에서 req_ymd/memo_rpt_ymd가 nullable VARCHAR(8)임을 확인했다. 기존 Entity의 ISO 원문 호환과 DB 길이의 차이는 이번에 저장 계약 변경으로 확대하지 않았다. REQ_YMD의 연월일C8 표준을 조회했고 MEMO_RPT_YMD의 정확한 용어 행은 없었다.

## 검사 의미 보존

- 삭제된 소스에만 해당하는 예외·원장 행을 정리한다. 전량 부서 조회로 대체된 미사용 `getDeptList` 래퍼를 제거해 생성 API 경계는 377→376개(생성 354·특수 22), adoption 100%다. 페이징 HTTP API `getDepts`는 유지하고 기존 `superseded-surface` 분류로 실제 소비 중인 `getDeptTree`와 연결한다. 두 API는 같은 서비스의 paged/unpaged 조회이며, 화면 미도달 상한 28과 미연결 상한 10은 유지한다.
- 폼 census는 퇴역 검색 폼 1개만 감소한다. 일괄 상태/부서 변경은 원래 검사 경계를 유지한다.
- URL census는 생성기로 다시 만들고 기존 승인 선택을 유지한 채 evidence 해시를 재결속한다.
- 보안 예외 6건의 수·규칙·fingerprint·만료일은 그대로다. 두 설정의 필터·인가 본문을 대조한 후 소스 해시와 현재 행만 갱신했다. [보안 재검토](sast-findings-review.md)를 참조한다.
- 교차 도메인 원장은 퇴역 Schedule 메서드의 BaseSearchDto edge를 제거하고 추출한 assembler의 UserSearchDto edge를 기록한다. 기존 Service의 user 참조는 유지한다.
- 시크릿 검사는 모든 `.agent/scripts/*.js`를 계속 탐색한다. 퇴역한 비DB 도구 수에 의존하던 하한을 실제 DB 도구 두 개의 필수 포함 검사로 바꾼다. 무관한 파일로 숫자만 채워도 DB 도구 누락을 숨길 수 없게 한다.
- 문서·과거 결정의 퇴역 소스 링크는 기준 커밋의 실제 blob으로 연결한다. 과거 결정을 새 결정으로 덮어쓰지 않는다.

## 실행 검증

단계별 영향 검증과 통합 검증의 실제 실행 결과다. 격리 브라우저 검증에는 해당 실행 시점의 운영 소스와 일치하는 별도 작업 사본을 사용했다. 후속 미사용 부서 래퍼 정리와 보안 패치의 검증은 별도 행으로 기록한다.

| 범위 | 결과 |
|---|---|
| 첫 정비 Java compileJava/compileTestJava | 성공 |
| BE 미사용/조회 정리 영향 | core 114·app 86·API LoadTest 2·첨부 harness 5, 실패/skip 0 |
| FE 첫 정비 | 10파일 93테스트 통과 |
| 최종 FE 전체 테스트·커버리지 | 미사용 부서 래퍼 정리와 보안 패치 후 **450파일 4,266테스트 통과**, 실패/skip/todo 0. 문장 83.65%·분기 78.31%·함수 79.84%·행 85.80%; 기존 71/63/64/73 하한 유지 |
| 조직도·SSR·사용자 허브 | 7파일 59테스트 통과; 최종 footer는 아래 실제 브라우저 CRUD·계약 검사로 추가 검증 |
| FE 타입·lint | 앱/E2E tsc 통과, lint 0 error/기존 20 warning. 추가 접근성 계약 파일 lint 0 warning |
| 이관 discovery·typed identity·resume·verification·artifact | 영향 Gradle 테스트 성공 |
| 이관 partial-load·실제 자식 JVM 종료 후 재개 | PostgreSQL 통합 2종 성공 |
| Ymd·YmdRange | 영향 Gradle 테스트 성공 |
| 최종 Java compile·영향 테스트 | compileJava/compileTestJava 성공; core 156·app 298·API 25, 실패/skip 0 |
| 푸시 전 모듈 check | foundation·business-core·business-app `check` 성공. 전수 3,029개 중 3,028개 통과, 실패 0, 기존 비활성 `SchemaDumper.dumpCleanSchema` 1개 skip. foundation 클래스별 커버리지 검증 및 세 모듈 JaCoCo 보고서 생성 성공 |
| 푸시 전 잔여 소비자 정리 | Compose 환경변수 계약 18개, API 소비·생성 경계 계약 58개, 부서·배너·생성 경계·1,000건 초과 트리 영향 Vitest 4파일 64개 통과. 미사용 부서 래퍼의 공통 pagination·요청 설정 검증을 실제 소비 경로로 이관 |
| 보안 패치 후 빌드·감사 | 보안 패치 시점 소스를 격리 worktree에 동기화하고 frozen lockfile 설치·Next production build·bundle 검사 성공. JS gzip 2,045,506B / 2,250,000B(여유 9.1% 경고), CSS 30,887B / 40,000B. 의존성 감사 정책 및 실제 소비 경로의 Solid SSR·Seroval JSON 왕복 통과 |
| 사용자 삭제 경합 보강 | PostgreSQL 활동 집계·삭제 잠금 4개 및 사용자 서비스 5클래스 78개 통과, 실패/skip 0. 전체 Java compileJava·compileTestJava 성공. 실제 삭제 SQL을 약한 잠금으로 변이하면 후행 INSERT 차단 검사가 실패하고, 원복 후 4개 통과. 진단·변이 근거는 `build/reports/ci-e2e-audit-37463273064/`에 보존 |
| 실제 PostgreSQL 인가·스키마 | 통합 테스트 2개 통과. 고정 쿼리 수·응답 동등성·ABA·schema validation 확인 |
| 백엔드 전체 거버넌스 harness | 38클래스 137테스트 통과, 실패/skip 0. 시크릿 검사에는 도구 누락·합성 리터럴 red fixture 포함 |
| 생성 API·Zod·operation 계약 | 재생성 후 Git diff 없음 |
| 도달성·URL·생성 경계·문서·공용 메모리 계약 | 116개 통과 |
| 하네스 mirror·교차 도메인·거버넌스·Atlas 생성 계약 | 72개 통과. 원장 변경과 재사용 프로필 투영 대조 포함 |
| 폼 검사·정확 모집단 | 63개 통과; native 66·member 1·formless 22·secondary 77, 전체 166 |
| 실행 위반 주입 후 원복 | FE 정책 게이트 5개 red→24개 green. SQL 중복·사용자 중복 조회·noop 허용·날짜 형태 생략·JPA EAGER 5개 red→6개 green. 원본 바이트 해시 일치 |
| 공유 SSR 제목 계약 | 사용자·조직 5개 경로의 제목과 공통 fallback h1 연결 보존. h1→h2 변이 red, 복원 후 접근성 계약 19개 통과 |
| 격리 프로덕션 빌드·브라우저 | backend bootJar·Next build 성공. Playwright 9개 통과, skip/flaky 0. 사용자 CRUD·빈 상태·부서 트리/D&D 저장·조직 정책 등록/재조회 검증 |
| 프로덕션 bundle 예산 | JS gzip 2,046,645B / 2,250,000B, 최대 132,726B / 150,000B; CSS 30,887B / 40,000B; font preload 0B. JS 합계 여유 9.0% 경고 유지, 예산 변경 없음 |
| SAST 정책·예외·CI 연결 | 17개 통과; 새 전체 CodeQL 실행은 아님 |
| census·민감 console 계약 | 10개 통과, 운영/테스트 모집단 혼합 및 이동된 SSR console 위반을 주입해 exit 1 확인 후 복원 |

전체 FE 검사 중 발견된 두 불일치는 검사 범위를 유지하며 해소했다. 공유 컴포넌트로 이동한 fallback 제목은 5개 route의 정확한 제목 전달과 공통 h1을 함께 검사하도록 고쳤다. 결과 문서 갱신에 따른 Atlas 해시 차이는 생성기로 재생성했다. 이후 고정된 소스에서 전체 테스트와 커버리지가 통과했다.

로컬 증거는 `build/reports/source-simplification-vitest-security.json`(최종 전수), `build/reports/source-simplification-vitest-final.json`(첫 전수), `build/reports/source-simplification-red-proof/20261006-182115/`, 각 모듈의 Gradle 테스트 보고서에 있다. 빌드 산출물은 저장소 정본에 추가하지 않았다.

## 측정·검증의 경계

기준 커밋을 임시 디렉터리로 추출하여 현재 `code-census.mjs` v2를 양쪽에 적용했다. 생성 Java 1개와 생성 TS 5개, 테스트·지원 코드를 분리한 동일 정의 비교다. 파일명에 generated가 들어 있어도 수작성 transport 2개는 운영 소스에 포함한다.

| 지표 | 정비 전 | 정비 후 | 변화 |
|---|---:|---:|---:|
| 운영 Java LOC | 75,435 | 75,233 | -202 |
| 운영 TS/TSX LOC | 93,960 | 92,261 | -1,699 |
| 운영 합계 LOC | 169,395 | 167,494 | **-1,901** |
| FE 운영 파일 | 627 | 618 | -9 |
| FE 중복 8줄 윈도우 | 194 | 147 | -47 |
| BE 운영 중복 8줄 윈도우 | 187 | 176 | -11 |

600줄 초과 운영 파일은 FE 22개·BE 10개로 동일하다. client directive 파일 LOC는 64,770→64,455줄로 줄었지만 비율은 68.9→69.9%다. 운영 분모 감소에 따른 비율 변화이며 번들 크기나 런타임 비용의 측정이 아니다. 중복 창은 겹칠 수 있으므로 중복 LOC로 환산하지 않는다.

재측정은 `node scripts/code-census.mjs --baseline <새-json-경로>`와 `--diff <동일-정의-json>`으로 한다. 기존 파일 덮어쓰기와 정의가 다른 snapshot 비교는 거부한다.

로컬 브라우저는 후속 미사용 래퍼 정리·보안 패치·삭제 잠금 보강 전의 소스를 별도 검증 worktree로 복사하고 임시 PostgreSQL·새 보안 키로 구동한 결과다. 후속 보안 패치의 빌드에는 같은 worktree에 갱신한 소스·잠금 파일을 사용했다. 해당 worktree는 요청에 따라 커밋 보존 여부 확인 후 등록을 제거했다. 실행 증거는 본 저장소의 `build/reports/source-simplification-verification-worktree-20261006/isolated-e2e/a0993f42d4a6cf004f637ca5`로 복사하고 파일 해시 일치를 확인했다. 임시 DB와 테스트 서비스는 정상 정리됐고, 기존 환경 파일과 실행 중인 서비스는 변경하지 않았다.

새 버전의 이관 도구는 실행 fingerprint가 달라지므로 기존 plan 승인을 재사용하지 않고 정상 plan/validate 승인 절차를 다시 거쳐야 한다. 운영 부하·지연 시간·원격 required CI는 이 로컬 작업에서 완료했다고 간주하지 않는다.
