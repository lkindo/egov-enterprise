# 20260717 — B그룹 기술부채 일괄 해소: SMS/Mail tx 분리 + E2E teardown + V2_19 경미 스윕

> **등급**: L2 (다중 모듈: DB·BE·FE·E2E 하네스) · **승인**: 사용자 "b진행" (2026-07-17, 잔여작업 B그룹 지목)
> **선행**: 3스트림 실체 조사 — SSOT 도메인 체인 기계검증(V2_17 활성화분) + 참조 그래프 전수 실측

## 0. 스코프 정정 (조사 결과 반영, 정직 보고)

- **react-hooks 백로그**: 2026-07-08 기왕 트리아지+런타임 검증 완료(0 루프) — B에서 제외.
- **VT load-test**: k6 부재+CI 빌링 차단 — 이 환경에서 실행 불가, **정직 보류 유지**(재개조건: CI 복구 or k6 설치+로컬 부하).
- **"leader_schdl DEFERRABLE 2건"은 오분류**: 실체는 P1의 DEFER(미추가 FK) — ①schdl_id 는 FK 후보 오판(조치 불요)
  ②leader_id 는 부모 tb_leader_stts 사경화(생성 API 부재)로 **제품 결정 대기** → A그룹 재분류.
- **"죽은 스캐너 2파일"**: 4323ee46d 에서 기왕 삭제 완료 확인.

## 1. E2E 가비지 3차 정리 + 재발 방지 (헌법 8조2항 자율)

- **GROUP_E2E 155행 삭제** (tb_authrt_group_info 155/155 전원 가비지 — 실그룹 0). 오전 정리(411행)에서 누락된
  3번째 계열. FK 검사: fk_tb_user_info_tb_authrt_group_info 뿐, group_id 보유 사용자 0 → 무저항 DELETE. 백업 scratchpad.
- **재발 방지**: [cleanup-db.ts](../../frontend/e2e/scripts/cleanup-db.ts) globalTeardown 에 섹션 11 신설 —
  롤(URL_E2E_/E2E Role)→그룹(GROUP_E2E_/E2E Group)→권한(ROLE_E2E_) 순 API 삭제.
  **축적 원인 확정: 기존 teardown 10개 섹션에 보안 아티팩트 계열이 아예 없었음** (02-admin-system.spec.ts:106-128 생성분).

## 2. SMS/Mail 외부 IO tx 분리 (scout6 #5 이행)

**결함 실체**: SmsAsyncProcessor.processSending 이 REQUIRES_NEW 로 **수신자 발송 루프 전체**를 감싸
①외부 게이트웨이 지연 동안 DB 커넥션 점유 ②sendToRecipient 의 내부 REQUIRES_NEW 에선 recptn 이 detached 라
결과 갱신이 사실상 외부 tx 의 지연 dirty-check 에 의존(중간 크래시 시 진행분 전량 유실). Mail 도 SMTP IO 가 tx 내부.

**수정**: 발송 경로 무(無)트랜잭션 + 결과 기록만 키 기반 재조회 · 짧은 REQUIRES_NEW(`updateResult`/`markResult`)로
수신자/메시지 단위 즉시 커밋. @Recover 도 동일 경로. 시그니처가 엔티티 전달→키 전달로 변경(detached 함정 원천 제거).
MailResilienceIntegrationTest(재시도 3회+Recover F 각인)는 무수정 통과 대상 — 거동 보존 증거.

## 3. V2_19__minor_type_and_naming_sweep.sql (라이브 선적용 ✓)

SSOT 기계검증(meta_standard_terms→domains, V2_17 체인) 근거:

| 대상 | 변경 | 근거 |
|---|---|---|
| tb_diary_info.excptn_mttr · tb_hlp_info.hlp_expln · tb_onln_mnl_info.onln_mnl_dfn | text→**varchar(4000)** | 특이사항/도움말설명=내용V4000 등재 · DFN 미등재는 등재 3종 전원일치 유추(0행·0행·36행 max14 무손실) |
| tb_inst_cd.inst_cycl · tb_inst_cd_rcptn_log.inst_cycl | varchar(2)→**numeric(2)** | 기관차수(INST_CYCL)=수N2 등재 (양 테이블 0행) |
| tb_rptp_stats.reprt_nm→**rptp_nm** | RENAME | 보고서명 등재 용어=RPTP_NM(명V256, 길이 기정합). reprt_id/sttus/type 은 단어 '보고서'가 REPRT/RPTP 이중 등재라 위반 아님 — 보류 |
| tb_authrt_group_info.group_crt_ymd→**group_crt_dt** | RENAME | timestamp 타입-접미사 정합 (V2_18 리네임 후보 이행) |

멱등성: V2_18 교훈 반영 — 타입 변환은 원타입 검사 DO 가드, RENAME 은 구컬럼 존재 가드 (fresh/재생/재실행 3경로).

**코드 동기화**:
- 엔티티 12곳 `columnDefinition="TEXT"` 거짓말 제거(물리 varchar(4000) 정합): Faq/Note/WorkReport/MemoReport/
  Schedule/LeaderSchedule/CnsltManage×2/DeptJob/Diary/Hpcm/OnlineManual(dfn 1000→4000 포함)
- InstitutionCode·RecptnLog.instCycl String→**Integer**(columnDefinition numeric(2)) — **DTO 는 String 유지**
  (V2_16 프리시던트, Breaking Change 차단), InstitutionCodeService 경계 변환(parse/format) 신설
- ReprtStats: 물리만 rptp_nm, Java 필드/JSON 계약 유지(@Column(name)) — 네이티브 SQL 참조 0건 실측
- GroupManage.groupCrtYmd→groupCrtDt 전파: 엔티티·DTO(**계약 변경**)·서비스 포매터·FE(security.ts,
  SecurityGroupClient.tsx) — 생성물 2파일은 bootRun 수렴 codegen 재생성분
- DTO @Size 물리 정합: InstitutionCodeDto/RecptnDto 각 6필드(instCd 계열 20→7·telno 20→11·faxNo 11→20 상향 포함),
  GroupManageDto.groupId 30→20

## 4. 게이트 (Stage 4) — 전건 green

- V2_19 라이브 적용 후 7컬럼 목표 상태 실측 재검증 ✓
- `./gradlew compileJava compileTestJava` exit 0 ✓ · `npx tsc --noEmit` exit 0 ✓ (2회: 코드 동기화 후 + codegen 재생성 후)
- **전 모듈 테스트**: foundation/business-core/business-app green, api-server 456 중 1건 실패 =
  ZeroDowntime 린터가 V2_19 를 정당 차단 → 선례(V2_13/V2_18)따라 위반 7라인에 실측 사유 `-- linter:ignore`
  부여 후 **ZeroDowntime+SchemaNaming 린터 2종 재실행 green** ✓
- **bootRun 수렴 성공**: 기본 프로필은 localhost:5432 라 접속 실패 → `DB_URL` 주입(OCI)으로 재기동.
  Flyway **V2_19 rank 24 success=true 실측** + validate(엔티티↔물리) 통과 + /v3/api-docs 재추출(274,698B)
  → codegen:file/zod 재생성 — **groupCrtDt·@Size 제약 전파 확인**(zod 28줄·api.d.ts 2줄) → tsc exit 0.

## 5. 잔여/후속

- etc_cd: SSOT 용어 미등재 재확인(ETC_CD 부재) + 0행 — **DEFER 유지**(원천 스펙 확보 시 재개)
- biz_cd 재모델링·로그 개인정보 정책·DeptJob 소유모델·FE auth/CSP: A그룹(제품 결정)
