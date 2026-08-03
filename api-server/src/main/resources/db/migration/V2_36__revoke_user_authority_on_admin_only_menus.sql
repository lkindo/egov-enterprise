-- V2_36: 보이지만 눌리면 튕기는 메뉴의 ROLE_USER 권한 회수. [Wave 1 결정 원장 G-2]
--
-- [증상] ROLE_USER 사이드바에 노출되지만 프론트 미들웨어(frontend/src/middleware.ts §4)가
--   되돌리는 메뉴가 있다. 사용자는 보이는 메뉴를 눌렀는데 아무 설명 없이 튕긴다.
--   미들웨어를 여는 것은 권한 완화라 별도 보안 판단이 필요하고, 애초에 실효도 없다 —
--   해당 화면들이 호출하는 API 는 대부분 `/api/v1/admin/**` 이라
--   rbac.db-auth.secure-paths 에 걸려 백엔드가 어차피 403 을 준다.
--   보이지만 안 되는 것보다 안 보이는 것이 정직하다. 그래서 메뉴 권한을 회수한다.
--
-- [대상 선정 — 실측 2026-08-03, db-bridge]
--   ① tb_menu_info.use_yn='Y' 이고 modern_route 가 '/admin/%' 이며
--      tb_menu_crt_dtl 에 ROLE_USER 매핑이 있는 메뉴를 전수 조회 → 13건.
--   ② 그중 middleware 의 USER_ACCESSIBLE_ADMIN_PATHS(work-hub·collaboration·help·community·
--      survey/polls/participate)에 매칭되는 것은 제외. 단 ADMIN_ONLY_SUBPATHS 는 허용목록보다
--      우선하므로 /admin/community/boards/master 는 '차단됨' 으로 계상했다.
--
-- [개별 판정으로 3건을 제외했다 — §0.7-H4]
--   일괄 회수하면 **섹션 헤더**까지 함께 지워져 그 아래 사용자 접근 가능한 메뉴가 사라진다.
--   같은 조건에 걸렸다고 같은 처분을 내리지 않는다. 자식을 실측해 개별 판정했다.
--
--   · 2000000 '💬 커뮤니티 및 콘텐츠' — 제외.
--     자기 route 는 관리 콘솔(/admin/community/boards/master)이지만 섹션 헤더이며,
--     자식에 온라인 설문 참여(/survey)·엔터프라이즈 위키·FAQ·Q&A·협업이 달려 있다.
--     회수하면 사용자가 그 전부에 도달하지 못한다. (route 가 관리 콘솔을 가리키는 것은
--     별건의 '경로 정정' 과제다 — 권한 문제가 아니다.)
--   · 1050000 '전자결재 및 문서 관리' — 제외.
--     자식 1050100 '내 결재함 및 대시보드'(/approvals)는 /admin 밖이라 사용자에게 열려 있다.
--     회수하면 사용자가 자기 결재함으로 가는 길을 잃는다.
--   · 2010000 '설문 및 여론조사 관리' — 제외.
--     자식 2010800 '온라인poll참여'(/admin/survey/polls/participate)는 미들웨어가 **허용**한다.
--
--   → 최종 10건. 2030000 '사용자지원' 은 섹션 헤더지만 자식 5건(2030100·2030200·2030300·
--     2030400·2030500)이 **전부** 이 목록에 있어, 함께 회수해도 고아가 생기지 않는다.
--
-- [안전성] 대상 10건은 모두 ROLE_ADMIN·ROLE_USER 2개 매핑을 갖는다(실측 role_cnt=2).
--   ROLE_USER 만 지우므로 관리자에게는 그대로 보이고, 매핑이 0이 되는 메뉴는 없다.
--
-- [멱등] 이미 지워졌거나 대상이 없어도 DELETE 는 0행으로 무해하게 끝난다.
--
-- [되돌리기] 아래 한 문장으로 복원한다.
--   INSERT INTO tb_menu_crt_dtl (menu_sn, authrt_cd, mapng_crt_id, crt_dt, frst_rgtr_id, last_mdfr_id)
--   SELECT unnest(ARRAY[1020100,2010210,2010700,2030000,2030100,2030200,2030300,2030400,2030500,2050000]::bigint[]),
--          'ROLE_USER', 'system', NOW(), 'system', 'system';
--   (단, 복원하면 '보이지만 튕기는' 증상도 함께 돌아온다.)
--
-- [시드 원본 미수정] V2_2 시드는 이력 보존상 건드리지 않고 델타로만 처리한다 — V2_34 선례와 동일.

DELETE FROM tb_menu_crt_dtl
 WHERE authrt_cd = 'ROLE_USER'
   AND menu_sn IN (
        1020100,  -- 문자메시지            /admin/uss/ion/sms            (API: /api/v1/admin/operation/sms → ADMIN)
        2010210,  -- 설문 통계·결과 분석   /admin/survey/hub?tab=stats
        2010700,  -- 온라인poll관리        /admin/survey/polls           (참여용 2010800 은 유지)
        2030000,  -- 사용자지원(섹션)      /admin/notifications          (자식 5건 전부 함께 회수)
        2030100,  -- 마이페이지관리        /admin/workspace/my-page      (API: /api/v1/admin/system/workspace/... → ADMIN)
        2030200,  -- 외부인사정보          /admin/operation/external-hr  (API: /api/v1/admin/operation/external-hr → ADMIN)
        2030300,  -- 포상관리              /admin/operation/rewards      (API: /api/v1/admin/operation/rewards → ADMIN)
        2030400,  -- 시스템 알림 설정      /admin/notifications
        2030500,  -- 사용자부재관리        /admin/user/absences
        2050000   -- 온라인 매뉴얼 관리    /admin/uss/olh/online-manual
   );
