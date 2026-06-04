# 20260604 백엔드 구문 및 분기 커버리지 개선 작업 기록

## 1. 요구 사항
- 백엔드(Spring Boot)의 구문 커버리지(Statement Coverage) 및 분기 커버리지(Branch Coverage)를 개선하기 위해 테스트 케이스 보완.
- 비즈니스 프로덕션 소스 코드는 그대로 유지하고 테스트 소스 코드만 추가/보완.

## 2. 수행 내용
- **`RrnoEncryptionConverter` 단위 테스트 신규 작성**:
  - `RrnoEncryptionConverterTest.java` 파일을 생성하여 null, 공백, 정상 암/복호화, CryptoUtil 실패 시 Fallback plain text 반환 등 예외 분기를 100% 검증.
- **`SatisfactionService` 단위 테스트 보완**:
  - `SatisfactionServiceTest.java` 내 레거시 오버로딩 메서드 호출, 조회 실패 시 비즈니스 예외 분기, 비밀번호 일치/불일치 분기 추가.
- **`ScheduleApiController` 통합 테스트 보완**:
  - `ScheduleApiControllerTest.java` 내 부서 일정, 기간 일정, 상세 조회, 등록, 수정, 삭제 엔드포인트 추가.
  - 비로그인(anonymous) 사용자 등록 시 401 Unauthorized 반환 분기 커버.

## 3. 검증 결과
- **컴파일 무결성**: `./gradlew compileJava compileTestJava` 빌드 성공 (Green Pass).
- **테스트 무결성**: `./gradlew test jacocoRootReport "-Dspring.jpa.show-sql=false" --no-build-cache` 빌드 성공 (Green Pass).
- **커버리지 지표 변화 (Jacoco Aggregated)**:
  - 구문 커버리지: 88.33% ➔ **88.95%** (+0.62%p 상승)
  - 분기 커버리지: 76.04% ➔ **76.67%** (+0.63%p 상승)
  - 보완된 3개 대상 클래스(RrnoEncryptionConverter, SatisfactionService, ScheduleApiController)는 모두 **구문 커버리지 100%** 달성.
