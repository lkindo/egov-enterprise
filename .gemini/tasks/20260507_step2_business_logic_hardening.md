# 20260507_step2_business_logic_hardening

## Task Goal
비즈니스 로직의 안정성을 강화하기 위해 상태 전이 가드 로직을 추가하고, 파편화된 ID 생성 전략을 통합한다.

## Status
- [x] Discovery: 결재 및 중요 상태 머신 도메인의 상태 전이 로직 조사
- [x] Implementation: `InformalSanctionServiceImpl` 상태 전이 가드 로직 추가
- [x] Implementation: ID 생성 통합 유틸리티(`IdGenerationUtil`) 구현 및 적용
- [x] Verification: 상태 전이 위반 시도 및 ID 생성 충돌 테스트 (컴파일 및 빌드 확인 완료)

## Progress
- 2026-05-07: Step 2 착수.
- 결재 도메인(`InformalSanction`)의 상태 전이 유효성 검증을 우선 작업으로 선정.
