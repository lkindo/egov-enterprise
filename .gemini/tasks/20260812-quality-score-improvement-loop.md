# 프로젝트 완성도 개선 루프 — 완료 원장

> 상태: 2026-08-12 개선 Wave 완료
> 결과: 저장소 증거 기반 위험 가중 점수 **70.3/100 → 90.5/100**
> 주의: 이 점수는 코드·테스트·설정·CI 증거를 평가한 값이며, 운영 배포 인증이나 실제 DR 복구 성공을 의미하지 않는다.

## 운영 경계

- 사용자는 저장소 내부의 분석·개선·검증 작업에 포괄 진행 승인을 부여했다.
- 운영 DB DML/DDL, 실제 자격증명 회전, 배포·외부 발행은 별도 명시 승인 없이 수행하지 않았다.
- `GEMINI.md` 및 백엔드·프론트엔드·DB constitution은 수정하지 않았다.
- 기존 사용자 WIP인 `frontend/src/types/generated-api.d.ts`, `frontend/src/types/generated-zod.ts`는 보존했다.
- Gradle 실행은 한 번에 하나만 수행했고, 테스트 skip·예외목록 확대·임계값 완화로 실패 신호를 숨기지 않았다.

## 점수 산정 방식

종합점수는 `Σ(세부분야 점수 × 위험 가중치) / 100`으로 계산했다. 보안·개인정보, 백엔드/API, DB·데이터, 테스트 게이트에 더 높은 가중치를 부여했다.

| 세부분야 | 가중치 | 개선 전 | 개선 후 | 증감 | 핵심 증거 |
|---|---:|---:|---:|---:|---|
| 백엔드/API | 12% | 74 | 92 | +18 | 알림 소유권 결속, 결재 BOLA 차단, 사용자 식별자 축 정정, 예외 계약 보강 |
| 보안·개인정보 | 14% | 58 | 93 | +35 | WS 인증·구독 권한·Origin 방어, 비밀정보 제거/스캔, 업로드 시그니처·경로 방어 |
| 백엔드 신뢰성·성능 | 9% | 68 | 91 | +23 | 비동기 포화/실패 상태, 인증 인프라 장애 분류, Hikari 정규화, 저장 실패 보상 |
| 프론트 아키텍처 | 9% | 73 | 89 | +16 | 중복 WS 연결 제거, Next proxy 전환, SSR/hydration·mutation rollback·폼 타입 정리 |
| UX·접근성 | 8% | 67 | 86 | +19 | 테이블 키보드/ARIA, 대시보드 입력·제스처, 시맨틱 색상·공용 Hub 컴포넌트 보강 |
| 프론트 보안·계약 | 8% | 83 | 94 | +11 | 공개 사용자 토픽 제거, 알림 정규화, 인증 proxy 회귀 테스트, 타입 계약 강화 |
| 프론트 성능 | 7% | 70 | 86 | +16 | 프로덕션 빌드, 고정 gzip 번들 예산, 중복 구독 제거, PPR 빌드 안정화 |
| DB·데이터 거버넌스 | 10% | 68 | 88 | +20 | 환경변수 fail-fast, SELECT-only 단일문 DB bridge, read-only/timeout, PostgreSQL 17 스키마 검증 |
| 테스트·품질 게이트 | 10% | 79 | 93 | +14 | JaCoCo false-green 차단, 명시 입력, FE coverage 하한, 설정·워크플로·비밀정보 린터 |
| CI/CD·운영 | 8% | 73 | 94 | +21 | main tag 릴리스 결속, 7개 필수 검사, 실제 이미지 push, 운영 의존성 감사 차단 |
| 문서·DX·재사용성 | 5% | 64 | 84 | +20 | 오케스트레이션/보안/결정 문서 동기화, 공용 테이블·Hub·날짜 유틸 정리 |
| **위험 가중 종합** | **100%** | **70.3** | **90.5** | **+20.2** | `9050 / 100` |

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

## 최종 검증 기록

### 백엔드

- `jacocoRootCoverageVerification --no-build-cache --no-daemon`: 성공
- 전체 결과: **2,008 tests, 실패 0, 오류 0, skip 2**
- JaCoCo: instruction **89.05%**, branch **77.09%**, line **90.07%**, method **86.92%**, class **90.09%**
- PostgreSQL 17 `schemaValidationTest`: 성공
- 최종 변경 하네스(`WorkflowManifestLinterTest`, `ConfigSafetyLinterTest`, `HarnessBaselineIntegrityTest`): 성공

### 프론트엔드

- Vitest: **70 files / 359 tests**, 전부 성공
- coverage: statements **18.60%**, branches **14.89%**, functions **13.95%**, lines **19.19%**
- ESLint: 오류 **0**, 경고 **307** — 고정 상한 310 통과
- E2E TypeScript: 성공
- Next production build: 컴파일·타입 검사·**126개 페이지 생성** 성공
- 번들: JS gzip 합계 **2,100,756B / 2,250,000B**, 최대 **133,566B / 150,000B**; CSS gzip 합계 **35,156B / 40,000B**, 최대 **34,133B / 38,000B**
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

## 남은 개선 우선순위

| 순위 | 잔여 과제 | 기대 효과 | 선행 조건/이유 |
|---:|---|---|---|
| 1 | 업로드 파일 외부 AV/CDR 검사와 격리 저장소 도입 | 악성 문서·매크로·압축폭탄 대응 | 스캐너/오브젝트 스토리지 인프라와 제품 정책 결정 필요 |
| 2 | 실제 배포 스택 E2E, Lighthouse/axe, 백업 복구·DR 리허설 | 저장소 밖의 런타임·접근성·복구 증거 확보 | 실행 환경과 테스트 데이터, 운영성 작업 승인 필요 |
| 3 | 프론트 커버리지 30% 이상 및 `any` 194건·effect 내 동기 상태변경 47건 감축 | 회귀 탐지·타입 안정성·렌더 성능 향상 | 화면군별 점진적 리팩터링 권장 |
| 4 | CSP `unsafe-inline` 제거와 nonce/hash를 PPR 정책에 맞게 확정 | XSS 방어의 마지막 큰 잔여 위험 축소 | 렌더링/캐시 정책에 대한 제품·아키텍처 결정 필요 |
| 5 | 실제 자격증명 회전, 운영 release/deploy, 복구 검증 | 운영 통제 완결 | 외부 상태를 바꾸므로 사용자 명시 승인 필요 |
| 6 | Gradle 10 비호환 deprecation 제거 및 configuration cache 검토 | 장기 빌드 호환성과 속도 개선 | 플러그인/빌드 스크립트별 경고 분해 필요 |

## 재개 규칙

다음 루프는 1) 잔여 과제 중 저장소 내부에서 독립 실행 가능한 항목을 선택하고, 2) 대상 red 테스트를 먼저 고정하며, 3) 최소 변경으로 green 전환하고, 4) 관련 하네스와 전체 게이트를 실행한 뒤, 5) 이 원장의 증거와 점수를 갱신한다. 운영 DB·배포·자격증명·외부 인프라 변경은 자동 진행 범위에서 계속 제외한다.

## 보존 확인

- 사용자 기존 WIP `frontend/src/types/generated-api.d.ts`, `frontend/src/types/generated-zod.ts`는 수정 대상으로 삼지 않았고 그대로 남겨 두었다.
- 보호된 프론트 constitution의 `middleware.ts` 경로 표기 2곳은 명시 승인 없이는 바꿀 수 없어 보존했다. 이미 적용된 Flyway `V2_36`의 같은 역사적 주석도 checksum 불변 원칙 때문에 수정하지 않았다. 실행 코드와 일반 주석은 `frontend/src/proxy.ts`로 동기화했다.
- 커밋·배포·운영 DB 변경은 수행하지 않았다.
