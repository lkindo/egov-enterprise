# 20260717 — P1: 참조 무결성 FK 배치 확장 (V2_13·V2_14) + 부모 삭제 플로우 결속

> **등급**: L2 (DB 스키마 확장 + 다중 모듈 코드) · **승인**: 사용자 — "FK만 적용, RENAME 보류" (2026-07-17)
> **근거**: [db-standardization-assessment.md](../../docs/02-architecture/db-standardization-assessment.md) §4 P1
> **선행 검증**: 6개 관계군 병렬 안전성 감사(고아·타입·부모 삭제 플로우·기록 경로 전수 실측)
> — SAFE_NOW 23 / NEEDS_APP_FIX 10 / DEFER 2 (leader_schdl 2건: 관계 불성립·부모 도메인 사경화)

## 1. DB 산출물 (라이브 선적용 완료)

### V2_13__align_ref_column_types.sql (`-- linter:disable-file`)
- 타입 정렬 2건: `tb_schdl_info.atch_file_id`·`tb_user_info.group_id` varchar(30)→20 (둘 다 값 0건 실측, 무손실)
- 자가치유: `tb_dta_use_stats` 파일참조 가비지 2행 DELETE (백업: scratchpad `orphan-backup-dta_use_stats.json`)
- ⚠ **린터 하네스 결함 발견**: 라인 단위 `-- linter:ignore` 가 주석 선제거 구현 탓에 **동작 불가**
  (cleanContent 에서 매칭 후 ignore 마커를 찾지만 마커는 이미 제거됨) — V2_7 이 disable-file 을 쓴 실제 원인 추정. P4 린터 보강 항목에 추가.

### V2_14__add_referential_fks_batch2.sql
- **FK 33건** (존재검사 멱등 가드 + NOT VALID→VALIDATE, NO ACTION 일관):
  게시판 6(comment→item/master, scrap→item, dgstfn→item/master, use_info→master) ·
  첨부파일 13(atch_file_id→tb_file_master; dta 는 가비지 정리 후, schdl 은 타입 정렬 후) ·
  설문 4(artcl/rslt×2/rspdnt→info·qstn) · RBAC 4(authrt_role_map→authrt_info, user_info→authrt_group_info,
  com_dtl_cd→com_cd, **menu_info 자기참조 — 유일하게 DEFERRABLE INITIALLY DEFERRED**: 서브트리 일괄 삭제의
  트랜잭션 내 순서 자유) · 기타 6(sms_rcptn→sms_info, blog_user_map→blog_info/user_info(esntl),
  club_user_map→cmnty_info, **login_policy→user_info(user_id UNIQUE — loginId 키잉 고착, P2 시 재지정 필요)**,
  user_absn→user_info(esntl))
- **인덱스 37건**: 신규 FK 자식 26 + 기존 FK 자식 부재분 11(재실측 완결)

### 적용 검증 (라이브 실측)
| 항목 | 결과 |
|---|---|
| FK 총수 | 25 → **58** (+33), NOT VALID **0**, DEFERRABLE **1**(menu self-ref만) |
| 타입 | schdl_info.atch_file_id=20, user_info.group_id=20 |
| ix_ 인덱스 | 총 53 (37 신설 확인) |
| dta 가비지 | 0 |

### 보류 (사용자 결정)
- **fk_role_prgrm_map_* RENAME 2건 보류** — V2_11 파일도 구명칭으로 원복(파일↔라이브 정합 유지, 편측 정정 시 이중 FK 위험 차단). 재개 시: 라이브 RENAME + V2_11 4개 라인 치환을 **원자적으로** 시행(가드가 conname 기준).
- DEFER 2건: tb_leader_schdl.schdl_id(자체 PK — 후보 오판 실증), leader_id(부모 tb_leader_stts 사경화 — LeaderStatus 생성 API 부재, 제품 결정 필요)
- tb_user_log 사용자 삭제 정리(감사로그 삭제 vs 익명화)·NoteServiceImpl.deleteNote sent 분기 rcptn 정리(수신함 사본 삭제 여부) — 제품 결정 대기
- tb_club_* 는 앱 코드 전무한 데드 테이블 — 프레임워크 재사용성 관점에서 FK 유지보다 테이블 제거가 상위 대안일 수 있음(고아 테이블 10개 처분과 함께 P5)

## 2. 코드 산출물 (FK와 동일 릴리스 결속 — 부모 삭제 플로우)

| 서비스 | 변경 |
|---|---|
| SurveyService | deleteSurvey/deleteQuestion/deleteItem 연쇄 정리(rslt→iem→qstn→rspdnt→info; 4개 리포에 deleteBySrvyId 등 파생 추가) — **기존 V2_6 FK 로 이미 409 파손이던 기왕 부채 동시 해소** |
| AuthorManageService | deleteAuthor/deleteAuthors 에 authrt_role_map + menu_crt_dtl 선정리 |
| GroupManageService | deleteGroup/deleteGroups 에 사용자 group_id 참조 해제(UserRepository.clearGroupIdByGroupIdIn @Modifying) |
| MenuService | ① upMenuSn **0→null 정규화**(FE 가 루트를 0으로 전송 — FK 하 루트 생성/수정 파손 방지, 필수) ② 삭제 자식 가드(단건 countByUpMenuSn, 배치 countByUpMenuSnAndMenuSnNotIn — 집합 밖 자식 시 도메인 예외) |
| OnlinePollService | deletePoll/deletePollItem 에 투표결과 선정리(기존 FK 기왕 부채 해소) |
| LoginPolicyManageService | ① selectLoginPolicy 가 esntlId 를 반환하던 **키 혼용 결함 정정**(→userId) ② insert 실존 검증 |
| UserAbsenceServiceImpl | updateAbsence 실존 검증(esntl_id 규약의 코드 확정 겸함) |
| UserService | cleanupDependentsAndDelete 확장: login_policy(loginId 키)·user_absn(esntlId)·cmnty_user_map 정리 추가 |
| UserDeletionCleanupListener | blog_user_map 삭제 추가 |
| Schedule.java / User.java | @Column length 30→20 (V2_13 타입 정렬 동반) |

테스트: 영향 6개 테스트 클래스 목 보강 + 신규 회귀 3건(UserAbsn 실존검증 2·LoginPolicy 유령ID 차단 1)

## 3. 검증 로그 (Stage 4)

| 게이트 | 결과 |
|---|---|
| 라이브 FK/인덱스/타입 실측 | 위 표 — 전부 기대값 일치 |
| `compileJava compileTestJava` | exit 0 |
| 전체 테스트(`./gradlew test`, ZeroDowntime 린터 포함) | 본 문서 하단 갱신 참조 |

### 정직 보류
- 런타임 E2E 관통(설문/메뉴/권한 삭제 플로우) 미실시 — 차기 E2E 파이프라인에서 검증. 실패 시 본 파일 참조.
- V2_13·V2_14 flyway history 등재는 차기 bootRun 수렴(멱등 가드, V2_6~V2_12 와 동일 패턴).

## 4. 후속 운영자 주의
- **메뉴 자기참조 FK 는 DEFERRED** — 커밋 시점 검증. 메뉴 대량 조작 코드를 만들 때 같은 트랜잭션이면 순서 무관하나, 커밋 전 정합은 스스로 보장해야 함.
- 루트 메뉴 upMenuSn=0 관례는 서비스 레이어에서 null 로 정규화됨 — MenuRepositoryImpl 의 `upMenuSn.eq(0L)` 센티널 잔재는 데이터와 불일치(정리 후보).
- 부모 hard-delete 를 새로 만들면 반드시 자식 정리/재귀속을 동반할 것(V2_12·V2_14 결속 패턴).
