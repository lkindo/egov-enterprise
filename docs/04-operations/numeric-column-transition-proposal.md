# 숫자 3개 컬럼의 물리 타입 정합 적용 패킷

현재 표준 이름과 API 문자열을 유지하면서 DB만 NUMERIC으로 맞춘다. 사용자는 2026-10-30 **공유 개발 DB의 두 표가 적용 직전에도 비어 있을 때만, 정비창에서 직접 타입을 바꾸는 A안**의 한정 예외와 구현을 승인했다([ADR-0046](../02-architecture/decisions/ADR-0046-empty-numeric-transition-and-log-duration-standard.md)). 아래는 구현·격리 검증·적용을 위한 패킷이다. [로그 2개](log-duration-transition-proposal.md)의 표준 등록안 및 보류한 `ans_lv`와 구분한다.

> 적용 상태(2026-10-30): 완성 패킷에 대한 사용자 최종 승인 “진행해” 뒤 [PR #1010](https://github.com/lkindo/egov-enterprise/pull/1010)의 병합본으로 공유 개발 DB에 V2_144를 적용했다. 세 NUMERIC 타입·NULL·기본값 없음·양표 0행과 실제 새 앱의 JPA/DTO 검증을 확인했다. 백업·Flyway·실행 결과는 [공유 OCI 적용 로그](shared-oci-migration-apply-log.md)에 기록한다. 다른 환경의 실행 승인은 별도다.

| D-n | 결정 | 관련 H | 영향 계약 파일 | 부정 시험 |
|---|---|---|---|---|
| D-1 | 기존 이름·메타 도메인·API 문자열/null 보존 | H1 | `DeptJob`·`Popup`·DTO·후속 Flyway | 숫자 JSON·비정규 문자열 거부 유지 |
| D-2 | 공유 개발 DB·빈 두 표·정비창에 한정한 직접 TYPE 변경 승인 | H1 | ADR-0046·`zdm-waivers.json`·Flyway | 한 행이라도 있거나 잠금 실패 시 전체 중단 |
| D-3 | 앱/외부 writer 중지 → 스키마 → 새 앱 → 검증 후 재개 | H1 | Entity 매핑·배포 및 복구 절차 | 구 앱 혼용 거부, 실패 후 원복 |

## 정확한 대상과 보존 조건

2026-10-30 16:40~16:43 KST 공유 개발 PostgreSQL 17.9/public을 읽기 전용으로 다시 대조했다. 세 컬럼은 모두 nullable `VARCHAR(12)`, 기본값 없음이며 부서 업무·팝업 두 표는 각각 0행이었다. 조회 시점의 사실이며 적용 승인이나 다른 기관 환경의 증거가 아니다.

| 대상 | 기존 표준 | 최종 타입 | API·제품 입력 |
|---|---|---|---|
| `tb_dept_task_info.prrty_rnk` | 우선순위 / `PRRTY_RNK` / 수N10 | `NUMERIC(10,0) NULL` | 문자열 `1`·`2`·`3` |
| `tb_popup_info.popup_wdth_sz` | 팝업가로크기 / `POPUP_WDTH_SZ` / 수N7 | `NUMERIC(7,0) NULL` | 선행 0·공백·부호 없는 100~4000 정수 문자열 |
| `tb_popup_info.popup_vrtc_sz` | 팝업세로크기 / `POPUP_VRTC_SZ` / 수N7 | `NUMERIC(7,0) NULL` | 가로와 같음 |

기본값은 추가하지 않고 null·생략의 기존 서비스 의미와 화면 기본 크기는 유지한다. 표준 메타 변경·기존 데이터 보정·새 DB CHECK는 이 후보 범위에 넣지 않는다. API 요청의 JSON 숫자를 문자열로 보정하지 않는 [ADR-0045](../02-architecture/decisions/ADR-0045-bookmark-cleanup-input-policy-and-memo-read-consistency.md)를 유지한다. `ans_lv`의 값 재계산·타입 변경도 하지 않는다.

## 이행 경로와 승인 범위

| 경로 | 영향 | 필요한 결정 |
|---|---|---|
| **A: 빈 표 정비창 한정 TYPE 변경(채택)** | 기존 컬럼명·메타 그대로, 새 컬럼·동기화 트리거 없음. 구 앱과 새 앱을 함께 실행하지 않음 | 이 세 컬럼과 해당 환경에 한정한 E&C 예외 승인. 실제 실행은 최종 패킷 승인 후 |
| B: 임시 숫자 컬럼에 동기화 후 기존 이름 회수 | 추가 컬럼·트리거·백필·두 번의 전환과 DROP/RENAME이 필요 | 임시명도 표준 등록/명명 예외의 대상이다. 정확한 이름·기간·제거 조건 결정 필요 |
| C: 표준 컬럼을 가진 별도 병행 테이블 | 중복 용어는 피하지만 새 표·FK·행 수명·버전·동기화·조회 경로가 늘어남 | 새 표준 표 이름과 전체 이행 설계 승인 필요 |

동일 의미의 영구 별칭을 등록하던 초기 후보는 채택하지 않는다. 임시 이름이라는 이유만으로 [DB 헌법 제5조·제9조](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)를 면제할 수 없고, 빈 표라는 이유만으로 제7조의 의무를 면제할 수도 없다. [ADR-0013](../02-architecture/decisions/ADR-0013-standard-text-length-alignment.md)의 제한된 TYPE 변경은 당시 대상에 한정된 선례이지 이번 승인으로 승계되지 않는다.

## A안의 구현·배포 수용 기준

1. **배포 전:** 새 앱에서 Entity의 세 저장 필드를 precision/scale을 명시한 BigDecimal 기반 정수 변환으로 매핑하고 DTO는 기존 문자열/null을 유지한다. 실제 PostgreSQL/JPA 저장·조회와 API 응답을 검증한다. 기존 메타와 PK·FK·낙관적 버전·감사·인가 의미는 바꾸지 않는다.
2. **정비창 시작:** 앱 인스턴스·배치·직접 SQL을 포함한 writer를 중지한다. main 병합도 승인된 적용 정비창 안에서 수행한다. 적용 후에는 변경 전 코드의 다른 작업 트리를 공유 DB에 연결하지 않는다. 같은 트랜잭션에서 두 표의 잠금을 고정 순서로 잡고 0행·기존 타입·도메인·제약·의존성을 재확인한다. 하나라도 달라지면 DDL 전에 중단한다. 대상 전체에 잠금 획득 제한과 트랜잭션 예산을 결속한다.
3. **스키마:** 승인된 새 versioned Flyway 한 개에서 세 타입을 함께 바꾼다. 과거 Flyway나 사전을 고치지 않는다. 구 앱은 변경 후 DB에 연결하지 않는다. 정비창을 무중단 롤링 이행이라고 부르지 않는다.
4. **재개:** 새 앱으로 우선순위·팝업 저장/조회, null, 버전 충돌, 인가, 원문 JSON 검사를 통과한 뒤 writer를 재개한다. 빈 표 조건이 깨진 환경은 이 안으로 진행하지 않고 데이터 보존 이행안을 다시 검토한다.
5. **복구:** DDL 커밋 전 실패는 전체 롤백한다. 커밋 후·쓰기 재개 전 장애는 두 표가 여전히 비었는지 잠금 안에서 확인한 역변경과 구 앱 복귀를 리허설한다. 쓰기 재개 뒤에는 같은 빈 표 복구안을 쓰지 않으며 승인된 백업 복원 또는 별도 roll-forward가 필요하다. Flyway 이력은 삭제하거나 repair하지 않는다.

시험은 0행 정상, 데이터가 한 행이라도 있는 경우 거부, 잠금 경합, 두 번째 표 실패 시 첫 번째 표 원복, 정확한 타입·NULL·기존 제약 보존, 앱/API 호환과 복구를 포함한다. 통과 여부는 해당 커밋의 실제 시험 보고서와 CI로 판단한다. NUMERIC의 scale 0 cast가 소수 값을 반올림할 수 있으므로, 데이터가 생긴 환경에서 cast를 입력 검증으로 대신할 수 없다. [PostgreSQL NUMERIC](https://www.postgresql.org/docs/17/datatype-numeric.html), [ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html).

구체적인 입력은 [V2_144](../../api-server/src/main/resources/db/migration/V2_144__align_empty_numeric_columns.sql), [명시적 정수 변환기](../../foundation/src/main/java/nuri/foundation/domain/common/IntegralStringConverter.java), [정비창 복구 후보](../../api-server/src/test/resources/db/proposals/numeric-empty/rollback.sql)다. Flyway는 메타 3표 → 부서 업무 → 팝업 순서로 NOWAIT 잠금을 잡는다. PostgreSQL 17의 문장 제한 5초·전체 트랜잭션 제한 15초를 사용하며, 전체 제한 초과 시 연결 종료와 DDL 롤백을 [격리 시험](../../api-server/src/test/java/nuri/api/schema/EmptyNumericColumnsMigrationIntegrationTest.java)에서 확인한다. 정비창 전체 작업·새 앱 기동 시간을 15초로 보장한다는 뜻은 아니다.

복구 후보는 자동 실행되지 않으며 실제 사용 전에 후속 버전·정확한 waiver·승인을 확정한다. V2_144 이력을 남긴 채 역변경하므로 다음 앱 기동은 복구된 스키마와 호환되는 버전을 사용해야 한다. 쓰기 재개 뒤에는 이 후보로 돌아갈 수 없다.

## 환경별 사전 점검과 체인 중단

V2_144를 포함한 앱을 배포하기 **전에 각 환경에서** `server_version_num >= 170000`(PostgreSQL 17 이상), 두 표 행 수, 세 컬럼의 현재 타입·NULL·기본값·표준 메타, 사용자 트리거·상속·RULE·의존성과 쓰기 주체를 확인한다. 공유 개발 DB의 실측을 다른 환경에 재사용하지 않는다. 2026-10-30 17:06 KST 추가 조회에서 대상은 일반 표였고, 사용자 트리거·상속·RULE 및 세 컬럼에 붙은 제약·의존성은 없었다. 표의 PK/FK·버전 제약은 그대로 보존한다.

```sql
SELECT current_setting('server_version_num')::integer AS server_version_num;
SELECT 'tb_dept_task_info' AS table_name, count(*) AS row_count FROM public.tb_dept_task_info
UNION ALL SELECT 'tb_popup_info', count(*) FROM public.tb_popup_info;
```

한 행이라도 있거나 다른 전제가 달라지면 새 앱 배포를 보류하고 기존 앱과 스키마를 유지한다. 사전 점검 없이 시작하면 V2_144와 이후 Flyway 체인이 실패하며 앱 기동도 멈출 수 있다. 그 경우 데이터 삭제·가드 제거·Flyway 이력 조작으로 진행하지 않고 데이터 보존 이행안을 별도로 승인받는다. 읽기 전용 사전 점검은 정비창 안 잠금 뒤의 재검사를 대신하지 않는다. 새 빈 격리 시험 환경은 같은 체인으로 검증한다.

행이 있는 환경은 V2_144 뒤의 더 큰 버전만 추가해서는 구제할 수 없다. 아직 어디에도 V2_144를 적용하지 않았다면 적용 전 설계를 수정·재승인할 수 있다. 이미 적용된 환경이 있으면 체크섬을 보존하고, V2_144 **이전**에 들어갈 별도 데이터 보존·복원 절차(승인된 out-of-order 경로 등)를 설계·검증해야 한다. 그 절차와 추가 표준 이름·데이터 이동은 이번 승인 범위에 포함하지 않는다.

현재 [dev runner](../../scripts/dev.mjs)는 원격 DB의 Flyway 자동 적용을 끄며 [개발 설정](../../api-server/src/main/resources/application-dev.yml)은 `ddl-auto=validate`를 사용한다. 따라서 DB 적용 전에 새 매핑을 main으로 병합하면 개발 앱이 기동하지 못한다. **구현 PR은 required CI 통과 뒤 실제 DB 적용 승인까지 병합 대기로 유지했다.** 최종 승인 뒤 writer 부재·최신 PR HEAD·CI 재확인 → main 병합 → 해당 커밋 V2_144 적용 → 새 코드 앱 검증을 하나의 정비창에서 수행했다. 사전 조회에서 공유 DB의 다른 접속은 0건이었으며, 별도 로컬 DB를 쓰는 Docker 앱은 중지하지 않았다. 새 앱은 스키마 적용 뒤 시작했고 Flyway와 백그라운드 작업을 끈 검증 컨텍스트에서 임시 데이터의 저장·조회·NULL·버전 증가·DTO JSON 문자열·입력/인가 거부를 확인한 뒤 시험 트랜잭션을 롤백했다. 두 표와 임시 사용자 잔여 행은 0이다.

NOWAIT 잠금은 autoanalyze 같은 내부 작업과 부딪혀도 55P03으로 안전하게 중단할 수 있다. 새 빈 DB에서 실패하면 원인을 확인하고 전체 트랜잭션이 되돌아갔는지 점검한 후 다시 실행한다. 잠금 제한을 늘리거나 autovacuum을 끄는 운영 우회는 이 패킷에 포함하지 않는다.

A안의 한정 예외와 구현 방향, 완성된 패킷의 해당 공유 개발 DB 실행은 승인되어 적용했다. 이 실행 승인은 다른 환경이나 로그 SQL 검토안의 메타 등록·DDL·백필을 포함하지 않는다. 복구 후보의 실제 실행은 앞 절의 후속 버전·waiver·별도 승인 조건을 따른다.
