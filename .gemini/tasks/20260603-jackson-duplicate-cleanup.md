# Task: User & Report Jackson 직렬화 중복노출 정리 및 표준 용어 정비

## 1. 개요 (Overview)
- **목표**: `User`, `CustomUserDetails`, `WorkReportDto`, `MemoReportDto` 내에 존재하는 Jackson 직렬화 중복 노출 필드 및 보안 취약점을 제거하고, 표준 카멜케이스 규약에 맞추어 API 인터페이스를 정비함.
- **상태**: 진행 중

## 2. 체크리스트 (Ralph Loop)
- [ ] **Think** - 요구사항 분석 및 기존 코드 영향 파악
- [ ] **Plan** - 수정 대상 파일 식별 및 `@JsonIgnore` 전략 수립
- [ ] **Implement** - DTO 및 Security 클래스 수정
  - [ ] `UserDto.java`에 레거시 Alias Getter/Setter 추가 및 `@JsonIgnore` 적용
  - [ ] `CustomUserDetails.java` 내 `UserDetails` 인터페이스 Getter 메서드들에 `@JsonIgnore` 적용 (보안 강화)
  - [ ] `WorkReportDto.java`에 별칭 Getter/Setter 추가 및 `@JsonIgnore` 적용
  - [ ] `MemoReportDto.java`에 별칭 Getter/Setter 추가 및 `@JsonIgnore` 적용
- [ ] **Test** - 빌드 및 회귀 테스트 실행
  - [ ] `./gradlew compileJava compileTestJava` 빌드 검증
  - [ ] `npm run codegen:ts` 실행 및 프론트엔드 타입 정합성 검증
  - [ ] 프론트엔드 `npx tsc --noEmit` 타입 체크 검증
- [ ] **Summarize** - 결과 요약 및 walkthrough.md 작성

## 3. 진행 일지
- **2026-06-03**: 태스크 시작 및 `mapping-mismatch-analysis.md` 분석 완료. 수정 계획 수립.
