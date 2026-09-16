# 마이그레이션 릴리스 기록 (Migration Release Log)

이 문서는 Flyway 마이그레이션이 **어느 릴리스로, 언제, 어느 환경에 배포됐는지**를 기록한다.
무중단 Expand-and-Contract 절차에서 Contract 단계 waiver 는 선행 Expand 가 **먼저 배포되고 관측 기간을 지났다**는
근거로 이 표의 행을 지목한다. 판정은 [ZDM 린터](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java)가 한다.

## 기록 규칙

- 한 행이 한 릴리스다. 첫 칸은 `vX.Y.Z` 태그이며 린터가 그 값으로 행을 찾는다.
- `포함 마이그레이션` 칸에는 그 릴리스로 **처음 배포된** Flyway 파일명을 적는다. 린터는 Contract waiver 가 지목한 Expand 가 이 칸에 있고, Contract 자신은 없어야 통과시킨다.
- 배포일은 UTC 날짜다. 관측 기간(7일)은 이 날짜부터 센다.
- 이 표는 배포 사실의 **기록**이지 증명이 아니다. 실제 배포와 관측 증거는 운영 환경에서 따로 확인한다([GAP-ZDM-001](../../.agent/memory/known-gaps.md)).

## 릴리스

| 릴리스 태그 | 배포일(UTC) | 환경 | 포함 마이그레이션 | 근거 |
|---|---|---|---|---|
| 기록 없음 | - | - | - | 아직 이 절차로 기록한 릴리스가 없다. 첫 Contract waiver 를 올릴 때 선행 Expand 의 릴리스를 여기에 적는다. |
