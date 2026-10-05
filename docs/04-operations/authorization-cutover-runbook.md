# 권한 모델 배포 전환 절차

이 절차는 `tb_authrt_info`와 새 사용자 배정·유형별 권한·감사 이력 3개 테이블로 전환할 때 적용한다. **메인 병합은 OCI 배포가 아니다.** V2_98·V2_99만 적용한 상태에서는 새 앱을 시작하면 안 된다. 구 사용자·메뉴 배정 FK가 새 앱의 삭제와 충돌하므로 Contract와 새 앱 시작을 같은 점검 창에서 순서대로 수행한다.

## 사전 준비와 증거

1. 배포 승인에 환경·DB·애플리케이션 버전·권한 카탈로그 SHA-256·점검 창·담당자를 기록한다. 승인된 범위 밖의 OCI SQL은 실행하지 않는다.
2. 구 앱, 배치, ETL, 관리 스크립트, 직접 SQL 등 권한·사용자·메뉴·프로그램에 쓰는 경로를 확인하고 모두 중지한다. 차단 이후 새 연결도 쓰지 못하도록 운영 측에서 통제하고, 연결·배치 상태 증거를 남긴다. SQL의 잠금은 구 writer의 영구 종료를 증명하지 않는다.
3. 중지한 시점의 전체 DB 백업과 암호화된 복구 자산을 확보하고 격리 DB 복원을 검증한다. 구 6개 테이블만의 백업으로 전체 서비스 복구를 보장할 수 없다. 백업의 SHA-256을 기록하며 경로·개인정보·접속 비밀은 권한 감사 내용에 넣지 않는다.
4. 기존 사용자별 실효 API 권한과 새 카탈로그 기본 부여의 허용·거절 결과를 비교한다. 기본 그룹, 구 ROLE_ADMIN의 메뉴 84개, 기존 전체 메뉴 배정 111개는 과거 실측 기준이며 실행 당일 데이터를 다시 집계한다. 롤 15개 중 12개의 비연결 표시 정의가 사라져도 기능 권한이 확대되지 않는지 검증한다. 프로그램 URL과 역할 매핑 변경도 확인한다.
5. 증거 묶음에는 승인, writer 종료, 복원 검증, 실효 권한 비교, 감사 보존, 적용·복구 절차를 포함하고 SHA-256을 계산한다. 검증되지 않은 내용을 해시 문자열로 대신 승인하지 않는다.

## Expand → 검증 → Contract → 새 앱

1. 중지 상태에서 배포 도구의 target을 `2.99`로 고정해 Flyway V2_98·V2_99를 적용한다. V2_100은 Contract 이후 메뉴를 변경하므로 이 단계에서 latest로 실행하지 않는다. V2_98은 기존 배정과 감사 필드를 복제하고 V2_99는 검토한 OPERATION 부여, 구 정책 4개 테이블의 원본, 연결 프로그램 17개의 이름·URL 스냅샷을 기록한다. 프로그램 17개와 ADMIN/SYSTEM 배정 34개가 검토한 허용집합과 다르면 중단한다. 두 마이그레이션은 구 테이블을 제거하지 않는다.
2. 새 앱을 기동하지 않고 사용자·메뉴 배정, 카탈로그 부여, 원본 행 스냅샷을 다시 비교한다. Expand 뒤 구 writer가 값을 바꿨다면 아래 SQL은 중단한다. 승인된 재동기화 마이그레이션을 마련해 복제·감사를 보완한 뒤 다시 검증한다. 이 경우 V2 파일을 수정하거나 guard를 우회하지 않는다.
3. 같은 PostgreSQL 연결에서 아래 세션 설정에 실제 검증한 해시를 바인딩하고 [authorization-contract.sql](../../api-server/src/main/resources/db/cutover/authorization-contract.sql)을 실행한다. 매개변수 바인딩을 사용하고 셸에 비밀을 넣지 않는다.

   | 세션 설정 | 값 |
   |---|---|
   | `app.authorization_cutover_evidence` | 승인·중지·복원·권한 비교 증거 묶음 SHA-256 |
   | `app.authorization_backup_sha256` | 복원을 검증한 백업의 SHA-256 |
   | `app.authorization_catalog_version` | 해당 배포의 frozen 카탈로그 SHA-256 |

   SQL은 단일 원자적 문장이다. V2_98·V2_99 성공, 신규 운영 변경 없음, 배정의 양방향 일치, 원본 스냅샷, OPERATION 감사 일치를 검사한다. 필요한 테이블 잠금을 즉시 얻지 못하거나 외부 FK가 남아 있으면 전체 실패한다. `CASCADE`는 사용하지 않는다. 재실행은 이미 제거된 테이블에서 실패하므로 성공 여부를 먼저 확인한다.
4. 구 테이블 6개 부재, 신규 FK 3개 유효, Contract 감사 1건과 카탈로그 버전을 확인한다. 현재 조사 대상 10개에서 구 6개를 제거하고 새 3개를 추가하므로 **대상 집합은 7개**, 권한 운영 핵심·감사는 **4개**가 된다. 메뉴·프로그램·분류 테이블과 사용자 등 지원 테이블은 각각 유지한다.
5. [ADR-0017](../02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md)이 승인된 전체 제품에서는 Contract 완료 후 Flyway target을 해제하고 V2_100 이후를 적용한다. 메뉴 입력·NAV 동등성 guard가 실패하면 원인을 검토하고 재실행한다. V2_98·V2_99의 기존 스냅샷을 수정하거나 이력을 repair해 통과시키지 않는다.
6. 새 앱을 기동한다. 앱의 Flyway 후·JPA 초기화 전 배리어가 Contract 미완료를 거절해야 한다. 로그인·복수 그룹 합집합·ADMIN 메뉴 회수·403·구 관리 API 410·메뉴와 사용자 삭제·감사 이력을 smoke 검증한 뒤 트래픽을 재개한다.

## 실패와 복구

마지막 활성 권한관리자 보호는 운영자의 그룹 배정·기능 권한 회수·사용자 상태 변경·사용자 삭제와 로그인 정책의 접속 제한(`lmt_yn='Y'`)을 대상으로 한다. 접속 제한된 계정은 관리자 수에서 빠지고, 로그인 정책 등록·수정·삭제도 보호 계정 가드를 거친다([DEC-OPS-213](../../.agent/memory/decisions.md)). IP·허용 시간대 제한은 그 조건에서 로그인할 수 있어 관리자 수를 줄이지 않는다. 비밀번호 연속 실패에 따른 일시 계정 잠금은 별도의 로그인 방어이며 이 보호 조건으로 우회하지 않는다. 자동 잠금 해제 시간과 비상 접근 복구 절차는 운영 로그인 정책에 따라 확인한다.

관리 가능한 계정은 활성·잠금 해제 상태이며 복수 그룹의 합집합에 `AUTHRT_READ`, `AUTHRT_GRANT`, `AUTHRT_ASSIGN`을 모두 가진 계정이다. 조회 권한도 있어야 변경에 필요한 최신 전체 스냅샷과 버전을 얻을 수 있으므로, 마지막 관리자의 조회 권한만 회수하는 요청도 거부한다.

- Contract 실행 중 실패하면 6개 DROP과 Contract 감사가 함께 롤백된다. 원인을 해결하기 전 새 앱을 시작하지 않는다.
- Contract 성공 후 새 앱 쓰기 전이라면 승인된 전체 복원 절차로 DB와 구 앱을 함께 되돌릴 수 있다. 구 테이블만 재생성하거나 Flyway 이력만 삭제하는 복구는 금지한다.
- 새 앱에서 복수 그룹이나 개별 권한 변경을 받기 시작하면 구 단일 그룹·URL 롤 모델로 무손실 축약할 수 없다. 감사 delta는 분석 증거이며 자동 역이관 기능이 아니다. 이 단계의 원칙은 새 모델에서 전진 복구이며, 구 버전 복구가 필요하면 업무 데이터까지 포함한 별도 재조정·다운타임 승인을 받아야 한다.
- 로컬 schema 검증은 같은 Contract SQL을 명시적으로 리허설한 다음 Hibernate validate를 수행한다. 이 로컬 증거는 OCI의 writer 종료·백업·배포 완료 증거를 대신하지 않는다.

## 격리 검증과 새 프로젝트 초기화

`schemaValidationTest`의 PostgreSQL fixture는 `tc` 프로필에서 명시적으로 import한 `AuthorizationSchemaRehearsalTestConfiguration`을 통해 V2_99까지 적용하고, 같은 Contract SQL을 실행한 다음 latest까지 진행한다. 일반 테스트·운영 컴포넌트 스캔에는 이 fixture가 포함되지 않는다.

CI E2E·부하·시각 기준선·ZAP과 동일한 로컬 Docker 리허설은 `docker compose -f docker-compose.yml -f docker-compose.authz-e2e.yml up -d --build`로 실행한다. 오버레이는 별도 볼륨과 `authz_e2e` DB를 사용한다. `IsolatedAuthorizationRehearsalConfig`는 정확한 `e2e` 단독 프로필, 로컬 또는 Compose DB 호스트, `authz_e2e` 이름 규칙, 명시적인 disposable 확인 값, 실제 연결 대상을 모두 검증한 후에만 Contract를 리허설한다. `prod` 동시 프로필이나 일반 DB 이름은 실패한다. 일반 Compose와 운영 배포에는 이 opt-in이 없다. 리허설 해시는 폐기 가능한 fixture 표식이며 운영 백업 증거로 제출할 수 없다.

Flyway는 모든 versioned SQL 뒤에 repeatable을 실행한다. 빈 DB의 초기 관리자와 dev 전용 계정이 V2_98 뒤에 생성될 때는 bootstrap이 구·신 membership과 원본 감사 행을 같은 트랜잭션으로 만든다. Contract는 이 두 알려진 bootstrap 원본과 V2_98 원본을 함께 비교한다. 기존 계정의 구·신 배정 차이를 자동 보정하거나 운영자 회수를 되돌리지 않는다.

재사용 base 생성기는 직접 만든 `test_reusable_base_*` DB에서 V2_99까지와 초기 데이터를 적용하고, 실제 Contract를 리허설한 뒤 후속 versioned SQL을 적용한다. 검증된 최종 스키마만 덤프한다. 축약 base는 전체 제품 메뉴를 이식하지 않고 10개 기반 메뉴(중복 롤 제외, 그룹별 메뉴 현황 유지)를 초기화한다. SQL 실행 성공을 기록한 임시 리허설 원장은 덤프 전에 제거하며 실제 Flyway 이력이나 운영 배포 증거로 취급하지 않는다. 새 빈 base에는 그룹·명시 OPERATION/NAVIGATION·초기 회원 배정과 감사가 초기화된다. 빈 base의 repeatable bootstrap 자체는 구 테이블을 제거하지 않으며, 권한 변경 이력이 있는 DB에서는 초기 권한을 재부여하지 않는다. `sq_authrt_chg_hstry_sn`은 감사 테이블에 소유된 identity 시퀀스이므로 생성기의 standalone 시퀀스 목록에 중복 등록하지 않는다.

## 프로그램 목록 퇴역(V2_124)

[V2_124](../../api-server/src/main/resources/db/migration/V2_124__retire_program_permission_grants.sql)는 퇴역한 기능 권한 `PROGRAM_CREATE`·`PROGRAM_READ`·`PROGRAM_UPDATE`·`PROGRAM_DELETE`의 배정을 지우고, 지운 행마다 `GROUP_GRANT`/`REMOVE` 이력을 남긴다. 프로그램 원장(`tb_prgrm_lst`)과 메뉴의 `prgrm_file_nm`·외래 키는 남는다(지우는 일은 다음 릴리스의 별도 승인). 앱과 V2_124는 함께 배포한다. 새 권한 원장으로 기동한 앱에 `PROGRAM_*` 배정이 남아 있으면 권한 스냅샷이 원장에 없는 코드를 만나 그 그룹 구성원의 인증을 fail-closed로 막는다.

**적용 전 읽기 확인.** 병합본에서 꺼낸 마이그레이션 폴더만 쓴다. 다음 두 질의를 읽기로 실행한다. 첫 질의의 행 수만큼 이력이 남고, 둘째 질의는 0행이어야 한다.

```sql
SELECT authrt_cd, authrt_grnt_cd FROM tb_authrt_grnt_map
 WHERE authrt_type_cd = 'OPERATION'
   AND authrt_grnt_cd IN ('PROGRAM_CREATE', 'PROGRAM_DELETE', 'PROGRAM_READ', 'PROGRAM_UPDATE');

SELECT menu.menu_sn, menu.menu_nm, menu.prgrm_file_nm, program.url
  FROM tb_menu_info menu
  JOIN tb_prgrm_lst program ON program.prgrm_file_nm = menu.prgrm_file_nm
 WHERE menu.use_yn = 'Y'
   AND nullif(btrim(menu.modern_route), '') IS NULL
   AND NOT EXISTS (SELECT 1 FROM tb_menu_info child WHERE child.up_menu_sn = menu.menu_sn)
   AND menu.prgrm_file_nm !~ '(BoardManage|BBSMaster|CmmCode|GroupList|RoleList|AuthorGroup|QustnrManage|QustnrTmplat|AdbkList|FaqList|CnsltList|MainImage|FileMng|ProgramList|MenuCreat|MenuList)'
   AND program.url ~ '(/uss/olh/qna/|/uss/olh/faq/|/sec/gmt/|/sec/ram/|/sym/ccm/|/uss/olp/qtm/|/uss/olp/qmc/)';
```

**가드가 멈췄을 때.** 오류 `Leaf menus without modern_route got their route only from a retired program URL: <menu_sn>:<prgrm_file_nm>, …`가 나면 V2_124 전체가 롤백되어 아무것도 바뀌지 않는다. 적힌 메뉴는 종전 앱이 기동할 때 원장 URL의 레거시 접두로 화면 경로를 채우던 사용 중 말단 메뉴다. 새 앱은 원장을 읽지 않으므로 그 경로를 채울 수 없다. 메뉴마다 화면 관리의 화면 목록에 있는 경로를 정해 `modern_route`에 넣고 다시 배포한다. 구 앱이 떠 있으면 메뉴 관리 화면에서, 아니면 승인된 SQL로 넣는다. 가드를 우회하거나 V2_124를 고치지 않는다.

**이관 도구로 메뉴를 넣을 때.** `modern_route`를 채우고 `prgrm_file_nm`은 비운다. 이관 대상 카탈로그(`db_columns.json`)에는 `tb_prgrm_lst`가 아직 남아 있다. 그러나 앱은 그 원장을 읽지 않고, 위 가드는 V2_124를 적용할 때 한 번만 돈다.

**롤백 뒤 다시 배포할 때.** 구 버전 앱으로 되돌리면 그 앱은 화면 관리 진입에 `PROGRAM_READ`를 요구한다. 그동안 권한 관리 화면에서 `PROGRAM_*`가 다시 배정될 수 있다. V2_124는 이미 적용되어 새 버전을 다시 배포해도 다시 돌지 않는다. 재배포 전에 위 첫 질의로 확인하고, 행이 있으면 아래를 실행한다. `<CATALOG_VERSION>`은 새 앱의 `PermissionCodes.CATALOG_VERSION`이다.

```sql
BEGIN;
LOCK TABLE tb_authrt_grnt_map, tb_authrt_chg_hstry IN SHARE ROW EXCLUSIVE MODE;
WITH removed AS (
    DELETE FROM tb_authrt_grnt_map
     WHERE authrt_type_cd = 'OPERATION'
       AND authrt_grnt_cd IN ('PROGRAM_CREATE', 'PROGRAM_DELETE', 'PROGRAM_READ', 'PROGRAM_UPDATE')
    RETURNING authrt_cd, authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'ops:<YYYY-MM-DD>:program-grant-recleanup', '<CATALOG_VERSION>', 'GROUP_GRANT', 'REMOVE', authrt_cd,
       'OPERATION', authrt_grnt_cd, 'grant', authrt_grnt_cd, NULL,
       '롤백 뒤 다시 들어온 퇴역 프로그램 권한 재삭제', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed;
COMMIT;
```

## 마이페이지 관리 메뉴 퇴역(V2_125)

[V2_125](../../api-server/src/main/resources/db/migration/V2_125__retire_my_page_menu.sql)는 V2_88이 꺼 둔 메뉴 `2030100`(마이페이지관리, 경로 `/admin/workspace/my-page`) 행을 지운다(DEC-OPS-229). 그 화면은 2026-09-08 결정(DEC-OPS-070)으로 걷혀 없다. 함께 다음을 지운다.

- 모든 그룹의 그 메뉴 배정(`NAVIGATION`): 지운 배정마다 `GROUP_GRANT`/`REMOVE` 이력을 남긴다.
- 그 메뉴의 즐겨찾기(`tb_bkmk_menu_mng_rslt`): 사용하지 않는 메뉴라 앱으로는 만들 수 없어 보통 없다. 이력은 남지 않는다.

빈 테이블 `tb_indv_pg_conts`는 남긴다(스키마 변경은 별도 승인).

지우는 행은 다음 세 조건을 모두 갖춘 행뿐이다. 하나라도 다르면 도입 기관이 그 행을 다시 켜거나 다른 화면으로 바꿔 쓰는 것으로 보고 행·배정·즐겨찾기를 모두 그대로 둔다. 멈추지 않고 건너뛴다.

- 경로가 정확히 `/admin/workspace/my-page`다.
- `use_yn = 'N'`이다.
- 하위 메뉴가 없다.

행이 이미 없으면 아무것도 하지 않는다. 앱 코드는 바뀌지 않으므로 배포 순서 제약은 없다. 다만 앱이 떠 있는 동안 적용하면 메뉴 구조 버전과 배정이 지워진 그룹의 버전이 바뀐다(DEC-OPS-208). 그때 열려 있던 메뉴 관리 초안이나 그 그룹의 권한 편집은 저장할 때 버전 충돌(409)로 거부될 수 있다. 다시 불러온 뒤 저장한다.

**적용 전 읽기 확인.** 병합본에서 꺼낸 마이그레이션 폴더만 쓴다. 첫 질의가 위 세 조건을 갖춘 한 행이면 지워지고, 둘째 질의의 행 수만큼 이력이 남는다. 셋째 질의는 지워질 즐겨찾기다. 마지막 두 질의는 지워질 메뉴 행과 즐겨찾기의 모든 열을 남긴다. 그 출력을 적용 기록(별도 DEC)에 붙인다 — 백업 다음으로 되살릴 때 쓰는 원본이다.

```sql
SELECT menu.menu_sn, menu.up_menu_sn, menu.menu_nm, menu.modern_route, menu.use_yn, menu.del_yn,
       (SELECT count(*) FROM tb_menu_info child WHERE child.up_menu_sn = menu.menu_sn) AS child_count
  FROM tb_menu_info menu
 WHERE menu.menu_sn = 2030100;

SELECT authrt_cd, authrt_type_cd, authrt_grnt_cd FROM tb_authrt_grnt_map
 WHERE authrt_type_cd = 'NAVIGATION' AND authrt_grnt_cd = '2030100';

SELECT menu_id, user_id FROM tb_bkmk_menu_mng_rslt WHERE menu_id = 2030100;

SELECT to_jsonb(menu) FROM tb_menu_info menu WHERE menu.menu_sn = 2030100;

SELECT to_jsonb(bookmark) FROM tb_bkmk_menu_mng_rslt bookmark WHERE bookmark.menu_id = 2030100;
```

**적용 후 읽기 확인.** 위 세 질의가 모두 0행이고, 다음 질의가 적용 전 둘째 질의의 행 수와 같아야 한다. 메뉴 전체 수는 하나 줄고 활성 메뉴 수는 그대로다.

건너뛰어도 Flyway는 성공으로만 기록한다. 첫 질의의 행이 남아 있으면 가드가 건너뛴 것이다. 그 행의 경로·`use_yn`·하위 수를 적용 전 출력과 대조해 세 조건 중 무엇이 달랐는지 확인한다. 그때 배정·즐겨찾기가 그대로이고 `migration:2.125` 이력이 0행인 것이 정상이다. 조건이 모두 맞는데 행이 남았으면 이상이므로 멈추고 조사한다.

```sql
SELECT authrt_cd, authrt_grnt_cd, chg_rsn FROM tb_authrt_chg_hstry
 WHERE dmnd_idntfr = 'migration:2.125' AND chg_type_cd = 'REMOVE';

SELECT count(*) AS menus, count(*) FILTER (WHERE use_yn = 'Y') AS active_menus FROM tb_menu_info;
```

**되돌릴 때.** 메뉴 행과 즐겨찾기에는 감사 표가 없다. 원본은 적용 직전 pg_dump 백업이고, 그다음은 적용 기록에 붙인 `to_jsonb` 출력이다.

- 메뉴 행: 백업이나 기록한 출력이 둘 다 없으면 새 base의 값으로만 다시 만들 수 있다 — `menu_sn 2030100`, `up_menu_sn 2030000`, `menu_ordr 5`, `menu_nm '마이페이지관리'`, `menu_expln ''`, `modern_route '/admin/workspace/my-page'`, `use_yn 'N'`, `del_yn 'N'`. 이 값은 이 변경 전 리비전의 [메뉴 snapshot](https://github.com/lkindo/egov-enterprise/blob/119b12a08/config/project-composer-menus.json)(새 DB에 마이그레이션을 돌려 만든 값)이며 이 변경이 그 항목을 지웠다. 대상 DB의 원래 행과 다를 수 있다 — `route_mdfcn_yn`·`rel_img_nm`·`rel_img_path`와 감사 열(등록·수정자와 일시)은 담지 않고, 메뉴 관리에서 바꾼 순서·설명도 알 수 없다.
- 즐겨찾기: 백업이나 기록한 출력 없이는 되살릴 수 없다.
- 배정: `migration:2.125` 이력의 `authrt_cd`와 `authrt_type_cd` `'NAVIGATION'`, `authrt_grnt_cd`로 넣고, 그 배정마다 `GROUP_GRANT`/`ADD` 이력을 남긴다.

V2_125는 이미 적용되었으므로 되살린 행은 다시 지워지지 않는다.

## 2026-09-11 OCI 메뉴 재편 적용 결과

사용자가 승인한 [ADR-0017](../02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md)의 메뉴 재편을 2026-09-11 13:09 KST에 적용했다. 실행 전 OCI에서 V2_99, 구 6개 테이블 부재와 기존 Contract 감사 1건을 확인했다. 이번 실행은 이미 완료된 Contract나 계정 활성화를 반복하지 않았다.

실측한 기존 메뉴·배정, SQL·카탈로그·실행 라이브러리 해시를 결속하고, 격리 PostgreSQL 17에서 동일 Flyway 실행을 의도적으로 실패시켜 테이블 데이터와 Flyway 이력이 모두 롤백되는 것을 먼저 확인했다. OCI에는 [V2_100](../../api-server/src/main/resources/db/migration/V2_100__reorganize_menu_information_architecture.sql)(checksum `633945878`)과 변경된 base repeatable(checksum `1544001697`)만 한 트랜잭션으로 적용했다. 잠금은 NOWAIT, 잠금 대기 제한은 5초, 문장 제한은 60초였다.

| 확인 항목 | 적용 전 | 커밋 후 독립 조회 |
|---|---:|---:|
| 전체 / 활성 메뉴 | 84 / 79 | 77 / 71 |
| 최상위 영역 / 최대 깊이 | 3 / 4 | 4 / 3 |
| NAVIGATION 배정 | 111 | 102 |
| OPERATION 배정 | 566 | 566 |
| 사용자 그룹 배정 / 그룹 | 7 / 4 | 7 / 4 |
| 감사 이력 | 756 | 773 |
| Flyway version | 2.99 | 2.100 |

최상위 영역은 **나의 업무 / 소통·지식 / 참여 / 관리 센터**다. NAVIGATION 추가 4건·삭제 13건은 `dmnd_idntfr='migration:2.100'`으로 기록됐다. 기존 감사 행, OPERATION, 사용자·그룹 배정, 프로그램과 변경 대상 외 75개 테이블의 내용 해시가 보존됐으며, Flyway validation과 별도 read-only 조회가 통과했다. 네 그룹의 모든 조합 16개에서 승인된 중복 통합·예제 숨김을 반영한 도착 화면 집합이 동일한지도 SQL이 검사했다.

검증 증거 묶음 SHA-256은 `91ffd81d387447a942735b815fc9145785003d3d0e874231cad499def827c2e1`이다. 접속 비밀·계정 식별자·원시 데이터를 이 문서에 복제하지 않는다. 소스 기준으로 PostgreSQL schema 검증 59개, 메뉴·권한 브라우저 검증 48개와 프론트 빌드·타입 검사가 통과했다. **이는 OCI DB 적용 증거다. 운영 앱 배포와 외부 구 writer의 영구 종료, 운영 사용자 세션 검증은 별도의 배포 증거가 필요하며 이 결과만으로 완료를 주장하지 않는다.**
