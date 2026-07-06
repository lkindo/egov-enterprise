# 20260525-all-modules-refactoring

프로젝트 내 모든 잔여 DTO의 `@JsonProperty` 격리막을 완전히 철폐하고, 프론트엔드 타입/Zod 폼을 camelCase로 동기화합니다.

## 모듈별 이행 체크리스트

### 1단계: Banner (배너) 도메인 이행
- [x] **DTO 철폐** — `BannerDto.java` 내 `@JsonProperty` 전격 철폐 및 한글화 (🟢 Passed)
- [x] **Codegen 기동** — `npm run codegen:ts` 실행 (🟢 Passed)
- [x] **프론트엔드 타입 정합** — `banner.ts` 타입 일치 (🟢 Passed)
- [x] **React UI 컴포넌트 폼 정합** — `BannerAdminClient.tsx` 내 배너 폼 바인딩 정밀 치환 (🟢 Passed)
- [x] **tsc 검증** — `npx tsc --noEmit` 에러 0건 통과 (🟢 Passed)
- [x] **Git 커밋** — 배너 모듈 마감 커밋 (🟢 Passed)

### 2단계: OnlinePoll (온라인 설문/투표) 도메인 이행
- [x] **DTO 철폐** — `OnlinePollArticleDto.java`, `OnlinePollManageDto.java` 내 `@JsonProperty` 전격 철폐 및 한글화 (🟢 Passed)
- [x] **Codegen 기동** — `npm run codegen:ts` 실행 (🟢 Passed)
- [x] **프론트엔드 타입 정합** — `survey.ts` 내 온라인 설문 타입 일치 (🟢 Passed)
- [x] **React UI 컴포넌트 폼 정합** — `OnlinePollAdminClient.tsx` 및 `OnlinePollParticipateClient.tsx` 등 관련 투표 화면 바인딩 정밀 치환 (🟢 Passed)
- [x] **tsc 검증** — `npx tsc --noEmit` 에러 0건 통과 (🟢 Passed)
- [x] **Git 커밋** — 온라인 설문 모듈 마감 커밋 (🟢 Passed)

### 3단계: User (사용자/회원) 도메인 이행
- [x] **DTO 철폐** — `UserDto.java` 내 `@JsonProperty` 전격 철폐 및 불필요 import 제거 (🟢 Passed)
- [x] **프론트엔드 타입 정합** — `user.ts` 내 `UserManage` 속성 camelCase 정합화 (🟢 Passed)

### 4단계: Menu (메뉴) 도메인 이행
- [x] **DTO 철폐** — `MenuDto.java`, `MenuCreateDto.java` 내 `@JsonProperty` 전격 철폐 및 `@Schema` 한글화 (🟢 Passed)
- [x] **프론트엔드 타입 정합** — `MenuInfo`, `Menu`, `MenuCreate` 인터페이스 camelCase 일치 (🟢 Passed)
- [x] **React UI 컴포넌트 폼 정합** — `MenuAdminClient.tsx`, `treeUtils.ts`, `MenuByAuthorityClient.tsx`, `security.ts` 등 100% 동화 개편 완료 (🟢 Passed)

### 5단계: Program (프로그램) 도메인 이행
- [x] **DTO 철폐** — `ProgramDto.java` 내 `@JsonProperty` 철폐 및 `@Schema` 한글화 (🟢 Passed)
- [x] **프론트엔드 타입 정합** — `Program` 및 `ProgrmManage` 인터페이스 camelCase 일치 (🟢 Passed)
- [x] **React UI 컴포넌트 폼 정합** — `ProgramForm.tsx`, `ProgramAdminClient.tsx`, `ProgramAdminClient.test.tsx`, `programActions.ts` 100% 정합 치환 완료 (🟢 Passed)

### 6단계: Operation (행사/외부인사) 도메인 이행
- [x] **DTO 철폐** — `EventInfoDto.java`, `ExternalHrDto.java` 내 `@JsonProperty` 및 `@JsonAlias` 완화막 전격 박멸 (🟢 Passed)

### 7단계: AdministCode (행정코드) 도메인 이행
- [x] **사전 검증** — 기존 camelCase 정합 여부 판별 (동화 마감 상태) (🟢 Passed)
