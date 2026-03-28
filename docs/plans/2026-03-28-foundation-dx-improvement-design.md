# [Design] Foundation 모듈 품질 및 개발자 경험(DX) 개선 계획

- **작성일**: 2026-03-28
- **대상**: `foundation` 모듈
- **작성자**: Antigravity

## 1. 개요
`foundation` 모듈의 코드 품질을 유지하고 개발 생산성을 높이기 위해 아키텍처 규칙 자동 검증, 공통 테스트 환경 구축, 데이터 매핑 표준화, QueryDSL 유틸리티 고도화를 수행한다.

## 2. 주요 개선 사항

### 2.1 아키텍처 규칙 자동 검증 (ArchUnit)
패키지 간 의존성 규칙이 흐트러지는 것을 방지하기 위해 ArchUnit 테스트를 도입한다.
- **클래스**: `com.company.project.foundation.ArchunitTest`
- **검증 대상**:
  - `Repository` 레이어가 `Service` 등 상위 레이어를 참조하지 않음.
  - `Domain` 엔티티가 `DTO`를 참조하지 않음.
  - 명명 규칙 준수 (Service, RepositorySuffix).

### 2.2 테스트 생산성 향상 (Test Base Classes)
반복되는 테스트 설정을 추상화하여 테스트 코드의 일관성을 확보한다.
- **통합 테스트용**: `IntegrationTestSupport` (MockMvc, Security, @SpringBootTest)
- **영속성 테스트용**: `PersistenceTestSupport` (QueryDSL Configuration, H2, @DataJpaTest)

### 2.3 데이터 매핑 표준화 (MapStruct)
Entity와 DTO 간의 변환 로직을 일관되게 관리한다.
- **컴포넌터**: `GenericMapper<D, E>` 인터페이스 및 MapStruct 기반 매퍼 구현.
- **설정**: `unmappedTargetPolicy = ReportingPolicy.ERROR`를 적용하여 매핑 누락을 사전 방지.

### 2.4 QueryDSL 지원 클래스 고도화
반복되는 동적 쿼리 및 페이징 로직을 유틸리티화한다.
- **클래스**: `CustomQuerydslRepositorySupport`
- **기능**:
  - `applyPagination(Pageable, JPAQuery)`를 통한 페이징 자동화.
  - 동적 `OrderSpecifier` 생성을 지원하는 헬퍼 메서드.

## 3. 기대 효과
- **코드 품질 유지**: 아키텍처 규칙이 자동으로 감시되어 기술 부채 축적 방지.
- **개발 속도 향상**: 테스트 및 데이터 변환 로직의 표준화로 비즈니스 로직 작성 시간 단축.
- **가독성 증대**: 반복적인 보일러플레이트 코드가 제거되어 코드 핵심 로직이 명확해짐.

## 4. 향후 계획
- [ ] `foundation/build.gradle`에 ArchUnit 의존성 추가.
- [ ] ArchUnit 기본 규칙 테스트 클래스 작성.
- [ ] 테스트 베이스 클래스(`IntegrationTestSupport`, `PersistenceTestSupport`) 구현.
- [ ] 공통 매핑 인터페이스 및 QueryDSL 지원 유틸리티 개발.
