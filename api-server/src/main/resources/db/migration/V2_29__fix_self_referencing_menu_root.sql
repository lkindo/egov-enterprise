-- 자기 자신을 부모로 갖는 메뉴 행을 정리하고, 같은 형태가 다시 생기지 못하게 막는다.
--
-- [문제]
-- V2_2 시드에 menu_sn = 800000000, up_menu_sn = 800000000 인 'ROOT' 행이 들어 있다.
-- 부모가 자기 자신이므로 메뉴 트리를 재귀로 훑는 순간 무한 루프가 된다.
--
-- V2_14 가 건 자기참조 FK 는 이걸 잡지 못한다 — 자기 자신도 유효한 참조 대상이기 때문이다.
-- V2_24 가 추가한 CHECK 도 del_yn/use_yn 값 도메인만 본다.
--
-- [지금까지 왜 안 터졌나]
-- MenuService.buildMenuTree 의 필터에 menuSn <= 9999999 조건이 있어 이 행(8억)이 **우연히**
-- 걸러진다. 그러나 그 필터가 없는 경로(selectMenuManageList, getAllMenus, selectMenuCreatList)는
-- 이 행을 그대로 내보내고, 향후 WITH RECURSIVE 나 트리 순회를 도입하면 즉시 무한 루프가 된다.
-- 우연한 방어에 기대는 상태를 끝낸다.
--
-- [조치]
-- 1) 사이클을 끊는다. 삭제가 아니라 up_menu_sn 을 NULL 로 만들어 정상적인 루트 노드로 되돌린다.
--    - 삭제하지 않는 이유: tb_menu_crt_dtl 에 이 menu_sn 을 참조하는 권한 행이 1건 존재한다
--      (실측 확인). 물리 삭제하면 그 행까지 정리해야 하고 되돌리기 어렵다.
--    - NULL 로 바꿔도 화면에는 영향이 없다. 위 menuSn <= 9999999 필터가 여전히 이 행을 제외한다.
--    - 자식도 0건이라(실측) 트리 구조가 바뀌지 않는다.
-- 2) 같은 형태의 재발을 CHECK 제약으로 막는다.
--
-- [멱등성] UPDATE 는 조건이 붙어 재적용 시 0 rows, CHECK 은 IF NOT EXISTS 로 감싼다.

-- 1) 사이클 해소
UPDATE tb_menu_info
   SET up_menu_sn = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = up_menu_sn;

-- 2) 재발 방지 — 부모가 자기 자신인 행을 아예 만들 수 없게 한다.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_menu_info_no_self_parent'
    ) THEN
        ALTER TABLE tb_menu_info
            ADD CONSTRAINT ck_menu_info_no_self_parent
            CHECK (up_menu_sn IS NULL OR up_menu_sn <> menu_sn);
    END IF;
END $$;

-- [손대지 않는 것]
-- 1060000(스마트 툴킷 허브)의 modern_route 가 빈 문자열인 점은 결함이 아니다.
-- prgrm_file_nm='dir' 인 폴더 노드는 빈 modern_route 를 갖는 것이 이 저장소의 관례이며
-- 같은 형태가 5건 존재한다(실측). 개별 수정 대상이 아니라 관례 그 자체다.
