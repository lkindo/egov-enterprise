# Enterprise Development Roadmap (Unified)

본 문서는 **eGov Enterprise** 프로젝트 전체 모듈에 대한 전수 조사 결과를 바탕으로, 향후 시스템 고도화 및 기술 부채 해결을 위한 통합 로드맵을 정의한다.

---

## 1. 전사 모듈 구현 현황 (Overall Audit)

| 서비스 영역 | 모듈 (Path) | 상태 | 상세 내용 |
| :--- | :--- | :--- | :--- |
| **Enterprise Admin** | `/admin` | **Hybrid** | 코어 인프라 완결, 워크플로우 엔진 고도화 필요 |
| **Collaboration** | `/cop`, `/help` | **Functional** | 커뮤니티(COP), 도움말 센터 서비스 연동 완료 |
| **Business Flow** | `/approvals` | **Functional** | 결재 상신 및 승인 프로세스 연동 완료 |
| **Workspace** | `/note`, `/workspace` | **Functional** | 개인 메시징, 워크스페이스 개인화 기능 완료 |
| **Intelligence** | `/search`, `/stats` | **Functional** | 글로벌 통합 검색 및 통계 엔진 통합 완료 |
| **Smart Toolkit** | `/smart-toolkit` | **Functional** | 일정, 부서 업무, 보고 모듈 연동 완료 |

---

## 2. 영역별 집중 고도화 태스크

### 2.1 [관리자 영역] 차세대 엔진 실구현
- **Workflow & Sanction**: 정적 노드 데이터를 실제 BPMN 엔진 및 결재 서비스와 연동.
- **Smart Notifications**: WebSocket 기반 실시간 알림 및 AI 메시징 엔진 활성화.

### 2.2 [협업/커뮤니티] 지능형 서비스 강화
- **AI Community Discovery**: `/cop/cmy` 내 AI 추천 버튼을 실제 LLM 기반 추천 로직과 연결.
- **Real-time Interaction**: 커뮤니티 내 실시간 채팅 또는 인터랙티브 피드 기능 추가.

### 2.3 [데이터 지능] 분석 고도화
- **Search Optimization**: 글로벌 검색 결과를 고성능 인덱싱 엔진과 동기화하여 정확도 향상.
- **Visual Analytics**: 설문 및 운영 통계의 시각화 컴포넌트를 정적 매핑에서 동적 실시간 스트림으로 전환.

---

## 3. 기술적 우선순위 (Implementation Priority)

1. **High**: 관리자 워크플로우 엔진 통합 (BPMN)
2. **High**: 전자결재 표준 양식 체계 구축
3. **Medium**: 실시간 알림 서비스(SSE/WebSocket) 활성화
4. **Medium**: 글로벌 검색 인덱싱 최적화
5. **Low**: AI 기반 업무 보조(Smart Toolkit) 기능 확장

---

## 4. 품질 관리 및 가이드라인

- **Service Integrity**: 모든 신규 기능은 `src/services/` 레이어를 통해 독립적으로 구현한다.
- **UX Excellence**: 실데이터 연동 시에도 기존의 프리미엄 디자인(Framer Motion, Glassmorphism)을 100% 보존한다.
- **Evidence-Based**: 모든 구현 완료 후 E2E 테스트(`playwright`)를 통해 비즈니스 시나리오를 검증한다.

---
*Created At: 2026-05-02*
*Updated By: Antigravity AI Agent*
