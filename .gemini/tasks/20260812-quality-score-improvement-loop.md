# 프로젝트 완성도 개선 루프 — 완료 원장

> 상태 판정: 개선 Wave 5 구현·로컬 검증·독립 검토 완료. 이 원장과 색상 exact 래칫을 포함한 최종 PR이 active required checks 7/7을 통과해 `main`에 병합되면 통합 완료이며, PR 브랜치에서는 통합 후보로 본다.
> 결과 판정: 위 통합 완료 조건을 충족하면 저장소 증거 기반 위험 가중 점수 **70.3/100 → 91.9/100**으로 확정하고, 그 전에는 같은 수치를 후보로 본다.
> 주의: 이 점수는 코드·테스트·설정·CI 증거를 평가한 값이며, 운영 배포 인증이나 실제 DR 복구 성공을 의미하지 않는다.
> 척도 구분: 이 점수는 분야별 위험 가중치가 있는 운영 완성도다. [구조 성숙도 12축](../../docs/02-architecture/quality-score-root-cause-analysis.md#16-4축-전면-재측정-2026-08-13-07-28-이후-실물ci-재검증)의 83.1점과 목적·산식이 다르다.

## 운영 경계

- 사용자는 저장소 내부의 분석·개선·검증 작업에 포괄 진행 승인을 부여했다.
- 운영 DB DML/DDL, 실제 자격증명 회전, 배포·외부 발행은 별도 명시 승인 없이 수행하지 않았다.
- `GEMINI.md`와 프론트엔드·DB constitution은 수정하지 않았다. 백엔드 constitution은 사용자의 명시 승인 후 제16조를 실제 strict mutation 집행과 동기화했고 PR #396(`745610c24`)으로 `main`에 병합했다.
- 기존 사용자 WIP와 stat-only 변경인 `frontend/src/hooks/useAppForm.ts`, `frontend/src/hooks/__tests__/useAppForm.test.tsx`, `frontend/src/types/generated-api.d.ts`는 보존하고 커밋 대상에서 제외했다.
- Gradle 실행은 한 번에 하나만 수행했고, 테스트 skip·예외목록 확대·임계값 완화로 실패 신호를 숨기지 않았다.

## 점수 산정 방식

종합점수는 `Σ(세부분야 점수 × 위험 가중치) / 100`으로 계산했다. 보안·개인정보, 백엔드/API, DB·데이터, 테스트 게이트에 더 높은 가중치를 부여했다.

| 세부분야 | 가중치 | 개선 전 | 개선 후 | 증감 | 핵심 증거 |
|---|---:|---:|---:|---:|---|
| 백엔드/API | 12% | 74 | 93 | +19 | 알림·결재·쪽지 소유권 결속, 사용자 식별자 축 정정, 예외 계약 보강 |
| 보안·개인정보 | 14% | 58 | 94 | +36 | WS 인증·구독 권한·Origin 방어, 비밀정보 제거/스캔, 업로드·쪽지 IDOR 방어 |
| 백엔드 신뢰성·성능 | 9% | 68 | 91 | +23 | 비동기 포화/실패 상태, 인증 인프라 장애 분류, Hikari 정규화, 저장 실패 보상 |
| 프론트 아키텍처 | 9% | 73 | 92 | +19 | 중복 WS 제거, Next proxy, 검색·로그 생성 API 타입과 페이지 계약 정렬 |
| UX·접근성 | 8% | 67 | 87 | +20 | 테이블 키보드/ARIA, 업로더 포커스·파일 선택 경계, 시맨틱 색상 보강 |
| 프론트 보안·계약 | 8% | 83 | 96 | +13 | 사용자 전용 토픽, 검색·로그 PageResponse, 생성 DTO·CSV 계약 강화 |
| 프론트 성능 | 7% | 70 | 87 | +17 | 프로덕션 빌드, 고정 gzip 번들 예산, 중복 구독 및 중복 mounted gate 제거, PPR 빌드 안정화 |
| DB·데이터 거버넌스 | 10% | 68 | 88 | +20 | 환경변수 fail-fast, SELECT-only 단일문 DB bridge, read-only/timeout, PostgreSQL 17 스키마 검증 |
| 테스트·품질 게이트 | 10% | 79 | 95 | +16 | JaCoCo, FE 408 tests·coverage exact 래칫, strict mutation 10범위, 하네스 29종 |
| CI/CD·운영 | 8% | 73 | 96 | +23 | 7개 필수 검사, E2E 3샤드, Gradle 경고 실패·제한 재시도·병렬 시작 |
| 문서·DX·재사용성 | 5% | 64 | 87 | +23 | 품질 원장 현행화, Gradle 10 호환, explicit CRUD 스캐폴드 문서 정합 |
| **위험 가중 종합** | **100%** | **70.3** | **91.9** | **+21.5** | 원시값 `91.85 - 70.33 = 21.52`, 각 수치는 소수 첫째 자리 반올림 |

## 완료한 개선 Wave

### P0 — 즉시 위험 제거

- [x] 알림 REST 목록·상세·읽음·삭제를 로그인 수신자 `esntlId`에 결속
- [x] WebSocket handshake 인증, Origin, 구독 destination 권한을 서버에서 검증
- [x] 공개 사용자 알림 토픽 제거 및 사용자 전용 queue로 단일화
- [x] DB bridge의 하드코딩 접속정보 제거, 환경변수 fail-fast, SELECT-only/단일문/read-only/timeout 적용
- [x] `.agent/scripts`까지 비밀정보 스캔 범위 확대
- [x] release를 main의 tag와 7개 필수 CI 검사 및 실제 컨테이너 push에 결속

### P1 — 정합성·복원력 강화

- [x] 사용자 일괄 상태·권한 변경의 `userId`/`esntlId` 혼용 정정
- [x] 비정형 결재 상세 BOLA 차단
- [x] SMS의 실제 전달/비가용 상태 분리 및 PII 로그 제거
- [x] 인증 저장소 장애를 자격증명 실패와 분리하고 비동기 포화·실패 상태를 명시
- [x] Hikari 평면 설정과 환경별 안전값을 린터로 고정
- [x] JaCoCo 실행 데이터 누락 시 실패하도록 false-green 차단 및 루트 커버리지 게이트 연결
- [x] multipart 최대 20개·파일당 10MiB·요청당 50MiB 설정과 코드 검증을 일치시킴

### P2/P3 — 프론트·공급망·문서 품질

- [x] 댓글 optimistic update rollback 및 응답 타입 정리
- [x] 날짜대 변환 helper, SSR props, 알림 응답 정규화 보강
- [x] `StandardDataTable`, `useAppForm`, Hub 아이콘/컴포넌트 타입·접근성·테스트 보강
- [x] 불투명 `bg-white` 직접 사용을 시맨틱 디자인 토큰으로 제거
- [x] Next proxy 파일 규약 및 Turbopack root 설정 정리
- [x] 번들 예산 스크립트와 CI 차단 게이트 추가
- [x] 고위험 공급망 취약점 해소 및 전체/운영 dependency audit 차단
- [x] 린트 경고 기준을 530 → 310으로 단계 강화하고 현재 307까지 감축
- [x] Vitest ESM 설정과 coverage 최소 기준을 문장 18%·분기 14%·함수 13%·라인 19%로 고정
- [x] 파일 업로드 확장자+실제 magic signature, 파일명/개수/크기, path traversal/symlink, 부분 저장/DB 실패 보상 방어

### Wave 2 — 프론트 계약·타입·회귀 탐지력 상향

- [x] 검색 사용자를 잘못된 Axios 응답 형태(`data.resultList`)로 읽던 결함을 `UserAdminService`의 실제 `PageResponse.list` 계약으로 정정
- [x] 검색·공통코드·메뉴·부서 트리에 계약/불변성 테스트 12개를 추가하고 트리 노드 판별 유니온으로 안전한 부모 관계를 고정
- [x] 프로덕션 `no-explicit-any`를 165 → 147건, `set-state-in-effect`를 동일 측정 기준 47 → 41건으로 감축
- [x] 이미 `dynamic(..., { ssr: false })`인 차트·에디터·온보딩 leaf에서 중복 mounted gate 6건 제거
- [x] Vitest 범위를 축소하지 않고 coverage를 20.09/15.82/14.96/20.63%로 올리고 최소 기준을 20/15/14/20%로 상향
- [x] ESLint 경고를 307 → 292건으로 줄이고 허용 상한을 310 → 295로 강화
- [x] 수동 mutation audit에서 검색 결과 절단 1건, 트리 부모 링크 훼손 3건, coverage/warning 래칫 완화 2건을 주입해 모두 red가 되는지 확인한 뒤 원복(6/6 탐지)
- [x] 하네스의 과거 임계값 정확 문자열 비교를 방향성 검사로 교정해 더 강한 coverage 하한·lint 상한은 허용하고 실제 완화만 차단

### Wave 3 — 소유권·업로더·로그 계약

- [x] 쪽지 읽기 컨트롤러에 인증 경계를 명시하고 타 사용자 발신/수신 relation ID 접근을 음성 테스트로 고정
- [x] 공용 파일 업로더의 14개 경계 테스트와 실제 결함·키보드/ARIA 회귀를 수정
- [x] 시스템·로그인·사용자·웹·개인정보 로그를 생성 OpenAPI DTO로 수렴하고 0/1-base 페이지·`pageUnit`·CSV 필드를 실제 API와 정렬
- [x] Vitest 80파일/408테스트, coverage 22/18/17/23 하한, PR #398·#399의 backend/frontend·mutation 10범위·E2E 3샤드 green 확인

### Wave 4 — Gradle 10 호환

- [x] Groovy space-assignment와 서브프로젝트 version-catalog 암묵 참조 폐기 경고 제거
- [x] 로컬 Makefile과 CI 검증 명령에 `--warning-mode fail --console=plain`을 적용해 재유입 차단
- [x] assemble 및 전 모듈 test를 warning fail 모드로 검증

### Wave 5 — CI 임계경로·캐시 호환·래칫

- [x] 산출물을 공유하지 않는 frontend/backend required check를 병렬 시작하고 E2E의 양쪽 cost gate는 유지
- [x] 성공 run 간 관측에서 후속 E2E fan-out 시작까지 **608초→428초(-180초, -29.6%)** 단축(PR #400 attempt 2 `31624861625` 대비 PR #401 최종 `31627566756`)
- [x] `frontendUnitTest`·`harnessTest`·대표 strict PIT의 Gradle configuration cache 저장/재사용과 문제 0 확인(전역 활성화는 보류)
- [x] Gradle 배포 서버 일시 장애가 실제로 드러낸 backend wrapper 확보 사각지대를 3회 제한 재시도와 계약 테스트로 봉합
- [x] 하드코딩 색 실제 census 104에 기준선을 맞추고 정확 일치 래칫으로 103건의 false-green 여유 제거
- [x] 구조 성숙도 문서의 E2E red·하네스 12종·RBAC 미전환·BaseCrud 스캐폴드 등 stale 서술 현행화

## 최종 검증 기록

### 백엔드

- `jacocoRootCoverageVerification --no-build-cache --no-daemon`: 성공
- 전체 결과: **2,008 tests, 실패 0, 오류 0, skip 2**
- JaCoCo: instruction **89.05%**, branch **77.09%**, line **90.07%**, method **86.92%**, class **90.09%**
- PostgreSQL 17 `schemaValidationTest`: 성공
- 최종 변경 하네스(`WorkflowManifestLinterTest`, `ConfigSafetyLinterTest`, `HarnessBaselineIntegrityTest`): 성공

### 프론트엔드

- Vitest: **80 files / 408 tests**, 전부 성공
- coverage: statements **22.94%**, branches **18.36%**, functions **17.80%**, lines **23.51%** — 고정 하한 22/18/17/23% 통과
- ESLint: 오류 **0**, 경고 **292** — 강화된 고정 상한 295 통과
- 앱 TypeScript(`tsc --noEmit`) 및 E2E TypeScript(`tsc -p tsconfig.e2e.json --noEmit`): 성공
- Next production build: 컴파일·타입 검사·**126개 페이지 생성** 성공
- 번들: JS gzip 합계 **2,100,708B / 2,250,000B**, 최대 **133,489B / 150,000B**; CSS gzip 합계 **35,156B / 40,000B**, 최대 **34,133B / 38,000B**
- `pnpm audit --audit-level high` 및 `--prod`: 알려진 취약점 0건

### 데이터·가드레일

- DB bridge: **9/9** 테스트 성공 — 다중문, DML/DDL, write CTE, lock, SELECT INTO, 부작용 함수, 불완전 문자열/주석 차단 포함
- 주요 red/green 증거: 알림 무권한/타 사용자 접근, 릴리스 필수 검사 누락, JaCoCo 실행 데이터 누락, multipart 11MiB 변조, 위장 실행파일·경로 이탈·DB 저장 실패 보상 시나리오가 각각 실패 후 수정으로 green 전환

### PR 통합 후속 검증

- PR #394의 첫 CI에서 aggregate 게이트 활성화가 foundation의 기존 클래스별 50% 규칙도 노출해 `PageResponse`, `AuditEvent`, `FullBeanNameGenerator`, `ThreadLocalCopyTaskDecorator`, `CustomUserDetailsService`, `Constants` 내부 그룹의 테스트 공백으로 red가 됐다.
- 임계값 완화나 제외 목록 추가 없이 해당 클래스의 행위 테스트를 보강했다.
- `:foundation:test :foundation:jacocoTestCoverageVerification --rerun-tasks --no-build-cache --no-daemon --no-parallel`: 성공. 실패 대상의 측정 가능 클래스는 line 80~100%로 올라갔고 클래스별 50% 게이트를 통과했다.
- 두 번째 CI는 Git에서 의도적으로 제외된 `application-local.yml`을 clean clone에서도 필수로 요구한 시크릿 린터와, 테스트 지원 스텁의 `/harness/` 경로를 새 게이트로 오인한 메타 린터 때문에 red가 됐다.
- 운영/E2E 필수 설정 검사는 그대로 유지하면서 local 전용 설정은 존재할 때만 엄격 검사하도록 clean-clone 계약 테스트를 추가했고, 테스트 스텁은 프로덕션 데코레이터의 패키지 전용 메서드 주입점으로 대체해 하네스 census 오인을 제거했다.
- 세 번째 CI(run `31576615022`)에서 `secret-scan`, backend, frontend, mutation scope 10/10 및 집계는 모두 성공했다. E2E 3개 샤드는 공통으로 `cleanup-db.ts`의 `import.meta`를 CommonJS로 읽지 못해 종료 단계가 red였고, 샤드 1/2에는 팝업 폼 reset·세션 만료 WebSocket 401·의도된 헤더 아이콘 VRT 변경이 추가로 드러났다.
- teardown은 Playwright의 실제 CommonJS 로더 계약에 맞춰 `require.main === module`로 복구했다. 팝업 폼 effect는 매 렌더마다 새로 생기는 wrapper 대신 안정적인 `reset` 함수에만 의존하게 했고, 세션 만료 테스트는 해당 테스트에서만 `/ws/info` 401을 예상 오류로 한정했다. VRT는 CI 실제 이미지의 유일한 차이가 정상 복구된 28×28 `LayoutDashboard` 아이콘임을 픽셀/이미지로 확인한 뒤 Linux 기준선을 갱신했다.
- 로컬 재검증: Vitest 4/4, 앱·E2E TypeScript, 변경 파일 ESLint 오류 0, 임시 Playwright 스모크 1/1 및 실제 globalTeardown 로드 성공. 스모크 파일은 검증 직후 제거했다.

## 남은 개선 우선순위

| 순위 | 잔여 과제 | 기대 효과 | 선행 조건/이유 |
|---:|---|---|---|
| 1 | 읽기 인가 census 30건·클래스 면제 12건 판정 | BOLA/IDOR 잔여 제거 | 도메인별 공개성·소유권 의미 확인 필요 |
| 2 | 프론트 coverage 30/25/25/30 이상 | 회귀 탐지·타입 안정성 | 인증·admin mutation·업로드·로그부터 점진 래칫 |
| 3 | 입력 DTO 길이·enum 표적 미러 게이트 | DB→API 의미 계약 강화 | `@Column(length=)` 536 vs `@Size` 393 직접 대응 census |
| 4 | i18n과 survey/community core 귀속 결정 | 템플릿 재사용성·제품 경계 확정 | 다국어 파일럿/단일언어, core/app 제품 결정 필요 |
| 5 | 수동 PK 50엔티티와 eGov 암호 호환 단계 축소 | BE 단순성·키관리 개선 | 주소록 2종 V2_49부터 포상관리 V2_61까지 13개 엔티티 전환 완료. Template은 자연키 유지로 재판정. 상세 증적과 다음 순서는 20260813 BIGINT PK 실행 원장을 따른다. |
| 6 | 외부 AV/CDR·운영 배포·백업복구·DR 실증 | 저장소 밖 운영 위험 검증 | 외부 인프라와 운영 상태 변경 승인 필요 |

## 재개 규칙

다음 루프는 1) 잔여 과제 중 저장소 내부에서 독립 실행 가능한 항목을 선택하고, 2) 대상 red 테스트를 먼저 고정하며, 3) 최소 변경으로 green 전환하고, 4) 관련 하네스와 전체 게이트를 실행한 뒤, 5) 이 원장의 증거와 점수를 갱신한다. 운영 DB·배포·자격증명·외부 인프라 변경은 자동 진행 범위에서 계속 제외한다.

## 보존 확인

- 사용자 기존 WIP `frontend/src/hooks/useAppForm.ts`, `frontend/src/hooks/__tests__/useAppForm.test.tsx`, `frontend/src/types/generated-api.d.ts`는 의미 diff가 없음을 확인했고 커밋 대상에서 제외한 채 그대로 남겨 두었다.
- 보호된 프론트 constitution의 `middleware.ts` 경로 표기 2곳은 명시 승인 없이는 바꿀 수 없어 보존했다. 이미 적용된 Flyway `V2_36`의 같은 역사적 주석도 checksum 불변 원칙 때문에 수정하지 않았다. 실행 코드와 일반 주석은 `frontend/src/proxy.ts`로 동기화했다.
- PR #394와 #396~#401은 필수 검사를 통과해 `main`에 병합했다. #401 최종 run `31627566756`은 최신 `main` 재배치 후 18/18 jobs·required 7/7이 성공했다. 이 원장과 색상 exact 래칫은 동일한 최종 PR에 포함하며, 상단의 완료 조건으로 통합 상태를 판정한다. 운영 배포·운영 DB 변경은 수행하지 않았다.
