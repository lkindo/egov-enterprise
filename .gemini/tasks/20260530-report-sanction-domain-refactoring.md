# Task: 결재 & 보고 도메인(informalsanction, memoreport, report) 리팩토링 및 물리 확장

본 태스크는 `egov-enterprise` 프로젝트 내 결재 및 보고 도메인의 아키텍처 모순을 해결하기 위해, 날짜/시각 데이터의 도메인 레벨 캡슐화 검증을 보강하고, `WorkReport` 내 첨부파일 ID(`atchFileId`)의 `@Transient` 방치 모순을 OCI PostgreSQL 물리 데이터베이스 스키마 확장(Expand)과 엔티티 영속화로 완성하는 L1 등급 리팩토링 태스크입니다.

---

## 체크리스트 (Ralph Loop Checklist)

- [x] **1단계: DB 스키마 무중단 확장 (WorkReport 첨부파일)**
  - [x] `tb_rpt_info` 테이블에 `atch_file_id` 컬럼 추가 (PostgreSQL DDL 실행 및 `migrate.sql` 추가 완료)
  - [x] H2 인메모리 스키마 및 테스트 픽스처 호환 패치 확인 완료
- [x] **2단계: 도메인 엔티티 정밀 리팩토링 및 캡슐화 검증 보강**
  - [x] `WorkReport.java`에서 `@Transient`를 제거하고 `@Column(name = "atch_file_id", length = 20)` 지정하여 영속화 완료
  - [x] `InformalSanction.java` 내 `reqYmd` 날짜 포맷 검증 훅(`validateDateFormat`) 이식 및 대시 유연성 튜닝 완료
  - [x] `MemoReport.java` 내 `memoRptYmd`, `drctnMttrRegDt`, `rptrInqDt` 날짜/일시 포맷 검증 훅 이식 및 대시 유연성 튜닝 완료
- [x] **3단계: 백엔드 빌드 및 통합 테스트 그린 패스 증명**
  - [x] `./gradlew :business-suite:compileJava` 컴파일 확인 완료
  - [x] `./gradlew :business-suite:test` 100% 그린 패스 입증 완료 (BUILD SUCCESSFUL in 5m 9s)
