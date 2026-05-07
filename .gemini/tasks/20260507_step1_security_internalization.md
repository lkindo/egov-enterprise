# 20260507_step1_security_internalization

## Task Goal
서비스 레이어 내에 보안 및 권한 검증 로직을 내재화하여 컨트롤러 의존성을 줄이고 심층 방어(Defense in Depth)를 구현한다.

## Status
- [x] Discovery: 보안 강화가 필요한 서비스 메서드 전수 조사
- [x] Implementation: `UserService`, `MberManageService` 권한 재검증 로직 추가
- [x] Implementation: `BoardService`, `InformalSanctionService` 삭제/수정 시 소유권 확인 로직 추가
- [ ] Verification: 단위 테스트 및 권한 우회 시도 테스트

## Progress
- 2026-05-07: 태스크 생성 및 Step 1 착수.
- `UserService`, `MberManageService`, `BoardService`, `InformalSanctionService` 전수 보안 패치 완료.
- `GeneralUserRepository`에 `existsByMberId` 추가하여 중복 체크 로직 안정성 확보.
