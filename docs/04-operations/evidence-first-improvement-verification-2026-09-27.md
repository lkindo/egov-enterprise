# 근거 기반 개선 루프 검증 — 2026-09-27

**상태: 승인된 로컬 개선과 범위별 검증 완료.** R1·R2·R5·R6의 표적 회귀, R7의 실제 제목 검증, R8의 DB 오류·migration 감시를 확인했다. R0의 실제 core/multi-module 산출물은 전체 기술 검증을 통과했다. R3의 동일 이미지 신규 기동·DB/첨부 복원과 R9의 두 이미지 scan/SBOM도 통과했으며 HIGH·CRITICAL은 0건이다. 선택 범위 PIT는 1.25.9·STRICT 75로 통과했다. R7은 번들 감소를 확인했지만 로그인 점수·LCP 개선은 입증하지 못했다. 새 정책·운영 적용·외부 발행은 아래 경계대로 남는다.

이 문서는 [적대적 재평가](adversarial-reassessment-2026-09-27.md)와 [개선 루프 프롬프트](../03-guides/evidence-first-improvement-loop-prompt.md)의 후속 실행 기록이다. 정책 선택은 [결정 제안](evidence-first-policy-decisions-2026-09-27.md)에 남아 있다. 새 종합 점수나 도메인 점수를 산출하지 않는다.

## 입력과 증거의 경계

- 기준 HEAD는 `0ef8af32f`이고 검증 대상은 그 위의 미커밋 작업 트리다. 모든 결과가 하나의 커밋·이미지 digest를 검증한 것은 아니다. 격리 실행별 입력 manifest와 변경 내역으로 범위를 구분한다.
- 기존 사용자 변경 `frontend/next-env.d.ts`는 보존했다. 원본 SHA256은 `b8b3a344484b959af5e4e3fc1a1609dac3cb9ece0cdeb6c145be29bc4c491000`이며, Next가 격리 복사본에서 자동으로 바꾼 내용은 별도 기록했다.
- 운영 DB에는 진단용 읽기만 수행했다. PostgreSQL 통합 회귀와 브라우저 데이터 생성·삭제는 소유한 임시 테스트 DB에서 실행했다. 테스트용 생성·삭제를 운영 데이터 정리나 새 제품 정책으로 확대하지 않는다.
- `build/review-loop/checkpoint.json`은 재개 힌트다. stale 상태를 실행 증거로 사용하지 않는다. `green`이라는 로그 파일명, Gradle 명령의 시작, 테스트 파일 존재도 통과 증거가 아니다.
- 실패한 준비·컴파일·fixture 실행과 의도한 반례 실패를 구분한다. 예를 들어 H2의 `TO_DATE` 부재, PostgreSQL CHECK가 금지한 fixture 값, annotation processor 생성물 중복은 제품 결함을 재현한 red로 세지 않았다.
- 무거운 검증은 직렬로 수행했다. 좁은 ESLint 완료를 기다리기 전에 R6 후속 E2E를 시작한 순서 오류는 보고했고, 해당 lint가 exit 0인 것을 확인했다. 성능 측정 중 다른 빌드·Node 검사를 실행하지 않았다.

## R0–R9 판정표

각 행의 **확인**은 적힌 로컬 범위에만 적용한다. 승인 대기와 외부 증거 대기는 로컬 green으로 닫지 않는다.

| 항목 | 구현·검증에서 확인한 범위 | 현재 판정과 남은 경계 |
|---|---|---|
| R0 산출물·권리 경계 | 기존 소스 복사기에서 제한 스킬 `docx/pdf/pptx/xlsx` 4종을 제외했다. 원본 186파일은 보존했고 실제 fixture의 유입 red와 제외 후 green을 확인했다. 최종 core/multi-module artifact는 DB 적용·재적용·소스 생성·컴파일, harness 131/131, schemaValidation 40/40, frontend 타입·lint·build를 통과했다. | **core 산출물의 전체 기술 검증 확인.** `localDevelopmentBuild: true`이며 기관 환경 승인·런타임 시나리오 완료를 뜻하지 않는다. 다른 profile/layout의 전수 검증으로 확대하지 않는다. 라이선스 부여, 원본 자격의 소유자 폐기·회전, 원본 삭제·이력 제거는 미실행·별도 승인 대상이다. |
| R1 메일·refresh·인증 오류 | 타인 메일 본문을 검색 결과·건수로 추론하는 경계를 수정했다. 최초 JWT·DB·쿠키의 만료와 회전 시 기존 JWT/저장 만료의 상한을 맞췄다. 인프라 오류를 잘못된 자격의 401로 바꾸던 경로를 분리했다. 서명 JWT·쿠키·실제 PostgreSQL 회전 경합 회귀를 수행했다. | **표적 로컬 회귀 확인.** 같은 초의 동일 회전 토큰을 허용한 기존 결정은 유지했다. 초기 mock 누락 실패와 수정 후 통과를 구분하며, 운영 세션 수명·폐기 적용을 실측한 결과는 아니다. |
| R2 수신자·담당자 무결성 | 없는·비활성 사용자를 새 수신자·담당자로 배정하는 요청을 차단하고, 허용된 기존 담당자를 유지한 수정과 구분했다. PostgreSQL의 소유자 조합·원자성 회귀 14건과 격리 우회 변형의 의도한 실패를 기록했다. | **표적 로컬 회귀 확인.** 기존 고아 행 보정은 미실행이다. 계정 비활성화와 배정의 모든 동시성 경계를 새로 직렬화했다고 주장하지 않는다. 산출물 투영의 최종 조합은 R0와 함께 확인한다. |
| R3 릴리스·운영 형상 | URL·환경 preflight, 게시 없는 검증 경로, 완전한 image digest 쌍 소비, 실제 OpenAPI·전용 harness 검증을 확인했다. 고정한 미커밋 입력으로 두 이미지를 빌드하고 격리 prod HTTP와 별도 빈 DB·첨부 볼륨 복원을 실행했다. | **동일 이미지 신규 기동·복원 확인.** 83개 테이블 행 수와 첨부 내용을 대조했고 복원 뒤 HTTP도 통과했다. 다섯 선행 실패와 수정을 아래에 보존했다. 소유 자원 정리는 완료했다. 과거 버전 업그레이드·TLS 브라우저·SMTP·운영 배포·외부 게시는 미실행이다. |
| R4 권한·공개 정책 | 기존 브라우저 토큰 비공개 원칙에 따라 BFF 인증 별칭의 실제 Next HTTP 74검사를 통과했다. 후속 prod smoke에서는 직접 Spring·edge 각각의 인코딩 변형 3개를 신규·복원 환경에서 확인했다. 총 12회 모두 정상 제어 요청 뒤 400·토큰 비노출이었다. | **기존 승인 이행만 확인.** 주소록 연락처, 고권한 reset, 공지·투표 권한, 행사 승인 의미, 평가자 공개 방식의 새 선택은 미승인이다. 선택한 변형 검증을 모든 인코딩 조합의 증거로 확대하지 않는다. |
| R5 탐색·표시·집계 | 메뉴 임의 깊이·즐겨찾기·최근 방문의 표적 UI 회귀, 메뉴 순환·쓰기·시작 동기화의 단위/실제 PostgreSQL 회귀, 일정·FAQ 다음 페이지와 일정 안정 정렬을 검증했다. 허용된 메모보고 page ID의 표시명 일괄 조회, 알림 날짜, 성공 로그인 집계, minute 연결 수·로그 탭의 의미를 보완했다. | **표적 로컬 회귀 확인.** 표시명 조회는 권한 확인 후 허용된 ID만 조회하며 포트 경계를 유지했다. 실제 성공 로그인 집계는 실패·미상 결과를 제외한다. 전 사용자 경로의 브라우저 완주나 실제 운영 지표의 정확도를 전수 인증한 것은 아니다. |
| R6 설문 기간·선택 답변 | 일반 등록·수정의 기간 입력을 기존 DTO 계약에 연결했다. 관리자 목록·단건에 선택명을 일괄 보강하되 설문·문항 소속을 확인하고 기존 자유·기타 답변 우선순위를 보존했다. 실제 PostgreSQL의 복수 문항 조회·중복 제거·소속 검사는 정상 5/5와 격리 변형 3개의 의도한 assertion 실패로 확인했다. | **실제 DB·두 문항 브라우저 흐름 확인.** 서로 다른 두 문항의 선택 ID만 제출한 뒤 관리자 목록·각 상세의 선택명을 확인했다. 이 설문 흐름 1 + 인증 준비 2는 **3/3 통과**, skip/flaky 0이다. 이전 단일 문항 실행과 합산하지 않는다. 무기한 허용·권한·DTO shape를 유지했고 제출 전체 취소로 바꾸는 D 결정은 적용하지 않았다. |
| R7 제목·로그인 성능 | 페이지 목적 metadata와 가장 좁은 서버 layout을 보강했다. 기존 제목 게이트의 공통 제목 오통과 반례와 실제 브라우저 제목·링크·뒤로가기·redirect를 확인했다. 생성기의 PURE IIFE를 실제 빌드·12개 고유 Lighthouse 보고서로 비교했다. | **제목 관련 브라우저 테스트 11/11 확인, 번들 감소 확인.** 로그인 점수·LCP 개선과 전체 접근성 준수는 미입증이다. 모든 route의 목적 적합성·동적 상세 제목·수동 접근성을 전수 검증한 것은 아니다. |
| R8 DB 오류·migration | 실제 PostgreSQL 대표 오류를 HTTP 의미로 분류하고, 과거 versioned migration 변조와 새 파일 추가를 구분하는 기존 감시를 보완했다. 오류 단위 46건, 당시 PostgreSQL 11건·이력 20건·Flyway 배선 5건의 통과 기록이 있다. 후속 공용 읽기·migration 변경 관측 검사는 격리 정상본 32/32 통과, 캐시 재사용 변형은 정확히 2개 assertion에서 실패했다. | **해당 표적 회귀 확인.** 마지막 공용 읽기 수정 이후 실제 core 산출물의 전체 기술 검증도 통과했다. 로컬 기본 timeout 0과 bridge 세션 3초 관측을 운영값으로 일반화하지 않는다. 운영 timeout 적용은 D 대기다. |
| R9 검증·공급망 | PIT 1.25.9의 Provider·Filter·core·app 선택 실행은 모두 STRICT 75·exit 0이며 후처리 fixture 10건도 기대 판정과 일치했다. 실제 취약 이미지의 기본 이미지·불필요한 npm을 수정했고 새 두 이미지의 scan/SBOM·archive 결속 검증을 통과했다. | **선택 범위 PIT와 실제 두 이미지 HIGH·CRITICAL 0 확인.** 선행 scanner 실패와 기존 취약점은 아래에 기록했다. CI 전체 10 scope의 실행 결과는 아니며 생존·미커버 변이와 core timeout 1건은 남아 있다. `RUN_ERROR`·`TIMED_OUT`을 killed로 세거나 단일 소스 변형을 PIT 100%로 표현하지 않는다. |

관련 구현·회귀의 정본은 [메일 서비스 검사](../../business-app/src/test/java/nuri/business/service/mail/MailServiceTest.java), [회전 경합 검사](../../api-server/src/test/java/nuri/api/schema/RefreshTokenRotationConcurrencyIntegrationTest.java), [수신자·담당자 PostgreSQL 검사](../../api-server/src/test/java/nuri/api/schema/AssignmentRecipientIntegrityIntegrationTest.java), [표시명 읽기 포트](../../foundation/src/main/java/nuri/foundation/core/user/UserDisplayNameLookup.java), [설문 서비스 검사](../../business-app/src/test/java/nuri/business/service/survey/SurveyResultServiceTest.java), [실제 설문 E2E](../../frontend/e2e/journeys/public-navigation.spec.ts)에 있다. 파일 존재 자체와 실행 통과는 별개이며, 실행 기록은 뒤의 원장에서 찾는다.

## R6 실제 PostgreSQL 조회·소속 검증

기존 [설문 PostgreSQL 통합 검사](../../api-server/src/test/java/nuri/api/schema/SurveySubmissionConcurrencyIntegrationTest.java)를 확장해 실제 Testcontainers PostgreSQL에서 실행했다. 정상본 5건은 기존 동시성 2건과 새 조회·표시 3건이며 모두 통과했다. 각 격리 변형은 별도의 전체 module buildDirectory·Gradle project cache를 사용했고 build/configuration cache를 사용하지 않았다. 네 실행 모두 컴파일과 실제 DB 기동을 거쳤으며 errors/skip은 0이다.

| 사례 | 실행 결과 | 검출한 의미 |
|---|---|---|
| `normal` | 5/5 통과, exit 0, 1분 53초 | 두 문항의 응답 8행은 유지하고 선택 ID 4개만 중복 제거한다. 항목 SELECT는 1회이며 페이지 조회·선택적 count를 포함한 서비스 호출 SQL은 최대 3회다. |
| `per-row` | 1건 중 assertion 실패 1, exit 1, 1분 39초 | 항목을 개별 조회하는 변형에서 실제 SQL 6회가 허용 상한 3회를 넘어 실패했다. |
| `wrong-ownership` | 1건 중 assertion 실패 1, exit 1, 1분 44초 | 소속 검사를 제거하자 다른 문항·다른 설문의 선택명이 예상한 null 대신 노출되어 실패했다. |
| `duplicate-binds` | 1건 중 assertion 실패 1, exit 1, 1분 41초 | 중복 제거를 없애자 항목 조회의 bind slot이 예상 4개 대신 8개여서 실패했다. |

기존 Hibernate ThreadLocal `StatementInspector`는 fixture 준비가 끝난 뒤 실제 서비스 호출만 계측한다. 자유서술·기타 답만 있거나 결과가 비면 항목 SELECT는 0회, 전체 조회는 최대 2회다. 최소 1회도 요구해 관측기 미연결의 0회 통과를 막는다. bind slot 개수는 현재 PostgreSQL/Hibernate의 SQL 형태를 검증한 결과이며 다른 DB·ORM이나 운영 지연으로 일반화하지 않는다.

근거는 `build/review-loop/r6-survey-query-7eaa65bbc606/{manifest,results}.json`과 각 사례의 `run.log`·XML이다. 준비 manifest의 `executed: false`는 준비 당시 값이며 완료 판정은 후속 `results.json`·실제 XML·로그에 따른다. 네 XML hash가 results와 일치했고 결속된 입력 14개도 그대로였다. 생산 서비스 SHA256 `57ffaa8dc85950e86ba05f35942c81a92a2a5b99daa81669cd1577443db1259f`는 바뀌지 않았고, 확장한 테스트 SHA256은 `b651e1a8470dc05f050a5a92b2cded2d6113782f9999b12d06b0e55d8b7dc900`이다. `results.json` SHA256은 `a1e6c2efe9f7425238f24a26718cc78538ce7f5c54d9dbb03400e7aa18d245ec`다. 세 red는 컴파일·인프라 실패가 아니라 의도한 assertion 실패이며, 전체 실행 wrapper는 exit 0으로 완료했다.

## R6·R7 브라우저 결과

기존 [격리 E2E 실행기](../../scripts/run-isolated-e2e.mjs)를 사용해 매번 소유한 PostgreSQL·API·생산 frontend를 기동했다. 입력은 작업 트리의 일반 복사본이며 프로필 투영이 아니다. 운영 `.env`·Git 메타데이터·기존 의존성·빌드 결과를 복사하지 않았다. 두 선택자 수정 실행은 spec 변경만 동기화했고, 마지막 두 문항 실행은 확장 spec과 Windows 환경 변수 보존을 반영한 실행기를 사용했다. 이 절의 `E2E_TEMP`는 **`%LOCALAPPDATA%/Temp/egov-r7-e2e-YJxSHl`**이며, 그 아래 manifest·결과 경로를 루트 저장소의 `build/`와 혼동하지 않는다.

| 소유 실행 ID | 선택 | 결과 | 해석 |
|---|---|---|---|
| `44bc92d89bdfce38b316f718` | route accessibility + login accessibility + public navigation, 인증 준비 포함 | 15 통과 / 1 실패, skip 0 / flaky 0 | R7의 login 3 + route 8이 모두 통과했다. 인증 준비 2와 기존 public 2도 통과했다. 새 설문 흐름은 `getByLabel('템플릿')`이 실제 select와 숨은 tabpanel에 동시에 일치해 제출 전에 실패했다. |
| `0e06a2164d454f78ceaa09f4` | 실패한 설문 1 + 인증 준비 2 | 2 통과 / 1 실패, skip 0 / flaky 0 | 정확한 combobox 역할로 첫 실패를 해결했다. 기간 등록·수정·재진입·제출·관리 API 선택명 검사는 통과했고, 응답 행의 `has` 내부에서 다시 `main`을 찾는 잘못된 상대 범위 때문에 목록 UI 검사가 실패했다. |
| `b77a3849953777225bc9fe9d` | 단일 문항 설문 흐름 1 + 인증 준비 2 | **3 통과 / 0 실패**, skip 0 / flaky 0, 15.348초 | 행 내부의 상세 링크로 범위를 바로잡은 뒤 관리자 목록의 선택명과 실제 상세 링크 진입 후 선택명 표시까지 통과했다. 두 문항 제출 결과는 아니다. |
| `770f37d850fc52a5a0d085c5` | 두 문항 설문 흐름 1 + 인증 준비 2 | **3 통과 / 0 실패**, skip 0 / flaky 0, 18.058초, 실행기 exit 0 | 기간 저장·수정·재진입을 유지하면서 서로 다른 문항·선택 ID만 한 번에 제출하고, 서로 다른 두 응답의 관리자 목록·상세 선택명을 각각 확인했다. |

두 실패 모두 DOM snapshot·trace·API·백엔드 로그를 대조했다. 첫 실행의 설문 관련 HTTP 7건, 두 번째의 33건은 모두 200이었고 실제 ERROR level은 0건이었다. `.first()`, `force`, skip, assertion 삭제로 통과시키지 않았다. 첫 실패는 중복 accessible label, 두 번째는 `has`의 상대 탐색 범위로 서로 다른 원인이다. 두 trace와 화면 자료는 다음 실행이 덮어쓰기 전에 별도 보존했다.

위 단일 문항 실행의 테스트 변경은 세 select의 정확한 `combobox` 역할과 응답 행에 대한 상대 링크 탐색이다. 기간·답변·API·UI assertion은 유지했다. 당시 원본과 격리 사본의 spec SHA256은 `33781efb77d20c490bd00ab41754f4657be3dc8920c8cdf806ae394b8811c70a`로 같았고, 그 입력의 E2E 전용 타입 검사·단일 spec lint·diff 검사는 통과했다.

**두 문항 브라우저 검증도 실제로 통과했다.** 실행 시작은 2026-09-28 00:11:56.859 KST(2026-09-27 15:11:56.859 UTC)다. spec SHA256은 `fc00e09baa30f9e054333bc46cc764e442459c749295c29eef87e66b58939ca4`이며 원본과 격리본이 같다. 이전 spec만 동기화한 manifest를 보존한 뒤, 실행기의 `PROGRAMFILES`·`PROGRAMW6432` 보존 변경을 별도 delta로 기록했다. 루트가 입력 3,236파일·fingerprint와 E2E 타입·표적 lint 통과를 확인하고 실행했다.

실제 입력 manifest는 `E2E_TEMP/build/review-loop/r6-multi-question-runner-followup-input.json`이며 SHA256은 `4b6afa799673b3c5daa22d0d856cc4e52099eff893e0470b190489f876415681`다. 전체 입력 hash는 `5efbd17b34ddf4e1a4d345bc28593de5edbd5d3555879cdc1082aacc328e5299`다. 결과는 `E2E_TEMP/build/isolated-e2e/770f37d850fc52a5a0d085c5/results.json`이며 SHA256 `524f12b6fb5fe40a96deee273d88e4e93657e8988fb70483da3e73c488af71ad`와 실제 setup 2 + full-suite 1의 passed 결과를 대조했다. 실행·소스 대조·정리 기록은 `E2E_TEMP/build/review-loop/r6-multi-question-followup-execution.json`에 있다. 준비 manifest의 미실행 표시는 원문 그대로 두고 이 후속 결과로 완료를 판정한다.

실행 후 소유 경로 프로세스 0, 해당 run label의 컨테이너 0, 임시 runtime manifest 제거를 확인했다. 기존 입력 manifest·단일 문항 결과와 원본 `next-env.d.ts` WIP를 보존했다. 설문 서비스·DTO·관련 화면 등 이번 과업의 제품 소스는 현재 루트와 동일하지만 다른 거버넌스·PIT·문서 변경은 이 격리본에 섞지 않았다. 따라서 이 결과는 **현재 관련 설문 기능의 검증이며 최종 전체 작업 트리의 전수 검증은 아니다.**

R7은 [로그인 접근성 검사](../../frontend/e2e/quality/login-accessibility.spec.ts)와 [route 접근성 검사](../../frontend/e2e/quality/route-accessibility.spec.ts)의 기존 인증·H1·axe 조건을 유지한 결과다. 실제 로그인 `/auth/me`의 401 확인, 대표 제목, 관리자 링크 이동→뒤로가기→레거시 redirect, 클라이언트 쪽지함의 서버 layout 제목을 확인했다. 수동 접근성·전체 WCAG 판정은 포함하지 않는다. 서로 다른 입력의 위 실행들을 하나의 16/16 실행으로 합산하지 않는다.

재현 선택은 다음과 같다. 운영 `.env`가 없는 별도 소유 복사본에서 실행하고, 실행기는 자체 임시 DB와 자원을 정리한다.

```powershell
node scripts/run-isolated-e2e.mjs -- --project=full-suite e2e/quality/route-accessibility.spec.ts e2e/quality/login-accessibility.spec.ts e2e/journeys/public-navigation.spec.ts

# R6 마지막 표적 재검증: 기존 인증 준비 프로젝트는 유지한다.
node scripts/run-isolated-e2e.mjs -- --project=full-suite e2e/journeys/public-navigation.spec.ts --grep '설문 생성·참여·선택답 확인'
```

## R7 Lighthouse 비교와 효과 한계

같은 OS Temp·의존성·브라우저·기본 Turbopack 빌더에서 baseline과 생성 코드 PURE IIFE 변경을 비교했다. 두 arm 모두 기존 `pnpm run build` 후 `pnpm run lighthouse` 3회와 `pnpm run lighthouse:desktop` 3회를 실행했다. 원래 LHCI 설정·임계값·filesystem 저장을 유지했으며 webpack으로 바꾸지 않았다.

측정 환경은 Windows 11, i7-1355U, 약 32GB RAM, Node 22.17.1, pnpm 9.15.0, Next 16.3.5, LHCI 0.15.1, Lighthouse 12.6.1, Chrome 154.0.8037.57이다. 각 arm의 입력 manifest를 보존했다. baseline 후 관련 없는 E2E 파일이 바뀌었지만 variant에는 섞지 않았다. 동기화한 제품 의미 변경은 `generated-zod.ts`·`generated-operations.ts`이고, 타입 선언 개행 정규화와 fixture `next-env.d.ts` 입력 복원은 별도 delta다.

| 지표 | Baseline | PURE IIFE | 판정 |
|---|---:|---:|---|
| JS 전송량, 모든 run | 476,232B | 471,537B | **4,695B / 0.99% 감소** |
| JS 압축 해제 후 크기, 모든 run | 1,908,415B | 1,796,204B | **112,211B / 5.88% 감소** |
| 생성 계약 포함 청크 전송량 | 129,740B | 125,050B | 실제 요청된 청크의 감소 |
| 같은 청크 압축 해제 후 크기 | 880,204B | 768,005B | `/api/v1/` 문자열 324개는 여전히 포함 |
| 폰트 전송량 | 2,140,761B | 2,140,761B | 변경 없음 |
| Mobile 점수 중앙값 [범위] | 47 [46–48] | 47 [45–49] | 개선 미입증 |
| Mobile simulated LCP 중앙값 [범위] | 15,324.5 [15,323.0–15,333.3]ms | 15,328.0 [15,320.0–15,330.8]ms | 개선 미입증 |
| Mobile TBT 중앙값 [범위] | 1,600 [1,265–1,866]ms | 1,404 [1,327–1,889]ms | 범위 중첩; 확정적 지연 개선 주장 안 함 |
| Desktop 점수 중앙값 [범위] | 69 [69–73] | 73 [66–75] | 범위 중첩·시작 이상치; 속도 개선 주장 안 함 |
| Desktop simulated LCP 중앙값 [범위] | 2,581.0 [2,517.2–2,583.9]ms | 2,586.9 [2,580.9–3,196.7]ms | 개선 미입증 |

모든 12개 고유 보고서에서 `/login`은 200, 사용하지 않는 loopback backend로 향한 `/api/v1/auth/me`는 **500**, console error는 1건, 외부 origin 요청은 0건, Lighthouse runtimeError는 없었다. 이는 backend가 없는 익명 frontend 비교다. 정상 백엔드의 401이나 운영 성능 증거와 혼동하지 않는다. 정상 401은 앞의 별도 격리 E2E에서 검증했다.

Variant desktop은 server-ready 대기 경고와 첫 run의 observed TTFB 16,834ms·observed LCP 17,992ms를 포함한다. 관측한 listener는 mobile 종료 후 생성됐고 종료 때 제거됐지만, 전체 부모 PID 계보와 ready 경고의 정확한 원인은 입증하지 못했다. 이 이상치를 버리거나 desktop 점수 상승만 성과로 고르지 않았다. simulated LCP와 observed LCP도 같은 값으로 취급하지 않는다.

보관 폴더의 `*.report.json`은 단계별로 3/6/9/12개가 누적되고 각 단계의 raw LHR 3개가 별도로 있다. 폴더 전체 glob으로 평균을 내지 않았다. 원래 각 upload manifest의 참조를 사용했으며, 이후 **기록된 phase 시간 범위 + `configSettings.formFactor` + 대상 URL**로 모든 LHR을 다시 분류했다. 같은 fetchTime·mode·URL의 parsed JSON hash를 대조해 중복을 제거했고 선택 12개가 일치했다. 점수나 목표 개수로 선별하지 않았다.

PURE 생성기는 미사용 schema/operation 초기화 제거를 허용하되 실제 사용 schema의 strict·lazy·refine·요청/응답 검증을 유지한다. 잘못된 정규식은 생성 단계에서 거부한다. 기존 생성 계약의 red→13/13 green, 소비자 9파일 88검사, 생성물 재생성 동등성·타입·census·실제 생산 빌드를 확인했다. 이 작은 번들 감소를 채택하며 큰 폰트 전송량과 넓은 초기 계약 청크는 잔여 개선 후보로 남긴다. 폰트 원본·라이선스·로딩 정책은 바꾸지 않았다.

## R8 migration 변경 관측과 공용 읽기

앞선 core 산출물 `verified-core-d05bbcaca1408b09`의 전체 검증에서 `ZeroDowntimeMigrationLinterTest`의 직접 `Files.readString` 호출 2곳이 공용 source index 계약을 위반했다. 단순히 캐시된 읽기로 치환하면 같은 작업 트리에서 이전 검사 뒤 발생한 migration 변경을 놓칠 수 있으므로, 공용 `HarnessSourceIndex.readFresh`가 현재 파일을 다시 읽고 기존 스냅샷은 유지하는 경로로 수정했다.

`build/review-loop/r8-source-freshness-062b70f58c13`의 `results.json`·`manifest.json`과 `normal/run.log`·`mutant/run.log`를 대조했다. 정상본은 `HarnessSourceAccessContractTest` **5/5**, `ZeroDowntimeMigrationLinterTest` **27/27**, 합계 **32/32·exit 0**이다. 변형본은 격리 복사본의 `readFresh`만 캐시된 `read`로 연결했고, `sourceIndexFreshReadsObserveChangesWithoutReplacingSnapshots`와 `migrationHistoryObservesWorktreeChangesAfterPreviousCheck`가 각각 assertion에서 실패했다. 결과는 **2 tests / 2 failures / 0 errors·exit 1**이며 준비·컴파일 오류를 red로 센 것이 아니다.

두 실행은 모듈별 build directory와 project cache를 분리하고 Gradle build/configuration cache를 끈 상태였다. 각 실행의 입력 6개 SHA256이 유지됐고 원본 소스도 바뀌지 않았다. `manifest.json`의 `preparedOnly: true`는 준비 당시 기록이며, 실행 완료 판정은 `executed: true`, `sourceUnchanged: true`와 실제 XML 집계를 담은 `results.json`을 따른다. 이 표적 정상·변형 검증을 최종 전체 core artifact 통과로 확대하지 않는다.

## R9 최종 PIT 결과와 비교 경계

PIT 엔진 1.25.9에서 아래 선택 범위를 실행했다. 모두 `STRICT_MUTATION=true`에 따른 임계값 75와 후처리를 통과하고 exit 0으로 끝났다. 집계는 각 실행의 `mutations.xml` status를 기준으로 하며, 대상 class·test glob·로그·XML SHA256을 결과 manifest와 대조했다. 이는 **선택한 표적 실행이며 CI의 전체 10 scope 통과가 아니다.**

| 선택 범위 | Generated | KILLED | SURVIVED | NO_COVERAGE | RUN_ERROR | TIMED_OUT | 실행 시간 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Foundation `JwtTokenProvider` / `JwtTokenProviderTest` | 54 | 51 | 1 | 2 | 0 | 0 | 17초 |
| Foundation `JwtAuthenticationFilter` / `JwtAuthenticationFilterTest` | 10 | 9 | 1 | 0 | 0 | 0 | 10초 |
| Core 인증·인가·메뉴·부서업무 / `nuri.business.*` | 799 | 703 | 59 | 36 | 0 | 1 | 3분 40초 |
| App `MailService`·`NoteService`·`SurveyResultService` / `nuri.business.*` | 248 | 220 | 15 | 13 | 0 | 0 | 2분 25초 |

Provider·core·app의 정확한 target 문자열과 실행 명령은 `build/review-loop/run-final-pit.ps1`, 결과는 `build/review-loop/pit-1.25.9-final/results.json`에 있다. 후속 Filter는 같은 디렉터리의 `foundation-filter.json`에 target·test·exit와 XML hash를 기록했다. 이전 Foundation 64개는 Provider 54 + Filter 10이었다. 이번 분리 실행을 엔진 변경으로 변이 모집단이 줄었다고 해석하지 않는다. 최종 두 Foundation 결과의 합은 이전과 같은 64개·60 killed·2 survived·2 no-coverage다.

Core는 이전과 같은 799개 변이 식별자·소스행을 비교했다. 6개의 SURVIVED→KILLED는 담당자 소유권·메뉴 권한·프로그램 존재 검사에 추가한 테스트의 효과다. `Grant.compareTo`의 return-0 변이는 엔진 보완 후 RUN_ERROR→KILLED가 됐다. 나머지 timeout 1개는 이전과 같은 `AuthorizationAdministrationService.normalizeNavigationGrants`의 `invalid` 호출 제거 변이다. PIT 콘솔의 `Killed 704`와 달리 XML은 **KILLED 703 + TIMED_OUT 1**이므로 둘을 분리해 기록한다.

App도 변이 식별자·소스행 248개는 같지만 test glob을 `nuri.business.*`로 넓혔다. 기존 KILLED 192개는 유지됐고 미커버 22개와 생존 6개가 추가 검출됐으며, 미커버 1개는 생존으로 바뀌었다. 검출 증가를 엔진만 바꾼 효과나 제품 로직 개선으로 주장하지 않는다. 남은 생존·미커버 변이는 임계값 통과와 별개로 후속 검토 대상이다.

결과 후처리는 실제 Gradle hook과 동일한 fixture에서 10개 사례를 실행했다. 정상·TIMED_OUT은 성공, RUN_ERROR·누락·stale·malformed·잘못된 root·빈 XML·DTD·이전 실제 RUN_ERROR XML은 실패해 모두 기대 판정과 일치했다. 근거는 `build/review-loop/pit-result-check-fixture-e7ba53e00334/results.json`과 사례별 로그다. 바깥 wrapper는 hang 후 종료했으므로 wrapper 전체 exit 0이라고 기록하지 않는다. 개별 10사례의 결과와 wrapper 종료 상태를 구분한다.

원본 XML과 이전 결과 비교는 `build/review-loop/pit-1.25.9-final/review.md`에 있다. 이 비교 문서는 Filter 후속 실행 전 작성되어 해당 10개를 후속 대상으로 적었으며, 최종 상태는 `foundation-filter.json`·XML·로그로 보완했다. 원본 XML SHA256은 다음과 같다.

| XML | SHA256 |
|---|---|
| `foundation-jwt.xml` | `0c82b8e7a38f19aa2842686dacc73e448fbf7101237ad4bc40f58710f67ec557` |
| `foundation-filter.xml` | `43975728bf8a7088de4516ff19247c54fbe57d41826b6cf9541bb2adcbcfa19e` |
| `core-auth-dept.xml` | `45603f9d43f17c53683b73e81bd08278541513ea7dadc216d2e5a78c6dc49020` |
| `app-critical.xml` | `2fcc7f7f571a9e609b5bd4cf4f92b2f4ee3880dd69d9f6f18032866c54bd2cce` |

## 최종 실행 결과

아래 결과는 실제 실행 자료와 통합자 재검증에 따른다. 항목별 입력·한계를 유지하며 전체 원격 CI나 운영 승인으로 확대하지 않는다.

| 영역 | 최종 기록 | 증거와 경계 |
|---|---|---|
| R0 실제 artifact / 전체 base verify | **core/multi-module 전체 기술 검증 통과·exit 0.** `verified-core-232fcfae866df522`는 현재 versioned SQL 112개 적용·생성 SQL의 두 번째 빈 DB 재적용·소스 생성·전체 컴파일을 통과했다. harness **131/131(38 XML)**, schemaValidation **40/40(12 XML)**이며 failures/errors/skipped 모두 0이다. frontend `tsc --noEmit`·lint·생산 build도 통과했다. | 아래 실행 locator와 파일별 SHA256을 따른다. `environmentApproved: false`, `runtimeScenariosExecuted: false`를 유지한다. 통합자가 소유 PG label `232fcfae866df522`의 잔여 0을 확인했다. |
| R3 Docker / prod smoke / restore | **두 이미지 build·prod smoke·DB/첨부 복원 통과**, exit 0. 새 image ID 쌍과 동일 입력으로 196.465초 실행했다. | `.agent/temp/egov-release-smoke-WKDZQE/result.json`, 아래 신규·복원 검증 절. 과거 버전 데이터 업그레이드·TLS·SMTP는 미검증이다. |
| R9 Trivy / SBOM | **verify·scan 통과**, exit 0. 새 API·frontend 모두 HIGH·CRITICAL 0이며 실제 archive/report/SBOM hash를 재검증했다. | 새 증거 디렉터리의 `release-scan-evidence.json`·`root-scan-verification.json`. Trivy/DB 버전·시각과 패키지 수는 아래 기록을 따른다. |
| 최종 작업 트리 통합 범위 | 항목별 실제 격리 실행·현재 diff와 생성물 검증을 결합한다. 단일 최종 커밋의 전수 실행이나 원격 required CI 성공을 주장하지 않는다. | 결과 문서와 그 내용을 포함하는 Atlas는 이미지 검증 뒤 최종 갱신한다. 이미지에 넣은 입력과 최종 문서 갱신의 차이는 아래에 기록한다. |

R0의 앞선 실행은 stale URL census에서 중단됐고, 다음 산출물에서는 고아 `UserDisplayNameLookupService`와 fresh Git 이력 판정 문제가 검출됐다. 이어진 `verified-core-d05bbcaca1408b09`는 고아 서비스·ZDM 검사에는 통과했지만 harness 129건 중 1건이 직접 I/O 2곳을 검출했다. 이 실패는 `build/review-loop-r0-core-full-verification.log`에 보존했다. R8 표적 수정·검증 뒤 새 산출물 `verified-core-232fcfae866df522`로 전체 경로를 다시 실행해 통과했으며, 이전 실행의 통과 건수를 합산하지 않았다.

최종 로그는 `build/review-loop-r0-core-final-verification.log`다. `build/reports/reusable-base/core.json`은 이제 2026-09-27 실행의 `passed`와 새 artifact 경로를 기록하며, 이전 2026-09-22 결과를 가리키지 않는다. 산출물 루트는 `build/reusable-base/source/verified-core-232fcfae866df522`이고 내부 `build/reports/reusable-base/full.json` 및 `api-server/build/test-results/{harnessTest,schemaValidationTest}`의 XML을 직접 대조했다. 실행 경로는 소유 DB 생성·재적용 → 소스 생성 → 기존 full verifier의 거버넌스·계약 → `compileJava compileTestJava :api-server:harnessTest :api-server:schemaValidationTest` → frontend 타입·lint·build다.

다음은 각각 **파일 원본 바이트의 SHA256**이며 전체 DB bundle이나 전체 소스 트리의 해시가 아니다.

| 파일 | SHA256 |
|---|---|
| `build/reusable-base/verified-core-232fcfae866df522-db/profile-lock.json` | `1a2da92d846393a6830cae755e63c8a9833d1403a69f7acfb4da14fa98c37381` |
| artifact 루트의 `reusable-base-lock.json` | `025a28d50852c4cd59ad274a5ef0bf3525dec4b5fec173d37ff0227808833a33` |
| artifact 내부 `build/reports/reusable-base/full.json` | `40b4b583bb79495783382b8ce2278a7e569f7a07436c82a73f2ac49b6d84d2fb` |

### R3·R9 실제 이미지 입력과 중단 경계

앞선 이미지 증거 디렉터리는 `build/review-loop-release-r3c-4f026767507a431d9c51ec0e00cac07f`다. `local-image-evidence.json`과 `build-input-files.json`을 직접 대조했으며, 둘 다 기준 revision `0ef8af32ff64a0ae0beeb0772a33319f9e87c27a`, `dirty: true`, 생산 빌드 입력 fingerprint `d1051e69027a9227c3984ea5a0220adfd3163440ac738999778c6ddf7b3a10e0`를 기록한다. 후자의 입력 목록은 파일별 경로·SHA256 **1,830개**다. 이는 미커밋 입력을 구분하는 증거이며 깨끗한 main 커밋의 빌드라는 뜻이 아니다. 취약점을 수정한 최종 이미지 쌍은 다음 절에서 구분한다.

| 실제 로컬 빌드 | Image ID |
|---|---|
| API | `sha256:12a068f3ef207644a01fabd870c0be42d6c2ef0ab42fe2a3830ff59ec4c8305d` |
| frontend | `sha256:74261bd111d4ea859b1feeffe553d08049c0e27912f8507b1ad7b864858d646d` |

위 값은 Docker의 **로컬 image ID**이며 게시된 registry manifest digest가 아니다. 빌드 당시 `publicationApproved: false`, `smokeExecuted: false`, `scanExecuted: false`는 준비 시점 기록이다. 이후 시도의 결과는 별도 실행 자료를 따르며, 이미지 생성만으로 smoke·scan 완료를 판정하지 않는다.

| Smoke 시도 | 확인한 중단 원인 | 최소 수정과 확인 범위 |
|---|---|---|
| 1회 | 폐쇄 환경에서 Windows `ProgramFiles`·`ProgramW6432`가 빠져 Docker Compose plugin 탐색이 exit 125로 실패했다. | 두 OS 탐색 변수만 보존했다. 기존 환경 계약의 red→1/1 green과 실제 `docker compose version` 재확인을 기록했다. 임의 앱·DB·프록시 환경 상속은 허용하지 않았다. |
| 2회 | Compose의 선택적 null 환경변수가 Docker `Config.Env`에 값 없는 키 22개·중복 0개로 남았는데, 검사기가 이를 잘못 거부했다. bootstrap 시작 전 중단됐다. | 값 없는 키를 unset으로 해석하고 누락과 구분해 처리했다. 중복·잘못된 키 및 null 사양에 실제 값·빈 문자열을 배정한 경우의 거부를 유지했다. 준비 실패와 회귀 red를 거쳐 관련 21/21 green을 확인했다. `cleanup-second-smoke.json`은 소유 자원 정리 완료를 기록한다. |
| 3회 | bootstrap 종료 뒤 생성한 DB 이름의 두 번째 밑줄과 기존 격리 DB 이름 규칙의 불일치를 소스·설정에서 확인했다. 당시 JVM 예외 원문은 보존하지 못했다. | 생성기를 기존 규칙에 맞추고 앱의 운영·격리 가드는 유지했다. 후속 bootstrap·schema barrier의 실제 통과가 원인 판단을 보강한다. |
| 4회 | `internal: true` bridge에서 API의 요청한 loopback port binding은 있었지만, 실행 중 `NetworkSettings.Ports['8080/tcp']`가 빈 배열이었다. HTTP 검사에 필요한 host port가 실제 할당되지 않았다. | 빈 binding을 성공으로 허용하지 않는다. 내부 네트워크와 host ports 없음 조건을 유지하고, 소유 frontend 컨테이너의 Node HTTP 검사가 `edge/api:8080`만 호출하도록 전환했다. 당시 로컬 관련 계약 53/53은 통과했으며 실제 smoke·backup/restore는 후속 실행으로 확인했다. |
| 5회 | bootstrap·prod API는 통과했으나 frontend의 `wget localhost:3000/` healthcheck가 연결 실패했다. 같은 컨테이너에서 `wget 127.0.0.1:3000/login`은 exit 0이었다. | 기본 Compose와 같은 이미지를 소비하는 UI baseline 런처의 검사 주소만 IPv4 `/login`으로 수정했다. 각 시간·재시도 설정은 유지했다. 통합자가 frontend 계약 26/26, baseline 런처 계약 24/24와 해당 run의 컨테이너·network·volume 잔여 0을 확인했다. 별도 baseline 런처 전체 실행 결과는 아니다. |

4회 run `c5a30c55680a0bd9097e9fa7`의 `cleanup-fourth-smoke.json`은 `bootstrapBarrier: passed`, 원인 `internal-network-host-port-unassigned`, `cleanup: complete`를 기록한다. 5회 run은 `19f41da27bd78bb5f3c4697f`다. bootstrap 통과를 prod HTTP·복원 통과로 확대하지 않는다. 내부 HTTP 전환에서도 실제 edge 경유, 정확한 Host/Origin과 smoke 전용 CORS, cross-origin 403, raw encoded path와 Secure 쿠키 검사를 유지한다. FE 컨테이너는 API의 신뢰 프록시 주소이므로 직접 API 호출 결과는 비브라우저 TokenResponse 계약 확인에 한정하며 외부 비신뢰 피어의 XFF 차단 증거로 쓰지 않는다.

내부 HTTP 전환의 통합자 실행 결과는 **53/53 통과·9.296초**이며 `build/review-loop-r3-internal-transport-contracts.log`에 있다. 직접 Spring API의 정상 로그인→refresh→세션 대조와 encoded path 검사를 추가한 후에는 **55/55 통과·6.360초**였고 `build/review-loop-r3-direct-api-contracts.log`에 기록했다. 이 수치는 각 시점의 로컬 Node 계약 범위이며 실제 prod smoke 결과와 구분한다.

첫 실제 scan의 `local-scan-execution.json`은 **verify passed / scan failed**다. 고정 Trivy 0.74.0에서 `image --include-dev-deps`가 unknown flag로 거부되는 실제 CLI red를 확인했고, 첫 실패에는 취약점 report·SBOM 완료 증거가 없다. 공식 [v0.74.0 명령 구현](https://github.com/aquasecurity/trivy/blob/v0.74.0/pkg/commands/app.go#L243-L244)은 `image`에서 이 옵션을 비활성화한다. [같은 버전의 이미지 분석 구현](https://github.com/aquasecurity/trivy/blob/v0.74.0/pkg/commands/artifact/run.go#L189-L191)은 lockfile 분석을 끄고, [Node 패키지 설명](https://github.com/aquasecurity/trivy/blob/v0.74.0/docs/guide/coverage/language/nodejs.md#L83-L91)은 이미지 안의 설치된 `node_modules/package.json`을 분석한다고 명시한다. 따라서 옵션 하나의 제거는 이미지에 설치된 개발 패키지를 추가 제외하는 변경이 아니다. 지원 분석기로 식별되는 설치 패키지를 검사한다는 범위를 유지하며 모든 패키지의 100% 탐지를 주장하지 않는다.

`--pkg-types os,library`, `--list-all-pkgs`, `HIGH,CRITICAL`, `--exit-code 1`, 외부 config·ignorefile 미사용은 유지했다. 통합자가 실행한 기존 Node 표적 1건 red→1건 green의 증거는 `build/review-loop-r9-trivy-flag-{red,green}.log`다.

두 번째 `scan-attempt-2/local-scan-execution.json`도 **verify passed / scan failed**이며 실행은 exit 1로 종료했다. report는 생성되지 않았고 캐시의 `trivy.db`는 **1,446,756,352바이트**, `trivy-java.db`는 **0바이트**였다. 같은 pinned scanner·API archive·캐시·`/tmp` 1GiB 조건으로 한 번 재현한 `build/review-loop/trivy-second-diagnostic-3cee9df5aab81ac366d73ac0.json`은 `stageHint: java-db`, `signals: [no-space]`, `exitCode: 1`, report 없음과 실행 전후 같은 캐시 크기를 기록한다. 원문 stdout/stderr는 저장하지 않았다. 진단 JSON의 `cleanupVerified: false`는 작성 시점 상태이고, 통합자가 이후 정확한 소유 label의 잔여 컨테이너 0개를 읽기 전용으로 확인했다.

통합자의 읽기 전용 실측에서 캐시를 둔 파일시스템의 가용량은 **278,124,008KiB**, Java DB OCI 압축 layer는 **973,426,852바이트**였다. 대상은 `mirror.gcr.io/aquasec/trivy-java-db:1`, layer digest는 `sha256:75d3ac93f17d38f845b20fdb181bed7e2645f6a67adddb3189ddca4f38920989`다. 공식 [v0.74.0 OCI 다운로드 구현](https://github.com/aquasecurity/trivy/blob/v0.74.0/pkg/oci/artifact.go#L208-L228)은 임시 파일에 압축 layer를 받은 뒤 캐시에 풀며, [Java DB 갱신 구현](https://github.com/aquasecurity/trivy/blob/v0.74.0/pkg/javadb/client.go#L93-L103)이 이 경로를 사용한다. 이 관측을 근거로 스캐너의 임시 공간 한도만 **1GiB→4GiB**로 조정했다. read-only root, cap-drop, no-new-privileges, noexec·nosuid, 입력 readonly와 기존 취약점 실패 기준은 유지했다. 기존 표적 계약 **1/1 통과**의 위치는 `build/review-loop-r9-trivy-scratch-contract.log`다.

세 번째 실제 scan은 API에서 **HIGH 12건·CRITICAL 0건으로 exit 1**이 됐다. Java DB는 1,537,712,128바이트로 내려받았으며 앞선 공간 부족 단계는 통과했다. Alpine 3.23.5의 OpenSSL 계열 3건, libexpat 5건, p11-kit 계열 2건, sqlite-libs 2건이고 Java 247개 패키지에서 HIGH/CRITICAL은 없었다. API report SHA256은 `e5967843887c3df872f7153d545a55f7e9e821d1097d9ecfb10cdd135a550ee8`다. API 실패로 표준 pair scan은 frontend·SBOM까지 진행하지 않았다.

같은 고정 스캐너·기존 frontend archive·성공한 DB 캐시로 별도 진단을 실행해 **CRITICAL 1건·HIGH 12건, exit 1**을 확인했다. `scan-attempt-3/release-scan/output/frontend-diagnostic.vuln.json`은 Alpine 3.24.1의 libcrypto3/libssl3 2건과 `/usr/local/lib/node_modules/npm/` 아래 Node 패키지 11건을 기록한다. 진단 결과를 완전한 pair scan receipt로 사용하지 않았다.

두 이미지의 Java/Node 주 버전과 Alpine 가지를 유지하면서 공식 registry에서 확인한 새 digest로 고정했다. frontend는 `node server.js`로 실행하므로 최종 runner에서만 npm 디렉터리와 npm/npx 링크 세 경로를 제거했다. 빌드 단계·앱 lockfile·취약점 기준·예외 목록은 유지했다. [Node 22.23.3 릴리스](https://nodejs.org/en/blog/release/v22.23.3)의 OpenSSL 갱신만으로 npm의 모든 발견이 해소되는 것은 아니므로 새 이미지의 실제 scan으로 확인한다.

별도로 Docker 29의 OCI index ID와 Trivy의 config ID가 다름을 실제 archive에서 확인했다. `release-images.mjs`는 추출 없이 제한된 tar 입력을 읽고 index→유일한 실행 platform manifest→config/layer의 SHA256·size 및 Docker manifest의 선택을 검증한다. Trivy의 config ID·계층 순서를 그 결과와 대조하고, receipt와 publish 전 검증은 원래 빌드 ID와 archive hash까지 결속한다. 기존 classic Docker archive도 config hash와 실제 순서의 layer hash를 확인한다. 변조·다중 platform·중복·경로 탈출·링크 반례를 포함한 통합자 계약 **36/36**과 기존 실제 API/frontend archive 두 개의 report 대응 검사가 통과했다. 실제 pair scan 성공은 별도로 기록한다.

### 수정한 이미지 쌍의 실제 scan

새 증거 디렉터리는 `build/review-loop-release-r3c-48e46f1846f549f0828b2b8f1ad3994b`다. API·frontend build는 모두 exit 0이며, 기준 revision은 동일하고 `dirty: true`다. `build-input-files.json`의 1,830개 파일과 생산 입력 fingerprint `bb94b5eee014e1333a9cefe36a1cdc9abe2c1cd362ff8beba0f84233fa16a136`를 빌드 전후 대조했다.

| 새 로컬 이미지 | Docker image ID | 실제 검사 결과 |
|---|---|---|
| API | `sha256:7335ab75c797bcbaf25e59448c1cba0b1919b2c0cace8d67fff63338e20297f5` | Alpine 3.23.6 OS 73개 + Java 247개 패키지, **HIGH 0·CRITICAL 0**. SBOM component 321개. |
| frontend | `sha256:717b976ba10bf60b5771ccef719434d09c58601dbb3e2864305d7b8169355301` | Alpine 3.24.2 OS 18개 + Node 59개 패키지, **HIGH 0·CRITICAL 0**. SBOM component 78개. |

실제 `verify`와 `scan`은 모두 통과했고 실행기는 exit 0이다. API report 생성은 2026-09-27 15:39:43 UTC, frontend는 15:40:21 UTC이며 한국 시각으로 2026-09-28 00:39:43·00:40:21이다. Trivy 0.74.0, VulnerabilityDB v2의 갱신 시각은 2026-09-27 13:06:25 UTC, JavaDB v1은 01:08:08 UTC다. 판정은 이 스캐너·DB·해당 이미지의 범위이며 모든 취약점이나 이후 새 공지가 없다는 뜻은 아니다.

`release-scan-evidence.json` SHA256은 `714e5a8b336dfa8e0ce6e08dfa7b3d0304f10a96adadfad1c76e483b083ea2c7`다. 통합자가 이 receipt를 `verifyReleaseScanEvidence`로 다시 읽어 실제 archive·report·SBOM의 hash와 config ID·계층 순서를 검증했다. `root-scan-verification.json`에는 report/SBOM/archive 각각의 SHA256, 스캔 시각·DB 버전·패키지 수를 기록했다. 이 실행에는 publish 단계가 없고, 위 ID는 여전히 로컬 이미지 식별자다.

### 동일 이미지의 신규·복원 검증

run `ed64190b29de0ebe4c0644d3`는 위 새 image ID 쌍으로 **exit 0·196.465초**에 완료됐다. 결과는 `.agent/temp/egov-release-smoke-WKDZQE/result.json`이며 SHA256은 `5018bc9d2f8d6d3c5867d95db39552c018c54427b1aeb773302721c06610cf0c`다. 통합자가 결과의 source fingerprint·image ID를 build/scan 입력과 대조하고 소유 label의 컨테이너·network·volume 잔여가 각각 0임을 확인했다.

기존 migration과 명시적인 일회용 인가 cutover로 신규 DB를 준비한 뒤 prod 프로필의 실제 API·frontend·edge를 기동했다. 로그인·토큰 본문 비노출·access/refresh 양쪽 쿠키 보호 속성·세션·다른 Origin 거부·management 경로 404·첨부 저장/다운로드·schema barrier를 확인했다. 보호 속성이 없는 refresh 쿠키와 management 500을 성공으로 오인하던 검사도 기존 조건에서 red를 확인한 뒤 강화했다. 통합자의 최종 release/smoke Node 계약은 **38/38**, frontend Docker 계약은 **26/26**, baseline 런처 계약은 **24/24**다.

직접 API와 edge 각각에서 `/api/v1/auth/%2572eissue`, `/api/v1/%2561uth/login`, `/api/v1/auth/%ZZreissue`를 정상 로그인·refresh 대조 뒤 전송했다. 신규·복원 환경을 합한 **12회 모두 400**, 원래 경로 보존, 토큰 비노출이었다. 직접 API는 각 probe 직전 `/me` 200도 확인했다. 이는 세 변형에 대한 런타임 증거이며 구 토큰 재사용 차단이나 모든 인코딩 조합의 증거로 확대하지 않는다.

서비스를 중지한 뒤 DB dump와 첨부 archive를 만들고 별도 빈 DB·볼륨에 복원했다. **83개 테이블의 이름별 행 수**를 서비스 재시작 전에 비교했으며, 재기동 후 같은 HTTP 검사와 기존 첨부 ID의 내용 hash를 확인했다. DB/첨부 backup hash와 table-count hash는 결과 JSON에 있다. 이는 **같은 이미지의 복원**이다. 과거 버전의 데이터 업그레이드, 실제 TLS 브라우저, SMTP 전달, 운영 복구·운영 승인 결과가 아니다.

결과 보고서와 이를 반영하는 Atlas는 이 이미지 검증 뒤 최종 갱신한다. 따라서 문서 갱신분이 이미 검증한 이미지 안에도 들어 있다고 주장하지 않는다. 새 증거 디렉터리의 `final-input-delta.json`은 빌드 당시 1,830개 생산 입력과 최종 파일의 차이를 기록하며, 차이가 생성된 `frontend/public/governance_harness_atlas.html`에만 한정되는지 확인한다. 그 생성물은 별도의 Atlas·HTML 계약으로 검증한다.

## 승인 대기·외부 증거·범위 밖

**승인 대기(D):** 권리자가 정할 라이선스와 제한 자산 원본 제거·이력 처리, 자격 소유자의 회전/폐기, R4의 새 공개·권한·행사·평가자 정책, R6의 삭제/제출 취소 단위, 운영 timeout·권한 배정·기존 데이터 보정, 운영 배포·외부 발행이다. 새 정책의 A/B 선택지를 구현 지시로 간주하지 않았다. 상세 선택지는 [결정 제안](evidence-first-policy-decisions-2026-09-27.md)을 따른다.

**외부 증거 대기:** 원본 자격의 현재 유효성·폐기 확인, 실제 기관 인프라·운영 DB 적용값, 권한이 있는 외부 API 소비자 전환, 원격 required CI·릴리스 게시·운영 복구·수동 접근성 검토다. 이번 로컬 테스트로 완료했다고 하지 않는다. R3의 버리는 운영 형상 실험도 실제 운영 배포의 대체는 아니다.

**반박·범위 밖:** 서비스 인가가 전혀 없다는 주장, 평가자가 저장되지 않는다는 주장, 템플릿 소비자가 전혀 없다는 주장을 해결 과제로 재도입하지 않았다. 비PostgreSQL migration COMMIT 제한 해제, SMS 공급자 실발송 추가, ISG 공개 화면·공개 약관 개방, MFA 토글 복원, 다중 노드 즉시 알림·누적 첨부 quota 등은 제품 요구·기관 연동·승인 없이 추가하지 않았다. 메모리의 대량 이동이나 점수 상승을 위한 baseline 완화도 하지 않았다.

## 실행 근거 위치와 재검토 방법

정본 소스·테스트는 저장소에 있고 원시 실행 자료는 ignored 로컬 증거다. 아래 위치는 이 실행을 검토하기 위한 locator이며 새 clone에서 존재한다고 가정하지 않는다. 공개 문서에 토큰·쿠키·요청 본문·개인정보를 복사하지 않았다.

| 증거 | 위치·읽는 방법 |
|---|---|
| R1·R2 | `build/review-loop-r1-red.log`, `review-loop-r1-rotation-red.log`, `review-loop-r2-integration-green.log`, `review-loop-r2-projection-{red,green}.log`. R1 초기 혼합 실행의 AuthService mock 실패는 이후 해당 class가 포함된 실제 성공 실행과 구분한다. |
| R3·R4 | `build/review-loop-release-openapi-harness-root.log`, `review-loop-r3-root-node.log`, `review-loop-r3c-root-contracts.log`, `review-loop-auth-http-root.log`. 기본 Gradle test에서 governance tag가 제외된 실행을 harness 통과로 세지 않는다. |
| R5·R8 | `build/review-loop-menu-startup-{unit,pg}-green.log`, `review-loop-r5-menu-startup-negative.log`, `review-loop-r5-name-lookup-negative.log`, `review-loop-r8-r5-confirm.log` 및 각 실행의 대상 XML. 전체 실패 로그에서 일부 통과만 추려 전체 성공으로 표현하지 않는다. |
| R7 생성 계약 | `build/review-loop-r7-{codegen-root,runtime-root,types-root,census-root}.log`, `review-loop-r7-codegen-reproduction.json`. 생성물 자체의 diff와 재생성 전후 동일성을 구분한다. |
| LH 원본·입력 | `%LOCALAPPDATA%/Temp/egov-r7-runtime-a6lpCn/build/review-loop`. baseline 원본과 `baseline-next`, `pure-iife-variant`를 보존했다. `pure-iife-variant/phase-report-selection.{json,md}`에 선택 12파일명·byte SHA256·fetchTime·mode·phase 창·중복/제외 사유, `comparison.json`에 각 run 지표가 있다. |
| E2E 입력·결과 | [R6·R7 브라우저 결과](#r6r7-브라우저-결과)의 `E2E_TEMP` 아래 최신 두 문항 입력 `build/review-loop/r6-multi-question-runner-followup-input.json`, 실행 `build/review-loop/r6-multi-question-followup-execution.json`, `build/isolated-e2e/770f37d850fc52a5a0d085c5/{inventory,results}.json`·`playwright.log`를 대조한다. 소유 Temp locator는 `build/review-loop/r7-fresh-e2e-copy.json`이며, 이전 실패 trace는 `first-run-test-results`·`second-run-test-results`에 보존했다. |
| R9 PIT 최종 자료 | `build/review-loop/pit-1.25.9-final/{results.json,foundation-filter.json,review.md}`와 4개 XML·로그, `build/review-loop/pit-result-check-fixture-e7ba53e00334/results.json`과 개별 사례 로그. 최종 PIT 절의 선택 범위·비교 경계를 따른다. |
| R0·이미지 최종 자료 | 위 [최종 실행 결과](#최종-실행-결과) 절의 실행 locator와 입력 hash를 따른다. 새 이미지 디렉터리의 `local-scan-execution.json`, `release-scan-evidence.json`, `root-scan-verification.json`, `final-input-delta.json`과 실제 smoke 결과를 함께 읽는다. 임시 checkpoint로 대체하지 않는다. |

최종 문서·메모리·baseline mirror·Atlas의 실행 로그는 `build/review-loop-final-static-contracts.log`, frontend Atlas 계약은 `build/review-loop-final-atlas-contract.log`, diff 검사는 `build/review-loop-final-diff-check.log`에 둔다. 문서 검사가 통과해도 위 승인·외부 증거 대기가 해소되는 것은 아니다.

### 2026-09-28 통합 계약 정합

정상 pre-push에서 드러난 산출물·검사 메타데이터 누락을 보완한다. 독립 이관 산출물에는 `adoption-execute.mjs`가 직접 참조하는 `release-images.mjs`를 포함하고, 정상 import와 의존성 누락 차단을 함께 검사한다. SAST는 기존 방어 조건을 다시 검토해 변경된 소스 해시만 갱신하며, 예외 대상·규칙·유효기간은 늘리지 않는다. 연결된 하네스 매니페스트는 실제 Java 하네스 산출값으로 재생성한다.

메일 본문 검색의 수동 인가 검사는 `getSentMailList`의 3인자 메서드를 선택한다. 본문 검색의 발신자 `loginId` 제한과 나머지 목록 조회 범위를 `REACHABILITY_WITH_PRIVACY`로 기록하며 기존 실행 정책은 바꾸지 않는다. 수동 guard도 기존 인자 수 기반 메서드 선택기를 사용하고, 잘못된 인자 수·같은 인자 수의 중복 선언·guard 삭제·권한 우회가 차단되는 반례를 검사한다. 실제 `SecurityAuthAnnotationLinterTest` 7/7 및 생성 권한 계약 5개 검증이 통과했다. 같은 실행에서 별도 baseline 검사는 예상한 registry·검사 소스 해시 두 줄의 불일치를 차단했고, 실제 산출값 반영 뒤 mirror·문서·공용 메모리 계약 25/25가 통과했다. 로그는 `build/review-loop/delivery-auth-harness.log`, `delivery-final-static.log`다. 실행 경로는 기존 `harnessTest`와 required backend CI를 유지한다.

통계 census와 E2E의 접근 이름은 실제 성공 로그인 집계의 제목과 일치시킨다. 차트·원본 표·집계 근거의 필수 단언은 유지한다. 통계 관련 6/6 및 E2E 타입 검사를 통과했고, 옛 제목 주입 시 지정된 단언 1건이 실패한 후 원본을 복구했다. 증거는 `build/review-loop/stats-contract-green.log`, `stats-contract-title-mutant-red.log`, `stats-pom-types.log`다. 이 정합 보완을 이전 이미지·복원 실행의 입력에 소급해 포함하지 않는다.
