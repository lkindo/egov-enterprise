# 아키텍처 리팩토링 제안: 기능 분할 기반 2 계층 모듈 구조 (Function-Split 2-Tier Architecture)

> **문서 버전:** 2.0 (기능 분할 전략)  
> **최종 업데이트:** 2026-03-25  
> **작성자:** Antigravity AI Assistant  
> **검토자:** 미정

---

## 📋 개정이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-03-25 | 초기안: 2 계층 모듈 구조 제안 | AI Assistant |
| 2.0 | 2026-03-25 | 수정안: `module-system-admin` 기능 분할 전략 반영 | AI Assistant |

---

## 1. 배경 및 목적 (Background & Motivation)

### 1.1. 현재 구조의 문제점

현재 프로젝트는 8 개 이상의 도메인별 수직 모듈 (`module-*`) 로 세분화되어 있어 전문적인 구조를 갖추고 있으나, 다음과 같은 관리적 부담이 발생하고 있습니다.

- **복잡도 증가**: 모듈 간 의존성 그래프가 복잡해지며 빌드 설정 및 관리가 어려움.
- **배포 오버헤드**: 동일한 기술 스택과 라이프사이클을 가진 모듈들이 과도하게 분산됨.
- **중복성**: `common-core`, `common-security`, `module-core-iam` 등 필수 인프라 모듈이 상시 동반 변경됨.
- **책임 혼재**: `module-system-admin` 이 시스템 관리 기능과 비즈니스 기능을 모두 포함 (혼재된 책임).

### 1.2. 리팩토링 목표

본 문서는 대규모 멀티 모듈 기반의 시스템을 **2 개의 핵심 레이어**로 통합·재구성하되, **`module-system-admin` 을 기능별로 분할**하여 책임 기반의 명확한 아키텍처를 구축하는 가이드라인을 제공합니다.

- **유지보수 효율성**: 파편화된 `build.gradle` 설정이 단순해지며 모듈 간 순환 참조 발생 가능성이 차단됨.
- **배포 유연성**: '기반 서버'와 '업무 서버'로 물리적 분리 (Microservices Ready) 배포가 용이해짐.
- **학습 곡선 단축**: 신규 개발자가 프로젝트의 전체 구조를 빠르게 파악할 수 있는 직관적 계층 구조 제공.
- **책임 명확성**: 시스템 인프라와 비즈니스 기능의 경계가 명확해져 모듈 책임이 단일화됨.

---

## 2. 모듈 재구성 설계 (Architecture Blueprint)

### 2.1. 계층 구조 개요

```
┌─────────────────────────────────────────────────────────────┐
│                      api-server (Entry)                     │
├─────────────────────────────────────────────────────────────┤
│                 business-suite (업무 서비스)                 │
│  - module-workspace, module-operation, module-knowledge     │
│  - module-system-admin (비즈니스 기능: 콘텐츠/고객서비스)    │
├─────────────────────────────────────────────────────────────┤
│                   foundation (시스템 기반)                   │
│  - common-core, common-security, module-core-iam            │
│  - module-system-admin (인프라 기능: 메뉴/권한/로그/코드)    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. 계층 1: `foundation` (시스템 기반 & 거버넌스)

시스템이 존재하기 위한 **'핵심 엔진'**이며, 모든 서비스의 토대가 되는 인프라적 성격을 띕니다.

#### 통합 대상 모듈 및 기능

| 원본 모듈 | 이동 기능 (패키지) | 비고 |
| :--- | :--- | :--- |
| `common-core` | 전체 | 인프라 설정, JPA/QueryDSL 인프라, 전역 예외 처리 표준 |
| `common-security` | 전체 | Spring Security 설정, JWT 인증 필터, 암호화 정책 |
| `module-core-iam` | 전체 | 사용자 (User), 권한 (Role), 부서 (Dept), 인증 (Auth) 비즈니스 로직 |
| `module-system-admin` | 메뉴, 권한, 로그, 통계, 공통코드, 로그인정책, 프로그램 | **기능 분할 편입** |

#### 핵심 역할

- **Identity & Access**: 시스템의 주체 (누가) 와 행위 (무엇을) 를 정의하고 통제함.
- **Standardization**: 모든 API 의 품질 (응답 포맷, 예외 처리) 을 균일하게 보장함.
- **Governance**: 시스템 전역의 정책 (로그, 통계, 코드) 을 관리함.

---

### 2.3. 계층 2: `business-suite` (업무 서비스 & 콘텐츠)

`foundation` 위에서 실제 비즈니스 가치를 창출하고 사용자와 상호작용하는 **'업무 도구'**그룹입니다.

#### 통합 대상 모듈 및 기능

| 원본 모듈 | 이동 기능 (패키지) | 비고 |
| :--- | :--- | :--- |
| `module-workspace` | 전체 | 게시판 (BBS), 대시보드, 메일, 일정 등 사용자의 협업 도구 |
| `module-operation` | 전체 | 전자결재, SMS 전송, 업무 보고, 보상 관리 등 고유 프로세스 |
| `module-knowledge` | 전체 | 지식 관리 (Knowledge Base) 및 아카이빙 |
| `module-system-admin` | 콘텐츠 (배너/팝업/커뮤니티), 고객서비스 (설문/상담/QnA), 템플릿 | **기능 분할 편입** |

#### 핵심 역할

- **Business Execution**: 실제 업무 절차를 실행하고 데이터를 생산함.
- **Extension**: 향후 인사, 회계 등 새로운 비즈니스 요구사항이 생길 때 확장되는 포인트.
- **User Engagement**: 최종 사용자와 직접 상호작용하는 기능을 제공함.

---

## 3. 기능 분할 전략 (Function-Split Strategy)

### 3.1. `module-system-admin` 기능 분할 기준

| 기준 | Foundation 편입 | Business-Suite 편입 |
| :--- | :--- | :--- |
| **책임** | 시스템 안정성, 보안, 공통 인프라 | 비즈니스 가치 창출, 사용자 프로세스 |
| **사용자** | 관리자, 시스템 오퍼레이터 | 일반 사용자, 업무 담당자 |
| **의존성** | 타 모듈 의존 최소화 | Foundation 의존 |
| **변화 빈도** | 낮음 (안정적) | 높음 (비즈니스 요구 반영) |
| **데이터 성격** | 마스터, 정책, 로그 | 콘텐츠, 트랜잭션, 임시데이터 |

---

### 3.2. Foundation 편입 기능 상세

#### 도메인 (Domain)

```
foundation/
└── domain/
    ├── menu/              # Menu, MenuAuthority, SiteMap, BkmkMenu
    ├── auth/              # MenuAuthority, Author, Role, Dept, Group
    ├── program/           # Program
    ├── login/             # LoginPolicy, LoginPolicySearchResult
    ├── log/               # WebLog, SysLog, LoginLog, PrivacyLog, UserLog, BbsSummary
    ├── stats/             # DtaUseStats, Statistics
    ├── code/              # CommonCode, AdministCode, InstitutionCode (신규)
    └── isg/               # InternetSvcGuidance
```

#### 서비스 (Service)

```
foundation/
└── service/
    ├── menu/              # MenuService
    ├── auth/              # AuthorService, RoleService, DeptService, GroupService
    ├── login/             # LoginPolicyService
    ├── log/               # WebLogService, SysLogService, LoginLogService
    ├── stats/             # StatisticsService
    ├── code/              # CommonCodeService, AdministCodeService (신규)
    └── isg/               # InternetSvcGuidanceService
```

#### API 컨트롤러 (Controller)

```
foundation/
└── api/controller/
    ├── menu/              # MenuApiController, MenuUserApiController
    ├── auth/              # AuthorApiController, AuthorRoleApiController, RoleApiController
    ├── user/              # UserApiController, UserAuthorityApiController, UserAbsenceApiController
    ├── dept/              # DeptApiController, DeptAuthorityApiController
    ├── group/             # GroupApiController
    ├── login/             # LoginPolicyApiController
    ├── log/               # LoginLogApiController, SystemLogApiController
    ├── stats/             # StatisticsApiController
    ├── code/              # CommonCodeApiController, AdministCodeApiController, InstitutionCodeApiController
    ├── isg/               # InternetSvcGuidanceApiController
    └── program/           # ProgramApiController
```

---

### 3.3. Business-Suite 편입 기능 상세

#### 도메인 (Domain)

```
business-suite/
└── domain/
    ├── content/
    │   ├── banner/        # Banner
    │   ├── popup/         # Popup
    │   └── community/     # Community, CommunityUser
    ├── service/
    │   ├── survey/        # QestnrInfo, QustnrIem, QustnrQesitm, OnlinePollManage, SurveyRespondent
    │   ├── qna/           # Qna
    │   └── consult/       # CnsltManage
    ├── template/          # Template, TmplatInfo
    └── imgtemp/           # ImgTemp (이미지 임시저장)
```

#### 서비스 (Service)

```
business-suite/
└── service/
    ├── content/
    │   ├── banner/        # BannerService
    │   ├── popup/         # PopupService
    │   └── community/     # CommunityService
    ├── survey/            # SurveyService, OnlinePollService, CnsltService
    ├── qna/               # QnaService
    └── template/          # TemplateService
```

#### API 컨트롤러 (Controller)

```
business-suite/
└── api/controller/
    ├── content/
    │   ├── banner/        # BannerApiController
    │   ├── popup/         # PopupApiController, PopupUserApiController
    │   └── community/     # CommunityApiController
    ├── survey/            # SurveyApiController, OnlinePollApiController, CnsltApiController
    ├── qna/               # QnaApiController
    ├── template/          # TemplateApiController
    └── board/             # BoardMasterApiController (workspace 와 통합)
```

---

## 4. 핵심 설계 원칙 (Design Principles)

### 4.1. 단방향 의존성 (Unidirectional Dependency)

- `business-suite`는 `foundation`에만 의존하며, 기반 모듈은 업무 모듈의 존재를 몰라야 합니다 (**Core Purity**).
- 순환 참조 방지를 위해 `build.gradle` 의존성 선언을 엄격히 관리합니다.

```gradle
// foundation/build.gradle
dependencies {
    api project(':common-core')
    api project(':common-security')
    api project(':module-core-iam')
    // business-suite 의존 금지
}

// business-suite/build.gradle
dependencies {
    api project(':foundation')
    api project(':module-workspace')
    api project(':module-operation')
    api project(':module-knowledge')
}
```

### 4.2. 기능 배포 마법사 (Feature Provisioning Wizard)

- 게시판 자동 생성과 같은 '마법사' 로직은 **`business-suite`**에 위치해야 합니다.
- 마법사는 내부적으로 `foundation`이 제공하는 메뉴 생성 (`createMenu`) 및 권한 설정 (`assignRole`) API 를 호출하여 자산을 완성합니다.
- 이를 통해 기반 모듈의 경량화와 도메인 간 결합도 (Loosely Coupling) 를 유지합니다.

### 4.3. 이벤트 기반 통신 (Event-Driven Communication)

- 모듈 간의 강한 결합을 피하기 위해 `Spring Events` 를 활용합니다.
- 예: 게시글 등록 시 알림 처리, 통계 업데이트 등은 비동기 이벤트를 통해 전파됩니다.

```java
// Foundation: 로그 기록 이벤트 발행
applicationEventPublisher.publishEvent(new LogWrittenEvent(this, logData));

// Business-Suite: 이벤트 리스너로 통계 업데이트
@EventListener
public void handleLogWritten(LogWrittenEvent event) {
    statisticsService.updateBbsSummary(event.getLogData());
}
```

### 4.4. 패키지 네이밍 컨벤션

- **Foundation**: `com.company.project.foundation.{domain}.{layer}`
- **Business-Suite**: `com.company.project.business.{domain}.{layer}`

```
foundation/
└── src/main/java/com/company/project/foundation/
    ├── menu/
    ├── auth/
    ├── log/
    └── ...

business-suite/
└── src/main/java/com/company/project/business/
    ├── content/
    ├── survey/
    ├── workspace/
    └── ...
```

---

## 5. 리팩토링实施 계획 (Implementation Plan)

### Phase 1: 준비 (1 일)

#### Task 1.1: 의존성 그래프 분석

```bash
# module-system-admin 의존성 분석
./gradlew :module-system-admin:dependencies --configuration runtimeClasspath > docs/dependency-analysis.txt

# 전체 프로젝트 의존성 시각화 (옵션)
./gradlew :dependencyTree > docs/full-dependency-tree.txt
```

#### Task 1.2: 기능 분할 체크리스트 작성

- [ ] 각 Controller 별 이동 대상 매핑 완료
- [ ] Entity 간 JOIN 관계 분석 (QueryDSL predicate 포함)
- [ ] 서비스 간 호출 관계 매핑
- [ ] 리소스 파일 (application.yml, messages.properties) 중복 확인

---

### Phase 2: Foundation 모듈 구축 (3 일)

#### Task 2.1: 프로젝트 골격 생성

**수정: `settings.gradle`**
```gradle
rootProject.name = 'egov-enterprise'

// 기존 모듈 (점진적 이동을 위해 임시 유지)
include 'common-core', 'common-security', 'module-core-iam'
include 'module-workspace', 'module-operation', 'module-knowledge'
include 'module-system-admin'
include 'api-server'

// 신규 통합 모듈
include 'foundation'
include 'business-suite'
```

**생성: `foundation/build.gradle`**
```gradle
plugins {
    id 'org.springframework.boot'
    id 'io.spring.dependency-management'
}

dependencies {
    api project(':common-core')
    api project(':common-security')
    api project(':module-core-iam')

    // Domain & JPA & QueryDSL
    api 'org.springframework.boot:spring-boot-starter-data-jpa'
    api 'org.springframework.data:spring-data-envers'
    api 'org.hibernate.orm:hibernate-envers'
    api 'com.querydsl:querydsl-jpa:5.1.0:jakarta'
    annotationProcessor "com.querydsl:querydsl-apt:5.1.0:jakarta"
    annotationProcessor "jakarta.persistence:jakarta.persistence-api"
    annotationProcessor "jakarta.annotation:jakarta.annotation-api"

    // Foundation specific
    api 'org.springframework.boot:spring-boot-starter-validation'
    api 'org.springframework.boot:spring-boot-starter-actuator'
    api 'io.swagger.core.v3:swagger-annotations-jakarta:2.2.27'
    api 'org.mapstruct:mapstruct:1.5.5.Final'
    annotationProcessor 'org.mapstruct:mapstruct-processor:1.5.5.Final'
    annotationProcessor 'org.projectlombok:lombok-mapstruct-binding:0.2.0'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testImplementation 'com.h2database:h2'
}

bootJar { enabled = false }
jar { enabled = true }
```

#### Task 2.2: 소스 코드 이동 (Foundation)

```bash
# 디렉토리 구조 생성
mkdir -p foundation/src/main/java/com/company/project/foundation
mkdir -p foundation/src/main/resources

# 메뉴/권한 도메인 이동
cp -r module-system-admin/src/main/java/com/company/project/domain/menu foundation/src/main/java/com/company/project/foundation/
cp -r module-system-admin/src/main/java/com/company/project/domain/auth foundation/src/main/java/com/company/project/foundation/
cp -r module-system-admin/src/main/java/com/company/project/domain/program foundation/src/main/java/com/company/project/foundation/

# 로그인/로그/통계 도메인 이동
cp -r module-system-admin/src/main/java/com/company/project/domain/login foundation/src/main/java/com/company/project/foundation/
cp -r module-system-admin/src/main/java/com/company/project/domain/log foundation/src/main/java/com/company/project/foundation/
cp -r module-system-admin/src/main/java/com/company/project/domain/stats foundation/src/main/java/com/company/project/foundation/

# 공통코드 도메인 (신규)
cp -r module-system-admin/src/main/java/com/company/project/api/controller/code foundation/src/main/java/com/company/project/foundation/

# 서비스/컨트롤러 이동 (패키지 재구성 필요)
```

#### Task 2.3: 리소스 병합

- 각 모듈의 `application.yml` → `foundation/src/main/resources/application-foundation.yml`
- `messages.properties` → 키 충돌 방지 (네임스페이스 접두어 추가)
  - 예: `menu.create.success`, `auth.login.failed`, `log.write.success`

#### Task 2.4: Foundation 빌드 검증

```bash
./gradlew :foundation:classes
# 예상 결과: BUILD SUCCESSFUL
```

---

### Phase 3: Business-Suite 모듈 구축 (3 일)

#### Task 3.1: 프로젝트 골격 생성

**생성: `business-suite/build.gradle`**
```gradle
plugins {
    id 'org.springframework.boot'
    id 'io.spring.dependency-management'
}

dependencies {
    api project(':foundation')
    api project(':module-workspace')
    api project(':module-operation')
    api project(':module-knowledge')

    // Domain & JPA & QueryDSL
    api 'org.springframework.boot:spring-boot-starter-data-jpa'
    api 'org.springframework.data:spring-data-envers'
    api 'org.hibernate.orm:hibernate-envers'
    api 'com.querydsl:querydsl-jpa:5.1.0:jakarta'
    annotationProcessor "com.querydsl:querydsl-apt:5.1.0:jakarta"
    annotationProcessor "jakarta.persistence:jakarta.persistence-api"
    annotationProcessor "jakarta.annotation:jakarta.annotation-api"

    // Business-Suite specific
    api 'org.springframework.boot:spring-boot-starter-validation'
    api 'org.springframework.boot:spring-boot-starter-websocket'
    api 'org.springframework.boot:spring-boot-starter-mail'
    api 'io.swagger.core.v3:swagger-annotations-jakarta:2.2.27'
    api 'org.mapstruct:mapstruct:1.5.5.Final'
    annotationProcessor 'org.mapstruct:mapstruct-processor:1.5.5.Final'
    annotationProcessor 'org.projectlombok:lombok-mapstruct-binding:0.2.0'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testImplementation 'com.h2database:h2'
}

bootJar { enabled = false }
jar { enabled = true }
```

#### Task 3.2: 소스 코드 이동 (Business-Suite)

```bash
# 디렉토리 구조 생성
mkdir -p business-suite/src/main/java/com/company/project/business
mkdir -p business-suite/src/main/resources

# 콘텐츠 도메인 이동
cp -r module-system-admin/src/main/java/com/company/project/domain/system/content business-suite/src/main/java/com/company/project/business/

# 고객서비스 도메인 이동
cp -r module-system-admin/src/main/java/com/company/project/domain/system/service/survey business-suite/src/main/java/com/company/project/business/
cp -r module-system-admin/src/main/java/com/company/project/domain/system/service/qna business-suite/src/main/java/com/company/project/business/
cp -r module-system-admin/src/main/java/com/company/project/domain/system/service/consult business-suite/src/main/java/com/company/project/business/

# 템플릿/이미지 임시저장 도메인 이동
cp -r module-system-admin/src/main/java/com/company/project/domain/template business-suite/src/main/java/com/company/project/business/
cp -r module-system-admin/src/main/java/com/company/project/domain/ImgTemp* business-suite/src/main/java/com/company/project/business/

# 서비스/컨트롤러 이동
cp -r module-system-admin/src/main/java/com/company/project/service/system/content business-suite/src/main/java/com/company/project/business/
cp -r module-system-admin/src/main/java/com/company/project/service/system/service business-suite/src/main/java/com/company/project/business/
```

#### Task 3.3: 리소스 병합

- `application.yml` → `business-suite/src/main/resources/application-business.yml`
- 게시판/콘텐츠 관련 메시지 통합

#### Task 3.4: Business-Suite 빌드 검증

```bash
./gradlew :business-suite:classes
# 예상 결과: BUILD SUCCESSFUL
```

---

### Phase 4: 통합 및 정리 (2 일)

#### Task 4.1: `api-server` 의존성 업데이트

**수정: `api-server/build.gradle`**
```gradle
dependencies {
    // 기존 8 개 모듈 의존성 제거
    // implementation project(':common-core')
    // implementation project(':common-security')
    // ...

    // 통합 모듈 의존성 추가
    implementation project(':foundation')
    implementation project(':business-suite')

    // 기타 필요 의존성
    implementation 'org.springframework.boot:spring-boot-starter-web'
    runtimeOnly 'org.postgresql:postgresql'
}
```

#### Task 4.2: 전체 프로젝트 빌드 및 테스트

```bash
# 전체 빌드
./gradlew clean build

# 단위 테스트 실행
./gradlew test

# 통합 테스트 실행 (Playwright)
npm run test:e2e

# 코드 커버리지 리포트
./gradlew jacocoRootReport
```

#### Task 4.3: `settings.gradle` 정리

```gradle
rootProject.name = 'egov-enterprise'

// 통합 모듈
include 'foundation'
include 'business-suite'
include 'api-server'

// 구 모듈 (주석 처리 또는 삭제)
// include 'common-core', 'common-security', 'module-core-iam'
// include 'module-workspace', 'module-operation', 'module-knowledge'
// include 'module-system-admin'
```

#### Task 4.4: 구 모듈 디렉토리 백업 및 삭제

```bash
# 백업 (옵션)
mkdir -p ../backup-legacy-modules
mv common-core common-security module-core-iam ../backup-legacy-modules/
mv module-workspace module-operation module-knowledge ../backup-legacy-modules/
mv module-system-admin ../backup-legacy-modules/

# 또는 Git 으로 관리 (권장)
git rm -r common-core common-security module-core-iam
git rm -r module-workspace module-operation module-knowledge
git rm -r module-system-admin
git commit -m "Refactor: Migrate to 2-tier architecture with function-split"
```

---

## 6. 리스크 및 대응 방안 (Risk Management)

| 리스크 | 영향도 | 발생 확률 | 대응 방안 |
| :--- | :---: | :---: | :--- |
| **Entity 간 순환 참조** | 높음 | 중 | 리팩토링 전 `./gradlew dependencies` 분석 선행, `@Transactional(propagation = REQUIRES_NEW)` 활용 |
| **API 엔드포인트 충돌** | 중 | 중 | `@RequestMapping` 경로 재정의 (예: `/api/admin/*` → `/api/foundation/*`), 중복 체크 스크립트 작성 |
| **테스트 실패** | 높음 | 높음 | 기존 E2E 테스트 시나리오를 회귀 테스트로 활용, 점진적 이동 (Feature Flag) |
| **리소스 파일 충돌** | 중 | 중 | `application.yml` 프로필 분리 (`foundation.yml`, `business-suite.yml`), 키 네임스페이스 규칙 적용 |
| **성능 저하 (부팅 시간)** | 낮음 | 중 | `@EntityScan` 경로 최적화, Lazy Initialization 도입, 부팅 시간 목표 (< 10 초) 설정 |
| **데이터 마이그레이션** | 높음 | 낮음 | Entity 패키지 변경 후 `@Table` 명시적 선언, Flyway/Liquibase 스크립트 준비 |

---

## 7. 테스트 전략 (Testing Strategy)

### 7.1. 테스트 피라미드 재정의

```
                    ┌─────────────┐
                    │    E2E      │  (Playwright, 10%)
                   ─┴─────────────┴─
                  │  Integration  │ (SpringBootTest, 30%)
                 ─┴───────────────┴─
                │    Unit Test    │ (JUnit5, 60%)
               ─┴─────────────────┴─
```

### 7.2. Foundation 테스트 항목

| 테스트 유형 | 대상 | 도구 | 목표 커버리지 |
| :--- | :--- | :--- | :---: |
| **단위 테스트** | Service, Repository | JUnit5, Mockito | 80%+ |
| **통합 테스트** | Controller, Security | SpringBootTest, TestContainers | 70%+ |
| **E2E 테스트** | 메뉴 생성, 권한 부여 | Playwright | 핵심 시나리오 100% |

**예시: Foundation 단위 테스트**
```java
@SpringBootTest
class MenuServiceTest {

    @Autowired
    private MenuService menuService;

    @Test
    @DisplayName("메뉴 생성 시 권한이 자동으로 부여된다")
    void createMenu_withAuthority() {
        // Given
        MenuCreateRequest request = new MenuCreateRequest("관리자메뉴", "/admin");

        // When
        Menu created = menuService.createMenu(request);

        // Then
        assertAll(
            () -> assertThat(created.getId()).isNotNull(),
            () -> assertThat(created.getAuthorities()).isNotEmpty()
        );
    }
}
```

### 7.3. Business-Suite 테스트 항목

| 테스트 유형 | 대상 | 도구 | 목표 커버리지 |
| :--- | :--- | :--- | :---: |
| **단위 테스트** | Service, Repository | JUnit5, Mockito | 80%+ |
| **통합 테스트** | Controller, Event Listener | SpringBootTest, TestContainers | 70%+ |
| **E2E 테스트** | 설문 생성, 팝업 노출 | Playwright | 핵심 시나리오 100% |

**예시: Business-Suite 통합 테스트**
```java
@SpringBootTest
class SurveyIntegrationTest {

    @Autowired
    private SurveyService surveyService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Test
    @DisplayName("설문 등록 시 통계가 업데이트된다")
    void createSurvey_updatesStatistics() {
        // Given
        SurveyCreateRequest request = new SurveyCreateRequest("고객만족도조사");

        // When
        Survey created = surveyService.createSurvey(request);

        // Then
        // 이벤트 발행 확인 (ArgumentCaptor 활용)
        verify(eventPublisher).publishEvent(any(SurveyCreatedEvent.class));
    }
}
```

---

## 8. Rollback 전략 (Rollback Plan)

### 8.1. 점진적 이동 (Phased Migration)

- **1 단계**: Foundation 모듈만 먼저 구축 및 검증
- **2 단계**: Business-Suite 모듈 구축 및 검증
- **3 단계**: `api-server` 통합 및 전체 테스트

각 단계마다 **기능 토글 (Feature Flag)**을 사용하여 문제 발생 시 즉시 이전 상태로 복구 가능하도록 합니다.

### 8.2. Git 브랜치 전략

```
main
 └── feature/refactor-2-tier
     ├── feature/foundation-module
     └── feature/business-suite-module
```

- 각 Phase 마다 PR 을 생성하여 코드 리뷰 수행
- 문제 발생 시 해당 브랜치만 revert

### 8.3. 백업 및 복구 절차

1. **데이터베이스 백업**: 리팩토링 전 전체 스키마 덤프
   ```bash
   pg_dump -U postgres egov > backup-$(date +%Y%m%d).sql
   ```

2. **코드 백업**: Git 태그 생성
   ```bash
   git tag -a pre-refactor-20260325 -m "Before 2-tier refactoring"
   git push origin pre-refactor-20260325
   ```

3. **복구 절차**:
   - Git 태그로 체크아웃: `git checkout pre-refactor-20260325`
   - 데이터베이스 복원: `psql -U postgres egov < backup-20260325.sql`

---

## 9. 성능 최적화 가이드 (Performance Optimization)

### 9.1. 부팅 시간 목표

| 지표 | 목표 | 측정 방법 |
| :--- | :--- | :--- |
| **Foundation 부팅** | < 5 초 | `SpringApplication.run()` 완료 시간 |
| **Business-Suite 부팅** | < 8 초 | `SpringApplication.run()` 완료 시간 |
| **전체 API 서버** | < 10 초 | 8080 포트 리스닝 시작 시간 |

### 9.2. 최적화 기법

- **Lazy Initialization**:
  ```yaml
  # application.yml
  spring:
    main:
      lazy-initialization: true
  ```

- **@EntityScan 경로 최적화**:
  ```java
  @Configuration
  @EntityScan(basePackages = {
      "com.company.project.foundation.menu",
      "com.company.project.foundation.auth",
      // 명시적 선언으로 스캔 범위 축소
  })
  public class FoundationJpaConfig { }
  ```

- **컴포넌트 스캔 필터링**:
  ```java
  @ComponentScan(
      basePackages = "com.company.project.foundation",
      excludeFilters = @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Test.*")
  )
  ```

---

## 10. 기대 효과 (Expected Benefits)

| 항목 | 기존 (8 모듈) | 개선 후 (2 계층 + 기능분할) | 개선율 |
| :--- | :---: | :---: | :---: |
| **모듈 수** | 8 개 | 2 개 (foundation, business-suite) | 75% 감소 |
| **의존성 그래프** | 복잡 (순환 참조 위험) | 단순 (단방향) | 가시성 향상 |
| **기능 응집도** | 낮음 (system-admin 혼재) | 높음 (책임 기반 분할) | 명확한 책임 |
| **배포 단위** | 모듈별 개별 배포 | 계층별 배포 (Foundation/Business) | 유연성 향상 |
| **학습 곡선** | 2 주+ | 1 주 이내 | 50% 단축 |
| **빌드 시간** | ~5 분 | ~3 분 | 40% 단축 |

---

## 11. 다음 단계 (Next Steps)

### 11.1. 즉시 실행 항목

- [ ] **의존성 분석 스크립트 실행**
  ```bash
  ./gradlew :module-system-admin:dependencies --configuration runtimeClasspath > docs/dependency-analysis.txt
  ```

- [ ] **기능 분할 체크리스트 작성**
  - [ ] 각 Controller 별 이동 대상 매핑 완료
  - [ ] Entity 패키지 구조 설계 완료
  - [ ] API 엔드포인트 경로 재정의

- [ ] **리팩토링 일정 수립**
  - Phase 1: Foundation 구축 (3 일)
  - Phase 2: Business-Suite 구축 (3 일)
  - Phase 3: 통합 테스트 (2 일)
  - Phase 4: 구 모듈 정리 (1 일)

### 11.2. 검토 회의 안건

1. `module-system-admin` 기능 분할 기준 최종 승인
2. 패키지 네이밍 컨벤션 확정
3. Rollback 기준 정의 (어떤 실패 시 복구할 것인가)
4. 테스트 커버리지 목표치 합의

---

## 부록 A. 모듈별 클래스 수 (이동 작업량 산정)

| 모듈 | Java 클래스 수 | 도메인 | 서비스 | 컨트롤러 |
| :--- | :---: | :---: | :---: | :---: |
| `module-system-admin` | 200 | 80 | 60 | 33 |
| `module-workspace` | 171 | 70 | 50 | 25 |
| `module-operation` | 미측정 | - | - | - |
| `module-knowledge` | 미측정 | - | - | - |

**이동 작업량:**
- Foundation: 약 120 클래스 (menu, auth, log, stats, code)
- Business-Suite: 약 80 클래스 (content, survey, qna, template)

---

## 부록 B. API 엔드포인트 매핑 (변경 예정)

| 기존 경로 | 변경 경로 (Foundation) | 변경 경로 (Business-Suite) |
| :--- | :--- | :--- |
| `/api/admin/menu/*` | `/api/foundation/menu/*` | - |
| `/api/admin/auth/*` | `/api/foundation/auth/*` | - |
| `/api/admin/log/*` | `/api/foundation/log/*` | - |
| `/api/admin/code/*` | `/api/foundation/code/*` | - |
| `/api/admin/banner/*` | - | `/api/business/content/banner/*` |
| `/api/admin/popup/*` | - | `/api/business/content/popup/*` |
| `/api/admin/survey/*` | - | `/api/business/survey/*` |
| `/api/admin/qna/*` | - | `/api/business/qna/*` |

---

## 부록 C. 참조 문서

- [Spring Boot Modular Architecture Guide](https://spring.io/guides)
- [QueryDSL Best Practices](https://querydsl.github.io/)
- [Playwright E2E Testing Guide](https://playwright.dev/java/docs/intro)
- [EGOV 프레임워크 가이드](https://maven.egovframe.go.kr/)

---

*문서 끝*
