# 구현 계획 (Implementation Plan) - 전자정부프레임워크 5.0 공통 모듈

## 사용자 검토 필요 (User Review Required)
> [!IMPORTANT]
> **백업 전략**: 새로운 멀티 모듈 구조를 생성하기 전, 데이터 유실 방지를 위해 기존 프로젝트 파일들(src, pom.xml 등)을 `_legacy_backup` 디렉토리로 이동합니다.

## 변경 제안 (Proposed Changes)

### 1. 프로젝트 초기화 (구조 변경)
#### [신규] 멀티 모듈 스켈레톤 (Multi-Module Skeleton)
- **Root Project**: `build.gradle`, `settings.gradle` (모듈 정의: core, domain, security, service, api).
- **Sub Modules**: 각 모듈별 표준 디렉토리 구조 생성 (`src/main/java`, `src/main/resources`).
    - `common-core`: 유틸리티, 전역 설정.
    - `common-domain`: 엔티티, 리포지토리 (JPA).
    - `common-security`: JWT, Spring Security 설정.
    - `common-service`: 비즈니스 로직.
    - `api-server`: REST API 컨트롤러.

#### [수정] 기존 파일 처리
- 현재 `src`, `pom.xml`, `target` 등을 `_legacy_backup/` 폴더로 이동.

### 2. 핵심 기술 구현
#### [신규] 영속성 계층 (common-domain)
- **Spring Data JPA** 및 **QueryDSL** 설정.
- `BaseTimeEntity` (감사 로그 자동화) 생성.
- `COMTN_EMPTLYR_INFO` 테이블을 `User` 엔티티로 마이그레이션.

#### [NEW] eGovFrame Compliance (Level High)
- Add RTE dependencies: `psl-dataaccess`, `fdl-idgnr`, `fdl-property`, `fdl-logging`.
- [NEW] Add `fdl-crypto` and implement `CryptoUtil` (ARIA).
- Refactor Services to extend `EgovAbstractServiceImpl`.
- Configure `EgovMessageSource` and `EgovIdGnrService`.

#### [신규] 보안 계층 (common-security)
- **JWT Provider** 구현 (토큰 생성/검증).
- `SecurityFilterChain` 설정 (Stateless, Cors, CSRF 비활성화).
- `CustomUserDetailsService` 구현.

### 3. 기능 포팅 및 구현
#### [신규] 회원(User) 모듈
- `UserService`: 가입, 로그인, 정보 수정 로직.
- `UserController`: 인증 및 회원 관리 API.

#### [신규] 공통 코드(Code) 모듈
- `CommonCode` 엔티티 및 리포지토리.
- `CommonCodeService`: 캐싱 로직 (Redis/Local).

## 검증 계획 (Verification Plan)

### 자동화 테스트
- **단위 테스트**: 유틸리티 클래스 및 도메인 로직에 대한 JUnit 5 테스트.
- **통합 테스트**: 리포지토리 검증을 위한 `@DataJpaTest`.

### 수동 검증
- **빌드**: `./gradlew clean build` 명령어가 모든 모듈에 대해 성공해야 함.
- **애플리케이션 구동**: `api-server`가 에러 없이 8080 포트로 시작되어야 함.
- **API 테스트**: Swagger UI 또는 `curl`을 사용하여 검증:
    - 로그인 (JWT 발급 확인).
    - 내 정보 조회 (JWT 유효성 검증).
