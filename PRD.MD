# 전자정부프레임워크 5.0 기반 전사 공통 모듈 구축

## 1. 프로젝트 개요
본 프로젝트는 **전자정부프레임워크 5.0(Spring Boot 3.x)**을 기반으로, 여러 프로젝트에서 재사용 가능한 핵심 공통 기능을 모듈화하여 개발 생산성을 높이고 시스템 간 표준화를 달성하는 것을 목적으로 합니다.

## 2. 목표 및 핵심 가치
*   **표준화 (Standardization)**: 전사 프로젝트에 동일한 보안 및 데이터 처리 표준 적용.
*   **재사용성 (Reusability)**: 멀티 모듈 구조를 통한 필요한 기능의 선택적 도입.
*   **현대화 (Modernization)**: 기존 MyBatis 중심의 샘플을 JPA 및 REST API 기반으로 고도화.

## 3. 주요 기능 요구사항 (Functional Requirements)

| 기능 그룹 | 세부 요구사항 | 참조 샘플 DB |
| :--- | :--- | :--- |
| **통합 인증 및 인가** | - JWT 기반 무상태 인증 (Stateless Authentication)<br>- Spring Security 6.x 연동<br>- 계층형 권한 관리 | COMTN_EMPTLYR_INFO<br>COMTN_AUTHOR_INFO |
| **공통 코드 관리** | - 계층형 코드 구조 지원<br>- Redis/Local 캐싱을 통한 조회 성능 최적화 | COMTCCMMNCODE<br>COMTCCMMNDETAILCODE |
| **통합 파일 관리** | - 파일 마스터-상세 구조<br>- 로컬 및 클라우드(S3 등) 스토리지 추상화 인터페이스 제공 | COMTN_FILE<br>COMTN_FILE_DETAIL |
| **감사 및 시스템 로그** | - AOP를 활용한 접속/수정 이력 자동 기록<br>- 개인정보 접근 로그 분리 저장 | COMTN_SYS_LOG<br>COMTN_LOGIN_LOG |

## 4. 기술 요구사항 (Technical Requirements)

### 4.1. 개발 환경 및 스택
*   **Framework**: 전자정부프레임워크 5.0 (Spring Boot 3.3.x 이상)
*   **Language**: Java 17 이상
*   **Persistence**: Spring Data JPA (QueryDSL 포함 권장)
*   **Build Tool**: Gradle 8.x 또는 Maven 3.9.x (멀티 모듈 구성)
*   **API Spec**: Swagger (OpenAPI 3.0)를 통한 API 문서화 자동화

### 4.2. 아키텍처 설계
**멀티 모듈 구조**: 의존성 전이 최소화를 위한 계층 분리
*   `common-core`: 공통 유틸리티 및 예외 처리
*   `common-domain`: JPA 엔티티 및 공용 Repository
*   `common-security`: Spring Security 및 JWT 설정
*   `common-service`: 비즈니스 로직의 공통 분모 구현

## 5. 상세 구현 가이드라인

### 5.1. 보안 강화
*   모든 API 요청에 대해 **권한 검증을 기본**으로 하되, `/auth/**` 등 일부 경로에 대한 예외 처리를 설정한다.
*   `HierarchicalRoles`를 구현하여 상위 권한이 하위 권한을 상속받도록 처리한다.

### 5.2. 데이터 관리 및 감사
*   `AuditableEntity`를 정의하여 모든 엔티티의 등록자, 등록일시, 수정자, 수정일시를 `@CreatedBy`, `@LastModifiedBy` 등을 통해 자동 기록한다.
*   엔티티 직접 노출을 방지하기 위해 반드시 **DTO(Data Transfer Object)**를 통해 외부와 통신한다.

### 5.3. 배치 처리 (선택)
*   대량 데이터 처리가 필요한 프로젝트를 위해 전자정부프레임워크 배치 실행 환경을 공통 라이브러리 형태로 포함한다.

## 6. 성공 지표 (Success Metrics)
*   **신규 프로젝트 초기 구축 시간**: 공통 모듈 도입 시 기존 대비 **30% 이상 단축**.
*   **보안 취약점 감소**: 표준화된 인증 모듈 사용으로 인한 보안 사고 **Zero화**.
*   **코드 중복률**: 프로젝트 간 공통 기능 중복 구현율 **10% 미만 유지**.
