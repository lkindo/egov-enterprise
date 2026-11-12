-- V2_150: 기승인 프로젝트 복합 표준용어 97건 등록 및 일련번호 도메인 정합화 4건 반영 (GAP-STD-001).
--
-- [배경 및 승인 근거]
--   1. docs/04-operations/standard-metadata-disposition.md 표 1 의 대표 표준단어 조합 A 분류 94건(2026-10-16 기승인)과
--      오너 확정 A 분류 3건(ADMDST_ZONE_NM, CERT_DN_VL, SRVY_TRGT — 2026-11-10 기승인) 합계 97건을
--      meta_standard_terms 에 정식 등록한다(2026-11-12 V2_150 일괄 반영 및 공유 OCI DB 적용 승인).
--   2. 같은 문서 표 2 의 일련번호 도메인 폭 불일치 4건(ANS_SN, ARTCL_SN, PST_SN, UP_PST_SN)은 V2_49~V2_83
--      bigint 전환 이후 물리 11개 컬럼 전원이 bigint 로 운영 중이므로 표준 도메인 매핑을
--      일련번호N22 3건(ANS_SN·PST_SN·UP_PST_SN)·일련번호N10 1건(ARTCL_SN) → 일련번호N19 로 맞춘다.
--   3. 표 2 의 나머지 3건(OGNZ_ID, RPRS_TELNO, INSTT_ZIP)과 표 3 의 B 분류 비표준 약어 9건은 물리/API 계약 영향이 있어
--      이번 Expand 전용 마이그레이션에서 제외하고 후속 개별 배치로 남긴다.
--
-- [무중단·호환성]
--   meta_standard_terms 사전 행 추가·도메인 매핑 정정만 수행하며 업무 테이블(tb_*)의 물리 컬럼·제약·인덱스는 건드리지 않는다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
    expected_word RECORD;
    expected_domain RECORD;
BEGIN
    FOR expected_word IN SELECT * FROM (VALUES
        ('주소', 'ADDR'),
        ('행정구역', 'ADMDST'),
        ('신청자', 'APLCNT'),
        ('승인', 'APRV'),
        ('결재자', 'APRVR'),
        ('항목', 'ARTCL'),
        ('속성', 'ATRB'),
        ('결재', 'ATRZ'),
        ('게시판', 'BBS'),
        ('이전', 'BFR'),
        ('시작', 'BGNG'),
        ('배너', 'BNR'),
        ('볼드', 'BOLD'),
        ('함', 'BOX'),
        ('카테고리', 'CAT'),
        ('코드', 'CD'),
        ('인증', 'CERT'),
        ('변경', 'CHG'),
        ('분류', 'CLSF'),
        ('커뮤니티', 'CMNTY'),
        ('내용', 'CN'),
        ('접속', 'CNTN'),
        ('공통', 'COM'),
        ('직업', 'CR'),
        ('부서', 'DEPT'),
        ('정의', 'DFN'),
        ('만족도', 'DGSTFN'),
        ('일기', 'DIARY'),
        ('요청', 'DMND'),
        ('고유명', 'DN'),
        ('지시', 'DRCTN'),
        ('발신', 'DSPTCH'),
        ('일시', 'DT'),
        ('상세', 'DTL'),
        ('종료', 'END'),
        ('기업', 'ENT'),
        ('오류', 'ERR'),
        ('행사', 'EVNT'),
        ('설명', 'EXPLN'),
        ('성별', 'GNDR'),
        ('그룹', 'GROUP'),
        ('도움말', 'HLP'),
        ('이력', 'HSTRY'),
        ('아이디', 'ID'),
        ('비공식', 'IFML'),
        ('이미지', 'IMG'),
        ('중요도', 'IMPRT'),
        ('조회', 'INQ'),
        ('소개', 'INTRO'),
        ('IP', 'IP'),
        ('종류', 'KND'),
        ('회원', 'MBR'),
        ('메모', 'MEMO'),
        ('매뉴얼', 'MNL'),
        ('방법', 'MTHD'),
        ('사항', 'MTTR'),
        ('명', 'NM'),
        ('조직', 'OGNZ'),
        ('온라인', 'ONLN'),
        ('담당자', 'PIC'),
        ('장소', 'PLC'),
        ('정책', 'PLCY'),
        ('여론조사', 'POLL'),
        ('처리', 'PRCS'),
        ('질의응답', 'QNA'),
        ('질문', 'QSTN'),
        ('수신', 'RCPTN'),
        ('수신자', 'RCVR'),
        ('등록', 'REG'),
        ('반복', 'REPT'),
        ('보고', 'RPT'),
        ('보고자', 'RPTR'),
        ('결과', 'RSLT'),
        ('응답자', 'RSPDNT'),
        ('응답', 'RSPNS'),
        ('포상', 'RWRD'),
        ('일정', 'SCHDL'),
        ('구분', 'SE'),
        ('일련번호', 'SN'),
        ('발송자', 'SNDR'),
        ('설문', 'SRVY'),
        ('상태', 'STTS'),
        ('업무', 'TASK'),
        ('서식', 'TMPLT'),
        ('대상', 'TRGT'),
        ('제목', 'TTL'),
        ('유형', 'TYPE'),
        ('상위', 'UP'),
        ('사용자', 'USER'),
        ('값', 'VL'),
        ('일자', 'YMD'),
        ('여부', 'YN'),
        ('구역', 'ZONE')
    ) AS words(word_name, eng_abbr)
    LOOP
        IF NOT EXISTS (
            SELECT 1
              FROM meta_standard_words w
             WHERE w.word_name = expected_word.word_name
               AND w.eng_abbr = expected_word.eng_abbr
               AND w.rprs_yn = 'Y'
        ) THEN
            RAISE EXCEPTION 'Approved standard word is missing or not representative: % (%)',
                expected_word.eng_abbr, expected_word.word_name;
        END IF;
    END LOOP;

    FOR expected_domain IN SELECT * FROM (VALUES
        ('내용V1000'),
        ('내용V4000'),
        ('명V100'),
        ('명V20'),
        ('여부C1'),
        ('연월일C8'),
        ('연월일시분초D'),
        ('일련번호N19'),
        ('주소V45'),
        ('코드C12'),
        ('코드C3')
    ) AS domains(domain_name)
    LOOP
        IF NOT EXISTS (
            SELECT 1
              FROM meta_standard_domains d
             WHERE d.domain_name = expected_domain.domain_name
        ) THEN
            RAISE EXCEPTION 'Approved standard domain is missing: %', expected_domain.domain_name;
        END IF;
    END LOOP;
END $$;

INSERT INTO meta_standard_terms (term_name, eng_abbr, description, domain_name) VALUES
    ('행정구역코드', 'ADMDST_CD', '행정구역코드 (사용 테이블: tb_admdst_cd)', '코드C12'),
    ('행정구역구분코드', 'ADMDST_SE_CD', '행정구역구분코드 (사용 테이블: tb_admdst_cd)', '코드C12'),
    ('행정구역구역명', 'ADMDST_ZONE_NM', '행정구역구역명 (사용 테이블: tb_admdst_cd)', '명V100'),
    ('신청자아이디', 'APLCNT_ID', '신청자아이디 (사용 테이블: tb_ifml_atrz_info, tb_ifml_atrz_tmpr_strg)', '명V20'),
    ('결재자아이디', 'APRVR_ID', '결재자아이디 (사용 테이블: tb_ifml_atrz_info)', '명V20'),
    ('게시판속성코드', 'BBS_ATRB_CD', '게시판속성코드 (사용 테이블: tb_bbs_master)', '코드C12'),
    ('게시판변경이력일련번호', 'BBS_CHG_HSTRY_SN', '게시판변경이력일련번호 (사용 테이블: tb_bbs_chg_hstry)', '일련번호N19'),
    ('게시판아이디', 'BBS_ID', '게시판아이디 (사용 테이블: tb_bbs_chg_hstry, tb_bbs_comment, tb_bbs_item, tb_bbs_master, tb_bbs_master_optn, tb_bbs_scrap, tb_bbs_use_info, tb_dgstfn_info, tb_dta_use_stats)', '명V20'),
    ('게시판유형코드', 'BBS_TYPE_CD', '게시판유형코드 (사용 테이블: tb_bbs_master)', '코드C12'),
    ('이전사용자아이디', 'BFR_USER_ID', '이전사용자아이디 (사용 테이블: tb_ifml_atrz_prcs_hstry)', '명V20'),
    ('배너이미지명', 'BNR_IMG_NM', '배너이미지명 (사용 테이블: tb_bnr_info)', '명V100'),
    ('배너명', 'BNR_NM', '배너명 (사용 테이블: tb_bnr_info)', '명V100'),
    ('코드아이디', 'CD_ID', '코드아이디 (사용 테이블: tb_com_cd, tb_com_cd_chg_hstry, tb_com_dtl_cd)', '명V20'),
    ('코드아이디설명', 'CD_ID_EXPLN', '코드아이디설명 (사용 테이블: tb_com_cd)', '내용V4000'),
    ('코드아이디명', 'CD_ID_NM', '코드아이디명 (사용 테이블: tb_com_cd)', '명V100'),
    ('인증고유명값', 'CERT_DN_VL', '인증고유명값 (사용 테이블: tb_user_info)', '명V100'),
    ('분류코드', 'CLSF_CD', '분류코드 (사용 테이블: tb_com_cd, tb_com_cd_chg_hstry, tb_com_clsf_cd)', '코드C12'),
    ('분류코드설명', 'CLSF_CD_EXPLN', '분류코드설명 (사용 테이블: tb_com_clsf_cd)', '내용V4000'),
    ('커뮤니티소개내용', 'CMNTY_INTRO_CN', '커뮤니티소개내용 (사용 테이블: tb_cmnty_info)', '내용V4000'),
    ('접속방법코드', 'CNTN_MTHD_CD', '접속방법코드 (사용 테이블: tb_login_log)', '코드C12'),
    ('공통코드변경이력일련번호', 'COM_CD_CHG_HSTRY_SN', '공통코드변경이력일련번호 (사용 테이블: tb_com_cd_chg_hstry)', '일련번호N19'),
    ('직업유형코드', 'CR_TYPE_CD', '직업유형코드 (사용 테이블: tb_extrl_hr_info, tb_srvy_rspdnt)', '코드C12'),
    ('부서아이디', 'DEPT_ID', '부서아이디 (사용 테이블: tb_dept_job_bx)', '명V20'),
    ('부서업무함명', 'DEPT_TASK_BOX_NM', '부서업무함명 (사용 테이블: tb_dept_job_bx)', '명V100'),
    ('부서업무명', 'DEPT_TASK_NM', '부서업무명 (사용 테이블: tb_dept_task_info)', '명V100'),
    ('만족도일련번호', 'DGSTFN_SN', '만족도일련번호 (사용 테이블: tb_dgstfn_info)', '일련번호N19'),
    ('일기명', 'DIARY_NM', '일기명 (사용 테이블: tb_diary_info)', '명V100'),
    ('요청사용자아이디', 'DMND_USER_ID', '요청사용자아이디 (사용 테이블: tb_privacy_log, tb_sys_log, tb_user_log, tb_web_log)', '명V20'),
    ('요청사용자IP주소', 'DMND_USER_IP_ADDR', '요청사용자IP주소 (사용 테이블: tb_privacy_log, tb_sys_log, tb_web_log)', '주소V45'),
    ('지시사항', 'DRCTN_MTTR', '지시사항 (사용 테이블: tb_diary_info, tb_memo_rpt_info)', '내용V4000'),
    ('지시사항등록일시', 'DRCTN_MTTR_REG_DT', '지시사항등록일시 (사용 테이블: tb_memo_rpt_info)', '연월일시분초D'),
    ('발신결과코드', 'DSPTCH_RSLT_CD', '발신결과코드 (사용 테이블: tb_email_dsptch_manage)', '코드C12'),
    ('상세코드', 'DTL_CD', '상세코드 (사용 테이블: tb_com_cd_chg_hstry, tb_com_dtl_cd)', '코드C12'),
    ('상세코드명', 'DTL_CD_NM', '상세코드명 (사용 테이블: tb_com_dtl_cd)', '명V100'),
    ('기업구분코드', 'ENT_SE_CD', '기업구분코드 (사용 테이블: tb_user_info)', '코드C12'),
    ('오류코드', 'ERR_CD', '오류코드 (사용 테이블: tb_login_log, tb_sys_log)', '코드C12'),
    ('오류구분코드', 'ERR_SE_CD', '오류구분코드 (사용 테이블: tb_sys_log)', '코드C12'),
    ('행사승인일자', 'EVNT_APRV_YMD', '행사승인일자 (사용 테이블: tb_event_info)', '연월일C8'),
    ('행사승인여부', 'EVNT_APRV_YN', '행사승인여부 (사용 테이블: tb_event_info)', '여부C1'),
    ('행사유형코드', 'EVNT_TYPE_CD', '행사유형코드 (사용 테이블: tb_event_info)', '코드C12'),
    ('성별코드', 'GNDR_CD', '성별코드 (사용 테이블: tb_extrl_hr_info, tb_srvy_rspdnt, tb_user_info)', '코드C12'),
    ('그룹아이디', 'GROUP_ID', '그룹아이디 (사용 테이블: tb_authrt_group_info, tb_user_info)', '명V20'),
    ('도움말정의', 'HLP_DFN', '도움말정의 (사용 테이블: tb_hlp_info)', '내용V1000'),
    ('도움말구분코드', 'HLP_SE_CD', '도움말구분코드 (사용 테이블: tb_hlp_info)', '코드C3'),
    ('비공식결재처리이력일련번호', 'IFML_ATRZ_PRCS_HSTRY_SN', '비공식결재처리이력일련번호 (사용 테이블: tb_ifml_atrz_prcs_hstry)', '일련번호N19'),
    ('회원상태코드', 'MBR_STTS_CD', '회원상태코드 (사용 테이블: tb_cmnty_user_map)', '코드C12'),
    ('메모보고일자', 'MEMO_RPT_YMD', '메모보고일자 (사용 테이블: tb_memo_rpt_info)', '연월일C8'),
    ('조직아이디', 'OGNZ_ID', '조직아이디 (사용 테이블: tb_ognz_info, tb_user_info)', '명V20'),
    ('온라인매뉴얼정의', 'ONLN_MNL_DFN', '온라인매뉴얼정의 (사용 테이블: tb_onln_mnl_info)', '내용V4000'),
    ('온라인매뉴얼설명', 'ONLN_MNL_EXPLN', '온라인매뉴얼설명 (사용 테이블: tb_onln_mnl_info)', '내용V4000'),
    ('온라인매뉴얼명', 'ONLN_MNL_NM', '온라인매뉴얼명 (사용 테이블: tb_onln_mnl_info)', '명V100'),
    ('온라인매뉴얼구분코드', 'ONLN_MNL_SE_CD', '온라인매뉴얼구분코드 (사용 테이블: tb_onln_mnl_info)', '코드C12'),
    ('담당자아이디', 'PIC_ID', '담당자아이디 (사용 테이블: tb_dept_task_info)', '명V20'),
    ('정책유형코드', 'PLCY_TYPE_CD', '정책유형코드 (사용 테이블: tb_plcy_manage)', '코드C12'),
    ('여론조사항목명', 'POLL_ARTCL_NM', '여론조사항목명 (사용 테이블: tb_onln_poll_artcl)', '명V100'),
    ('여론조사시작일자', 'POLL_BGNG_YMD', '여론조사시작일자 (사용 테이블: tb_onln_poll_manage)', '연월일C8'),
    ('여론조사종료일자', 'POLL_END_YMD', '여론조사종료일자 (사용 테이블: tb_onln_poll_manage)', '연월일C8'),
    ('여론조사종류코드', 'POLL_KND_CD', '여론조사종류코드 (사용 테이블: tb_onln_poll_manage)', '코드C12'),
    ('여론조사명', 'POLL_NM', '여론조사명 (사용 테이블: tb_onln_poll_manage)', '명V100'),
    ('처리구분코드', 'PRCS_SE_CD', '처리구분코드 (사용 테이블: tb_sys_log)', '코드C12'),
    ('처리유형코드', 'PRCS_TYPE_CD', '처리유형코드 (사용 테이블: tb_ifml_atrz_prcs_hstry)', '코드C12'),
    ('질의응답카테고리코드', 'QNA_CAT_CD', '질의응답카테고리코드 (사용 테이블: tb_bbs_item)', '코드C12'),
    ('질의응답상태코드', 'QNA_STTS_CD', '질의응답상태코드 (사용 테이블: tb_bbs_item)', '코드C12'),
    ('질문일련번호', 'QSTN_SN', '질문일련번호 (사용 테이블: tb_srvy_qstn)', '일련번호N19'),
    ('질문유형코드', 'QSTN_TYPE_CD', '질문유형코드 (사용 테이블: tb_srvy_qstn)', '코드C12'),
    ('수신구분코드', 'RCPTN_SE_CD', '수신구분코드 (사용 테이블: tb_note_rcptn)', '코드C12'),
    ('수신자아이디', 'RCVR_ID', '수신자아이디 (사용 테이블: tb_email_dsptch_manage, tb_note_rcptn, tb_sms_rcptn, tb_user_noti)', '명V20'),
    ('등록구분코드', 'REG_SE_CD', '등록구분코드 (사용 테이블: tb_cmnty_info)', '코드C12'),
    ('반복구분코드', 'REPT_SE_CD', '반복구분코드 (사용 테이블: tb_schdl_info)', '코드C12'),
    ('보고구분코드', 'RPT_SE_CD', '보고구분코드 (사용 테이블: tb_rpt_info)', '코드C12'),
    ('보고상태코드', 'RPT_STTS_CD', '보고상태코드 (사용 테이블: tb_rpt_info)', '코드C12'),
    ('보고자아이디', 'RPTR_ID', '보고자아이디 (사용 테이블: tb_memo_rpt_info)', '명V20'),
    ('보고자조회일시', 'RPTR_INQ_DT', '보고자조회일시 (사용 테이블: tb_memo_rpt_info)', '연월일시분초D'),
    ('결과코드', 'RSLT_CD', '결과코드 (사용 테이블: tb_sms_rcptn)', '코드C12'),
    ('응답코드', 'RSPNS_CD', '응답코드 (사용 테이블: tb_sys_log)', '코드C12'),
    ('포상코드', 'RWRD_CD', '포상코드 (사용 테이블: tb_rward_manage)', '코드C12'),
    ('포상사용자아이디', 'RWRD_USER_ID', '포상사용자아이디 (사용 테이블: tb_rward_manage)', '명V20'),
    ('일정부서아이디', 'SCHDL_DEPT_ID', '일정부서아이디 (사용 테이블: tb_schdl_info)', '명V20'),
    ('일정중요도코드', 'SCHDL_IMPRT_CD', '일정중요도코드 (사용 테이블: tb_schdl_info)', '코드C12'),
    ('일정종류코드', 'SCHDL_KND_CD', '일정종류코드 (사용 테이블: tb_schdl_info)', '코드C12'),
    ('일정담당자아이디', 'SCHDL_PIC_ID', '일정담당자아이디 (사용 테이블: tb_schdl_info)', '명V20'),
    ('일정장소명', 'SCHDL_PLC_NM', '일정장소명 (사용 테이블: tb_schdl_info)', '명V100'),
    ('일정구분코드', 'SCHDL_SE_CD', '일정구분코드 (사용 테이블: tb_schdl_info)', '코드C12'),
    ('발송자아이디', 'SNDR_ID', '발송자아이디 (사용 테이블: tb_note_sndng)', '명V20'),
    ('설문응답자아이디', 'SRVY_RSPDNT_ID', '설문응답자아이디 (사용 테이블: tb_srvy_rspdnt)', '명V20'),
    ('설문서식유형코드', 'SRVY_TMPLT_TYPE_CD', '설문서식유형코드 (사용 테이블: tb_srvy_tmplt)', '코드C12'),
    ('설문대상', 'SRVY_TRGT', '설문대상 (사용 테이블: tb_srvy_info)', '내용V1000'),
    ('업무구분코드', 'TASK_SE_CD', '업무구분코드 (사용 테이블: tb_ifml_atrz_hstry, tb_ifml_atrz_info, tb_ifml_atrz_tmpr_strg)', '코드C12'),
    ('서식아이디', 'TMPLT_ID', '서식아이디 (사용 테이블: tb_bbs_master, tb_cmnty_info, tb_tmplt_info)', '명V20'),
    ('서식구분코드', 'TMPLT_SE_CD', '서식구분코드 (사용 테이블: tb_tmplt_info)', '코드C12'),
    ('대상아이디', 'TRGT_ID', '대상아이디 (사용 테이블: tb_bbs_use_info)', '명V20'),
    ('대상사용자아이디', 'TRGT_USER_ID', '대상사용자아이디 (사용 테이블: tb_ifml_atrz_prcs_hstry)', '명V20'),
    ('제목볼드여부', 'TTL_BOLD_YN', '제목볼드여부 (사용 테이블: tb_bbs_item)', '여부C1'),
    ('상위행정구역코드', 'UP_ADMDST_CD', '상위행정구역코드 (사용 테이블: tb_admdst_cd)', '코드C12'),
    ('상위조직아이디', 'UP_OGNZ_ID', '상위조직아이디 (사용 테이블: tb_ognz_info)', '명V20'),
    ('사용자상태코드', 'USER_STTS_CD', '사용자상태코드 (사용 테이블: tb_user_info)', '코드C12'),
    ('사용자유형코드', 'USER_TYPE_CD', '사용자유형코드 (사용 테이블: tb_user_info)', '코드C12')
ON CONFLICT (eng_abbr) DO NOTHING;

UPDATE meta_standard_terms
   SET domain_name = '일련번호N19'
 WHERE eng_abbr IN ('ANS_SN', 'ARTCL_SN', 'PST_SN', 'UP_PST_SN')
   AND domain_name <> '일련번호N19';

DO $$
DECLARE
    expected_term RECORD;
BEGIN
    FOR expected_term IN SELECT * FROM (VALUES
        ('ADMDST_CD', '행정구역코드', '코드C12'),
        ('ADMDST_SE_CD', '행정구역구분코드', '코드C12'),
        ('ADMDST_ZONE_NM', '행정구역구역명', '명V100'),
        ('ANS_SN', '답변일련번호', '일련번호N19'),
        ('APLCNT_ID', '신청자아이디', '명V20'),
        ('APRVR_ID', '결재자아이디', '명V20'),
        ('ARTCL_SN', '항목일련번호', '일련번호N19'),
        ('BBS_ATRB_CD', '게시판속성코드', '코드C12'),
        ('BBS_CHG_HSTRY_SN', '게시판변경이력일련번호', '일련번호N19'),
        ('BBS_ID', '게시판아이디', '명V20'),
        ('BBS_TYPE_CD', '게시판유형코드', '코드C12'),
        ('BFR_USER_ID', '이전사용자아이디', '명V20'),
        ('BNR_IMG_NM', '배너이미지명', '명V100'),
        ('BNR_NM', '배너명', '명V100'),
        ('CD_ID', '코드아이디', '명V20'),
        ('CD_ID_EXPLN', '코드아이디설명', '내용V4000'),
        ('CD_ID_NM', '코드아이디명', '명V100'),
        ('CERT_DN_VL', '인증고유명값', '명V100'),
        ('CLSF_CD', '분류코드', '코드C12'),
        ('CLSF_CD_EXPLN', '분류코드설명', '내용V4000'),
        ('CMNTY_INTRO_CN', '커뮤니티소개내용', '내용V4000'),
        ('CNTN_MTHD_CD', '접속방법코드', '코드C12'),
        ('COM_CD_CHG_HSTRY_SN', '공통코드변경이력일련번호', '일련번호N19'),
        ('CR_TYPE_CD', '직업유형코드', '코드C12'),
        ('DEPT_ID', '부서아이디', '명V20'),
        ('DEPT_TASK_BOX_NM', '부서업무함명', '명V100'),
        ('DEPT_TASK_NM', '부서업무명', '명V100'),
        ('DGSTFN_SN', '만족도일련번호', '일련번호N19'),
        ('DIARY_NM', '일기명', '명V100'),
        ('DMND_USER_ID', '요청사용자아이디', '명V20'),
        ('DMND_USER_IP_ADDR', '요청사용자IP주소', '주소V45'),
        ('DRCTN_MTTR', '지시사항', '내용V4000'),
        ('DRCTN_MTTR_REG_DT', '지시사항등록일시', '연월일시분초D'),
        ('DSPTCH_RSLT_CD', '발신결과코드', '코드C12'),
        ('DTL_CD', '상세코드', '코드C12'),
        ('DTL_CD_NM', '상세코드명', '명V100'),
        ('ENT_SE_CD', '기업구분코드', '코드C12'),
        ('ERR_CD', '오류코드', '코드C12'),
        ('ERR_SE_CD', '오류구분코드', '코드C12'),
        ('EVNT_APRV_YMD', '행사승인일자', '연월일C8'),
        ('EVNT_APRV_YN', '행사승인여부', '여부C1'),
        ('EVNT_TYPE_CD', '행사유형코드', '코드C12'),
        ('GNDR_CD', '성별코드', '코드C12'),
        ('GROUP_ID', '그룹아이디', '명V20'),
        ('HLP_DFN', '도움말정의', '내용V1000'),
        ('HLP_SE_CD', '도움말구분코드', '코드C3'),
        ('IFML_ATRZ_PRCS_HSTRY_SN', '비공식결재처리이력일련번호', '일련번호N19'),
        ('MBR_STTS_CD', '회원상태코드', '코드C12'),
        ('MEMO_RPT_YMD', '메모보고일자', '연월일C8'),
        ('OGNZ_ID', '조직아이디', '명V20'),
        ('ONLN_MNL_DFN', '온라인매뉴얼정의', '내용V4000'),
        ('ONLN_MNL_EXPLN', '온라인매뉴얼설명', '내용V4000'),
        ('ONLN_MNL_NM', '온라인매뉴얼명', '명V100'),
        ('ONLN_MNL_SE_CD', '온라인매뉴얼구분코드', '코드C12'),
        ('PIC_ID', '담당자아이디', '명V20'),
        ('PLCY_TYPE_CD', '정책유형코드', '코드C12'),
        ('POLL_ARTCL_NM', '여론조사항목명', '명V100'),
        ('POLL_BGNG_YMD', '여론조사시작일자', '연월일C8'),
        ('POLL_END_YMD', '여론조사종료일자', '연월일C8'),
        ('POLL_KND_CD', '여론조사종류코드', '코드C12'),
        ('POLL_NM', '여론조사명', '명V100'),
        ('PRCS_SE_CD', '처리구분코드', '코드C12'),
        ('PRCS_TYPE_CD', '처리유형코드', '코드C12'),
        ('PST_SN', '게시물일련번호', '일련번호N19'),
        ('QNA_CAT_CD', '질의응답카테고리코드', '코드C12'),
        ('QNA_STTS_CD', '질의응답상태코드', '코드C12'),
        ('QSTN_SN', '질문일련번호', '일련번호N19'),
        ('QSTN_TYPE_CD', '질문유형코드', '코드C12'),
        ('RCPTN_SE_CD', '수신구분코드', '코드C12'),
        ('RCVR_ID', '수신자아이디', '명V20'),
        ('REG_SE_CD', '등록구분코드', '코드C12'),
        ('REPT_SE_CD', '반복구분코드', '코드C12'),
        ('RPT_SE_CD', '보고구분코드', '코드C12'),
        ('RPT_STTS_CD', '보고상태코드', '코드C12'),
        ('RPTR_ID', '보고자아이디', '명V20'),
        ('RPTR_INQ_DT', '보고자조회일시', '연월일시분초D'),
        ('RSLT_CD', '결과코드', '코드C12'),
        ('RSPNS_CD', '응답코드', '코드C12'),
        ('RWRD_CD', '포상코드', '코드C12'),
        ('RWRD_USER_ID', '포상사용자아이디', '명V20'),
        ('SCHDL_DEPT_ID', '일정부서아이디', '명V20'),
        ('SCHDL_IMPRT_CD', '일정중요도코드', '코드C12'),
        ('SCHDL_KND_CD', '일정종류코드', '코드C12'),
        ('SCHDL_PIC_ID', '일정담당자아이디', '명V20'),
        ('SCHDL_PLC_NM', '일정장소명', '명V100'),
        ('SCHDL_SE_CD', '일정구분코드', '코드C12'),
        ('SNDR_ID', '발송자아이디', '명V20'),
        ('SRVY_RSPDNT_ID', '설문응답자아이디', '명V20'),
        ('SRVY_TMPLT_TYPE_CD', '설문서식유형코드', '코드C12'),
        ('SRVY_TRGT', '설문대상', '내용V1000'),
        ('TASK_SE_CD', '업무구분코드', '코드C12'),
        ('TMPLT_ID', '서식아이디', '명V20'),
        ('TMPLT_SE_CD', '서식구분코드', '코드C12'),
        ('TRGT_ID', '대상아이디', '명V20'),
        ('TRGT_USER_ID', '대상사용자아이디', '명V20'),
        ('TTL_BOLD_YN', '제목볼드여부', '여부C1'),
        ('UP_ADMDST_CD', '상위행정구역코드', '코드C12'),
        ('UP_OGNZ_ID', '상위조직아이디', '명V20'),
        ('UP_PST_SN', '상위게시물일련번호', '일련번호N19'),
        ('USER_STTS_CD', '사용자상태코드', '코드C12'),
        ('USER_TYPE_CD', '사용자유형코드', '코드C12')
    ) AS terms(eng_abbr, term_name, domain_name)
    LOOP
        IF (
            SELECT count(*)
              FROM meta_standard_terms t
             WHERE t.eng_abbr = expected_term.eng_abbr
               AND t.term_name = expected_term.term_name
               AND t.domain_name = expected_term.domain_name
               AND t.deprecated_yn = 'N'
        ) <> 1 THEN
            RAISE EXCEPTION 'Approved standard term verification failed: % (expected % / %)',
                expected_term.eng_abbr, expected_term.term_name, expected_term.domain_name;
        END IF;
    END LOOP;
END $$;
