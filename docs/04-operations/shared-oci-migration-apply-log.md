# 공유 OCI 마이그레이션 적용 로그

> 상태: 운영 기록 — 공유 개발 OCI DB 에 Flyway 마이그레이션을 적용한 사실의 기록이다. 적용 권한을 주지 않으며, 무중단 Expand 릴리스 기록([migration-release-log.md](migration-release-log.md))과 섞지 않는다.

공유 OCI DB 에 마이그레이션을 적용할 때마다 이 표에 한 행을 남긴다. 적용 결과를 운영 결정(DEC)으로 쓰지 않는다([AGENTS.md 기록 기준](../../AGENTS.md#documentation-and-memory)). 현재 적용 버전은 이 표의 마지막 행이고, 표가 비어 있으면 아래 이전 기록의 마지막 링크다. 적용할 때 공용 메모리를 고치지 않는다.

## 기록 규칙

- 적용 전에 사용자 명시 승인을 받는다(DB 스키마·데이터 변경, [AGENTS.md 공통 작업 원칙](../../AGENTS.md#공통-작업-원칙)). 이 로그는 승인을 대신하지 않고, 받은 승인의 요지와 범위를 남긴다.
- 병합본(main 병합 커밋)에서 꺼낸 마이그레이션 폴더만 쓴다. 마이그레이션별 사전 읽기 질의·확인 질의·되돌리기는 [인가 전환 런북](authorization-cutover-runbook.md)처럼 그 마이그레이션을 설명하는 런북이 정본이며, 이 표에는 결과 요지만 적는다.
- 적용 기록만 담는 PR 을 따로 만들지 않는다. 행은 적용한 날의 다음 작업 PR 에 함께 싣고, 그날 다음 PR 이 없으면 하루치를 한 PR 로 묶는다(DEC-OPS-388 ⑥). 행이 아직 병합되지 않은 동안 현재 적용 버전은 db-bridge 의 `flyway_schema_history` 읽기 질의로 확인한다.
- 비밀값·접속 정보·개인정보·백업 파일 경로는 적지 않는다. 버전·행 수·검증한 migration 수처럼 비밀이 아닌 값만 적는다.

## 적용 기록

| 적용일(KST) | 마이그레이션 | 사용자 승인 요지 | 병합 PR | 사전 읽기·백업·validate | 확인 쿼리 요지 | 롤백 원본 |
|---|---|---|---|---|---|---|
| 2026-10-20 | V2_135(인터넷서비스안내 권한 배정 정리)·V2_136(스크랩 등록자·주소 유일 제약), 반복 시드 R__zz_seed_base_admin(SERVICE_* 8행 제외) | 2026-10-20 사용자 승인 "둘 다 지금 적용"(DEC-OPS-372 의 데이터 적용) | #943 (병합 c0ded166d) | 사전 읽기: 스키마 2.134, tb_intrn_svc 0행·/admin/system/isg 메뉴 0·SERVICE_* 배정 8(모두 ROLE_ADMIN·ROLE_SYSTEM 의 OPERATION, 예상 밖 0), 스크랩 1행·(등록자, 주소) 중복 0. 적용 직전 pg_dump 백업(표 데이터 127, 영향 표 4개 목차 확인). Flyway 12.4.0 migrate 3건 → validate 161 | SERVICE_* 배정 0·REMOVE 이력(migration:2.135) 8, 제약 uk_tb_bbs_scrap_frst_rgtr_id_scrap_url 1, 스크랩 1행 유지, tb_intrn_svc 0행 유지, 메뉴 75·활성 70 그대로 | 배정은 REMOVE 이력으로 되살린다([인가 전환 런북 V2_135](authorization-cutover-runbook.md)). 제약은 DROP CONSTRAINT 로 되돌린다. 전체는 적용 직전 백업 |
| 2026-10-22 | V2_137(콘텐츠 페이지 표 5개·표준 용어 6·도메인 1·관리 메뉴·CMS 기능 권한 기본 배정), 반복 시드 R__zz_seed_base_admin(CMS 8행 추가, 신규 base 블록이라 OCI 무변경) | 2026-10-22 사용자 승인 "승인할테니 1,2 번 진행"·"다시 허용할테니 시도해, 실제 운영하는 시스템이 아니야"(ADR-0039 의 데이터 적용) | #961 (병합 f370d969c) | 사전 읽기: 스키마 2.136, CMS 표·메뉴·용어·도메인 0, 상위 메뉴 9030000·정책 버전 행·ROLE_ADMIN·ROLE_SYSTEM 존재, 메뉴 75·활성 70, OPERATION 513·NAVIGATION 94. 적용 직전 pg_dump 백업(표 데이터 127, 영향 표 6개 목차 확인). info 대기 2건(V2_137·반복 시드) → Flyway 12.4.0 migrate 2건(validate 163) | 스키마 2.137, CMS 표 5·트리거 2·홈 소개 설정 1행(지정 없음), 메뉴 76·활성 71, OPERATION 521(CMS 4종 × 관리자·시스템 = 8)·NAVIGATION 95, 이력(migration:2.137) 9, 용어 6·도메인 1 | 새 표 5개·메뉴 1행·배정 9행(이력 migration:2.137 로 식별)·용어 6·도메인 1 을 지운다. 전체는 적용 직전 백업 |
| 2026-10-23 | V2_138(게시판 관리 메뉴 표시명 1행) | 2026-10-23 사용자 승인 "PR 병합마다 적용 (권장)"·"일괄 승인 (권장)"(ADR-0040 의 데이터 적용) | #963 (병합 40c3b9790) | 사전 읽기: 스키마 2.137, 경로 /admin/community/boards/master 메뉴 1행이 구 이름·새 이름 0, 메뉴 76. 적용 직전 pg_dump 백업(표 데이터 132, 메뉴 표 목차 확인). info 대기 1건 → Flyway 12.4.0 migrate 1건(validate 164) | 스키마 2.138, 구 이름 0·새 이름 1(수정자 SYSTEM), 메뉴 76·활성 71 그대로 | 그 메뉴 1행의 이름을 구 이름으로 되돌린다. 전체는 적용 직전 백업 |
| 2026-10-23 | V2_139(게시판 마스터 version 컬럼·CHECK, 게시판 변경 이력 표 tb_bbs_chg_hstry) | 2026-10-23 사용자 승인 "PR 병합마다 적용 (권장)"·"일괄 승인 (권장)"(DEC-OPS-379, ADR-0040 결정 9·10) | #964 (병합 622919ea5) | 사전 읽기: 스키마 2.138, 대기 1건(V2_139), 게시판 6·메뉴 76. 적용 직전 pg_dump 백업(표 데이터 132). Flyway 12.4.0 migrate 1건 → validate 165 | 스키마 2.139, tb_bbs_master.version NOT NULL DEFAULT 0(게시판 6 모두 0), tb_bbs_chg_hstry 생성(0행), CHECK 5(ck_tb_bbs_master_version·ck_tb_bbs_chg_hstry_*), 메뉴 76 그대로 | tb_bbs_chg_hstry 를 지우고 ck_tb_bbs_master_version·version 컬럼을 DROP 한다. 전체는 적용 직전 백업 |
| 2026-10-23 | V2_140(예약 게시 받기 설정)·V2_141(상단 고정 컬럼 5·CHECK 5)·V2_142(비밀글 정책·추천 받기 컬럼·CHECK 2), 표준 용어 6 | 2026-10-23 사용자 승인 "PR 병합마다 적용 (권장)"·"일괄 승인 (권장)"(DEC-OPS-379, ADR-0040 B1~B3) | #966 (병합 4fecd6994) | 사전 읽기: 스키마 2.139, info 대기 3건(V2_140~142, 반복 시드 변경 없음), 게시판 6·게시글 378·메뉴 76, 새 컬럼 0, 대상 용어 8개 중 기존 2(UPEND_FIX_YN·RCMDTN_USE_YN). 적용 직전 pg_dump 백업(표 데이터 133, 영향 표 5개 목차 확인). Flyway 12.4.0 migrate 3건 → validate 168 | 스키마 2.142, tb_bbs_master 새 컬럼 6·tb_bbs_item 2(타입·NOT NULL·기본값 확인), CHECK 8, 대상 용어 8(전체 13,245 — 저장소의 원본 스키마 실측과 같다), 게시판 6 모두 기본값·고정 글 0, 게시판 6·게시글 378·메뉴 76 그대로, BOARD_PIN 배정 0(그룹 배정은 앱 배포 뒤 별도 승인) | CHECK 8·컬럼 8을 DROP 하고 새로 넣은 용어 6행을 지운다. 전체는 적용 직전 백업 |
| 2026-10-26 | V2_143(콘텐츠 게시본 변경 금지 트리거 함수에 파기 트랜잭션의 삭제 예외, 함수 본문만 교체) | 2026-10-26 사용자 승인 "게시본 파기 경로(DDL)"·"병합 후 바로 적용"(ADR-0042 의 스키마 적용, 콘텐츠 운영 메뉴 재배치 DML 은 승인하지 않아 없음) | #978 (병합 b142cda0a) | 사전 읽기: 스키마 2.142, 함수에 파기 표시 분기 없음, 트리거 2개 사용 중, 콘텐츠 표 4개(페이지·게시본·첨부·게시본 첨부) 모두 0행. info 대기 1건(V2_143). 적용 직전 pg_dump 백업(표 데이터 133, 함수·콘텐츠 표 목차 확인). Flyway 12.4.0 migrate 1건 → validate 169 | 스키마 2.143, 함수에 파기 표시(nuri.cms_purge) 분기와 그 밖의 거부가 함께 있고 주석이 ADR-0042 를 가리킨다, 트리거 2개 그대로 사용, 콘텐츠 표 4개 0행 그대로 | V2_137 의 함수 본문(수정·삭제 모두 거부)과 주석을 다시 적용한다(데이터 변경 없음). 전체는 적용 직전 백업 |
| 2026-10-30 | V2_144(빈 부서 업무·팝업 표의 숫자 3개 컬럼을 NUMERIC으로 정합) | 완성된 적용 패킷의 숫자 3개에 한해 쓰기 중지·백업 → 병합·V2_144 → 새 앱 검증(임시 시험 데이터 생성·정리 포함)을 진행해도 되는지 물은 뒤 사용자 “진행해” 승인 | #1010 (병합 4975cf882) | 사전 읽기: PostgreSQL 17.9, 스키마 2.143, 양표 0행·숫자 3개 VARCHAR12 NULL/기본값 없음·사전 NUMERIC10/7·대상 의존성/다른 접속 0. 적용 직전 pg_dump 백업(표 데이터 99, 두 대상 표·Flyway 이력 목차 확인). 병합본 SQL 원본 바이트 대조. info 대기 V2_144 1건 → migrate 1건 → validate 170 | 스키마 2.144, 우선순위 NUMERIC(10,0)·팝업 두 크기 NUMERIC(7,0), NULL·기본값 없음·양표 0행. 새 앱 ddl-auto=validate 기동, 실제 JPA/서비스 저장·조회·NULL·버전 증가·DTO JSON 문자열·입력/인가 거부 통과. 시험 트랜잭션 롤백 뒤 두 표·임시 사용자 잔여 0. 대기 migration 0. 로그 새 컬럼 0 | [빈 표 역변경 후보 및 승인 경계](numeric-column-transition-proposal.md#환경별-사전-점검과-체인-중단). 실제 역변경은 두 표 0행·후속 versioned Flyway/waiver·별도 승인이 필요하며 자동 실행하지 않는다. 전체는 적용 직전 백업 |
| 2026-10-30 | V2_145(로그 밀리초 표준 메타·새 컬럼·양방향 동기화) → 500행 Sync → V2_146(전체 대사 후 Redirect 조건) | 숫자 3개 적용 완료 뒤 사용자 “로그2개 도 진행”. 승인한 처리소요밀리초 / PRCS_REQ_MSEC / 밀리초N19로 두 로그를 이행하며 BIGINT·밀리초·NULL·기존 API·구 컬럼을 보존하는 범위 | #1012 (병합 2ca2ff6ae) | 사전 읽기: PostgreSQL 17.9, 스키마 2.144, 시스템 71·웹 36,473행, 기존 BIGINT NULL/기본값 없음, 후보 메타·새 컬럼·사용자 트리거·복제·다른 접속 0. pg_dump 백업(표 데이터 133, public 99, 대상·메타·이력 목차 확인), public 격리 복원·기존 행/메타 해시 일치. 병합본으로 실제 Node CLI·새 앱 리허설 통과. required CI 6/6 후 main SQL 원본 바이트 대조. V2_145 1건 → 73배치·36,544행 Sync → V2_146 1건 → validate 172 | 스키마 2.146, 새 BIGINT NULL/기본값 없음 2개·메타 3행·활성 트리거/함수 각 2개. 기존 71·36,473행과 모든 기존 열·다른 메타 해시 보존, NULL 포함 불일치·잔여 0. 실제 새 앱 validate 기동·새 컬럼 단독 JPA 쓰기·기존 DTO 문자열/숫자·구 writer·NULL·64비트 극값 검증 통과. 시험 트랜잭션 롤백 뒤 원래 행 수·해시 유지, 대기 migration·다른 접속 0. 구 컬럼은 유지 | 구 앱 복귀는 구 컬럼·양방향 동기화·대사를 확인한다. 스키마 철회와 구 컬럼 제거는 [복구·후속 Contract 경계](log-duration-transition-proposal.md#복구와-후속-contract)를 따르며 자동 실행하지 않는다. 전체는 적용 직전 백업 |

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
