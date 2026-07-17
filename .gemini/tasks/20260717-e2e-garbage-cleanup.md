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

## 4. 동반 처리 — 🚨 api-docs 계보 역전 발견·정정 (V2_18 false-completion)

- 등재 직후 pre-push 로그에서 codegen 이 `../api-docs.json`(**루트**)을 읽는 것을 포착 → 실측:
  **루트 api-docs.json(추적본)=stale(07-15, V2_17 이전 계약)** vs **frontend/api-docs.json=신계약(07-17 수렴 추출본,
  MemoReportDto date-time·sortOrdr int64·@Size 축소 반영)**. V2_18 세션이 추출본을 codegen 이 읽지 않는
  `frontend/` 경로에 떨어뜨리고 루트 교체를 누락 → **"codegen diff 0 = FE 영향 없음 실증"은 stale 원본 대비
  측정이라 무효**(false-completion).
- **정정**: 신계약 → 루트 승격 + 미아 파일 제거 + codegen:file/zod 재생성. 실측 diff = Zod 제약 조임
  (pstinstCd 20→12·roleId/authrtCd 30→20·evnt*Ymd 20→8 등, V2_18 @Size 와 정합) + CustomUserDetails.authorityCodes
  신필드 + FileDto 블록 재배치(z.lazy 라 순서 무해) + springdoc 경로 출력순서 변동 노이즈.
  **`npx tsc --noEmit` exit 0 — 타입 파손 없음, 실제 FE 영향은 Zod 런타임 제약 강화뿐.**
- **교훈**: "생성물 diff 0" 검증은 **codegen 이 실제로 읽는 경로의 원본을 교체한 뒤**에만 유효하다.
  api-docs 추출 시 정본 위치=리포 루트(`openapi-typescript ../api-docs.json`), frontend/ 하위 아님.
- P4 잔여 "죽은 스캐너 2파일 삭제"는 4323ee46d에서 기왕 완료 확인(check-db-standard.js 등) — 잔여 목록에서 제거.
- 미푸시 7커밋(P0~P5 로드맵 전체) + 본 세션 커밋 → origin/main 푸시 (사용자 승인).

## 5. 재발 방지 후보 (미이행, 후속 등재)

- E2E 하네스(teardown)가 생성 롤/권한을 정리하지 않아 가비지가 재축적됨 — Playwright 글로벌 teardown 또는
  E2E 시드 정리 스크립트에 `ROLE_E2E_%`/`E2E Role%` cleanup 추가 검토. (프론트 E2E 하네스 변경 = 별도 스코프)
