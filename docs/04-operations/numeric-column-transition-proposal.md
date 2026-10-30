# 숫자 3개 컬럼의 물리 타입 정합 결정안

현재 표준 이름과 API 문자열을 유지하면서 DB만 NUMERIC으로 맞추는 것이 목표다. **공유 개발 DB의 두 표가 적용 직전에도 비어 있을 때만, 정비창에서 직접 타입을 바꾸는 한정안을 권고**한다. 이는 DB 헌법 제7조의 Expand–Sync–Redirect–Contract 일반 경로에 대한 예외 결정이 필요한 제안이며, 아직 승인된 SQL·waiver·앱 변경이 아니다. [로그 2개](log-duration-transition-proposal.md)의 표준 등록안 및 보류한 `ans_lv`와 구분한다.

| D-n | 결정 | 관련 H | 영향 계약 파일 | 부정 시험 |
|---|---|---|---|---|
| D-1 | 기존 이름·메타 도메인·API 문자열/null 보존 | H1 | `DeptJob`·`Popup`·DTO·후속 Flyway | 숫자 JSON·비정규 문자열 거부 유지 |
| D-2 | 공유 개발 DB·빈 두 표·정비창에 한정한 직접 TYPE 변경 후보 | H1 | 후속 ADR·`zdm-waivers.json`·Flyway | 한 행이라도 있거나 잠금 실패 시 전체 중단 |
| D-3 | 앱/외부 writer 중지 → 스키마 → 새 앱 → 검증 후 재개 | H1 | Entity 매핑·배포 및 복구 절차 | 구 앱 혼용 거부, 실패 후 원복 |

## 정확한 대상과 보존 조건

2026-10-30 16:40~16:43 KST 공유 개발 PostgreSQL 17.9/public을 읽기 전용으로 다시 대조했다. 세 컬럼은 모두 nullable `VARCHAR(12)`, 기본값 없음이며 부서 업무·팝업 두 표는 각각 0행이었다. 조회 시점의 사실이며 적용 승인이나 다른 기관 환경의 증거가 아니다.

| 대상 | 기존 표준 | 최종 타입 | API·제품 입력 |
|---|---|---|---|
| `tb_dept_task_info.prrty_rnk` | 우선순위 / `PRRTY_RNK` / 수N10 | `NUMERIC(10,0) NULL` | 문자열 `1`·`2`·`3` |
| `tb_popup_info.popup_wdth_sz` | 팝업가로크기 / `POPUP_WDTH_SZ` / 수N7 | `NUMERIC(7,0) NULL` | 선행 0·공백·부호 없는 100~4000 정수 문자열 |
| `tb_popup_info.popup_vrtc_sz` | 팝업세로크기 / `POPUP_VRTC_SZ` / 수N7 | `NUMERIC(7,0) NULL` | 가로와 같음 |

기본값은 추가하지 않고 null·생략의 기존 서비스 의미와 화면 기본 크기는 유지한다. 표준 메타 변경·기존 데이터 보정·새 DB CHECK는 이 후보 범위에 넣지 않는다. API 요청의 JSON 숫자를 문자열로 보정하지 않는 [ADR-0045](../02-architecture/decisions/ADR-0045-bookmark-cleanup-input-policy-and-memo-read-consistency.md)를 유지한다. `ans_lv`의 값 재계산·타입 변경도 하지 않는다.

## 이행 경로 비교와 필요한 결정

| 경로 | 영향 | 필요한 결정 |
|---|---|---|
| **A: 빈 표 정비창 한정 TYPE 변경(권고)** | 기존 컬럼명·메타 그대로, 새 컬럼·동기화 트리거 없음. 구 앱과 새 앱을 함께 실행하지 않음 | 이 세 컬럼과 해당 환경에 한정한 E&C 예외, writer 중지·정비창, 구조화 waiver |
| B: 임시 숫자 컬럼에 동기화 후 기존 이름 회수 | 추가 컬럼·트리거·백필·두 번의 전환과 DROP/RENAME이 필요 | 임시명도 표준 등록/명명 예외의 대상이다. 정확한 이름·기간·제거 조건 결정 필요 |
| C: 표준 컬럼을 가진 별도 병행 테이블 | 중복 용어는 피하지만 새 표·FK·행 수명·버전·동기화·조회 경로가 늘어남 | 새 표준 표 이름과 전체 이행 설계 승인 필요 |

동일 의미의 영구 별칭을 등록하던 초기 후보는 채택하지 않는다. 임시 이름이라는 이유만으로 [DB 헌법 제5조·제9조](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)를 면제할 수 없고, 빈 표라는 이유만으로 제7조의 의무를 면제할 수도 없다. [ADR-0013](../02-architecture/decisions/ADR-0013-standard-text-length-alignment.md)의 제한된 TYPE 변경은 당시 대상에 한정된 선례이지 이번 승인으로 승계되지 않는다.

## A안의 구현·배포 수용 기준

1. **배포 전:** 새 앱에서 Entity의 세 저장 필드를 precision/scale을 명시한 정확한 정수형으로 매핑하고 DTO는 기존 문자열/null을 유지한다. 실제 PostgreSQL/JPA 저장·조회와 API 응답을 검증한다. 기존 메타와 PK·FK·낙관적 버전·감사·인가 의미는 바꾸지 않는다.
2. **정비창 시작:** 앱 인스턴스·배치·직접 SQL을 포함한 writer를 중지한다. 같은 트랜잭션에서 두 표의 잠금을 고정 순서로 잡고 0행·기존 타입·도메인·제약·의존성을 재확인한다. 하나라도 달라지면 DDL 전에 중단한다. 대상 전체에 잠금 획득 제한과 트랜잭션 예산을 결속한다.
3. **스키마:** 승인된 새 versioned Flyway 한 개에서 세 타입을 함께 바꾼다. 과거 Flyway나 사전을 고치지 않는다. 구 앱은 변경 후 DB에 연결하지 않는다. 정비창을 무중단 롤링 이행이라고 부르지 않는다.
4. **재개:** 새 앱으로 우선순위·팝업 저장/조회, null, 버전 충돌, 인가, 원문 JSON 검사를 통과한 뒤 writer를 재개한다. 빈 표 조건이 깨진 환경은 이 안으로 진행하지 않고 데이터 보존 이행안을 다시 검토한다.
5. **복구:** DDL 커밋 전 실패는 전체 롤백한다. 커밋 후·쓰기 재개 전 장애는 두 표가 여전히 비었는지 잠금 안에서 확인한 역변경과 구 앱 복귀를 리허설한다. 쓰기 재개 뒤에는 같은 빈 표 복구안을 쓰지 않으며 승인된 백업 복원 또는 별도 roll-forward가 필요하다. Flyway 이력은 삭제하거나 repair하지 않는다.

시험은 0행 정상, 데이터가 한 행이라도 있는 경우 거부, 잠금 경합, 두 번째 표 실패 시 첫 번째 표 원복, 정확한 타입·NULL·기존 제약 보존, 앱/API 호환과 복구를 포함한다. 이 제안은 아직 그 시험 통과를 주장하지 않는다. NUMERIC의 scale 0 cast가 소수 값을 반올림할 수 있으므로, 데이터가 생긴 환경에서 cast를 입력 검증으로 대신할 수 없다. [PostgreSQL NUMERIC](https://www.postgresql.org/docs/17/datatype-numeric.html), [ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html).

이번 결정 요청은 **A안의 한정 예외와 구현 방향**이다. 선택 이후 정확한 Flyway·앱 diff·격리 검증·복구 결과를 갖춘 적용 패킷으로 실제 공유 DB 실행 승인을 받는다. 현재 문서나 로그 SQL 시험을 그 승인으로 간주하지 않는다.
