# Task: DTO 내 레거시 수동 Getter 완전 제거 및 SSOT 일치화

## 1. 개요 (Overview)
- **목표**: 백엔드 모든 도메인 DTO 및 Entity에서 불필요하게 제공되던 레거시 수동 Getter/Setter를 완전히 제거(Contract)하여, `DB ➔ 백엔드 DTO ➔ 프론트엔드`까지 오직 표준 용어(SSOT)만 일관되게 흐르도록 정비하고 중복 노출 및 컴파일 에러를 제거한다.
- **상태**: 완료 (SUCCESS)

## 2. 체크리스트 (Ralph Loop)
- [x] **Think** - 요구사항 분석 및 기존 코드 영향 파악
- [x] **Plan** - 수정이 필요한 백엔드 도메인 DTO, Entity 및 관련 테스트 파일 목록 파악
- [x] **Implement** - DTO, Entity 및 테스트 코드 초정밀 수정
  - [x] `ScrapTest.java`에서 제거된 `getUniqId()` 호출부 수정 및 검증
  - [x] `SmsDto.java`에서 불필요한 별칭 필드 및 중복 필드 (`uniqId`, `rcptnTelno`) 제거
  - [x] 프로젝트 내에 남아있는 다른 도메인의 편법성 레거시 수동 Getter/Setter 및 `@JsonIgnore` Alias 탐색 후 완전 삭제 (`CommonCodeSaveRequest.java`, `UserDto.java`)
- [x] **Test** - 컴파일 무결성 및 계약 정합성 검증
  - [x] 백엔드 컴파일 검증 (`./gradlew compileJava compileTestJava`)
  - [x] 프론트엔드 타입 재생성 (`npm run codegen:ts` 혹은 OpenAPI 타입 정합성 확인)
  - [x] 프론트엔드 타입 검증 (`npx tsc --noEmit`)
- [x] **Summarize** - 결과 요약 및 walkthrough.md 작성

## 3. 진행 일지
- **2026-06-03**: L2 작업 정의 및 태스크 파일 생성. `ScrapTest.java` 및 `SmsDto.java`, `CommonCodeSaveRequest.java`, `UserDto.java` 등을 중심으로 레거시를 전수 제거하고 백엔드/프론트엔드 빌드 무결성을 확보하여 성공적으로 작업을 완료함.
