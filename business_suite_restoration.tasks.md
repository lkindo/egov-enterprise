# Task: Business Suite Test Restoration

## Status
- [x] Think (분석): `NoteServiceImplTest.java`에서 `NoteRepository` 관련 클래스 이름 불일치 확인 완료.
- [x] Plan (계획):
    1. [x] `NoteServiceImplTest.java`의 잘못된 임포트 수정.
    2. [x] `NoteRepository` -> `NoteDomainRepository` 등으로 이름 변경 사항 반영.
    3. [x] `business-suite`의 다른 테스트 파일들도 유사한 문제(클래스명 변경 등)가 있는지 재컴파일하여 확인. (컴파일 성공)
- [x] Implement (구현): `NoteServiceImplTest.java` 수정 완료.
- [x] Test (검증): `:business-suite:test` 실행 완료 (`BUILD SUCCESSFUL`).
- [ ] Summarize (요약):

## Progress
- [2026-04-03] 작업 시작. `NoteServiceImplTest.java` 컴파일 에러 발견 및 해결.
- [2026-04-03] `NoteRepository` -> `NoteDomainRepository` 등 리포지토리 이름 변경 사항 확인.
- [x] `business-suite` 전체 테스트 컴파일 및 실행 성공 (`BUILD SUCCESSFUL`).
- [x] `:foundation:test` 실행 중 `error: illegal character: '\ufeff'` (BOM) 에러 확인 및 스크립트로 일괄 제거 완료.
- [x] `foundation` 내 모델 변경으로 인한 잔여 컴파일 오류 대부분 해결 (`User`, `PageResponse`, `JwtTokenProvider`, `CommonCodeService` 등).
- [x] `api-server` 모듈 컴파일 테스트 성공.
- [ ] `:foundation:test` 최종 확인 중.


