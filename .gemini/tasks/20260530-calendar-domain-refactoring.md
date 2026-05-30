# Task: 일정 도메인(calendar) Restde 엔티티 검증 및 감사 일관성 수립

본 태스크는 `egov-enterprise` 프로젝트 내 휴일 일정 도메인의 `Restde` 엔티티에 대해 Audit 컬럼명을 전사 데이터베이스 스키마 명세에 맞게 명시적으로 재정의하고, String YYYYMMDD 일자 데이터의 유효성을 도메인 캡슐화 수준에서 엄격하게 자동 검증하도록 보강하는 L1 등급 리팩토링 태스크입니다.

---

## 체크리스트 (Ralph Loop Checklist)

- [x] **1단계: 기존 Restde 도메인 소스 분석 및 매핑 파악**
  - [x] `Restde.java` 클래스 내 Auditing 상속 누락 지점 점검
  - [x] 날짜 데이터 입출력 제약 조건 및 비즈니스 훅 스캔
- [x] **2단계: Auditing 재정의 및 날짜 포맷 자동 검증 기입**
  - [x] `Restde.java` 상단에 `@AttributeOverrides` 기입
  - [x] 생성자 및 `update()` 메서드 호출 시 `validateDateFormat()` 검증 필터 자동 실행
- [x] **3단계: 컴파일 검증 및 통합 테스트 그린 패스 입증**
  - [x] `./gradlew compileJava` 빌드 무결성 확인
  - [x] `./gradlew test` 테스트 성공 증명
