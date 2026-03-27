# Task: 코드 품질 개선 및 프로덕션 준비 (Code Quality Improvement)

## 개요
불필요한 디버깅 코드 제거 및 `PolicyService` 프론트엔드 연동.

## 작업 목록
- [x] 디버깅 코드 정리 (Clean up Debug Code)
    - [x] `FullBeanNameGenerator.java`: `System.out.println`, `printStackTrace` 제거
    - [x] `DebugBean.java`: 파일 제거 및 정리 완료
- [x] `PolicyService` 프론트엔드 실시간 연동 (Frontend Integration)
    - [x] `PolicyAdminService.ts` 생성하여 API 연동 기반 마련
    - [x] `Footer.tsx` 디자인 고도화 및 정책 링크 (`Link`) 추가
    - [x] `help/policies/[type]/page.tsx` 생성으로 실시간 정책 조회 페이지 구현
- [ ] 전수 빌드 및 최종 정합성 확인
    - [ ] `./gradlew build` 최종 성공 확인

## [NEW] 시스템 정책 관리 Admin UI 구축 (Progressing)
- [ ] 관리자 페이지 파일 구조 생성
    - [ ] `frontend/src/app/admin/system/policies/page.tsx`
    - [ ] `frontend/src/app/admin/system/policies/PolicyAdminClient.tsx`
- [ ] 기능 구현
    - [ ] `StandardDataTable`을 이용한 정책 목록(Copyright, Privacy) 표시
    - [ ] `RichTextEditor`를 연동한 상세 수정 모달/폼 구현
    - [x] 백엔드 API(`PolicyAdminService`)와 연동하여 실제 데이터 저장 확인

## [NEW] 시스템 정책 관리 성능 최적화 (Caching Implementation)
- [ ] `PolicyService.java` 캐싱 적용
    - [ ] `@Cacheable`: `getPolicy`, `getPolicies` 메서드 호출 속도 향상
    - [ ] `@CacheEvict`: 정책 수정(`updatePolicy`) 시 관련 캐시 무효화 및 갱신
- [ ] 캐시 정상 작동 여부 및 응답 속도 체감 확인

## 현재 상태 (2026-03-27)
- 관리 시스템 정책 관리 UI 구축 완료.
- API 성능 향상을 위한 Spring Cache 연동 진행 중.
