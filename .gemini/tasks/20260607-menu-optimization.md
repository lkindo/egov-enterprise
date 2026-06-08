# 20260607 메뉴 관리 최적화 작업 (Menu Optimization)

## 목표
메뉴 관리 부분의 4가지 최적화 방안 적용 및 테스트 작성/검증

## 체크리스트
- [ ] **Think**
  - [x] 최적화 4단계 요구사항 분석
  - [x] 변경 대상 파일 식별 (MenuService, MenuRepository, MenuDataInitializer 등)
- [ ] **Plan**
  - [ ] Task 1: `getSubMenus()`가 `getMenuHierarchy()` 결과를 필터링하도록 수정 (O(N) in memory)
  - [ ] Task 2: `MenuService` 내 하드코딩 라우트 매핑 제거 & DB 의존 구조로 변경 (DataInitializer에서 DB 업데이트, DTO 매핑 시 활용)
  - [ ] Task 3: `findAllWithAuthorities` 객체 매핑의 타입 안정성 개선 (DTO Projection)
  - [ ] Task 4: `@CacheEvict` 무효화 범위 세분화 검토
- [ ] **Implement**
  - [ ] Task 1 진행
  - [ ] Task 2 진행
  - [ ] Task 3 진행
  - [ ] Task 4 진행
- [ ] **Test**
  - [ ] 단위 테스트 작성/수정
  - [ ] `./gradlew compileJava compileTestJava` 확인
  - [ ] E2E 테스트(Playwright) 보완 및 실행
- [ ] **Summarize**
  - [ ] 아티팩트(walkthrough.md) 작성 및 보고
