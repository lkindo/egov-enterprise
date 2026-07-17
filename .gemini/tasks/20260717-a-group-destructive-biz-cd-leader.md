# 20260717 — A그룹 파괴적 2종: biz_cd 정화(evnt_nm) + leader 死도메인 제거

> **등급**: L2 (DB 스키마 DROP·다중모듈·계약변경) · **승인**: 사용자 "둘 다 승인 후 진행"(2026-07-17 AskUserQuestion)
> **선행**: A그룹 의사결정 설계서(docs/02-architecture/a-group-decision-recommendations.md) §3-4·§3-7 + 22-에이전트 적대검증

## 1. biz_cd 정화 — Expand-Sync-Contract (V2_22)

**결함**: tb_event_info.biz_cd(사업코드, varchar30)에 DTO 가 '행사명칭'을 저장하는 오용(V2_18 DEFER).
실측: biz_cd 0행(비NULL 83 전량 'E2E Event %' 가비지), SSOT BIZ_CD 용어 0건 vs 행사명 EVNT_NM(명V200) 표준 존재.

- **V2_22**: [Expand] ADD evnt_nm varchar(200) → [Sync] DO-가드 UPDATE(biz_cd→evnt_nm) → [Contract] DROP biz_cd(linter:ignore).
  라이브 적용: evnt_nm 200·biz_cd 부재·83행 이관 실측. 명시적 NULL 키워드 금지(린터 4번룰 오탐 회피).
- **동기화**: EventInfo(bizCd→evntNm @Column(200))·EventInfoDto(@Size 200·Schema '행사 명칭')·EventInfoService(빌더 2)·
  EventInfoRepository(JPQL e.evntNm)·eventService.ts·EventManagementClient.tsx(5곳+maxLength 30→200). EventInfoMapper 는 동일명 자동매핑이라 무수정.
- **검증반영(적대검증)**: ①루트 db_columns.json 갱신(biz_cd→evnt_nm — MappingValidator stale 차단) ②V1__init_test_schema.sql 동기화
  ③testPlan 의 "SchemaNamingLinter 컬럼명 기계검증"은 허위(린터는 ADD COLUMN 컬럼명 미검증) — 명명 근거는 SSOT 수동 SELECT.

## 2. leader 死도메인 제거 (V2_23) — 파괴적, 개별 승인 후

**실측 사망**: tb_leader_schdl 0행·tb_leader_stts 0행·인바운드 FK 0, 부모 생성경로 코드/시드 전무, FE 계약파손+죽은버튼, E2E 렌더만.
framework-reusability 방침(파생 프로젝트서 삭제) + V2_16 tb_club_*·tb_leader_schdl_dtl DROP 선례와 동형.

- **백엔드 삭제 14파일**: 컨트롤러(lsm)·엔티티(LeaderSchedule/Status)·리포지토리 2·서비스 2·DTO 2·매퍼 2·테스트 3.
- **수정**: BusinessIdGnrConfig(egovLeaderSchdlIdGnrService 빈 제거)·RbacAuthorizationMatrixTest(leader-schedules
  secure-paths·SECURE_TEST_PATHS·prgrm_lst·role_prgrm_map 시드 제거).
- **FE 삭제 3**: admin/system/lsm/{page,LsmClient}·LeaderScheduleAdminService.ts. 수정: BusinessExtensionPage.gotoLsm 제거·
  18-business-extension LSM 케이스 삭제·MonitoringHubClient 목업 문자열 교체(tb_note_info 등 실존 참조로).
- **V2_23**: DROP tb_leader_schdl/tb_leader_stts(linter:ignore) + LSM 시드 정리(role_prgrm_map·prgrm_lst·menu_crt_dtl·menu_info).
  **검증반영: menu 삭제가 fk_tb_menu_crt_dtl_tb_menu_info 에 걸려(1행) crt_dtl 선삭제 추가**(단일 tx 롤백으로 발견). LSM 하위 자식메뉴 0 확인.
  라이브 적용: 테이블 0·시드 0 실측. 소스 leader 참조 전역 0건 확인.

## 3. 게이트 (Stage 4) — 전건 green

- **bootRun 수렴**: DB_URL 주입 재기동 → Flyway V2_20~V2_23 전량 rank25~28 success=true 실측 + validate(엔티티↔물리) 통과.
- **codegen**: /v3/api-docs 재추출(268KB, leader paths 0·EventInfoDto.evntNm 有·bizCd 無) → codegen:file/zod 재생성
  (schemas 261→254, leader 7종 소멸) → **`npx tsc --noEmit` exit 0**.
- **`next build` exit 0**: 전 라우트 프리렌더(lsm 라우트 소멸 확인) — RSC 경계 게이트.
- **전체 백엔드 테스트 BUILD SUCCESSFUL**: 1차 실패(UserService 3클래스 — log-privacy 생성자 확장 여파, @Mock 추가로 정정)
  → 재실행 green. 린터 2종(ZeroDowntime/SchemaNaming)·RbacAuthorizationMatrix 타겟 green.
- **compileJava/compileTestJava exit 0**.

## 4. 잔여(후속 등재)

- E2E 가비지 evnt_nm 83행(이관분)은 DB 헌법 8조2항 예외로 정리 가능 — 별도 세션.
- evnt_nm NOT NULL 승격(현 24행 NULL)·biz_yr→evnt_yr 개명은 제품 결정(설계서 §4 열린질문 3-4).
- leader OpenAPI 외부 소비자 존재 여부는 코드로 반증 불가(설계서 §4 3-7) — 자체 FE 뿐 실측.
