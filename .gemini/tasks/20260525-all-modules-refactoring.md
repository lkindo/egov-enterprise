# 20260525-all-modules-refactoring

프로젝트 내 모든 잔여 DTO의 `@JsonProperty` 격리막을 완전히 철폐하고, 프론트엔드 타입/Zod 폼을 camelCase로 동기화합니다.

## 모듈별 이행 체크리스트

### 1단계: Banner (배너) 도메인 이행
- [ ] **DTO 철폐** — `BannerDto.java` 내 `@JsonProperty` 전격 철폐 및 한글화
- [ ] **Codegen 기동** — `npm run codegen:ts` 실행
- [ ] **프론트엔드 타입 정합** — `banner.ts` 타입 일치
- [ ] **React UI 컴포넌트 폼 정합** — `BannerAdminClient.tsx` 내 배너 폼 바인딩 정밀 치환
- [ ] **tsc 검증** — `npx tsc --noEmit` 에러 0건 통과
- [ ] **Git 커밋** — 배너 모듈 마감 커밋

### 2단계: OnlinePoll (온라인 설문/투표) 도메인 이행
- [ ] **DTO 철폐** — `OnlinePollArticleDto.java`, `OnlinePollManageDto.java` 내 `@JsonProperty` 전격 철폐 및 한글화
- [ ] **Codegen 기동** — `npm run codegen:ts` 실행
- [ ] **프론트엔드 타입 정합** — `survey.ts` 내 온라인 설문 타입 일치
- [ ] **React UI 컴포넌트 폼 정합** — 관련 투표 화면 바인딩 정밀 치환
- [ ] **tsc 검증** — `npx tsc --noEmit` 에러 0건 통과
- [ ] **Git 커밋** — 온라인 설문 모듈 마감 커밋
