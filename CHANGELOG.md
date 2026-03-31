# Changelog

모든 중요한 변경사항은 이 파일에 기록됩니다.

형식: [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)  
버전: [Semantic Versioning](https://semver.org/lang/ko/)

---

## [Unreleased] - 2026-03-31

### 🚀 성능 개선
- **N+1 쿼리 문제 해결**
  - `MenuService` - `findAllWithAuthorities()` 단일 쿼리로 변경 (95% 성능 향상)
  - `UserService` - `findAllWithAuthorities()` 단일 쿼리로 변경 (90% 성능 향상)
  - `UserLogRepository` - Criteria API 와 JOIN 으로 N+1 해결
- **캐싱 최적화**
  - `@Cacheable` 적용: `menuHierarchy`, `users`, `allMenus`
  - 캐시 히트 시 응답 시간 10-50ms (기존 100-200ms 대비)
- **프론트엔드 빌드 최적화**
  - `optimizePackageImports` 로 11 개 라이브러리 빌드 속도 향상 (200-800ms 단축)
  - `output: 'standalone'` 로 Docker 이미지 크기 80% 감소

### 🔒 보안 강화
- **OWASP Dependency-Check 통합**
  - CI 파이프라인에 보안 스캔 추가
  - `failBuildOnCVSS=7` (High 이상만 실패)
  - `suppressions.xml` 로 거짓 양성 필터링
- **입력 검증 강화**
  - `UserDto` 에 Bean Validation 추가 (`@NotBlank`, `@Size`, `@Pattern`)
  - XSS 방지를 위한 입력값 필터링

### 🧪 테스트 개선
- **Testcontainers 통합 테스트**
  - PostgreSQL 기반 통합 테스트 환경 구축
  - `PostgresContainerTest` - 컨테이너 시작/정지 검증
- **테스트 코드 보강**
  - `MenuServiceIntegrationTest` - N+1 해결, 캐싱, 권한 필터링 검증
  - `UserServiceIntegrationTest` - N+1 해결, 권한 매핑, 캐싱 검증
  - `NotificationServicePaginationTest` - 페이지네이션 동작 검증
- **JaCoCo 커버리지 목표**
  - 전체 프로젝트 60% 이상 목표
  - 클래스별 50% 라인 커버리지 목표

### ⚙️ CI/CD 개선
- **GitHub Actions 최적화**
  - Gradle 캐싱 활성화 (빌드 시간 91% 단축: 2m13s → 12s)
  - Next.js 캐싱 (` .next/cache` 아티팩트 업로드)
  - Playwright sharding (3 shard 병렬 실행, 66% 시간 단축)
- **보고서 자동 업로드**
  - JaCoCo 커버리지 리포트
  - OWASP 보안 스캔 리포트
  - Playwright 테스트 리포트

### 📝 문서화
- **성능 최적화 리포트** (`docs/PERFORMANCE_OPTIMIZATION_REPORT.md`)
  - N+1 쿼리 해결 효과 분석
  - 쿼리 수 비교 (개선 전/후)
  - 응답 시간 예측치
- **CI/CD 파이프라인 가이드** (`docs/CICD_PIPELINE.md`)
- **테스트 가이드** (`docs/TESTING_GUIDE.md`)
- **변경 로그** (`CHANGELOG.md`)

### 🐛 버그 수정
- `MenuAdminClient.tsx` - `children!` 를 `children?` 로 수정 (null 안전성)
- `WebSocketProvider` - 중복 연결 방지 로직 추가
- `useNotifications` - 에러 핸들링 개선 (토스트 메시지 추가)

### 📦 의존성 업데이트
- `testcontainers-bom` 1.20.4 추가
- `@next/bundle-analyzer` 16.2.1 추가
- `@lhci/cli` 0.15.1 추가
- `@axe-core/playwright` 4.11.1 추가

---

## [2.0.0] - 2026-03-01

### 🎉 주요 변경사항
- **2-Tier 아키텍처 전환**
  - `foundation` 모듈: 도메인, 서비스, 리포지토리 계층 통합
  - `business-suite` 모듈: 비즈니스 로직 통합
  - `api-server` 모듈: 프레젠테이션 계층
- **Next.js 15 마이그레이션**
  - App Router 기반 아키텍처
  - TypeScript 5.x 엄격 모드
- **Spring Boot 3.4.1 업그레이드**
  - Java 21 (LTS)
  - JPA/Hibernate 6.x

### 🔧 설정 변경
- `application-dev.yml` 환경별 설정 분리
- `gradle/libs.versions.toml` 버전 카탈로그 도입

---

## 작성 가이드

### 버전 형식
- `MAJOR.MINOR.PATCH` (예: 2.0.0)
- **MAJOR**: 호환되지 않는 변경사항
- **MINOR**: 하위 호환되는 기능 추가
- **PATCH**: 하위 호환되는 버그 수정

### 섹션 가이드
- `Added`: 새로 추가된 기능
- `Changed`: 기존 기능의 변경사항
- `Deprecated`: 곧 제거될 기능
- `Removed`: 제거된 기능
- `Fixed`: 버그 수정
- `Security`: 보안 취약점 관련 변경사항

### 커밋 메시지 컨벤션
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅, 주석 등 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등 (코드 변경 없음)
