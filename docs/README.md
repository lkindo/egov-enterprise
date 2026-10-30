# 문서 인덱스 (Documentation Index)

이 파일은 `docs/` 전체의 **단일 진입점**이다. 현행 정본과 비정본 역사 자료를 분리해 표시하며, 저장소에 남아 있는 문서는 여기서 도달할 수 있어야 한다.

> **분류 규칙**([AGENTS.md](../AGENTS.md#documentation-and-memory)): `01-product/`(기획) · `02-architecture/`(설계) · `03-guides/`(개발 지침) · `04-operations/`(운영) · `archived/`(구버전 보관). 파일명은 **`kebab-case.md`**. 새 문서를 추가하면 **이 인덱스에도 한 줄 추가**한다.

---

## 🧭 어디부터 읽나

| 상황 | 문서 |
|---|---|
| 이 프레임워크로 **새 프로젝트를 시작**한다 | [getting-started.md](03-guides/getting-started.md) — 온보딩 런북 |
| **에이전트로 작업**한다(작업 등급·승인·검증 절차) | [orchestration-protocol.md](03-guides/orchestration-protocol.md) — SOP |
| **테스트를 쓴다** | [testing-guide.md](03-guides/testing-guide.md) (SSOT) → [e2e-test-guide.md](03-guides/e2e-test-guide.md) |
| **게이트가 red 인데 원인을 모른다** | [verification-blindspots.md](04-operations/verification-blindspots.md) · [.githooks/README.md](../.githooks/README.md) |
| **DB 객체를 설계**한다 | [db-standardization-manual.md](03-guides/db-standardization-manual.md) → [DB 헌법](../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) |

> **규범의 SSOT 는 `docs/` 가 아니다.** 프로젝트 공통 규칙은 [AGENTS.md](../AGENTS.md), 코드 규범은 3대 헌법([백엔드](../.agent/knowledge/backend-api-constitution/artifacts/constitution.md) 18조 · [프론트엔드](../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) 17조 · [DB](../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) 10조)이 우선하며, `docs/` 는 이를 실무에 적용하는 가이드다.

> **에이전트 규칙 로드 경계**: 도구별 진입점과 글로벌 규칙의 로드 경계는 [AGENTS.md](../AGENTS.md#도구별-진입점)가 정본이다.

---

## 01-product — 기획

[01-product/README.md](01-product/README.md) — 현행 제품 정의의 상태와 이력 원본 위치.

[ui-ux-modernization-brief.md](01-product/ui-ux-modernization-brief.md) — 참조 구현·재사용 base의 adopter/end-user 분리 제품 brief와 사용자 연구 protocol(승인 전 Draft).

[information-architecture.md](01-product/information-architecture.md) — ADR-0007의 참조-기본 IA와 route disposition 경계. 개인정보성 업무 검색어의 현행 URL 정책은 ADR-0009가 규율한다. 별도의 비규범 `class-governed` 컨테이너에는 4개 부류의 독립 승인 기록과 3개 미해결 부류가 있다.

[migration-workspace-design.md](01-product/migration-workspace-design.md) — 승인된 독립 로컬 이관 작업공간 설계와 합성 시뮬레이션(A1~A8, ADR-0041).


## 02-architecture — 설계

승인 정책: [ADR-0045](02-architecture/decisions/ADR-0045-bookmark-cleanup-input-policy-and-memo-read-consistency.md) — 즐겨찾기 정리·입력 검증·메모 지시의 내용 기준.

| 문서 | 내용 |
|---|---|
| [backend-architecture.md](02-architecture/backend-architecture.md) | Backend Architecture Blueprint — 멀티모듈 구조·레이어 |
| [project-composer-design.md](02-architecture/project-composer-design.md) | 선택형 프로젝트 생성 설계 — 공통 구성·PostgreSQL·멀티/단일모듈 출력과 업무 선택·로컬 UI의 단계별 완료조건 |
| [frontend-architecture.md](02-architecture/frontend-architecture.md) | Frontend Architecture (Next.js App Router 기준) |
| [frontend-design-system.md](02-architecture/frontend-design-system.md) | Design System |
| [approval-workflow-ux.md](02-architecture/approval-workflow-ux.md) | 다단계·병렬 전원 결재의 UX 근거, 차수·회수·재상신·열람 규칙 |
| [krds-profile-mapping.md](02-architecture/krds-profile-mapping.md) | KRDS 공식 자산과 standard/aligned/premium 프로필의 채택·조정·보류 매핑(승인 전 Draft) |
| [ui-ux-modernization-plan.md](02-architecture/ui-ux-modernization-plan.md) | Claude 원안의 적대적 재검토와 사용자 과업 중심 UI/UX 전면 현대화 실행 계획 |
| [work-screen-grammar-catalog.md](02-architecture/work-screen-grammar-catalog.md) | 포털형→업무형 전환의 화면 문법 SSOT — 공통 규칙 G1~G15·archetype 8종·밀도 계약(globals.css 결속) |
| [url-state-approval-overlay-design.md](02-architecture/url-state-approval-overlay-design.md) | 비규범 `class-governed` URL-state 부류 컨테이너의 설계·운영 계약 — 4개 부류의 독립 승인 기록을 관리하며 `search-input`만 ADR-0009에 결속 |
| [authorization-simplification-design.md](02-architecture/authorization-simplification-design.md) | 인가 핵심 3개·감사 1개, 복수 그룹·명시 기능·API·전환 전 소스 및 OCI 조사 범위 |
| [domain-resilience.md](02-architecture/domain-resilience.md) | 도메인 보안 및 회복탄력성 |
| [testing-process-redesign.md](02-architecture/testing-process-redesign.md) | 테스트 책임·격리 설계와 이행 근거; 현재 명령·CI 설정은 테스트·E2E·CI 가이드 참조 |
| [jpa-performance-guardrail.md](02-architecture/jpa-performance-guardrail.md) | JPA N+1 쿼리 가드레일 |
| [zero-downtime-migration.md](02-architecture/zero-downtime-migration.md) | 무중단 배포 4단계 이행 및 DDL 린터 |
| [user-reference-key-policy.md](02-architecture/user-reference-key-policy.md) | 사용자 참조 키 규약 |
| [db-naming-exceptions.md](02-architecture/db-naming-exceptions.md) | DB 명명 표준 **예외 대장** |
| [legacy-migration-tool-design.md](02-architecture/legacy-migration-tool-design.md) | 다중 source→PostgreSQL 승인형 offline 이관 도구 설계·운영 경계 |
| [pitest-mutation-testing.md](02-architecture/pitest-mutation-testing.md) | PITest Mutation Testing 연동 설계(스코프별 전체 재계산) |
| [board-management-expansion-design.md](02-architecture/board-management-expansion-design.md) | 게시판 운영 관리 확장 설계(확정, 구현 완료) — 운영 화면·사용 안 함 게시판·예약·정렬·상단 고정·설정·메뉴 연결 판정, 배치별 계약·검증, 후속 설계 선행 조건(ADR-0040) |

### 02-architecture 참조 보존 tombstone

아래 문서는 적용된 Flyway의 immutable 주석이 특정 절을 참조하므로 최소 근거만 남긴다. 현행 판단에는 대체 정본을 사용한다.

| 문서 | 상태 | 대체 정본 |
|---|---|---|
| [db-standardization-assessment.md](02-architecture/db-standardization-assessment.md) | tombstone 유지 | 적용된 Flyway 주석의 immutable 참조; DB 헌법·예외 대장·live metadata로 대체 |
| [a-group-decision-recommendations.md](02-architecture/a-group-decision-recommendations.md) | tombstone 유지 | 적용된 `V2_32` 주석의 immutable 참조; [pending-decisions.md](04-operations/pending-decisions.md)로 대체 |

### 02-architecture/decisions — ADR

ADR 목록·상태·작성 규약은 [decisions/README.md](02-architecture/decisions/README.md)가 정본이다. Accepted ADR의 행은 [공용 결정 인덱스](../.agent/memory/decisions.md)(어느 경로를 고치든 걸리는 것)와 그 「영역 결정 색인」 표가 가리키는 영역 색인(나머지)이 겹치지 않게 나눠 갖고, 공용 결정 인덱스는 나머지의 ID·제목도 영역별로 싣는다. 계약이 둘의 합을 ADR 색인과 대조한다.

## 03-guides — 개발 지침

| 문서 | 내용 |
|---|---|
| [getting-started.md](03-guides/getting-started.md) | **온보딩 런북** — 새 프로젝트 시작 |
| [orchestration-protocol.md](03-guides/orchestration-protocol.md) | **SOP** — 작업 등급·위임·감사·증거 기반 검증 |
| [harness-improvement-pilot.md](03-guides/harness-improvement-pilot.md) | 스킬 정합·통합 하네스 중복 판단·관측용 실행 기록과 시각 회귀 행동 평가 1건의 범위 |
| [governance-atlas-guide.md](03-guides/governance-atlas-guide.md) | Atlas 읽기·소스 생성·현행화·검증 및 증거 경계 |
| [design-to-deliverables-guide.md](03-guides/design-to-deliverables-guide.md) | 설계 검토 예산·패턴 갤러리·토큰 키트·등록 점검기·감리·검수 입력 자료 초안 내보내기의 쓰임과 증거 경계, 공공 SW 규범 대응 |
| [governance-review-lifecycle.md](03-guides/governance-review-lifecycle.md) | 실제 시계 검토 보고, 기관 도입 preflight, 프로필 원장·메모리 투영과 무결성, 독립 이관 검증 |
| [testing-guide.md](03-guides/testing-guide.md) | **테스트 SSOT** — 단위/통합/E2E 전략 |
| [e2e-test-guide.md](03-guides/e2e-test-guide.md) | E2E 운영 Runbook |
| [non-e2e-verification-guide.md](03-guides/non-e2e-verification-guide.md) | E2E 범위 밖 기능의 정밀 검증 |
| [cicd-pipeline.md](03-guides/cicd-pipeline.md) | CI/CD 파이프라인 |
| [api-documentation-guide.md](03-guides/api-documentation-guide.md) | API 설계·문서화 (OpenAPI) |
| [db-standardization-manual.md](03-guides/db-standardization-manual.md) | DB 표준화·거버넌스 매뉴얼 |
| [legacy-non-data-migration-guide.md](03-guides/legacy-non-data-migration-guide.md) | 레거시 이관의 권한·메뉴·첨부·시퀀스·공통코드·암호 컬럼 등 비데이터 객체 처리 절차 |
| [migration-workspace-guide.md](03-guides/migration-workspace-guide.md) | 로컬 이관 작업공간 실행기 시작(실행 비밀 주소), 연결·소스·검토·실행 순서, 결과 불명 작업 확인, AI 설정·전송 기록과 현재 한계(ADR-0041) |
| [identity-model-guide.md](03-guides/identity-model-guide.md) | 정체성 모델 사용 규약 |
| [security-hardening-playbook.md](03-guides/security-hardening-playbook.md) | 보안 강화·인증 플레이북 |
| [cross-cutting-conventions.md](03-guides/cross-cutting-conventions.md) | 횡단관심사 관례 |
| [design-tokens.md](03-guides/design-tokens.md) | 디자인 토큰 & 브랜딩 규약 (+ 색 하드코딩 게이트) |
| [frontend-content-style.md](03-guides/frontend-content-style.md) | 한국어 우선 UI 문구·오류·복구·도메인 용어 계약 |
| [frontend-form-validation-loop.md](03-guides/frontend-form-validation-loop.md) | 입력·수정 화면의 제약 보존, 오류 위치 이동, 서버 field error, 중복 제출 잠금과 exact census 운영 루프 |
| [ui-ux-task-flow-optimization.md](03-guides/ui-ux-task-flow-optimization.md) | 로그인·공통 셸·편집 이동 보호·지식 탐색·게시판 부분 성공·설문 결과 선택, 관리 콘솔의 메뉴 관리·화면 관리·권한 작업대의 현재 구현과 검증 경계 |
| [content-operations-guide.md](03-guides/content-operations-guide.md) | 운영자·도입 담당자용 콘텐츠 운영 안내 — 콘텐츠 종류별 관리 화면과 메뉴 위치, 콘텐츠 페이지 작성·게시·게시 중지·보관·삭제, 작성자·게시자 분담, 개인정보 오게시 사고 대응(파기), 첨부 규칙, 게시판 공개 절차·설정 변경 영향·지정 게시판·정정 절차(ADR-0039·ADR-0042·ADR-0040·ADR-0043) |
| [reusable-base-guide.md](03-guides/reusable-base-guide.md) | 릴리스 생성과 시작 구성 다섯의 DB·소스 기술 검증, 근거 투영·기관 도입 경계 |
| [project-composer-guide.md](03-guides/project-composer-guide.md) | 로컬 UI·recipe로 도메인과 출력 구조를 선택하여 독립 PostgreSQL 프로젝트 생성 |

## 04-operations — 운영

[SAST 오탐 예외 검토 결과](04-operations/sast-findings-review.md)는 시큐어코딩 분석의 소스 근거와 승인된 한정 예외를 기록한다.

| 문서 | 내용 |
|---|---|
| [verification-blindspots.md](04-operations/verification-blindspots.md) | **검증 사각지대** — "빌드 성공"과 "실제 작동"의 차이 |
| [secure-coding-weakness-baseline.md](04-operations/secure-coding-weakness-baseline.md) | 행안부 구현단계 보안약점 49개를 CWE·OWASP·현재 탐지 수단과 대응시킨 사전 점검 기준선(공식 진단을 대신하지 않음) |
| [pending-decisions.md](04-operations/pending-decisions.md) | 사용자 결정 대기 항목 트래커 |
| [operational-decisions-index-ci-governance.md](04-operations/operational-decisions-index-ci-governance.md) | CI·훅·게이트·계약·원장·검증 도구 경로에 걸리는 현재 운영 결정의 영역 색인 — 자동 로드하지 않으며 읽는 조건은 [공용 결정 인덱스](../.agent/memory/decisions.md)의 「영역 결정 색인」 표 |
| [operational-decisions-index-composer.md](04-operations/operational-decisions-index-composer.md) | 프로젝트 생성기·기능 소유·슬롯·재사용 투영 경로에 걸리는 현재 운영 결정의 영역 색인 — 자동 로드하지 않으며 읽는 조건은 [공용 결정 인덱스](../.agent/memory/decisions.md)의 「영역 결정 색인」 표 |
| [operational-decisions-index-migration.md](04-operations/operational-decisions-index-migration.md) | 독립 이관 도구(migration-tool)와 로컬 이관 작업공간에 걸리는 현재 운영 결정의 영역 색인 — 자동 로드하지 않으며 읽는 조건은 [공용 결정 인덱스](../.agent/memory/decisions.md)의 「영역 결정 색인」 표 |
| [operational-decisions-index-product.md](04-operations/operational-decisions-index-product.md) | 제품 백엔드·화면·스키마·권한 원장·운영 배포 경로에 걸리는 현재 운영 결정의 영역 색인 — 자동 로드하지 않으며 읽는 조건은 [공용 결정 인덱스](../.agent/memory/decisions.md)의 「영역 결정 색인」 표 |
| [known-gaps-detail.md](04-operations/known-gaps-detail.md) | 특정 경로에서만 필요한 미해결 위험(gap) 행의 영역별 전문 — 자동 로드하지 않으며 레지스트리와 읽는 조건은 [공용 gap 인덱스](../.agent/memory/known-gaps.md)의 「영역 상세 gap 레지스트리」 |
| [url-state-class-approval-evidence.md](04-operations/url-state-class-approval-evidence.md) | URL-state 부류별 owner 승인 근거와 현재 판정 — 비규범 컨테이너 안의 4개 독립 승인(`search-input`만 ADR-0009 `accepted-risk`), 3개 미해결 |
| [ui-ux-baseline-protocol.md](04-operations/ui-ux-baseline-protocol.md) | 긴급 수리 후·파일럿 전 8개 대표 시나리오 reference baseline·접근성·성능·증거 수집 프로토콜 |
| [ui-quality-assisted-accessibility.md](04-operations/ui-quality-assisted-accessibility.md) | 수동 접근성 평가를 대체하지 않는 keyboard·viewport·forced-colors·reduced-motion 자동 보조 증거 |
| [ui-ux-modernization-user-action-runbook.md](04-operations/ui-ux-modernization-user-action-runbook.md) | 자동화 완료 후 사용자·제품·운영 책임자가 남은 작업을 한 단계씩 검증·승인하는 마감 런북 |
| [backup-and-restore-runbook.md](04-operations/backup-and-restore-runbook.md) | DB·첨부 실물·암호화 키를 한 세트로 백업/복원하는 절차, 복원 확인, 주기·보존·RTO/RPO 의 템플릿 권장 시작값, 복원 훈련 도구와 기록 양식(실제 값·증거는 기관 몫) |
| [durable-work-recovery.md](04-operations/durable-work-recovery.md) | 후속 작업 상태·시도 한도·감사와 결속한 재처리, 교체 파일 보호와 중단 후 재개 |
| [sms-provider-operations.md](04-operations/sms-provider-operations.md) | SENS 설정, 접수·최종 전달 구분과 불확실한 발송의 재전송 방지 |
| [mfa-operations.md](04-operations/mfa-operations.md) | TOTP 등록·로그인·분실 복구, 키 설정·백업, 세션 폐기·감사와 보호계정 단계 적용 경계 |
| [authorization-cutover-runbook.md](04-operations/authorization-cutover-runbook.md) | 구 writer 중지·백업·V2_98/99·검증·수동 Contract·새 앱 기동 및 복구 경계 |
| [migration-recovery-runbook.md](04-operations/migration-recovery-runbook.md) | 대상 DB 환경 결속·스키마 허용 목록·실행 증거·부분 적재 재개·백업을 통한 전체 롤백 |
| [migration-release-log.md](04-operations/migration-release-log.md) | 마이그레이션이 어느 릴리스로 언제 배포됐는지의 기록 — Contract waiver의 선행 Expand 관측 기간 근거 |
| [shared-oci-migration-apply-log.md](04-operations/shared-oci-migration-apply-log.md) | 공유 OCI DB에 마이그레이션을 적용한 기록 — 승인 요지·병합 PR·사전 읽기·백업·validate·확인·롤백 원본, 이전 DEC 기록 색인 |
| [crypto-key-rotation.md](04-operations/crypto-key-rotation.md) | 암호화 마스터 키 로테이션·PII 재암호화 런북 |
| [log-retention-policy.md](04-operations/log-retention-policy.md) | 로그 보존기간·개인정보 파기 정책 |
| [observability-baseline.md](04-operations/observability-baseline.md) | 요청·첨부 점검·영속 작업 상태 지표, 9개 경보와 실제 promtool 시간 흐름 검증 |
| [database-optimization-guide.md](04-operations/database-optimization-guide.md) | DB 최적화 |
| [performance-optimization-guide.md](04-operations/performance-optimization-guide.md) | 성능 최적화 |
| [load-test-guide.md](04-operations/load-test-guide.md) | k6 부하 테스트 |
| [dependabot-alert-census.md](04-operations/dependabot-alert-census.md) | 의존성 취약점 판정 절차 |
| [readiness-followups.md](04-operations/readiness-followups.md) | 운영 후속 실측 기록 — 날짜 입력·화면 연결·첨부 점검·혼합 부하, 이관 vendor 리허설(Oracle·MySQL·MariaDB·SQL Server·CUBRID·표준화), IP 신뢰 경계, Spring Boot 4 실측, ZAP 경고 분류, 도메인 정합성, 프록시 연결 경합 |
| [project-evaluation-adversarial-review-2026-10-21.md](04-operations/project-evaluation-adversarial-review-2026-10-21.md) | Gemini 상세 품질평가 재검토 — 98.3점의 증거 한계, 코드와 충돌하는 주장, 개선안 14개 판정과 후속 우선순위 |
| [standard-metadata-disposition.md](04-operations/standard-metadata-disposition.md) | 표준 용어가 없거나 도메인과 물리 타입이 다른 컬럼마다 등록·정정·예외 처분 후보와 승인 단위(GAP-STD-001, 승인 전 검토 자료) |
| [project-safe-deletion-analysis.md](04-operations/project-safe-deletion-analysis.md) | 프레임워크 간접 소비를 포함한 안전 삭제 절차 |
| [adopter-baseline-refreeze.md](04-operations/adopter-baseline-refreeze.md) | 파생 제품(adopter)이 base 채택 후 밀도·브랜드·래칫 기준선을 자기 실측으로 재동결하는 절차 (D10) |

## archived — 구버전 보관

> 아래는 **더 이상 현행이 아니다.** 현행 상태를 판단하는 근거로 쓰지 말 것.

| 문서 | 내용 |
|---|---|
| [PRD.MD](archived/PRD.MD) | 초기 제품 요구의 역사 원본 — 대체 PRD 확정 전 보존 또는 tombstone 축약 |
| [TRD.MD](archived/TRD.MD) | 초기 기술 요구 역사 원본 — PRD와 함께 보존 여부 결정 |
| [url-state-classification-draft.md](archived/url-state-classification-draft.md) | ADR-0009 이전 URL-state 분류의 **역사적 결정 입력물**. 검색어 절대 금지·보류 제안은 현행 정책이 아니다. |
| [governance-atlas-improvement-plan.md](archived/governance-atlas-improvement-plan.md) | Atlas 보강 조사·설계·적용 결과와 검증 경계 |
| [source-simplification-audit-2026-10-06.md](archived/source-simplification-audit-2026-10-06.md) | 전체 소스 정적 조사 — 미사용·중복·레거시·비표준·복잡도 정비 후보 29개와 근거·검증·실행 순서 |
| [source-simplification-results-2026-10-06.md](archived/source-simplification-results-2026-10-06.md) | 조사 후 순차 정비 — 변경 범위·입력 호환성·조회 수·검증 결과와 남은 경계 |
| [source-simplification-recheck-2026-10-07.md](archived/source-simplification-recheck-2026-10-07.md) | PR #846 재검증과 추가 전수 정비 — 부서 트리 회귀 수정, 6단계 정비 범위·바뀐 동작·남긴 것과 검증 결과 |
| [url-state-privacy-classification-draft.md](archived/url-state-privacy-classification-draft.md) | ADR-0009 이전 URL-state 프라이버시 분류의 **역사적 초안** — 현행 검색 정책은 ADR-0009, 부류별 검토 상태는 비규범 `class-governed` 컨테이너를 확인 |
| [erp-transformation-master-plan.html](archived/erp-transformation-master-plan.html) | 공통 프레임워크 × ERP·공공 업무시스템 전환 6단계 마스터플랜(2026-08-23, 결정 D1~D10 포함) |
| [dual-operator-coordination.md](archived/dual-operator-coordination.md) | 레거시 Gemini↔Claude 실시간 조정 설계(구현 보류); 현행 다중 operator 공통 계약은 [AGENTS.md](../AGENTS.md) |
| [evidence-first-improvement-loop-prompt.md](archived/evidence-first-improvement-loop-prompt.md) | 분야·도메인 재평가의 결함을 승인 범위·부정 검증·종료 조건에 따라 개선하는 실행 프롬프트 |
| [adversarial-reassessment-2026-09-27.md](archived/adversarial-reassessment-2026-09-27.md) | 0ef8af32f 기준 Claude 평가의 수용·반박, 11개 분야·33개 도메인 잠정 평가와 개선 배치 |
| [evidence-first-policy-decisions-2026-09-27.md](archived/evidence-first-policy-decisions-2026-09-27.md) | 개선 루프 R4 권한·공개 범위와 R6 삭제 단위의 당시 선택지 — ADR-0025가 결정한 **결정 입력물** |
| [authorization-source-inventory.json](archived/authorization-source-inventory.json) | 인가 전환 전 권한 관련 소스 검색·참조 확장 스냅샷 887개(2026-09-10); 현재 파일 목록이 아님 |
| [authorization-db-evidence.json](archived/authorization-db-evidence.json) | 인가 전환 설계의 2026-09-10 OCI 읽기 전용 스키마·행 수·표준 메타 증거; 전환 실행 증거가 아님 |
| [standard-length-alignment-runbook.md](archived/standard-length-alignment-runbook.md) | ADR-0013·0014 표준 길이 정합의 단계별 전환·실패·복구 검증 기록(적용 완료) |
| [legacy-standardization-migration-design.md](archived/legacy-standardization-migration-design.md) | 레거시 표준화 이관의 채택 전 진단(2026-10-13)과 표준용어 식별 방법론 — [ADR-0029](02-architecture/decisions/ADR-0029-legacy-standardization-migration.md)·0031로 채택, 현행 동작은 이관 도구 설계 |

### 운영 결정 원문 보존

[operational-decisions-history.md](archived/operational-decisions-history.md)는 [공용 결정 인덱스](../.agent/memory/decisions.md)와 영역 결정 색인이 가리키는 기존 운영 결정 전문과 종료 gap 근거다. 위치 이동은 승인 취소를 뜻하지 않는다. 결정의 현재 효력은 후속 ADR과 `supersedes`를 함께 확인하며, 당시 실행 결과·수치를 현재 상태로 사용하지 않는다.

[operational-decisions-index-historical.md](archived/operational-decisions-index-historical.md)는 지금의 작업을 제약하지 않는 운영 결정(퇴역·전부 대체·일회성 실행·구현 기록)의 짧은 역사 색인이다. 공용 결정 인덱스·영역 결정 색인과 함께 보관 원문의 모든 DEC를 한 번씩 색인하며, 에이전트 진입점은 자동으로 읽지 않는다.

---

## 📌 docs 밖 주요 문서

| 문서 | 위치 |
|---|---|
| 프로젝트 개요·설치·실행 | [README.md](../README.md) |
| 공통 프로젝트 규칙 SSOT | [AGENTS.md](../AGENTS.md) |
| Gemini 자동 로드 어댑터 | [GEMINI.md](../GEMINI.md) |
| Claude Code 자동 로드 어댑터 | [CLAUDE.md](../CLAUDE.md) |
| 공용 프로젝트 컨텍스트 | [.agent/memory/project-context.md](../.agent/memory/project-context.md) |
| 공용 결정 인덱스 | [.agent/memory/decisions.md](../.agent/memory/decisions.md) |
| 공용 활성 gap 인덱스 | [.agent/memory/known-gaps.md](../.agent/memory/known-gaps.md) |
| 거버넌스·하네스 설명 지도 | [Governance & Harness Atlas](../frontend/public/governance_harness_atlas.html) — 설명용 파생 문서 |
| 게이트 계층·훅 규약 | [.githooks/README.md](../.githooks/README.md) |
| 3대 헌법 | [.agent/knowledge/](../.agent/knowledge/) |
