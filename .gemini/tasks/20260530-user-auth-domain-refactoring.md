# Task: 사용자 & 권한 도메인(auth, user) 보안 및 연관 관계 개선

본 태스크는 `egov-enterprise` 프로젝트 내 사용자 및 권한 도메인의 기틀을 개선하여, 주민등록번호(`rrno`) 등 민감 정보의 안전한 물리 데이터베이스 암호화 저장을 수립하고, 권한 매핑 테이블(`AuthorityRole`, `UserAuthority`)의 연관 관계 결여 모순을 극복하여 데이터 무결성을 보장하는 L1 등급 리팩토링 태스크입니다.

---

## 체크리스트 (Ralph Loop Checklist)

- [x] **1단계: 사용자 주민번호 암호화 Converter 설계 및 연동**
  - [x] 양방향 암호화를 수행하는 JPA `AttributeConverter` 구현
  - [x] `User.java` 엔티티의 `rrno` 필드에 `@Convert` 어노테이션 지정
- [x] **2단계: 권한 맵핑 엔티티 연관 관계 보강 및 호환성 확보**
  - [x] `AuthorityRole.java` 내 복합키 구성 및 `@ManyToOne(fetch = FetchType.LAZY)` 조인 보강
  - [x] `UserAuthority.java` 내 권한 엔티티 연관 관계 매핑
- [x] **3단계: 컴파일 검증 및 통합 테스트 그린 패스 입증**
  - [x] `./gradlew compileJava` 빌드 무결성 확인
  - [x] `./gradlew test` 테스트 성공 증명
