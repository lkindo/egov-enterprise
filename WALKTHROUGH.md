# eGovFrame 5.0 Multi-Module Project Walkthrough

## 1. 프로젝트 구조 (Project Structure)
기존 Monolithic 구조에서 아래와 같은 Multi-Module 구조로 재편되었습니다.

```
egov-enterprise
├── common-core      # 유틸리티, 전역 설정
├── common-domain    # JPA Entity, Repository (MySQL/H2)
├── common-security  # JWT, Spring Security
├── common-service   # 비즈니스 로직, DTO
└── api-server       # REST API 컨트롤러 (실행 모듈)
```

## 2. 실행 방법 (How to Run)

### 전제 조건 (Prerequisites)
*   **Java 21** 이상 설치 (LTS 권장).
*   **Gradle 8.10.2** 이상 설치 (또는 IntelliJ/Eclipse의 내장 Gradle 사용).

### IDE에서 실행 (IntelliJ 권장)
1.  IntelliJ에서 `d:\project\egov-enterprise\build.gradle` (Root) 파일을 엽니다 ("Open as Project").
2.  Gradle Import가 완료될 때까지 기다립니다.
3.  `api-server` 모듈의 `com.company.project.ApiServerApplication` 클래스를 실행합니다.
4.  서버가 `8080` 포트에서 시작됩니다.

### 터미널에서 실행
시스템에 Gradle이 설치되어 있다면:
```bash
gradle clean build
java -jar api-server/build/libs/api-server-0.0.1-SNAPSHOT.jar
```

> [!NOTE]
> 현재 터미널 환경에 `gradlew`가 포함되어 있지 않을 경우, IntelliJ나 Eclipse 등 IDE에서 프로젝트를 열어 실행하는 것을 가장 추천드립니다. IDE는 내장 Gradle을 통해 자동으로 빌드 및 실행을 처리합니다.

## 3. API 테스트 (Verification)
서버 구동 후, Swagger UI 또는 Curl을 통해 테스트 가능합니다.

*   **Swagger UI**: `http://localhost:8080/swagger-ui/index.html`
*   **회원가입**: `POST /api/v1/users/signup`
*   **로그인**: `POST /api/v1/auth/login` (Token 발급 확인)

## 4. 데이터베이스 설정

현재 프로젝트는 **Docker에 설치된 CUBRID 데이터베이스**를 사용하도록 설정되어 있습니다 (`application.yml`).

*   **URL**: `jdbc:cubrid:localhost:33000:demodb`
*   **Username**: `dba`
*   **Dialect**: `org.hibernate.dialect.CUBRIDDialect`

실행 전 Docker 컨테이너가 가동 중인지 확인하세요 (`docker-compose up -d`).

## 5. 레거시 이관 (Legacy Migration)

eGovFrame 5.0 경량환경 샘플 페이지를 현재 멀티 모듈 구조로 이관하는 작업이 진행 중입니다.

- **이관 전략**: 점진적 이행 (기능별 선별 이관)
- **우선순위**: 게시판(BBS) → 파일관리 → 공통코드 → 사용자관리
- **상세 계획**: [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) 참조

### 완료된 인프라 설정
- JSP/MyBATIS 의존성 추가 완료
- eGovFrame Security/MVC/Excel 패키지 추가 완료
- 레거시 빈 설정 (`LegacyConfig.java`) 완료

### 다음 작업
게시판(BBS) 모듈의 핵심 클래스만 선별하여 이관 예정.
