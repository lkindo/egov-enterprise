# eGov Enterprise 프로젝트

eGovFrame 기반 전자정부 표준프레임워크 엔터프라이즈 플랫폼

## 기술 스택

- **Backend**: Spring Boot 3.x, Java 21
- **Database**: PostgreSQL
- **Security**: Spring Security + JWT
- **View**: JSP + JSTL
- **API Docs**: Swagger/OpenAPI 3.0

## 모듈 구조

```
egov-enterprise/
├── api-server/        # REST API 및 웹 서버
├── common-core/       # 핵심 유틸리티
├── common-domain/     # JPA 엔티티 및 리포지토리
├── common-security/   # 보안 설정
└── common-service/    # 비즈니스 로직
```

## 주요 기능

| 모듈 | 경로 | 설명 |
|------|------|------|
| 프로그램 관리 | `/sym/prm/**` | 프로그램 목록 CRUD |
| 메뉴 관리 | `/sym/mnu/**` | 메뉴 생성/목록 관리 |
| 공통코드 관리 | `/sym/ccm/**` | 분류코드/공통코드/상세코드 |
| 우편번호 관리 | `/sym/ccm/zip/**` | 우편번호 검색/관리 |
| 그룹 관리 | `/sec/gmt/**` | 권한 그룹 관리 |
| 로그 관리 | `/sym/log/**` | 시스템 로그 조회 |

## 실행 방법

### 개발 환경
```bash
./gradlew :api-server:bootRun --args='--spring.profiles.active=dev'
```

### 운영 환경
```bash
./gradlew :api-server:bootRun --args='--spring.profiles.active=prod'
```

## API 문서

서버 실행 후 접속:
- Swagger UI: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- API Docs: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

## 환경변수 (운영)

| 변수 | 설명 | 기본값 |
|------|------|-------|
| `DB_URL` | 데이터베이스 URL | `jdbc:postgresql://localhost:5432/egovdb` |
| `DB_USERNAME` | DB 사용자 | `egov` |
| `DB_PASSWORD` | DB 비밀번호 | `egov123` |
| `SERVER_PORT` | 서버 포트 | `8080` |
| `LOG_PATH` | 로그 경로 | `/var/log/egov` |

## 헬스체크

- `/actuator/health` - 애플리케이션 상태
- `/actuator/info` - 애플리케이션 정보
- `/actuator/metrics` - 메트릭 정보
