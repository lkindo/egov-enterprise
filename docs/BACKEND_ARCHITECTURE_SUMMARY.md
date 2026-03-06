# Backend Architecture Summary (Vertical Slicing)

## 1. 아키텍처 개요 (Overview)
본 프로젝트는 기존의 계층형(Layered) 아키텍처에서 비즈니스 도메인 중심의 **수직 슬라이싱(Vertical Slicing) 아키텍처**로 완전히 전환되었습니다. 각 모듈은 고유한 비즈니스 책임을 가지며, 독립적인 도메인 모델, 인터페이스, 서비스를 보유합니다.

## 2. 모듈 구성 (Module Structure)

| 모듈명 | 유형 | 책임 및 설명 |
| :--- | :--- | :--- |
| **api-server** | Entry | 최종 War 패키징 및 배포, 전역 설정, Spring Boot 진입점 |
| **common-core** | Foundation | 공통 Utility, Exception 핸들러, 전역 Config (Swagger, Cache 등) |
| **common-security** | Foundation | Spring Security 설정, JWT 인증 필터, 권한 검사 로직 |
| **module-core-iam** | Functional | 사용자(User), 권한(Auth), 그룹(Group) 관리 및 사용자 디테일 서비스 |
| **module-system-admin** | Functional | 공통코드, 메뉴, 프로그램, 배포 관리, 시스템 로그, 배치 스케줄러 |
| **module-workspace** | Functional | 게시판, 일정, 메일, 커뮤니티, 배너 등 사용자 협업 도구 |
| **module-operation** | Functional | 휴가, 자산 관리, 설문, 행정 업무 지원 |
| **module-knowledge** | Functional | 지식 베이스(Wiki), 공식 문서 관리 |

## 3. 핵심 설계 원칙 (Design Principles)

### 3.1. 모듈 간 결합도 최소화 (Loose Coupling)
- **Direct JOIN 금지**: 타 모듈의 테이블을 직접 JOIN하는 SQL 쿼리를 지양합니다. (QueryDSL 등 포함)
- **의존성 방향성**: 기능 모듈간 교차 참조를 방지하며, 필요한 경우 `common-core` 혹은 `module-core-iam`(사용자 정보)만 참조하도록 설계합니다.
- **Service API 호출**: 타 모듈의 데이터가 필요한 경우 해당 모듈의 `Service` 계층을 주입받아 사용합니다.

### 3.2. 독립적 비즈니스 슬라이스
- 각 모듈은 자신만의 `Controller`, `Service`, `Repository`, `Entity`, `DTO`를 패키지 구조 내에 독립적으로 보유합니다.
- 모듈별로 독립적인 빌드가 가능하도록 `build.gradle` 의존성을 최소화했습니다.

### 3.3. 이벤트 기반 통신 (Event-Driven)
- 모듈 간의 강한 결합을 피하기 위해 `Spring Events`를 활용합니다.
- 예: 게시글 등록 시 알림 처리, 통계 업데이트 등은 비동기 이벤트를 통해 타 모듈로 전파됩니다.

## 4. 데이터 계층 설계

### 4.1. Entity & Repository
- 기존 `common-domain`에 산재해 있던 Entity들을 각 모듈의 `domain` 패키지로 이동시켰습니다.
- 각 모듈은 고유한 `@EntityScan` 범위를 가지며 독립적으로 관리됩니다.

### 4.2. DTO & Mapper
- MapStruct를 사용하여 Entity와 DTO 간 변환을 수행하며, 모든 변환 로직은 모듈 내부에서 완결됩니다.

## 5. 보안 및 인증 (IAM)
- 모든 보안 정책은 `common-security`에서 정의하며, 실제 사용자 데이터 조회는 `module-core-iam`의 `CustomUserDetailsService`를 통해 수행됩니다.
- JWT 전역 필터가 모든 요청의 Principal을 식별합니다.

---
*Last Updated: 2026-03-06 (Vertical Slicing Refactoring 완료 후)*
