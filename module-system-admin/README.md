# Module System Admin (통합 관리 센터)

## 1. 개요
본 모듈은 서비스 전체의 마스터 설정 및 관리자(Admin) 전용 기능을 담당하는 핵심 모듈입니다. `Workspace` 및 `Operation` 모듈에서 분리된 모든 관리 로직이 이 모듈로 통합되었습니다.

## 2. 주요 책임 (Responsibilities)
- **사용자 및 권한 제어**: 계정 승인, 권한/롤 부여, 보안 정책 관리.
- **통합 콘텐츠 관리 (Content Admin)**:
  - 배너(Banner) 및 팝업(Popup) 노출 제어.
  - 게시판(Board) 및 커뮤니티(Community) 속성(Master) 정의.
- **통합 서비스 운영 (Service Admin)**:
  - 설문조사(Survey)지 설계 및 결과 통계.
  - 상담(Consultation) 및 Q&A 관리자 답변 처리.
- **시스템 기준 정보**: 공통코드, 메뉴 구조, 프로그램 목록 관리.

## 3. 주요 패키지 구조
- `com.company.project.api.controller.system`: 관리자 전용 REST API 컨트럴러.
- `com.company.project.service.system.content`: 콘텐츠 관리 비즈니스 로직.
- `com.company.project.service.system.service`: 유저 서비스 운영 비즈니스 로직.

## 4. 의존성 주의사항
본 모듈은 타 비즈니스 모듈의 관리 로직을 보유하지만, 데이터 일관성을 위해 필요한 엔티티(Entity)는 원본 모듈과 공유하거나 인터페이스를 통해 소통합니다. 순환 참조가 발생하지 않도록 의존성 방향에 주의하십시오.
