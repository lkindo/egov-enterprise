# 20260717 — E2E 가비지 정리 (V2_18 마감 후속, 별도 세션 등재분 이행)

> **등급**: L1 · **근거**: DB 헌법 제8조 2항 예외(테스트 가비지 자율 정리) — GEMINI.md §7 명시 허용.
> 20260717-db-finalization-p2-length-sweep.md DEFER 항목("E2E 가비지 — 별도 세션") 이행.

## 1. 사전 실측 (Pre-Audit, SOP §3.1)

- **대상 확정**: tb_authrt_info `ROLE_E2E_%` **168행**(172 중, 실권한 4: ADMIN/ANONYMOUS/SYSTEM/USER) ·
  tb_role_info `role_nm LIKE 'E2E Role%'` **243행**(258 중, 실롤 15). 합계 411행.
- **참조 그래프 전수 검사**: FK 3건(authrt_role_map·menu_crt_dtl→authrt_info, role_prgrm_map→role_info, 전부
  NO ACTION) + 무FK 논리참조 4곳(user_authrt_map.authrt_id, role_hierarchy higher/lower, authrt_role_map.role_cd,
  user_info.role) — **E2E 오염 전부 0건**. 가비지가 부모 2테이블에 완전 고립 확인.
- 컬럼명 함정: tb_role_info 패턴 컬럼은 `role_patrn`(오타 아님, 물리 실명) — role_pttrn 아님.

## 2. 실행

1. **백업 덤프**: 대상 411행 전체 → scratchpad `backup-authrt-e2e-411.json`(54KB) + `backup-role-e2e.json`(97KB).
2. **DELETE**: db-bridge `--raw` 멀티문(암묵 단일 tx) — `SET statement_timeout='60s'` 선두 +
   DELETE 2문. FK NO ACTION 하 무저항 통과 = 자식 참조 부재의 물리 증명.

## 3. 검증 (Stage 4 증거)

| 테이블 | 전 | 후 | E2E 잔존 |
|---|---|---|---|
| tb_authrt_info | 172 | **4** | 0 |
| tb_role_info | 258 | **15** | 0 |
| authrt_role_map / role_prgrm_map / user_authrt_map | 3 / 52 / 24 | **불변** | 0 |

## 4. 동반 처리

- **frontend/api-docs.json 리포 등재** (사용자 승인): bootRun 수렴 기동 산출물(204 paths), git 이력 전무·비ignore
  상태였음 → 오프라인 `codegen:file`의 SSOT 입력이므로 커밋. codegen diff 0 기왕 검증(V2_18 태스크 §4).
- P4 잔여 "죽은 스캐너 2파일 삭제"는 4323ee46d에서 기왕 완료 확인(check-db-standard.js 등) — 잔여 목록에서 제거.
- 미푸시 7커밋(P0~P5 로드맵 전체) + 본 세션 커밋 → origin/main 푸시 (사용자 승인).

## 5. 재발 방지 후보 (미이행, 후속 등재)

- E2E 하네스(teardown)가 생성 롤/권한을 정리하지 않아 가비지가 재축적됨 — Playwright 글로벌 teardown 또는
  E2E 시드 정리 스크립트에 `ROLE_E2E_%`/`E2E Role%` cleanup 추가 검토. (프론트 E2E 하네스 변경 = 별도 스코프)
