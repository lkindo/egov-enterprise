# Task: [Goal] eGov-Enterprise 도메인 DTO/Entity 편법 레거시 Getter/Setter 완전 철폐 및 SSOT 단방향 일치화

## 1. 개요 (Overview)
- **목표**: 백엔드 모든 도메인의 DTO 및 Entity 파일에서 `@JsonIgnore` 우회용 레거시 별칭 Getter/Setter 및 롬복 중복 수동 메서드들을 완전 삭제하고, 전체 빌드/타입 무결성을 100% 확보한다.
- **상태**: 완료 (SUCCESS)

## 2. 체크리스트 (Checklist)
- [x] **Think** - 요구사항 분석 및 기존 코드 영향 파악
- [x] **Plan** - 전수 탐색을 통해 레거시 수동 Getter/Setter가 잔존한 파일 목록 확보
- [x] **Implement** - 발견된 별칭 및 수동 메서드 영구 제거 및 관련 호출처 교정
  - [x] 식별된 DTO/Entity 내 레거시 Getter/Setter 삭제
  - [x] 삭제로 인해 깨진 비즈니스 구현체, 컨트롤러, 단위 테스트 코드 수정
- [x] **Test & Verify** - 3단계 무결성 검증 게이트 통과
  - [x] 백엔드 컴파일 검증 (`./gradlew compileJava compileTestJava`)
  - [x] 백엔드 서버 기동 및 프론트엔드 타입 동기화 (`npm run codegen:ts`)
  - [x] 프론트엔드 정적 타입 검사 (`npx tsc --noEmit`)
- [x] **Summarize** - 결과 요약 및 walkthrough.md 작성

## 3. 진행 일지
- **2026-06-03**: Goal 태스크 정의 및 상태 기록 파일 생성. 전수 탐색 단계(Audit Phase) 기동 완료.
- **2026-06-04**:
  - `page.tsx` 내의 레거시 `groupCreatDe` 필드를 `groupCrtYmd`로 수정.
  - DTO 및 Entity 전수 스캔(`scan-dto.js`): `AddressBookUser`, `BoardUse`, `User` 엔티티 내 편법 수동 Getter/Setter 및 `@JsonIgnore` 관련 별칭 메서드 전수 색출.
  - `AddressBookUser`의 `getAdbkId()` 및 Builder 편의 세터 제거, 서비스 및 테스트 코드에서 표준 ManyToOne 연관 객체 주입(`addressBook(entity)`)으로 교체.
  - `BoardUse`의 중복 수동 세터 `setUseYn` 제거 및 단위 테스트를 `update` 테스트로 리팩토링.
  - `User` 엔티티의 별칭 Getter/Setter `getAuthorCode()`, `setAuthorCode()` 제거 후 `Role.fromAuthorCode()` 팩토리 메서드를 추가하여 비즈니스 서비스 및 인증 프로바이더, 단위 테스트 코드를 표준 ENUM 형태로 완전 갱신.
  - Gradle 및 TypeScript 컴파일러를 통한 3단계 검증 게이트 무결성 입증 완료.
