# Task: 도메인 로직 및 상태 머신 강화 (Phase 2)

## 1. 개요
비정형 결재(Informal Sanction) 도메인의 로직 취약점을 해결하기 위해 도메인 주도 설계(DDD) 기반의 상태 전이 모델을 도입하고, 시스템 전반의 이벤트 기반 아키텍처를 확장한다.

## 2. 작업 내용
- [x] **비정형 결재 도메인 리팩토링 (State Pattern 지향)**:
    - `SanctionStatus` Enum 도입으로 파편화된 상태 코드 통합.
    - `InformalSanction` 엔티티 내부에 `approve()`, `reject()`, `validateRequestedState()` 등 비즈니스 행위 캡슐화.
    - 승인자 일치 여부 및 상태 전이 가드 로직 강화.
- [x] **이벤트 기반 아키텍처 확장**:
    - `SanctionStatusChangedEvent` 및 `SanctionEventListener` 구현.
    - 결재 처리 시 비동기로 알림 이벤트를 발행하도록 개선하여 도메인 간 결합도 완화.
- [x] **공통 비즈니스 검증 확산**:
    - `BoardSearchCondition`에 날짜 범위 유효성 검사 로직 추가 및 서비스 레이어 적용.

## 3. 검증 결과
- `business-suite` 모듈 빌드 성공.
- 비정상적인 상태 전이(이미 처리된 건의 재처리 등) 시 `BusinessException` 발생 확인.

## 4. 최종 상태
- 결재 도메인의 안정성(LR: 2 -> 4) 및 보안성(SD: 2 -> 4) 대폭 개선.
- 이벤트 기반 설계를 통해 향후 SMS/Mail 알림 확장이 용이한 구조 확보.
