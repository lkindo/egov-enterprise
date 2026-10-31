# Architecture Decision Records

이 디렉터리는 현재 제품·아키텍처 경계를 바꾸는 결정을 기록한다. 상태가 `Accepted`인 ADR은
코드와 운영 문서의 현행 기준이며, 변경하려면 기존 ADR을 직접 덮어쓰지 않고 후속 ADR로 대체한다.
상태 열의 `일부 …로 대체`는 후속 ADR이나 운영 결정(DEC-OPS)이 그 ADR의 일부를 대체했다는 뜻이다. 대체 범위는
각 ADR 머리의 `후속 결정` 줄에, 운영 결정 원문은 [보관 기록](../../archived/operational-decisions-history.md)에 있다.

| ADR | 결정 | 상태 |
|---|---|---|
| [ADR-0001](ADR-0001-core-app-product-boundary.md) | 코어/앱 제품 경계와 배포 기준 | Accepted — 일부 ADR-0028로 대체 |
| [ADR-0002](ADR-0002-korean-first-frontend.md) | 한국어 우선 프런트엔드와 API 메시지 범위 | Accepted |
| [ADR-0003](ADR-0003-frontend-ux-modernization-principles.md) | 사용자 과업 중심 UX·브랜드 프로필·접근성·데이터 소유권 원칙 | Accepted — 일부 ADR-0009로 대체 |
| [ADR-0004](ADR-0004-provisional-hybrid-information-architecture.md) | 하이브리드 정보구조를 검증용 잠정 방향으로 채택 | Accepted — 일부 ADR-0007로 대체 |
| [ADR-0005](ADR-0005-ui-quality-durable-evidence.md) | UI 품질 증거를 버전형 compact summary와 tracked index로 보존 | Accepted |
| [ADR-0006](ADR-0006-css-only-responsive-table.md) | 반응형 표현은 단일 SSR DOM 위에서 CSS로만 전환 | Accepted |
| [ADR-0007](ADR-0007-reference-default-ia-approval.md) | 하이브리드 IA를 참조-기본 IA로 승인, 연구·live census 요건은 채택 시점 재검증으로 이전 | Accepted |
| [ADR-0008](ADR-0008-multi-source-approved-migration-workflow.md) | 다중 소스 DB→PostgreSQL 승인형 오프라인 마이그레이션 워크플로 | Accepted — 일부 DEC-OPS-110으로 대체 |
| [ADR-0009](ADR-0009-controlled-url-search-state.md) | 화면별 계약 아래 개인정보성 검색어의 URL 사용을 허용 | Accepted |
| [ADR-0010](ADR-0010-frontend-session-cookie-secure-policy.md) | 프론트엔드 세션 쿠키의 Secure 예외를 명시적 평문 loopback으로 제한 | Accepted |
| [ADR-0011](ADR-0011-retire-anonymous-satisfaction-password-proof.md) | 익명 만족도와 비밀번호 소유 증명을 퇴역하고 수정·삭제를 인증 owner/admin으로 제한 | Accepted |
| [ADR-0012](ADR-0012-retire-blog-domain.md) | 비사용 블로그 도메인과 물리 스키마를 제거하고 데이터가 있는 환경의 제거는 차단 | Accepted |
| [ADR-0013](ADR-0013-standard-text-length-alignment.md) | 설계 보류 6개를 유지하며 표준 길이 24개와 SMS 정규화를 양단 계약에 적용 | Accepted — 일부 ADR-0014로 대체 |
| [ADR-0014](ADR-0014-deferred-standard-design-alignment.md) | 보류 6개를 프로그램 선택적 참조·HHmmss·암호화 주민번호 표준으로 정합 | Accepted — 일부 DEC-OPS-224·231로 대체 |
| [ADR-0015](ADR-0015-secure-coding-ci.md) | CodeQL SAST의 High/Critical 차단을 CI·릴리스 필수 체크에 연결 | Accepted |
| [ADR-0016](ADR-0016-explicit-permissions-and-multiple-groups.md) | 인가 핵심 3개와 감사 1개, 복수 그룹·명시 기능 권한 및 수동 전환 | Accepted — 일부 ADR-0034로 대체 |
| [ADR-0017](ADR-0017-task-oriented-menu-navigation.md) | 현재 제품의 과업 중심 4개 메뉴 영역, 중복 진입점 통합과 NAV 보존 이행 | Accepted |
| [ADR-0018](ADR-0018-governance-review-lifecycle-and-adoption.md) | 기술 계약·정기 검토·기관별 온라인/이관 도입 승인 분리 | Accepted — 일부 ADR-0028, DEC-OPS-289·291·295로 대체 |
| [ADR-0019](ADR-0019-client-ip-trust-boundary.md) | 운영 앞단 프록시로 클라이언트 IP 신뢰 경계 수립, 요청 제한 한도 설정화 | Accepted — 일부 DEC-OPS-098·ADR-0035로 대체 |
| [ADR-0020](ADR-0020-selectable-reusable-backend-layouts.md) | 원본 모듈 구조 유지와 재사용 백엔드 출력 형태 선택 | Accepted — 일부 ADR-0028, DEC-OPS-239, ADR-0047로 대체 |
| [ADR-0021](ADR-0021-isolated-layered-testing-process.md) | 책임별 테스트 재편·격리 실행·전체 회귀와 영향 shadow | Accepted — 일부 ADR-0022·ADR-0023으로 대체 |
| [ADR-0022](ADR-0022-ci-independent-module-impact-and-cache.md) | 온라인·이관 독립 영향 분류, 커버리지·required 보존과 Gradle 캐시 | Accepted — 일부 ADR-0023·ADR-0026, DEC-OPS-237로 대체 |
| [ADR-0023](ADR-0023-e2e-impact-selection-and-cache-writer.md) | PR E2E 영향 선별·main 전수와 단일 캐시 writer | Accepted |
| [ADR-0024](ADR-0024-spring-boot-4-two-phase-migration.md) | Spring Boot 4.1 두 단계 전환(Jackson 2 호환 → Jackson 3) | Accepted — 일부 DEC-OPS-124로 대체 |
| [ADR-0025](ADR-0025-enterprise-completeness-and-durable-operations.md) | D01~D15 A: 보호계정·최소 응답·업무 규칙·MFA·내구 알림/감사/삭제와 검증 범위 | Accepted |
| [ADR-0026](ADR-0026-ci-critical-path-and-reusable-impact.md) | backend/schema 병렬화, 재사용 profile 영향 선별과 실행시간 증거 수집 | Accepted — 일부 ADR-0027·ADR-0032·ADR-0037·ADR-0044, DEC-OPS-289·291로 대체 |
| [ADR-0027](ADR-0027-ci-reusable-admission-layout-and-nightly.md) | 재사용 검증의 분류 직후 custom 입장, PR 의 시작 구성당 한 레이아웃·main 전수와 생성물 야간 시험(T2) | Accepted — 일부 ADR-0030, DEC-OPS-291로 대체 |
| [ADR-0028](ADR-0028-presets-are-named-domain-lists.md) | 시작 구성은 이름 붙은 기능 목록이고 같은 목록은 같은 결과(해석·소스 투영)를 낸다 | Accepted |
| [ADR-0029](ADR-0029-legacy-standardization-migration.md) | 레거시 표준화 이관 — 도구가 후보·근거를 만들고 사람이 용어 매핑 원장으로 확정, L1~L4 단계 | Accepted — 일부 ADR-0031·ADR-0041, DEC-OPS-313·323으로 대체 |
| [ADR-0030](ADR-0030-reusable-ci-selection-followup.md) | 기존 승인에 따른 재사용 PR 제외 선언과 야간 중복 구성 제거 | Accepted |
| [ADR-0031](ADR-0031-migration-ledger-confirmation-followup.md) | 기존 승인에 따른 이관 원장 확정 조건과 chunk 실패 처리 | Accepted |
| [ADR-0032](ADR-0032-migration-pit-two-slots.md) | 이관 PIT 여덟 범위의 두 슬롯 실행과 실측 긴 순서 | Accepted — 일부 ADR-0044로 대체 |
| [ADR-0033](ADR-0033-encrypted-mail-delivery-snapshot.md) | 메일 자동 복구용 접수 당시 수신주소의 암호화 보관과 완료 후 정리 | Accepted |
| [ADR-0034](ADR-0034-retire-ended-authorization-surfaces.md) | 종료한 구 인가·비공식결재 API 경로 제거와 집행 지점 없는 권한 퇴역 | Accepted |
| [ADR-0035](ADR-0035-login-rate-limit-default.md) | 로그인 요청 제한의 템플릿 기본값 인하(IP당 분당 30) | Accepted |
| [ADR-0036](ADR-0036-api-paging-and-created-status-conventions.md) | 목록의 1 기반 page·size 통일·잘못된 입력 400, 자원을 만드는 POST 의 201·새 식별자 본문 | Accepted |
| [ADR-0037](ADR-0037-product-pit-six-slots.md) | 제품 PIT 여섯 슬롯과 실측 긴 순서, 효과 없으면 4로 되돌림 | Accepted — 일부 ADR-0044로 대체 |
| [ADR-0038](ADR-0038-credential-cookie-csrf-token.md) | 쿠키 자격을 실은 쓰기 요청에 이중 제출 CSRF 토큰(SockJS는 허용 Origin) | Accepted |
| [ADR-0039](ADR-0039-cms-content-pages-first-scope.md) | 콘텐츠 페이지(CMS) 1차 범위 — 로그인 사용자 열람, 업무 홈 상단 조각, 서버 검증 jsonb 문서 | Accepted — 일부 ADR-0042로 대체 |
| [ADR-0040](ADR-0040-board-operations-management.md) | 게시판 운영 화면, 사용 안 함 게시판의 읽기·쓰기 차단, 날짜 기준 예약 게시·게시 기준일 정렬, 상단 고정 컬럼과 BOARD_PIN | Accepted — 일부 ADR-0043으로 대체 |
| [ADR-0041](ADR-0041-local-migration-workspace-and-ai.md) | 독립 로컬 이관 작업공간, 직접 입력과 제한된 AI 질문·읽기 진행, 기관 전송 승인과 실행 경계 | Accepted |
| [ADR-0042](ADR-0042-cms-operations-follow-up.md) | 콘텐츠 페이지 운영 보완 — 초안·게시 판정 분리, 내려받기 파일 칸, 게시 중지 상태, 초안 삭제·사고 대응 파기(V2_143), 안내 페이지 목록 | Accepted |
| [ADR-0043](ADR-0043-board-publish-flow-and-designated-boards.md) | 게시판 공개 동선 — 메뉴와 분리한 생성, 사용 전환으로 공개, 공개 준비 기준(찾는 길 하나 이상), 지정 게시판 영구 삭제 거부, 템플릿 기준 화면 유형 이름 | Accepted |
| [ADR-0044](ADR-0044-ci-tuning-values-and-pit-scope-floors.md) | CI 튜닝값(슬롯 수·PIT 선언 순서)은 ci.yml·실측 profile 이 정본, PIT 범위별 하한, api-server 의 PIT 선별 유지 | Accepted |
| [ADR-0045](ADR-0045-bookmark-cleanup-input-policy-and-memo-read-consistency.md) | 즐겨찾기 기본 보존·명시적 정리, 부서 업무 우선순위·팝업 크기의 엄격 저장, 읽은 메모 본문·첨부 기준 지시 | Accepted |
| [ADR-0046](ADR-0046-empty-numeric-transition-and-log-duration-standard.md) | 빈 표·정비창 한정 숫자 세 컬럼 NUMERIC 전환과 처리소요밀리초 표준, 공유 DB 실행 별도 승인 | Accepted |
| [ADR-0047](ADR-0047-multi-database-composer-and-vendor-sql-boundary.md) | 프로젝트 생성기의 다중 DB 선택과 벤더 SQL 경계 — PostgreSQL 단일 정본, 벤더 어댑터, 포트·린터, 차등 시험 | Accepted |
