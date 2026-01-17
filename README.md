# eGov Enterprise (전자정부 표준프레임워크 5.0)

> **엔터프라이즈 모더니제이션 프로젝트**
> 레거시 eGovFrame 공통 컴포넌트를 Spring Boot 3 + JPA 기반의 현대적인 아키텍처로 전환합니다.

## 📚 문서 가이드 (Documentation)

프로젝트 진행 및 개발 가이드 관련 주요 문서입니다.

| 문서 | 설명 | 중요도 |
|---|---|---|
| **[마이그레이션 플랜 (MIGRATION_PLAN.md)](MIGRATION_PLAN.md)** | **마이그레이션 마스터 플랜**. 전체 로드맵 및 아키텍처 정의. | ⭐⭐⭐⭐⭐ |
| **[작업 체크리스트 (task.md)](task.md)** | **작업 체크리스트**. 현재 진행 상황 트래킹. | ⭐⭐⭐⭐⭐ |
| **[모듈 이관 가이드 (MODULE_MIGRATION_GUIDE.md)](C:/Users/sanle/.gemini/antigravity/brain/f15a5c1f-5304-4178-b610-069ac85c2e0f/MODULE_MIGRATION_GUIDE.md)** | **모듈 이관 표준 가이드 (SOP)**. 개발자가 따라야 할 표준 절차. | ⭐⭐⭐⭐⭐ |
| **[모듈 인벤토리 (COMPREHENSIVE_MODULE_INVENTORY.md)](C:/Users/sanle/.gemini/antigravity/brain/f15a5c1f-5304-4178-b610-069ac85c2e0f/COMPREHENSIVE_MODULE_INVENTORY.md)** | **공통 모듈 전체 현황**. 300+개 모듈의 상세 목록 및 우선순위. | ⭐⭐⭐ |

## 🛠 기술 스택 (Tech Stack)

- **Backend**: Spring Boot 3.3, Java 21, JPA/QueryDSL
- **Database**: PostgreSQL
- **Security**: Spring Security + JWT
- **Frontend**: Hybrid (Legacy JSP + REST API Adapter)

## 🚀 시작하기 (Quick Start)

### 1. 개발 환경 설정
```bash
# 기본 설정 및 DB 연동
./gradlew bootRun --args='--spring.profiles.active=dev'
```

### 2. 주요 URL
- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **메인 페이지**: [http://localhost:8080](http://localhost:8080)

## 📂 모듈 구조 (Module Structure)
```
egov-enterprise/
├── api-server/        # 웹 서버 (Controller, JSP)
├── common-core/       # 공통 유틸리티
├── common-domain/     # 도메인 (Entity, Repository)
├── common-service/    # 비즈니스 로직 (Service)
├── common-security/   # 보안 설정
└── egovframe-Template... # 레거시 원본 소스
```
