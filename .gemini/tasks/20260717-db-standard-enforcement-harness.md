# 20260717 — P4: DB 표준 집행 하네스 (명명 린터 신설 + ZeroDowntime 린터 결함 3종 수정)

> **등급**: L2 (하네스/게이트 — DB DML 없음) · **근거**: assessment §4 P4 (거버넌스 45점의 핵심 갭 = 집행 장치 부재)

## 1. 🚨 중대 발견: 기존 유일 게이트가 처음부터 무력(false-green)이었다

뮤테이션 자가검증(의도적 위반 파일 주입) 중 실증:
1. **workingDir 결함**: Gradle 테스트 JVM 의 workingDir 이 루트로 잡혀 `src/main/resources/db/migration` 상대경로 해석 실패 → 기존 ZeroDowntimeMigrationLinterTest 는 **"디렉토리 없음 → 조용히 skip"** 으로 항상 통과. 거버넌스 감사가 "유일한 실가동 하드게이트"로 평가했던 것조차 gradle 경유로는 이론상 게이트였음.
2. **증분 빌드 결함**: 린터가 src 경로를 직접 읽지만 Gradle 테스트 입력에 미등록 → **마이그레이션 SQL만 바뀐 커밋에서 테스트가 UP-TO-DATE 스킵**.
3. **line-ignore 결함**: 주석을 먼저 제거한 뒤 ignore 마커를 찾아 라인 단위 예외가 원천 불능 → V2_7/V2_13 이 disable-file(전 규칙 우회)을 쓸 수밖에 없던 실제 원인.

## 2. 수정/신설 내역

### ZeroDowntimeMigrationLinterTest (보강)
- 경로 이중 해석(모듈/루트) + **미발견 시 즉시 실패**(조용한 skip 금지) — `SchemaNamingLinterTest.resolveMigrationDir()` 로 일원화
- line-ignore 동작 수정: `linter:ignore` 포함 주석은 보존 후 매칭
- FORBIDDEN_RENAME 이 RENAME CONSTRAINT 를 오매치하던 결함 해소(네거티브 룩어헤드)
- 신규 룰 4종: DROP TABLE / DROP SEQUENCE / TRUNCATE / **ALTER SEQUENCE RENAME**(V2_8 유형 — 코드 결속 파손 위험)

### SchemaNamingLinterTest (신설 — 명명 표준의 첫 자동 집행 장치)
- 델타 SQL(V2_2+, R__) 정적 검사: 테이블 tb_·시퀀스 sq_·인덱스 ix_(uk_ 잠정 허용)·제약 pk_/fk_/uk_/ck_ 접두, **char 고정문자형 금지(제5조4항)**, 신규 테이블 감사컬럼 최소 2종+짝깨짐(제8조)
- RENAME CONSTRAINT 는 신명칭만 검사(구명칭=정정 대상)
- 예외: 대장 동기화 화이트리스트(프레임워크/메타/fk_role_prgrm_map_* 보류분) + `-- naming-linter:ignore (사유)`
- V2_0(baseline)·V2_1(메타시드)은 레거시 일괄 반입이라 제외 — 물리 전수 감사는 assessment 로 완결

### 부수 정리
- api-server/build.gradle: `test.inputs.dir(migration)` 등록 — SQL 단독 변경도 린터 재실행
- V2_7: disable-file 제거(오탐 해소로 불필요) / V2_8·V2_13: disable-file → 라인 단위 ignore(사유 병기)로 전환
  (셋 다 flyway history 미등재 pending 이라 checksum 제약 없음)
- 예외 대장: revinfo_seq·flyway_schema_history 추기, seq_tb_hldy_info·fk_role_prgrm_map_* RENAME 보류 등재

## 3. 검증 (뮤테이션 3단계 — 게이트 실효성 증명)

| 단계 | 결과 |
|---|---|
| ① 실파일 전체 | BUILD SUCCESSFUL (V2_7/V2_8/V2_13 라인 예외 정상 동작) |
| ② 위반 주입(V9_9: 비표준 테이블명·char(5)·비표준 RENAME 신명칭·DROP TABLE) | **exit 1 — 양 린터 모두 검출** (naming 3건 + zero-downtime 1건) |
| ③ 제거 후 | BUILD SUCCESSFUL, 잔재 없음 |
| compileJava/compileTestJava + :api-server:test full | exit 0 / BUILD SUCCESSFUL |

## 4. 보류/후속
- **check-db-standard.js·refactor-db-standard.js 삭제 보류** — 죽은 스캐너(존재하지 않는 business-suite 스캔, safe-deletion 문서에 삭제 예정 등재)이나 파일 삭제는 사용자 개별 승인 필요. 본 하네스가 완전 대체하므로 기능 공백 없음.
- 헌법 제7조 3항(환경별 차등·델타 한정) 명세 vs 구현(전 환경 차단·전 파일 스캔) 불일치는 잔존 — 헌법 개정(사용자 승인) 또는 구현 정합화 필요. 현행은 "헌법보다 엄격" 방향이라 안전.
- CI 재활성화 시 gradlew test 경유 자동 게이트화(현재 CI 과금 차단 상태).
