# Task: 자료 & 콘텐츠 도메인(file, deptjob) 리팩토링 및 연관 관계 보강

본 태스크는 `egov-enterprise` 프로젝트 내 자료 & 콘텐츠 도메인의 아키텍처 모순을 해결하기 위해, 부서업무(`DeptJob`) 내에 업무함 및 첨부파일 마스터로 향하는 지연 로딩 조인 통로 2종을 정밀 기입하여 영속성 무결성을 극대화하는 L1 등급 리팩토링 태스크입니다.

---

## 체크리스트 (Ralph Loop Checklist)

- [ ] **1단계: 부서업무 도메인 (`deptjob`) 연관 관계 보강**
  - [ ] `DeptJob.java` 내 `DeptJobBox` `@ManyToOne(fetch = FetchType.LAZY)` 조인 필드 보강
  - [ ] `DeptJob.java` 내 `FileMaster` `@ManyToOne(fetch = FetchType.LAZY)` 조인 필드 보강
- [ ] **2단계: 백엔드 빌드 및 통합 테스트 그린 패스 증명**
  - [ ] `./gradlew :business-suite:compileJava` 컴파일 확인
  - [ ] `./gradlew :business-suite:test` 100% 그린 패스 입증
