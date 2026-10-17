# ADR-0031 — 이관 원장 확정 조건과 chunk 실패 처리의 후속 결정

- 상태: Accepted
- 기록일: 2026-10-17
- 기존 결정일: 2026-10-14~15
- 승인 근거: [DEC-OPS-310](../../archived/operational-decisions-history.md#dec-ops-310)의 2026-10-14 사용자 승인, [DEC-OPS-315](../../archived/operational-decisions-history.md#dec-ops-315)·[316](../../archived/operational-decisions-history.md#dec-ops-316)의 기존 위임과 L3 진행 지시, [317](../../archived/operational-decisions-history.md#dec-ops-317)의 U1·U3 사전 승인, [319](../../archived/operational-decisions-history.md#dec-ops-319)의 분할 구현·PR 통합 결정, [325](../../archived/operational-decisions-history.md#dec-ops-325)의 L4-P2 사용자 결정. 2026-10-17 문서 정리 요청으로 이 결정들을 승격한다.
- 대체: [ADR-0029](ADR-0029-legacy-standardization-migration.md) 결정 3의 적합률 100%·표준 용어 전제, 결정 8의 쓰기 실패 처리 적용 시점과 실행 단계 표의 L3 PR 경계. 결정 7의 제어 테이블 변경은 기존 승인 안에서 구현한 좁은 범위를 명시한다.
- 관련: [이관 도구 설계](../legacy-migration-tool-design.md), [복구 런북](../../04-operations/migration-recovery-runbook.md).

## 맥락

원장과 적재를 구현하면서 적합률 추정의 한계, 표준 용어가 없는 기존 대상 컬럼, 쓰기 실패 시 부분 커밋을 확인했다. 후속 승인·위임 결정이 운영 인덱스에 기록됐으나 ADR-0029와 다른 조건을 정하므로 이 ADR이 그 변경 범위를 소유한다. 기존 결정의 시행일·승인 근거는 보관 원문에 남기며 새 데이터 변경이나 예외를 승인하지 않는다.

## 결정

1. **확정은 실행할 처리와 근거를 함께 기록한다.** 형식 2 원장의 `CONFIRMED` 행은 적재에 사용할 내장 변환·타입·codemap·nullify를 `load`로 정한다. 적합률은 참고값이며 기록된 위반마다 실행 시점 처리가 필요하다. 셀 수 없었던 위반은 `unmeasured`의 이유, 사유와 허용된 행 단위 처리로 판정한다. 일부만 읽은 `SAMPLED` 프로파일로는 확정하지 않는다. 승인 예외는 격리 가능한 코드·사유·1~1000행 상한을 요구한다. 원장에서 만든 mapping과 실제 실행 계약의 대조는 유지한다.
2. **비표준 대상은 표준 판정과 구분한다(U1).** live 표준 메타에 대상 컬럼의 용어가 없다는 증거가 있을 때만 `nonStandardTarget: {reason}`으로 확정한다. 이 경로는 표준 도메인·적합성 대조를 제공하지 않으며 물리 타입 검사는 그대로다. 용어를 새로 등록하거나 물리 스키마를 변경할 권한을 부여하지 않는다.
3. **허용값 미확인과 대사 실패를 구분한다(U3·L4-P2).** CODE·YN 허용값을 확인하지 못했으면 사유를 기록해 codemap 없이 확정할 수 있다. 읽을 수 있는 허용값이 있으면 codemap 출력은 그 안이어야 한다. 제품 `VALIDATE` 바인딩이 있는 컬럼은 쓰기 전에 사용 중 상세코드에 대한 codemap 또는 상수 검증을 요구하므로 미확인 예외로 넘기지 않는다. 적재 후 대사 원천이 있는 컬럼의 불일치는 실패다. 원천이 없는 컬럼은 `UNRECONCILED`로 남기며, load의 PASS를 코드 적합성 확인으로 읽지 않고 컷오버 전에 업무 소유자의 확인·서명을 요구한다.
4. **쓰기 실패는 예외 격리 도입을 기다리지 않고 chunk 단위로 중단한다.** batch 실패 뒤 같은 transaction에서 행마다 재시도해 모두 성공하면 한 번 커밋한다. SQL 오류·행 재변환 실패·`target_generated` 쓰기 실패 중 하나라도 있으면 chunk 전체를 롤백하고 테이블과 run을 멈춘다. 앞서 커밋한 chunk는 남는다. 쓰기 오류를 승인 예외 행처럼 격리하지 않으며 전체 되돌리기는 승인된 백업 복원이다. 이후 원장이 승인한 변환 위반만 격리하는 경로는 [DEC-OPS-318](../../archived/operational-decisions-history.md#dec-ops-318)의 제한을 따른다.
5. **분할 식별자는 checkpoint에만 추가한 기존 구현을 따른다.** 표 매핑 `id`로 checkpoint를 구분하고 keymap은 소스 단위와 단일 소유 매핑 규칙을 유지한다. 제어 스키마 업그레이드는 기존 행을 보존하며 COMMIT 진입의 `--ack-control-schema-upgrade`와 전후 버전 증거를 요구한다. 공유 OCI 적용은 별도 승인이다. L3 실행 분리는 원래 1~2 PR 대신 여섯으로 나눴다가 L3c·L3d를 합친 **다섯 PR**로 결정됐으며, 이 기록은 이후 작업을 같은 개수로 강제하는 예산이 아니다.

## 유지하는 경계와 검증

도구는 사람이 확정한 원장만 적재하며 표준 용어 자동 확정, 대상 DDL 자동 실행, 공개 외부 드라이버 COMMIT을 열지 않는다. 원시 값·접속정보·키를 승인 artifact에 기록하지 않는 ADR-0029의 경계와 기관 승인 절차도 유지한다. 원장 workflow는 내장 변환기만 받으므로 DEC-OPS-315 당시 제안된 프로젝트 변환기 경로로 우회할 수 없다.

현재 구현은 [TermLedgerValidator](../../../migration-tool/src/main/java/nuri/migration/validate/ledger/TermLedgerValidator.java), [EtlExecutor](../../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java), [CodeSetReconciler](../../../migration-tool/src/main/java/nuri/migration/verify/CodeSetReconciler.java), [MappingIndex](../../../migration-tool/src/main/java/nuri/migration/mapping/MappingIndex.java)와 설계·복구 런북에서 대조한다. 이 문서 정리는 새 DB 실측·적재·외부 vendor 자격을 증명하지 않는다.
