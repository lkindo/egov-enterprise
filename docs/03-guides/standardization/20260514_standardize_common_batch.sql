/*
 * DB Standardization Migration Script (Common Domain Batch) - Full Comments Included
 * Targets: tb_com_clsf_cd, tb_com_cd, tb_com_dtl_cd, tb_file_master, tb_file_detail, tb_menu_info, tb_menu_creat_dtls, tb_progrm_list, tb_bnr_info, tb_popup_info, tb_noti_info, tb_sitemap_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_com_clsf_cd
ALTER TABLE tb_com_clsf_cd 
    RENAME COLUMN cl_code TO clsf_cd,
    ALTER COLUMN clsf_cd TYPE VARCHAR(12),
    RENAME COLUMN cl_code_nm TO clsf_cd_nm,
    RENAME COLUMN cl_code_dc TO clsf_cd_expln,
    ALTER COLUMN clsf_cd_expln TYPE VARCHAR(4000),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_com_clsf_cd IS '공통분류코드';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd IS '분류코드';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd_nm IS '분류코드명';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd_expln IS '분류코드설명';
COMMENT ON COLUMN tb_com_clsf_cd.use_yn IS '사용여부';
COMMENT ON COLUMN tb_com_clsf_cd.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_com_clsf_cd.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_com_clsf_cd.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_com_clsf_cd.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_com_cd
ALTER TABLE tb_com_cd 
    RENAME COLUMN cl_code TO clsf_cd,
    ALTER COLUMN clsf_cd TYPE VARCHAR(12),
    RENAME COLUMN code_id TO com_cd,
    ALTER COLUMN com_cd TYPE VARCHAR(12),
    RENAME COLUMN code_id_nm TO com_cd_nm,
    RENAME COLUMN code_id_dc TO com_cd_expln,
    ALTER COLUMN com_cd_expln TYPE VARCHAR(4000),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_com_cd IS '공통코드';
COMMENT ON COLUMN tb_com_cd.clsf_cd IS '분류코드';
COMMENT ON COLUMN tb_com_cd.com_cd IS '공통코드아이디';
COMMENT ON COLUMN tb_com_cd.com_cd_nm IS '공통코드명';
COMMENT ON COLUMN tb_com_cd.com_cd_expln IS '공통코드설명';
COMMENT ON COLUMN tb_com_cd.use_yn IS '사용여부';
COMMENT ON COLUMN tb_com_cd.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_com_cd.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_com_cd.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_com_cd.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_com_dtl_cd
ALTER TABLE tb_com_dtl_cd 
    RENAME COLUMN code_id TO com_cd,
    ALTER COLUMN com_cd TYPE VARCHAR(12),
    RENAME COLUMN code TO dtl_cd,
    ALTER COLUMN dtl_cd TYPE VARCHAR(12),
    RENAME COLUMN code_nm TO dtl_cd_nm,
    RENAME COLUMN code_dc TO dtl_cd_expln,
    ALTER COLUMN dtl_cd_expln TYPE VARCHAR(4000),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_com_dtl_cd IS '공통상세코드';
COMMENT ON COLUMN tb_com_dtl_cd.com_cd IS '공통코드아이디';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd IS '상세코드';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd_nm IS '상세코드명';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd_expln IS '상세코드설명';
COMMENT ON COLUMN tb_com_dtl_cd.use_yn IS '사용여부';
COMMENT ON COLUMN tb_com_dtl_cd.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_com_dtl_cd.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_com_dtl_cd.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_com_dtl_cd.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_file_master
ALTER TABLE tb_file_master 
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_file_master IS '파일 마스터';
COMMENT ON COLUMN tb_file_master.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_file_master.use_yn IS '사용여부';
COMMENT ON COLUMN tb_file_master.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_file_master.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_file_master.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_file_master.last_mdfr_id IS '최종수정자아이디';

-- 5. tb_file_detail
ALTER TABLE tb_file_detail 
    RENAME COLUMN file_stre_cours TO file_stre_path,
    RENAME COLUMN file_cn TO file_expln,
    ALTER COLUMN file_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_file_detail IS '파일 상세';
COMMENT ON COLUMN tb_file_detail.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_file_detail.atch_file_sn IS '첨부파일일련번호';
COMMENT ON COLUMN tb_file_detail.file_stre_path IS '파일저장경로';
COMMENT ON COLUMN tb_file_detail.stre_file_nm IS '저장파일명';
COMMENT ON COLUMN tb_file_detail.orignl_file_nm IS '원래파일명';
COMMENT ON COLUMN tb_file_detail.file_extsn IS '파일확장자';
COMMENT ON COLUMN tb_file_detail.file_expln IS '파일설명';
COMMENT ON COLUMN tb_file_detail.file_sz IS '파일크기';
COMMENT ON COLUMN tb_file_detail.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_file_detail.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_file_detail.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_file_detail.last_mdfr_id IS '최종수정자아이디';

-- 6. tb_menu_info
ALTER TABLE tb_menu_info 
    RENAME COLUMN menu_nm TO menu_ttl,
    ALTER COLUMN menu_ttl TYPE VARCHAR(300),
    RENAME COLUMN menu_dc TO menu_expln,
    ALTER COLUMN menu_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_menu_info IS '메뉴 정보';
COMMENT ON COLUMN tb_menu_info.menu_no IS '메뉴번호';
COMMENT ON COLUMN tb_menu_info.menu_ttl IS '메뉴제목';
COMMENT ON COLUMN tb_menu_info.up_menu_no IS '상위메뉴번호';
COMMENT ON COLUMN tb_menu_info.menu_ordr IS '메뉴순서';
COMMENT ON COLUMN tb_menu_info.menu_expln IS '메뉴설명';
COMMENT ON COLUMN tb_menu_info.relate_image_path IS '관련이미지경로';
COMMENT ON COLUMN tb_menu_info.relate_image_nm IS '관련이미지명';
COMMENT ON COLUMN tb_menu_info.progrm_file_nm IS '프로그램파일명';
COMMENT ON COLUMN tb_menu_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_menu_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_menu_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_menu_info.last_mdfr_id IS '최종수정자아이디';

-- 7. tb_menu_creat_dtls
ALTER TABLE tb_menu_creat_dtls 
    RENAME COLUMN author_code TO auth_cd,
    ALTER COLUMN auth_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_menu_creat_dtls IS '메뉴 생성 내역';
COMMENT ON COLUMN tb_menu_creat_dtls.auth_cd IS '권한코드';
COMMENT ON COLUMN tb_menu_creat_dtls.menu_no IS '메뉴번호';
COMMENT ON COLUMN tb_menu_creat_dtls.mapng_creat_id IS '매핑생성아이디';
COMMENT ON COLUMN tb_menu_creat_dtls.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_menu_creat_dtls.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_menu_creat_dtls.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_menu_creat_dtls.last_mdfr_id IS '최종수정자아이디';

-- 8. tb_progrm_list
ALTER TABLE tb_progrm_list 
    RENAME COLUMN progrm_korean_nm TO progrm_nm,
    ALTER COLUMN progrm_nm TYPE VARCHAR(300),
    RENAME COLUMN progrm_dc TO progrm_expln,
    ALTER COLUMN progrm_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_progrm_list IS '프로그램 목록';
COMMENT ON COLUMN tb_progrm_list.progrm_file_nm IS '프로그램파일명';
COMMENT ON COLUMN tb_progrm_list.progrm_stre_path IS '프로그램저장경로';
COMMENT ON COLUMN tb_progrm_list.progrm_nm IS '프로그램명';
COMMENT ON COLUMN tb_progrm_list.progrm_expln IS '프로그램설명';
COMMENT ON COLUMN tb_progrm_list.url IS 'URL';
COMMENT ON COLUMN tb_progrm_list.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_progrm_list.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_progrm_list.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_progrm_list.last_mdfr_id IS '최종수정자아이디';

-- 9. tb_bnr_info
ALTER TABLE tb_bnr_info 
    RENAME COLUMN banner_id TO bnr_id,
    RENAME COLUMN banner_nm TO bnr_ttl,
    ALTER COLUMN bnr_ttl TYPE VARCHAR(300),
    RENAME COLUMN banner_dc TO bnr_expln,
    ALTER COLUMN bnr_expln TYPE VARCHAR(4000),
    RENAME COLUMN banner_image TO bnr_img_nm,
    RENAME COLUMN banner_image_file TO bnr_img_path,
    RENAME COLUMN reflct_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bnr_info IS '배너 정보';
COMMENT ON COLUMN tb_bnr_info.bnr_id IS '배너아이디';
COMMENT ON COLUMN tb_bnr_info.bnr_ttl IS '배너제목';
COMMENT ON COLUMN tb_bnr_info.bnr_expln IS '배너설명';
COMMENT ON COLUMN tb_bnr_info.bnr_img_nm IS '배너이미지명';
COMMENT ON COLUMN tb_bnr_info.bnr_img_path IS '배너이미지경로';
COMMENT ON COLUMN tb_bnr_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bnr_info.link_url IS '링크URL';
COMMENT ON COLUMN tb_bnr_info.sort_ordr IS '정렬순서';
COMMENT ON COLUMN tb_bnr_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bnr_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bnr_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bnr_info.last_mdfr_id IS '최종수정자아이디';

-- 10. tb_popup_info
ALTER TABLE tb_popup_info 
    RENAME COLUMN popup_sj_nm TO popup_ttl,
    ALTER COLUMN popup_ttl TYPE VARCHAR(300),
    RENAME COLUMN file_url TO popup_url,
    RENAME COLUMN popup_width_lc TO popup_w_loc,
    RENAME COLUMN popup_width_size TO popup_w_size,
    RENAME COLUMN popup_vrticl_lc TO popup_h_loc,
    RENAME COLUMN popup_vrticl_size TO popup_h_size,
    RENAME COLUMN ntce_bgnde TO ntce_bgng_ymd,
    ALTER COLUMN ntce_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN ntce_endde TO ntce_end_ymd,
    ALTER COLUMN ntce_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_popup_info IS '팝업 정보';
COMMENT ON COLUMN tb_popup_info.popup_id IS '팝업아이디';
COMMENT ON COLUMN tb_popup_info.popup_ttl IS '팝업제목';
COMMENT ON COLUMN tb_popup_info.popup_url IS '팝업URL';
COMMENT ON COLUMN tb_popup_info.popup_w_loc IS '팝업가로위치';
COMMENT ON COLUMN tb_popup_info.popup_w_size IS '팝업가로크기';
COMMENT ON COLUMN tb_popup_info.popup_h_loc IS '팝업세로위치';
COMMENT ON COLUMN tb_popup_info.popup_h_size IS '팝업세로크기';
COMMENT ON COLUMN tb_popup_info.ntce_bgng_ymd IS '게시시작일자';
COMMENT ON COLUMN tb_popup_info.ntce_end_ymd IS '게시종료일자';
COMMENT ON COLUMN tb_popup_info.stopvew_setup_yn IS '그만보기설정여부';
COMMENT ON COLUMN tb_popup_info.ntce_yn IS '게시여부';
COMMENT ON COLUMN tb_popup_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_popup_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_popup_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_popup_info.last_mdfr_id IS '최종수정자아이디';

-- 11. tb_noti_info
ALTER TABLE tb_noti_info 
    RENAME COLUMN ntcn_sj TO ntcn_ttl,
    ALTER COLUMN ntcn_ttl TYPE VARCHAR(300),
    RENAME COLUMN ntcn_cn TO ntcn_expln,
    ALTER COLUMN ntcn_expln TYPE VARCHAR(4000),
    RENAME COLUMN ntcn_tm TO ntcn_dt,
    RENAME COLUMN bh_ntcn_intrvl TO ntcn_intvl_val,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_noti_info IS '알림 정보';
COMMENT ON COLUMN tb_noti_info.ntcn_no IS '알림번호';
COMMENT ON COLUMN tb_noti_info.ntcn_ttl IS '알림제목';
COMMENT ON COLUMN tb_noti_info.ntcn_expln IS '알림내용';
COMMENT ON COLUMN tb_noti_info.ntcn_dt IS '알림일시';
COMMENT ON COLUMN tb_noti_info.ntcn_intvl_val IS '알림간격값';
COMMENT ON COLUMN tb_noti_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_noti_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_noti_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_noti_info.last_mdfr_id IS '최종수정자아이디';

-- 12. tb_sitemap_info
ALTER TABLE tb_sitemap_info 
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_sitemap_info IS '사이트맵 정보';
COMMENT ON COLUMN tb_sitemap_info.mapng_creat_id IS '매핑생성아이디';
COMMENT ON COLUMN tb_sitemap_info.creat_person_id IS '생성자아이디';
COMMENT ON COLUMN tb_sitemap_info.mapng_file_nm IS '매핑파일명';
COMMENT ON COLUMN tb_sitemap_info.mapng_file_path IS '매핑파일경로';
COMMENT ON COLUMN tb_sitemap_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_sitemap_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_sitemap_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_sitemap_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
