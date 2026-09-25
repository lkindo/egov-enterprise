-- DEC-OPS-139(DIP B1b I6 ④⑤): 게시글 추천과 만족도를 한 사람당 한 번으로 묶는다.
--
-- ① 추천 이력 테이블. 종전 추천은 tb_bbs_item.like_cnt 를 올리기만 해서 같은 사람이 몇 번이고 누를 수 있었다.
--    (게시글, 사용자 esntlId) 를 PK 로 두어 두 번째 추천을 DB 가 거부한다. 게시글은 논리 삭제만 하므로
--    게시글 FK 는 NO ACTION 이다. 이 변경 전의 like_cnt 값은 이력이 없으므로 그대로 둔다.
-- ② 만족도 1인 1건. 작성자(frst_rgtr_id, loginId)가 같은 게시글에 둘 이상 남기지 못한다. 논리 삭제한
--    평가를 다시 남기면 서비스가 같은 행을 되살리므로 부분 조건 없이 전체 UNIQUE 로 충분하다.
--    작성자가 없는 레거시 행(NULL)은 UNIQUE 에서 서로 충돌하지 않는다.
--    중복이 이미 있으면 어느 쪽을 남길지 정할 수 없어 이 마이그레이션을 멈춘다(데이터를 지어내거나 지우지 않는다).
--    2026-09-26 OCI 읽기 실측: 만족도 0행, 중복 그룹 0.
-- ③ 점수 범위 1~5. 화면과 요청 검증이 이미 같은 범위를 쓴다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE tb_bbs_rcmdtn_hstry (
    pst_sn bigint NOT NULL,
    user_id varchar(20) NOT NULL,
    frst_rgtr_id varchar(20),
    crt_dt timestamp,
    last_mdfr_id varchar(20),
    mdfcn_dt timestamp,
    CONSTRAINT pk_tb_bbs_rcmdtn_hstry PRIMARY KEY (pst_sn, user_id),
    CONSTRAINT fk_tb_bbs_rcmdtn_hstry_tb_bbs_item FOREIGN KEY (pst_sn) REFERENCES tb_bbs_item (pst_sn)
);

COMMENT ON TABLE tb_bbs_rcmdtn_hstry IS '게시판추천이력';
COMMENT ON COLUMN tb_bbs_rcmdtn_hstry.pst_sn IS '게시물일련번호';
COMMENT ON COLUMN tb_bbs_rcmdtn_hstry.user_id IS '사용자ID (esntlId)';
COMMENT ON COLUMN tb_bbs_rcmdtn_hstry.frst_rgtr_id IS '최초등록자ID';
COMMENT ON COLUMN tb_bbs_rcmdtn_hstry.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_rcmdtn_hstry.last_mdfr_id IS '최종수정자ID';
COMMENT ON COLUMN tb_bbs_rcmdtn_hstry.mdfcn_dt IS '수정일시';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM tb_dgstfn_info
        WHERE frst_rgtr_id IS NOT NULL
        GROUP BY bbs_id, pst_sn, frst_rgtr_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'V2_107: 같은 사용자가 같은 게시글에 남긴 만족도가 둘 이상 있습니다. 남길 행을 업무 소유자가 정한 뒤 다시 적용하십시오.';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_dgstfn_info WHERE dgstfn_scr NOT BETWEEN 1 AND 5) THEN
        RAISE EXCEPTION 'V2_107: 1~5 범위를 벗어난 만족도 점수가 있습니다. 값을 업무 소유자가 확인한 뒤 다시 적용하십시오.';
    END IF;
END $$;

ALTER TABLE tb_dgstfn_info
    ADD CONSTRAINT uk_tb_dgstfn_info_pst_rgtr UNIQUE (bbs_id, pst_sn, frst_rgtr_id);
ALTER TABLE tb_dgstfn_info
    ADD CONSTRAINT ck_tb_dgstfn_info_dgstfn_scr CHECK (dgstfn_scr BETWEEN 1 AND 5);
