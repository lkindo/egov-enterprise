# 전자정부프레임워크 5.0 공통 모듈 구축 - 상세 설계서 (LLD)

## 1. 프로젝트 구조 및 패키지 설계

### 1.1. 백엔드 (Multi-Module)
기본 패키지 접두사: `com.company.project`

*   **common-core**: `core.config`, `core.exception`, `core.response`, `core.util`
*   **common-domain**: `domain.[module].entity`, `domain.[module].repository`, `domain.[module].dto`
*   **common-service**: `service.[module].impl`, `service.[module].mapper`
*   **common-security**: `security.config`, `security.jwt`, `security.service`
*   **api-server**: `api.controller.[module]`, `api.config.swagger`

### 1.2. 프론트엔드 (Next.js 14 App Router)
*   **src/app**: 페이지 라우팅 및 서버 컴포넌트 (`(auth)`, `(dashboard)`, `api` 등)
*   **src/components**: 재사용 가능한 UI 컴포넌트 (`ui/`, `common/`, `[module]/`)
*   **src/services**: API 연동 로직 (Axios 인스턴스, 모듈별 API 호출 함수)
*   **src/types**: 전역 및 모듈별 TypeScript 인터페이스/타입 정의
*   **src/lib**: 공통 유틸리티 함수 및 설정 (Zod 스키마, 전역 상수)

## 2. 도메인 상세 설계 (Domain Details)

### 2.1. 주요 모듈 및 엔터티 매핑
| 모듈 그룹 | 주요 도메인 | 관련 테이블 (Legacy) | 설명 |
| :--- | :--- | :--- | :--- |
| **시스템 (`sym`)** | Code, Menu, Program | `COMTCCMMNCODE`, `COMTNMENUINFO` | 시스템 기반 데이터 관리 |
| **보안 (`sec`)** | Role, Author, Group | `COMTNAUTHORINFO`, `COMTNROLEINFO` | RBAC 권한 제어 도메인 |
| **사용자 (`uss`)** | User, Login | `COMTN_EMPTLYR_INFO` | 일반/업무 사용자 및 인증 정보 |
| **협업 (`cop`)** | Board, File, Comment | `COMTN_BBS`, `COMTN_FILE` | 게시판, 첨부파일 등 협업 기능 |
| **운영 (`smt`)** | Schedule, Report | `COMTN_SCHDL`, `COMTN_REPRT` | 일정 관리 및 업무 보고 도메인 |

### 2.2. 데이터베이스 엔터티 설계 원칙
*   **BaseEntity**: 모든 엔터티는 `BaseTimeEntity`(생성/수정일)를 상속.
*   **복합키 처리**: 복합키 사용 시 `@EmbeddedId` 또는 `@IdClass`를 활용하되, 가급적 대리키(ID) 사용을 권장.
*   **연관관계**: `@ManyToOne` (FetchType.LAZY)을 기본으로 하며, 필요한 경우에만 양방향 관계 설정.

## 3. 핵심 로직 및 인터페이스 설계

### 3.1. API 응답 표준 (ApiResponse)
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```
*   **상태 코드**: HTTP Status Code를 원칙으로 하되, 비즈니스 에러인 경우 별도의 `ErrorCode` 객체 포함.

### 3.2. 프론트엔드 데이터 페칭 가이드라인
*   **Server Components**: 초기 데이터 로딩은 `src/app` 내 서버 컴포넌트에서 수행.
*   **Client Components**: 사용자 인터랙션이 필요한 경우 `use hooks`를 활용하여 클라이언트 사이드 페칭.
*   **Error Boundary**: `error.tsx`를 통한 라우트별 예외 처리.

## 4. API 명세 주요 요약 (API Roadmap)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/api/v1/auth/login` | JWT 로그인 | No |
| POST | `/api/v1/auth/logout` | 로그아웃 (토큰 무효화) | Yes |
| GET | `/api/v1/users/me` | 현재 세션 사용자 정보 | Yes |
| GET | `/api/v1/codes` | 공통 코드 목록 조회 | Yes |
| GET | `/api/v1/boards` | 게시판 목록 조회 | Yes |
| POST | `/api/v1/files/upload` | 멀티파트 파일 업로드 | Yes |

## 5. 구현 세부 규칙
*   **매핑 전략**: Entity ↔ DTO 변환 시 클래스 내부 정적 메서드(`of`, `from`) 또는 생성자 패턴 권장.
*   **로깅**: SLF4J (Logback) 기반의 레벨별 로깅 적용 (TRACE/DEBUG/INFO/WARN/ERROR).
*   **타입 안정성**: 프론트엔드에서는 Zod를 사용한 스키마 검증 및 통합 타입 정의 필수.
