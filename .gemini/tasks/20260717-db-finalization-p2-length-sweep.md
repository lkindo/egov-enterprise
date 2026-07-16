# 20260717 — DB 마무리: P2 키 규약 + 길이 분열 스윕(V2_18) + 후미 A2~A5

> **등급**: L2 · **승인**: 사용자 — "승인할테니 db마무리해" + RENAME 보류 해제·eng_name DROP·V2_18 개별 확인(AskUserQuestion ×3)
> **선행**: 3개 컬럼군 병렬 측정 워크플로우(전 컬럼 데이터 max 실측 + V2_17 SSOT 도메인 체인 조회)

## 1. P2 — 사용자 참조 키 규약 (권장안 승인 이행)

- **[user-reference-key-policy.md](../../docs/02-architecture/user-reference-key-policy.md) 제정**: 3계층 규약
  (①소유·참조=esntl_id+FK 의무 ②행위자 표기=loginId 스냅샷·FK 금지 ③인증 산출물=조회 시점 키).
  전면 단일화 대신 계층 명문화 — 감사컬럼·로그의 loginId는 의도된 설계로 인정.
- **rfsh_tk 단일화**: 발급(login)·재발급(reissue)·로그아웃(auth.getName()=esntlId) 전 경로가 이미 esntlId 키잉임을
  실측 확인 → 레거시 loginId 키 행 1건(webmaster, 구버전 잔재)만 V2_18 로 정리. UserService 이중 키 삭제 → 단일화.
- **User.changeUserId 제거** (loginId 불변 선언 — 프로덕션 호출 0, 테스트 1곳 빌더 직접 구성으로 전환).
- 로그 loginId 잔존(익명화 vs 보존)은 개인정보 정책으로 **제품 결정 대기** 유지.

## 2. A2 — fk_role_prgrm_map_* RENAME (보류 해제 후 원자 시행)
라이브 RENAME 2건 + V2_11 파일 4라인 치환 + SchemaNamingLinter 화이트리스트 제거 — 3자 정합 완료.
헌법 제6조 비표준 FK명 **최후 2건 해소** (fk_tb_role_prgrm_map_tb_role_info / _tb_prgrm_lst 실측 확인).

## 3. A1 — 길이 분열 스윕 (V2_18__normalize_column_lengths_finalize.sql, 라이브 적용·검증 완료)

- **ALTER 56건** (전건 데이터 max 실측 무손실): varchar(30) 클러스터(9) · inst_cd 계열 코드C7(8) ·
  authrt/role 참조그룹 20 원자정합(6 — **menu_crt_dtl(12)이 피참조 PK 실데이터 17자를 수용 못하던 잠재 파손 결함 해소**) ·
  ymd→varchar(8) USING 정규화(7) · _dt→timestamp(2) · fax/telno/eml/pswd/menu_nm/link_url/ans_cn/sort_ordr 등 수렴(24)
- **KEEP 10건**(이미 정합/무손실 원칙상 유지 — role_crt_ymd·group_crt_ymd 는 COMMENT 이탈 승인) ·
  **DEFER 2건**(biz_cd — DTO가 '행사명칭'을 코드 컬럼에 저장하는 오용, 재모델링 필요 / etc_cd — 원천 스펙 미확인)
- 부수: uk_tb_onln_mnl_info 유니크 인덱스 **제약 승격 + 표준 개명**(online→onln 드리프트 정정),
  meta_standard_terms.**eng_name DROP**(정보량 0 실측·원본 부재)
- **검증**: 동일 컬럼명 cross-length **분열 그룹 0** · rfsh 전행 esntl 키 · eng_name 부재 · uk 승격 확인

### 엔티티/DTO/서비스 동기화 (~35파일, 2에이전트 팬아웃 + 메인 재검증)
- @Column length 전량 물리 정합 + sortOrdr Integer→Long 3계열(Banner/InstitutionCode/DeptJobBox — DTO·테스트 리터럴 포함)
- **잠재 버그 2건 해소**: ① CnsltManage.updateAnswer 가 mngYmd 에 29자 ISO 문자열 기록(varchar(20)도 초과 — value-too-long 파손) → yyyyMMdd 8자 ② MemoReport 의 ISO 'T' 포맷이 자체 validateDateTimeFormat 을 불통과(호출 즉시 예외) → String→LocalDateTime 전환으로 원천 해소
- EventInfoService·BoardService ymd 저장 경로 normalizeYmd(하이픈 strip) — 재유입 봉쇄
- ⚠ **API 계약 변경**: MemoReportDto 2필드 String→LocalDateTime(ISO-8601 직렬화), EventInfoDto/UserDto/AuthorManageDto/RoleManageDto @Size 축소 → **codegen(api-docs→file+zod) 재생성 필요** — bootRun 수렴 기동과 함께 처리

## 4. A5 — dev/local ddl-auto=validate 복원 + 수렴 기동 ✅
application-dev/local.yml validate 복원. **bootRun 수렴 성공(3차)**: Flyway V2_6~V2_18 전량 history 등재
(success=true 실측) + validate(엔티티↔물리) 통과 + api-docs(204 paths) 추출 → codegen:file/zod 재생성 —
**생성물 diff 0 = FE 계약 영향 없음 실증** → `npx tsc --noEmit` exit 0.

### 수렴 기동이 잡아낸 결함 2건 (즉시 수정 — 이 검증의 존재 이유)
1. **시퀀싱 결함**: V2_14가 FK를 거는 tb_club_user_map 을 V2_16이 DROP — 라이브 선적용 순서로는 무사했지만
   Flyway 재생 경로에서 파손 → V2_14에 `to_regclass` 테이블 존재 가드 3지점 추가 (fresh DB 는 생성→FK→DROP 순 정상).
2. **멱등성 결함**: 재실행 시 USING 절 리터럴/정규식이 이미 변환된 타입과 충돌(V2_16 sys_log `NULLIF(…,'')`→bigint,
   V2_18 memo `~` regex→timestamp) → 타입 검사 DO 가드로 정정.
   **교훈: out-of-band 선적용 운용에서는 "이미 적용된 DB에서의 재실행"이 fresh 경로와 별개의 멱등성 축 — USING 절은 원타입 전제라 타입 가드 필수.**

## 5. 게이트 (Stage 4)
- 라이브 재검증: 분열 그룹 0 등 상기 전부 ✓
- compileJava/compileTestJava exit 0 (48파일 diff)
- 전체 테스트/린터: 실행 결과 커밋 메시지 참조

### DEFER/후속 등재
- biz_cd 재모델링(행사명칭 분리) · etc_cd 원천 스펙 · inst_cycl numeric 전환 · Faq.qstnCn 등 TEXT 잔존 3건 ·
  InstitutionCodeDto @Size 조임(7/11) · group_crt_dt 리네임 후보 · reprt_nm→rptp_nm 컬럼명
- E2E 가비지(ROLE_E2E_ 168행·URL_E2E_ 243행)는 DB 헌법 8조2항 예외로 정리 가능 — 별도 세션
