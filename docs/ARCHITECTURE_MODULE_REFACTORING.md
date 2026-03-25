# 아키텍처 리팩토링 제안: 2계층 모듈 구조화 전략 (2-Tier Module Strategy)

본 문서는 대규모 멀티 모듈 기반의 시스템을 유지보수 효율성과 배포 단순성을 위해 2개의 핵심 레이어로 통합·재구성하는 아키텍처 가이드라인을 담고 있습니다.

---

## 1. 배경 및 목적 (Background & Motivation)
현재 프로젝트는 8개 이상의 도메인별 수직 모듈(`module-*`)로 세분화되어 있어 전문적인 구조를 갖추고 있으나, 시스템 규모가 커짐에 따라 다음의 관리적 부담이 발생하고 있습니다.
- **복잡도 증가**: 모듈 간 의존성 그래프가 복잡해지며 빌드 설정 및 관리가 어려움.
- **배포 오버헤드**: 동일한 기술 스택과 라이프사이클을 가진 모듈들이 과도하게 분산됨.
- **중복성**: `common-core`와 `common-security`, `iam` 등 필수 인프라 성격의 모듈이 상시 동반 변경됨.

이를 **'기반(Foundation)'**과 **'업무(Business Suite)'** 계층으로 통합하여 운영 효율을 극대화하고자 합니다.

---

## 2. 모듈 재구성 설계 (Architecture Blueprint)

### 계층 1: `foundation` (시스템 기반 & 거버넌스)
시스템이 존재하기 위한 '핵심 엔진'이며, 모든 서비스의 토대가 되는 인프라적 성격을 띕니다.

- **통합 대상 모듈**:
    - `common-core`: 인프라 설정, JPA/QueryDSL 인프라, 전역 예외 처리 표준.
    - `common-security`: Spring Security 설정, JWT 인증 필터, 암호화 정책.
    - `module-core-iam`: 사용자(User), 권한(Role), 부서(Dept), 인증(Auth) 비즈니스 로직.
    - `module-system-admin`: 공통 코드, 메뉴 아키텍처 거버넌스, 시스템 로그/정책 관리.
- **핵심 역할**:
    - **Identity & Access**: 시스템의 주체(누가)와 행위(무엇을)를 정의하고 통제함.
    - **Standardization**: 모든 API의 품질(응답 포맷, 예외 처리)을 균일하게 보장함.

### 계층 2: `business-suite` (업무 서비스 & 콘텐츠)
`foundation` 위에서 실제 비즈니스 가치를 창출하고 사용자와 상호작용하는 '업무 도구' 그룹입니다.

- **통합 대상 모듈**:
    - `module-workspace`: 게시판(BBS), 대시보드, 메일, 일정 등 사용자의 협업 도구.
    - `module-operation`: 전자결재, SMS 전송, 업무 보고, 보상 관리 등 고유 프로세스.
    - `module-knowledge`: 지식 관리(Knowledge Base) 및 아카이빙.
- **핵심 역할**:
    - **Business Execution**: 실제 업무 절차를 실행하고 데이터를 생산함.
    - **Extension**: 향후 인사, 회계 등 새로운 비즈니스 요구사항이 생길 때 확장되는 포인트.

---

## 3. 핵심 설계 원칙 (Design Principles)

### 3.1. 단방향 의존성 (Unidirectional Dependency)
- `business-suite`는 `foundation`에만 의존하며, 기반 모듈은 업무 모듈의 존재를 몰라야 합니다 (Core Purity).

### 3.2. 기능 배포 마법사 (Feature Provisioning Wizard)
- 게시판 자동 생성과 같은 '마법사' 로직은 **`Business Suite`**에 위치해야 합니다.
- 마법사는 내부적으로 `Foundation`이 제공하는 메뉴 생성(`createMenu`) 및 권한 설정(`assignRole`) API를 호출하여 자산을 완성합니다. 이를 통해 기반 모듈의 경량화와 도메인 간 결합도(Loosely Coupling)를 유지합니다.

---

## 4. 기대 효과 (Expected Benefits)
1. **유지보수 효율성**: 파편화된 `build.gradle` 설정이 단순해지며 모듈 간 순환 참조 발생 가능성이 차단됨.
2. **배포 유연성**: '기반 서버'와 '업무 서버'로 물리적 분리(Microservices Ready) 배포가 용이해짐.
3. **학습 곡선 단축**: 신규 개발자가 프로젝트의 전체 구조를 빠르게 파악할 수 있는 직관적 계층 구조 제공.

---

## 5. 프로젝트 기술 평가 요약 (Overall Score: 8.8/10)
- **아키텍처(9.0)**: 견고한 도메인 분리 및 모듈성 보유.
- **기술 스택(9.5)**: Spring Boot 3.4 & Next.js 15의 최상위 현대적 조합.
- **안정성(8.8)**: Playwright 기반 E2E 검증 시스템 구축 완료.

---
*최종 업데이트: 2026-03-25*
*문서 작성자: Antigravity AI Assistant*
