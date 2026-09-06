# Architecture Decision Records

이 디렉터리는 현재 제품·아키텍처 경계를 바꾸는 결정을 기록한다. 상태가 `Accepted`인 ADR은
코드와 운영 문서의 현행 기준이며, 변경하려면 기존 ADR을 직접 덮어쓰지 않고 후속 ADR로 대체한다.

| ADR | 결정 | 상태 |
|---|---|---|
| [ADR-0001](ADR-0001-core-app-product-boundary.md) | 코어/앱 제품 경계와 배포 기준 | Accepted |
| [ADR-0002](ADR-0002-korean-first-frontend.md) | 한국어 우선 프런트엔드와 API 메시지 범위 | Accepted |
| [ADR-0003](ADR-0003-frontend-ux-modernization-principles.md) | 사용자 과업 중심 UX·브랜드 프로필·접근성·데이터 소유권 원칙 | Accepted |
| [ADR-0004](ADR-0004-provisional-hybrid-information-architecture.md) | 하이브리드 정보구조를 검증용 잠정 방향으로 채택 | Accepted — 잠정 지위는 ADR-0007로 종료 |
| [ADR-0005](ADR-0005-ui-quality-durable-evidence.md) | UI 품질 증거를 버전형 compact summary와 tracked index로 보존 | Accepted |
| [ADR-0006](ADR-0006-css-only-responsive-table.md) | 반응형 표현은 단일 SSR DOM 위에서 CSS로만 전환 | Accepted |
| [ADR-0007](ADR-0007-reference-default-ia-approval.md) | 하이브리드 IA를 참조-기본 IA로 승인, 연구·live census 요건은 채택 시점 재검증으로 이전 | Accepted — reference-default scope |
| [ADR-0008](ADR-0008-multi-source-approved-migration-workflow.md) | 다중 소스 DB→PostgreSQL 승인형 오프라인 마이그레이션 워크플로 | Accepted |
| [ADR-0009](ADR-0009-controlled-url-search-state.md) | 화면별 계약 아래 개인정보성 검색어의 URL 사용을 허용 | Accepted |
| [ADR-0010](ADR-0010-frontend-session-cookie-secure-policy.md) | 프론트엔드 세션 쿠키의 Secure 예외를 명시적 평문 loopback으로 제한 | Accepted |
| [ADR-0011](ADR-0011-retire-anonymous-satisfaction-password-proof.md) | 익명 만족도와 비밀번호 소유 증명을 퇴역하고 수정·삭제를 인증 owner/admin으로 제한 | Accepted |
