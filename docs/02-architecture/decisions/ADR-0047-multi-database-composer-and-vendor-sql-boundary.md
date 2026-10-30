# ADR-0047 — 프로젝트 생성기의 다중 DB 선택과 벤더 SQL 경계

- 상태: Accepted
- 결정일: 2026-10-31
- 승인: 2026-10-30 사용자가 생성기에서 PostgreSQL 외 DB 를 선택할 수 있게 설계하라고 요청했고, 2026-10-31 권장안대로 단계 0 진행을 지시했다.
- 대체: [ADR-0020](ADR-0020-selectable-reusable-backend-layouts.md) 결정 5 의 'PostgreSQL 범위 유지'. 인증한 벤더가 생기기 전까지 실제 선택지는 PostgreSQL 뿐이다.
- 관련: [다중 DB 설계](../multi-database-composer-design.md), [생성기 설계](../project-composer-design.md), [벤더 SQL 원장](../../../config/governance/vendor-sql-ledger.json), [벤더 시험 원장](../../../config/governance/vendor-test-ledger.json)

## 맥락

생성기는 PostgreSQL 만 만든다. 다른 DB 를 고르려면 스키마·시드·앱 SQL·검증이 모두 벤더를 알아야 한다. 벤더별 마이그레이션 체인을 두면 정본이 벤더 수만큼 늘어난다. 생성물은 지금도 V2 체인이 아니라 기준선에서 시작하므로 벤더마다 최종 상태 하나만 만들면 된다.

시제품에서 적용 실패는 모두 해결됐다(Oracle 19c·23 계열, SQL Server 2022, MariaDB 11.4, MySQL 8.4, CUBRID 11.4). 그러나 문장 성공은 호환이 아니었다. MySQL·MariaDB 의 `$` 는 끝 줄바꿈을 통과시켰고, 첨부 공유 판정의 `||` 는 논리 OR 로 해석돼 모든 행과 일치했다. 앱은 어느 벤더에서도 아직 기동하지 않았다.

## 결정

1. PostgreSQL 마이그레이션이 스키마의 유일한 정본이다. 기준 PostgreSQL 에서 구성한 최종 스키마와 재적용 DB 의 행을 벤더 중립 모델로 옮겨 어댑터가 DDL·시드를 만든다. 벤더별 마이그레이션 체인·Hibernate DDL 생성·외부 변환기를 두지 않는다.
2. 벤더 id 는 이관 도구와 같은 7종이다. 벤더별 적합성 증거가 있는 벤더만 화면에서 고를 수 있고, 나머지는 사유와 함께 비활성으로 보인다.
3. 지원 범위는 Oracle·MariaDB·MySQL·SQL Server 를 정식 목표로, CUBRID 를 저하를 표시한 제한 지원으로, Tibero 를 라이선스 확보 뒤 측정으로 둔다. 최소 버전은 Oracle 19c, MariaDB 11.4, MySQL 8.4, SQL Server 2022 다.
4. 앱 SQL 은 원본에서 먼저 정리한다. Hibernate 가 벤더 문법을 만들 수 있으면 HQL 로 옮기고, 벤더마다 달라야 하는 일만 `VendorSqlDialect` 포트 뒤로 보낸다. PostgreSQL 구현의 문장은 포트 전과 같다. 단위 시험의 H2 도 이 구현을 쓴다. 구현은 `app.database.vendor` 로 고르고 모르는 값은 기동을 멈춘다.
5. 포트 밖의 PostgreSQL 전용 구문은 `VendorSqlPortabilityLinterTest` 가 막는다. 남는 위치는 벤더 SQL 원장에 처리 방식·대응 시험·넘길 단계와 규칙별 개수로 동결한다. 게이트는 구문만 막으므로 이식 판정은 벤더 DB 실행으로 한다.
6. 번역은 문장 성공이 아니라 PostgreSQL 차등 시험으로 판정한다. 같은 값을 넣어 받아들이는 값이 같아야 한다. 대체 구현이 없으면 벤더별 저하 목록에 올리고 표시해야 인증된다.
7. 감사 원장 삭제 허가는 PostgreSQL 밖에서 트랜잭션 범위 허가 표로 통일한다. 트리거가 같은 트랜잭션의 미커밋 행만 보므로 트랜잭션 범위가 되고 롤백하면 허가도 사라진다. SQL Server 는 조회에 `WITH (READCOMMITTED)` 를 붙인다.
8. 벤더 고유 차이는 숨기지 않는다. Oracle 의 `''`=NULL, SQL Server 의 뒤 공백 무시는 표시하고, Oracle 긴 문자열은 CLOB 로 둔다(`MAX_STRING_SIZE=EXTENDED` 는 되돌릴 수 없어 기관 DBA 가 켠 경우만). MySQL·MariaDB 의 트리거 권한은 도입 조건으로 적는다.
9. CUBRID 의 참조 무결성은 트리거로 판정하지 않는다. 부모 PK 와 UNIQUE 를 맞바꾸거나 키 전용 표를 두어 진짜 FK 가 판정하게 한다.
10. 벤더 프로젝트는 PostgreSQL 전용인 이관 도구를 뺀다.

## 결과

- 단계 0 은 원본 앱 SQL 정리·게이트·시험 분류까지이고 PostgreSQL 동작을 바꾸지 않는다. 벤더 구현과 생성 경로는 뒤 단계다.
- 앱 SQL 일부가 네이티브 `@Query` 에서 저장소 fragment 로 옮겨 간다. 잠금 강도와 upsert 는 포트의 벤더 구현이 책임진다.
- schema-validation 시험 대부분은 V2 체인을 직접 검증한다. 벤더 프로젝트는 기준선에서 시작하므로 벤더 대조 시험으로 대체한다. 분류는 벤더 시험 원장에 있다.
- 생성 뒤 스키마 변경은 벤더 문법으로 직접 쓴다. 원본의 새 마이그레이션은 벤더 프로젝트로 자동 전파되지 않는다.

## 재검토 조건

첫 벤더(Oracle)에서 앱 기동과 통합 시험까지 돌린 뒤 공수를 다시 잰다. 공수가 예상보다 크면 지원 범위를 줄이고 CUBRID·Tibero 포함을 다시 정한다.
