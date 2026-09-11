-- ADR-0017: approved task-oriented menu hierarchy. Existing menu IDs and OPERATION grants remain stable.
-- Requires the existing explicit authorization Contract BEFORE this version. Never edits V2_98/V2_99 snapshots.
-- Full product: 84 -> 77 menus, 79 -> 71 active, four roots, maximum three levels.
-- Staging tables are transaction-local; the only persistent writes are menu metadata, NAV deltas and their audit.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $menu_reorganization$
DECLARE
    participation_id bigint;
    statistics_id bigint;
    group_count integer;
    catalog_version text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name IN
        ('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info')) THEN
        RAISE EXCEPTION 'Menu reorganization requires authorization Contract after V2_99; do not skip or rewrite the earlier migration';
    END IF;
    IF (SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE') <> 1 THEN
        RAISE EXCEPTION 'Verified authorization Contract evidence is required';
    END IF;
    LOCK TABLE tb_menu_info,tb_authrt_info,tb_authrt_grnt_map,tb_authrt_user_map,tb_authrt_chg_hstry,tb_bkmk_menu_mng_rslt
        IN ACCESS EXCLUSIVE MODE NOWAIT;
    SELECT plcy_ver_no INTO STRICT catalog_version FROM tb_authrt_chg_hstry
     WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE';

    CREATE TEMPORARY TABLE menu_reorg_plan(
        id bigint PRIMARY KEY,parent_id bigint,position integer NOT NULL,label text,folder boolean NOT NULL
    ) ON COMMIT DROP;
    INSERT INTO menu_reorg_plan VALUES
    (1000000,NULL,1,'나의 업무',false),
    (2000000,NULL,2,'소통·지식',true),
    (-1,NULL,3,'참여',true),
    (9000000,NULL,4,'관리 센터',true),
    (1060100,1000000,1,'업무 관리',false),
    (1060200,1000000,2,'일정',false),
    (1060300,1000000,3,'업무 보고',false),
    (1050100,1000000,4,'내 결재함',false),
    (2020100,1000000,5,'내 스크랩',false),
    (2030400,1000000,6,'알림 센터',false),
    (1000001,1000000,7,NULL,false),
    (1020000,2000000,1,'메시지·연락처',true),
    (9030110,2000000,2,'커뮤니티',false),
    (2040000,2000000,3,NULL,false),
    (2050000,2000000,4,NULL,false),
    (2060000,2000000,5,NULL,false),
    (2070000,2000000,6,NULL,false),
    (1020100,1020000,1,NULL,false),
    (1020200,1020000,2,NULL,false),
    (1020300,1020000,3,'메일 발송 이력',false),
    (1020400,1020000,4,NULL,false),
    (1030100,1020000,5,'주소록',false),
    (2010900,-1,1,'설문 참여',false),
    (2010800,-1,2,'투표 참여',false),
    (9020000,9000000,1,'사용자·조직',true),
    (9020100,9000000,2,'권한·보안',true),
    (9030000,9000000,3,'콘텐츠 운영',true),
    (2030000,9000000,4,'업무 지원',true),
    (2010000,9000000,5,'설문·투표 관리',false),
    (9010000,9000000,6,'시스템 설정',true),
    (9040000,9000000,7,'로그·모니터링',true),
    (-2,9000000,8,'통계',true),
    (9020310,9020000,1,NULL,false),
    (9020312,9020000,2,NULL,false),
    (9020210,9020000,3,'사용자 분류 그룹',false),
    (2030500,9020000,4,'부재 상태 관리',false),
    (9020311,9020100,1,'권한 그룹 관리',false),
    (9020230,9020100,2,'부서별 그룹 배정',false),
    (9010220,9020100,3,'그룹별 메뉴 현황',false),
    (9020120,9020100,4,NULL,false),
    (9020130,9020100,5,'개인정보처리방침·이용약관',false),
    (9030140,9030000,1,NULL,false),
    (9030120,9030000,2,NULL,false),
    (9030130,9030000,3,NULL,false),
    (9030700,9030000,4,NULL,false),
    (9030200,9030000,5,NULL,false),
    (2030200,2030000,1,'행사 외부인사 관리',false),
    (2030300,2030000,2,'포상 기록 관리',false),
    (9030400,2030000,3,NULL,false),
    (9030600,2030000,4,NULL,false),
    (2030100,2030000,5,NULL,false),
    (2010210,2010000,1,NULL,false),
    (2010300,2010000,2,NULL,false),
    (2010500,2010000,3,NULL,false),
    (2010700,2010000,4,'투표 관리',false),
    (2010400,2010000,5,NULL,false),
    (2010600,2010000,6,NULL,false),
    (9010100,9010000,1,NULL,false),
    (9010210,9010000,2,NULL,false),
    (9010230,9010000,3,NULL,false),
    (9010400,9010000,4,NULL,false),
    (9010500,9010000,5,NULL,false),
    (9010300,9010000,6,'화면 구성 예제',false),
    (9040310,9040000,1,NULL,false),
    (9040320,9040000,2,NULL,false),
    (9040330,9040000,3,NULL,false),
    (9040340,9040000,4,NULL,false),
    (9040350,9040000,5,NULL,false),
    (9040360,9040000,6,NULL,false),
    (9040370,9040000,7,NULL,false),
    (9040380,9040000,8,NULL,false),
    (9040390,9040000,9,NULL,false),
    (9040101,-2,1,NULL,false),
    (9040102,-2,2,NULL,false),
    (9040104,-2,3,NULL,false),
    (9040105,-2,4,NULL,false),
    (9040106,-2,5,NULL,false);
    CREATE TEMPORARY TABLE menu_reorg_retired(id bigint PRIMARY KEY,canonical_id bigint) ON COMMIT DROP;
    INSERT INTO menu_reorg_retired VALUES
        (9020220,9020311),(9040200,1020300),(9030800,1050100),(9040400,9040320),
        (1030000,NULL),(1050000,NULL),(1060000,NULL),(2020000,NULL),(9030100,NULL);

    -- Fixed reviewed inventory: unknown IDs or changed child placement require a new reviewed mapping.
    IF EXISTS ((SELECT menu_sn FROM tb_menu_info EXCEPT
        (SELECT id FROM menu_reorg_plan WHERE id>0 UNION SELECT id FROM menu_reorg_retired))
        UNION ALL
        ((SELECT id FROM menu_reorg_plan WHERE id>0 UNION SELECT id FROM menu_reorg_retired)
         EXCEPT SELECT menu_sn FROM tb_menu_info))
       OR (SELECT count(*) FROM tb_menu_info WHERE use_yn='Y')<>79
       OR EXISTS (SELECT 1 FROM tb_menu_info WHERE del_yn='Y') THEN
        RAISE EXCEPTION 'Menu inventory differs from the approved 84-menu input; review before applying';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_menu_info WHERE menu_nm IN ('참여','통계')
        OR menu_expln IN ('ADR-0017 참여 분류','ADR-0017 통계 분류')) THEN
        RAISE EXCEPTION 'New menu category conflicts with an existing category';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_bkmk_menu_mng_rslt b JOIN menu_reorg_retired r ON r.id=b.menu_id) THEN
        RAISE EXCEPTION 'Retired menu has bookmark references; an explicit bookmark mapping is required';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='tb_menu_info'::regclass
        AND conrelid<>'tb_menu_info'::regclass) THEN
        RAISE EXCEPTION 'Unexpected external menu foreign key requires an explicit reference migration';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tb_menu_info'
        AND column_name='menu_sn' AND is_identity='YES' AND identity_generation='BY DEFAULT') THEN
        RAISE EXCEPTION 'Existing menu IDENTITY strategy is required';
    END IF;
    IF (WITH RECURSIVE tree AS (
        SELECT menu_sn FROM tb_menu_info WHERE up_menu_sn IS NULL OR up_menu_sn=0
        UNION ALL SELECT m.menu_sn FROM tb_menu_info m JOIN tree p ON p.menu_sn=m.up_menu_sn
    ) SELECT count(*) FROM tree)<>84 THEN
        RAISE EXCEPTION 'Menu input contains a missing parent or a cycle';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_authrt_grnt_map g WHERE g.authrt_type_cd='NAVIGATION'
        AND NOT EXISTS (SELECT 1 FROM tb_menu_info m WHERE m.menu_sn::text=g.authrt_grnt_cd)) THEN
        RAISE EXCEPTION 'Unknown menu grant requires review before reorganization';
    END IF;

    CREATE TEMPORARY TABLE menu_reorg_before ON COMMIT DROP AS SELECT * FROM tb_menu_info;
    CREATE TEMPORARY TABLE menu_reorg_grants_before ON COMMIT DROP AS SELECT * FROM tb_authrt_grnt_map;
    CREATE TEMPORARY TABLE menu_reorg_members_before ON COMMIT DROP AS SELECT * FROM tb_authrt_user_map;
    CREATE TEMPORARY TABLE menu_reorg_groups_before ON COMMIT DROP AS SELECT * FROM tb_authrt_info;
    CREATE TEMPORARY TABLE menu_reorg_audit_before ON COMMIT DROP AS SELECT * FROM tb_authrt_chg_hstry;

    -- Enumerate all combinations of the four measured groups, including the empty set. A larger
    -- unreviewed population fails explicitly rather than claiming a sampled comparison is exhaustive.
    SELECT count(*) INTO group_count FROM tb_authrt_info;
    IF group_count>12 THEN RAISE EXCEPTION 'More than 12 groups requires a reviewed exhaustive menu-equivalence strategy'; END IF;
    CREATE TEMPORARY TABLE menu_reorg_group_bits ON COMMIT DROP AS
        SELECT authrt_cd,(1::bigint << (row_number() OVER(ORDER BY authrt_cd)-1)::integer) AS bit FROM tb_authrt_info;
    CREATE TEMPORARY TABLE menu_reorg_masks ON COMMIT DROP AS
        SELECT generate_series(0::bigint,(1::bigint << group_count)-1) AS mask;
    CREATE TEMPORARY TABLE menu_reorg_visible_before ON COMMIT DROP AS
    WITH RECURSIVE allowed AS (
        SELECT DISTINCT combination.mask,m.menu_sn FROM menu_reorg_masks combination
        JOIN menu_reorg_group_bits b ON (combination.mask & b.bit)<>0
        JOIN menu_reorg_grants_before g ON g.authrt_cd=b.authrt_cd AND g.authrt_type_cd='NAVIGATION'
        JOIN menu_reorg_before m ON m.menu_sn::text=g.authrt_grnt_cd
    ), visible AS (
        SELECT a.mask,m.menu_sn FROM menu_reorg_before m JOIN allowed a USING(menu_sn)
        WHERE (m.up_menu_sn IS NULL OR m.up_menu_sn=0) AND m.use_yn='Y'
        UNION ALL SELECT p.mask,m.menu_sn FROM visible p JOIN menu_reorg_before m ON m.up_menu_sn=p.menu_sn
        JOIN allowed a ON a.mask=p.mask AND a.menu_sn=m.menu_sn WHERE m.use_yn='Y'
    ) SELECT * FROM visible;

    INSERT INTO tb_menu_info(menu_nm,menu_ordr,menu_expln,up_menu_sn,prgrm_file_nm,modern_route,use_yn,del_yn,
        frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
    VALUES('참여',3,'ADR-0017 참여 분류',NULL,NULL,NULL,'Y','N','SYSTEM',CURRENT_TIMESTAMP,'SYSTEM',CURRENT_TIMESTAMP)
    RETURNING menu_sn INTO participation_id;
    INSERT INTO tb_menu_info(menu_nm,menu_ordr,menu_expln,up_menu_sn,prgrm_file_nm,modern_route,use_yn,del_yn,
        frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
    VALUES('통계',8,'ADR-0017 통계 분류',9000000,NULL,NULL,'Y','N','SYSTEM',CURRENT_TIMESTAMP,'SYSTEM',CURRENT_TIMESTAMP)
    RETURNING menu_sn INTO statistics_id;
    UPDATE menu_reorg_plan SET id=CASE id WHEN -1 THEN participation_id WHEN -2 THEN statistics_id ELSE id END,
        parent_id=CASE parent_id WHEN -1 THEN participation_id WHEN -2 THEN statistics_id ELSE parent_id END;
    UPDATE tb_menu_info m SET up_menu_sn=p.parent_id,menu_ordr=p.position,menu_nm=coalesce(p.label,m.menu_nm),
        modern_route=CASE WHEN p.folder THEN NULL WHEN m.menu_sn=9030110 THEN '/admin/help?tab=COMMUNITY'
            WHEN m.menu_sn=9020130 THEN '/admin/system/policies' ELSE m.modern_route END,
        prgrm_file_nm=CASE WHEN p.folder THEN NULL ELSE m.prgrm_file_nm END,
        use_yn=CASE WHEN m.menu_sn=9010300 THEN 'N' ELSE m.use_yn END,
        last_mdfr_id='SYSTEM',mdfcn_dt=CURRENT_TIMESTAMP
    FROM menu_reorg_plan p WHERE p.id=m.menu_sn;

    CREATE TEMPORARY TABLE menu_reorg_nav_desired(authrt_cd varchar(20),menu_sn bigint,
        PRIMARY KEY(authrt_cd,menu_sn)) ON COMMIT DROP;
    -- Keep inactive grants and every surviving raw assignment. Remap duplicate entries by group union.
    INSERT INTO menu_reorg_nav_desired
    SELECT g.authrt_cd,coalesce(r.canonical_id,m.menu_sn) FROM menu_reorg_grants_before g
    JOIN menu_reorg_before m ON m.menu_sn::text=g.authrt_grnt_cd
    LEFT JOIN menu_reorg_retired r ON r.id=m.menu_sn
    WHERE g.authrt_type_cd='NAVIGATION' AND (r.id IS NULL OR r.canonical_id IS NOT NULL)
    ON CONFLICT DO NOTHING;
    -- Only previously visible entries can seed added ancestors. A hidden/orphan grant cannot restore itself.
    INSERT INTO menu_reorg_nav_desired
    WITH RECURSIVE ancestors AS (
        SELECT b.authrt_cd,coalesce(r.canonical_id,v.menu_sn) AS menu_sn
        FROM menu_reorg_visible_before v JOIN menu_reorg_group_bits b ON b.bit=v.mask
        LEFT JOIN menu_reorg_retired r ON r.id=v.menu_sn
        WHERE r.id IS NULL OR r.canonical_id IS NOT NULL
        UNION SELECT a.authrt_cd,m.up_menu_sn FROM ancestors a JOIN tb_menu_info m ON m.menu_sn=a.menu_sn
        WHERE m.up_menu_sn IS NOT NULL AND m.up_menu_sn<>0
    ) SELECT authrt_cd,menu_sn FROM ancestors ON CONFLICT DO NOTHING;

    -- A direct SQL menu delete must explicitly remove typed NAV references; there is intentionally no
    -- polymorphic grant-to-menu FK. Audit each actual ADD/REMOVE once, under the same request identifier.
    WITH removed AS (
        DELETE FROM tb_authrt_grnt_map g WHERE g.authrt_type_cd='NAVIGATION' AND NOT EXISTS (
            SELECT 1 FROM menu_reorg_nav_desired d WHERE d.authrt_cd=g.authrt_cd AND d.menu_sn::text=g.authrt_grnt_cd)
        RETURNING g.authrt_cd,g.authrt_grnt_cd
    ) INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,
        authrt_type_cd,authrt_grnt_cd,chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_rsn,frst_rgtr_id,crt_dt)
    SELECT 'migration:2.100',catalog_version,'GROUP_GRANT','REMOVE',authrt_cd,'NAVIGATION',authrt_grnt_cd,
        'grant',authrt_grnt_cd,NULL,'ADR-0017: 중복 메뉴 통합 및 빈 분류 제거','SYSTEM',CURRENT_TIMESTAMP FROM removed;
    WITH added AS (
        INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
        SELECT d.authrt_cd,'NAVIGATION',d.menu_sn::text,'SYSTEM',CURRENT_TIMESTAMP,'SYSTEM',CURRENT_TIMESTAMP
        FROM menu_reorg_nav_desired d WHERE NOT EXISTS (SELECT 1 FROM tb_authrt_grnt_map g
            WHERE g.authrt_cd=d.authrt_cd AND g.authrt_type_cd='NAVIGATION' AND g.authrt_grnt_cd=d.menu_sn::text)
        RETURNING authrt_cd,authrt_grnt_cd
    ) INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,
        authrt_type_cd,authrt_grnt_cd,chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_rsn,frst_rgtr_id,crt_dt)
    SELECT 'migration:2.100',catalog_version,'GROUP_GRANT','ADD',authrt_cd,'NAVIGATION',authrt_grnt_cd,
        'grant',NULL,authrt_grnt_cd,'ADR-0017: 기존 메뉴 노출을 유지하는 새 조상 분류 배정','SYSTEM',CURRENT_TIMESTAMP FROM added;
    DELETE FROM tb_menu_info m USING menu_reorg_retired r WHERE m.menu_sn=r.id;

    CREATE TEMPORARY TABLE menu_reorg_visible_after ON COMMIT DROP AS
    WITH RECURSIVE allowed AS (
        SELECT DISTINCT combination.mask,d.menu_sn FROM menu_reorg_masks combination
        JOIN menu_reorg_group_bits b ON (combination.mask & b.bit)<>0
        JOIN menu_reorg_nav_desired d ON d.authrt_cd=b.authrt_cd
    ), visible AS (
        SELECT a.mask,m.menu_sn FROM tb_menu_info m JOIN allowed a USING(menu_sn)
        WHERE m.up_menu_sn IS NULL AND m.use_yn='Y'
        UNION ALL SELECT p.mask,m.menu_sn FROM visible p JOIN tb_menu_info m ON m.up_menu_sn=p.menu_sn
        JOIN allowed a ON a.mask=p.mask AND a.menu_sn=m.menu_sn WHERE m.use_yn='Y'
    ) SELECT * FROM visible;
    CREATE TEMPORARY TABLE menu_reorg_expected_routes ON COMMIT DROP AS
        SELECT DISTINCT v.mask,coalesce(r.canonical_id,v.menu_sn) AS menu_sn
        FROM menu_reorg_visible_before v JOIN menu_reorg_before m ON m.menu_sn=v.menu_sn
        LEFT JOIN menu_reorg_retired r ON r.id=m.menu_sn
        WHERE nullif(btrim(m.modern_route),'') IS NOT NULL AND m.modern_route<>'#' AND m.menu_sn<>9010300
            AND (r.id IS NULL OR r.canonical_id IS NOT NULL);
    CREATE TEMPORARY TABLE menu_reorg_actual_routes ON COMMIT DROP AS
        SELECT v.mask,v.menu_sn FROM menu_reorg_visible_after v JOIN tb_menu_info m ON m.menu_sn=v.menu_sn
        WHERE nullif(btrim(m.modern_route),'') IS NOT NULL AND m.modern_route<>'#';
    IF EXISTS ((SELECT * FROM menu_reorg_expected_routes EXCEPT SELECT * FROM menu_reorg_actual_routes)
        UNION ALL (SELECT * FROM menu_reorg_actual_routes EXCEPT SELECT * FROM menu_reorg_expected_routes)) THEN
        RAISE EXCEPTION 'Menu reorganization would lose or revive a route for a group combination; entire migration must roll back';
    END IF;
    IF (SELECT count(*) FROM tb_menu_info)<>77 OR (SELECT count(*) FROM tb_menu_info WHERE use_yn='Y')<>71
       OR (SELECT count(*) FROM tb_menu_info WHERE up_menu_sn IS NULL)<>4
       OR (WITH RECURSIVE depth AS (SELECT menu_sn,1 AS level FROM tb_menu_info WHERE up_menu_sn IS NULL
            UNION ALL SELECT m.menu_sn,p.level+1 FROM tb_menu_info m JOIN depth p ON m.up_menu_sn=p.menu_sn)
           SELECT max(level) FROM depth)<>3 THEN
        RAISE EXCEPTION 'Final menu count, active count or hierarchy differs from the approved plan';
    END IF;
    IF EXISTS ((SELECT * FROM menu_reorg_grants_before WHERE authrt_type_cd='OPERATION'
        EXCEPT SELECT * FROM tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION') UNION ALL
        (SELECT * FROM tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION'
        EXCEPT SELECT * FROM menu_reorg_grants_before WHERE authrt_type_cd='OPERATION'))
       OR EXISTS ((SELECT * FROM menu_reorg_members_before EXCEPT SELECT * FROM tb_authrt_user_map) UNION ALL
        (SELECT * FROM tb_authrt_user_map EXCEPT SELECT * FROM menu_reorg_members_before))
       OR EXISTS ((SELECT * FROM menu_reorg_groups_before EXCEPT SELECT * FROM tb_authrt_info) UNION ALL
        (SELECT * FROM tb_authrt_info EXCEPT SELECT * FROM menu_reorg_groups_before))
       OR EXISTS (SELECT * FROM menu_reorg_audit_before EXCEPT SELECT * FROM tb_authrt_chg_hstry) THEN
        RAISE EXCEPTION 'Operation, membership, group or historical audit state changed unexpectedly';
    END IF;
END $menu_reorganization$;
