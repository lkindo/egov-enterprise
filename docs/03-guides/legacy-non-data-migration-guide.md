# 레거시 비데이터 객체 이관 가이드

> **목적**: `migration-tool` 이 옮기지 않는 권한·메뉴·첨부 실물과 그 밖의 비데이터 객체(시퀀스·공통코드·암호 컬럼·예약 작업)를
> 기관 이관 때 어떻게 옮기고 확인하는지 정한다([ADR-0029](../02-architecture/decisions/ADR-0029-legacy-standardization-migration.md) A2·A3).
> 도구의 계약은 [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md), 실패·재개는 [복구 런북](../04-operations/migration-recovery-runbook.md)이 정본이다.
> 이 문서는 절차 안내이며 기관 운영 승인이나 실행 증거가 아니다.

## 1. 경계

도구는 `mapping.yml` 에 선언한 **테이블 데이터**를 PostgreSQL 표준 스키마에 INSERT 한다. 발견한 view·routine·trigger·grant 는 plan 에
분류만 하고 만들지 않는다([ADR-0008](../02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md)).
그 밖의 객체는 아래 표대로 다룬다.

| 대상 | 도구가 하는 일 | 도구가 하지 않는 일 | 절 |
|---|---|---|---|
| 권한 그룹·배정 | 없음(막지도 않는다) | 레거시 역할→그룹 대응, 배정, 변경 이력, 마지막 관리자 보호 | §3 |
| 메뉴 | 없음 | 메뉴 구조·라우트 결정, 레거시 URL 리다이렉트 | §4 |
| 첨부 | 메타데이터 행 적재(일반 매핑) | 실물 파일 복사, 경로 계산, 본문 속 첨부 URL 수정, 출처 대조 | §5 |
| view·routine·trigger·job 등 | disposition 분류와 미분류 차단 | 대상 객체 생성·재구현 | §6.1 |
| 시퀀스 | 도구가 키를 넣은 컬럼의 시퀀스 재설정 | 스크립트·화면으로 넣은 행의 시퀀스 | §6.2 |
| 공통코드 | codemap 변환 | 대상 공통코드 원장과의 대조, 상세코드 공급 | §6.3 |
| 암호·해시 컬럼 | 주민등록번호 호환 암호화 | 키 일치 증명, 레거시 암호문 복호화, 비밀번호 해시 변환 | §6.4 |
| 예약 작업·후속 작업 | `JOB`·`EVENT` 를 재구현 대상으로 분류 | 레거시 작업·대기열 이관, 보존 스케줄러 조정 | §6.5 |

**공통 원칙**

- 대상 DB 쓰기는 모두 점검 창에서 한다. 레거시·온라인 writer 를 멈추고 DB·첨부 저장소·암호화 키를 한 세트로 백업한 뒤 시작한다([백업·복원 런북](../04-operations/backup-and-restore-runbook.md)).
- 앱이 감사 이력을 남기는 객체(권한·공통코드)는 앱 API·화면으로 쓴다. SQL 로 직접 쓰면 이력과 보호 규칙을 지나지 않는다.
- 검증 쿼리는 모두 읽기 전용(`SELECT`·`WITH`)이고 집계 위주다. 결과에 사용자 식별자·이름·연락처를 싣지 않으며, 결과 원문을 저장소나 공용 메모리에 올리지 않는다.
- 재사용 base 로 만든 제품은 구성에 없는 표·권한이 없다. 쿼리에서 그 표의 줄을 빼고, 권한 카탈로그는 그 제품 저장소의 것을 쓴다.

## 2. 진행 순서

| 단계 | 할 일 | 근거 |
|---|---|---|
| 1 | writer 중지·백업 세트·source freeze | [복구 런북](../04-operations/migration-recovery-runbook.md#전체-롤백과-cutover) |
| 2 | 대상 스키마(제품 Flyway)와 §6.1 의 `RECREATE_VIA_FLYWAY` 객체 적용 | DB 거버넌스 |
| 3 | 공통코드 상세코드 공급(§6.3) | PD-DB-003 |
| 4 | 첨부 실물 복사(§5) | 이 문서 |
| 5 | 도구 COMMIT 적재(사용자·업무 데이터·첨부 메타데이터) | [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md#적재-transaction과-재시작-의미) |
| 6 | 보존 스케줄러 설정 확인(§6.5) 뒤 앱 기동, 트래픽은 닫아 둔다 | [로그 보존 정책](../04-operations/log-retention-policy.md) |
| 7 | 권한 그룹·배정(§3), 기관 메뉴(§4) | ADR-0016·0017 |
| 8 | 이 문서의 검증 쿼리와 화면 smoke(이관 사용자 로그인·메뉴·첨부 다운로드) | §3~§6 |
| 9 | 트래픽 재개 | 기관 승인 |

권한 배정은 앱 API 로 하므로 6단계 기동이 7단계보다 앞선다. 트래픽을 열기 전에 7·8단계를 끝낸다.

## 3. 권한·그룹

모델은 [ADR-0016](../02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md)이다. 그룹(`tb_authrt_info`), 사용자의 복수 그룹
배정(`tb_authrt_user_map`, 사용자 키는 esntlId), 그룹의 기능(`OPERATION`)·메뉴(`NAVIGATION`) 배정(`tb_authrt_grnt_map`), 같은 트랜잭션의
변경 이력(`tb_authrt_chg_hstry`)이다. 기능 코드의 정본은 [권한 카탈로그](../../config/governance/permission-catalog.json),
HTTP 대응은 [정책 원장](../../config/governance/authorization-policies.json)이다.

### 도구가 하지 않는 것

- 레거시 역할·권한(예: eGov 공통 컴포넌트의 권한·롤·URL 패턴 표, 기관마다 다르다)을 그룹으로 바꾸지 않는다. 그룹 이름·URL 패턴으로 권한을 추론하는 일은 ADR-0016 이 금지한다.
- 도구는 권한 표로의 매핑을 막지 않는다. 그러나 매핑으로 쓰면 변경 이력·버전·마지막 관리자 보호를 지나지 않으므로 **권한 표를 mapping 대상으로 두지 않는다.**
- 이관한 사용자에게 그룹을 주지 않는다. 배정이 없으면 빈 기능 목록이고 USER 로 대신 올리지 않는다(ADR-0016). 앱의 기본 USER 배정은 가입·관리자 등록 경로에서만 일어난다.

### 절차

1. **역할 대응표.** 레거시 역할마다 대상 그룹(복수 가능)·사유·승인자를 적은 표를 기관 이관 저장소에 둔다. 입력은 `app-scan` 의 요청 경로·보안 설정 접근 규칙과 레거시 역할 표다. 기본 그룹(`ROLE_ADMIN`·`ROLE_SYSTEM`·`ROLE_USER`)으로 부족하면 권한 작업대의 [권한 묶음](../../config/governance/permission-bundles.json)으로 새 그룹을 만든다(그룹 코드는 대문자로 시작하는 20자 이내).
2. **기본 그룹이 없는 권한.** `NOTICE_EDIT`·`FAQ_EDIT`·`DWORK_READ`·`DWORK_RETRY`·`MFA_RECOVER`·`ADT_LOG_READ` 는 어느 기본 그룹에도 없다. 공지·FAQ 쓰기는 배정 전까지 관리자도 거부되므로 담당 그룹을 정해 배정한다([검토 수명 가이드 §3](governance-review-lifecycle.md#3-온라인-제품의-기관-도입) `authorization`).
3. **사용자 키.** 배정은 esntlId 로 한다. 도구가 esntlId 를 새로 만들었으면 `migration_control.tb_migration_key_map`(레거시 키 → 새 키)에서 얻는다. 이 대응은 식별자라 작업 파일로만 두고 커밋하지 않는다.
4. **배정은 앱 API 로 한다.** 부트스트랩 관리자로 로그인해 [권한 관리 API](../../api-server/src/main/java/nuri/api/controller/foundation/controller/system/AuthorizationApiController.java)를 부른다. 그룹 쪽 일괄 추가 `PATCH /api/v1/admin/authorization/groups/{code}/members`(한 번에 500명), 부서 단위 `PUT …/departments/{departmentId}/memberships`, 사용자 단위 `PUT …/users/{userId}/groups` 가 있다. 이 경로는 동시 변경 확인·변경 이력(같은 트랜잭션)·마지막 관리자 보호를 지나고 민감 작업으로 기록된다. 접속 토큰은 명령행·로그·근거 파일에 남기지 않는다.
5. **SQL 로 할 수밖에 없을 때**(예: 수만 명). 사전 설명과 승인을 받고, 배정 행과 `tb_authrt_chg_hstry` 행(`chg_trgt_type_cd='USER_GROUP'`, `chg_type_cd='MIGRATE'`, `dmnd_idntfr` 에 실행 식별자, `plcy_ver_no` 에 카탈로그 버전)을 한 트랜잭션에 쓴다. V2_98 이 같은 형태로 이력을 남겼다. 카탈로그에 없는 `OPERATION` 코드는 넣지 않는다 — 그 그룹 사용자의 권한 스냅숏이 인증을 막는다(DEC-OPS-224).
6. **로그인 정책.** 레거시 IP·시간 제한은 로그인 정책 화면으로 옮긴다. 접속 제한(`lmt_yn='Y'`)은 마지막 관리자 수에서 빠지므로 관리자 계정에 걸 때 §3 검증 Q-A4 를 다시 본다(DEC-OPS-213).

### 검증(읽기 전용)

```sql
-- Q-A1 그룹이 하나도 없는 사용자(상태별). 사용 중(P)은 의도한 경우 말고 0 이어야 한다.
SELECT u.user_stts_cd, count(*) AS users_without_group
  FROM tb_user_info u
 WHERE NOT EXISTS (SELECT 1 FROM tb_authrt_user_map m WHERE m.scrty_dcsn_trgt_id = u.esntl_id)
 GROUP BY u.user_stts_cd;
```

```bash
# Q-A2 입력: 그 제품 저장소의 카탈로그 코드 목록(공백 구분)
node -p "require('./config/governance/permission-catalog.json').permissions.map(p => p.code).join(' ')"
```

```sql
-- Q-A2 카탈로그에 없는 OPERATION 배정. 0 이어야 한다.
WITH catalog(code) AS (SELECT unnest(string_to_array('<위 출력>', ' ')))
SELECT g.authrt_cd, g.authrt_grnt_cd
  FROM tb_authrt_grnt_map g
 WHERE g.authrt_type_cd = 'OPERATION'
   AND g.authrt_grnt_cd NOT IN (SELECT code FROM catalog);

-- Q-A3 없는 메뉴·꺼진 메뉴를 가리키는 NAVIGATION 배정(물리 FK 가 없다). 없는 메뉴는 0 이어야 한다.
SELECT g.authrt_cd,
       count(*) FILTER (WHERE m.menu_sn IS NULL) AS missing_menu,
       count(*) FILTER (WHERE m.use_yn = 'N')   AS disabled_menu
  FROM tb_authrt_grnt_map g
  LEFT JOIN tb_menu_info m ON m.menu_sn::text = g.authrt_grnt_cd
 WHERE g.authrt_type_cd = 'NAVIGATION'
 GROUP BY g.authrt_cd;

-- Q-A4 관리 가능한 활성 관리자 수(AUTHRT_READ·GRANT·ASSIGN 셋을 모두 가진 사용 중·잠기지 않은·접속 제한 없는 계정). 1 이상.
WITH holders AS (
  SELECT m.scrty_dcsn_trgt_id
    FROM tb_authrt_user_map m
    JOIN tb_authrt_grnt_map g ON g.authrt_cd = m.authrt_cd AND g.authrt_type_cd = 'OPERATION'
   WHERE g.authrt_grnt_cd IN ('AUTHRT_READ', 'AUTHRT_GRANT', 'AUTHRT_ASSIGN')
   GROUP BY m.scrty_dcsn_trgt_id
  HAVING count(DISTINCT g.authrt_grnt_cd) = 3)
SELECT count(*) AS manageable_admins
  FROM holders h
  JOIN tb_user_info u ON u.esntl_id = h.scrty_dcsn_trgt_id
 WHERE u.user_stts_cd = 'P' AND coalesce(u.lck_yn, 'N') <> 'Y'
   AND NOT EXISTS (SELECT 1 FROM tb_login_policy p WHERE p.user_id = u.user_id AND p.lmt_yn = 'Y');

-- Q-A5 이력 없는 배정. API 로 배정했으면 0 이다. 이력 표의 사용자 열에 인덱스가 없어(GAP-AUTH-004) 한가한 시간에 돌린다.
SELECT count(*) AS memberships_without_history
  FROM tb_authrt_user_map m
 WHERE NOT EXISTS (SELECT 1 FROM tb_authrt_chg_hstry h
                    WHERE h.chg_trgt_type_cd = 'USER_GROUP'
                      AND h.authrt_cd = m.authrt_cd
                      AND h.scrty_dcsn_trgt_id = m.scrty_dcsn_trgt_id);
```

화면에서는 권한 작업대의 그룹 비교와 메뉴 미리보기로 대표 사용자의 실제 메뉴·기능을 확인한다. 그룹 편집기는 배정한 메뉴 가운데 그 그룹의
기능 권한으로 들어갈 수 없는 화면을 저장 전에 알린다(DEC-OPS-186).

### 승인 경계

- 역할 대응표와 기본 그룹 없는 권한의 배정은 보안 담당자가 승인한다. 기관 온라인 승인 통제 `authorization` 에 근거를 남긴다.
- SQL 로 배정·회수하는 일은 권한 변경이자 코어 데이터 DML 이다. 대상·영향을 설명하고 명시 승인을 받는다.
- 공유 OCI DB 는 이관 대상이 아니다. 리허설은 격리 DB 에서 한다.

## 4. 메뉴와 레거시 URL

메뉴는 제품 정보구조의 일부다([ADR-0017](../02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md)). `tb_menu_info` 의 연결 라우트
`modern_route` 는 절대경로 또는 레거시 `.do` 경로이고 쿼리 키는 `tab`·`bbsId` 만 받는다([MenuDto](../../business-core/src/main/java/nuri/business/service/menu/dto/MenuDto.java), DEC-OPS-029 Q3).
메뉴는 3단계까지이고([MenuStructurePlan](../../business-core/src/main/java/nuri/business/service/menu/MenuStructurePlan.java)), 메뉴 행에는 감사 표가 없다.

### 도구가 하지 않는 것

- 레거시 메뉴를 대상 메뉴로 바꾸지 않는다. 레거시 메뉴는 대개 레거시 프로그램 URL 을 가리키는데 대상 앱에는 그 화면이 없다.
- 레거시 URL(북마크·외부 링크의 `*.do`)을 새 화면으로 보내지 않는다.

### 절차

1. `app-scan` 의 요청 경로·메뉴 목록으로 레거시 메뉴마다 처분을 정한다. (a) 제품 메뉴로 대체(새 행 없음, 필요하면 이름만 바꿈) (b) 새 화면이 필요(제품 개발 PR — 화면 없이 메뉴만 만들지 않는다) (c) 폐기.
2. 기관 메뉴는 메뉴 관리 화면에서 만든다. 화면 저장은 라우트 형식·3단계·그룹별 표시를 한 초안으로 확인한다(DEC-OPS-208). 많아서 Flyway(기관 저장소의 반복 시드)로 넣는다면 DB 변경 승인을 받고, `menu_sn` 을 명시해 넣었으면 §6.2 로 `sq_menu_sn` 을 맞춘다.
3. 메뉴 표시(`NAVIGATION`)는 §3 의 그룹 배정과 함께 정한다. 메뉴 표시는 API 권한을 주지 않는다.
4. 레거시 URL 리다이렉트가 필요하면 제품 코드 변경(`next.config.ts` 리다이렉트와 라우트 원장·URL-state census 갱신)으로 한다. 메뉴의 `.do` 라우트는 대상 앱에 처리기가 없으면 404 다.
5. 메뉴 즐겨찾기(`tb_bkmk_menu_mng_rslt`)는 이관하지 않는다. 사용자가 다시 고른다(DEC-OPS-163).

### 검증(읽기 전용)

```sql
-- Q-M1 라우트 형식 위반. MenuDto 패턴을 PostgreSQL 정규식으로 옮긴 것이다(정본은 MenuDto). 0 이어야 한다.
SELECT menu_sn
  FROM tb_menu_info
 WHERE modern_route IS NOT NULL
   AND modern_route !~ '^$|^(?:/(?:[^\s?#/\\]+/)*[^\s?#/\\]*|(?:[A-Za-z0-9._~-]+/)*[A-Za-z0-9._~-]+\.do)(?:\?(?:tab|bbsId)=[^&#\s]*(?:&(?:tab|bbsId)=[^&#\s]*)*)?(?:#[^\s]*)?$';

-- Q-M2 깊이와 루트 도달. max_depth 는 3 이하, reachable 은 전체 행 수와 같아야 한다(다르면 순환).
WITH RECURSIVE tree AS (
  SELECT menu_sn, 1 AS depth FROM tb_menu_info WHERE up_menu_sn IS NULL
  UNION ALL
  SELECT m.menu_sn, t.depth + 1 FROM tb_menu_info m JOIN tree t ON m.up_menu_sn = t.menu_sn WHERE t.depth < 10)
SELECT (SELECT max(depth) FROM tree) AS max_depth,
       (SELECT count(*) FROM tree)    AS reachable,
       (SELECT count(*) FROM tb_menu_info) AS total;

-- Q-M3 화면도 하위 메뉴도 없는 사용 중 메뉴(빈 분류). 0 이 기대값이다.
SELECT m.menu_sn
  FROM tb_menu_info m
 WHERE coalesce(m.modern_route, '') = '' AND m.use_yn = 'Y'
   AND NOT EXISTS (SELECT 1 FROM tb_menu_info c WHERE c.up_menu_sn = m.menu_sn AND c.use_yn = 'Y');

-- Q-M4 레거시 .do 라우트를 가진 사용 중 메뉴. 처분 (b)·(c) 로 0 을 만든다.
SELECT count(*) AS legacy_do_menus
  FROM tb_menu_info
 WHERE use_yn = 'Y' AND modern_route ~ '\.do([?#]|$)';
```

메뉴가 실제 화면으로 이어지는지는 화면 관리 화면의 메뉴→화면 판정으로 본다(DEC-OPS-209). Q-A3 이 메뉴 배정 쪽을 본다.

### 승인 경계

메뉴 추가·폐기는 제품 정보구조 결정이다(ADR-0017 의 승인 방식). Flyway·SQL 로 넣으면 DB 변경 승인이 필요하다. 리다이렉트는 제품 PR 이다.

## 5. 첨부

첨부는 마스터(`tb_file_master`, 키 `atch_file_sn` 은 identity `sq_atch_file_sn`)와 상세(`tb_file_detail`: 순번·저장 경로·저장 파일명·원본 파일명·확장자·크기)이고,
업무 행이 `atch_file_sn` 으로 가리킨다. 실물은 `file.upload.path`(기본 `./storage/uploads`, 운영 Compose 에서는 `attachment_storage` 볼륨) 아래의
**상대 경로**이며, 저장소 밖을 가리키는 경로는 앱이 거부한다([LocalFileStorageService](../../business-core/src/main/java/nuri/business/service/file/LocalFileStorageService.java)).
앱이 올린 파일은 `general/<atch_file_sn>/<UUID>.<확장자>` 에 둔다([FileService](../../business-core/src/main/java/nuri/business/service/file/FileService.java)).

열람 판정([FileAccessPolicy](../../business-core/src/main/java/nuri/business/service/file/FileAccessPolicy.java))은 위에서부터 이렇다.
마스터의 `frst_rgtr_id`(업로더 loginId)는 무조건 허용 → 참조원 조회 실패는 거부 → 개인 귀속 참조가 있으면 그 당사자만 →
공유 참조의 소유자·독자 → 관리자(개인 귀속이 있으면 불가) → 그 밖은 거부. 참조원은 [AttachmentSource](../../business-core/src/main/java/nuri/business/service/file/AttachmentSource.java)의
12종(11개 표와 팝업 `file_url`)이다.

### 도구가 하지 않는 것

- 실물 파일을 복사하지 않는다. 메타데이터 행만 일반 매핑으로 적재한다.
- 경로를 계산하지 않는다. 내장 변환기에 문자열 결합이 없어 `general/<atch_file_sn>` 처럼 키로 만든 경로를 쓸 수 없다.
- 레거시 본문 HTML 속 첨부·이미지 URL(예: `*.do?atchFileId=…`)과 팝업·배너의 URL 문자열을 바꾸지 않는다.
- 업로드 검사(확장자 허용 목록·10MB·서명 확인)를 지나지 않는다.
- 업로더와 참조 행 작성자가 같은 사람인지 대조하지 않는다(GAP-SEC-003 은 기관 통제 `attachment-operations` 로 이전했다, DEC-OPS-111).

### 절차

1. **배치 결정.** 권장은 실물을 저장소 아래 `legacy/` 한 디렉터리에 레거시 저장 파일명 그대로 두는 것이다. 이때 상세의 `file_strg_path` 는 `const: legacy`, `strg_file_nm` 은 레거시 저장 파일명을 매핑한다. 먼저 소스에서 저장 파일명이 겹치지 않는지 센다(아래 Q-F0). 겹치면 하위 디렉터리를 나누고 경로를 소스 컬럼 하나로 매핑할 수 있게 한다. 이 배치는 앱 정기 점검의 역방향(DB 에 없는 실물) 검사가 `general/` 만 보므로 `legacy/` 의 고아 파일을 세지 않는다. 정방향(실물 없는 DB 행)은 모든 행을 본다.
2. **실물 복사.** 점검 창에서 레거시 저장소를 읽기 전용으로 두고 대상 볼륨으로 복사한다. 파일별 SHA-256 목록을 저장소 밖에 남기고 복사 뒤 대조한다. 파일 소유자·권한은 앱 실행 계정에 맞춘다.
3. **메타데이터 매핑.** 마스터 키는 레거시 키가 정수면 `preserve`(상세·업무 표는 같은 값을 그대로 옮긴다), 아니면 `target_generated` 로 두고 상세·업무 표가 `foreignKeys` 로 새 키를 받는다. 마스터 `frst_rgtr_id` 는 이관한 같은 사람의 loginId 일 때만 넣는다. 확인할 수 없으면 어떤 사용자의 loginId 로도 쓰이지 않는 고정 행위자 값(예: `MIGRATION`)을 넣는다 — 그 값으로 로그인할 사람이 없으니 업로더 허용이 아무에게도 열리지 않는다.
4. **허용 밖 파일.** 확장자 허용 목록(`jpg`·`jpeg`·`png`·`gif`·`bmp`·`pdf`·`doc`·`docx`·`xls`·`xlsx`·`ppt`·`pptx`·`hwp`·`txt`·`zip`·`7z`·`rar`, 게시판은 `mp4`·`webm` 추가) 밖의 파일과 10MB 초과 파일을 이관할지 보안 담당자가 정한다. 제외하면 원장의 외부 보관(ADR-0029 결정 6)으로 돌린다.
5. **팝업·배너.** URL 문자열로 첨부를 가리키므로 건수가 적으면 화면에서 다시 등록한다.
6. **격리·보관된 행.** 업무 행을 격리(ADR-0029 결정 8)하거나 외부 보관하면 그 행이 가리키던 마스터는 참조원 없이 남는다. Q-F3 으로 세고, 실물은 보관 덤프와 같은 보존 정책을 따른다.

### 검증(읽기 전용)

```sql
-- Q-F0 (소스 DB, 읽기 전용) 저장 파일명 중복. 표·컬럼 이름은 기관 레거시 스키마에 맞춘다(아래는 eGov 공통 컴포넌트 예시, 추정).
SELECT count(*) AS total, count(DISTINCT stre_file_nm) AS distinct_names FROM comtnfiledetail;

-- Q-F1 atch_file_sn 을 가진 표. AttachmentSource 의 11개 표와 같아야 한다(다르면 참조원 등록 누락 — 개발 변경).
SELECT table_name
  FROM information_schema.columns
 WHERE table_schema = 'public' AND column_name = 'atch_file_sn'
   AND table_name NOT IN ('tb_file_master', 'tb_file_detail')
 ORDER BY 1;

-- Q-F2 업로더와 참조 행 작성자가 다른 첨부(출처 census, attachment-operations). 표마다 한 줄씩 늘린다.
SELECT 'tb_bbs_item' AS source_table, count(*) AS referenced,
       count(*) FILTER (WHERE fm.frst_rgtr_id IS DISTINCT FROM r.frst_rgtr_id) AS uploader_differs
  FROM tb_bbs_item r JOIN tb_file_master fm ON fm.atch_file_sn = r.atch_file_sn
UNION ALL
SELECT 'tb_note_info', count(*),
       count(*) FILTER (WHERE fm.frst_rgtr_id IS DISTINCT FROM r.frst_rgtr_id)
  FROM tb_note_info r JOIN tb_file_master fm ON fm.atch_file_sn = r.atch_file_sn;

-- Q-F3 어떤 참조원도 가리키지 않는 마스터. 업로더 말고는 열 수 없다. 이관 직후 0 이 기대값이다.
SELECT count(*) AS unreferenced_masters
  FROM tb_file_master fm
 WHERE NOT EXISTS (SELECT 1 FROM tb_bbs_item r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_bnr_info r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_schdl_info r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_dept_task_info r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_diary_info r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_rpt_info r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_memo_rpt_info r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_rward_manage r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_email_dsptch_manage r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_note_info r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_dta_use_stats r WHERE r.atch_file_sn = fm.atch_file_sn)
   AND NOT EXISTS (SELECT 1 FROM tb_popup_info p
                    WHERE p.file_url IN ('/api/v1/files/' || fm.atch_file_sn,
                                         '/api/v1/files/download?fileId=' || fm.atch_file_sn));

-- Q-F4 저장 위치. missing_location·unsafe_path 는 0 이어야 한다.
SELECT count(*) FILTER (WHERE file_strg_path IS NULL OR strg_file_nm IS NULL) AS missing_location,
       count(*) FILTER (WHERE file_strg_path ~ '^(/|[A-Za-z]:|\\)'
                           OR file_strg_path ~ '(^|/)\.\.(/|$)')           AS unsafe_path,
       count(*) FILTER (WHERE file_strg_path = 'general/' || atch_file_sn) AS standard_layout,
       count(*) FILTER (WHERE file_strg_path = 'legacy')                    AS legacy_layout,
       count(*)                                                              AS total
  FROM tb_file_detail;

-- Q-F5 업로드 검사 밖의 파일(확장자별 건수와 10MB 초과).
SELECT lower(coalesce(file_estn, '')) AS extension, count(*) AS files,
       count(*) FILTER (WHERE file_sz > 10485760) AS over_10mb
  FROM tb_file_detail
 WHERE lower(coalesce(file_estn, '')) NOT IN ('jpg','jpeg','png','gif','bmp','pdf','doc','docx','xls','xlsx',
                                              'ppt','pptx','hwp','txt','zip','7z','rar','mp4','webm')
    OR file_sz > 10485760
 GROUP BY 1 ORDER BY 2 DESC;
```

실물 존재는 앱의 첨부 정합성 점검 `GET /api/v1/admin/files/integrity`(`FILE_AUDIT` 권한, 읽기 전용)로 본다. 정방향 실물 부재가 0 이어야 한다.
전량을 훑으므로 점검 창 안에서 한 번 돌린다. 정기 점검(03:15)의 운영은 [정기 첨부 점검](../04-operations/readiness-followups.md#정기-첨부-점검)을 따른다.

### 승인 경계

- 실물 복사는 운영 저장소 변경이다. 백업 세트 뒤에 하고, 실패하면 DB 와 저장소를 함께 되돌린다.
- 허용 밖 파일의 처분, 업로더 값 정책, Q-F2·Q-F3 결과는 기관 통제 `attachment-operations` 의 근거다(원시 값·식별자는 싣지 않는다).
- 본문 속 레거시 첨부 URL 을 고치는 일괄 UPDATE 는 코어 데이터 DML 이라 별도 승인이다.

## 6. 그 밖의 비데이터 객체

### 6.1 view·routine·trigger·job (A2)

plan 은 발견한 객체마다 disposition 을 요구하고, 미분류·미검토·`BLOCKED` 가 있으면 실행하지 않는다. 초안은 view·materialized view·extension·policy 가
`RECREATE_VIA_FLYWAY`, routine·procedure·package·trigger·job·event 가 `REIMPLEMENT_IN_APP`, synonym·DB link·외부 서버가 `EXTERNALIZE`,
grant·role·user·tablespace 가 `EXPORT_ONLY` 다([ObjectDisposition](../../migration-tool/src/main/java/nuri/migration/plan/ObjectDisposition.java)).
`RECREATE_VIA_FLYWAY` 는 `targetObject` 이름을 요구하지만 **그 객체가 대상에 있는지는 보지 않는다.**

| disposition | 사람이 할 일 | 끝났다는 증거 |
|---|---|---|
| `RECREATE_VIA_FLYWAY` | 기관 저장소의 Flyway 로 만든다(DB 헌법·무중단 규칙) | 아래 Q-O1 에 그 이름이 있다 |
| `REIMPLEMENT_IN_APP` | 업무 로직은 서비스 코드로, 감사 trigger 는 엔티티 감사 컬럼으로, 예약 작업은 §6.5 로 | 구현 PR·시험 |
| `EXTERNALIZE` | 연계 설정으로 옮긴다. 대상 DB 에 DB link·synonym 을 두지 않는다 | 연계 설정 검토 |
| `EXPORT_ONLY` | 참고 자료로만 둔다. 대상 DB 계정·권한은 인프라가 따로 관리한다 | 없음 |
| `APPROVED_IGNORE` | 사유를 적는다(사유 없으면 plan 이 막는다) | plan |

```sql
-- Q-O1 RECREATE_VIA_FLYWAY 로 적은 targetObject 가 대상에 있는지. 이름 목록을 넣는다.
WITH expected(name) AS (VALUES ('<view 또는 함수 이름>'))
SELECT e.name,
       EXISTS (SELECT 1 FROM pg_views v WHERE v.schemaname = 'public' AND v.viewname = e.name)
    OR EXISTS (SELECT 1 FROM pg_matviews v WHERE v.schemaname = 'public' AND v.matviewname = e.name)
    OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = e.name) AS present
  FROM expected e;
```

### 6.2 시퀀스

도구가 `preserve`·`remap` 키나 직접 매핑으로 identity·serial·`nextval` 기본값 컬럼에 값을 넣으면 적재 뒤 그 시퀀스를 최댓값 뒤로 옮긴다.
카탈로그로 연결되지 않은 정수 키는 `identity.targetSequences` 선언이 있어야 COMMIT 을 시작한다
([TargetSequenceSynchronizer](../../migration-tool/src/main/java/nuri/migration/etl/TargetSequenceSynchronizer.java), DEC-OPS-306).
도구 밖에서 키를 명시해 넣은 행(SQL 로 넣은 메뉴 등)의 시퀀스는 사람이 맞춘다.

엔티티의 `@SequenceGenerator` 로만 쓰고 컬럼에 소유되지 않은 시퀀스는 카탈로그로 찾을 수 없다. 이 표의 컬럼에 원본 키를 넣으면 mapping 에 선언한다.

| 시퀀스 | 표·컬럼 |
|---|---|
| `sq_answer_no` | `tb_bbs_comment` 의 댓글 번호(`ans_sn`, 추정) |
| `sq_dgstfn_sn` | `tb_dgstfn_info.dgstfn_sn` |
| `sq_auth_otp_cert`·`sq_auth_cert_dmnd`·`sq_auth_rstr_cd` | MFA 표 — 이관 대상이 아니다(§6.4) |

```sql
-- Q-S1 소유 시퀀스가 컬럼 최댓값보다 뒤에 있는지. behind 가 true 인 줄이 없어야 한다.
-- query_to_xml 은 넘긴 SELECT 를 실행할 뿐 쓰지 않는다.
WITH owned AS (
  SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name, s.relname AS sequence_name
    FROM pg_depend d
    JOIN pg_class s ON s.oid = d.objid AND s.relkind = 'S'
    JOIN pg_class c ON c.oid = d.refobjid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.refobjsubid
   WHERE d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass
     AND d.deptype IN ('a', 'i') AND n.nspname = 'public'),
measured AS (
  SELECT o.*, ps.last_value,
         (xpath('/row/m/text()', query_to_xml(
             format('SELECT max(%I) AS m FROM %I.%I', o.column_name, o.schema_name, o.table_name),
             false, true, '')))[1]::text::numeric AS column_max
    FROM owned o
    JOIN pg_sequences ps ON ps.schemaname = o.schema_name AND ps.sequencename = o.sequence_name)
SELECT table_name, column_name, sequence_name, last_value, column_max,
       column_max > coalesce(last_value, 0) AS behind
  FROM measured
 ORDER BY behind DESC, table_name;

-- Q-S2 어떤 컬럼에도 소유되지 않은 시퀀스. 위 표 밖의 이름이 나오면 사용처를 확인한다.
SELECT ps.sequencename, ps.last_value
  FROM pg_sequences ps
  JOIN pg_namespace n ON n.nspname = ps.schemaname
  JOIN pg_class s ON s.relname = ps.sequencename AND s.relnamespace = n.oid
 WHERE ps.schemaname = 'public'
   AND NOT EXISTS (SELECT 1 FROM pg_depend d
                    WHERE d.classid = 'pg_class'::regclass AND d.objid = s.oid AND d.deptype IN ('a', 'i'))
 ORDER BY 1;
```

어긋난 시퀀스를 `setval` 로 옮기는 일은 대상 DB 쓰기다. 점검 창 안에서 앱을 멈춘 채 하고 승인 범위에 넣는다.

### 6.3 공통코드

공통코드는 분류(`tb_com_clsf_cd`) → 그룹(`tb_com_cd`) → 상세(`tb_com_dtl_cd`, `use_yn`)다. 그룹 머리는 제품이 시드하고(재사용 제품은 선택한 기능의
그룹만, DEC-OPS-262) 상세코드는 기관이 공급한다(PD-DB-003). 업무 컬럼에서 상세코드로 가는 물리 FK 는 없다.

| 업무 컬럼 | 그룹 | 앱이 하는 일 |
|---|---|---|
| `tb_ifml_atrz_info.task_se_cd` | `COM075` | 상신이 사용 중 상세코드만 받는다 |
| `tb_bbs_master.bbs_type_cd`·`bbs_atrb_cd` | `COM004`·`COM009` | 이름 표시만 한다. `COM004` 그룹은 원본에 없다(GAP-BOARD-002) |
| `tb_sys_log.prcs_se_cd` | `COM033` | 이름 표시만 한다 |

**도구가 하지 않는 것.** codemap 은 mapping 안의 독립 사전이라 결과값이 대상 상세코드에 있는지 보지 않는다(설계 D7, L4 에서 보강).
상세코드를 공급하지 않는다. 적재분은 공통코드 변경 이력에 남지 않는다 — 이력은 앱 화면의 변경만 기록하고 소급하지 않는다(DEC-OPS-176).

**절차.** 상세코드는 업무 데이터보다 먼저 넣는다. 건수가 적으면 공통코드 화면으로 넣는다(이력·캐시 무효화가 함께 된다). 많으면 도구 매핑으로
`tb_com_dtl_cd` 에 넣되, 앱이 떠 있으면 `commonCodes` 캐시(10분)가 남으므로 앱 기동 전에 넣는다. codemap 의 출력값은 이 상세코드 집합 안에서 고른다.

```sql
-- Q-C1 앱이 쓰는 그룹과 사용 중 상세코드 수. COM075 는 1 이상이어야 결재 상신이 된다.
SELECT b.cd_id, c.cd_id IS NOT NULL AS group_exists,
       count(d.dtl_cd) FILTER (WHERE d.use_yn = 'Y') AS active_details
  FROM (VALUES ('COM075'), ('COM004'), ('COM009'), ('COM033')) AS b(cd_id)
  LEFT JOIN tb_com_cd c ON c.cd_id = b.cd_id
  LEFT JOIN tb_com_dtl_cd d ON d.cd_id = b.cd_id
 GROUP BY b.cd_id, c.cd_id;

-- Q-C2 업무 값이 사용 중 상세코드 밖에 있는 경우. 컬럼·그룹을 바꿔 위 표의 줄마다 돌린다. 0 이 기대값이다.
SELECT a.task_se_cd, count(*) AS rows
  FROM tb_ifml_atrz_info a
 WHERE a.task_se_cd IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM tb_com_dtl_cd d
                    WHERE d.cd_id = 'COM075' AND d.dtl_cd = a.task_se_cd AND d.use_yn = 'Y')
 GROUP BY a.task_se_cd;
```

### 6.4 암호·해시 컬럼

도구는 온라인 앱이 암호화하는 컬럼을 같은 암호문으로 쓴다. 지금 목록은 `tb_user_info.user_enrrno`(ARIA, `encrypt` 선언 필수)와
`tb_auth_otp_cert.otp_secret_encpt_cn`(이관 불가)이고, 평문이 오거나 키가 없으면 쓰기 전에 멈춘다
([ProtectedTargetColumns](../../migration-tool/src/main/java/nuri/migration/protect/ProtectedTargetColumns.java), DEC-OPS-308). 해시로 저장하는 값은 이 목록에 없다.

**도구가 하지 않는 것**

- 이관 키가 온라인 `ALGORITHM_KEY` 와 같은지 증명하지 않는다.
- 레거시가 이미 암호문으로 가진 값을 복호화하지 않는다. 그 값을 평문으로 보고 다시 암호화하므로, 복호화 경로를 먼저 정해야 한다(아직 없다).
- 비밀번호 해시를 바꾸지 않는다. 앱은 `{egov}` 표식이나 표식 없는 레거시 SHA-256 해시를 loginId, 그다음 esntlId 를 salt 로 검증하고, 맞으면 로그인 때 표준 해시로 다시 쓴다([EgovAuthenticationProvider](../../business-core/src/main/java/nuri/business/security/iam/EgovAuthenticationProvider.java)). loginId 와 esntlId 를 모두 바꿔 이관했거나 다른 알고리즘이면 검증이 실패한다.

**절차**

1. 주민등록번호 이관의 법적 근거와 키 일치 확인을 기관 이관 통제 `mapping-schema-driver` 에 남긴다. 키 값은 적지 않는다.
2. 레거시 해시가 위 형식이 아니거나 salt 가 남지 않으면 관리자 비밀번호 초기화로 임시 비밀번호를 주고, 첫 로그인에서 바꾸게 한다(DEC-OPS-201).
3. MFA 비밀, 복구 코드, 인증 요청, 리프레시 토큰은 이관하지 않는다. MFA 는 사용자가 다시 등록한다([MFA 운영](../04-operations/mfa-operations.md)).
4. 키 회전과 레거시 암호문 처분은 기관 통제 `crypto-lifecycle` 이다([키 로테이션 런북](../04-operations/crypto-key-rotation.md)).

```sql
-- Q-E1 평문 주민등록번호 모양. plaintext_shape 는 0 이어야 한다.
SELECT count(*) FILTER (WHERE user_enrrno ~ '^\d{6}-?\d{7}$') AS plaintext_shape,
       count(*) FILTER (WHERE user_enrrno IS NOT NULL)           AS non_null
  FROM tb_user_info;

-- Q-E2 비밀번호 해시 형식별 사용자 수. 레거시 형식이 남은 사용자는 첫 로그인에서 바뀐다.
SELECT CASE WHEN pswd LIKE '{bcrypt}%' THEN 'bcrypt'
            WHEN pswd LIKE '{egov}%'   THEN 'egov'
            WHEN pswd LIKE '{%'        THEN 'other-prefixed'
            ELSE 'unprefixed-legacy' END AS hash_format,
       count(*) AS users
  FROM tb_user_info
 GROUP BY 1;

-- Q-E3 이관 직후 MFA 등록 수. 0 이 기대값이다(이관 대상이 아니다).
SELECT count(*) AS otp_credentials FROM tb_auth_otp_cert;
```

### 6.5 예약 작업·후속 작업·로그 보존

레거시 DB job·event·스케줄러는 plan 이 `REIMPLEMENT_IN_APP` 으로 분류할 뿐이다. 하나씩 (a) 앱의 기존 스케줄러가 대신함 (b) 새 기능(제품 PR)
(c) 외부 배치 (d) 사유를 적고 폐기로 정한다.

`tb_sys_job` 은 앱이 업무와 같은 트랜잭션에 저장하는 후속 작업 원장이다([후속 작업 재처리](../04-operations/durable-work-recovery.md)).
처리기가 있는 유형은 `NOTIFICATION_DELIVERY`·`FILE_DELETE` 뿐이고, 처리기가 없는 유형은 소비되지 않는다. **레거시 대기열을 이 표로 옮기지 않는다.**
알림(`tb_user_noti`)을 이관하면 작업이 없으므로 알림함에만 보이고 실시간 전달은 하지 않는다. 레거시 발송 이력의 대기 상태 행은 재발송 대상처럼
보일 수 있으니 확정된 결과 코드로 옮기거나 제외한다(추정).

앱 스케줄러 가운데 이관과 부딪히는 것은 로그 보존이다. 로그 파기는 **기본으로 켜져 있고**(매일 04:00, 접속·시스템·로그인·개인 사용·개인정보 접근 로그
24개월, [LogRetentionScheduler](../../business-core/src/main/java/nuri/business/service/log/LogRetentionScheduler.java)) 법정 하한보다 줄일 수 없다.
그래서 24개월보다 오래된 레거시 로그를 온라인 표에 넣으면 앱 기동 뒤 첫 04:00 에 지워진다. 오래된 로그는 외부 보관으로 두거나 보존 개월을
올리는 결정을 기동 전에 한다([로그 보존 정책](../04-operations/log-retention-policy.md)). 알림 보존은 기본으로 꺼져 있다.

```sql
-- Q-J1 후속 작업 원장. 이관 직후 레거시 유형이 없어야 한다.
SELECT job_se_nm, prcs_stts_nm, count(*) AS jobs
  FROM tb_sys_job
 GROUP BY 1, 2 ORDER BY 1, 2;

-- Q-J2 보존 기간을 넘은 로그(표마다 한 줄씩 늘린다). 0 이 아니면 첫 04:00 에 지워질 행이다.
SELECT 'tb_login_log' AS log_table, count(*) AS older_than_24_months
  FROM tb_login_log WHERE crt_dt < date_trunc('day', now()) - interval '24 months'
UNION ALL
SELECT 'tb_sys_log', count(*) FROM tb_sys_log WHERE crt_dt < date_trunc('day', now()) - interval '24 months';
```

## 7. 기관 원장에 남길 근거

[기관 이관 원장](../../config/governance/migration-adoption-review.json)과 온라인 원장에 아래를 근거 파일로 남긴다. 식별자·원시 값·키·접속정보는 싣지 않는다.

| 통제 | 이 문서에서 나오는 근거 |
|---|---|
| `mapping-schema-driver` | 주민등록번호 법적 근거·키 일치 확인, Q-E1 |
| `recovery-cutover` | §2 순서, 백업 세트, Q-S1·Q-J2 판단 |
| `authorization`(온라인) | 역할 대응표 승인, Q-A1~Q-A5, 기본 그룹 없는 권한 배정 |
| `attachment-operations`(온라인) | 실물 복사 SHA-256 대조, Q-F2·Q-F3 집계, 허용 밖 파일 처분, 정합성 점검 결과 |
| `crypto-lifecycle`(온라인) | 레거시 해시·암호문 처분, Q-E2 |

통제의 정의는 [검토 수명 가이드](governance-review-lifecycle.md#4-독립-migration-tool-도입)가 정본이다.

## 8. 한계와 갱신 조건

- 쿼리는 2026-10-15 main 의 스키마 기준이다. 표·컬럼이 바뀌면 이 문서를 함께 고친다. Q-M1 은 `MenuDto` 패턴의 옮김이라 둘이 다르면 `MenuDto` 가 맞다.
- ADR-0029 L4 의 verify 확장(고아 FK·UNIQUE·NOT NULL·도메인 적합성·집계 대사)과 공통코드 대조가 들어오면 Q-C2 등 겹치는 쿼리를 도구 결과로 바꾸고 이 문서에서 걷는다.
- 이 문서의 쿼리 결과는 그 시점의 실측이다. 운영 승인이나 cutover 완료를 뜻하지 않는다.

*검토: 2026-10-15(그날 main 의 스키마 기준).*
