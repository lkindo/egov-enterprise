# 로그 처리시간 물리 표준 전환 검토안

이 문서는 `tb_sys_log`와 `tb_web_log`의 처리 소요시간을 표준 용어와 맞추기 위한 **적용 전 검토안**이다. 사용자 승인은 전환 코드·SQL·복구 검증안을 구체화하는 범위이며, 공유 DB 적용은 정확한 대상·SQL·검증 결과를 확인한 뒤 진행한다. 이 변경은 자동 Flyway 경로에 SQL을 추가하거나 실행 중인 엔티티 매핑을 바꾸지 않는다.

| D-n | 결정 | 관련 H | 영향 계약 파일 | 부정 시험 |
|---|---|---|---|---|
| D-1 | BIGINT·밀리초·NULL과 API 이름을 보존하고 새 표준 후보를 검토한다 | H1 | 아래 메타 등록 후보·`expand.sql` | 메타 충돌, 기존 값 보존 |
| D-2 | 승인 뒤 versioned Flyway로만 Expand를 배포한다 | H1 | 후속 Flyway·공유 OCI 적용 로그 | 이미 존재하는 컬럼 거부 |
| D-3 | 한쪽 writer·명시 트랜잭션·동기화 대사를 전제로 한다 | H1·H5 | `expand.sql`·`backfill.sql`·`verify-parity.sql` | 잠금, 복제 세션, 잘못된 트리거, drift 거부 |
| D-4 | Redirect 전 철회도 별도 승인된 후속 Flyway로 처리하고 메타를 보존한다 | H1 | `rollback.sql` | 불일치 철회 거부, 구 writer·기존 행 보존 |

## 문제와 제안

2026-10-30 16:40~16:43 KST에 공유 개발 PostgreSQL 17.9/public을 다시 읽기 전용으로 조회했다. 두 표의 `prcs_tm`은 nullable BIGINT이며 기본값이 없었다. 시스템 로그는 71행(0~169ms), 웹 로그는 36,473행(0~2,750ms)이었고 두 표의 사용자 트리거와 후보 동기화 함수는 없었다. 각 조회는 별도 스냅샷이며 적용 시점에 다시 확인한다. 실제 값은 밀리초 수량인데, 메타 표준의 `PRCS_TM`은 HHmmss 형태의 처리시각 용어였다. 시각으로 포맷하거나 초로 나누면 의미가 달라지므로 값·타입·단위를 그대로 보존하고 물리 용어를 정정한다.

| 대상 | 현재 | 제안 |
|---|---|---|
| `tb_sys_log` | `prcs_tm BIGINT NULL` | `prcs_req_msec BIGINT NULL`, 기본값 없음 |
| `tb_web_log` | `prcs_tm BIGINT NULL` | 같은 새 컬럼 |
| 단어 | 해당 후보 없음 | 밀리초 / `MSEC`, 대표 약어 `Y` |
| 도메인 | 해당 후보 없음 | 수량 / `밀리초N19` / BIGINT / 길이 19 |
| 용어 | 해당 후보 없음 | 처리소요밀리초 / `PRCS_REQ_MSEC` / `밀리초N19`, 폐기 `N` |

기존 `PRCS_TM` 표준을 변경하지 않는다. 새 단어·도메인·용어는 등록 후보이며, 적용 시점에 충돌을 다시 확인한다. 명시 필드와 설명의 정본은 [Expand SQL](../../api-server/src/test/resources/db/proposals/log-duration/expand.sql)이다. 단어의 키는 `(word_name, eng_abbr)`이고 도메인·용어의 ID만 DB 기본 sequence를 사용한다. 동의어·허용값은 NULL로 둔다. 메타의 길이 19는 BIGINT의 십진 자릿수 표기이며 NUMERIC(19,0)의 전체 범위를 의미하지 않는다.

명명 판단은 **아직 승인 대기**다. 이 후보는 단위가 이름과 도메인에 직접 드러나도록 `처리소요밀리초/PRCS_REQ_MSEC/밀리초N19`를 사용한다. 기존 `처리소요일수/PRCS_REQ_DAY_CNT`와 같은 분류어 관례를 우선하면 `처리소요밀리초수/PRCS_REQ_MSEC_CNT`와 BIGINT 수 도메인을 새로 등록하는 대안이 있다. `수N19`는 이번 실측에 없었고, 기존 BIGINT `일련번호N19`는 식별자 의미라 소요량에 재사용하지 않는다. 현재 SQL·시험은 첫 후보에 대한 검토 자료이며 테스트 통과가 표준 등록 승인은 아니다.

같은 조사에서 확인한 숫자 3개 컬럼(`prrty_rnk`, `popup_wdth_sz`, `popup_vrtc_sz`)은 [숫자 컬럼 결정안](numeric-column-transition-proposal.md)의 별도 전환 대상으로 둔다. 같은 의미의 영구 별칭을 새로 등록하는 후보는 철회했다. `ans_lv`는 현재 의미를 확정하지 않은 상태에서 변환하지 않는다. 이 로그 검토안으로 여섯 컬럼 전체의 정합 완료를 선언하지 않는다.

## 단계와 중단 조건

Expand와 백필 파일 하나는 READ COMMITTED·autocommit=false인 한 트랜잭션으로 실행한다. 모든 문장 성공 후 caller가 commit하고, 하나라도 실패하면 전체를 rollback한다. 트리거가 작동하는 `session_replication_role=origin`을 전제로 하며, 함수·트리거의 실제 정의도 승인본과 대조한다. 각 문장을 따로 자동 커밋하는 실행이나 보호 비활성화는 지원하지 않는다. 백필 한 호출의 상한은 표마다 500행, 두 표 합계 1,000행이다.

1. **적용 준비:** 대상 환경·현재 컬럼 타입·메타·기존 트리거·외부 소비자·논리 복제 publication/subscription을 재확인한다. 백업과 복원 결과, SQL의 확정 커밋·SHA-256, 잠금 예산·실측, 공유 DB 적용 승인을 남긴다. 구독 측 스키마·trigger 실행을 검증하지 않은 복제 환경에는 적용하지 않는다.
2. **Expand:** 하나의 트랜잭션에서 메타 쓰기 잠금을 정해진 순서로 잡고 충돌을 검사한다. 두 로그 표에 새 컬럼과 값 동기화 트리거를 추가한다. 기존 앱은 계속 구 컬럼을 읽고 쓴다. 기존 메타를 덮어쓰거나 보호 트리거를 비활성화하지 않는다.
3. **Sync:** [백필 SQL](../../api-server/src/test/resources/db/proposals/log-duration/backfill.sql)을 작은 트랜잭션으로 반복한다. 이미 값이 있는 새 컬럼의 불일치는 실패시켜 원인을 조사한다. 구 값이 있고 새 값이 NULL인 초기 누락만 채운다. `SKIP LOCKED`로 바뀐 행이 0개여도 완료로 판단하지 않는다.
4. **Redirect 준비:** [대사 SQL](../../api-server/src/test/resources/db/proposals/log-duration/verify-parity.sql)의 NULL 포함 불일치가 두 표 모두 0이어야 한다. **새 읽기와 새 쓰기 모두** 이 조건 이후에 활성화한다. 현재 변경은 이 전환을 실행하지 않는다.
5. **후속 배포:** 실제 앱 매핑·seed·외부 소비자의 변경과 구·신 버전 공존을 검증한 뒤 새 컬럼으로 전환한다. 구 소비자 0을 소스와 런타임에서 확인한다. 구 컬럼 삭제는 선행 배포와 최소 7일 관측을 거친 별도 Contract 릴리스 및 정확한 삭제 승인 대상으로 남긴다.

지원 writer는 한 요청에서 구·신 컬럼 중 한쪽만 쓴다. 트리거는 변경된 값을 기준으로 동기화하므로 SQL의 SET 절에 두 컬럼을 명시했더라도 한쪽 값이 이전과 같으면 이를 충돌로 판별할 수 없다. 아직 백필되지 않은 `(구 값, 새 NULL)` 행에 새 NULL을 쓰는 것도 의도한 값 삭제로 구분할 수 없다. 따라서 새 writer의 조기 활성화나 양쪽 표현을 동시에 쓰는 외부 SQL을 지원한다고 주장하지 않는다.

잠금 대기 제한과 문장 실행 제한은 전체 트랜잭션의 잠금 보유시간 상한이 아니다. 승인 패킷에 전체 트랜잭션 중단 예산과 실제 잠금 시간을 별도로 결속해야 한다. PostgreSQL 17의 `transaction_timeout`은 트랜잭션이 제한을 넘기면 세션을 종료한다. 적용 runner의 트랜잭션 경계·연결 종료·롤백까지 리허설한 뒤 사용할 수 있으며, 이 문서만으로 운영 제한을 설정하지 않는다. [PostgreSQL 17 설명](https://www.postgresql.org/docs/17/runtime-config-client.html#GUC-TRANSACTION-TIMEOUT)

**적용 경로는 versioned Flyway 하나다.** 승인 후 확정한 Expand를 새 `V…__…sql`로 승격하고 해당 Flyway 체인을 격리 DB에서 다시 검증한 다음 PR 병합·적용 로그를 통해 배포한다. 이 테스트 리소스를 공유 DB에서 먼저 실행하거나 `flyway_schema_history`를 손으로 삽입·삭제·repair하지 않는다. Sync는 Expand 성공 버전·객체 정의를 확인한 운영 배치로 실행하며, 원자성의 단위는 백필 파일 한 호출이다. 빈 환경도 같은 Flyway를 거치고 백필 0행과 대사 0건을 확인한다.

**큰 표의 성능은 아직 검증하지 않았다.** 현재 백필은 매 호출마다 두 표의 비NULL drift를 전수 검사하고, 기본키 앞부분부터 미이행 행을 찾는다. 500행 상한은 갱신 행 수만 제한하며 스캔량을 제한하지 않는다. 안전성 때문에 전수 drift 거부를 유지한 소규모 적용 후보로, 502행 시험의 통과를 수백만 행 처리 능력으로 확대하지 않는다. 적용 전 대상 규모를 복제한 격리 DB에서 시작·중간·종료 배치의 EXPLAIN 및 실행 시간·버퍼·잠금 보유시간을 확인해야 한다. 5초 문장 예산 또는 승인된 전체 예산을 넘으면 중단하고 keyset/부분 인덱스 등을 별도 설계한다. timeout을 늘려 우회하지 않는다. 현재 공유 DB에는 새 컬럼이 없어 최종 백필 계획 자체를 읽기 전용으로 실행해 확인할 수 없다.

SQL은 READ COMMITTED·`session_replication_role=origin`, 트리거의 활성 상태·BEFORE ROW INSERT/UPDATE·대상 두 컬럼을 검사한다. 같은 함수 OID로 본문을 교체하는 변화까지 이 검사가 인증하지는 않는다. 실행자는 `pg_get_triggerdef`·`pg_get_functiondef`를 승인 SQL에서 생성한 정의와 대조하고, 배치·Redirect 직전에도 다시 확인한다. 임의 함수 교체를 허용한 상태를 지원하지 않는다.

## 복구와 호환성

Expand가 실패하면 같은 트랜잭션의 메타·DDL을 롤백한다. sequence가 소비한 번호는 되돌아가지 않는다. 백필 실패는 해당 배치를 롤백하고 원인 해소 후 재개한다. 불일치 행을 임의로 덮거나 0·빈값으로 바꾸지 않는다.

commit 응답이 끊겨 성공 여부가 불명확하면 객체·메타·적용 원장을 먼저 조회한다. Expand는 이미 존재하는 대상 컬럼·함수를 자동 재생성하지 않고 중단한다. 이름만 같다는 이유로 기존 객체를 승인본이라고 판단하지 않는다.

Redirect 후 구 앱으로 복귀하려면 구 컬럼이 보존되고 양방향 동기화와 대사가 정상이어야 한다. 구 컬럼이 제거된 뒤에는 구 앱 재배포만으로 복구되지 않는다. 새 메타는 다른 소비자가 사용할 수 있으므로 복귀 과정에서 자동 삭제하지 않는다.

**Expand 커밋 후 Redirect 전 철회:** 새 컬럼을 읽거나 쓰는 소비자가 없음을 확인하고 [철회 SQL](../../api-server/src/test/resources/db/proposals/log-duration/rollback.sql)을 후속 versioned Flyway 후보로 검토한다. 두 표를 함께 잠그고 새 비NULL 값과 구 값의 불일치를 거부한 뒤 트리거 → 함수 → 새 컬럼 순서로 제거한다. 아직 채우지 않은 새 NULL은 구 값이 남으므로 철회를 막지 않는다. 메타와 기존 행·컬럼·감사 필드·Flyway 이력은 보존한다. 외부 의존성이 있으면 CASCADE 없이 실패하고 전체를 롤백한다. 이 후보의 DROP COLUMN은 실제 배포 시 정확한 사용자 승인과 구조화 ZDM waiver·선행 배포/관측 규칙을 충족해야 한다. 긴급 철회가 관측 규칙을 충족하지 못하면 별도 한정 예외 결정이 필요하며 이 문서가 그 예외를 부여하지 않는다. 메타를 나중에 걷을 필요가 생기면 실제 소비·등록 주체를 별도 조사하고 새로운 등록 철회 승인을 받는다.

후속 매핑 변경에서도 Java의 `Long prcsTm`과 API 속성 이름·단위를 유지한다. 시스템 로그 API의 기존 문자열 제약과 웹 로그 API의 JavaScript number 표현 한계는 그대로다. DB의 Long 전체 범위 보존을 API의 전체 범위 무손실 보장으로 확대하지 않는다. API 표현 변경은 별도 계약 결정이다.

후속 Redirect는 두 엔티티 매핑 외에 직접 INSERT하는 `R__seed_dev_audit_logs.sql`, 과거 스키마와 최신 체인을 함께 검사하는 로그 PK 마이그레이션 시험, 기관 이관 원장과 재사용 base 생성물까지 확인한다. 과거 Flyway·과거 fixture를 새 이름으로 일괄 치환하지 않는다. 외부 SQL·BI·ETL 및 옛 앱 인스턴스의 구 컬럼 사용 여부는 저장소 검색만으로 확인할 수 없다.

## 검증 범위

[격리 PostgreSQL 시험](../../api-server/src/test/java/nuri/api/schema/LogDurationTransitionProposalIntegrationTest.java)은 현재 Flyway 체인 위에 **테스트 리소스에 있는 제안 SQL**을 적용한다. 기존 `schemaValidationTest` 실행 경로와 게이트 원장에 등록하며 별도 실행 게이트를 만들지 않는다. 기존 로그 내부키 전환 시험은 처리시간 쌍의 동기화·백필·표준 등록 충돌을 검증하지 않으므로 이 불변식에 대한 시험을 추가한다.

실행 명령은 다음과 같다. 실행 성공 여부는 해당 커밋의 실제 시험 보고서·CI로 판단한다.

```powershell
./gradlew :api-server:schemaValidationTest --tests nuri.api.schema.LogDurationTransitionProposalIntegrationTest --warning-mode fail --console=plain '-Dfile.encoding=UTF-8'
```

격리 시험은 공유 DB 적용·외부 소비자 종료·실제 환경의 잠금 시간·백업 복원 완료를 대신하지 않는다. 원문 로그·사용자·URL·IP 데이터는 승인 패킷에 복사하지 않는다.
