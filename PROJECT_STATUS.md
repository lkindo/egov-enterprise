# 프로젝트 전체 진행 현황 (Project Status Dashboard)

> **최종 업데이트**: 2026-03-01
> **프로젝트명**: eGov Enterprise Modernization (전자정부 프레임워크 모더니제이션)
> **기술 스택**: Next.js 15 + Spring Boot 3.4 + PostgreSQL

---

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [모듈 목록 및 역할](#-모듈-목록-및-역할)
3. [백엔드 진행 현황](#-백엔드-진행-현황)
4. [프론트엔드 진행 현황](#-프론트엔드-진행-현황)
5. [리팩토링 및 마이그레이션 (Refactoring)](#-리팩토링-및-마이그레이션-refactoring)
6. [테스트 현황](#-테스트-현황)
7. [추가 확인 필요 항목](#-추가-확인-필요-항목)
8. [마일스톤 요약](#-마일스톤-요약)

---

## 📌 프로젝트 개요

### 목표
전자정부 표준프레임워크 5.0 의 레거시 JSP/Spring 기반 공통 컴포넌트를 **현대적 Full-stack 아키텍처**로 전환하고, 코드 내 약어(Abbreviation) 제거 및 도메인 중심의 아키텍처로 정비

### 아키텍처
```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│  Next.js 15 (App Router) + TypeScript + Shadcn/UI          │
│  Class-based Service Architecture (Admin/User/Common)      │
├─────────────────────────────────────────────────────────────┤
│                      API Gateway                            │
│  Spring Boot 3.4 + Spring Security 6 + JWT                 │
│  Admin/User API Separation (/api/v1/admin/system/...)      │
├─────────────────────────────────────────────────────────────┤
│                   Business Logic Layer                      │
│  Domain-Driven Service Modules (common-service)            │
│  Full-word Domain Naming (e.g., vacation, community)       │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                        │
│  JPA/Hibernate + QueryDSL + PostgreSQL                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 모듈 목록 및 역할

### 백엔드 모듈 (Java/Spring)

| # | 모듈명 | 버전 | 역할 | 주요 의존성 |
|---|--------|------|------|-------------|
| 1 | **common-core** | 0.0.1-SNAPSHOT | 공통 유틸리티, 예외 처리, eGovFrame Core | eGovFrame 5.0, Spring Web, Lombok |
| 2 | **common-domain** | 0.0.1-SNAPSHOT | JPA Entity, Repository, 도메인 모델 | Spring Data JPA, QueryDSL, Hibernate Envers |
| 3 | **common-security** | 0.0.1-SNAPSHOT | 인증/인가, JWT, Security Config | Spring Security 6, JWT 0.12.6 |
| 4 | **common-service** | 0.0.1-SNAPSHOT | 비즈니스 로직, 서비스 레이어 | MapStruct, Spring Validation, WebSocket |
| 5 | **api-server** | 0.0.1-SNAPSHOT | REST API, Controller, 설정 | Spring Boot, SpringDoc, MyBatis (최소화) |

### 프론트엔드 모듈 (Node.js/TypeScript)

| # | 모듈명 | 버전 | 역할 | 주요 의존성 |
|---|--------|------|------|-------------|
| 1 | **frontend** | 0.1.0 | Next.js 15 웹 애플리케이션 | React 19, TypeScript 5, Tailwind CSS 4, Shadcn/UI |

---

## 🔧 백엔드 진행 현황

### 모듈별 패키지 구조 (리팩토링 완료)

#### 1. common-core
**진행률**: ✅ **100% 완료**
- 공통 유틸리티 및 예외 처리 시스템 구축

#### 2. common-domain
**진행률**: ✅ **100% 완료 (약어 제거 리팩토링 포함)**
- **주요 변경**: 레거시 약어(`vct`, `adb` 등)를 완전한 단어로 변경
- `addressbook`, `banner`, `board`, `calendar`, `comment`, `community`, `digitalassetmanagement`, `event`, `holiday`, `meeting`, `notification`, `vacation` 등 70여 개 도메인 표준화 완료
- 230+ 개 Repository 인터페이스 리팩토링 완료

#### 3. common-security
**진행률**: ✅ **100% 완료**
- JWT 0.12.6 및 Spring Security 6 기반 RBAC 시스템

#### 4. common-service
**진행률**: ✅ **100% 완료 (비즈니스 로직 고도화)**
- 70 개 비즈니스 서비스 구현 및 도메인 명칭 동기화
- 190+ 개 Service 클래스 리팩토링 (MapStruct 기반 DTO 변환)

#### 5. api-server
**진행률**: ✅ **100% 완료 (API 구조 일원화)**
- 모든 관리자 API를 `/api/v1/admin/system/` 아래로 통합
- 중복 컨트롤러(`Vacation`, `Anniversary`, `Reward` 등) 통합 및 정리 완료
- RESTful 원칙에 따른 엔드포인트 재설계

---

## 🎨 프론트엔드 진행 현황

### 서비스 계층 재조직 (Phase 3 진행 중)
- **Class-based Architecture**: 기존 functional 서비스들을 `AdminService`, `UserService`, `CommonService` 등 클래스 기반으로 전환
- **폴더 구조 미러링**: 백엔드 컨트롤러 구조에 맞춰 `services/admin`, `services/user`, `services/common`으로 재배치
- **레거시 제거**: `userService.ts`, `logService.ts` 등 루트 레벨의 구형 functional 파일 대거 삭제 완료

### 프론트엔드 라우트 및 컴포넌트
- **관리자 페이지**: `/admin/system/...` 경로 동기화 및 폼 컴포넌트 서비스 객체 전환 완료
- **컴포넌트**: 300+ 개 컴포넌트의 API 호출 로직을 새로운 서비스 클래스로 업데이트

---

## 🏛️ 리팩토링 및 마이그레이션 (Refactoring)

`docs/REFACTORING_MIGRATION_PLAN.md`에 따른 단계별 진행 상황:

| 단계 | 목표 | 상태 | 주요 성과 |
| :--- | :--- | :---: | :--- |
| **Phase 1** | API 및 컨트롤러 구조 일원화 | ✅ 완료 | 관리자 API 경로 통합, 중복 컨트롤러 제거 |
| **Phase 2** | 도메인 명칭 및 패키지 표준화 | ✅ 완료 | 레거시 약어(vct, adb, cmy 등) 제거 및 용어 통일 |
| **Phase 3** | 프론트엔드 서비스 계층 재조직 | 🏃 진행 중 | 클래스 기반 서비스 전환, 폴더 구조 정비, 레거시 파일 삭제 |
| **Phase 4** | 타입 자동화 및 품질 관리 | ⏳ 대기 | Swagger 기반 타입 추출, ArchUnit 도입 검토 |

### 주요 리팩토링 완료 도메인
- `vct` → `vacation`, `ans` → `anniversary`, `evt` → `event`, `rwd` → `reward`
- `adb` → `addressbook`, `cmy` → `community`, `cmt` → `comment`, `noi` → `notification`
- `ctsnn` → `congratulation-condolence`, `smt` → `smart-toolkit`
- `ncm` → `namecard`, `ntm` → `note`, `ulm` → `unitylink`

---

## 🧪 테스트 현황

### 테스트 종합 지표
- **백엔드 단위 테스트**: 107+ 개 (JUnit 5, 커버리지 60%+)
- **프론트엔드 단위 테스트**: 1722+ 개 (Vitest, 주요 서비스 클래스 검증 포함)
- **E2E 테스트**: 14+ 개 시나리오 (Playwright) - 리팩토링된 경로 및 서비스 정상 작동 검증 완료

---

## ⚠️ 추가 확인 필요 항목

### 1. 백엔드 개선 사항
- **MyBatis 완전 제거**: 아직 남아있는 일부 MyBatis XML(`context-idgn-Srchwrd.xml`)을 Java Config로 완전 이전 고려 (🟡 중간)
- **ArchUnit 도입**: 패키지 간 순환 참조 및 리팩토링 규칙 준수 자동 검증 (🟡 중간)

### 2. 프론트엔드 개선 사항
- **Index Barrel Export**: `services/` 내 서브 폴더별 `index.ts` 구성 완료 필요 (🔴 높음)
- **TS 타입 자동 생성**: 백엔드 DTO 변경 시 프론트엔드 interface 자동 업데이트 환경 구축 (🟡 중간)

### 3. 인프라 및 운영
- **CI/CD 파이프라인**: 리팩토링된 구조를 반영한 빌드/배포 파이프라인 구축 (🔴 높음)
- **Docker 최적화**: 멀티 스테이지 빌드 적용 및 이미지 경량화 (🟡 중간)

---

## 🎯 마일스톤 요약

- [x] **Phase 1: 기반 구축 및 기능 구현** (2025-12 ~ 2026-02)
- [x] **Phase 2: API 일원화 및 도메인 표준화** (2026-02 ~ 2026-03-01)
- [ ] **Phase 3: 프론트엔드 서비스 구조 고도화** (진행 중, 90% 완료)
- [ ] **Phase 4: 자동화 및 안정화** (예정)

---

## 📊 종합 진행률

| 영역 | 진행률 | 상태 | 비고 |
|------|--------|------|------|
| **백엔드** | 99% | ✅ 완료 | 리팩토링 및 도메인 표준화 완료 |
| **프론트엔드** | 98% | 🏃 고도화 | 서비스 계층 재조직 중 |
| **테스트** | 80% | ✅ 확대 | 리팩토링 검증 테스트 완료 |
| **인프라** | 55% | 🔄 작업 필요 | CI/CD 및 운영 환경 정비 필요 |
| **전체 진행률** | **약 92%** | ✅ **안정화 단계** | 핵심 기능 및 아키텍처 정비 완료 |

---

*Last Updated: 2026-03-01*  
*Project Version: 0.1.0-REFACTORED*
