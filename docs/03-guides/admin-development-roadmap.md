# Admin Module Development Roadmap

본 문서는 2026-05-02 진행된 전수 조사를 바탕으로 **eGov Enterprise Admin Dashboard**의 기술 부채 해결 및 기능 고도화를 위한 개발 로드맵을 정의한다.

---

## 1. 개발 현황 요약 (Audit Summary)

전체 관리자 모듈 중 약 **85%**가 백엔드 통합이 완료된 실서비스 상태이며, **15%**는 UI/UX 설계가 완료된 고해상도 프로토타입 상태이다.

- **Production-Ready**: 보안, 시스템 설정, 통계, 옵저버빌리티, 협업 허브, 고객 지원.
- **Development Target (Mockup)**: 워크플로우 설정, 전자결재 허브, 스마트 알림 센터, 설문 대시보드.

---

## 2. 집중 개발 대상 (Mockup -> Functional)

### 2.1 워크플로우 엔진 통합 (Workflow Engine)
- **대상 경로**: `/admin/workflow`, `/admin/sanctn/workflow`
- **현황**: 정적 노드/에지 데이터 기반 UI 시각화만 존재.
- **태스크**:
    - [ ] `WorkflowAdminService.ts` 구축
    - [ ] BPMN 기반 프로세스 설계 데이터 저장/조회 API 연동
    - [ ] 결재선(Approval Line) 동적 생성 로직 구현

### 2.2 스마트 메시징 허브 (Smart Messaging Hub)
- **대상 경로**: `/admin/notifications`
- **현황**: AI 생성 시뮬레이션 및 정적 알림 샘플 사용.
- **태스크**:
    - [ ] `NotificationAdminService.ts` 통합
    - [ ] WebSocket/SSE 기반 실시간 알림 스트림 연동
    - [ ] AI 메시지 초안 생성 기능 (LLM API 연동)

### 2.3 설문조사 인텔리전스 (Survey Intelligence)
- **대상 경로**: `/admin/survey`
- **현황**: 관리 페이지는 작동하나, 메인 허브 대시보드가 정적 배열에 의존.
- **태스크**:
    - [ ] `SurveyHubClient.tsx` 내 정적 `surveys` 배열 제거
    - [ ] 설문 결과 분석 통계 API 연동 및 차트 바인딩

---

## 3. 상세 모듈 상태 매트릭스

| 카테고리 | 모듈명 | 경로 | 상태 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **Core** | 대시보드 | `/admin` | **Functional** | 실시간 감사/사용자 통계 연동 |
| **Security** | 권한/접근제어 | `/admin/security` | **Functional** | 보안 정책 및 이력 관리 완결 |
| **Observability** | 시스템 통합 관제 | `/admin/observability` | **Functional** | 서비스 토폴로지 시각화 완결 |
| **Workflow** | 프로세스 설정 | `/admin/workflow` | <span style="color: #e11d48">**Mockup**</span> | 백엔드 결재 엔진 연동 필요 |
| **Sanction** | 전자결재 | `/admin/sanctn` | <span style="color: #e11d48">**Mockup**</span> | 양식 및 워크플로우 연동 필요 |
| **Notification** | 알림 센터 | `/admin/notifications` | <span style="color: #e11d48">**Mockup**</span> | 실시간 스트림 및 발송 연동 필요 |
| **Intelligence** | 데이터 통계 | `/admin/stats` | **Functional** | `StatsAdminService` 연동 완결 |

---

## 4. 구현 전략 및 가이드라인

1. **Service Layer 패턴 강화**:
    - 모든 신규 연동은 `src/services/` 하위의 전용 서비스 클래스를 통해 수행한다.
    - `TanStack Query`를 사용하여 서버 상태를 관리하고 낙관적 업데이트를 적용한다.

2. **디자인 무결성 유지**:
    - 현재 적용된 **프리미엄 디자인(그라데이션, 애니메이션, 글래스모피즘)**을 훼손하지 않고 데이터 바인딩만 교체한다.
    - 데이터 로딩 시에는 `HubSkeleton` 컴포넌트를 활용하여 UX를 일관되게 유지한다.

3. **API 자동 매핑 활용**:
    - `ApiService` 추상 클래스의 페이지네이션 자동 매핑(0-based to 1-based)을 적극 활용하여 계산 실수를 방지한다.

---
*Created At: 2026-05-02*
*Updated By: Antigravity AI Agent*
