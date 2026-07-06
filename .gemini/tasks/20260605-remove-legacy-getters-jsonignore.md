# eGov Enterprise - 레거시 소스 및 미사용 @JsonIgnore 제거 (2026-06-05)

## 진행 상태 요약

- [x] **DTO 내 미사용 `com.fasterxml.jackson.annotation.JsonIgnore` 임포트 제거**
  - [x] `UserDto.java`
  - [x] `WorkReportDto.java`
  - [x] `MemoReportDto.java`
  - [x] `RoleDto.java`
  - [x] `AddressBookDto.java`
  - [x] `AddressBookUserDto.java`
  - [x] `CmmnClCodeDto.java`
  - [x] `CmmnDetailCodeDto.java`
  - [x] `CommonCodeDto.java`
  - [x] `CommonCodeSaveRequest.java`
  - [x] `InstitutionCodeDto.java`
  - [x] `InstitutionCodeRecptnDto.java`
- [x] **컴파일 및 빌드 무결성 검증**
  - [x] 백엔드 컴파일 (`.\gradlew.bat compileJava compileTestJava` 성공)
  - [x] 프론트엔드 타입 체킹 (`npx tsc --noEmit` 성공)
- [x] **통합 테스트 수행**
  - [x] 백엔드 JUnit 테스트 및 프론트엔드 Vitest 테스트 전체 통과 확인 (Green Pass)
