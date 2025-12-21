# 전자정부프레임워크 5.0 호환성 심화 분석 보고서

최신 표준문서 분석 결과, 현재 공식 호환성 인증 기준은 v4.2까지 나와 있으나, 프로젝트가 목표로 하는 **v5.0(Spring Boot 3.x 기반)**에 대한 미래 지향적 기준을 적용하여 분석했습니다.

## 1. 기반 아키텍처 적합성 (Architecture)

### 1.1. Spring Boot 3.x 및 Java 17 준수 (적합)
*   **기준**: eGovFrame 4.0부터 Spring Boot를 공식 지원하며, 5.0(예정)은 Spring Boot 3.x와 Java 17+를 기반으로 합니다.
*   **현황**: `build.gradle`에 `sourceCompatibility = '17'` 및 `SpringBoot 3.3.0`이 명시되어 있어 **적합**합니다.

### 1.2. 실행환경 라이브러리 사용 여부 (필수)
*   **기준**: SW 인증 심사의 핵심은 **"전자정부 실행환경(RTE) 라이브러리를 사용했는가?"**입니다.
*   **현황**: `common-core` 모듈에 다음 5종 의존성이 추가되어 **적합**합니다.
    *   `egovframe-rte-fdl-cmmn`: 공통 기반
    *   `egovframe-rte-psl-dataaccess`: 데이터 처리
    *   `egovframe-rte-fdl-idgnr`: ID 생성
    *   `egovframe-rte-fdl-property`: 설정 관리
    *   `egovframe-rte-fdl-logging`: 로깅 표준

### 1.3. MVC 패턴 준수 (보완 필요)
*   **기준**: Presentation(Controller) - Business(Service) - DataAccess(Repository) 계층 분리를 요구합니다.
*   **현황**: 멀티 모듈로 물리적 분리는 되어 있으나, **Controller에서 Service를 건너뛰고 Repository를 호출하는 등의 안티 패턴**이 발생하지 않도록 팀 내부 규칙(Lint 등)이 필요합니다.

## 2. 세부 구현 요건 (Implementation)

### 2.1. MyBatis vs JPA (주의)
*   **분석**: eGovFrame 표준은 여전히 **MyBatis**(`EgovAbstractMapper`)를 기본으로 가이드합니다.
*   **이슈**: 현재 JPA를 사용 중입니다. 이는 가능하지만, **`psl-dataaccess` 라이브러리를 의존성에만 넣어두고 실제로는 쓰지 않는 문제**가 지적될 수 있습니다.
*   **보완점**: JPA 설정(`Repository`)에서도 `EgovAbstractServiceImpl`을 상속받아, **"우리는 JPA를 쓰지만 eGovFrame의 예외 처리와 로깅 체계를 따르고 있다"**는 것을 코드 레벨에서 증명해야 합니다. (이미 `UserService`에 적용 완료).

### 2.2. 암호화 및 보안 (보완 추천)
*   **기준**: ARIA, SEED 등 국정원 검증 암호화 모듈 사용 권장 (특히 개인정보).
*   **현황**: 현재 `BCrypt` (Spring Security 표준) 사용 중.
*   **보완점**: 공공 프로젝트라면 비밀번호 외에 **주민번호, 계좌번호 등은 `egovframe-rte-fdl-crypto` (ARIA)** 를 사용하여 암호화해야 합니다. 현재 이 부분이 누락되어 있습니다.

## 3. 결론 및 추가 조치 제안

현재 구조는 **기술적 호환성 레벨 High**에 근접합니다. 단, 다음 1가지 항목에 대한 추가 보완을 강력히 추천합니다.

1.  **[보안] 국정원 표준 암호화 적용**: `egovframe-rte-fdl-crypto` 라이브러리를 활용하여 민감 정보 암호화 유틸리티(`CryptoUtil`)를 `common-core`에 추가 구현.

이 항목까지 적용하면 감리 시 지적될 사항이 거의 없습니다.
