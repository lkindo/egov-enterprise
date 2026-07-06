# Task: 시스템 & 메타 도메인(code, menu) 리팩토링 및 연관 관계 보강

본 태스크는 `egov-enterprise` 프로젝트 내 시스템 및 메타 도메인의 아키텍처 모순을 해결하기 위해, 공통코드 복합키 조인 및 메뉴 셀프 계층형(Self-Referential) 관계를 안전하게 이식하여 영속성 탐색 무결성과 성능을 극대화하는 L1 등급 리팩토링 태스크입니다.

---

## 체크리스트 (Ralph Loop Checklist)

- [x] **1단계: 공통코드 도메인 (`code`) 연관 관계 보강**
  - [x] `CommonCode.java` 내 `CommonCodeGroup` `@ManyToOne` 지연 조인 및 복합키 결합 구현 완료 (MapsId 중복 충돌을 방어하기 위해 `@ManyToOne` 느슨한 조인 튜닝 적용 완료)
  - [x] `CommonCodeGroup.java` 내 `CommonCode` 양방향 `@OneToMany` 수립 완료
- [x] **2단계: 메뉴 도메인 (`menu`) 셀프 계층형 트리 보강**
  - [x] `Menu.java` 내 `parent` 셀프 `@ManyToOne(fetch = FetchType.LAZY)` 조인 및 `children` `@OneToMany` 트리 매핑 구현 완료 (BatchSize 50 성능 최적화 적용)
  - [x] `Menu.java` 내 `upMenuSn`에 명시적인 `@Column(name = "up_menu_sn")` 선언을 통해 하이버네이트 중복 참조 충돌 자가 치유 완료
- [x] **3단계: 백엔드 빌드 및 통합 테스트 그린 패스 증명**
  - [x] `./gradlew :business-suite:compileJava` 컴파일 확인 완료 (BUILD SUCCESSFUL in 44s)
  - [x] `./gradlew :business-suite:test` 100% 그린 패스 입증 완료 (BUILD SUCCESSFUL in 6m 9s)
