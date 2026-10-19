-- 2026-10-19 결함 수정(스크랩 중복) — 한 사용자는 같은 주소를 하나만 스크랩한다.
-- 구조만 바꾼다(유일 제약 하나). 데이터는 바꾸지 않는다.
--
-- [무엇이 문제인가] tb_bbs_scrap 에는 (사용자, 주소) 유일성이 없어 게시글 상세의 스크랩 버튼을 누를 때마다 보관함 행이 하나씩
-- 늘었다(화면은 '이번 방문에서 한 번' 잠금만 걸었다). 서비스(ScrapService)가 등록·수정 전에 겹침을 막고, 이 제약이 동시 요청의
-- 경합을 닫는다 — 겹치면 23505 가 되고 GlobalExceptionHandler 가 409 로 돌려준다.
-- ① 범위: (frst_rgtr_id, scrap_url) 전체 UNIQUE. 사용 안 함(use_yn='N') 행도 센다 — 같은 주소를 다시 보관하면 서비스가 그 행을
--    되살린다(V2_107 의 만족도 1인 1건과 같은 규칙). 등록자나 주소가 없는(NULL) 행은 서로 충돌하지 않는다.
-- ② 중복이 이미 있으면 어느 행을 남길지 정할 수 없어 멈춘다(데이터를 지우거나 합치지 않는다). 업무 소유자가 정리한 뒤 다시
--    적용한다. 2026-10-19 OCI 읽기 실측: 1행, (frst_rgtr_id, scrap_url) 중복 그룹 0, 주소 최대 67바이트.
-- ③ 한계: btree 항목 상한(약 2.7KB) 때문에 압축되지 않는 아주 긴 비ASCII 주소(한글 약 900자 이상)는 저장에 실패할 수 있다.
--    화면이 만드는 주소는 경로와 퍼센트 인코딩된 ASCII 라 해당하지 않는다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM tb_bbs_scrap
        WHERE frst_rgtr_id IS NOT NULL AND scrap_url IS NOT NULL
        GROUP BY frst_rgtr_id, scrap_url
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'V2_136: 같은 사용자가 같은 주소로 남긴 스크랩이 둘 이상 있습니다. 남길 행을 업무 소유자가 정한 뒤 다시 적용하십시오.';
    END IF;
END $$;

ALTER TABLE tb_bbs_scrap
    ADD CONSTRAINT uk_tb_bbs_scrap_frst_rgtr_id_scrap_url UNIQUE (frst_rgtr_id, scrap_url);
