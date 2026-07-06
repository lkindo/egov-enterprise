# Task: DB와 Java JPA 엔티티 간 잔여 불일치 점검 및 정밀 정렬 치유

- [x] **Think** — 요구사항 분석 및 기존 코드 영향 파악
- [x] **Plan** — 물리 DB 스키마와 JPA 엔티티 간의 길이 불일치(Size Mismatches) 색출
- [x] **Implement** — 불일치 대상 필드 4건에 대해 JPA @Column 정의 정밀 수정 (DB varchar(12) 규격에 완벽 일치)
  - [x] `Board.java` (`qna_stts_cd`): `length = 10` -> `12`
  - [x] `CnsltManage.java` (`qna_proc_stts_cd`): `length = 3` -> `12`
  - [x] `User.java` (`user_type_cd`): `length = 10` -> `12`
  - [x] `User.java` (`user_stts_cd`): `length = 30` -> `12`
- [x] **Test** — 백엔드 빌드 및 전체 단위/통합 테스트 성공 여부 재검증
- [x] **Summarize** — 정렬 결과 요약 및 백엔드 헌법에 따른 무결성 증명 제출
