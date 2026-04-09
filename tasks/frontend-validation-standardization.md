# 태스크: 프론트엔드 유효성 검사 표준화 (Frontend Validation Standardization)

## 개요
관리자 페이지의 폼 핸들링을 `useAppForm` (React Hook Form + Zod) 기반으로 표준화하여 코드 중복을 줄이고 사용자 경험(에러 토스트, 자동 포커스)을 개선합니다.

## 현재 상태
- [x] `useAppForm` 커스텀 훅 구현 완료 (`frontend/src/hooks/useAppForm.ts`)
- [x] 관리자 프로그램 관리 (`ProgramAdminClient.tsx`) 리팩토링 완료
- [x] 조직 통합 허브 (`UserOrgHubClient.tsx`) 리팩토링 완료
- [x] 권한 관리 (`SecurityHubClient.tsx`) 리팩토링 완료

## 진행 계획
### 1단계: 프로그램 관리 (`ProgramAdminClient.tsx`) 리팩토링
- [x] Zod 스키마 정의 (`programSchema`)
- [x] `useAppForm` 도입 및 기존 `useState` 폼 상태 제거
- [x] `validateForm` 함수 제거 및 Zod 리졸버로 대체
- [x] `handleSave` 함수 수정 (Server Action 연동)
- [x] 검증 테스트 (빈 값 입력 시 토스트 및 포커스 확인)

### 2단계: 조직 통합 허브 (`UserOrgHubClient.tsx`) 리팩토링
- [x] 사용자/부서 등록 폼에 `useAppForm` 적용
- [x] Zod 스키마 정의 및 핸들러 리팩토링

### 3단계: 권한 관리 (`SecurityHubClient.tsx`) 리팩토링
- [x] 권한 폼에 `useAppForm` 적용
- [x] 수동 검증 로직 제거

### 4단계: 추가 관리자 페이지 리팩토링 및 통합 테스트
- [x] 공통 코드 관리 등 기타 관리자 페이지 조사 완료
- [ ] 전체 폼 유효성 검사 통합 테스트 (Playwright 활용 고려)

### 5단계: 공통 코드 관리 (`CommonCodeClient.tsx`) 리팩토링
- [x] Zod 스키마 정의 (`codeDetailSchema`)
- [x] `useAppForm` 적용 및 수동 폼 상태 제거

### 6단계: 메뉴 관리 (`MenuAdminClient.tsx`) 리팩토링
- [x] Zod 스키마 정의 (`menuSchema`)
- [x] `useAppForm` 적용 및 `formData` 상태 제거

### 7단계: 배너/팝업 관리 (`BannerAdminClient.tsx`) 리팩토링
- [x] Zod 스키마 정의 (`bannerSchema`, `popupSchema`)
- [x] `useAppForm` 적용 및 수동 폼 처리 제거

### 8단계: 시스템 정책 및 약식 결재 관리 리팩토링
- [x] 정책 관리 (`PolicyAdminClient.tsx`) 리팩토링
- [x] 약식 결재 (`IsmClient.tsx`) 리팩토링
### 9단계: 전체 기능 유효성 검증 및 통합 테스트 (진행 중)
- [ ] `validation-auditor.spec.ts` 확장 (리팩토링된 모든 모듈 포함)
- [ ] 전역 TypeScript 타입 체크 (`npm run type-check`)
- [ ] Playwright를 이용한 일괄 검증 테스트 실행 및 리포트 확인

---
*마지막 업데이트: 2026-04-09 23:22*
