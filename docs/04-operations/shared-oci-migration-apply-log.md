# 공유 OCI 마이그레이션 적용 로그

> 상태: 운영 기록 — 공유 개발 OCI DB 에 Flyway 마이그레이션을 적용한 사실의 기록이다. 적용 권한을 주지 않으며, 무중단 Expand 릴리스 기록([migration-release-log.md](migration-release-log.md))과 섞지 않는다.

공유 OCI DB 에 마이그레이션을 적용할 때마다 이 표에 한 행을 남긴다. 적용 결과를 운영 결정(DEC)으로 쓰지 않는다([AGENTS.md 기록 기준](../../AGENTS.md#documentation-and-memory)). 현재 적용 버전은 이 표의 마지막 행이고, 표가 비어 있으면 아래 이전 기록의 마지막 링크다. 적용할 때 공용 메모리를 고치지 않는다.

## 기록 규칙

- 적용 전에 사용자 명시 승인을 받는다(DB 스키마·데이터 변경, [AGENTS.md 공통 작업 원칙](../../AGENTS.md#공통-작업-원칙)). 이 로그는 승인을 대신하지 않고, 받은 승인의 요지와 범위를 남긴다.
- 병합본(main 병합 커밋)에서 꺼낸 마이그레이션 폴더만 쓴다. 마이그레이션별 사전 읽기 질의·확인 질의·되돌리기는 [인가 전환 런북](authorization-cutover-runbook.md)처럼 그 마이그레이션을 설명하는 런북이 정본이며, 이 표에는 결과 요지만 적는다.
- 비밀값·접속 정보·개인정보·백업 파일 경로는 적지 않는다. 버전·행 수·검증한 migration 수처럼 비밀이 아닌 값만 적는다.

## 적용 기록

| 적용일(KST) | 마이그레이션 | 사용자 승인 요지 | 병합 PR | 사전 읽기·백업·validate | 확인 쿼리 요지 | 롤백 원본 |
|---|---|---|---|---|---|---|
| 2026-10-20 | V2_135(인터넷서비스안내 권한 배정 정리)·V2_136(스크랩 등록자·주소 유일 제약), 반복 시드 R__zz_seed_base_admin(SERVICE_* 8행 제외) | 2026-10-20 사용자 승인 "둘 다 지금 적용"(DEC-OPS-372 의 데이터 적용) | #943 (병합 c0ded166d) | 사전 읽기: 스키마 2.134, tb_intrn_svc 0행·/admin/system/isg 메뉴 0·SERVICE_* 배정 8(모두 ROLE_ADMIN·ROLE_SYSTEM 의 OPERATION, 예상 밖 0), 스크랩 1행·(등록자, 주소) 중복 0. 적용 직전 pg_dump 백업(표 데이터 127, 영향 표 4개 목차 확인). Flyway 12.4.0 migrate 3건 → validate 161 | SERVICE_* 배정 0·REMOVE 이력(migration:2.135) 8, 제약 uk_tb_bbs_scrap_frst_rgtr_id_scrap_url 1, 스크랩 1행 유지, tb_intrn_svc 0행 유지, 메뉴 75·활성 70 그대로 | 배정은 REMOVE 이력으로 되살린다([인가 전환 런북 V2_135](authorization-cutover-runbook.md)). 제약은 DROP CONSTRAINT 로 되돌린다. 전체는 적용 직전 백업 |

## 이전 기록

이 로그 전의 적용은 운영 결정으로 기록했다. 원문은 소급 편집하지 않고 링크로만 색인한다. 그보다 앞선 적용 가운데 V2_94~96, V2_97, V2_100(메뉴 재편)의 결과는 [표준 길이 런북](../archived/standard-length-alignment-runbook.md), [로그 보존 정책](log-retention-policy.md), [인가 전환 런북](authorization-cutover-runbook.md#2026-09-11-oci-메뉴-재편-적용-결과)에 있다.

- V2_112·114·115: [DEC-OPS-181](../archived/operational-decisions-history.md#dec-ops-181) ①
- V2_116~118: [DEC-OPS-207](../archived/operational-decisions-history.md#dec-ops-207)
- V2_119: [DEC-OPS-212](../archived/operational-decisions-history.md#dec-ops-212)
- V2_120: [DEC-OPS-217](../archived/operational-decisions-history.md#dec-ops-217)
- V2_121: [DEC-OPS-220](../archived/operational-decisions-history.md#dec-ops-220)
- V2_122: [DEC-OPS-221](../archived/operational-decisions-history.md#dec-ops-221)
- V2_123: [DEC-OPS-223](../archived/operational-decisions-history.md#dec-ops-223)
- V2_124: [DEC-OPS-226](../archived/operational-decisions-history.md#dec-ops-226)
- V2_125: [DEC-OPS-230](../archived/operational-decisions-history.md#dec-ops-230)
- V2_126·127: [DEC-OPS-234](../archived/operational-decisions-history.md#dec-ops-234)
- V2_128: [DEC-OPS-314](../archived/operational-decisions-history.md#dec-ops-314)
- V2_129: [DEC-OPS-329](../archived/operational-decisions-history.md#dec-ops-329)
- V2_130: [DEC-OPS-351](../archived/operational-decisions-history.md#dec-ops-351)
- V2_131·132: [DEC-OPS-363](../archived/operational-decisions-history.md#dec-ops-363)
- V2_133: [DEC-OPS-365](../archived/operational-decisions-history.md#dec-ops-365)
- V2_134: [DEC-OPS-370](../archived/operational-decisions-history.md#dec-ops-370)
