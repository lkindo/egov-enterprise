# Task: IDE 리포트 기반 코드 정리 및 기능 구현 (2026-04-19)

## 🎯 목표
- IDE에서 보고된 경고(Unused Import) 제거
- `CommunityUserApiController`의 가입 신청 로직 구현

## 📑 체크리스트
- [x] `ScheduleService.java` 미사용 임포트 제거 (2026-04-19)
- [x] `LoginPolicyApiController.java` 미사용 임포트 제거 (2026-04-19)
- [x] `CommunityUserApiController.java` 가입 신청 로직 상태 분석 (2026-04-19)
- [x] `CommunityUserService` 가입 신청 메서드 확인 및 구현 (2026-04-19)
- [x] API 컨트롤러 연결 및 검증 (2026-04-19)

## 🧪 진행 상황
- 2026-04-19: 작업 완료. 
  - `ScheduleService` 및 `LoginPolicyApiController`의 미사용 임포트 정리.
  - `CommunityService` 인터페이스 및 `CommunityServiceImpl` 구현체에 `joinCommunity` 구현.
  - 가입 신청 전 커뮤니티 활성 상태 체크 추가로 `community` 미사용 변수 경고 해결.
  - Gradle 빌드(`classes` 태스크)를 통해 모듈 간 참조 및 컴파일 성공 확인 완료.
