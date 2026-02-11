# eGov Enterprise Modernization (전자정부 프레임워크 모더니제이션)

> **전자정부 표준프레임워크 5.0 기반 엔터프라이즈 모더니제이션 프로젝트**  
> 레거시 JSP/Spring 기반의 공통 컴포넌트를 **Next.js 14 (App Router)**와 **Spring Boot 3.3 + JPA** 기반의 현대적인 Full-stack 아키텍처로 완전히 전환하고 고도화한 프로젝트입니다.

---

## � 프로젝트 개요 (Overview)

본 프로젝트는 전자정부 표준프레임워크의 방대한 공통 컴포넌트를 최신 기술 스택으로 재구축하여, 엔터프라이즈 환경에서의 확장성, 유연성, 그리고 사용자 경험(UX)을 극대화하는 것을 목표로 합니다.

- **Frontend**: 차세대 React 프레임워크인 Next.js 14를 활용한 고성능 UI/UX 구현.
- **Backend**: Spring Boot 3.3 및 JPA를 통한 비즈니스 로직의 현대화 및 도메인 중심 설계.
- **Visual Analytics**: 데이터 시각화 라이브러리를 통한 실시간 통계 대시보드 제공.

---

## 🛠 기술 스택 (Modern Tech Stack)

### Frontend
- **Framework**: Next.js 16.x (App Router)
- **Language**: TypeScript 5.0+ (Strict Mode)
- **Styling**: Tailwind CSS 4.x, Shadcn/UI (Modern Component System)
- **State/Data**: Axios, React Hooks, Client/Server Components
- **Visualization**: Recharts (Chart components)
- **Icons**: Lucide React

### Backend
- **Core**: Spring Boot 3.3.x, Java 21 (LTS)
- **Database**: PostgreSQL (JPA/Hibernate)
- **Service**: Domain-driven Architecture (Modular structure)
- **Security**: Spring Security 6, JWT (Json Web Token)
- **API**: RESTful API with JSON
- **Build**: Gradle 8.x

---

## � 프로젝트 구조 (Project Structure)

```bash
egov-enterprise/
├── api-server/         # Spring Boot API 서버 (Controller, Config)
├── common-service/     # 비즈니스 로직 및 서비스 레이어
├── common-domain/      # JPA Entity, Repository 및 도메인 모델
├── common-core/        # 공통 유틸리티 및 예외 처리
├── common-security/    # 인증/인가 (JWT, Security Config)
├── frontend/           # Next.js 14 프런트엔드 애플리케이션
│   ├── src/app/        # App Router 기반 페이지 구성
│   ├── src/components/ # UI 및 비즈니스 컴포넌트 (Shadcn/UI 기반)
│   ├── src/services/   # API 통신 레이어
│   └── src/types/      # TypeScript 인터페이스 정의
└── legacy/             # 레거시 eGovFrame 원본 소스 (참조용)
```

---

## 📊 구현 현황 (Implementation Status)

현재 모든 핵심 단계(Phase 1~4)가 완료되어 실무 적용이 가능한 수준의 현대화된 기능을 제공합니다.

| 단계 | 주요 내용 | 진행 상태 |
| :--- | :--- | :---: |
| **Phase 1: 기반 구축** | 시스템 관리, 보안 설정, 사용자 인증, 로그 관리 | ✅ 완료 (100%) |
| **Phase 2: 협업/컨텐츠** | 게시판, 커뮤니티(동호회), 주소록, 전역 파일/댓글 관리 | ✅ 완료 (100%) |
| **Phase 3: 운영 지원** | 일정 관리, 부서 업무, 온라인 설문, 약관 관리, 보고서 | ✅ 완료 (100%) |
| **Phase 4: 통합/통계** | 실시간 사용자/화면 통계, 디지털 자산 관리 | ✅ 완료 (100%) |

### 핵심 모듈 상술 (Key Migrated Modules)
- **Administrative Tools**: 공통코드, 메뉴 관리, 프로그램 관리, 로그(시스템/웹/개인정보 등) 관리.
- **Security & IAM**: 권한 관리, 롤 관리, 그룹 관리 등 정교한 RBAC 시스템.
- **Collaboration Suite**: 공지사항, 갤러리 게시판, 동호회 관리, 주소록.
- **Operational Support**: 부서/개인 일정 관리, 주간/월간 보고 승인 프로세스, 온라인 설문 참여 및 결과 조회.
- **Analytics Dashboard**: User/Screen 방문 정보 시각화 (Recharts 기반).

---

## 🎨 UI/UX 특장점

1. **Dashboard First**: 대시보드 중심의 UI로 최근 공지, 설문 현황, 주요 통계를 한눈에 확인 가능.
2. **Glassmorphism Design**: 로그인 페이지 등 주요 진입점에 현대적인 디자인 트렌드 반영.
3. **Advanced Filtering**: Shadcn/UI 기반의 고성능 데이터 테이블과 필터링 시스템.
4. **Standalone Admin Pages**: 파일 및 댓글을 전역적으로 관리할 수 있는 독립 관리자 인터페이스 추가.

---

## ⚙️ 시작하기 (How to Start)

### 1. Backend (Java/Spring)
```bash
# 루트 디렉토리에서 실행
./gradlew bootRun
```
- API Endpoint: `http://localhost:8080/api/v1`

### 2. Frontend (Next.js)
```bash
cd frontend
pnpm install
pnpm dev
```
- Web Interface: `http://localhost:3000`

---

## ✅ 검증 결과 (Verification)

- **Type Check**: TypeScript Strict 모드 기준 에러 없음 (Confirmed via `tsc --noEmit`).
- **Build**: Production 빌드 성공 (`next build` 완료).
- **Security**: JWT 기반 인증 및 Spring Security RBAC 적용 완료.

---
*Last Updated: 2026-02-08*
