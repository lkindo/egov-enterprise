# 전자정부프레임워크 5.0 호환성(표준 준수) 갭 분석 보고서

현 상태의 프로젝트는 "Spring Boot 기반의 현대적 아키텍처"로는 훌륭하지만, **"전자정부프레임워크 호환성 인증(SW Certification)"** 심사를 통과하기 위해서는 **필수 라이브러리**와 **표준 코딩 관행**이 일부 누락되어 있습니다.

인증 심사 통과를 위해 보완이 필요한 4가지 핵심 영역을 분석했습니다.

## 1. 필수 RTE 라이브러리 누락 (Missed Dependencies)
현재 `fdl-cmmn`만 적용되어 있으나, 호환성 인증을 위해서는 다음 모듈들이 추가되어야 합니다.

| 모듈명 | 역할 | 필요성 |
| :--- | :--- | :--- |
| **egovframe-rte-psl-dataaccess** | 데이터 액세스 표준 | JPA를 쓰더라도 트랜잭션 등 표준 처리 지원을 위해 포함 권장. |
| **egovframe-rte-fdl-idgnr** | ID 생성 서비스 | DB Auto Increment 외에, 표준화된 ID 채번(`UU-2024-001` 등) 기능 필수. |
| **egovframe-rte-fdl-property** | 프로퍼티 관리 | `application.yml` 외에 DB/XML 기반의 동적 환경설정 관리 기능. |
| **egovframe-rte-fdl-logging** | 로깅 표준 | Log4j2 기반의 표준 로깅 설정. |

**[개선 방안]**
`common-core` 모듈의 `build.gradle`에 위 3가지 의존성을 추가해야 합니다.

## 2. 표준 클래스 상속 미적용 (Inheritance)
전자정부프레임워크는 비즈니스 로직 구현 시 표준 부모 클래스를 상속받아 개발 생산성을 높이는 것을 권장합니다.

*   **현재**: `UserService` (POJO)
*   **표준 권장**: `public class UserService extends EgovAbstractServiceImpl`
    *   **이유**: `egovLogger`, `leaveaTrace`(에러 추적) 등 프레임워크 내장 유틸리티를 즉시 사용할 수 있음.

## 3. ID Generation 서비스 미설정
JPA의 `@GeneratedValue(IDENTITY)`는 간편하지만, 엔터프라이즈 환경나 호환성 심사에서는 **"업무 규칙이 반영된 ID"** (예: `USER-00001`) 생성을 요구하는 경우가 많습니다.

**[개선 방안]**
*   `EgovIdGnrService` 빈(Bean) 설정 추가 (Java Config).
*   필요 시 JPA Entity의 `@Id` 생성 전략을 커스텀하거나, 별도 필드로 업무 키(Business Key) 관리.

## 4. 국제화(i18n) 메시지 처리 (EgovMessageSource)
단순 하드코딩된 문자열 대신, 프레임워크가 제공하는 `EgovMessageSource`를 통해 다국어 메시지를 처리하는 구조를 갖춰야 합니다.

---

## 5. 결론 및 추천 진행 계획

호환성 레벨을 "상"으로 높이려면 다음 작업을 수행할 것을 강력히 추천합니다.

1.  **[의존성]** `common-core`에 `psl-dataaccess`, `fdl-idgnr`, `fdl-property` 추가.
2.  **[설정]** `EgovMybaitsConfig` (필요시), `EgovIdGnrConfig` (ID생성), `EgovMessageConfig` (메시지) 자바 설정 파일 생성.
3.  **[코드]** Service/Controller가 `EgovAbstractServiceImpl` 등을 상속받도록 리팩토링.
