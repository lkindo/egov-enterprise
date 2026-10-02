# eGov Enterprise 개선 구현·검증 근거

검증일: 2026-10-02. 작업 기준은 `b91157ade9e752de0855c4662129656a25cf1ae5`이며, 변경은 별도 워킹트리 `D:\project\egov-enterprise-codex-improvements`, 발행 브랜치 `codex/enterprise-improvements-20261002-publish`에 있다. 원래 공유 워킹트리에는 소스·빌드·테스트를 쓰지 않았다. 사용자는 성능 목표 미달 보고를 받은 뒤 현재 변경분의 커밋·푸시·main 병합 진행을 명시적으로 지시했다. required CI 확인 뒤 병합하며, 병합 완료 작업 브랜치 정리도 기존 요청 범위다. 운영 DB 쓰기·실제 SMS 발송은 별도 승인 대상이다.

이 문서는 로컬 구현과 격리 실행의 증거를 묶는다. 운영 승인, 공급자 계정·전달 확인, 사용자 수동 접근성·실사용 검증은 별도의 조건이다. `build/goal-evidence`와 `build/isolated-e2e`의 실행 자료는 로컬 산출물이며 저장소에 비밀이나 원시 세션 로그를 추가하지 않는다.

## 구현과 사용자 영향

| 우선순위 | 문제와 변경 | 구현 | 검증 | 남은 외부 조건 |
|---|---|---|---|---|
| 1 주소록 | 부모 행 잠금과 부모·구성원 스냅샷의 해시 토큰으로 순차 stale 저장과 동시 저장을 모두 거부한다. 누락·변경 토큰은 409이며 화면은 입력 보존, 최신 확인, 변경 비교·재적용을 제공한다. 구성원 미전달은 보존, 명시적 빈 목록은 삭제이며 소유권·공개 범위·사용 여부를 유지한다. | 완료 | PostgreSQL 12건, 백엔드/API·생성물·프론트 표적 검증 완료 | 최종 운영 배포·실사용 |
| 1 설문 | 제출·문항·선택지·공개 변경·삭제가 같은 설문 부모 잠금을 먼저 획득한다. 응답 이후 의미 변경 제한, 중복·기간·소속·전체 제출 취소 정책을 유지한다. | 완료 | PostgreSQL 별도 트랜잭션 26건, 양쪽 선행 순서·서비스 회귀 완료 | 최종 운영 배포 |
| 2 서비스 인가 | 행사·포상·도움말·배너·팝업·로그인 정책·템플릿의 24개 쓰기에 실제 기능 권한을 적용한다. 공개 조회·본인 조회·내부 실행은 기존 의미를 유지한다. 컨트롤러 우회 취약점으로 과장하지 않는다. | 완료 | 직접 서비스 허용·거부, 실제 필터/서비스 HTTP 141건, 인가 하네스 완료 | 운영 권한 배정·배포 |
| 3 SMS | Naver SENS 공식 계약의 고정 HTTPS 어댑터를 환경변수로 선택한다. 접수 202는 P, 상관 결과 조회의 최종 전달은 S/F이다. 발송 전 claim 커밋, 외부 POST 한 번, DB 재시도 분리와 CAS로 중복·상태 부활을 막는다. 불확실한 POST를 자동 재전송하지 않는다. | 완료 | 최종 XML 기준 SMS 처리·공급자 모의 HTTP 143건, 실제 PostgreSQL/Spring proxy 9건 완료 | 계정·유료 계약·자격증명·승인된 운영 전달 검증 |
| 4 관측 | 비활성, 최초 성공 이전 실패·미실행, 재기동 이후 무결성 이력과 영속 FAILED·오래된 due 작업을 구분한다. 원시 ID·개인정보 label 없이 캐시된 영속 상태를 관측한다. | 완료 | 스케줄러 8건·영속 PG 13건, 고정 promtool의 9개 규칙·12개 시계열 그룹 완료 | 실제 운영 Prometheus 배포·알림 수신 확인 |
| 4 복구 | 실제 v0.1.0 소스·88개 원본 SQL·원본 Dockerfile의 이미지를 고정한다. 구 버전 데이터·첨부·암호화·권한을 백업하고 최신 업그레이드와 같은 백업의 구 버전 복원을 별도 DB에서 검증한다. | 완료 | 격리 실행 완료; 84개 테이블·940개 컬럼·220개 제약, 데이터·첨부·권한 API 비교 | 운영 규모·스토리지 실측, 운영 RTO/RPO 승인·실제 복구 |
| 5 업무 화면·성능 미완료 | 보고 삭제의 모든 실패를 권한 오류로 표시하던 경로를 상태별 안내로 수정했다. 일정의 동일 부서 공유 목록·상세 계약을 일치시키며 비소유자의 변경 권한은 유지한다. 제어형 모달의 Escape 포커스 복귀를 복구했다. | 해당 변경 완료 | 서비스 일정 39건(직접 접근 25건 포함), 인가 하네스 7건·업무함/관측 표적 17건·모달 회귀 확인. 인증 브라우저 비교는 아래 실행 자료로 판정한다. | 수동 보조 기술·실사용·운영 배포 |

## 실행 증거와 의도적 위반

| 범위 | 실행 명령 또는 경로 | 실제 결과 | red 증거 |
|---|---|---|---|
| 주소록 PG | `./gradlew :api-server:schemaValidationTest --tests '*AddressBookSnapshotConcurrencyIntegrationTest' --no-parallel --max-workers=2` | 12/12, skip 0 | `build/goal-evidence/red/addressbook-postgresql-token-removed.xml` |
| 설문 PG | `./gradlew :api-server:schemaValidationTest --tests '*SurveySubmissionConcurrencyIntegrationTest' --no-parallel --max-workers=2` | 26/26, skip 0 | `build/goal-evidence/red/survey-baseline.xml` |
| 인가 | 직접 각 서비스 테스트, `RbacAuthorizationMatrixTest`·`RbacDemoSurfaceAuthorizationMatrixTest`, 기존 인가 하네스 | HTTP 141/141; guard 24개, 기존 정책 의미 유지 | `build/goal-evidence/red/event-service-guard.xml`에서 가드 제거 시 거부 사례 실패 |
| SMS | `./gradlew :business-app:test --tests '*Sms*' --tests '*DispatchRetryBoundaryIntegrationTest' :api-server:test --tests '*NaverSensSmsSenderTest' compileJava compileTestJava --no-parallel --max-workers=2` | 최종 XML business-app 61 + API 82, skip 0 | `build/goal-evidence/red/sms-http-408.xml` |
| SMS PG | `./gradlew :api-server:schemaValidationTest --tests '*SmsDeliveryStateIntegrationTest' --no-parallel --max-workers=2` | 9/9 실제 프록시·claim 커밋·CAS·고장 행 격리 | 동시 POST 횟수·터미널 상태 불변·실패 트랜잭션 검사 |
| 관측 | 기존 observability Node 계약, `npm run verify:alerts`, AttachmentIntegritySchedulerTest·DurableWorkIntegrationTest | promtool 규칙/시간 흐름 및 8/13 JVM 테스트 통과 | `build/goal-evidence/red/prometheus-failed-backlog.txt`, 경보 발생 임계 훼손 시 실제 promtool exit 1 |
| 구 버전 복구 | 기존 `scripts/run-isolated-release-smoke.mjs`의 historical 경로; 정확한 재실행 명령은 [복구 런북](backup-and-restore-runbook.md) | `build/goal-evidence/green/historical-upgrade-rollback.json` | 컬럼 default 검사 제거는 `build/goal-evidence/red/rollback-column-default-omitted.txt`에서 red |
| 일정 | `./gradlew :business-app:test --tests '*Schedule*' compileJava compileTestJava --no-parallel --max-workers=2`; 후속 `:api-server:harnessTest --tests '*SecurityAuthAnnotationLinterTest'` | 일정 39/39 및 인가 7/7; 전체 compileJava/compileTestJava 완료 | 공유 분기를 제거하면 직접 접근 25건 중 7건 실패: `build/goal-evidence/red/schedule-shared-read-removed.xml` |
| 모달 | 기존 모달 표적과 실제 Radix focus 테스트 | 기존 22건 및 실제 focus 2건 확인 | `build/goal-evidence/red/modal-focus-return-removed.json` |
| 계측 결속 | 기존 `scripts/e2e-isolation.test.mjs` 확장 | 31/31, skip 0 | `build/goal-evidence/red/enterprise-task-network-unchecked.txt` |

Windows에서는 `./gradlew` 대신 `./gradlew.bat`를 사용했다. 프론트는 `frontend` 디렉터리에서 고정된 `corepack pnpm`을 실행했다. 적절한 범위의 TypeScript·lint·빌드를 함께 검증하며, 다른 에이전트의 무거운 실행과 겹친 결과는 완료 증거로 사용하지 않는다.

전체 하네스 실행은 신규 PG 회귀 2개와 인가/실행 registry의 합법적인 변경이 동결 manifest에 아직 반영되지 않은 것을 red로 잡았다. 실제 생성물에서 추가된 클래스는 주소록 동시성·SMS 전달 정합성 2개이며 제거된 클래스는 0개다. 변경된 registry는 24개 서비스 가드의 연결·일정 공유 조회의 현재 의미와 기존 경보 검사 실행 binding을 담는다. 테스트 fixture PHONE의 내용 해시 1개도 신규 등재했다. 게이트 본문·제외·임계·클래스 삭제 없이 기존 생성물이 만든 manifest를 갱신하고, 실패 XML과 갱신 전 manifest를 `build/goal-evidence/red`에 보존한다. 최종 검사는 해당 하네스 재실행으로 판정한다.

## 복구 수치와 비교 경계

성공 실행은 `.agent/temp/egov-release-smoke-7DH3Tt/result.json`이다. 백업 시각은 `2026-10-01T10:13:59.308Z`; 업그레이드와 검증은 110,616ms, 구 버전 복원과 검증은 71,624ms, 전체는 282,841ms이다. 백업 포함 데이터 손실은 0건이며, 백업 뒤 의도적으로 변경한 1건은 두 복원 모두에 포함되지 않았다. 실행 종료 후 해당 run의 소유 컨테이너·네트워크·볼륨은 0개였다. 빌드 이미지 캐시는 런타임 자원과 구분한다.

복원 중 PostgreSQL deparse/reparse 때문에 CHECK 57개의 동일한 무제한 varchar 리터럴 배열 표현이 바뀌었다. 검사기는 정확한 단순 CHECK 문법 한 가지에만 동치 정규화를 적용하고, 나머지 163개 제약과 이름·값·연산자·순서는 정확하게 비교한다. 삭제 컬럼의 물리 attnum 빈 칸이 압축되어 367개 ordinal_position이 달라졌으므로, 노출 컬럼의 상대 순서와 그 외 24개 메타 필드를 모두 비교한다. 940개 컬럼 누락·추가·타입·default·nullability·identity·generated·collation 차이는 허용하지 않는다. 이 두 변경은 예외 목록이나 baseline 완화가 아니다.

이 수치는 작은 합성 데이터와 로컬 Docker 환경의 관측이다. 운영 RTO/RPO 승인이나 운영 규모 복구 성능을 뜻하지 않는다. 원본 SQL·이미지 digest·암호화 비교·제약 검사의 정규화 경계와 공식 근거는 [복구 런북](backup-and-restore-runbook.md)에 있다.

## 인증 업무 측정의 판정 방식

수동 실험 명령은 `node scripts/run-isolated-e2e.mjs -- --config=playwright.enterprise-task-lab.config.ts --project=full-suite --workers=1`이다. 7개 업무 × cold/warm × 3회가 완전한 측정 인구이며 setup 2건을 포함해 44건이 발견되어야 한다. 기존 frozen r13의 48/96개 release 기준선은 변경하지 않는다. 이 업무 실험은 실패 가능한 과업의 부분 관측·키보드·별도 axe·행위 후 서버 재조회까지 다루므로, clean release 기준선 게이트를 완화하지 않고 별도 수동 보고서 변환기 `scripts/compare-enterprise-task-lab.mjs`를 둔다. 기존 격리 테스트를 확장해 결속과 거짓 성공을 검증하며 새 required CI 게이트는 추가하지 않는다.

동일 브라우저/Node/Playwright, 1280×800, ko-KR, Asia/Seoul, CPU 4배, RTT 150ms, 다운로드 200,000B/s, 업로드 93,750B/s, reduced-motion, service worker 차단을 사용한다. cold는 캐시 비활성·초기화, warm은 동일 페이지 prime 후 캐시 활성 reload와 실제 cache-hit를 요구한다. 각 actor의 CDP 적용과 관측을 따로 검증한다. 이전 버전에는 동일한 계측 입력만 복사하며, 제품 코드의 기준 버전 상태와 계측 파일 SHA를 확인한다. 실제 bootJar SHA·Next BUILD_ID·빌드 manifest·제품 소스 트리를 receipt로 결속하고 실행 중 변경을 거부한다.

LCP는 landing navigation, CLS는 문서별 최대 session, 입력 지연은 수행한 실험 상호작용의 관측 최댓값이다. 서버 저장과 재조회 사이의 action 시간은 별도 proxy이다. [공식 Web Vitals 기준](https://web.dev/articles/vitals)의 2,500ms·0.1·200ms를 목표로 사용하되, 이 실험의 상호작용 최댓값을 실제 사용자 p75 INP 또는 Lighthouse TBT로 표기하지 않는다. 중단된 이전 과업의 CLS·입력 관측은 부분 증거로만 보존하고 완주 과업의 개선율로 산출하지 않는다. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)에 대응하는 키보드 과업과 axe는 별도 결과이며 전체 준수 선언이나 수동 스크린리더 평가를 대체하지 않는다.

첫 진단 실행 `aa673962054db4346ea050bd`는 저장 직후 조회의 일시적 404를 계측기가 즉시 실패로 판단한 문제가 있어 중단하고 정식 성능 비교에서 제외했다. 모달 Escape 포커스 실패는 별도의 실제 사용자 동작으로 관측해 수정하고 red/green으로 재검증했다. 원시 DOM·인증 state·서버 로그는 공개 평가 문서에 복사하지 않는다.

중단된 기준선 진단 `f0219e7d2532ade5f71ffc0a`에서 사용자 CRUD 6회가 완주했으나 cold LCP 9.8–10.3초, CLS 0.186–0.217, 실험 상호작용 760–1,152ms가 관측됐다. cold 글꼴은 2,057,688B·최대 13.4초, script는 545,548B였다. warm은 글꼴·script 전송 0B와 39 cache-hit에도 CLS 약 0.19였다. 이 원인별 증거에 따라 Pretendard를 `optional`로 바꿔 늦은 글꼴 전환을 막고, Sidebar의 normal-flow fallback을 실제 fixed desktop 기하에 맞추며, PageTransition의 `opacity:0` 초기 상태를 제거해 SSR 본문을 바로 보이게 했다. [공식 글꼴 성능 안내](https://web.dev/learn/performance/optimize-web-fonts)와 [Next font 계약](https://nextjs.org/docs/app/api-reference/components/font)에 대응한다. 느린 첫 방문에서는 시스템 대체 글꼴을 유지하고 캐시된 글꼴은 후속 방문에 쓰므로 줄바꿈·가독성 및 개선 후 수치는 실제 브라우저로 판정한다.

위 실행은 조직 편집의 select 접근 이름을 계측기가 잘못 판정한 문제로 중단됐으며, 완전한 42개 인구의 정식 전후 비교에는 사용하지 않는다. 동일한 데이터에 대한 완주 과업의 실제 결함 진단 근거만 보존한다.

진단 실행은 `--enterprise-task-diagnostic`을 앞에 붙이며 cold 1회 × 7개 업무와 setup 2건만 수행한다. build/measurement evidenceKind가 정식 실행과 다르고 비교기는 이를 거부한다. `e2ec4d16e92bf8d59104abfc`에서는 사용자·조직·결재·설문·보고·일정의 실제 업무, 입력 보존, 키보드 과업이 완료됐다. 게시판은 삭제가 논리 삭제임에도 관리자 상세를 404로 기대한 계측 오류로 중단됐다. 기존 관리자 감사 열람을 보존하면서 `useYn=N`과 active 목록 제외를 함께 확인하도록 교정한다.

| 진단 과업 | LCP ms | CLS | 실험 상호작용 최댓값 ms | 업무 완주 | axe 위반 |
|---|---:|---:|---:|---|---:|
| 사용자 | 1,436 | 0.04209 | 952 | 완료 | 0 |
| 조직 | 1,396 | 0.00245 | 440 | 완료 | 0 |
| 게시판 | 4,288 | 0.02571 | 384 | 부분 | 0 |
| 결재 | 1,546 | 0.02297 | 432 | 완료·409 복구 포함 | 0·보조 actor 0 |
| 설문 | 2,052 | 0.17946 | 336 | 응답·관리 취소·재응답 완료 | 0·관리 actor 0 |
| 보고 | 1,538 | 0.02373 | 528 | 실패 500·입력/행 보존·재시도 포함 | 0 |
| 일정 | 1,460 | 0.00212 | 736 | UI CRUD 완료 | color-contrast 4개 노드 |

이 진단은 성능 목표 통과나 정식 개선율의 증거가 아니다. 클릭 processing의 독립 최댓값이 여러 업무에서 크게 관측됐으므로, 같은 `confirm` 함수를 공유하는 context 값의 재생성으로 생기는 전파를 기존 회귀 테스트에서 재현했다. Provider 값을 안정화하는 최소 변경은 기존 중첩 확인·Promise·포커스 의미를 유지하며, 제거 mutant 2 pass/1 fail과 복원 3 pass를 확인했다. 실제 지연 효과와 설문 CLS·일정 대비·게시판 초기 표시 개선은 후속 브라우저 측정으로 판정한다.

후속 단회 진단 `37730cd4eb6fa1e89a465333`은 7개 업무를 모두 완주했다. 7개 primary 및 결재·설문 보조 actor에서 기록된 모든 키보드 확인이 성공했고 axe 위반은 0이었다. 게시판 삭제의 감사 상세/활성 목록 계약과 일정 Calendar의 선택 가능한 외부 월 날짜 대비를 교정했다.

| 후속 진단 과업 | LCP ms | CLS | 실험 상호작용 최댓값 ms | 업무·키보드 | axe 위반 |
|---|---:|---:|---:|---|---:|
| 사용자 | 1,787 | 0.04087 | 616 | 완료 | 0 |
| 조직 | 1,471 | 0.00245 | 320 | 완료 | 0 |
| 게시판 | 3,549 | 0.02447 | 280 | 완료 | 0 |
| 결재 | 1,644 | 0.02297 | 480 | 409 입력 보존·복구 포함 완료 | 0·보조 actor 0 |
| 설문 | 1,454 | 0.28145 | 352 | 응답·관리 취소·재응답 완료 | 0·관리 actor 0 |
| 보고 | 1,410 | 0.01934 | 232 | 실제 500·행 보존·재시도 포함 완료 | 0 |
| 일정 | 1,506 | 0.00211 | 448 | UI CRUD 완료 | 0 |

이 값 역시 진단 실행이며 정식 3회 cold/warm 비교나 성능 목표 통과 증거가 아니다. 설문의 CLS 최대 증가 경로는 설문 상세로 확인됐다. 제목·문항을 병렬 서버 조회의 성공 결과로만 첫 렌더에 주입하고, KST 기준일을 서버/수화에 공통 전달하는 최소 변경을 추가했다. 기존 응답/기간/인가/입력 보존, 부분 조회 실패 후 재조회, 실제 서버 렌더→수화 회귀 33개가 통과했으며 런타임 효과는 재측정으로 판정한다.

진단 전용 후속 계측은 Enter/Escape 구간에 [Chrome DevTools CPU Profiler](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/)를 적용한다. 프로파일에는 정적 chunk 파일명·줄/열·표본 시간만 남기며 URL·함수명·DOM·식별자·원시 프로파일은 저장하지 않는다. 표본 시간은 EventTiming의 processing 시간과 동일한 지표가 아니다. Profiler의 비용이 들어간 진단 수치를 정식 성능 결과에 합치지 않으며 정식 모드에는 Profiler 호출이 없다. 유한 과업 단계는 지연된 observer callback 시점이 아닌 entry 시작 시각과 대응한다. 해당 대응을 제거하면 기존 계측 회귀가 실제 red가 된다.

프로파일 도입 실행 `5a37498bab9e092db06bcb23`은 두 업무의 CPU 표본 검증 오류를 확인한 뒤 전용 Playwright 자식만 종료했다. 실행기는 전용 DB/API/네트워크/볼륨을 회수했으며 부분 결과는 정식 비교에서 제외한다. 유효 CPU 프로파일의 중복 재귀 위치를 합쳐 조상 시간의 중복 해석을 막는다. 잘못된 CPU 표본은 음수 delta·비정상 숫자·없는 node의 개수만 기록하고 표본 시간을 `null`로 남긴다. 선택적인 CPU 진단 실패를 실제 LCP/CLS/EventTiming 또는 키보드 업무 성공으로 대체하지 않는다. 별도 API/DB 없는 전용 브라우저의 단순 연산 12회·DOM 입력 35회에서는 같은 오류가 재현되지 않아 제품 원인을 단정하지 않았다.

백엔드 최종 모듈 check는 app 1,206개·core 1,219개·API 988개 기능 테스트 중 3,411개 성공·기존 비활성 2개·실패 0, 하네스 135개 성공이었다. 기존 비활성 기능 테스트 2개는 추가·수정하지 않았다. 출처와 모듈별 집계는 `build/goal-evidence/green/backend-module-checks.json`에 남겼다.

후속 진단 `c1ccdffc016265e55b24967a`에서는 7개 과업과 모든 키보드 확인을 완료했고 primary/보조 actor 모두 axe 위반 0이었다. 설문 SSR 초기값의 런타임 CLS는 0.06625로 관측됐으나 게시판 LCP 3,552ms와 전 업무의 실험 상호작용 최댓값 368–872ms는 목표를 넘었다. CPU Profiler를 사용하는 진단이므로 정식 지연이나 개선율로 합산하지 않는다. 이후 reduced-motion 모달의 애니메이션을 완전히 끄고, 제목의 명시적 초기 포커스·Tab/Shift+Tab 내부 유지·종료 후 invoker 복귀를 검증했다. FAQ 정화는 같은 DOMPurify를 답변을 펼칠 때 로딩하며 준비 중 원본 HTML을 표시하지 않는다. 이 두 변경은 기존 코드에서 각각 실패하는 회귀와 수정 후 11개 표적 테스트로 확인했고, 초기 역방향 Tab 회귀 3개도 성공했다. 실제 성능 효과는 정식 후속 실행으로 판정한다.

정식 기준선 `097f6472a75a0e8048825fff`는 동일한 계측 7개 파일로 42개 측정을 모두 실행했다. 업무 완주는 35개이며 게시판 첫 cold 1개와 보고 6개는 업무 단계에서 중단됐다. 모든 관측과 실패를 유지하며, 중단 과업의 입력/CLS 개선율은 산출하지 않는다. 전용 컨테이너·네트워크·볼륨은 종료 후 0개였다. 기준선 제품 트리는 `e4e4582ddc850b6933d57d986b49ce874df7bc82b1fe0d75e3bf0cfa8831bebc`이며 비교 대상 계측 SHA는 변경하지 않는다.

기존 shard discovery는 모든 `.spec.ts`를 정식 CI 인구로 취급해 별도 설정의 수동 실험도 시간 프로필 누락으로 red였다. 실제 default/manual `defineConfig`의 project matcher, 고정 수집기 입력과 serial package 명령을 결속해 기존 정식 51개와 수동 실험 1개 파일을 분리했다. 미등록 일반/수동 추가, 누락·중복 소유, 동적 matcher와 worker 변경은 계속 red이며 기존 시간 프로필·임계·제외 목록은 변경하지 않았다. 기존 shard/result 계약 47개와 최초 실제 red를 `build/goal-evidence`에 보존한다. 새 required 게이트를 추가하지 않고 기존 운영 계약 실행 경로를 확장했다.

## 최종 표적 검증

최종 소스 검토에서 마지막 48번째 SMS GET을 준비한 worker의 lease보다 횟수/24h 만료를 먼저 판정해, 다른 worker가 진행 중 receipt를 UNKNOWN으로 바꾸는 경합을 확인했다. ACCEPTED의 유효한 poll lease를 먼저 보존하고 lease 종료 뒤 기존 한도를 적용하도록 수정했다. 기존 CLAIMED 2분 만료·즉시 소진·자동 재POST 금지는 유지한다. 실제 단위 1건과 별도 PostgreSQL 트랜잭션 1건이 기존 순서에서 실패했고, 복원 후 SMS processor 19/19·PG 11/11과 전체 컴파일이 성공했다. 최종 소스·XML SHA는 `green/sms-final-get-lease-census.json`에서 대조한다. 위 SMS 모의 계약 143건은 이 추가 회귀 이전의 실행이며, 업무 단위 3건·PG 2건이 후속 추가됐다.

추가 소유 HTTP 실행 `5a5cb78f8a79936a6d480b95`에서 주소록 owner 허용·타인 GET/PUT/DELETE 거부와 원본 보존, 일정 UI와 독립된 HTTP CRUD, READ_ALL 없는 같은 부서/다른 부서/소유자 접근 계약 3건은 성공했다. 같은 명령의 임시 스타일 진단 1건은 잘못된 경로 때문에 실패했으므로 명령 전체를 성공으로 집계하지 않는다. 성공한 HTTP 3건의 결과·원본 SHA는 `green/addressbook-and-schedule-http.json`에 분리했다. 임시 진단은 고친 뒤 통과했고 종료 때 원래 일정 계약 파일 바이트를 복구했다.

스타일 진단 `76197fe2802bb05fa3e26574`의 inline body gap 기본값은 닫기 456→168ms, 제거 뒤 424ms였으나 같은 기본값을 외부 CSS에 넣은 후에는 효과가 재현되지 않았다. 후속 동일 페이지 대조 `b7ad7f4940177dc532af9aba`에서는 명시적 body 기본값과 상속을 유지하는 `<length>` 타입 등록을 함께 썼을 때 닫기 432→176ms, 제거 뒤 392ms였다. 최소 CSS 변경의 별도 실제 실행 `b65ac1929d315bb976ebb7f5`은 양수 15px 값과 자식 상속, 잠금·해제와 Escape 복귀를 확인했다. 반복 열기 160–384ms·닫기 96–264ms는 편차가 있으며 목표 통과 증거가 아니다. 18개 모달·중첩 확인·테마 표적 테스트와 E2E 타입 검사는 통과했다. 상속 제거·배경 클릭 허용·`:has` 조기 차단은 제품에 적용하지 않았다. 정상 사용자 필드 6개의 빈 애니메이션 목표만 제거하며 오류 shake는 유지했다. 자료는 `green/modal-typed-product-probe.json`에 있다.

게시판 LCP 영역 진단 `81900b16b65cd58f6fb5ce22`의 후보는 1,264ms global status P → 1,909ms sidebar P였다. 기존 초기 영역 0에서 첫 영역을 먼저 보인 뒤 URL 영역으로 전환하던 Sidebar는 유효한 사용자 선택을 우선하고, 선택이 없으면 현재 경로·쿼리의 권한 필터된 영역을 SSR부터 표시한다. 경로·쿼리 SSR 검사 2건이 기존 구현에서 실패했고 수정 후 기존 포함 10건·hydration 오류 0이었다. 늦은 다른 DIV 후보를 이 한 번의 진단으로 확정하거나 모든 경로의 성능 목표 통과로 해석하지 않는다.

후속 정식 실행 `2e08c9314019dff992d5e4df`은 사용자 6회·조직 2회 후 종료한 부분 실행이다. 사용자 6개 과업은 모두 완주·키보드 성공·axe 0이었으나 상호작용 592–1,152ms로 목표를 넘었다. cold 사용자 LCP 1,588–1,691ms·CLS 0.0397–0.0414였으며 부분 결과를 42회 비교나 전체 성능 성공으로 쓰지 않는다. 원본과 유한 수치의 출처는 `red/task-lab-after-v9-partial.json`이다. 전용 CLI만 종료하고 실행기의 정리 이후 소유 컨테이너 0을 확인했다.

별도 브라우저 진단 `ad7eb642b861aa808401d8c7`은 초기 제목 포커스를 microtask로 옮겨 같은 표시 이전 구간의 스타일 계산을 합칠 수 있는지 대조했다. 일반 반복 열기 384/328ms, 후보 336/336ms이고 RecalcStyle 횟수는 모두 5로 감소하지 않았다. 효과가 뚜렷하지 않아 제품에 적용하지 않았다. 실제 invoker 복귀·잠금·양수 gap 상속은 성공했으며 임시 진단 코드가 남지 않도록 일정 계약 파일의 원래 SHA `0443711bc11b7a102969ebca82249b91cbf5dc58962acc3d53d0f273eae5c89d`로 복구했다.

## 정식 인증 업무 측정의 최종 결과

동일한 고정 계측 7개 파일의 기준선 `097f6472a75a0e8048825fff`와 변경 후 `f9cd03c6ad5c42e7020c68a2`를 비교했다. 변경 후 빌드 제품 트리는 `adf523ca38a13a97e67ebdde07fa964b468c6fa1d1302e114e1b730467152c41`이다. 결과는 42/42 업무 완주·42/42 키보드 성공, primary 42개와 보조 actor 18개의 axe 위반 0이었다. 성능 검사는 42개 모두 실패했고 명령 exit 1을 그대로 보존했다. LCP 초과 2개·CLS 초과 0개·상호작용 초과 42개이며 전체 최댓값은 각각 3,726.8ms·0.07108·3,168ms다. 아래 값은 각 cold/warm 3개의 중앙값이며 모든 표본과 min/max/MAD는 `red/enterprise-task-lab-comparison-final.json`에 있다. 14개 조합의 LCP·CLS 중앙값은 목표 안에 있지만 상호작용은 모두 200ms를 넘었다. 실사용 p75 INP나 전체 접근성 준수 판정이 아니다.

| 과업 | 캐시 | 기준선 LCP ms | 변경 후 LCP ms | 변경 후 CLS | 실험 상호작용 최댓값의 중앙값 ms |
|---|---|---:|---:|---:|---:|
| user-management | cold | 8557 | 1566 | 0.03961 | 672 |
| user-management | warm | 3147 | 1321 | 0.04158 | 672 |
| department-hierarchy | cold | 7541 | 1567 | 0.01702 | 480 |
| department-hierarchy | warm | 3771 | 1225 | 0.00000 | 488 |
| board-article | cold | 2247 | 1715 | 0.02571 | 328 |
| board-article | warm | 1422 | 1746 | 0.02571 | 320 |
| approvals | cold | 5885 | 1606 | 0.02297 | 440 |
| approvals | warm | 2601 | 1592 | 0.02297 | 416 |
| survey | cold | 5881 | 1686 | 0.07108 | 264 |
| survey | warm | 2302 | 689 | 0.06623 | 2704 |
| work-report | cold | 6017 | 1709 | 0.02373 | 400 |
| work-report | warm | 2056 | 1259 | 0.02373 | 400 |
| schedule | cold | 6783 | 1548 | 0.00211 | 480 |
| schedule | warm | 2003 | 1225 | 0.00496 | 488 |

기준선 게시판 cold의 중단 1개와 보고의 중단 6개는 입력·CLS 개선율의 비교에서 제외했다. 기준선부터 완주한 사용자에서는 LCP·CLS가 좋아졌지만 상호작용 중앙값은 cold 456→672ms·warm 480→672ms로 악화됐다. 게시판 warm LCP도 1,422→1,746ms로 증가했다. 개선과 악화를 함께 보존하며 성능 점수는 상향하지 않는다. 설문 warm 2회에서 링크 keyup 처리 3,149.4ms를 확인했고, 해당 보조 actor 최댓값 248ms와 구분했다.

후속 전용 진단 `9ec894520d6bc5bfe9877f94`은 [Chrome 선택자 통계](https://developer.chrome.com/docs/devtools/performance/selector-stats)로 스타일 계산의 범위를 확인했다. 이 모드는 계측 비용을 추가하므로 정식 수치와 합치지 않는다. 원시 trace는 저장하지 않고 공개 정적 CSS 선택자/해시와 숫자만 보존했다. 색상 타입 등록과 시스템 글꼴 교체는 대조 효과가 분명하지 않아 적용하지 않았다. [선택 스타일 상속 계약](https://developer.chrome.com/blog/selection-styling)에 따라 컨테이너와 void input의 의미를 따로 검토한 `fedd17bc23b81d565140c6e7`·`eabd9f6afe610d91063048cf`에서도 열기 312–368ms·336–352ms로 목표를 넘었다. 선택자 범위와 body 위치 후보는 제품에 적용하지 않았다. 임시 테스트를 원래 일정 계약 SHA로 복구하고 소유 컨테이너 0을 확인했다.

현재 우선순위 5의 성능 완료 조건은 미충족이다. 공통 모달의 문서 스타일 재계산과 링크 keyup 처리의 추가 원인 규명이 남는다. CSS 범위·글꼴·포커스 배치의 표적 대조만으로 이 지연을 해결했다고 판단하지 않는다. 전체 goal의 성능 완료는 보류한다. 사용자의 후속 명시 지시에 따라 현재 변경분은 성능 미달을 공개한 상태로 커밋·푸시하고 required CI 통과 뒤 main에 병합하는 대상으로 삼는다. Git 작업의 완료 여부는 실제 PR·커밋·CI 결과로 별도 확인한다. 이 문서와 Atlas의 후속 갱신은 기록 변경이며 위 정식 측정의 기능 소스를 변경하지 않는다.

최종 가역적 로컬 검사에서 app·E2E TypeScript, 변경/신규 프론트 파일 35개 lint(경고 0), Atlas·테마·모달 표적 37/37, 문서 계약 9/9와 문서 122개·로컬 링크 2,775개(오류 0)가 통과했다. 복구된 기능 소스의 production build와 기존 예산은 JS gzip 1,890,063/2,250,000B·최대 132,726/150,000B, CSS 30,945/40,000B·최대 29,919/38,000B, route font preload 0/200,000B로 통과했다. 최신 frontend 전체 coverage와 원격 required CI는 실행 완료로 주장하지 않는다. 실행 로그는 `green/frontend-final-production-build.log`·`frontend-final-bundle-budget.log`·`frontend-final-complete-affected-lint.log`·`frontend-final-atlas-and-modal.log`·`docs-final-contract.log`에 있다.

## 3대 헌법의 적용 범위

아래는 이번 변경에서 확인한 불변식의 지도이며 조문 전체·전체 제품 준수 판정이 아니다. 조문별 테스트 수를 합쳐 준수율을 만들지 않는다. 헌법·AGENTS의 실질 정책을 변경하지 않았다.

| 원본·조문 | 이번 범위의 확인 | 한계 |
|---|---|---|
| [백엔드](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md) 1–2 모듈·의존 | SMS 공급자 어댑터/API와 업무 포트 분리, app/core architecture·isolation 표적 XML | 최신 전수 CrossDomainCoupling 실측은 별도 |
| 백엔드 3–4 Entity·변환 | 주소록·SMS·일정 DTO 재사용, API Entity 노출 검사와 생성 계약 | 모든 서비스 Facade 조립의 전수 평가는 아님 |
| 백엔드 5 캡슐화 | SMS CAS와 부모 잠금의 실제 PG 상태 전이 | 새 Entity/빌더 설계 없음 |
| 백엔드 6–7 응답·예외 | 실제 HTTP 141건과 기존 ApiResponse, 409/403 중앙 예외 | 모든 ResponseContract·예외 전수 린터 최신 결과는 별도 |
| 백엔드 8 이중 인가 | 24개 서비스 guard·HTTP 거부/허용·인가 하네스, 일정 공유 READ와 owner WRITE 구분 | 배포 권한 배정은 별도 |
| 백엔드 9–10 트랜잭션·외부 | claim commit→단일 POST→DB retry/CAS, 실제 프록시·PG와 bounded HTTP | 운영 공급자 전달, 정식 circuit breaker 도입 주장 없음 |
| 백엔드 11 보안·OWASP | 고정 HTTPS·환경변수·격리 보안 경계·원문 미출력 | 최신 required CodeQL/의존성 review/전체 OWASP·배포 redaction 미검증 |
| 백엔드 12 Java21 | 언어·스레드 전략을 변경하지 않음 | 컴파일 성공으로 virtual-thread pinning·MDC를 보장하지 않음 |
| 백엔드 13 로그 | 새 관측은 숫자·유한 label, 비밀·원시 응답 제외 | 전체 Trace ID/MDC 전파 실측은 별도 |
| 백엔드 14 성능·메모리 | 영속 캐시 snapshot·bounded 조회·scrape DB 접근 없음, JPA 표적 검사 | 전체 QueryCount/N+1·운영 규모 OOM 미검증 |
| 백엔드 15 동시성 | 주소록 12·설문 26·SMS 9 PG, 별도 트랜잭션·잠금/토큰 red | 모든 업무의 동시성 전수 검증은 아님 |
| 백엔드 16 계약·Mutation | OpenAPI→TS/Zod와 표적 검증, 실제 위반 red | live 메타 전수·최신 STRICT_MUTATION 75% CI 증거 미검증 |
| 백엔드 17–18 명명·시행 | 신규 영속 명명·헌법 개정 없음 | 기존 전체 명칭 표준성을 재판정하지 않음 |
| [프론트](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) 1 과업 | 실제 7 route·42회·별도 actor·결속·완주/부분 구분 | 취소된 수치는 정식 비교에서 제외 |
| 프론트 2–3 장식·SSR | 진입 장식 최소화, 기존 client 경계 안의 deterministic SSR 표시 | 개선 효과는 after runtime으로 확인 |
| 프론트 4 상태·URL | 주소록 token body 전달·입력 보존, 기존 URL 397개 레코드와 승인 결정 보존 | 배포 프록시·Secure cookie 전수 검증은 별도 |
| 프론트 5–6 기하·토큰·모션 | Sidebar fallback 기하를 실제 desktop 위치에 맞춤, optional 글꼴·비필수 진입 효과 제거 | 고정 viewport·reduced-motion 하나로 mobile/reflow/모든 모드를 증명하지 않음 |
| 프론트 7 폼 | 주소록 409 재적용, 보고 오류 분류·행/pending 보존 | 전 폼 max/required·모든 서버 오류를 전수 검사하지 않음 |
| 프론트 8 성능 | 실제 LCP·CLS session·EventTiming·resource·cache/CDP, 기존 예산 유지 | 실험 최댓값은 실사용 p75 INP와 구분 |
| 프론트 9 접근성 | 실제 Radix Escape/중첩 포커스 red/green; keyboard와 axe 별도 기록 | 스크린리더·touch·확대·KWCAG/WCAG 전체 준수 미검증 |
| 프론트 10 헤더·리소스 | 새 외부 CSP/글꼴 출처 없음, 자체 호스팅 유지 | 배포 nonce/헤더 전수 실측은 별도 |
| 프론트 11 hydration | 숨겨진 SSR 초기 상태 제거와 ConsoleErrorGuard | TypeScript/lint가 runtime의 대체가 아님 |
| 프론트 12–13 오류·낙관 UI·계약 | 실패한 삭제/충돌 입력과 문맥 유지, 서버 반영 후 재조회 | 전체 ErrorBoundary·모든 화면 계약의 전수 증거는 아님 |
| 프론트 14 검증 | 표적 검사·실제 red/green, 기존 r13/required CI 유지 | 수동 업무 실험은 required CI 통과 증거가 아님 |
| 프론트 15 대비 | 별도 axe의 실제 관측 결과로 판정 | dark/합성 대비/hover/selected/disabled/forced-colors 수동 미검증 |
| 프론트 16–17 콘텐츠·시행 | 보고 삭제 안내를 실제 실패 의미에 맞춤, 헌법 개정 없음 | 장문·좁은 폭·zoom·touch 회복력은 별도 |
| [DB](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) 1·3–5 명명·타입·PK | 신규 DB 이름·Entity·DDL·PK 전략 변경 없음 | 복구 보존은 기존 전체 명명 표준성 승인이 아님 |
| DB 2 메타 SSOT | live SMS/job 물리 상태 조회와 실제 PG/복원 메타 대조 | 모든 용어·타입을 3대 live meta와 전수 대조하지 않음 |
| DB 6 제약 | 220개 제약 이름·정의 보존, 57개 좁은 동치와 변형 red | 새 UNIQUE/JPA 설계·기존 전수 naming 승인 없음 |
| DB 7 진화 | 원본 88 SQL의 stop-writer upgrade/old rollback | 신규 migration/waiver 없음; 운영 무중단 증거 아님 |
| DB 8 Audit·삭제 | 주소록 미전달 보존·빈 목록 삭제, 응답 의미 보호·복구 데이터 손실 0 | 모든 테이블 Audit 4종 전수 설계 검증은 아님 |
| DB 9–10 등록·시행 | 신규 영속 용어/표준 예외·헌법 개정 없음 | 복구 동치 비교를 DB 표준 예외로 분류하지 않음 |

## 같은 기준의 재평가

이전 평가의 12개 분야 가중치와 35개 도메인 배점을 그대로 사용한다. 분야 가중 평균 70% + 도메인 단순 평균 30%가 종합 점수다. 도메인은 기능 30·인가/정합 25·검증 25·업무 흐름/계약 20으로 구성된다. 원래 점수는 분야 86.9, 도메인 평균 87.6857, 종합 87.1357(표시 87/100)이며 `build/goal-evidence/baseline-assessment.json`에 숫자와 기준을 보존했다. 다음 점수는 현재 로컬 소스와 실행 증거에 대한 평가이며, 전체 goal 완료 또는 원격 required CI 성공 판정과 다르다. 점수는 테스트 통과율이 아니다.

평가는 확인된 로컬 구현과 증거에 대한 판단이며 성능 목표 달성·배포 승인과 다르다. 12개 분야와 35개 도메인의 기존 배점으로 종합 **89.6/100**을 산출했다. 분야 가중 평균 89.54, 도메인 평균 89.80, 합성 비중은 70%·30%다. 성능 목표 미달로 성능 점수는 80을 유지했다.

| 분야 | 가중치 | 점수 | 근거·남은 한계 |
|---|---:|---:|---|
| 아키텍처·모듈 경계 | 8% | 88 | 기존 모듈 경계 보존, 신규 SMS 어댑터/포트 분리; 전체 아키텍처 재설계 없음 |
| 백엔드 구현 | 10% | 90 | 실제 PG 경합과 서비스 인가·결과 lease 보완; 전체 업무 완성 선언 없음 |
| 프론트엔드 구현 | 8% | 91 | SSR 초기 표시·오류 입력 보존·모달 회귀 보완; 최종 전체 FE coverage 미실행 |
| 보안·인증·인가 | 14% | 93 | 24개 직접 서비스 쓰기와 HTTP 거부·원본 보존 검증; 운영 권한 배정·최신 required CI 별도 |
| DB·데이터 정합성 | 10% | 90 | 주소록 stale token·설문 공통 잠금·SMS 마지막 GET lease의 PG 검증; 신규 DDL 없음 |
| API·양단 계약 | 8% | 92 | OpenAPI 417개 계약 및 TS/Zod·409 UI 연결; 전체 미배선 API 추가하지 않음 |
| 테스트·회귀 방지 | 12% | 93 | 실제 위반 red, PG 별도 TX와 시간 경보·구 버전 복원; 전체 최신 CI 미실행 |
| UX·접근성 | 8% | 86 | 실제 7개 과업 완주·키보드/axe와 실패 복구; 전체 WCAG/스크린리더 수동 미검증 |
| 성능·확장성 | 7% | 80 | LCP·CLS 일부 개선이나 정식 상호작용 200ms 미달, 종합 성능 목표 미완료 |
| CI/CD·자동화 | 6% | 90 | 기존 게이트와 수동 실험 소유 결속, 추가 경보 CI 경로; 최신 원격 required CI 없음 |
| 운영·관측·복구 | 6% | 85 | 최초/미실행·영속 backlog 시간 경보, 실제 역사 upgrade/rollback; 운영 SMS·경보·복구 별도 |
| 문서·추적성 | 3% | 90 | 출처·제한·red/green 문서 연결; 소스 평가와 운영 승인을 구분 |

도메인 배점은 기능 30·인가/정합 25·검증 25·업무 흐름/계약 20이다. 운영 전달·수동 접근성·전체 CI 성공에 대한 점수는 추가하지 않았다.

| 도메인 | 기능 /30 | 인가·정합 /25 | 검증 /25 | 흐름·계약 /20 | 점수 /100 |
|---|---:|---:|---:|---:|---:|
| 인증·세션·MFA | 28 | 24 | 24 | 19 | 95 |
| 사용자·계정 관리 | 28 | 23 | 22 | 18 | 91 |
| 권한·그룹·권한 배정 | 28 | 24 | 22 | 18 | 92 |
| 조직·부서 | 28 | 20 | 21 | 16 | 85 |
| 메뉴·프로그램 | 28 | 23 | 22 | 18 | 91 |
| 공통코드 | 28 | 22 | 22 | 18 | 90 |
| 행정구역 코드 | 28 | 21 | 20 | 18 | 87 |
| 기관코드·수신 이력 | 27 | 20 | 20 | 17 | 84 |
| 정책·템플릿 | 28 | 24 | 23 | 18 | 93 |
| 파일·첨부 | 27 | 23 | 23 | 18 | 91 |
| 게시판·공지 | 28 | 22 | 23 | 18 | 91 |
| 댓글·게시글 만족도 | 28 | 22 | 22 | 18 | 90 |
| FAQ·도움말·매뉴얼 | 28 | 24 | 21 | 18 | 91 |
| Q&A | 28 | 22 | 20 | 18 | 88 |
| 지식관리 | 27 | 22 | 18 | 18 | 85 |
| 커뮤니티 | 28 | 23 | 23 | 18 | 92 |
| 설문 | 28 | 22 | 24 | 18 | 92 |
| 온라인 투표·일반 만족도 조사 | 28 | 23 | 22 | 18 | 91 |
| 전자결재 | 28 | 24 | 22 | 18 | 92 |
| 부서업무·업무함 | 27 | 21 | 22 | 18 | 88 |
| 메모보고 | 28 | 23 | 23 | 18 | 92 |
| 업무보고 | 27 | 21 | 21 | 19 | 88 |
| 일정·캘린더 | 27 | 22 | 23 | 18 | 90 |
| 주소록 | 28 | 24 | 23 | 19 | 94 |
| 쪽지 | 28 | 22 | 21 | 18 | 89 |
| 메일 | 27 | 22 | 22 | 17 | 88 |
| SMS | 25 | 23 | 23 | 18 | 89 |
| 알림 | 28 | 23 | 22 | 17 | 90 |
| 행사·외부인사 | 27 | 24 | 22 | 17 | 90 |
| 포상 | 27 | 24 | 21 | 17 | 89 |
| 배너·팝업 | 28 | 24 | 22 | 17 | 91 |
| 스크랩 | 28 | 21 | 19 | 18 | 86 |
| 통계·대시보드 | 27 | 21 | 22 | 17 | 87 |
| 감사·로그·영속 후속 작업 | 28 | 23 | 24 | 18 | 93 |
| 독립 데이터 이관 | 26 | 23 | 22 | 17 | 88 |


푸시 사전 검증에서 기존 frontend reachability 분석기는 lab의 즉시 호출형 `createRequire(__filename)('@playwright/test/package.json')`을 지원하지 못했다. 측정 입력 7개를 수정하지 않고 기존 분석기에 정적 즉시 호출 의존성 수집을 추가했다. 별칭 호출의 기존 검사는 유지하고 동적 인수·추가 인수·외부로 전달되는 factory 및 누락된 로컬 파일은 계속 red로 차단한다. 추가 계약 2건은 기존 분석기에서 실패했고 수정 후 통과했다. 자료는 `red/immediate-create-require-before.log`와 `green/immediate-create-require-after.log`이며, 운영 계약 catalog가 이 기존 테스트 파일을 로컬 훅과 CI에서 실행한다.

같은 사전 검증에서 주소록 서비스의 생성 경계 원장 줄 번호 6개와 URL 원장의 sourceFileCount(598→599)가 오래된 상태인 것도 확인했다. 두 원장을 생성기로 재생성하고 URL 승인 항목을 유지한 채 manifest SHA-256만 재결속했다. 재측정 결과 operation 417개·서비스 메서드 321개·화면 고아 29개·쓰기를 표시하는 권한 부채 45개로 기존 래칫과 일치한다. 귀속 실패는 0개이며 어떤 상한도 높이지 않았다.

게시판을 정적 클라이언트 import로 바꾼 뒤 core 축소 프로필의 기존 승인 라우트에서 첫 cascade 근거가 BoardAdminService에서 BoardUserService로 바뀌었다. 두 서비스 모두 기존 collaboration 제외 pack에 속하므로 승인된 profile·route·소실 개수는 유지하고 해당 행의 대표 근거만 현재 import 경로로 갱신했다. 새 승인 라우트나 예외를 추가하지 않았고, 미승인 소실·근거 이동·이유 없는 승인에 대한 기존 부정 계약도 유지했다.


발행 준비의 첫 원격 CI(run 36943838559)는 운영 계약 및 백엔드 빌드·coverage·PostgreSQL·mutation 검증을 통과했지만 아래 정합·보안·시각 검사에서 실패했다. 실패를 우회하지 않고 원인을 수정했다.

- OpenAPI의 정수 응답 키 순서가 Java 내보내기와 JSON.stringify 사이에서 달랐고 SMS rsltCd 설명도 오래됐다. 정수 인덱스 키만 JavaScript 규칙으로 정렬하고 나머지 schema 키 순서는 보존했다. 기존 구현에서 새 정렬 계약이 실패했고 수정 후 OpenAPI 13건·전체 Java 컴파일이 통과했다. Java 내보내기와 프론트 syncContract 결과의 바이트 일치도 확인했다.
- gitleaks 8.28.0은 역사 Dockerfile 공개 SHA-256을 API 키로 탐지했다. 실제 역사 Git 객체의 Dockerfile과 해시 일치를 확인하고 공개 체크섬을 BACKEND_DOCKERFILE_SHA256 상수로 명명했다. 같은 버전의 기존 파일 탐지는 red였고 수정 파일은 green이다. 체크섬 값·검증 의미를 유지하며 scanner 예외를 추가하지 않았다.
- CodeQL의 js/file-system-race High 2건을 파일 핸들 열기·fstat·현재 inode/장치 및 symlink 검사·동일 핸들 읽기로 수정했다. 검사와 읽기 사이에 파일 경로를 교체하는 결정적 부정 테스트 2건은 경로 재열기 방식에서 실패했고 복구 후 관련 Node 계약 82건이 통과했다.
- 게시판의 초기 목록을 기다리는 현재 구조에서는 admin/loading.tsx가 로딩 제목을 제공한다. 제거된 중첩 skeleton을 요구하던 계약을 실제 fallback과 최종 h1 하나를 검사하도록 맞췄다. 제목 계약 16건이 통과했다.
- 의도한 optional 글꼴 정책·fallback 때문에 Linux 화면 글자 영역이 기존 VRT와 달랐다. 기존 1% 허용치를 유지하고 CI의 수동 기준선 생성(run 36945177971, commit=false)으로 4장을 생성했다. 대시보드·로그·코드·로그인 화면의 내용·배치·가독성을 직접 확인한 뒤 반영했다.

위 발행 준비의 안전한 파일 읽기 및 공개 체크섬 상수 수정은 정식 성능 측정 이후 runner·historical fixture 2개 입력을 변경했다. 앞서 42회 비교는 그 당시 서로 동일하게 동결된 7개 입력으로 수행한 자료이며, 발행 커밋에서 다시 수행한 측정으로 주장하지 않는다. 프론트 기능 코드는 해당 측정과 같고 성능 목표 미달·전체 goal 보류 판단은 유지한다.

처음 발행한 PR #822의 실패 로그는 근거로 보존한다. 수정 전 공개 체크섬이 기존 커밋의 증분 검사에도 남으므로 같은 기준 main에서 현재 최종 변경을 하나의 새 커밋으로 묶어 발행한다. 기존 PR을 대체하며 force push·scanner 예외·required CI 우회는 사용하지 않는다.
