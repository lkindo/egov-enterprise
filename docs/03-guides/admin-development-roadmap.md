# Admin Module Development Roadmap (Unified Premium)

## 1. 개요 (Overview)
본 문서는 **Next.js 16.2.4** 및 **Spring Boot 3.4.3** 기반의 eGov Enterprise 관리자 대시보드 고도화 계획을 정의한다. 모든 개발은 제정된 **3대 기술 헌법**을 최상위 규범으로 삼으며, 사용자에게 **"Unified Premium"** 경험을 제공하는 것을 최종 목표로 한다.

---

## 2. 개발 현황 및 목표 (Status & Targets)

### 2.1 통합 현황 요약
- **Core Governance (100%)**: DB 표준화, API 보안, UX 헌법 수립 완료.
- **Functional Modules (85%)**: 보안, 시스템 설정, 통계, 관제 모듈 연동 완료.
- **Next Targets (15%)**: 워크플로우 엔진, 전자결재, 스마트 알림 센터 연동 대기 중.

### 2.2 집중 고도화 대상 (Functional Transformation)

#### A. 워크플로우 엔진 & 전자결재 (Workflow & Sanction)
- **표준**: [백엔드 헌법 제10조] 회복탄력성 및 [UX 헌법 제8조] 로딩 UX 준수.
- **태스크**:
    - [ ] `WorkflowAdminService` 구축 및 BPMN 엔진 API 연동.
    - [ ] **RSC First**: 결재선 설정 화면을 서버 컴포넌트로 구조화하여 초기 진입 속도 최적화.
    - [ ] **Premium UX**: 결재 스테퍼(`ApprovalStepper`)에 레이아웃 애니메이션 적용.

#### B. 스마트 메시징 허브 (Smart Messaging Hub)
- **표준**: [UX 헌법 제4조] 실시간 상태 관리 및 WebSocket 보안 준수.
- **태스크**:
    - [ ] WebSocket/SSE 기반 실시간 알림 스트림 및 AI 메시지 초안 생성(LLM) 연동.
    - [ ] **Non-blocking UX**: `Sonner` 기반의 스택 토스트 알림 시스템 전면 도입.

#### C. 설문 인텔리전스 (Survey Intelligence)
- **표준**: [DB 헌법] 메타 데이터 SSOT 준수 및 [UX 헌법] 데이터 시각화 표준 준수.
- **태스크**:
    - [ ] `SurveyHubClient.tsx` 내 정적 배열 제거 및 `StatsAdminService` 통합.
    - [ ] 차트 컴포넌트에 마이크로 인터랙션 및 필터링 애니메이션 추가.

---

## 3. 구현 및 검증 가이드라인 (Constitutional Guidelines)

### 3.1 기술적 기강 (Architectural Discipline)
1. **Constitutional Compliance**: 모든 신규 코드는 `gstack-review`를 통해 3대 헌법 합치성을 사전 검토받아야 한다.
2. **Server State Management**: 서버 데이터는 반드시 **TanStack Query v5**를 통해 관리하며, `Suspense` 바운더리를 적극 활용한다.
3. **SSOT Mapping**: 백엔드 DTO와 프론트엔드 타입은 `npm run codegen:ts`를 통해 항상 동기화 상태를 유지한다.

### 3.2 품질 보증 (Quality Assurance)
1. **Evidence-Based Verification**: 기능 완료 보고 시 반드시 테스트 로그, API 응답 덤프, 또는 UI 스크린샷을 증거로 제시한다.
2. **Regression Test**: 신규 모듈 추가 후 Playwright E2E 테스트(`npm run test:e2e:full`)를 실행하여 기존 기능과의 호환성을 검증한다.

---

## 4. 상세 모듈 상태 매트릭스

| 카테고리 | 모듈명 | 경로 | 상태 | 준수 헌법 |
| :--- | :--- | :--- | :--- | :--- |
| **Security** | 권한/접근제어 | `/admin/security` | **Functional** | 백엔드 제8조 |
| **Observability** | 시스템 통합 관제 | `/admin/observability` | **Functional** | UX 제8조 |
| **Workflow** | 프로세스 설정 | `/admin/workflow` | <span style="color: #e11d48">**Mockup**</span> | 백엔드 제10조 |
| **Sanction** | 전자결재 | `/admin/sanctn` | <span style="color: #e11d48">**Mockup**</span> | UX 제2조 |
| **Notification** | 알림 센터 | `/admin/notifications` | <span style="color: #e11d48">**Mockup**</span> | UX 제4조 |

---
*Last Updated: 2026-05-14*
*Governed by: Antigravity Enterprise Governance*
