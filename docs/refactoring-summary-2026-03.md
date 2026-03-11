# 2026-03 관리자 모듈 통합 및 메뉴 구조 리팩토링 백서

## 1. 배경 및 목적 (Background & Goals)

본 프로젝트는 전자정부 프레임워크의 방대한 기능을 수직 슬라이싱(Vertical Slicing) 아키텍처로 전환하는 과정에서, 관리 기능이 각 비즈니스 모듈(`Workspace`, `Operation`)에 산재해 있어 유지보수의 파편화가 발생하였습니다.

이를 해결하기 위해 **"중앙 집중식 통합 관리 센터(Unified Admin Center)"** 구축을 목표로 다음과 같은 리팩토링을 수행하였습니다.

1.  **관심사의 분리(SoC)**: 일반 사용자 로직과 관리자/운영자 로직을 물리적으로 분리.
2.  **모듈 경량화**: `Workspace`, `Operation` 모듈에서 무거운 관리 로직을 제거하여 순수 사용자 기능에 집중.
3.  **메뉴 계층 구조 최적화**: 난잡했던 DB 메뉴 코드를 4대 대분류 체계로 일목요연하게 재편.

---

## 2. 주요 리팩토링 내용 (Key Changes)

### 2.1. 백엔드 도메인 이관
기존 모듈에서 `module-system-admin`으로 이관된 핵심 도메인 목록입니다.
- **`module-workspace`로부터**: 배너(Banner), 팝업(Popup), 게시판 마스터(BoardMaster), 커뮤니티 마스터(CommunityMaster)
- **`module-operation`으로부터**: 설문(Survey), 상담(Consultation), Q&A

### 2.2. 패키지 아키텍처 재구축
단위 기능별로 흩어져 있던 패키지를 도메인 성격에 따라 계층화하였습니다.
- `com.company.project.service.system.content`: 콘텐츠형 관리 도메인 (Banner, Popup, Community 등)
- `com.company.project.service.system.service`: 서비스형 관리 도메인 (Survey, Consult, QnA 등)

### 2.3. DB 메뉴 체계 재편 (nmenuinfo)
기존의 불규칙한 메뉴 번호를 다음과 같이 100만 단위 대분류로 통합하였습니다.
- `1000000`: Workspace (개인 업무)
- `2000000`: Community (소통 및 콘텐츠)
- `3000000`: Service (사용자 요청 및 접점)
- `5000000`: System Admin (통합 관리소)

---

## 3. 기술적 해결 방법 (Technical Execution)

### 3.1. 자동화 마이그레이션 스크립트 활용
수백 개의 파일과 패키지 선언을 수동으로 변경하는 리스크를 방지하기 위해 **Python 기반 마이그레이션 스크립트(`move_admin_domain.py`)**를 개발하여 적용하였습니다.
- **기능**: 파일 물리적 이동, `package` 선언문 수정, `import` 구문 자동 업데이트, 의존성 관계 분석.
- **성과**: 약 150여 개의 Java 소스 파일에 대한 패키지 변경 작업을 단시간에 에러 없이 완료.

### 3.2. 의존성 격리 (Isolation)
`BoardMaster` 엔티티와 같이 사용자 모듈에서도 직접 참조가 필요한 일부 핵심 엔티티는 공유 도메인으로 남겨두고, 이를 제어하는 **관리자 인터페이스(Controller/AdminService)**만 이관하여 모듈 간의 순환 참조를 방지하였습니다.

---

## 4. 최종 성과 (Outcomes)

1.  **코드 응집도**: 관리자 기능이 한 곳(module-system-admin)에 모여 보안 정책 및 공통 UI 레이아웃 적용이 용이해짐.
2.  **가독성**: 메뉴 구조가 비즈니스 로직과 1:1로 매칭되어 개발자가 특정 기능의 소스를 찾는 시간이 단축됨.
3.  **확장성**: 향후 새로운 관리 기능 추가 시 `module-system-admin` 하나만 확장하면 되는 구조적 안정성 확보.

---
**보고서 작성**: 2026-03-12
**수행 도구**: Antigravity Assistant & Python Automation Scripts
