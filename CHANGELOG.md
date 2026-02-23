# Changelog

모든 중요한 변경사항은 이 파일에 기록됩니다.

---

## [Unreleased] - 2026-02-21

### 🎉 Added
- 프로젝트 현대화 완료 (Phase 1-4)
- Next.js 16 + TypeScript 기반 프론트엔드
- Spring Boot 3.3 + JPA 기반 백엔드
- 실시간 통계 대시보드 (Recharts)
- Shadcn/UI 기반 컴포넌트 시스템

### 🔧 Changed
- **Git 저장소 최적화**
  - `.gitignore` 정비: 빌드 산출물 (`bin/`, `build/`, `generated-sources/`) 추적 제외
  - `.factorypath` 등 IDE 설정 파일 Git 추적 제외
  - 패키지 잠금 파일 통일: `pnpm-lock.yaml` 우선
  
- **Line Ending 통일**
  - `.gitattributes` 설정: 모든 텍스트 파일 LF 강제
  - Windows 배치 파일 (`.bat`, `.cmd`) 는 CRLF 유지
  - 770+ 개 Java 소스 파일 Line Ending LF 로 통일
  
- **API 서버 설정**
  - PostgreSQLDialect 자동 감지 설정
  - 암호화 설정 업데이트
  - RedisRepositoriesAutoConfiguration 제외

- **프론트엔드**
  - `tabs.tsx` 컴포넌트 추가
  - 관리자 페이지 업데이트 (backup, monitoring)
  - 패키지 의존성 업데이트

### 🔒 Security
- **민감 정보 보호**
  - `**/egovProps/conf/` Git 추적 제외
  - `*.local.properties` Git 추적 제외
  - 암호화 키, 비밀번호 등 중요 정보 커밋 방지

- **이진 파일 관리**
  - Office 문서 (`*.xlsx`, `*.xls`, `*.doc`, `*.docx`) Git 추적 제외

### 📚 Documentation
- README.md 대폭 개정
  - 최근 업데이트 섹션 추가
  - 개발 가이드 추가
  - 기여 가이드 추가
  - 문서 링크 정리

---

## [1.0.0] - 2026-02-08

### 🎉 Added
- 전자정부 표준프레임워크 5.0 기반 모더니제이션 프로젝트 시작
- Next.js 14 (App Router) 기반 프론트엔드 아키텍처
- Spring Boot 3.3 + JPA 기반 백엔드 아키텍처
- 멀티 모듈 Gradle 프로젝트 구조

### 🔧 Changed
- 레거시 JSP → Next.js 페이지 전환
- MyBatis → JPA 도메인 모델 전환
- XML 설정 → Java 기반 설정 전환

### 📦 Modules
- `api-server`: Spring Boot API 서버
- `common-service`: 비즈니스 로직 서비스
- `common-domain`: JPA 엔티티 및 도메인 모델
- `common-core`: 공통 유틸리티
- `common-security`: 인증/인가
- `frontend`: Next.js 애플리케이션

### 🗑️ Removed
- `common-legacy-support`: 레거시 호환성 모듈 삭제 (현대화 완료)

---

## 📝 Changelog 작성 가이드

이 파일은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/) 형식을 따릅니다.

### 버전 태그
- `Added`: 새로 추가된 기능
- `Changed`: 기존 기능의 변경
- `Deprecated`: 곧 제거될 기능
- `Removed`: 제거된 기능
- `Fixed`: 버그 수정
- `Security`: 보안 관련 변경

### 버전 번호
`[메저.마이너.패치]` 형식을 사용합니다.
- **메저**: 하위 호환되지 않는 변경
- **마이너**: 하위 호환되는 기능 추가
- **패치**: 하위 호환되는 버그 수정
