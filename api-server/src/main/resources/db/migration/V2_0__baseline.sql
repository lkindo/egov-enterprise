--
-- PostgreSQL database dump
--


-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: answer_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.answer_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ecopseq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ecopseq (
    table_name character varying(20) NOT NULL,
    next_id character varying(30),
    frst_reg_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(30),
    last_updusr_id character varying(30)
);


--
-- Name: TABLE ecopseq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ecopseq IS 'ecopseq 테이블';


--
-- Name: COLUMN ecopseq.table_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.table_name IS 'table name';


--
-- Name: COLUMN ecopseq.next_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.next_id IS 'NEXT아이디';


--
-- Name: COLUMN ecopseq.frst_reg_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.frst_reg_pnttm IS '최초 등록 pnttm';


--
-- Name: COLUMN ecopseq.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.last_updt_pnttm IS '최종 갱신 pnttm';


--
-- Name: COLUMN ecopseq.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.frst_register_id IS '최초 register 아이디';


--
-- Name: COLUMN ecopseq.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.last_updusr_id IS '최종 updusr 아이디';


--
-- Name: ids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ids (
    table_name character varying(20) NOT NULL,
    next_id character varying(30) NOT NULL,
    frst_reg_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(30),
    last_updusr_id character varying(30)
);


--
-- Name: TABLE ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ids IS 'ids 테이블';


--
-- Name: COLUMN ids.table_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ids.table_name IS 'table name';


--
-- Name: COLUMN ids.next_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ids.next_id IS 'next 아이디';


--
-- Name: COLUMN ids.frst_reg_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ids.frst_reg_pnttm IS '최초 등록 pnttm';


--
-- Name: COLUMN ids.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ids.last_updt_pnttm IS '최종 갱신 pnttm';


--
-- Name: COLUMN ids.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ids.frst_register_id IS '최초 register 아이디';


--
-- Name: COLUMN ids.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ids.last_updusr_id IS '최종 updusr 아이디';


--
-- Name: meta_standard_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meta_standard_domains (
    id integer NOT NULL,
    domain_group character varying(100),
    domain_name character varying(100),
    data_type character varying(50),
    data_length integer
);


--
-- Name: TABLE meta_standard_domains; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.meta_standard_domains IS 'standard domains 테이블';


--
-- Name: COLUMN meta_standard_domains.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_domains.id IS '아이디';


--
-- Name: COLUMN meta_standard_domains.domain_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_domains.domain_group IS 'domain 그룹';


--
-- Name: COLUMN meta_standard_domains.domain_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_domains.domain_name IS 'domain name';


--
-- Name: COLUMN meta_standard_domains.data_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_domains.data_type IS '자료 유형';


--
-- Name: COLUMN meta_standard_domains.data_length; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_domains.data_length IS '자료 length';


--
-- Name: meta_standard_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meta_standard_terms (
    id integer NOT NULL,
    term_name character varying(255),
    eng_name character varying(255),
    eng_abbr character varying(100),
    description text
);


--
-- Name: TABLE meta_standard_terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.meta_standard_terms IS 'standard terms 테이블';


--
-- Name: COLUMN meta_standard_terms.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_terms.id IS '아이디';


--
-- Name: COLUMN meta_standard_terms.term_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_terms.term_name IS '기한 name';


--
-- Name: COLUMN meta_standard_terms.eng_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_terms.eng_name IS '영문 name';


--
-- Name: COLUMN meta_standard_terms.eng_abbr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_terms.eng_abbr IS '영문 약어';


--
-- Name: COLUMN meta_standard_terms.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_terms.description IS 'description';


--
-- Name: meta_standard_words; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meta_standard_words (
    word_name character varying(255),
    eng_abbr character varying(255),
    word_dc text
);


--
-- Name: TABLE meta_standard_words; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.meta_standard_words IS 'standard words 테이블';


--
-- Name: COLUMN meta_standard_words.word_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_words.word_name IS '단어 name';


--
-- Name: COLUMN meta_standard_words.eng_abbr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_words.eng_abbr IS '영문 약어';


--
-- Name: COLUMN meta_standard_words.word_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meta_standard_words.word_dc IS '단어 설명';


--
-- Name: ntt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ntt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pst_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pst_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: revinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revinfo (
    rev bigint NOT NULL,
    revtstmp bigint,
    frst_reg_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(30),
    last_updusr_id character varying(30)
);


--
-- Name: revinfo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.revinfo_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_meta_standard_domains; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_meta_standard_domains
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_meta_standard_domains; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seq_meta_standard_domains OWNED BY public.meta_standard_domains.id;


--
-- Name: seq_meta_standard_terms; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_meta_standard_terms
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_meta_standard_terms; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seq_meta_standard_terms OWNED BY public.meta_standard_terms.id;


--
-- Name: tb_hldy_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_hldy_info (
    hldy_sn integer NOT NULL,
    hldy_se_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    hldy_ymd character varying(8),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    hldy_nm character varying(100),
    hldy_expln character varying(4000)
);


--
-- Name: TABLE tb_hldy_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_hldy_info IS '휴일정보 (tb_hldy_info)';


--
-- Name: COLUMN tb_hldy_info.hldy_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.hldy_sn IS '휴일일련번호 (hldy_sn)';


--
-- Name: COLUMN tb_hldy_info.hldy_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.hldy_se_cd IS '휴일구분코드 (hldy_se_cd)';


--
-- Name: COLUMN tb_hldy_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_hldy_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_hldy_info.hldy_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.hldy_ymd IS '휴일일자 (hldy_ymd)';


--
-- Name: COLUMN tb_hldy_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_hldy_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_hldy_info.hldy_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.hldy_nm IS '휴일명 (hldy_nm)';


--
-- Name: COLUMN tb_hldy_info.hldy_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hldy_info.hldy_expln IS '휴일설명 (hldy_expln)';


--
-- Name: seq_tb_hldy_info; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tb_hldy_info ALTER COLUMN hldy_sn ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.seq_tb_hldy_info
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sq_dgstfn_sn; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sq_dgstfn_sn
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_adbk_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_adbk_info (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    adbk_constnt_id character varying(20) NOT NULL,
    adbk_id character varying(20) NOT NULL,
    user_id character varying(20),
    frst_rgtr_id character varying(20),
    fax_no character varying(11),
    home_telno character varying(11),
    last_mdfr_id character varying(20),
    mbl_telno character varying(11),
    ofc_telno character varying(11),
    eml_addr character varying(50),
    nm character varying(100)
);


--
-- Name: TABLE tb_adbk_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_adbk_info IS '주소록정보 (tb_adbk_info)';


--
-- Name: COLUMN tb_adbk_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_adbk_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_adbk_info.adbk_constnt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.adbk_constnt_id IS '주소록상수아이디 (adbk_constnt_id)';


--
-- Name: COLUMN tb_adbk_info.adbk_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.adbk_id IS '주소록아이디 (adbk_id)';


--
-- Name: COLUMN tb_adbk_info.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_adbk_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_adbk_info.fax_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.fax_no IS '팩스번호 (fax_no)';


--
-- Name: COLUMN tb_adbk_info.home_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.home_telno IS '자택전화번호 (home_telno)';


--
-- Name: COLUMN tb_adbk_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_adbk_info.mbl_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.mbl_telno IS '휴대전화번호 (mbl_telno)';


--
-- Name: COLUMN tb_adbk_info.ofc_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.ofc_telno IS '사무실전화번호 (ofc_telno)';


--
-- Name: COLUMN tb_adbk_info.eml_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.eml_addr IS '이메일주소 (eml_addr)';


--
-- Name: COLUMN tb_adbk_info.nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_info.nm IS '명 (nm)';


--
-- Name: tb_adbk_manage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_adbk_manage (
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    adbk_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    rls_scope_cd character varying(12),
    trget_ognz_id character varying(20),
    wrter_id character varying(20),
    adbk_nm character varying(100) NOT NULL
);


--
-- Name: TABLE tb_adbk_manage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_adbk_manage IS '주소록관리 (tb_adbk_manage)';


--
-- Name: COLUMN tb_adbk_manage.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_adbk_manage.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_adbk_manage.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_adbk_manage.adbk_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.adbk_id IS '주소록아이디 (adbk_id)';


--
-- Name: COLUMN tb_adbk_manage.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_adbk_manage.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_adbk_manage.rls_scope_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.rls_scope_cd IS '공개범위코드 (rls_scope_cd)';


--
-- Name: COLUMN tb_adbk_manage.trget_ognz_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.trget_ognz_id IS '대상조직아이디 (trget_orgnzt_id)';


--
-- Name: COLUMN tb_adbk_manage.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.wrter_id IS '작성자아이디 (wrter_id)';


--
-- Name: COLUMN tb_adbk_manage.adbk_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_adbk_manage.adbk_nm IS '주소록명 (adbk_nm)';


--
-- Name: tb_admdst_cd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_admdst_cd (
    admdst_cd character varying(12) NOT NULL,
    up_admdst_cd character varying(12),
    admdst_se_cd character varying(12),
    use_yn character varying(1),
    crt_ymd character varying(8),
    abl_ymd character varying(8),
    admdst_zone_nm character varying(100),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_admdst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_admdst_cd IS '행정구역코드 (tb_admdst_cd)';


--
-- Name: COLUMN tb_admdst_cd.admdst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.admdst_cd IS '행정구역코드 (admdst_cd)';


--
-- Name: COLUMN tb_admdst_cd.up_admdst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.up_admdst_cd IS '상위행정구역코드 (up_admdst_cd)';


--
-- Name: COLUMN tb_admdst_cd.admdst_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.admdst_se_cd IS '행정구역구분코드 (admdst_se_cd)';


--
-- Name: COLUMN tb_admdst_cd.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_admdst_cd.crt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.crt_ymd IS '생성일자 (crt_ymd)';


--
-- Name: COLUMN tb_admdst_cd.abl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.abl_ymd IS '폐지일자 (abl_ymd)';


--
-- Name: COLUMN tb_admdst_cd.admdst_zone_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.admdst_zone_nm IS '행정구역구역명 (admdst_zone_nm)';


--
-- Name: COLUMN tb_admdst_cd.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_admdst_cd.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_admdst_cd.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_admdst_cd.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_admdst_cd_rcptn_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_admdst_cd_rcptn_log (
    ocrn_ymd character varying(8) NOT NULL,
    admdst_zone_se_cd character varying(12) NOT NULL,
    admdst_cd character varying(12) NOT NULL,
    opert_sn bigint NOT NULL,
    change_se_cd character varying(12),
    proc_se_cd character varying(12),
    admdst_zone_nm character varying(100),
    lwst_admdst_zone_nm character varying(100),
    ctprvn_cd character varying(12),
    signgu_cd character varying(12),
    emd_cd character varying(12),
    li_cd character varying(12),
    crt_ymd character varying(8),
    abl_ymd character varying(8),
    abl_yn character varying(1),
    frst_rgtr_id character varying(20),
    crt_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_admdst_cd_rcptn_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_admdst_cd_rcptn_log IS '행정구역코드수신로그 (tb_admdst_cd_rcptn_log)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.ocrn_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.admdst_zone_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.admdst_zone_se_cd IS '행정구역구역구분코드 (admdst_zone_se_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.admdst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.admdst_cd IS '행정구역코드 (admdst_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.opert_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.opert_sn IS '운영일련번호 (opert_sn)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.change_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.change_se_cd IS '변경구분코드 (change_se_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.proc_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.proc_se_cd IS '프로세스구분코드 (proc_se_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.admdst_zone_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.admdst_zone_nm IS '행정구역구역명 (admdst_zone_nm)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.lwst_admdst_zone_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.lwst_admdst_zone_nm IS '최저행정구역구역명 (lwst_admdst_zone_nm)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.ctprvn_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.ctprvn_cd IS '시도코드 (ctprvn_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.signgu_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.signgu_cd IS '시군구코드 (signgu_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.emd_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.emd_cd IS '읍면동코드 (emd_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.li_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.li_cd IS '리코드 (li_cd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.crt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.crt_ymd IS '생성일자 (crt_ymd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.abl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.abl_ymd IS '폐지일자 (abl_ymd)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.abl_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.abl_yn IS '폐지여부 (abl_yn)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_admdst_cd_rcptn_log.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_admdst_cd_rcptn_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_auth_rfsh_tk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_auth_rfsh_tk (
    exprtn_dt timestamp without time zone NOT NULL,
    user_id character varying(20) NOT NULL,
    rfsh_tkn character varying(4000) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_auth_rfsh_tk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_auth_rfsh_tk IS '권한리프레시토큰 (tb_auth_rfsh_tk)';


--
-- Name: COLUMN tb_auth_rfsh_tk.exprtn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_auth_rfsh_tk.exprtn_dt IS '만료일시 (exprtn_dt)';


--
-- Name: COLUMN tb_auth_rfsh_tk.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_auth_rfsh_tk.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_auth_rfsh_tk.rfsh_tkn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_auth_rfsh_tk.rfsh_tkn IS '리프레시토큰 (rfsh_tkn)';


--
-- Name: COLUMN tb_auth_rfsh_tk.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_auth_rfsh_tk.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_auth_rfsh_tk.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_auth_rfsh_tk.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_auth_rfsh_tk.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_auth_rfsh_tk.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_auth_rfsh_tk.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_auth_rfsh_tk.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_authrt_group_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_authrt_group_info (
    group_id character varying(20) NOT NULL,
    group_nm character varying(100),
    group_dc character varying(4000),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    group_crt_ymd timestamp without time zone
);


--
-- Name: TABLE tb_authrt_group_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_authrt_group_info IS '권한그룹정보 (tb_authrt_group_info)';


--
-- Name: COLUMN tb_authrt_group_info.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.group_id IS '그룹아이디 (group_id)';


--
-- Name: COLUMN tb_authrt_group_info.group_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.group_nm IS '그룹명 (group_nm)';


--
-- Name: COLUMN tb_authrt_group_info.group_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.group_dc IS '그룹설명 (group_dc)';


--
-- Name: COLUMN tb_authrt_group_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_authrt_group_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_authrt_group_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_authrt_group_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_authrt_group_info.group_crt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_group_info.group_crt_ymd IS '그룹생성일자 (group_crt_ymd)';


--
-- Name: tb_authrt_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_authrt_info (
    authrt_cd character varying(30) NOT NULL,
    authrt_nm character varying(300) NOT NULL,
    authrt_expln character varying(4000),
    authrt_crt_ymd character varying(8),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_authrt_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_authrt_info IS '권한정보 (tb_authrt_info)';


--
-- Name: COLUMN tb_authrt_info.authrt_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.authrt_cd IS '권한코드 (authrt_cd)';


--
-- Name: COLUMN tb_authrt_info.authrt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.authrt_nm IS '권한명 (authrt_nm)';


--
-- Name: COLUMN tb_authrt_info.authrt_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.authrt_expln IS '권한설명 (authrt_expln)';


--
-- Name: COLUMN tb_authrt_info.authrt_crt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.authrt_crt_ymd IS '권한생성일자 (authrt_crt_ymd)';


--
-- Name: COLUMN tb_authrt_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_authrt_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_authrt_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_authrt_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_authrt_role_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_authrt_role_map (
    authrt_cd character varying(30) NOT NULL,
    role_cd character varying(30) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_authrt_role_map; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_authrt_role_map IS '권한역할매핑 (tb_authrt_role_map)';


--
-- Name: COLUMN tb_authrt_role_map.authrt_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_role_map.authrt_cd IS '권한코드 (authrt_cd)';


--
-- Name: COLUMN tb_authrt_role_map.role_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_role_map.role_cd IS '역할코드 (role_cd)';


--
-- Name: COLUMN tb_authrt_role_map.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_role_map.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_authrt_role_map.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_role_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_authrt_role_map.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_role_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_authrt_role_map.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_authrt_role_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_bbs_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bbs_comment (
    use_yn character varying(1),
    ans_sn bigint NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    pst_id character varying(20),
    bbs_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    wrter_id character varying(20),
    wrter_nm character varying(100),
    pswd character varying(200),
    ans_cn text
);


--
-- Name: TABLE tb_bbs_comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bbs_comment IS '게시판댓글 (tb_bbs_comment)';


--
-- Name: COLUMN tb_bbs_comment.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_bbs_comment.ans_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.ans_sn IS '답변일련번호 (ans_sn)';


--
-- Name: COLUMN tb_bbs_comment.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bbs_comment.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bbs_comment.pst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.pst_id IS '게시물아이디 (pst_id)';


--
-- Name: COLUMN tb_bbs_comment.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_bbs_comment.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bbs_comment.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_bbs_comment.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.wrter_id IS '작성자아이디 (wrter_id)';


--
-- Name: COLUMN tb_bbs_comment.wrter_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.wrter_nm IS '작성자명 (wrter_nm)';


--
-- Name: COLUMN tb_bbs_comment.pswd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.pswd IS '비밀번호 (pswd)';


--
-- Name: COLUMN tb_bbs_comment.ans_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_comment.ans_cn IS '답변내용 (ans_cn)';


--
-- Name: tb_bbs_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bbs_item (
    ans_yn character varying(1),
    ans_lv integer,
    cmnt_cnt integer,
    file_cnt integer,
    ntc_yn character varying(1),
    inq_cnt integer,
    scrt_yn character varying(1),
    ttl_bold_yn character varying(1),
    use_yn character varying(1),
    evnt_dt timestamp(6) without time zone,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    pst_id character varying(20) NOT NULL,
    ans_sn bigint,
    up_pst_id character varying(20),
    sort_ordr bigint,
    qna_stts_cd character varying(12),
    atch_file_id character varying(20),
    blog_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    pst_bgng_ymd character varying(20),
    pst_end_ymd character varying(20),
    user_id character varying(20),
    user_nm character varying(100),
    qna_cat_cd character varying(12),
    pswd character varying(200),
    pst_ttl character varying(100),
    bbs_id character varying(20) NOT NULL,
    pst_cn character varying(4000),
    like_cnt integer,
    version integer DEFAULT 0
);


--
-- Name: TABLE tb_bbs_item; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bbs_item IS '게시판품목 (tb_bbs_item)';


--
-- Name: COLUMN tb_bbs_item.ans_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.ans_yn IS '답변여부 (ans_yn)';


--
-- Name: COLUMN tb_bbs_item.ans_lv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.ans_lv IS '답변레벨 (ans_lvl)';


--
-- Name: COLUMN tb_bbs_item.cmnt_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.cmnt_cnt IS '댓글수 (cmnt_cnt)';


--
-- Name: COLUMN tb_bbs_item.file_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.file_cnt IS '파일수 (file_cnt)';


--
-- Name: COLUMN tb_bbs_item.ntc_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.ntc_yn IS '공지여부 (ntc_yn)';


--
-- Name: COLUMN tb_bbs_item.inq_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.inq_cnt IS '조회수 (inq_cnt)';


--
-- Name: COLUMN tb_bbs_item.scrt_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.scrt_yn IS '증권여부 (scrt_yn)';


--
-- Name: COLUMN tb_bbs_item.ttl_bold_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.ttl_bold_yn IS '제목볼드여부 (ttl_bold_yn)';


--
-- Name: COLUMN tb_bbs_item.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_bbs_item.evnt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.evnt_dt IS '행사일시 (evnt_dt)';


--
-- Name: COLUMN tb_bbs_item.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bbs_item.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bbs_item.pst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.pst_id IS '게시물아이디 (pst_id)';


--
-- Name: COLUMN tb_bbs_item.ans_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.ans_sn IS '답변일련번호 (ans_sn)';


--
-- Name: COLUMN tb_bbs_item.up_pst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.up_pst_id IS '상위게시물아이디 (up_pst_id)';


--
-- Name: COLUMN tb_bbs_item.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.sort_ordr IS '정렬주문 (sort_ordr)';


--
-- Name: COLUMN tb_bbs_item.qna_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.qna_stts_cd IS '질의응답상태코드 (qna_stts_cd)';


--
-- Name: COLUMN tb_bbs_item.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_bbs_item.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.blog_id IS '블로그아이디 (blog_id)';


--
-- Name: COLUMN tb_bbs_item.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bbs_item.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_bbs_item.pst_bgng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.pst_bgng_ymd IS '게시물시작일자 (pst_bgng_ymd)';


--
-- Name: COLUMN tb_bbs_item.pst_end_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.pst_end_ymd IS '게시물종료일자 (pst_end_ymd)';


--
-- Name: COLUMN tb_bbs_item.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_bbs_item.user_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.user_nm IS '사용자명 (user_nm)';


--
-- Name: COLUMN tb_bbs_item.qna_cat_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.qna_cat_cd IS '질의응답카테고리코드 (qna_cat_cd)';


--
-- Name: COLUMN tb_bbs_item.pswd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.pswd IS '비밀번호 (pswd)';


--
-- Name: COLUMN tb_bbs_item.pst_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.pst_ttl IS '게시물제목 (pst_ttl)';


--
-- Name: COLUMN tb_bbs_item.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_bbs_item.pst_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.pst_cn IS '게시물내용 (pst_cn)';


--
-- Name: COLUMN tb_bbs_item.like_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_item.like_cnt IS '추천수 (like_cnt)';


--
-- Name: tb_bbs_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bbs_master (
    atch_psblty_file_qty integer NOT NULL,
    blog_yn character varying(1),
    file_atch_psblty_yn character varying(1) NOT NULL,
    ans_psblty_yn character varying(1),
    use_yn character varying(1) NOT NULL,
    bbs_atrb_cd character varying(12) NOT NULL,
    bbs_type_cd character varying(12) NOT NULL,
    atch_psblty_file_sz bigint,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    bbs_id character varying(20) NOT NULL,
    blog_id character varying(20),
    cmnty_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    tmplt_id character varying(20),
    bbs_ttl character varying(100) NOT NULL,
    bbs_expln character varying(4000),
    ans_yn character varying(1) DEFAULT 'N'::character varying,
    stsfdg_yn character varying(1) DEFAULT 'N'::character varying
);


--
-- Name: TABLE tb_bbs_master; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bbs_master IS '게시판마스터 (tb_bbs_master)';


--
-- Name: COLUMN tb_bbs_master.atch_psblty_file_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.atch_psblty_file_qty IS '첨부가능파일수량 (atch_psblty_file_qty)';


--
-- Name: COLUMN tb_bbs_master.blog_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.blog_yn IS '블로그여부 (blog_yn)';


--
-- Name: COLUMN tb_bbs_master.file_atch_psblty_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.file_atch_psblty_yn IS '파일첨부가능여부 (file_atch_psblty_yn)';


--
-- Name: COLUMN tb_bbs_master.ans_psblty_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.ans_psblty_yn IS '답변가능여부 (ans_psblty_yn)';


--
-- Name: COLUMN tb_bbs_master.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_bbs_master.bbs_atrb_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.bbs_atrb_cd IS '게시판속성코드 (bbs_atrb_cd)';


--
-- Name: COLUMN tb_bbs_master.bbs_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.bbs_type_cd IS '게시판유형코드 (bbs_type_cd)';


--
-- Name: COLUMN tb_bbs_master.atch_psblty_file_sz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.atch_psblty_file_sz IS '첨부가능파일크기 (atch_psblty_file_sz)';


--
-- Name: COLUMN tb_bbs_master.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bbs_master.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bbs_master.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_bbs_master.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.blog_id IS '블로그아이디 (blog_id)';


--
-- Name: COLUMN tb_bbs_master.cmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.cmnty_id IS '커뮤니티아이디 (cmnty_id)';


--
-- Name: COLUMN tb_bbs_master.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bbs_master.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_bbs_master.tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.tmplt_id IS '서식아이디 (tmplt_id)';


--
-- Name: COLUMN tb_bbs_master.bbs_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.bbs_ttl IS '게시판제목 (bbs_ttl)';


--
-- Name: COLUMN tb_bbs_master.bbs_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master.bbs_expln IS '게시판설명 (bbs_expln)';


--
-- Name: tb_bbs_master_optn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bbs_master_optn (
    ans_yn character varying(1),
    stsfdg_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    bbs_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_bbs_master_optn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bbs_master_optn IS '게시판마스터옵션 (tb_bbs_master_optn)';


--
-- Name: COLUMN tb_bbs_master_optn.ans_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master_optn.ans_yn IS '답변여부 (ans_yn)';


--
-- Name: COLUMN tb_bbs_master_optn.stsfdg_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master_optn.stsfdg_yn IS '만족도여부 (stsfdg_yn)';


--
-- Name: COLUMN tb_bbs_master_optn.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master_optn.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bbs_master_optn.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master_optn.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bbs_master_optn.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master_optn.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_bbs_master_optn.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master_optn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bbs_master_optn.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_master_optn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_bbs_scrap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bbs_scrap (
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    pst_id character varying(20),
    bbs_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    scrap_id character varying(20) NOT NULL,
    scrap_nm character varying(100),
    scrap_expln character varying(4000),
    scrap_url character varying(1000)
);


--
-- Name: TABLE tb_bbs_scrap; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bbs_scrap IS '게시판스크랩 (tb_bbs_scrap)';


--
-- Name: COLUMN tb_bbs_scrap.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_bbs_scrap.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bbs_scrap.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bbs_scrap.pst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.pst_id IS '게시물아이디 (pst_id)';


--
-- Name: COLUMN tb_bbs_scrap.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_bbs_scrap.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bbs_scrap.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_bbs_scrap.scrap_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.scrap_id IS '스크랩아이디 (scrap_id)';


--
-- Name: COLUMN tb_bbs_scrap.scrap_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.scrap_nm IS '스크랩명 (scrap_nm)';


--
-- Name: COLUMN tb_bbs_scrap.scrap_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.scrap_expln IS '스크랩설명 (scrap_expln)';


--
-- Name: COLUMN tb_bbs_scrap.scrap_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_scrap.scrap_url IS '스크랩URL (scrap_url)';


--
-- Name: tb_bbs_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bbs_stats (
    stats_id character varying(20) NOT NULL,
    pst_cnt bigint,
    avg_inq_cnt bigint,
    max_inq_cnt bigint,
    min_inq_cnt bigint,
    top_user_id character varying(20),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_bbs_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bbs_stats IS '게시판통계 (tb_bbs_stats)';


--
-- Name: COLUMN tb_bbs_stats.stats_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.stats_id IS '통계아이디 (stats_id)';


--
-- Name: COLUMN tb_bbs_stats.pst_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.pst_cnt IS '게시물수 (pst_cnt)';


--
-- Name: COLUMN tb_bbs_stats.avg_inq_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.avg_inq_cnt IS '평균조회수 (avg_inq_cnt)';


--
-- Name: COLUMN tb_bbs_stats.max_inq_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.max_inq_cnt IS '최대조회수 (max_inq_cnt)';


--
-- Name: COLUMN tb_bbs_stats.min_inq_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.min_inq_cnt IS '최소조회수 (min_inq_cnt)';


--
-- Name: COLUMN tb_bbs_stats.top_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.top_user_id IS '상위사용자아이디 (top_user_id)';


--
-- Name: COLUMN tb_bbs_stats.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bbs_stats.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bbs_stats.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bbs_stats.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_stats.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_bbs_use_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bbs_use_info (
    use_yn character varying(1),
    rgstr_se_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    bbs_id character varying(20) NOT NULL,
    trgt_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_bbs_use_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bbs_use_info IS '게시판사용정보 (tb_bbs_use_info)';


--
-- Name: COLUMN tb_bbs_use_info.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_bbs_use_info.rgstr_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.rgstr_se_cd IS '등록자구분코드 (rgstr_se_cd)';


--
-- Name: COLUMN tb_bbs_use_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bbs_use_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bbs_use_info.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_bbs_use_info.trgt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.trgt_id IS '대상아이디 (trgt_id)';


--
-- Name: COLUMN tb_bbs_use_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bbs_use_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bbs_use_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_bkmk_menu_mng_rslt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bkmk_menu_mng_rslt (
    menu_id bigint NOT NULL,
    user_id character varying(20) NOT NULL,
    menu_nm character varying(60),
    progrm_stre_path character varying(100),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_bkmk_menu_mng_rslt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bkmk_menu_mng_rslt IS '즐겨찾기메뉴관리결과 (tb_bkmk_menu_mng_rslt)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.menu_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.menu_id IS '메뉴아이디 (menu_id)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.menu_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.menu_nm IS '메뉴명 (menu_nm)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.progrm_stre_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.progrm_stre_path IS '프로그램저장경로 (progrm_stre_path)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bkmk_menu_mng_rslt.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bkmk_menu_mng_rslt.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_blog_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_blog_info (
    blog_yn character varying(1),
    use_yn character varying(1),
    reg_se_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    bbs_id character varying(20),
    blog_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    tmplt_id character varying(20),
    blog_intro_cn character varying(4000),
    blog_ttl character varying(300) NOT NULL
);


--
-- Name: TABLE tb_blog_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_blog_info IS '블로그정보 (tb_blog_info)';


--
-- Name: COLUMN tb_blog_info.blog_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.blog_yn IS '블로그여부 (blog_yn)';


--
-- Name: COLUMN tb_blog_info.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_blog_info.reg_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.reg_se_cd IS '등록구분코드 (reg_se_cd)';


--
-- Name: COLUMN tb_blog_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_blog_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_blog_info.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_blog_info.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.blog_id IS '블로그아이디 (blog_id)';


--
-- Name: COLUMN tb_blog_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_blog_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_blog_info.tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.tmplt_id IS '서식아이디 (tmplt_id)';


--
-- Name: COLUMN tb_blog_info.blog_intro_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.blog_intro_cn IS '블로그소개내용 (blog_intro_cn)';


--
-- Name: COLUMN tb_blog_info.blog_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_info.blog_ttl IS '블로그제목 (blog_ttl)';


--
-- Name: tb_blog_user_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_blog_user_map (
    mbr_stts_cd character varying(12),
    mngr_yn character varying(1),
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    join_ymd character varying(8),
    blog_id character varying(20) NOT NULL,
    user_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    whdwl_ymd character varying(8)
);


--
-- Name: TABLE tb_blog_user_map; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_blog_user_map IS '블로그사용자매핑 (tb_blog_user_map)';


--
-- Name: COLUMN tb_blog_user_map.mbr_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.mbr_stts_cd IS '회원상태코드 (mbr_stts_cd)';


--
-- Name: COLUMN tb_blog_user_map.mngr_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.mngr_yn IS '관리자여부 (mngr_yn)';


--
-- Name: COLUMN tb_blog_user_map.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_blog_user_map.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_blog_user_map.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_blog_user_map.join_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.join_ymd IS '가입일자 (join_ymd)';


--
-- Name: COLUMN tb_blog_user_map.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.blog_id IS '블로그아이디 (blog_id)';


--
-- Name: COLUMN tb_blog_user_map.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_blog_user_map.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_blog_user_map.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_blog_user_map.whdwl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_blog_user_map.whdwl_ymd IS '탈퇴일자 (whdwl_ymd)';


--
-- Name: tb_bnr_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_bnr_info (
    rflt_yn character varying(1),
    sort_ordr integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    bnr_id character varying(20) NOT NULL,
    atch_file_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    bnr_img_nm character varying(100),
    bnr_nm character varying(100) NOT NULL,
    bnr_expln character varying(4000),
    link_url character varying(512)
);


--
-- Name: TABLE tb_bnr_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_bnr_info IS '배너정보 (tb_bnr_info)';


--
-- Name: COLUMN tb_bnr_info.rflt_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.rflt_yn IS '반영여부 (rflt_yn)';


--
-- Name: COLUMN tb_bnr_info.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.sort_ordr IS '정렬주문 (sort_ordr)';


--
-- Name: COLUMN tb_bnr_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_bnr_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_bnr_info.bnr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.bnr_id IS '배너아이디 (bnr_id)';


--
-- Name: COLUMN tb_bnr_info.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_bnr_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_bnr_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_bnr_info.bnr_img_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.bnr_img_nm IS '배너이미지명 (bnr_img_nm)';


--
-- Name: COLUMN tb_bnr_info.bnr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.bnr_nm IS '배너명 (bnr_nm)';


--
-- Name: COLUMN tb_bnr_info.bnr_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.bnr_expln IS '배너설명 (bnr_expln)';


--
-- Name: COLUMN tb_bnr_info.link_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_bnr_info.link_url IS '연계URL (link_url)';


--
-- Name: tb_club_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_club_info (
    club_id character varying(20) NOT NULL,
    cmnty_id character varying(20) NOT NULL,
    club_nm character varying(100) NOT NULL,
    club_intro_cn character varying(4000),
    use_yn character varying(1) NOT NULL,
    rgstr_se_cd character varying(12),
    tmplt_id character varying(20),
    crt_dt timestamp without time zone NOT NULL,
    frst_rgtr_id character varying(20) NOT NULL,
    mdfcn_dt timestamp without time zone,
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_club_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_club_info IS '동호회정보 (tb_club_info)';


--
-- Name: COLUMN tb_club_info.club_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.club_id IS '동호회아이디 (club_id)';


--
-- Name: COLUMN tb_club_info.cmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.cmnty_id IS '커뮤니티아이디 (cmnty_id)';


--
-- Name: COLUMN tb_club_info.club_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.club_nm IS '동호회명 (club_nm)';


--
-- Name: COLUMN tb_club_info.club_intro_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.club_intro_cn IS '동호회소개내용 (club_intro_cn)';


--
-- Name: COLUMN tb_club_info.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_club_info.rgstr_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.rgstr_se_cd IS '등록자구분코드 (rgstr_se_cd)';


--
-- Name: COLUMN tb_club_info.tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.tmplt_id IS '서식아이디 (tmplt_id)';


--
-- Name: COLUMN tb_club_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_club_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_club_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_club_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_club_user_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_club_user_map (
    club_id character varying(20) NOT NULL,
    cmnty_id character varying(20) NOT NULL,
    mngr_yn character varying(1) NOT NULL,
    join_ymd character varying(8),
    whdwl_ymd character varying(8),
    use_yn character varying(1) NOT NULL,
    crt_dt timestamp without time zone NOT NULL,
    frst_rgtr_id character varying(20) NOT NULL,
    mdfcn_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    user_id character varying(20) NOT NULL
);


--
-- Name: TABLE tb_club_user_map; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_club_user_map IS '동호회사용자매핑 (tb_club_user_map)';


--
-- Name: COLUMN tb_club_user_map.club_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.club_id IS '동호회아이디 (club_id)';


--
-- Name: COLUMN tb_club_user_map.cmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.cmnty_id IS '커뮤니티아이디 (cmnty_id)';


--
-- Name: COLUMN tb_club_user_map.mngr_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.mngr_yn IS '관리자여부 (mngr_yn)';


--
-- Name: COLUMN tb_club_user_map.join_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.join_ymd IS '가입일자 (join_ymd)';


--
-- Name: COLUMN tb_club_user_map.whdwl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.whdwl_ymd IS '탈퇴일자 (whdwl_ymd)';


--
-- Name: COLUMN tb_club_user_map.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_club_user_map.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_club_user_map.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_club_user_map.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_club_user_map.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_club_user_map.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_club_user_map.user_id IS '사용자아이디 (user_id)';


--
-- Name: tb_cmnty_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_cmnty_info (
    use_yn character varying(1),
    reg_se_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    cmnty_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    tmplt_id character varying(20),
    cmnty_intro_cn character varying(4000),
    cmnty_nm character varying(100)
);


--
-- Name: TABLE tb_cmnty_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_cmnty_info IS '커뮤니티정보 (tb_cmnty_info)';


--
-- Name: COLUMN tb_cmnty_info.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_cmnty_info.reg_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.reg_se_cd IS '등록구분코드 (reg_se_cd)';


--
-- Name: COLUMN tb_cmnty_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_cmnty_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_cmnty_info.cmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.cmnty_id IS '커뮤니티아이디 (cmnty_id)';


--
-- Name: COLUMN tb_cmnty_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_cmnty_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_cmnty_info.tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.tmplt_id IS '서식아이디 (tmplt_id)';


--
-- Name: COLUMN tb_cmnty_info.cmnty_intro_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.cmnty_intro_cn IS '커뮤니티소개내용 (cmnty_intro_cn)';


--
-- Name: COLUMN tb_cmnty_info.cmnty_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_info.cmnty_nm IS '커뮤니티명 (cmnty_nm)';


--
-- Name: tb_cmnty_user_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_cmnty_user_map (
    mngr_yn character varying(1),
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    join_ymd character varying(8),
    mbr_stts_cd character varying(12),
    cmnty_id character varying(20) NOT NULL,
    user_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    whdwl_ymd character varying(8)
);


--
-- Name: TABLE tb_cmnty_user_map; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_cmnty_user_map IS '커뮤니티사용자매핑 (tb_cmnty_user_map)';


--
-- Name: COLUMN tb_cmnty_user_map.mngr_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.mngr_yn IS '관리자여부 (mngr_yn)';


--
-- Name: COLUMN tb_cmnty_user_map.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_cmnty_user_map.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_cmnty_user_map.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_cmnty_user_map.join_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.join_ymd IS '가입일자 (join_ymd)';


--
-- Name: COLUMN tb_cmnty_user_map.mbr_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.mbr_stts_cd IS '회원상태코드 (mbr_stts_cd)';


--
-- Name: COLUMN tb_cmnty_user_map.cmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.cmnty_id IS '커뮤니티아이디 (cmnty_id)';


--
-- Name: COLUMN tb_cmnty_user_map.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_cmnty_user_map.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_cmnty_user_map.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_cmnty_user_map.whdwl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_cmnty_user_map.whdwl_ymd IS '탈퇴일자 (whdwl_ymd)';


--
-- Name: tb_com_cd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_com_cd (
    clsf_cd character varying(12),
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    cd_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    cd_id_nm character varying(100),
    cd_id_expln character varying(4000)
);


--
-- Name: TABLE tb_com_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_com_cd IS '공통코드 (tb_com_cd)';


--
-- Name: COLUMN tb_com_cd.clsf_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.clsf_cd IS '분류코드 (clsf_cd)';


--
-- Name: COLUMN tb_com_cd.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_com_cd.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_com_cd.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_com_cd.cd_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.cd_id IS '코드아이디 (cd_id)';


--
-- Name: COLUMN tb_com_cd.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_com_cd.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_com_cd.cd_id_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.cd_id_nm IS '코드아이디명 (cd_id_nm)';


--
-- Name: COLUMN tb_com_cd.cd_id_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_cd.cd_id_expln IS '코드아이디설명 (cd_id_expln)';


--
-- Name: tb_com_clsf_cd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_com_clsf_cd (
    clsf_cd character varying(12) NOT NULL,
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    clsf_cd_nm character varying(100),
    clsf_cd_expln character varying(4000)
);


--
-- Name: TABLE tb_com_clsf_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_com_clsf_cd IS '공통분류코드 (tb_com_clsf_cd)';


--
-- Name: COLUMN tb_com_clsf_cd.clsf_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.clsf_cd IS '분류코드 (clsf_cd)';


--
-- Name: COLUMN tb_com_clsf_cd.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_com_clsf_cd.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_com_clsf_cd.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_com_clsf_cd.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_com_clsf_cd.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_com_clsf_cd.clsf_cd_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.clsf_cd_nm IS '분류코드명 (clsf_cd_nm)';


--
-- Name: COLUMN tb_com_clsf_cd.clsf_cd_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_clsf_cd.clsf_cd_expln IS '분류코드설명 (clsf_cd_expln)';


--
-- Name: tb_com_dtl_cd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_com_dtl_cd (
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    cd_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    dtl_cd character varying(12) NOT NULL,
    dtl_cd_nm character varying(100),
    dtl_cd_expln character varying(4000)
);


--
-- Name: TABLE tb_com_dtl_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_com_dtl_cd IS '공통상세코드 (tb_com_dtl_cd)';


--
-- Name: COLUMN tb_com_dtl_cd.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_com_dtl_cd.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_com_dtl_cd.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_com_dtl_cd.cd_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.cd_id IS '코드아이디 (cd_id)';


--
-- Name: COLUMN tb_com_dtl_cd.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_com_dtl_cd.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_com_dtl_cd.dtl_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.dtl_cd IS '상세코드 (dtl_cd)';


--
-- Name: COLUMN tb_com_dtl_cd.dtl_cd_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.dtl_cd_nm IS '상세코드명 (dtl_cd_nm)';


--
-- Name: COLUMN tb_com_dtl_cd.dtl_cd_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_com_dtl_cd.dtl_cd_expln IS '상세코드설명 (dtl_cd_expln)';


--
-- Name: tb_dept_job_bx; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_dept_job_bx (
    sort_ordr integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    dept_id character varying(20),
    dept_task_box_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    dept_task_box_nm character varying(100)
);


--
-- Name: TABLE tb_dept_job_bx; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_dept_job_bx IS '부서작업보관함 (tb_dept_job_bx)';


--
-- Name: COLUMN tb_dept_job_bx.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.sort_ordr IS '정렬주문 (sort_ordr)';


--
-- Name: COLUMN tb_dept_job_bx.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_dept_job_bx.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_dept_job_bx.dept_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.dept_id IS '부서아이디 (dept_id)';


--
-- Name: COLUMN tb_dept_job_bx.dept_task_box_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.dept_task_box_id IS '부서업무함아이디 (dept_task_box_id)';


--
-- Name: COLUMN tb_dept_job_bx.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_dept_job_bx.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_dept_job_bx.dept_task_box_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_job_bx.dept_task_box_nm IS '부서업무함명 (dept_task_box_nm)';


--
-- Name: tb_dept_task_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_dept_task_info (
    prrty_rnk character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(20),
    pic_id character varying(20),
    dept_task_id character varying(20) NOT NULL,
    dept_task_box_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    dept_task_cn character varying(4000),
    dept_task_nm character varying(100)
);


--
-- Name: TABLE tb_dept_task_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_dept_task_info IS '부서업무정보 (tb_dept_task_info)';


--
-- Name: COLUMN tb_dept_task_info.prrty_rnk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.prrty_rnk IS '우선순위 (prrty_rnk)';


--
-- Name: COLUMN tb_dept_task_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_dept_task_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_dept_task_info.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_dept_task_info.pic_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.pic_id IS '담당자아이디 (pic_id)';


--
-- Name: COLUMN tb_dept_task_info.dept_task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.dept_task_id IS '부서업무아이디 (dept_task_id)';


--
-- Name: COLUMN tb_dept_task_info.dept_task_box_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.dept_task_box_id IS '부서업무함아이디 (dept_task_box_id)';


--
-- Name: COLUMN tb_dept_task_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_dept_task_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_dept_task_info.dept_task_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.dept_task_cn IS '부서업무내용 (dept_task_cn)';


--
-- Name: COLUMN tb_dept_task_info.dept_task_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dept_task_info.dept_task_nm IS '부서업무명 (dept_task_nm)';


--
-- Name: tb_dgstfn_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_dgstfn_info (
    dgstfn_scr integer NOT NULL,
    use_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    pst_id character varying(20) NOT NULL,
    dgstfn_sn bigint NOT NULL,
    bbs_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    user_id character varying(20),
    user_nm character varying(100),
    pswd character varying(200),
    dgstfn_cn character varying(4000)
);


--
-- Name: TABLE tb_dgstfn_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_dgstfn_info IS '만족도정보 (tb_dgstfn_info)';


--
-- Name: COLUMN tb_dgstfn_info.dgstfn_scr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.dgstfn_scr IS '만족도점수 (dgstfn_scr)';


--
-- Name: COLUMN tb_dgstfn_info.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_dgstfn_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_dgstfn_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_dgstfn_info.pst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.pst_id IS '게시물아이디 (ntt_id)';


--
-- Name: COLUMN tb_dgstfn_info.dgstfn_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.dgstfn_sn IS '만족도일련번호 (dgstfn_sn)';


--
-- Name: COLUMN tb_dgstfn_info.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_dgstfn_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_dgstfn_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_dgstfn_info.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_dgstfn_info.user_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.user_nm IS '사용자명 (user_nm)';


--
-- Name: COLUMN tb_dgstfn_info.pswd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.pswd IS '비밀번호 (pswd)';


--
-- Name: COLUMN tb_dgstfn_info.dgstfn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dgstfn_info.dgstfn_cn IS '만족도내용 (dgstfn_cn)';


--
-- Name: tb_diary_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_diary_info (
    diary_prgrs_rt integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(20),
    diary_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    schdl_id character varying(20),
    diary_nm character varying(100),
    drctn_mttr text,
    excptn_mttr text
);


--
-- Name: TABLE tb_diary_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_diary_info IS '일기정보 (tb_diary_info)';


--
-- Name: COLUMN tb_diary_info.diary_prgrs_rt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.diary_prgrs_rt IS '일기진행비율 (diary_prgrs_rt)';


--
-- Name: COLUMN tb_diary_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_diary_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_diary_info.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_diary_info.diary_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.diary_id IS '일기아이디 (diary_id)';


--
-- Name: COLUMN tb_diary_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_diary_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_diary_info.schdl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.schdl_id IS '일정아이디 (schdl_id)';


--
-- Name: COLUMN tb_diary_info.diary_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.diary_nm IS '일기명 (diary_nm)';


--
-- Name: COLUMN tb_diary_info.drctn_mttr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.drctn_mttr IS '지시사항 (drctn_mttr)';


--
-- Name: COLUMN tb_diary_info.excptn_mttr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_diary_info.excptn_mttr IS '특이사항 (excptn_mttr)';


--
-- Name: tb_dscsn_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_dscsn_list (
    area_no character varying(4),
    eml_ans_yn character varying(1),
    mbl_end_telno character varying(4),
    end_telno character varying(4),
    mbl_frst_telno character varying(4),
    mbl_md_telno character varying(4),
    md_telno character varying(4),
    rls_yn character varying(1),
    qna_proc_stts_cd character varying(12),
    inq_cnt integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(20),
    dscsn_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    mng_ymd character varying(20),
    wrt_ymd character varying(20),
    wrt_pswd character varying(200),
    wrter_nm character varying(100),
    eml_addr character varying(100),
    dscsn_cn character varying(4000),
    dscsn_ttl character varying(100),
    proc_cn character varying(4000)
);


--
-- Name: TABLE tb_dscsn_list; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_dscsn_list IS '상담목록 (tb_dscsn_list)';


--
-- Name: COLUMN tb_dscsn_list.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.area_no IS '면적번호 (area_no)';


--
-- Name: COLUMN tb_dscsn_list.eml_ans_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.eml_ans_yn IS '이메일답변여부 (eml_ans_yn)';


--
-- Name: COLUMN tb_dscsn_list.mbl_end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.mbl_end_telno IS '휴대종료전화번호 (mbl_end_telno)';


--
-- Name: COLUMN tb_dscsn_list.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.end_telno IS '종료전화번호 (end_telno)';


--
-- Name: COLUMN tb_dscsn_list.mbl_frst_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.mbl_frst_telno IS '휴대최초전화번호 (mbl_frst_telno)';


--
-- Name: COLUMN tb_dscsn_list.mbl_md_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.mbl_md_telno IS '휴대중간전화번호 (mbl_md_telno)';


--
-- Name: COLUMN tb_dscsn_list.md_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.md_telno IS '중간전화번호 (md_telno)';


--
-- Name: COLUMN tb_dscsn_list.rls_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.rls_yn IS '공개여부 (rls_yn)';


--
-- Name: COLUMN tb_dscsn_list.qna_proc_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.qna_proc_stts_cd IS '질의응답프로세스상태코드 (qna_proc_stts_cd)';


--
-- Name: COLUMN tb_dscsn_list.inq_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.inq_cnt IS '조회수 (inq_cnt)';


--
-- Name: COLUMN tb_dscsn_list.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_dscsn_list.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_dscsn_list.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_dscsn_list.dscsn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.dscsn_id IS '상담아이디 (dscsn_id)';


--
-- Name: COLUMN tb_dscsn_list.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_dscsn_list.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_dscsn_list.mng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.mng_ymd IS '관리일자 (mng_ymd)';


--
-- Name: COLUMN tb_dscsn_list.wrt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.wrt_ymd IS '작성일자 (wrt_ymd)';


--
-- Name: COLUMN tb_dscsn_list.wrt_pswd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.wrt_pswd IS '작성비밀번호 (wrt_pswd)';


--
-- Name: COLUMN tb_dscsn_list.wrter_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.wrter_nm IS '작성자명 (wrter_nm)';


--
-- Name: COLUMN tb_dscsn_list.eml_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.eml_addr IS '이메일주소 (eml_addr)';


--
-- Name: COLUMN tb_dscsn_list.dscsn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.dscsn_cn IS '상담내용 (dscsn_cn)';


--
-- Name: COLUMN tb_dscsn_list.dscsn_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.dscsn_ttl IS '상담제목 (dscsn_ttl)';


--
-- Name: COLUMN tb_dscsn_list.proc_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_list.proc_cn IS '프로세스내용 (proc_cn)';


--
-- Name: tb_dscsn_manage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_dscsn_manage (
    dscsn_id character varying(20) NOT NULL,
    dscsn_ttl character varying(100) NOT NULL,
    dscsn_cn character varying(4000),
    rls_yn character varying(1),
    wrt_ymd character varying(8),
    user_id character varying(20) NOT NULL,
    user_nm character varying(100),
    proc_cn character varying(4000),
    mng_ymd character varying(8),
    qna_proc_stts_cd character varying(12),
    frst_rgtr_id character varying(20),
    crt_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_dscsn_manage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_dscsn_manage IS '상담관리 (tb_dscsn_manage)';


--
-- Name: COLUMN tb_dscsn_manage.dscsn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.dscsn_id IS '상담아이디 (dscsn_id)';


--
-- Name: COLUMN tb_dscsn_manage.dscsn_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.dscsn_ttl IS '상담제목 (dscsn_ttl)';


--
-- Name: COLUMN tb_dscsn_manage.dscsn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.dscsn_cn IS '상담내용 (dscsn_cn)';


--
-- Name: COLUMN tb_dscsn_manage.rls_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.rls_yn IS '공개여부 (rls_yn)';


--
-- Name: COLUMN tb_dscsn_manage.wrt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.wrt_ymd IS '작성일자 (wrt_ymd)';


--
-- Name: COLUMN tb_dscsn_manage.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_dscsn_manage.user_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.user_nm IS '사용자명 (user_nm)';


--
-- Name: COLUMN tb_dscsn_manage.proc_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.proc_cn IS '프로세스내용 (proc_cn)';


--
-- Name: COLUMN tb_dscsn_manage.mng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.mng_ymd IS '관리일자 (mng_ymd)';


--
-- Name: COLUMN tb_dscsn_manage.qna_proc_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.qna_proc_stts_cd IS '질의응답프로세스상태코드 (qna_proc_stts_cd)';


--
-- Name: COLUMN tb_dscsn_manage.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_dscsn_manage.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_dscsn_manage.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_dscsn_manage.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dscsn_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_dta_use_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_dta_use_stats (
    dta_use_stats_id character varying(20) NOT NULL,
    bbs_id character varying(20),
    pst_id bigint,
    atch_file_id character varying(20),
    file_sn integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_dta_use_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_dta_use_stats IS '자료사용통계 (tb_dta_use_stats)';


--
-- Name: COLUMN tb_dta_use_stats.dta_use_stats_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.dta_use_stats_id IS '자료사용통계아이디 (dta_use_stats_id)';


--
-- Name: COLUMN tb_dta_use_stats.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.bbs_id IS '게시판아이디 (bbs_id)';


--
-- Name: COLUMN tb_dta_use_stats.pst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.pst_id IS '게시물아이디 (ntt_id)';


--
-- Name: COLUMN tb_dta_use_stats.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_dta_use_stats.file_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.file_sn IS '파일일련번호 (file_sn)';


--
-- Name: COLUMN tb_dta_use_stats.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_dta_use_stats.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_dta_use_stats.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_dta_use_stats.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_dta_use_stats.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_email_dsptch_manage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_email_dsptch_manage (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(20),
    dsptch_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    msg_id character varying(20) NOT NULL,
    dsptch_rslt_cd character varying(12),
    rcvr_nm character varying(100),
    sndpty_nm character varying(100),
    eml_cn character varying(4000),
    eml_ttl character varying(100) NOT NULL
);


--
-- Name: TABLE tb_email_dsptch_manage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_email_dsptch_manage IS '이메일발신관리 (tb_email_dsptch_manage)';


--
-- Name: COLUMN tb_email_dsptch_manage.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_email_dsptch_manage.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_email_dsptch_manage.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_email_dsptch_manage.dsptch_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.dsptch_dt IS '발신일시 (dsptch_dt)';


--
-- Name: COLUMN tb_email_dsptch_manage.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_email_dsptch_manage.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_email_dsptch_manage.msg_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.msg_id IS '메시지아이디 (msg_id)';


--
-- Name: COLUMN tb_email_dsptch_manage.dsptch_rslt_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.dsptch_rslt_cd IS '발신결과코드 (dsptch_rslt_cd)';


--
-- Name: COLUMN tb_email_dsptch_manage.rcvr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.rcvr_nm IS '수신자명 (rcvr_nm)';


--
-- Name: COLUMN tb_email_dsptch_manage.sndpty_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.sndpty_nm IS '발신자명 (sndpty_nm)';


--
-- Name: COLUMN tb_email_dsptch_manage.eml_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.eml_cn IS '이메일내용 (eml_cn)';


--
-- Name: COLUMN tb_email_dsptch_manage.eml_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_email_dsptch_manage.eml_ttl IS '이메일제목 (eml_ttl)';


--
-- Name: tb_event_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_event_info (
    biz_yr character varying(4),
    evnt_aprv_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    evnt_use_cnt bigint,
    biz_cd character varying(30),
    evnt_aprv_ymd character varying(20),
    evnt_id character varying(30) NOT NULL,
    evnt_bgng_ymd character varying(20),
    evnt_end_ymd character varying(20),
    evnt_type_cd character varying(30),
    frst_rgtr_id character varying(30),
    last_mdfr_id character varying(30),
    pic_nm character varying(300),
    evnt_cn character varying(4000),
    prep_mttr character varying(2500)
);


--
-- Name: TABLE tb_event_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_event_info IS '이벤트정보 (tb_event_info)';


--
-- Name: COLUMN tb_event_info.biz_yr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.biz_yr IS '사업연도 (biz_yr)';


--
-- Name: COLUMN tb_event_info.evnt_aprv_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_aprv_yn IS '행사승인여부 (evnt_aprv_yn)';


--
-- Name: COLUMN tb_event_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_event_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_event_info.evnt_use_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_use_cnt IS '행사사용수 (evnt_use_cnt)';


--
-- Name: COLUMN tb_event_info.biz_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.biz_cd IS '사업코드 (biz_cd)';


--
-- Name: COLUMN tb_event_info.evnt_aprv_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_aprv_ymd IS '행사승인일자 (evnt_aprv_ymd)';


--
-- Name: COLUMN tb_event_info.evnt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_id IS '행사아이디 (evnt_id)';


--
-- Name: COLUMN tb_event_info.evnt_bgng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_bgng_ymd IS '행사시작일자 (evnt_bgng_ymd)';


--
-- Name: COLUMN tb_event_info.evnt_end_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_end_ymd IS '행사종료일자 (evnt_end_ymd)';


--
-- Name: COLUMN tb_event_info.evnt_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_type_cd IS '행사유형코드 (evnt_type_cd)';


--
-- Name: COLUMN tb_event_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_event_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_event_info.pic_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.pic_nm IS '담당자명 (pic_nm)';


--
-- Name: COLUMN tb_event_info.evnt_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.evnt_cn IS '행사내용 (evnt_cn)';


--
-- Name: COLUMN tb_event_info.prep_mttr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_event_info.prep_mttr IS '전임사항 (prep_mttr)';


--
-- Name: tb_extrl_hr_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_extrl_hr_info (
    area_no character varying(4),
    end_telno character varying(4),
    md_telno character varying(4),
    cr_type_cd character varying(12),
    gndr_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    brdt_ymd character varying(8),
    evnt_id character varying(20) NOT NULL,
    otsd_hr_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    eml_addr character varying(100),
    otsd_hr_nm character varying(100),
    ogdp_inst_nm character varying(100)
);


--
-- Name: TABLE tb_extrl_hr_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_extrl_hr_info IS '외부시간정보 (tb_extrl_hr_info)';


--
-- Name: COLUMN tb_extrl_hr_info.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.area_no IS '면적번호 (area_no)';


--
-- Name: COLUMN tb_extrl_hr_info.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.end_telno IS '종료전화번호 (end_telno)';


--
-- Name: COLUMN tb_extrl_hr_info.md_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.md_telno IS '중간전화번호 (md_telno)';


--
-- Name: COLUMN tb_extrl_hr_info.cr_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.cr_type_cd IS '직업유형코드 (cr_type_cd)';


--
-- Name: COLUMN tb_extrl_hr_info.gndr_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.gndr_cd IS '성별코드 (gndr_cd)';


--
-- Name: COLUMN tb_extrl_hr_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_extrl_hr_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_extrl_hr_info.brdt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.brdt_ymd IS '생년월일일자 (brdt_ymd)';


--
-- Name: COLUMN tb_extrl_hr_info.evnt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.evnt_id IS '행사아이디 (evnt_id)';


--
-- Name: COLUMN tb_extrl_hr_info.otsd_hr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.otsd_hr_id IS '외부시간아이디 (otsd_hr_id)';


--
-- Name: COLUMN tb_extrl_hr_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_extrl_hr_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_extrl_hr_info.eml_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.eml_addr IS '이메일주소 (eml_addr)';


--
-- Name: COLUMN tb_extrl_hr_info.otsd_hr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.otsd_hr_nm IS '외부시간명 (otsd_hr_nm)';


--
-- Name: COLUMN tb_extrl_hr_info.ogdp_inst_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_extrl_hr_info.ogdp_inst_nm IS '소속기관명 (ogdp_inst_nm)';


--
-- Name: tb_faq_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_faq_info (
    inq_cnt integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(20),
    faq_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    ans_cn character varying(4000),
    qstn_cn character varying(4000),
    qstn_ttl character varying(100) NOT NULL
);


--
-- Name: TABLE tb_faq_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_faq_info IS 'FAQ정보 (tb_faq_info)';


--
-- Name: COLUMN tb_faq_info.inq_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.inq_cnt IS '조회수 (inq_cnt)';


--
-- Name: COLUMN tb_faq_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_faq_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_faq_info.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_faq_info.faq_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.faq_id IS 'FAQ아이디 (faq_id)';


--
-- Name: COLUMN tb_faq_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_faq_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_faq_info.ans_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.ans_cn IS '답변내용 (ans_cn)';


--
-- Name: COLUMN tb_faq_info.qstn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.qstn_cn IS '질문내용 (qstn_cn)';


--
-- Name: COLUMN tb_faq_info.qstn_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_faq_info.qstn_ttl IS '질문제목 (qstn_ttl)';


--
-- Name: tb_file_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_file_detail (
    atch_file_seq integer NOT NULL,
    file_sz bigint,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    file_estn character varying(20),
    orgnl_file_nm character varying(100),
    strg_file_nm character varying(100),
    file_strg_path character varying(1000),
    atch_file_id character varying(20) NOT NULL,
    file_cn character varying(4000),
    file_detail_id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE tb_file_detail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_file_detail IS '파일상세 (tb_file_detail)';


--
-- Name: COLUMN tb_file_detail.atch_file_seq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.atch_file_seq IS '첨부파일순서 (atch_file_seq)';


--
-- Name: COLUMN tb_file_detail.file_sz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.file_sz IS '파일크기 (file_sz)';


--
-- Name: COLUMN tb_file_detail.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_file_detail.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_file_detail.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_file_detail.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_file_detail.file_estn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.file_estn IS '파일연장 (file_estn)';


--
-- Name: COLUMN tb_file_detail.orgnl_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.orgnl_file_nm IS '원본파일명 (orgnl_file_nm)';


--
-- Name: COLUMN tb_file_detail.strg_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.strg_file_nm IS '저장파일명 (strg_file_nm)';


--
-- Name: COLUMN tb_file_detail.file_strg_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.file_strg_path IS '파일저장경로 (file_strg_path)';


--
-- Name: COLUMN tb_file_detail.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_file_detail.file_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_detail.file_cn IS '파일내용 (file_cn)';


--
-- Name: tb_file_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_file_master (
    use_yn character varying(1) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_file_master; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_file_master IS '파일마스터 (tb_file_master)';


--
-- Name: COLUMN tb_file_master.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_master.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_file_master.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_master.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_file_master.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_master.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_file_master.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_master.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_file_master.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_master.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_file_master.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_file_master.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_hlp_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_hlp_info (
    hlp_id character varying(20) NOT NULL,
    hlp_se_cd character varying(3) NOT NULL,
    hlp_dfn character varying(1000) NOT NULL,
    hlp_expln text,
    frst_rgtr_id character varying(20),
    crt_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_hlp_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_hlp_info IS '도움말정보 (tb_hlp_info)';


--
-- Name: COLUMN tb_hlp_info.hlp_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.hlp_id IS '도움말아이디 (hlp_id)';


--
-- Name: COLUMN tb_hlp_info.hlp_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.hlp_se_cd IS '도움말구분코드 (hlp_se_cd)';


--
-- Name: COLUMN tb_hlp_info.hlp_dfn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.hlp_dfn IS '도움말정의 (hlp_dfn)';


--
-- Name: COLUMN tb_hlp_info.hlp_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.hlp_expln IS '도움말설명 (hlp_expln)';


--
-- Name: COLUMN tb_hlp_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_hlp_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_hlp_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_hlp_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_hlp_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_ifml_atrz_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_ifml_atrz_info (
    aprv_yn character varying(1),
    task_se_cd character varying(12) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atrz_dt timestamp without time zone,
    req_ymd character varying(8),
    aplcnt_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    ifml_atrz_id character varying(20) NOT NULL,
    last_mdfr_id character varying(20),
    aprvr_id character varying(20) NOT NULL,
    rjct_rsn_cn character varying(4000),
    version integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE tb_ifml_atrz_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_ifml_atrz_info IS '비공식결재정보 (tb_ifml_atrz_info)';


--
-- Name: COLUMN tb_ifml_atrz_info.aprv_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.aprv_yn IS '승인여부 (aprv_yn)';


--
-- Name: COLUMN tb_ifml_atrz_info.task_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.task_se_cd IS '업무구분코드 (task_se_cd)';


--
-- Name: COLUMN tb_ifml_atrz_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_ifml_atrz_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_ifml_atrz_info.atrz_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.atrz_dt IS '결재일시 (atrz_dt)';


--
-- Name: COLUMN tb_ifml_atrz_info.req_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.req_ymd IS '소요일자 (req_ymd)';


--
-- Name: COLUMN tb_ifml_atrz_info.aplcnt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.aplcnt_id IS '신청자아이디 (aplcnt_id)';


--
-- Name: COLUMN tb_ifml_atrz_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_ifml_atrz_info.ifml_atrz_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.ifml_atrz_id IS '비공식결재아이디 (ifml_atrz_id)';


--
-- Name: COLUMN tb_ifml_atrz_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_ifml_atrz_info.aprvr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.aprvr_id IS '결재자아이디 (aprvr_id)';


--
-- Name: COLUMN tb_ifml_atrz_info.rjct_rsn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ifml_atrz_info.rjct_rsn_cn IS '반려사유내용 (rjct_rsn_cn)';


--
-- Name: tb_indv_pg; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_indv_pg (
    page_id character varying(20) NOT NULL,
    page_ttl character varying(300) NOT NULL,
    page_expln character varying(4000),
    user_id character varying(30) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_indv_pg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_indv_pg IS '개인PG (tb_indv_pg)';


--
-- Name: COLUMN tb_indv_pg.page_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.page_id IS '쪽아이디 (page_id)';


--
-- Name: COLUMN tb_indv_pg.page_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.page_ttl IS '쪽제목 (page_ttl)';


--
-- Name: COLUMN tb_indv_pg.page_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.page_expln IS '쪽설명 (page_expln)';


--
-- Name: COLUMN tb_indv_pg.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_indv_pg.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_indv_pg.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_indv_pg.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_indv_pg.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_indv_pg_conts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_indv_pg_conts (
    cntnts_id character varying(20) NOT NULL,
    cntnts_nm character varying(100),
    cntc_url character varying(255),
    cntnts_use_yn character varying(1),
    cntnts_link_url character varying(255),
    cntnts_dc character varying(255),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_indv_pg_conts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_indv_pg_conts IS '개인PG콘텐츠 (tb_indv_pg_conts)';


--
-- Name: COLUMN tb_indv_pg_conts.cntnts_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.cntnts_id IS '콘텐츠아이디 (cntnts_id)';


--
-- Name: COLUMN tb_indv_pg_conts.cntnts_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.cntnts_nm IS '콘텐츠명 (cntnts_nm)';


--
-- Name: COLUMN tb_indv_pg_conts.cntc_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.cntc_url IS '접촉URL (cntc_url)';


--
-- Name: COLUMN tb_indv_pg_conts.cntnts_use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.cntnts_use_yn IS '콘텐츠사용여부 (cntnts_use_yn)';


--
-- Name: COLUMN tb_indv_pg_conts.cntnts_link_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.cntnts_link_url IS '콘텐츠연계URL (cntnts_link_url)';


--
-- Name: COLUMN tb_indv_pg_conts.cntnts_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.cntnts_dc IS '콘텐츠설명 (cntnts_dc)';


--
-- Name: COLUMN tb_indv_pg_conts.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_indv_pg_conts.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_indv_pg_conts.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_indv_pg_conts.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_conts.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_indv_pg_set; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_indv_pg_set (
    ttl_bar_colr character varying(12),
    sort_mthd character varying(12),
    sort_cnt bigint,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_indv_pg_set; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_indv_pg_set IS '개인PG설정 (tb_indv_pg_set)';


--
-- Name: COLUMN tb_indv_pg_set.ttl_bar_colr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_set.ttl_bar_colr IS '제목바색상 (ttl_bar_colr)';


--
-- Name: COLUMN tb_indv_pg_set.sort_mthd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_set.sort_mthd IS '정렬방법 (sort_mthd)';


--
-- Name: COLUMN tb_indv_pg_set.sort_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_set.sort_cnt IS '정렬수 (sort_cnt)';


--
-- Name: COLUMN tb_indv_pg_set.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_set.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_indv_pg_set.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_set.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_indv_pg_set.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_set.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_indv_pg_set.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_indv_pg_set.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_inst_cd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_inst_cd (
    abl_yn character varying(1),
    inst_cycl character varying(12),
    inst_type_lclsf character varying(2),
    inst_type_mclsf character varying(2),
    inst_type_sclsf character varying(2),
    odr character varying(2),
    ord character varying(3),
    sort_ordr integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    top_inst_cd character varying(20),
    inst_cd character varying(20) NOT NULL,
    reprs_inst_cd character varying(20),
    upr_inst_cd character varying(20),
    abl_ymd character varying(8),
    crtr_ymd character varying(8),
    chg_ymd character varying(8),
    chg_tm character varying(20),
    crt_ymd character varying(8),
    frst_rgtr_id character varying(20),
    fax_no character varying(13),
    last_mdfr_id character varying(20),
    telno character varying(13),
    all_inst_nm character varying(100),
    inst_abbr_nm character varying(100),
    lwst_inst_nm character varying(100)
);


--
-- Name: TABLE tb_inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_inst_cd IS '기관코드 (tb_inst_cd)';


--
-- Name: COLUMN tb_inst_cd.abl_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.abl_yn IS '폐지여부 (abl_yn)';


--
-- Name: COLUMN tb_inst_cd.inst_cycl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.inst_cycl IS '기관차수 (inst_cycl)';


--
-- Name: COLUMN tb_inst_cd.inst_type_lclsf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.inst_type_lclsf IS '기관유형대분류 (inst_type_lclsf)';


--
-- Name: COLUMN tb_inst_cd.inst_type_mclsf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.inst_type_mclsf IS '기관유형중분류 (inst_type_mclsf)';


--
-- Name: COLUMN tb_inst_cd.inst_type_sclsf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.inst_type_sclsf IS '기관유형소분류 (inst_type_sclsf)';


--
-- Name: COLUMN tb_inst_cd.odr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.odr IS '발주자 (odr)';


--
-- Name: COLUMN tb_inst_cd.ord; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.ord IS '순서 (ord)';


--
-- Name: COLUMN tb_inst_cd.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.sort_ordr IS '정렬순서 (sort_seq)';


--
-- Name: COLUMN tb_inst_cd.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_inst_cd.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_inst_cd.top_inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.top_inst_cd IS '상위기관코드 (top_inst_cd)';


--
-- Name: COLUMN tb_inst_cd.inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.inst_cd IS '기관코드 (inst_cd)';


--
-- Name: COLUMN tb_inst_cd.reprs_inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.reprs_inst_cd IS '대표기관코드 (rprs_inst_cd)';


--
-- Name: COLUMN tb_inst_cd.upr_inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.upr_inst_cd IS '상위기관코드 (up_inst_cd)';


--
-- Name: COLUMN tb_inst_cd.abl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.abl_ymd IS '폐지일자 (abl_ymd)';


--
-- Name: COLUMN tb_inst_cd.crtr_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.crtr_ymd IS '기준일자 (crtr_ymd)';


--
-- Name: COLUMN tb_inst_cd.chg_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.chg_ymd IS '변경일자 (chg_ymd)';


--
-- Name: COLUMN tb_inst_cd.chg_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.chg_tm IS '변경시각 (chg_tm)';


--
-- Name: COLUMN tb_inst_cd.crt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.crt_ymd IS '생성일자 (crt_ymd)';


--
-- Name: COLUMN tb_inst_cd.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_inst_cd.fax_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.fax_no IS '팩스번호 (fax_no)';


--
-- Name: COLUMN tb_inst_cd.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_inst_cd.telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.telno IS '전화번호 (telno)';


--
-- Name: COLUMN tb_inst_cd.all_inst_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.all_inst_nm IS '전체기관명 (all_inst_nm)';


--
-- Name: COLUMN tb_inst_cd.inst_abbr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.inst_abbr_nm IS '기관약어명 (inst_abbr_nm)';


--
-- Name: COLUMN tb_inst_cd.lwst_inst_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd.lwst_inst_nm IS '최하위기관명 (lwtrk_inst_nm)';


--
-- Name: tb_inst_cd_rcptn_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_inst_cd_rcptn_log (
    abl_yn character varying(1),
    chg_se_cd character varying(12),
    inst_cycl character varying(2),
    inst_type_lclsf character varying(2),
    inst_type_mclsf character varying(2),
    inst_type_sclsf character varying(2),
    odr character varying(2),
    ord character varying(3),
    proc_se character varying(1),
    sort_ordr integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    job_sn bigint NOT NULL,
    top_inst_cd character varying(20),
    inst_cd character varying(20) NOT NULL,
    reprs_inst_cd character varying(20),
    upr_inst_cd character varying(20),
    abl_ymd character varying(8),
    crtr_ymd character varying(8),
    chg_ymd character varying(8),
    chg_tm character varying(20),
    crt_ymd character varying(8),
    frst_rgtr_id character varying(20),
    fax_no character varying(20),
    last_mdfr_id character varying(20),
    ocrn_ymd character varying(8) NOT NULL,
    telno character varying(20),
    etc_cd character varying(20),
    all_inst_nm character varying(100),
    inst_abbr_nm character varying(100),
    lwst_inst_nm character varying(100)
);


--
-- Name: TABLE tb_inst_cd_rcptn_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_inst_cd_rcptn_log IS '기관코드수신로그 (tb_inst_cd_rcptn_log)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.abl_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.abl_yn IS '폐지여부 (abl_yn)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.chg_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.chg_se_cd IS '변경구분코드 (chg_se_cd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.inst_cycl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.inst_cycl IS '기관차수 (inst_cycl)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.inst_type_lclsf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.inst_type_lclsf IS '기관유형대분류 (inst_type_lclsf)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.inst_type_mclsf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.inst_type_mclsf IS '기관유형중분류 (inst_type_mclsf)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.inst_type_sclsf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.inst_type_sclsf IS '기관유형소분류 (inst_type_sclsf)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.odr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.odr IS '발주자 (odr)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.ord; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.ord IS '순서 (ord)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.proc_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.proc_se IS '프로세스구분 (proc_se)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.sort_ordr IS '정렬주문 (sort_ordr)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.job_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.job_sn IS '작업일련번호 (job_sn)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.top_inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.top_inst_cd IS '상위기관코드 (top_inst_cd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.inst_cd IS '기관코드 (inst_cd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.reprs_inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.reprs_inst_cd IS '대표기관코드 (reprs_inst_cd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.upr_inst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.upr_inst_cd IS '상위기관코드 (upr_inst_cd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.abl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.abl_ymd IS '폐지일자 (abl_ymd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.crtr_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.crtr_ymd IS '기준일자 (crtr_ymd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.chg_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.chg_ymd IS '변경일자 (chg_ymd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.chg_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.chg_tm IS '변경시각 (chg_tm)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.crt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.crt_ymd IS '생성일자 (crt_ymd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.fax_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.fax_no IS '팩스번호 (fax_no)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.ocrn_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.telno IS '전화번호 (telno)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.etc_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.etc_cd IS '기타코드 (etc_cd)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.all_inst_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.all_inst_nm IS '전체기관명 (all_inst_nm)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.inst_abbr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.inst_abbr_nm IS '기관약어명 (inst_abbr_nm)';


--
-- Name: COLUMN tb_inst_cd_rcptn_log.lwst_inst_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_inst_cd_rcptn_log.lwst_inst_nm IS '최저기관명 (lwst_inst_nm)';


--
-- Name: tb_intrn_svc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_intrn_svc (
    itnt_svc_id character varying(20) NOT NULL,
    itnt_svc_nm character varying(100),
    itnt_svc_expln character varying(4000),
    rflt_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_intrn_svc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_intrn_svc IS '인턴봉사 (tb_intrn_svc)';


--
-- Name: COLUMN tb_intrn_svc.itnt_svc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.itnt_svc_id IS '인터넷봉사아이디 (itnt_svc_id)';


--
-- Name: COLUMN tb_intrn_svc.itnt_svc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.itnt_svc_nm IS '인터넷봉사명 (itnt_svc_nm)';


--
-- Name: COLUMN tb_intrn_svc.itnt_svc_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.itnt_svc_expln IS '인터넷봉사설명 (itnt_svc_expln)';


--
-- Name: COLUMN tb_intrn_svc.rflt_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.rflt_yn IS '반영여부 (rflt_yn)';


--
-- Name: COLUMN tb_intrn_svc.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_intrn_svc.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_intrn_svc.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_intrn_svc.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_intrn_svc.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_leader_schdl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_leader_schdl (
    rept_se_cd character varying(12),
    schdl_imprt_cd character varying(12),
    schdl_se_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    leader_id character varying(20) NOT NULL,
    schdl_bgng_ymd character varying(8),
    schdl_pic_id character varying(20),
    schdl_end_ymd character varying(8),
    schdl_id character varying(20) NOT NULL,
    schdl_cn character varying(4000),
    schdl_nm character varying(100) NOT NULL,
    schdl_plc_nm character varying(100)
);


--
-- Name: TABLE tb_leader_schdl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_leader_schdl IS '리더일정 (tb_leader_schdl)';


--
-- Name: COLUMN tb_leader_schdl.rept_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.rept_se_cd IS '반복구분코드 (rept_se_cd)';


--
-- Name: COLUMN tb_leader_schdl.schdl_imprt_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_imprt_cd IS '일정중요도코드 (schdl_imprt_cd)';


--
-- Name: COLUMN tb_leader_schdl.schdl_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_se_cd IS '일정구분코드 (schdl_se_cd)';


--
-- Name: COLUMN tb_leader_schdl.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_leader_schdl.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_leader_schdl.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_leader_schdl.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_leader_schdl.leader_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.leader_id IS '리더아이디 (leader_id)';


--
-- Name: COLUMN tb_leader_schdl.schdl_bgng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_bgng_ymd IS '일정시작일자 (schdl_bgng_ymd)';


--
-- Name: COLUMN tb_leader_schdl.schdl_pic_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_pic_id IS '일정담당자아이디 (schdl_pic_id)';


--
-- Name: COLUMN tb_leader_schdl.schdl_end_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_end_ymd IS '일정종료일자 (schdl_end_ymd)';


--
-- Name: COLUMN tb_leader_schdl.schdl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_id IS '일정아이디 (schdl_id)';


--
-- Name: COLUMN tb_leader_schdl.schdl_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_cn IS '일정내용 (schdl_cn)';


--
-- Name: COLUMN tb_leader_schdl.schdl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_nm IS '일정명 (schdl_nm)';


--
-- Name: COLUMN tb_leader_schdl.schdl_plc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl.schdl_plc_nm IS '일정장소명 (schdl_plc_nm)';


--
-- Name: tb_leader_schdl_dtl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_leader_schdl_dtl (
    schdl_id character varying(20) NOT NULL,
    schdl_ymd character varying(8) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_leader_schdl_dtl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_leader_schdl_dtl IS '리더일정상세 (tb_leader_schdl_dtl)';


--
-- Name: COLUMN tb_leader_schdl_dtl.schdl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl_dtl.schdl_id IS '일정아이디 (schdl_id)';


--
-- Name: COLUMN tb_leader_schdl_dtl.schdl_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl_dtl.schdl_ymd IS '일정일자 (schdl_ymd)';


--
-- Name: COLUMN tb_leader_schdl_dtl.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl_dtl.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_leader_schdl_dtl.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl_dtl.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_leader_schdl_dtl.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl_dtl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_leader_schdl_dtl.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_schdl_dtl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_leader_stts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_leader_stts (
    leader_stts_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    leader_id character varying(20) NOT NULL
);


--
-- Name: TABLE tb_leader_stts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_leader_stts IS '리더상태 (tb_leader_stts)';


--
-- Name: COLUMN tb_leader_stts.leader_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_stts.leader_stts_cd IS '리더상태코드 (leader_stts_cd)';


--
-- Name: COLUMN tb_leader_stts.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_stts.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_leader_stts.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_stts.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_leader_stts.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_stts.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_leader_stts.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_stts.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_leader_stts.leader_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_leader_stts.leader_id IS '리더아이디 (leader_id)';


--
-- Name: tb_login_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_login_log (
    err_cd character varying(12),
    err_ocrn_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    cntn_mthd_cd character varying(12),
    user_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    log_id character varying(20) NOT NULL,
    lgn_ip_addr character varying(30)
);


--
-- Name: TABLE tb_login_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_login_log IS '로그인로그 (tb_login_log)';


--
-- Name: COLUMN tb_login_log.err_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.err_cd IS '오류코드 (err_cd)';


--
-- Name: COLUMN tb_login_log.err_ocrn_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.err_ocrn_yn IS '오류발생여부 (err_ocrn_yn)';


--
-- Name: COLUMN tb_login_log.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_login_log.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_login_log.cntn_mthd_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.cntn_mthd_cd IS '접속방법코드 (cntn_mthd_cd)';


--
-- Name: COLUMN tb_login_log.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_login_log.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_login_log.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_login_log.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.log_id IS '로그아이디 (log_id)';


--
-- Name: COLUMN tb_login_log.lgn_ip_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_log.lgn_ip_addr IS '로그인IP주소 (lgn_ip_addr)';


--
-- Name: tb_login_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_login_policy (
    dpcn_prm_yn character varying(1),
    lmt_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    user_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    ip_addr character varying(30),
    bgng_tm character varying(6),
    end_tm character varying(6),
    otp_use_yn character varying(1)
);


--
-- Name: TABLE tb_login_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_login_policy IS '로그인정책 (tb_login_policy)';


--
-- Name: COLUMN tb_login_policy.dpcn_prm_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.dpcn_prm_yn IS '중복허용여부 (dpcn_prm_yn)';


--
-- Name: COLUMN tb_login_policy.lmt_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.lmt_yn IS '제한여부 (lmt_yn)';


--
-- Name: COLUMN tb_login_policy.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_login_policy.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_login_policy.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_login_policy.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_login_policy.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_login_policy.ip_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.ip_addr IS 'IP주소 (ip_addr)';


--
-- Name: COLUMN tb_login_policy.bgng_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.bgng_tm IS '시작시각 (bgng_tm)';


--
-- Name: COLUMN tb_login_policy.end_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.end_tm IS '종료시각 (end_tm)';


--
-- Name: COLUMN tb_login_policy.otp_use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_login_policy.otp_use_yn IS 'OTP사용여부 (otp_use_yn)';


--
-- Name: tb_main_image; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_main_image (
    rflt_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    img_file_nm character varying(100),
    img_id character varying(20) NOT NULL,
    last_mdfr_id character varying(20),
    main_img_file_path character varying(50),
    img_nm character varying(100) NOT NULL,
    main_img_expln character varying(4000)
);


--
-- Name: TABLE tb_main_image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_main_image IS '주요이미지 (tb_main_image)';


--
-- Name: COLUMN tb_main_image.rflt_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.rflt_yn IS '반영여부 (rflt_yn)';


--
-- Name: COLUMN tb_main_image.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_main_image.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_main_image.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_main_image.img_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.img_file_nm IS '이미지파일명 (img_file_nm)';


--
-- Name: COLUMN tb_main_image.img_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.img_id IS '이미지아이디 (img_id)';


--
-- Name: COLUMN tb_main_image.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_main_image.main_img_file_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.main_img_file_path IS '주요이미지파일경로 (main_img_file_path)';


--
-- Name: COLUMN tb_main_image.img_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.img_nm IS '이미지명 (img_nm)';


--
-- Name: COLUMN tb_main_image.main_img_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_main_image.main_img_expln IS '주요이미지설명 (main_img_expln)';


--
-- Name: tb_memo_rpt_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_memo_rpt_info (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    memo_rpt_ymd character varying(8),
    atch_file_id character varying(20),
    drctn_mttr_reg_dt character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    rptr_id character varying(20) NOT NULL,
    rptr_inq_dt character varying(20),
    rpt_id character varying(20) NOT NULL,
    user_id character varying(20) NOT NULL,
    drctn_mttr character varying(2000),
    rpt_cn character varying(4000),
    rpt_ttl character varying(100) NOT NULL
);


--
-- Name: TABLE tb_memo_rpt_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_memo_rpt_info IS '메모보고정보 (tb_memo_rpt_info)';


--
-- Name: COLUMN tb_memo_rpt_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_memo_rpt_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_memo_rpt_info.memo_rpt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.memo_rpt_ymd IS '메모보고일자 (memo_rpt_ymd)';


--
-- Name: COLUMN tb_memo_rpt_info.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_memo_rpt_info.drctn_mttr_reg_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.drctn_mttr_reg_dt IS '지시사항등록일시 (drctn_mttr_reg_dt)';


--
-- Name: COLUMN tb_memo_rpt_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_memo_rpt_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_memo_rpt_info.rptr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.rptr_id IS '보고자아이디 (rptr_id)';


--
-- Name: COLUMN tb_memo_rpt_info.rptr_inq_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.rptr_inq_dt IS '보고자조회일시 (rptr_inq_dt)';


--
-- Name: COLUMN tb_memo_rpt_info.rpt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.rpt_id IS '보고아이디 (rpt_id)';


--
-- Name: COLUMN tb_memo_rpt_info.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_memo_rpt_info.drctn_mttr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.drctn_mttr IS '지시사항 (drctn_mttr)';


--
-- Name: COLUMN tb_memo_rpt_info.rpt_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.rpt_cn IS '보고내용 (rpt_cn)';


--
-- Name: COLUMN tb_memo_rpt_info.rpt_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_rpt_info.rpt_ttl IS '보고제목 (rpt_ttl)';


--
-- Name: tb_memo_todo_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_memo_todo_info (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    todo_bgng_tm character varying(6),
    todo_end_tm character varying(6),
    todo_id character varying(20) NOT NULL,
    user_id character varying(20) NOT NULL,
    todo_cn character varying(4000),
    todo_ttl character varying(100) NOT NULL
);


--
-- Name: TABLE tb_memo_todo_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_memo_todo_info IS '메모할일정보 (tb_memo_todo_info)';


--
-- Name: COLUMN tb_memo_todo_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_memo_todo_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_memo_todo_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_memo_todo_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_memo_todo_info.todo_bgng_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.todo_bgng_tm IS '할일시작시각 (todo_bgng_tm)';


--
-- Name: COLUMN tb_memo_todo_info.todo_end_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.todo_end_tm IS '할일종료시각 (todo_end_tm)';


--
-- Name: COLUMN tb_memo_todo_info.todo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.todo_id IS '할일아이디 (todo_id)';


--
-- Name: COLUMN tb_memo_todo_info.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_memo_todo_info.todo_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.todo_cn IS '할일내용 (todo_cn)';


--
-- Name: COLUMN tb_memo_todo_info.todo_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_memo_todo_info.todo_ttl IS '할일제목 (todo_ttl)';


--
-- Name: tb_menu_crt_dtl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_menu_crt_dtl (
    menu_sn bigint NOT NULL,
    authrt_cd character varying(12) NOT NULL,
    mapng_crt_id character varying(20),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_menu_crt_dtl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_menu_crt_dtl IS '메뉴생성상세 (tb_menu_crt_dtl)';


--
-- Name: COLUMN tb_menu_crt_dtl.menu_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_crt_dtl.menu_sn IS '메뉴일련번호 (menu_sn)';


--
-- Name: COLUMN tb_menu_crt_dtl.authrt_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_crt_dtl.authrt_cd IS '권한코드 (authrt_cd)';


--
-- Name: COLUMN tb_menu_crt_dtl.mapng_crt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_crt_dtl.mapng_crt_id IS '매핑생성아이디 (mapng_crt_id)';


--
-- Name: COLUMN tb_menu_crt_dtl.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_crt_dtl.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_menu_crt_dtl.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_crt_dtl.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_menu_crt_dtl.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_crt_dtl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_menu_crt_dtl.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_crt_dtl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_menu_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_menu_info (
    menu_ordr integer NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    menu_sn bigint NOT NULL,
    route_mdfcn_yn character varying(1),
    up_menu_sn bigint,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    menu_nm character varying(100) NOT NULL,
    prgrm_file_nm character varying(100),
    rel_img_nm character varying(100),
    rel_img_path character varying(100),
    menu_expln character varying(4000),
    modern_route character varying(500),
    use_yn character varying(1) DEFAULT 'Y'::character varying NOT NULL,
    del_yn character varying(1) DEFAULT 'N'::character varying NOT NULL
);


--
-- Name: TABLE tb_menu_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_menu_info IS '메뉴정보 (tb_menu_info)';


--
-- Name: COLUMN tb_menu_info.menu_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.menu_ordr IS '메뉴주문 (menu_ordr)';


--
-- Name: COLUMN tb_menu_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_menu_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_menu_info.menu_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.menu_sn IS '메뉴일련번호 (menu_sn)';


--
-- Name: COLUMN tb_menu_info.route_mdfcn_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.route_mdfcn_yn IS '경로수정여부 (route_mdfcn_yn)';


--
-- Name: COLUMN tb_menu_info.up_menu_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.up_menu_sn IS '상위메뉴일련번호 (up_menu_sn)';


--
-- Name: COLUMN tb_menu_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_menu_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_menu_info.menu_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.menu_nm IS '메뉴명 (menu_nm)';


--
-- Name: COLUMN tb_menu_info.prgrm_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.prgrm_file_nm IS '프로그램파일명 (prgrm_file_nm)';


--
-- Name: COLUMN tb_menu_info.rel_img_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.rel_img_nm IS '관계이미지명 (rel_img_nm)';


--
-- Name: COLUMN tb_menu_info.rel_img_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.rel_img_path IS '관계이미지경로 (rel_img_path)';


--
-- Name: COLUMN tb_menu_info.menu_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.menu_expln IS '메뉴설명 (menu_expln)';


--
-- Name: COLUMN tb_menu_info.modern_route; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.modern_route IS '모던경로 (modern_route)';


--
-- Name: COLUMN tb_menu_info.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_menu_info.use_yn IS '사용여부';


--
-- Name: tb_note_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_note_info (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(20),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    note_id character varying(20) NOT NULL,
    note_cn character varying(4000),
    note_ttl character varying(100)
);


--
-- Name: TABLE tb_note_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_note_info IS '쪽지정보 (tb_note_info)';


--
-- Name: COLUMN tb_note_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_note_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_note_info.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_note_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_note_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_note_info.note_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.note_id IS '쪽지아이디 (note_id)';


--
-- Name: COLUMN tb_note_info.note_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.note_cn IS '쪽지내용 (note_cn)';


--
-- Name: COLUMN tb_note_info.note_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_info.note_ttl IS '쪽지제목 (note_ttl)';


--
-- Name: tb_note_rcptn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_note_rcptn (
    open_yn character varying(1),
    rcptn_se_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    note_id character varying(20),
    note_rcptn_id character varying(20) NOT NULL,
    note_sndng_id character varying(20),
    rcvr_id character varying(20)
);


--
-- Name: TABLE tb_note_rcptn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_note_rcptn IS '쪽지수신 (tb_note_rcptn)';


--
-- Name: COLUMN tb_note_rcptn.open_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.open_yn IS '개봉여부 (open_yn)';


--
-- Name: COLUMN tb_note_rcptn.rcptn_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.rcptn_se_cd IS '수신구분코드 (rcptn_se_cd)';


--
-- Name: COLUMN tb_note_rcptn.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_note_rcptn.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_note_rcptn.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_note_rcptn.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_note_rcptn.note_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.note_id IS '쪽지아이디 (note_id)';


--
-- Name: COLUMN tb_note_rcptn.note_rcptn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.note_rcptn_id IS '쪽지수신아이디 (note_rcptn_id)';


--
-- Name: COLUMN tb_note_rcptn.note_sndng_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.note_sndng_id IS '쪽지발송아이디 (note_sndng_id)';


--
-- Name: COLUMN tb_note_rcptn.rcvr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_rcptn.rcvr_id IS '수신자아이디 (rcvr_id)';


--
-- Name: tb_note_sndng; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_note_sndng (
    del_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    note_id character varying(20),
    note_sndng_id character varying(20) NOT NULL,
    sndr_id character varying(20)
);


--
-- Name: TABLE tb_note_sndng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_note_sndng IS '쪽지발송 (tb_note_sndng)';


--
-- Name: COLUMN tb_note_sndng.del_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.del_yn IS '삭제여부 (del_yn)';


--
-- Name: COLUMN tb_note_sndng.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_note_sndng.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_note_sndng.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_note_sndng.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_note_sndng.note_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.note_id IS '쪽지아이디 (note_id)';


--
-- Name: COLUMN tb_note_sndng.note_sndng_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.note_sndng_id IS '쪽지발송아이디 (note_sndng_id)';


--
-- Name: COLUMN tb_note_sndng.sndr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_note_sndng.sndr_id IS '발송자아이디 (sndr_id)';


--
-- Name: tb_noti_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_noti_info (
    noti_sn bigint NOT NULL,
    noti_ttl character varying(100) NOT NULL,
    noti_cn character varying(4000) NOT NULL,
    noti_dt character varying(14) NOT NULL,
    bfhd_noti_intrvl character varying(20) NOT NULL,
    crt_dt timestamp without time zone NOT NULL,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20) NOT NULL,
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_noti_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_noti_info IS '알림정보 (tb_noti_info)';


--
-- Name: COLUMN tb_noti_info.noti_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.noti_sn IS '알림일련번호 (noti_sn)';


--
-- Name: COLUMN tb_noti_info.noti_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.noti_ttl IS '알림제목 (noti_ttl)';


--
-- Name: COLUMN tb_noti_info.noti_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.noti_cn IS '알림내용 (noti_cn)';


--
-- Name: COLUMN tb_noti_info.noti_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.noti_dt IS '알림일시 (noti_dt)';


--
-- Name: COLUMN tb_noti_info.bfhd_noti_intrvl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.bfhd_noti_intrvl IS '사전알림주기 (bfhd_noti_intrvl)';


--
-- Name: COLUMN tb_noti_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_noti_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_noti_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_noti_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_noti_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_ognz_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_ognz_info (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    ognz_id character varying(20) NOT NULL,
    ognz_nm character varying(100),
    ognz_expln character varying(4000)
);


--
-- Name: TABLE tb_ognz_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_ognz_info IS '조직정보 (tb_orgnzt_info)';


--
-- Name: COLUMN tb_ognz_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ognz_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_ognz_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ognz_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_ognz_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ognz_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_ognz_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ognz_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_ognz_info.ognz_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ognz_info.ognz_id IS '조직아이디 (ognz_id)';


--
-- Name: COLUMN tb_ognz_info.ognz_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ognz_info.ognz_nm IS '조직명 (ognz_nm)';


--
-- Name: COLUMN tb_ognz_info.ognz_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_ognz_info.ognz_expln IS '조직설명 (ognz_expln)';


--
-- Name: tb_onln_mnl_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_onln_mnl_info (
    onln_mnl_id character varying(20) NOT NULL,
    onln_mnl_se_cd character varying(12),
    onln_mnl_dfn text,
    onln_mnl_expln character varying(4000),
    frst_rgtr_id character varying(20),
    crt_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    mdfcn_dt timestamp without time zone,
    onln_mnl_nm character varying(100)
);


--
-- Name: TABLE tb_onln_mnl_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_onln_mnl_info IS '온라인매뉴얼정보 (tb_onln_mnl_info)';


--
-- Name: COLUMN tb_onln_mnl_info.onln_mnl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.onln_mnl_id IS '온라인매뉴얼아이디 (onln_mnl_id)';


--
-- Name: COLUMN tb_onln_mnl_info.onln_mnl_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.onln_mnl_se_cd IS '온라인매뉴얼구분코드 (onln_mnl_se_cd)';


--
-- Name: COLUMN tb_onln_mnl_info.onln_mnl_dfn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.onln_mnl_dfn IS '온라인매뉴얼정의 (onln_mnl_dfn)';


--
-- Name: COLUMN tb_onln_mnl_info.onln_mnl_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.onln_mnl_expln IS '온라인매뉴얼설명 (onln_mnl_expln)';


--
-- Name: COLUMN tb_onln_mnl_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_onln_mnl_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_onln_mnl_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_onln_mnl_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_onln_mnl_info.onln_mnl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_mnl_info.onln_mnl_nm IS '온라인매뉴얼명 (onln_mnl_nm)';


--
-- Name: tb_onln_poll_artcl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_onln_poll_artcl (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    poll_id character varying(20) NOT NULL,
    poll_artcl_id character varying(20) NOT NULL,
    poll_artcl_nm character varying(100) NOT NULL
);


--
-- Name: TABLE tb_onln_poll_artcl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_onln_poll_artcl IS '온라인여론조사항목 (tb_onln_poll_artcl)';


--
-- Name: COLUMN tb_onln_poll_artcl.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_artcl.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_onln_poll_artcl.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_artcl.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_onln_poll_artcl.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_artcl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_onln_poll_artcl.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_artcl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_onln_poll_artcl.poll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_artcl.poll_id IS '여론조사아이디 (poll_id)';


--
-- Name: COLUMN tb_onln_poll_artcl.poll_artcl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_artcl.poll_artcl_id IS '여론조사항목아이디 (poll_artcl_id)';


--
-- Name: COLUMN tb_onln_poll_artcl.poll_artcl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_artcl.poll_artcl_nm IS '여론조사항목명 (poll_artcl_nm)';


--
-- Name: tb_onln_poll_manage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_onln_poll_manage (
    poll_atmc_dsuse_yn character varying(1),
    poll_dsuse_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    poll_bgng_ymd character varying(8),
    poll_end_ymd character varying(8),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    poll_id character varying(20) NOT NULL,
    poll_knd_cd character varying(12),
    poll_nm character varying(100) NOT NULL
);


--
-- Name: TABLE tb_onln_poll_manage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_onln_poll_manage IS '온라인여론조사관리 (tb_onln_poll_manage)';


--
-- Name: COLUMN tb_onln_poll_manage.poll_atmc_dsuse_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.poll_atmc_dsuse_yn IS '여론조사자동폐기여부 (poll_atmc_dsuse_yn)';


--
-- Name: COLUMN tb_onln_poll_manage.poll_dsuse_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.poll_dsuse_yn IS '여론조사폐기여부 (poll_dsuse_yn)';


--
-- Name: COLUMN tb_onln_poll_manage.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_onln_poll_manage.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_onln_poll_manage.poll_bgng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.poll_bgng_ymd IS '여론조사시작일자 (poll_bgng_ymd)';


--
-- Name: COLUMN tb_onln_poll_manage.poll_end_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.poll_end_ymd IS '여론조사종료일자 (poll_end_ymd)';


--
-- Name: COLUMN tb_onln_poll_manage.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_onln_poll_manage.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_onln_poll_manage.poll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.poll_id IS '여론조사아이디 (poll_id)';


--
-- Name: COLUMN tb_onln_poll_manage.poll_knd_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.poll_knd_cd IS '여론조사종류코드 (poll_knd_cd)';


--
-- Name: COLUMN tb_onln_poll_manage.poll_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_manage.poll_nm IS '여론조사명 (poll_nm)';


--
-- Name: tb_onln_poll_rslt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_onln_poll_rslt (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    poll_id character varying(20) NOT NULL,
    poll_artcl_id character varying(20) NOT NULL,
    poll_rslt_id character varying(20) NOT NULL
);


--
-- Name: TABLE tb_onln_poll_rslt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_onln_poll_rslt IS '온라인여론조사결과 (tb_onln_poll_rslt)';


--
-- Name: COLUMN tb_onln_poll_rslt.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_rslt.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_onln_poll_rslt.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_rslt.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_onln_poll_rslt.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_rslt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_onln_poll_rslt.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_rslt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_onln_poll_rslt.poll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_rslt.poll_id IS '여론조사아이디 (poll_id)';


--
-- Name: COLUMN tb_onln_poll_rslt.poll_artcl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_rslt.poll_artcl_id IS '여론조사항목아이디 (poll_artcl_id)';


--
-- Name: COLUMN tb_onln_poll_rslt.poll_rslt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_onln_poll_rslt.poll_rslt_id IS '여론조사결과아이디 (poll_rslt_id)';


--
-- Name: tb_plcy_manage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_plcy_manage (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    plcy_type_cd character varying(12) NOT NULL,
    plcy_cn character varying(4000) NOT NULL,
    plcy_ttl character varying(100) NOT NULL
);


--
-- Name: TABLE tb_plcy_manage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_plcy_manage IS '정책관리 (tb_plcy_manage)';


--
-- Name: COLUMN tb_plcy_manage.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_plcy_manage.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_plcy_manage.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_plcy_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_plcy_manage.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_plcy_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_plcy_manage.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_plcy_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_plcy_manage.plcy_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_plcy_manage.plcy_type_cd IS '정책유형코드 (plcy_type_cd)';


--
-- Name: COLUMN tb_plcy_manage.plcy_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_plcy_manage.plcy_cn IS '정책내용 (plcy_cn)';


--
-- Name: COLUMN tb_plcy_manage.plcy_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_plcy_manage.plcy_ttl IS '정책제목 (plcy_ttl)';


--
-- Name: tb_popup_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_popup_info (
    ntce_yn character varying(1),
    stopvew_setup_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    ntce_bgnde date,
    ntce_endde date,
    popup_id character varying(20) NOT NULL,
    popup_vrtc_pstn character varying(12),
    popup_vrtc_sz character varying(12),
    popup_wdth_pstn character varying(12),
    popup_wdth_sz character varying(12),
    file_url character varying(1000),
    popup_ttl_nm character varying(100) NOT NULL
);


--
-- Name: TABLE tb_popup_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_popup_info IS '팝업정보 (tb_popup_info)';


--
-- Name: COLUMN tb_popup_info.ntce_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.ntce_yn IS '공지여부 (ntce_yn)';


--
-- Name: COLUMN tb_popup_info.stopvew_setup_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.stopvew_setup_yn IS '그만보기설정여부 (stopvew_setup_yn)';


--
-- Name: COLUMN tb_popup_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_popup_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_popup_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_popup_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_popup_info.ntce_bgnde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.ntce_bgnde IS '공지시작일 (ntce_bgnde)';


--
-- Name: COLUMN tb_popup_info.ntce_endde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.ntce_endde IS '공지종료일 (ntce_endde)';


--
-- Name: COLUMN tb_popup_info.popup_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.popup_id IS '팝업아이디 (popup_id)';


--
-- Name: COLUMN tb_popup_info.popup_vrtc_pstn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.popup_vrtc_pstn IS '팝업세로위치 (popup_vrtc_pstn)';


--
-- Name: COLUMN tb_popup_info.popup_vrtc_sz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.popup_vrtc_sz IS '팝업세로크기 (popup_vrtc_sz)';


--
-- Name: COLUMN tb_popup_info.popup_wdth_pstn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.popup_wdth_pstn IS '팝업가로위치 (popup_wdth_pstn)';


--
-- Name: COLUMN tb_popup_info.popup_wdth_sz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.popup_wdth_sz IS '팝업가로크기 (popup_wdth_sz)';


--
-- Name: COLUMN tb_popup_info.file_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.file_url IS '파일URL (file_url)';


--
-- Name: COLUMN tb_popup_info.popup_ttl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_popup_info.popup_ttl_nm IS '팝업제목명 (popup_ttl_nm)';


--
-- Name: tb_prgrm_lst; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_prgrm_lst (
    prgrm_file_nm character varying(100) NOT NULL,
    prgrm_korn_nm character varying(100),
    prgrm_strg_path character varying(1000),
    url character varying(1000),
    prgrm_expln character varying(4000),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_prgrm_lst; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_prgrm_lst IS '프로그램목록 (tb_prgrm_lst)';


--
-- Name: COLUMN tb_prgrm_lst.prgrm_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.prgrm_file_nm IS '프로그램파일명 (prgrm_file_nm)';


--
-- Name: COLUMN tb_prgrm_lst.prgrm_korn_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.prgrm_korn_nm IS '프로그램한글명 (prgrm_korn_nm)';


--
-- Name: COLUMN tb_prgrm_lst.prgrm_strg_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.prgrm_strg_path IS '프로그램저장경로 (prgrm_strg_path)';


--
-- Name: COLUMN tb_prgrm_lst.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.url IS 'URL (url)';


--
-- Name: COLUMN tb_prgrm_lst.prgrm_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.prgrm_expln IS '프로그램설명 (prgrm_expln)';


--
-- Name: COLUMN tb_prgrm_lst.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_prgrm_lst.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_prgrm_lst.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_prgrm_lst.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_prgrm_lst.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_privacy_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_privacy_log (
    crt_dt timestamp without time zone,
    inq_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    dmnd_id character varying(20) NOT NULL,
    dmnd_user_id character varying(20),
    dmnd_user_ip_addr character varying(30),
    inq_info character varying(255),
    srvc_nm character varying(100)
);


--
-- Name: TABLE tb_privacy_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_privacy_log IS '개인정보로그 (tb_privacy_log)';


--
-- Name: COLUMN tb_privacy_log.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_privacy_log.inq_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.inq_dt IS '조회일시 (inq_dt)';


--
-- Name: COLUMN tb_privacy_log.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_privacy_log.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_privacy_log.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_privacy_log.dmnd_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.dmnd_id IS '요청아이디 (dmnd_id)';


--
-- Name: COLUMN tb_privacy_log.dmnd_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';


--
-- Name: COLUMN tb_privacy_log.dmnd_user_ip_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.dmnd_user_ip_addr IS '요청사용자IP주소 (dmnd_user_ip_addr)';


--
-- Name: COLUMN tb_privacy_log.inq_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.inq_info IS '조회정보 (inq_info)';


--
-- Name: COLUMN tb_privacy_log.srvc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_privacy_log.srvc_nm IS '서비스명 (srvc_nm)';


--
-- Name: tb_role_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_role_info (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    role_sort integer,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    role_crt_ymd date,
    role_id character varying(30) NOT NULL,
    role_nm character varying(100) NOT NULL,
    role_type_cd character varying(12),
    role_expln character varying(4000),
    role_patrn character varying(300)
);


--
-- Name: TABLE tb_role_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_role_info IS '역할정보 (tb_role_info)';


--
-- Name: COLUMN tb_role_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_role_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_role_info.role_sort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.role_sort IS '역할정렬 (role_sort)';


--
-- Name: COLUMN tb_role_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_role_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_role_info.role_crt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.role_crt_ymd IS '역할생성일자 (role_crt_ymd)';


--
-- Name: COLUMN tb_role_info.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.role_id IS '역할아이디 (role_id)';


--
-- Name: COLUMN tb_role_info.role_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.role_nm IS '역할명 (role_nm)';


--
-- Name: COLUMN tb_role_info.role_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.role_type_cd IS '역할유형코드 (role_type_cd)';


--
-- Name: COLUMN tb_role_info.role_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.role_expln IS '역할설명 (role_expln)';


--
-- Name: COLUMN tb_role_info.role_patrn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_info.role_patrn IS '역할패턴 (role_patrn)';


--
-- Name: tb_role_lyr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_role_lyr (
    prnt_role_id character varying(30) NOT NULL,
    chld_role_id character varying(30) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_role_lyr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_role_lyr IS '역할계층 (tb_role_lyr)';


--
-- Name: COLUMN tb_role_lyr.prnt_role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_lyr.prnt_role_id IS '부모역할아이디 (prnt_role_id)';


--
-- Name: COLUMN tb_role_lyr.chld_role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_lyr.chld_role_id IS '자녀역할아이디 (chld_role_id)';


--
-- Name: COLUMN tb_role_lyr.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_lyr.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_role_lyr.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_lyr.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_role_lyr.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_lyr.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_role_lyr.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_role_lyr.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_rpt_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_rpt_info (
    rpt_se_cd character varying(12),
    rpt_stts_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    rpt_ymd character varying(8),
    rpt_id character varying(20) NOT NULL,
    user_id character varying(20) NOT NULL,
    rpt_cn character varying(4000),
    rpt_ttl character varying(100) NOT NULL,
    atch_file_id character varying(20)
);


--
-- Name: TABLE tb_rpt_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_rpt_info IS '보고정보 (tb_rpt_info)';


--
-- Name: COLUMN tb_rpt_info.rpt_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.rpt_se_cd IS '보고구분코드 (rpt_se_cd)';


--
-- Name: COLUMN tb_rpt_info.rpt_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.rpt_stts_cd IS '보고상태코드 (rpt_stts_cd)';


--
-- Name: COLUMN tb_rpt_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_rpt_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_rpt_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_rpt_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_rpt_info.rpt_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.rpt_ymd IS '보고일자 (rpt_ymd)';


--
-- Name: COLUMN tb_rpt_info.rpt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.rpt_id IS '보고아이디 (rpt_id)';


--
-- Name: COLUMN tb_rpt_info.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_rpt_info.rpt_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.rpt_cn IS '보고내용 (rpt_cn)';


--
-- Name: COLUMN tb_rpt_info.rpt_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rpt_info.rpt_ttl IS '보고제목 (rpt_ttl)';


--
-- Name: tb_rptp_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_rptp_stats (
    reprt_id character varying(20) NOT NULL,
    reprt_nm character varying(255),
    reprt_sttus character varying(1),
    reprt_type character varying(1),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_rptp_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_rptp_stats IS '보고서통계 (tb_rptp_stats)';


--
-- Name: COLUMN tb_rptp_stats.reprt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.reprt_id IS '보고서아이디 (reprt_id)';


--
-- Name: COLUMN tb_rptp_stats.reprt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.reprt_nm IS '보고서명 (reprt_nm)';


--
-- Name: COLUMN tb_rptp_stats.reprt_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.reprt_sttus IS '보고서상태 (reprt_sttus)';


--
-- Name: COLUMN tb_rptp_stats.reprt_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.reprt_type IS '보고서유형 (reprt_type)';


--
-- Name: COLUMN tb_rptp_stats.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_rptp_stats.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_rptp_stats.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_rptp_stats.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rptp_stats.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_rward_manage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_rward_manage (
    confm_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    aprv_dt timestamp without time zone,
    atch_file_id character varying(20),
    frst_rgtr_id character varying(20),
    ifml_atrz_id character varying(20),
    last_mdfr_id character varying(20),
    rwrd_cd character varying(12) NOT NULL,
    rwrd_ymd character varying(8),
    rwrd_id character varying(20) NOT NULL,
    rwrd_user_id character varying(20) NOT NULL,
    atrzr_id character varying(20),
    rtn_rsn_cn character varying(4000),
    cntrb_cn character varying(4000),
    rwrd_nm character varying(100)
);


--
-- Name: TABLE tb_rward_manage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_rward_manage IS '포상관리 (tb_rward_manage)';


--
-- Name: COLUMN tb_rward_manage.confm_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.confm_yn IS '승인여부 (confm_yn)';


--
-- Name: COLUMN tb_rward_manage.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_rward_manage.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_rward_manage.aprv_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.aprv_dt IS '승인일시 (aprv_dt)';


--
-- Name: COLUMN tb_rward_manage.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_rward_manage.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_rward_manage.ifml_atrz_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.ifml_atrz_id IS '비공식결재아이디 (ifml_atrz_id)';


--
-- Name: COLUMN tb_rward_manage.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_rward_manage.rwrd_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.rwrd_cd IS '포상코드 (rwrd_cd)';


--
-- Name: COLUMN tb_rward_manage.rwrd_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.rwrd_ymd IS '포상일자 (rwrd_ymd)';


--
-- Name: COLUMN tb_rward_manage.rwrd_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.rwrd_id IS '포상아이디 (rwrd_id)';


--
-- Name: COLUMN tb_rward_manage.rwrd_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.rwrd_user_id IS '포상사용자아이디 (rwrd_user_id)';


--
-- Name: COLUMN tb_rward_manage.atrzr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.atrzr_id IS '결재자아이디 (atrzr_id)';


--
-- Name: COLUMN tb_rward_manage.rtn_rsn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.rtn_rsn_cn IS '반납사유내용 (rtn_rsn_cn)';


--
-- Name: COLUMN tb_rward_manage.cntrb_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.cntrb_cn IS '공적내용 (cntrb_cn)';


--
-- Name: COLUMN tb_rward_manage.rwrd_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_rward_manage.rwrd_nm IS '포상명 (rwrd_nm)';


--
-- Name: tb_schdl_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_schdl_info (
    rept_se_cd character varying(12),
    schdl_imprt_cd character varying(12),
    schdl_knd_cd character varying(12),
    schdl_se_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    atch_file_id character varying(30),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    schdl_bgng_ymd character varying(8),
    schdl_pic_id character varying(20),
    schdl_dept_id character varying(20),
    schdl_end_ymd character varying(8),
    schdl_id character varying(20) NOT NULL,
    schdl_cn character varying(4000),
    schdl_nm character varying(100),
    schdl_plc_nm character varying(100)
);


--
-- Name: TABLE tb_schdl_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_schdl_info IS '일정정보 (tb_schdl_info)';


--
-- Name: COLUMN tb_schdl_info.rept_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.rept_se_cd IS '반복구분코드 (rept_se_cd)';


--
-- Name: COLUMN tb_schdl_info.schdl_imprt_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_imprt_cd IS '일정중요도코드 (schdl_imprt_cd)';


--
-- Name: COLUMN tb_schdl_info.schdl_knd_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_knd_cd IS '일정종류코드 (schdl_knd_cd)';


--
-- Name: COLUMN tb_schdl_info.schdl_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_se_cd IS '일정구분코드 (schdl_se_cd)';


--
-- Name: COLUMN tb_schdl_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_schdl_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_schdl_info.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';


--
-- Name: COLUMN tb_schdl_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_schdl_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_schdl_info.schdl_bgng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_bgng_ymd IS '일정시작일자 (schdl_bgng_ymd)';


--
-- Name: COLUMN tb_schdl_info.schdl_pic_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_pic_id IS '일정담당자아이디 (schdl_pic_id)';


--
-- Name: COLUMN tb_schdl_info.schdl_dept_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_dept_id IS '일정부서아이디 (schdl_dept_id)';


--
-- Name: COLUMN tb_schdl_info.schdl_end_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_end_ymd IS '일정종료일자 (schdl_end_ymd)';


--
-- Name: COLUMN tb_schdl_info.schdl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_id IS '일정아이디 (schdl_id)';


--
-- Name: COLUMN tb_schdl_info.schdl_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_cn IS '일정내용 (schdl_cn)';


--
-- Name: COLUMN tb_schdl_info.schdl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_nm IS '일정명 (schdl_nm)';


--
-- Name: COLUMN tb_schdl_info.schdl_plc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_schdl_info.schdl_plc_nm IS '일정장소명 (schdl_plc_nm)';


--
-- Name: tb_sms_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_sms_info (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    sms_id character varying(20) NOT NULL,
    sndng_telno character varying(13) NOT NULL,
    sndng_cn character varying(4000)
);


--
-- Name: TABLE tb_sms_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_sms_info IS 'SMS정보 (tb_sms_info)';


--
-- Name: COLUMN tb_sms_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_sms_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_sms_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_sms_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_sms_info.sms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_info.sms_id IS 'SMS아이디 (sms_id)';


--
-- Name: COLUMN tb_sms_info.sndng_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_info.sndng_telno IS '발송전화번호 (sndng_telno)';


--
-- Name: COLUMN tb_sms_info.sndng_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_info.sndng_cn IS '발송내용 (sndng_cn)';


--
-- Name: tb_sms_rcptn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_sms_rcptn (
    rslt_cd character varying(12),
    rcptn_telno character varying(13) NOT NULL,
    sms_id character varying(20) NOT NULL,
    rslt_msg character varying(4000),
    frst_rgtr_id character varying(20),
    crt_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_sms_rcptn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_sms_rcptn IS 'SMS수신 (tb_sms_rcptn)';


--
-- Name: COLUMN tb_sms_rcptn.rslt_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.rslt_cd IS '결과코드 (rslt_cd)';


--
-- Name: COLUMN tb_sms_rcptn.rcptn_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.rcptn_telno IS '수신전화번호 (rcptn_telno)';


--
-- Name: COLUMN tb_sms_rcptn.sms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.sms_id IS 'SMS아이디 (sms_id)';


--
-- Name: COLUMN tb_sms_rcptn.rslt_msg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.rslt_msg IS '결과메시지 (rslt_msg)';


--
-- Name: COLUMN tb_sms_rcptn.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_sms_rcptn.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_sms_rcptn.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_sms_rcptn.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sms_rcptn.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_srvy_artcl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_srvy_artcl (
    etc_ans_yn character varying(1),
    crt_dt timestamp without time zone,
    artcl_sn bigint,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    srvy_id character varying(20) NOT NULL,
    srvy_artcl_id character varying(20) NOT NULL,
    srvy_qstn_id character varying(20) NOT NULL,
    srvy_tmplt_id character varying(20) NOT NULL,
    artcl_cn character varying(4000)
);


--
-- Name: TABLE tb_srvy_artcl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_srvy_artcl IS '설문항목 (tb_srvy_artcl)';


--
-- Name: COLUMN tb_srvy_artcl.etc_ans_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.etc_ans_yn IS '기타답변여부 (etc_ans_yn)';


--
-- Name: COLUMN tb_srvy_artcl.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_srvy_artcl.artcl_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.artcl_sn IS '항목일련번호 (artcl_sn)';


--
-- Name: COLUMN tb_srvy_artcl.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_srvy_artcl.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_srvy_artcl.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_srvy_artcl.srvy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.srvy_id IS '설문아이디 (srvy_id)';


--
-- Name: COLUMN tb_srvy_artcl.srvy_artcl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.srvy_artcl_id IS '설문항목아이디 (srvy_artcl_id)';


--
-- Name: COLUMN tb_srvy_artcl.srvy_qstn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.srvy_qstn_id IS '설문질문아이디 (srvy_qstn_id)';


--
-- Name: COLUMN tb_srvy_artcl.srvy_tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';


--
-- Name: COLUMN tb_srvy_artcl.artcl_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_artcl.artcl_cn IS '항목내용 (artcl_cn)';


--
-- Name: tb_srvy_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_srvy_info (
    srvy_id character varying(20) NOT NULL,
    srvy_tmplt_id character varying(20) NOT NULL,
    srvy_ttl character varying(100) NOT NULL,
    srvy_prps character varying(1000),
    srvy_trgt character varying(1000),
    srvy_wrt_gd_cn character varying(4000),
    srvy_bgng_ymd character varying(8),
    srvy_end_ymd character varying(8),
    frst_rgtr_id character varying(20),
    crt_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_srvy_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_srvy_info IS '설문정보 (tb_srvy_info)';


--
-- Name: COLUMN tb_srvy_info.srvy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_id IS '설문아이디 (srvy_id)';


--
-- Name: COLUMN tb_srvy_info.srvy_tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';


--
-- Name: COLUMN tb_srvy_info.srvy_ttl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_ttl IS '설문제목 (srvy_ttl)';


--
-- Name: COLUMN tb_srvy_info.srvy_prps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_prps IS '설문목적 (srvy_prps)';


--
-- Name: COLUMN tb_srvy_info.srvy_trgt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_trgt IS '설문대상 (srvy_trgt)';


--
-- Name: COLUMN tb_srvy_info.srvy_wrt_gd_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_wrt_gd_cn IS '설문작성안내내용 (srvy_wrt_gd_cn)';


--
-- Name: COLUMN tb_srvy_info.srvy_bgng_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_bgng_ymd IS '설문시작일자 (srvy_bgng_ymd)';


--
-- Name: COLUMN tb_srvy_info.srvy_end_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.srvy_end_ymd IS '설문종료일자 (srvy_end_ymd)';


--
-- Name: COLUMN tb_srvy_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_srvy_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_srvy_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_srvy_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_srvy_qstn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_srvy_qstn (
    max_chc_cnt integer,
    qstn_type_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    qstn_sn bigint,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    srvy_id character varying(20) NOT NULL,
    srvy_qstn_id character varying(20) NOT NULL,
    srvy_tmplt_id character varying(20) NOT NULL,
    qstn_cn character varying(4000)
);


--
-- Name: TABLE tb_srvy_qstn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_srvy_qstn IS '설문질문 (tb_srvy_qstn)';


--
-- Name: COLUMN tb_srvy_qstn.max_chc_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.max_chc_cnt IS '최대선택수 (max_chc_cnt)';


--
-- Name: COLUMN tb_srvy_qstn.qstn_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.qstn_type_cd IS '질문유형코드 (qstn_type_cd)';


--
-- Name: COLUMN tb_srvy_qstn.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_srvy_qstn.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_srvy_qstn.qstn_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.qstn_sn IS '질문일련번호 (qstn_sn)';


--
-- Name: COLUMN tb_srvy_qstn.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_srvy_qstn.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_srvy_qstn.srvy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.srvy_id IS '설문아이디 (srvy_id)';


--
-- Name: COLUMN tb_srvy_qstn.srvy_qstn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.srvy_qstn_id IS '설문질문아이디 (srvy_qstn_id)';


--
-- Name: COLUMN tb_srvy_qstn.srvy_tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';


--
-- Name: COLUMN tb_srvy_qstn.qstn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_qstn.qstn_cn IS '질문내용 (qstn_cn)';


--
-- Name: tb_srvy_rslt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_srvy_rslt (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    srvy_id character varying(20) NOT NULL,
    srvy_artcl_id character varying(20) NOT NULL,
    srvy_qstn_id character varying(20) NOT NULL,
    srvy_rspns_id character varying(20) NOT NULL,
    srvy_tmplt_id character varying(20) NOT NULL,
    rspns_nm character varying(100),
    etc_ans_cn character varying(4000),
    rspdnt_ans_cn character varying(4000)
);


--
-- Name: TABLE tb_srvy_rslt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_srvy_rslt IS '설문결과 (tb_srvy_rslt)';


--
-- Name: COLUMN tb_srvy_rslt.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_srvy_rslt.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_srvy_rslt.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_srvy_rslt.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_srvy_rslt.srvy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.srvy_id IS '설문아이디 (srvy_id)';


--
-- Name: COLUMN tb_srvy_rslt.srvy_artcl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.srvy_artcl_id IS '설문항목아이디 (srvy_artcl_id)';


--
-- Name: COLUMN tb_srvy_rslt.srvy_qstn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.srvy_qstn_id IS '설문질문아이디 (srvy_qstn_id)';


--
-- Name: COLUMN tb_srvy_rslt.srvy_rspns_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.srvy_rspns_id IS '설문응답아이디 (srvy_rspns_id)';


--
-- Name: COLUMN tb_srvy_rslt.srvy_tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';


--
-- Name: COLUMN tb_srvy_rslt.rspns_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.rspns_nm IS '응답명 (rspns_nm)';


--
-- Name: COLUMN tb_srvy_rslt.etc_ans_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.etc_ans_cn IS '기타답변내용 (etc_ans_cn)';


--
-- Name: COLUMN tb_srvy_rslt.rspdnt_ans_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rslt.rspdnt_ans_cn IS '응답자답변내용 (rspdnt_ans_cn)';


--
-- Name: tb_srvy_rspdnt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_srvy_rspdnt (
    srvy_tmplt_id character varying(20) NOT NULL,
    srvy_id character varying(20) NOT NULL,
    srvy_rspdnt_id character varying(20) NOT NULL,
    gndr_cd character varying(12),
    cr_type_cd character varying(12),
    rspdnt_nm character varying(100),
    brdt character varying(8),
    rgn_telno character varying(4),
    mid_telno character varying(4),
    end_telno character varying(4),
    crt_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    mdfcn_dt timestamp without time zone,
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_srvy_rspdnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_srvy_rspdnt IS '설문응답자 (tb_srvy_rspdnt)';


--
-- Name: COLUMN tb_srvy_rspdnt.srvy_tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';


--
-- Name: COLUMN tb_srvy_rspdnt.srvy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.srvy_id IS '설문아이디 (srvy_id)';


--
-- Name: COLUMN tb_srvy_rspdnt.srvy_rspdnt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.srvy_rspdnt_id IS '설문응답자아이디 (srvy_rspdnt_id)';


--
-- Name: COLUMN tb_srvy_rspdnt.gndr_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.gndr_cd IS '성별코드 (gndr_cd)';


--
-- Name: COLUMN tb_srvy_rspdnt.cr_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.cr_type_cd IS '직업유형코드 (cr_type_cd)';


--
-- Name: COLUMN tb_srvy_rspdnt.rspdnt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.rspdnt_nm IS '응답자명 (rspdnt_nm)';


--
-- Name: COLUMN tb_srvy_rspdnt.brdt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.brdt IS '생년월일 (brdt)';


--
-- Name: COLUMN tb_srvy_rspdnt.rgn_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.rgn_telno IS '지역전화번호 (rgn_telno)';


--
-- Name: COLUMN tb_srvy_rspdnt.mid_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.mid_telno IS '중간전화번호 (mid_telno)';


--
-- Name: COLUMN tb_srvy_rspdnt.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.end_telno IS '종료전화번호 (end_telno)';


--
-- Name: COLUMN tb_srvy_rspdnt.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_srvy_rspdnt.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_srvy_rspdnt.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_srvy_rspdnt.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_rspdnt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_srvy_tmplt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_srvy_tmplt (
    srvy_tmplt_id character varying(20) NOT NULL,
    srvy_tmplt_type_cd character varying(12),
    srvy_tmplt_expln character varying(4000),
    srvy_tmplt_path_nm character varying(100),
    crt_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    mdfcn_dt timestamp without time zone,
    last_mdfr_id character varying(20),
    srvy_tmplt_img_info bytea
);


--
-- Name: TABLE tb_srvy_tmplt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_srvy_tmplt IS '설문서식 (tb_srvy_tmplt)';


--
-- Name: COLUMN tb_srvy_tmplt.srvy_tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';


--
-- Name: COLUMN tb_srvy_tmplt.srvy_tmplt_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.srvy_tmplt_type_cd IS '설문서식유형코드 (srvy_tmplt_type_cd)';


--
-- Name: COLUMN tb_srvy_tmplt.srvy_tmplt_expln; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.srvy_tmplt_expln IS '설문서식설명 (srvy_tmplt_expln)';


--
-- Name: COLUMN tb_srvy_tmplt.srvy_tmplt_path_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.srvy_tmplt_path_nm IS '설문서식경로명 (srvy_tmplt_path_nm)';


--
-- Name: COLUMN tb_srvy_tmplt.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_srvy_tmplt.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_srvy_tmplt.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_srvy_tmplt.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_srvy_tmplt.srvy_tmplt_img_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_srvy_tmplt.srvy_tmplt_img_info IS '설문서식이미지정보 (srvy_tmplt_img_info)';


--
-- Name: tb_stmp_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_stmp_info (
    mpng_crt_id character varying(20) NOT NULL,
    crtr_id character varying(20),
    mpng_file_nm character varying(100),
    mpng_file_path character varying(1000),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_stmp_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_stmp_info IS '도장정보 (tb_stmp_info)';


--
-- Name: COLUMN tb_stmp_info.mpng_crt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.mpng_crt_id IS '매핑생성아이디 (mpng_crt_id)';


--
-- Name: COLUMN tb_stmp_info.crtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.crtr_id IS '기준아이디 (crtr_id)';


--
-- Name: COLUMN tb_stmp_info.mpng_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.mpng_file_nm IS '매핑파일명 (mpng_file_nm)';


--
-- Name: COLUMN tb_stmp_info.mpng_file_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.mpng_file_path IS '매핑파일경로 (mpng_file_path)';


--
-- Name: COLUMN tb_stmp_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_stmp_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_stmp_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_stmp_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_stmp_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_sys_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_sys_log (
    err_se_cd character varying(12),
    prcs_se_cd character varying(12),
    rspns_cd character varying(12),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    prcs_tm character varying(14),
    err_cd character varying(12),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    ocrn_ymd character varying(8),
    dmnd_id character varying(20) NOT NULL,
    dmnd_user_id character varying(20),
    dmnd_user_ip_addr character varying(30),
    mthd_nm character varying(100),
    srvc_nm character varying(100)
);


--
-- Name: TABLE tb_sys_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_sys_log IS '시스템로그 (tb_sys_log)';


--
-- Name: COLUMN tb_sys_log.err_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.err_se_cd IS '오류구분코드 (err_se_cd)';


--
-- Name: COLUMN tb_sys_log.prcs_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.prcs_se_cd IS '처리구분코드 (prcs_se_cd)';


--
-- Name: COLUMN tb_sys_log.rspns_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.rspns_cd IS '응답코드 (rspns_cd)';


--
-- Name: COLUMN tb_sys_log.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_sys_log.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_sys_log.prcs_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.prcs_tm IS '처리시각 (prcs_tm)';


--
-- Name: COLUMN tb_sys_log.err_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.err_cd IS '오류코드 (err_cd)';


--
-- Name: COLUMN tb_sys_log.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_sys_log.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_sys_log.ocrn_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';


--
-- Name: COLUMN tb_sys_log.dmnd_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.dmnd_id IS '요청아이디 (dmnd_id)';


--
-- Name: COLUMN tb_sys_log.dmnd_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';


--
-- Name: COLUMN tb_sys_log.dmnd_user_ip_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.dmnd_user_ip_addr IS '요청사용자IP주소 (dmnd_user_ip_addr)';


--
-- Name: COLUMN tb_sys_log.mthd_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.mthd_nm IS '방법명 (mthd_nm)';


--
-- Name: COLUMN tb_sys_log.srvc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_sys_log.srvc_nm IS '서비스명 (srvc_nm)';


--
-- Name: tb_tmplt_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_tmplt_info (
    use_yn character varying(1) NOT NULL,
    tmplt_se_cd character varying(12) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    tmplt_id character varying(20) NOT NULL,
    tmplt_nm character varying(100) NOT NULL,
    tmplt_path character varying(1000) NOT NULL
);


--
-- Name: TABLE tb_tmplt_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_tmplt_info IS '서식정보 (tb_tmplt_info)';


--
-- Name: COLUMN tb_tmplt_info.use_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.use_yn IS '사용여부 (use_yn)';


--
-- Name: COLUMN tb_tmplt_info.tmplt_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.tmplt_se_cd IS '서식구분코드 (tmplt_se_cd)';


--
-- Name: COLUMN tb_tmplt_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_tmplt_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_tmplt_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_tmplt_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_tmplt_info.tmplt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.tmplt_id IS '서식아이디 (tmplt_id)';


--
-- Name: COLUMN tb_tmplt_info.tmplt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.tmplt_nm IS '서식명 (tmplt_nm)';


--
-- Name: COLUMN tb_tmplt_info.tmplt_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_tmplt_info.tmplt_path IS '서식경로 (tmplt_path)';


--
-- Name: tb_user_absn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_user_absn (
    user_absn_yn character varying(1) NOT NULL,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    user_id character varying(20) NOT NULL,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_user_absn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_user_absn IS '사용자부재 (tb_user_absn)';


--
-- Name: COLUMN tb_user_absn.user_absn_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_absn.user_absn_yn IS '사용자부재여부 (user_absn_yn)';


--
-- Name: COLUMN tb_user_absn.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_absn.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_user_absn.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_absn.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_user_absn.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_absn.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_user_absn.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_absn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_user_absn.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_absn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_user_authrt_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_user_authrt_map (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    mbr_type_cd character varying(12),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    scrty_dcsn_trgt_id character varying(20) NOT NULL,
    authrt_id character varying(30) NOT NULL
);


--
-- Name: TABLE tb_user_authrt_map; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_user_authrt_map IS '사용자권한매핑 (tb_user_authrt_map)';


--
-- Name: COLUMN tb_user_authrt_map.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_authrt_map.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_user_authrt_map.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_authrt_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_user_authrt_map.mbr_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_authrt_map.mbr_type_cd IS '회원유형코드 (mbr_type_cd)';


--
-- Name: COLUMN tb_user_authrt_map.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_authrt_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_user_authrt_map.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_authrt_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_user_authrt_map.scrty_dcsn_trgt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_authrt_map.scrty_dcsn_trgt_id IS '보안결정대상아이디 (scrty_dcsn_trgt_id)';


--
-- Name: COLUMN tb_user_authrt_map.authrt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_authrt_map.authrt_id IS '권한아이디 (authrt_id)';


--
-- Name: tb_user_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_user_info (
    esntl_id character varying(20) NOT NULL,
    user_id character varying(20) NOT NULL,
    user_type_cd character varying(12) DEFAULT 'EMP'::character varying NOT NULL,
    pswd character varying(300) NOT NULL,
    pswd_hint character varying(300),
    pswd_crans character varying(300),
    chg_pswd_last_dt timestamp without time zone,
    chg_pwd_cnt integer,
    lck_yn character varying(1) DEFAULT 'N'::character varying,
    lck_cnt integer,
    lck_last_pnttm timestamp without time zone,
    otp_secret character varying(32),
    cert_dn_vl character varying(100),
    user_nm character varying(100) NOT NULL,
    rrno character varying(256),
    gndr_cd character varying(30),
    brth_ymd character varying(8),
    eml_addr character varying(50),
    mbl_telno character varying(20),
    zip character varying(5),
    home_addr character varying(300),
    daddr character varying(300),
    area_no character varying(4),
    middle_telno character varying(4),
    end_telno character varying(4),
    fax_no character varying(30),
    office_telno character varying(20),
    group_id character varying(30),
    ognz_id character varying(20),
    pstinst_cd character varying(30),
    empl_no character varying(20),
    ofcps_nm character varying(300),
    role character varying(50) DEFAULT 'USER'::character varying,
    bizr_no character varying(10),
    jurir_no character varying(13),
    cmpny_nm character varying(300),
    rprsv_nm character varying(100),
    induty_cd character varying(30),
    ent_se_cd character varying(12),
    user_stts_cd character varying(12) DEFAULT 'P'::character varying,
    sbscrb_ymd character varying(8) DEFAULT CURRENT_TIMESTAMP,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone
);


--
-- Name: TABLE tb_user_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_user_info IS '사용자정보 (tb_user_info)';


--
-- Name: COLUMN tb_user_info.esntl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.esntl_id IS '필수아이디 (esntl_id)';


--
-- Name: COLUMN tb_user_info.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_user_info.user_type_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.user_type_cd IS '사용자유형코드 (user_type_cd)';


--
-- Name: COLUMN tb_user_info.pswd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.pswd IS '비밀번호 (pswd)';


--
-- Name: COLUMN tb_user_info.pswd_hint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.pswd_hint IS '비밀번호힌트 (pswd_hint)';


--
-- Name: COLUMN tb_user_info.pswd_crans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.pswd_crans IS '비밀번호검열 (pswd_cnsr)';


--
-- Name: COLUMN tb_user_info.chg_pswd_last_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.chg_pswd_last_dt IS '변경비밀번호최종일시 (chg_pswd_last_dt)';


--
-- Name: COLUMN tb_user_info.chg_pwd_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.chg_pwd_cnt IS '변경비밀번호수 (chg_pwd_cnt)';


--
-- Name: COLUMN tb_user_info.lck_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.lck_yn IS '잠금여부 (lck_yn)';


--
-- Name: COLUMN tb_user_info.lck_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.lck_cnt IS '잠금수 (lck_cnt)';


--
-- Name: COLUMN tb_user_info.lck_last_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.lck_last_pnttm IS '잠금최종시점 (lck_last_pnttm)';


--
-- Name: COLUMN tb_user_info.otp_secret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.otp_secret IS 'OTP비밀 (otp_secret)';


--
-- Name: COLUMN tb_user_info.cert_dn_vl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.cert_dn_vl IS '인증고유명값 (crtfc_dn_value)';


--
-- Name: COLUMN tb_user_info.user_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.user_nm IS '사용자명 (user_nm)';


--
-- Name: COLUMN tb_user_info.rrno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.rrno IS '주민등록번호 (rrno)';


--
-- Name: COLUMN tb_user_info.gndr_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.gndr_cd IS '성별코드 (gndr_cd)';


--
-- Name: COLUMN tb_user_info.brth_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.brth_ymd IS '출생일자 (brth_ymd)';


--
-- Name: COLUMN tb_user_info.eml_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.eml_addr IS '이메일주소 (eml_addr)';


--
-- Name: COLUMN tb_user_info.mbl_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.mbl_telno IS '휴대전화번호 (mbl_telno)';


--
-- Name: COLUMN tb_user_info.zip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.zip IS '우편번호 (zip)';


--
-- Name: COLUMN tb_user_info.home_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.home_addr IS '기본주소 (base_addr)';


--
-- Name: COLUMN tb_user_info.daddr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.daddr IS '상세주소 (dtl_addr)';


--
-- Name: COLUMN tb_user_info.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.area_no IS '면적번호 (area_no)';


--
-- Name: COLUMN tb_user_info.middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.middle_telno IS '중간전화번호 (middle_telno)';


--
-- Name: COLUMN tb_user_info.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.end_telno IS '종료전화번호 (end_telno)';


--
-- Name: COLUMN tb_user_info.fax_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.fax_no IS '팩스번호 (fax_no)';


--
-- Name: COLUMN tb_user_info.office_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.office_telno IS '사무소전화번호 (office_telno)';


--
-- Name: COLUMN tb_user_info.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.group_id IS '그룹아이디 (group_id)';


--
-- Name: COLUMN tb_user_info.ognz_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.ognz_id IS '조직아이디 (ognz_id)';


--
-- Name: COLUMN tb_user_info.pstinst_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.pstinst_cd IS '소속기관코드 (pstinst_cd)';


--
-- Name: COLUMN tb_user_info.empl_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.empl_no IS '사원번호 (empl_no)';


--
-- Name: COLUMN tb_user_info.ofcps_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.ofcps_nm IS '직위명 (ofcps_nm)';


--
-- Name: COLUMN tb_user_info.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.role IS '역할 (role)';


--
-- Name: COLUMN tb_user_info.bizr_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.bizr_no IS '사업자번호 (bizr_no)';


--
-- Name: COLUMN tb_user_info.jurir_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.jurir_no IS '법인번호 (jurir_no)';


--
-- Name: COLUMN tb_user_info.cmpny_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.cmpny_nm IS '회사명 (cmpny_nm)';


--
-- Name: COLUMN tb_user_info.rprsv_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.rprsv_nm IS '대표자명 (rprsv_nm)';


--
-- Name: COLUMN tb_user_info.induty_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.induty_cd IS '업종코드 (induty_cd)';


--
-- Name: COLUMN tb_user_info.ent_se_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.ent_se_cd IS '기업구분코드 (ent_se_cd)';


--
-- Name: COLUMN tb_user_info.user_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.user_stts_cd IS '사용자상태코드 (user_stts_cd)';


--
-- Name: COLUMN tb_user_info.sbscrb_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.sbscrb_ymd IS '가입일자 (sbscrb_ymd)';


--
-- Name: COLUMN tb_user_info.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_user_info.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_user_info.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_user_info.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: tb_user_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_user_log (
    crt_cnt integer,
    del_cnt integer,
    err_cnt integer,
    otpt_cnt integer,
    inq_cnt integer,
    mdfcn_cnt integer,
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    ocrn_ymd character varying(8) NOT NULL,
    dmnd_user_id character varying(20) NOT NULL,
    mthd_nm character varying(100) NOT NULL,
    srvc_nm character varying(100) NOT NULL
);


--
-- Name: TABLE tb_user_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_user_log IS '사용자로그 (tb_user_log)';


--
-- Name: COLUMN tb_user_log.crt_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.crt_cnt IS '생성수 (crt_cnt)';


--
-- Name: COLUMN tb_user_log.del_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.del_cnt IS '삭제수 (del_cnt)';


--
-- Name: COLUMN tb_user_log.err_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.err_cnt IS '오류수 (err_cnt)';


--
-- Name: COLUMN tb_user_log.otpt_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.otpt_cnt IS '출력수 (otpt_cnt)';


--
-- Name: COLUMN tb_user_log.inq_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.inq_cnt IS '조회수 (inq_cnt)';


--
-- Name: COLUMN tb_user_log.mdfcn_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.mdfcn_cnt IS '수정수 (mdfcn_cnt)';


--
-- Name: COLUMN tb_user_log.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_user_log.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_user_log.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_user_log.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_user_log.ocrn_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';


--
-- Name: COLUMN tb_user_log.dmnd_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';


--
-- Name: COLUMN tb_user_log.mthd_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.mthd_nm IS '방법명 (mthd_nm)';


--
-- Name: COLUMN tb_user_log.srvc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_log.srvc_nm IS '서비스명 (srvc_nm)';


--
-- Name: tb_user_mdfcn_dtls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_user_mdfcn_dtls (
    user_id character varying(20) NOT NULL,
    mdfcn_ymd character varying(8) NOT NULL,
    ognz_id character varying(20),
    group_id character varying(20),
    empl_no character varying(20),
    gndr_cd character varying(12),
    brth_ymd character varying(8),
    fax_no character varying(20),
    home_base_addr character varying(300),
    home_end_tel_no character varying(4),
    home_rgn_tel_no character varying(4),
    dtl_addr character varying(300),
    zip character varying(5),
    offm_telno character varying(20),
    mbl_tel_no character varying(20),
    eml_addr character varying(50),
    home_mid_tel_no character varying(4),
    inst_id character varying(20),
    user_stts_cd character varying(12),
    esntl_id character varying(20),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20)
);


--
-- Name: TABLE tb_user_mdfcn_dtls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_user_mdfcn_dtls IS '사용자수정상세 (tb_user_mdfcn_dtls)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.user_id IS '사용자아이디 (user_id)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.mdfcn_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.mdfcn_ymd IS '수정일자 (mdfcn_ymd)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.ognz_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.ognz_id IS '조직아이디 (ognz_id)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.group_id IS '그룹아이디 (group_id)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.empl_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.empl_no IS '사원번호 (empl_no)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.gndr_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.gndr_cd IS '성별코드 (gndr_cd)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.brth_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.brth_ymd IS '출생일자 (brth_ymd)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.fax_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.fax_no IS '팩스번호 (fax_no)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.home_base_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.home_base_addr IS '자택기본주소 (home_base_addr)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.home_end_tel_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.home_end_tel_no IS '자택종료전화번호 (home_end_tel_no)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.home_rgn_tel_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.home_rgn_tel_no IS '자택지역전화번호 (home_rgn_tel_no)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.dtl_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.dtl_addr IS '상세주소 (dtl_addr)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.zip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.zip IS '우편번호 (zip)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.offm_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.offm_telno IS '오피스텔전화번호 (offm_telno)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.mbl_tel_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.mbl_tel_no IS '휴대전화번호 (mbl_tel_no)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.eml_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.eml_addr IS '이메일주소 (eml_addr)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.home_mid_tel_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.home_mid_tel_no IS '자택중간전화번호 (home_mid_tel_no)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.inst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.inst_id IS '기관아이디 (inst_id)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.user_stts_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.user_stts_cd IS '사용자상태코드 (user_stts_cd)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.esntl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.esntl_id IS '필수아이디 (esntl_id)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_user_mdfcn_dtls.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_mdfcn_dtls.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: tb_user_noti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_user_noti (
    read_yn character varying(1),
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    noti_ivl_val character varying(100),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    noti_sn character varying(20) NOT NULL,
    noti_dt timestamp without time zone,
    rcvr_id character varying(20),
    noti_ttl_nm character varying(100),
    noti_cn character varying(4000),
    link_url character varying(1000)
);


--
-- Name: TABLE tb_user_noti; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_user_noti IS '사용자알림 (tb_user_noti)';


--
-- Name: COLUMN tb_user_noti.read_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.read_yn IS '조회여부 (read_yn)';


--
-- Name: COLUMN tb_user_noti.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_user_noti.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_user_noti.noti_ivl_val; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.noti_ivl_val IS '알림개별값 (noti_ivl_val)';


--
-- Name: COLUMN tb_user_noti.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_user_noti.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_user_noti.noti_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.noti_sn IS '알림일련번호 (noti_sn)';


--
-- Name: COLUMN tb_user_noti.noti_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.noti_dt IS '알림일시 (noti_dt)';


--
-- Name: COLUMN tb_user_noti.rcvr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.rcvr_id IS '수신자아이디 (rcvr_id)';


--
-- Name: COLUMN tb_user_noti.noti_ttl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.noti_ttl_nm IS '알림제목명 (noti_ttl_nm)';


--
-- Name: COLUMN tb_user_noti.noti_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.noti_cn IS '알림내용 (noti_cn)';


--
-- Name: COLUMN tb_user_noti.link_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_user_noti.link_url IS '연계URL (link_url)';


--
-- Name: tb_web_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_web_log (
    crt_dt timestamp without time zone,
    mdfcn_dt timestamp without time zone,
    occr_ymd character varying(8),
    frst_rgtr_id character varying(20),
    last_mdfr_id character varying(20),
    dmnd_id character varying(20) NOT NULL,
    dmnd_user_id character varying(20),
    dmnd_user_ip_addr character varying(30),
    url character varying(1000),
    prcs_tm bigint
);


--
-- Name: TABLE tb_web_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tb_web_log IS '웹로그 (tb_web_log)';


--
-- Name: COLUMN tb_web_log.crt_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.crt_dt IS '생성일시 (crt_dt)';


--
-- Name: COLUMN tb_web_log.mdfcn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';


--
-- Name: COLUMN tb_web_log.occr_ymd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.occr_ymd IS '발생일자 (occr_ymd)';


--
-- Name: COLUMN tb_web_log.frst_rgtr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';


--
-- Name: COLUMN tb_web_log.last_mdfr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';


--
-- Name: COLUMN tb_web_log.dmnd_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.dmnd_id IS '요청아이디 (dmnd_id)';


--
-- Name: COLUMN tb_web_log.dmnd_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';


--
-- Name: COLUMN tb_web_log.dmnd_user_ip_addr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.dmnd_user_ip_addr IS '요청사용자IP주소 (dmnd_user_ip_addr)';


--
-- Name: COLUMN tb_web_log.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tb_web_log.url IS 'URL (url)';


--
-- Name: meta_standard_domains id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_standard_domains ALTER COLUMN id SET DEFAULT nextval('public.seq_meta_standard_domains'::regclass);


--
-- Name: meta_standard_terms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_standard_terms ALTER COLUMN id SET DEFAULT nextval('public.seq_meta_standard_terms'::regclass);


--
-- Name: ecopseq ecopseq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecopseq
    ADD CONSTRAINT ecopseq_pkey PRIMARY KEY (table_name);


--
-- Name: ids ids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ids
    ADD CONSTRAINT ids_pkey PRIMARY KEY (table_name);


--
-- Name: meta_standard_domains meta_standard_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_standard_domains
    ADD CONSTRAINT meta_standard_domains_pkey PRIMARY KEY (id);


--
-- Name: meta_standard_terms meta_standard_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_standard_terms
    ADD CONSTRAINT meta_standard_terms_pkey PRIMARY KEY (id);


--
-- Name: tb_adbk_info pk_tb_adbk_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_adbk_info
    ADD CONSTRAINT pk_tb_adbk_info PRIMARY KEY (adbk_constnt_id);


--
-- Name: tb_adbk_manage pk_tb_adbk_manage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_adbk_manage
    ADD CONSTRAINT pk_tb_adbk_manage PRIMARY KEY (adbk_id);


--
-- Name: tb_admdst_cd pk_tb_admdst_cd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_admdst_cd
    ADD CONSTRAINT pk_tb_admdst_cd PRIMARY KEY (admdst_cd);


--
-- Name: tb_admdst_cd_rcptn_log pk_tb_admdst_cd_rcptn_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_admdst_cd_rcptn_log
    ADD CONSTRAINT pk_tb_admdst_cd_rcptn_log PRIMARY KEY (ocrn_ymd, admdst_zone_se_cd, admdst_cd, opert_sn);


--
-- Name: tb_auth_rfsh_tk pk_tb_auth_rfsh_tk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_auth_rfsh_tk
    ADD CONSTRAINT pk_tb_auth_rfsh_tk PRIMARY KEY (user_id);


--
-- Name: tb_authrt_group_info pk_tb_authrt_group_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_authrt_group_info
    ADD CONSTRAINT pk_tb_authrt_group_info PRIMARY KEY (group_id);


--
-- Name: tb_authrt_info pk_tb_authrt_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_authrt_info
    ADD CONSTRAINT pk_tb_authrt_info PRIMARY KEY (authrt_cd);


--
-- Name: tb_authrt_role_map pk_tb_authrt_role_map; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_authrt_role_map
    ADD CONSTRAINT pk_tb_authrt_role_map PRIMARY KEY (authrt_cd, role_cd);


--
-- Name: tb_bbs_comment pk_tb_bbs_comment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_comment
    ADD CONSTRAINT pk_tb_bbs_comment PRIMARY KEY (ans_sn);


--
-- Name: tb_bbs_item pk_tb_bbs_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_item
    ADD CONSTRAINT pk_tb_bbs_item PRIMARY KEY (pst_id);


--
-- Name: tb_bbs_master pk_tb_bbs_master; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_master
    ADD CONSTRAINT pk_tb_bbs_master PRIMARY KEY (bbs_id);


--
-- Name: tb_bbs_master_optn pk_tb_bbs_master_optn; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_master_optn
    ADD CONSTRAINT pk_tb_bbs_master_optn PRIMARY KEY (bbs_id);


--
-- Name: tb_bbs_scrap pk_tb_bbs_scrap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_scrap
    ADD CONSTRAINT pk_tb_bbs_scrap PRIMARY KEY (scrap_id);


--
-- Name: tb_bbs_stats pk_tb_bbs_stats; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_stats
    ADD CONSTRAINT pk_tb_bbs_stats PRIMARY KEY (stats_id);


--
-- Name: tb_bbs_use_info pk_tb_bbs_use_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_use_info
    ADD CONSTRAINT pk_tb_bbs_use_info PRIMARY KEY (bbs_id, trgt_id);


--
-- Name: tb_bkmk_menu_mng_rslt pk_tb_bkmk_menu_mng_rslt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bkmk_menu_mng_rslt
    ADD CONSTRAINT pk_tb_bkmk_menu_mng_rslt PRIMARY KEY (menu_id, user_id);


--
-- Name: tb_blog_info pk_tb_blog_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_blog_info
    ADD CONSTRAINT pk_tb_blog_info PRIMARY KEY (blog_id);


--
-- Name: tb_blog_user_map pk_tb_blog_user_map; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_blog_user_map
    ADD CONSTRAINT pk_tb_blog_user_map PRIMARY KEY (blog_id, user_id);


--
-- Name: tb_bnr_info pk_tb_bnr_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bnr_info
    ADD CONSTRAINT pk_tb_bnr_info PRIMARY KEY (bnr_id);


--
-- Name: tb_club_info pk_tb_club_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_club_info
    ADD CONSTRAINT pk_tb_club_info PRIMARY KEY (club_id, cmnty_id);


--
-- Name: tb_club_user_map pk_tb_club_user_map; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_club_user_map
    ADD CONSTRAINT pk_tb_club_user_map PRIMARY KEY (club_id, cmnty_id, user_id);


--
-- Name: tb_cmnty_info pk_tb_cmnty_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_cmnty_info
    ADD CONSTRAINT pk_tb_cmnty_info PRIMARY KEY (cmnty_id);


--
-- Name: tb_cmnty_user_map pk_tb_cmnty_user_map; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_cmnty_user_map
    ADD CONSTRAINT pk_tb_cmnty_user_map PRIMARY KEY (cmnty_id, user_id);


--
-- Name: tb_com_cd pk_tb_com_cd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_com_cd
    ADD CONSTRAINT pk_tb_com_cd PRIMARY KEY (cd_id);


--
-- Name: tb_com_clsf_cd pk_tb_com_clsf_cd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_com_clsf_cd
    ADD CONSTRAINT pk_tb_com_clsf_cd PRIMARY KEY (clsf_cd);


--
-- Name: tb_com_dtl_cd pk_tb_com_dtl_cd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_com_dtl_cd
    ADD CONSTRAINT pk_tb_com_dtl_cd PRIMARY KEY (cd_id, dtl_cd);


--
-- Name: tb_dept_job_bx pk_tb_dept_job_bx; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_dept_job_bx
    ADD CONSTRAINT pk_tb_dept_job_bx PRIMARY KEY (dept_task_box_id);


--
-- Name: tb_dept_task_info pk_tb_dept_task_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_dept_task_info
    ADD CONSTRAINT pk_tb_dept_task_info PRIMARY KEY (dept_task_id);


--
-- Name: tb_dgstfn_info pk_tb_dgstfn_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_dgstfn_info
    ADD CONSTRAINT pk_tb_dgstfn_info PRIMARY KEY (dgstfn_sn);


--
-- Name: tb_diary_info pk_tb_diary_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_diary_info
    ADD CONSTRAINT pk_tb_diary_info PRIMARY KEY (diary_id);


--
-- Name: tb_dscsn_list pk_tb_dscsn_list; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_dscsn_list
    ADD CONSTRAINT pk_tb_dscsn_list PRIMARY KEY (dscsn_id);


--
-- Name: tb_dscsn_manage pk_tb_dscsn_manage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_dscsn_manage
    ADD CONSTRAINT pk_tb_dscsn_manage PRIMARY KEY (dscsn_id);


--
-- Name: tb_dta_use_stats pk_tb_dta_use_stats; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_dta_use_stats
    ADD CONSTRAINT pk_tb_dta_use_stats PRIMARY KEY (dta_use_stats_id);


--
-- Name: tb_email_dsptch_manage pk_tb_email_dsptch_manage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_email_dsptch_manage
    ADD CONSTRAINT pk_tb_email_dsptch_manage PRIMARY KEY (msg_id);


--
-- Name: tb_event_info pk_tb_event_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_event_info
    ADD CONSTRAINT pk_tb_event_info PRIMARY KEY (evnt_id);


--
-- Name: tb_extrl_hr_info pk_tb_extrl_hr_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_extrl_hr_info
    ADD CONSTRAINT pk_tb_extrl_hr_info PRIMARY KEY (evnt_id, otsd_hr_id);


--
-- Name: tb_faq_info pk_tb_faq_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_faq_info
    ADD CONSTRAINT pk_tb_faq_info PRIMARY KEY (faq_id);


--
-- Name: tb_file_detail pk_tb_file_detail; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_file_detail
    ADD CONSTRAINT pk_tb_file_detail PRIMARY KEY (file_detail_id);


--
-- Name: tb_file_master pk_tb_file_master; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_file_master
    ADD CONSTRAINT pk_tb_file_master PRIMARY KEY (atch_file_id);


--
-- Name: tb_hldy_info pk_tb_hldy_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_hldy_info
    ADD CONSTRAINT pk_tb_hldy_info PRIMARY KEY (hldy_sn);


--
-- Name: tb_hlp_info pk_tb_hlp_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_hlp_info
    ADD CONSTRAINT pk_tb_hlp_info PRIMARY KEY (hlp_id);


--
-- Name: tb_ifml_atrz_info pk_tb_ifml_atrz_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_ifml_atrz_info
    ADD CONSTRAINT pk_tb_ifml_atrz_info PRIMARY KEY (ifml_atrz_id);


--
-- Name: tb_indv_pg pk_tb_indv_pg; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_indv_pg
    ADD CONSTRAINT pk_tb_indv_pg PRIMARY KEY (page_id);


--
-- Name: tb_indv_pg_conts pk_tb_indv_pg_conts; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_indv_pg_conts
    ADD CONSTRAINT pk_tb_indv_pg_conts PRIMARY KEY (cntnts_id);


--
-- Name: tb_inst_cd pk_tb_inst_cd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_inst_cd
    ADD CONSTRAINT pk_tb_inst_cd PRIMARY KEY (inst_cd);


--
-- Name: tb_inst_cd_rcptn_log pk_tb_inst_cd_rcptn_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_inst_cd_rcptn_log
    ADD CONSTRAINT pk_tb_inst_cd_rcptn_log PRIMARY KEY (job_sn, inst_cd, ocrn_ymd);


--
-- Name: tb_intrn_svc pk_tb_intrn_svc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_intrn_svc
    ADD CONSTRAINT pk_tb_intrn_svc PRIMARY KEY (itnt_svc_id);


--
-- Name: tb_leader_schdl pk_tb_leader_schdl; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_leader_schdl
    ADD CONSTRAINT pk_tb_leader_schdl PRIMARY KEY (schdl_id);


--
-- Name: tb_leader_schdl_dtl pk_tb_leader_schdl_dtl; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_leader_schdl_dtl
    ADD CONSTRAINT pk_tb_leader_schdl_dtl PRIMARY KEY (schdl_id, schdl_ymd);


--
-- Name: tb_leader_stts pk_tb_leader_stts; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_leader_stts
    ADD CONSTRAINT pk_tb_leader_stts PRIMARY KEY (leader_id);


--
-- Name: tb_login_log pk_tb_login_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_login_log
    ADD CONSTRAINT pk_tb_login_log PRIMARY KEY (log_id);


--
-- Name: tb_login_policy pk_tb_login_policy; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_login_policy
    ADD CONSTRAINT pk_tb_login_policy PRIMARY KEY (user_id);


--
-- Name: tb_main_image pk_tb_main_image; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_main_image
    ADD CONSTRAINT pk_tb_main_image PRIMARY KEY (img_id);


--
-- Name: tb_memo_rpt_info pk_tb_memo_rpt_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_memo_rpt_info
    ADD CONSTRAINT pk_tb_memo_rpt_info PRIMARY KEY (rpt_id);


--
-- Name: tb_memo_todo_info pk_tb_memo_todo_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_memo_todo_info
    ADD CONSTRAINT pk_tb_memo_todo_info PRIMARY KEY (todo_id);


--
-- Name: tb_menu_crt_dtl pk_tb_menu_crt_dtl; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_menu_crt_dtl
    ADD CONSTRAINT pk_tb_menu_crt_dtl PRIMARY KEY (menu_sn, authrt_cd);


--
-- Name: tb_menu_info pk_tb_menu_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_menu_info
    ADD CONSTRAINT pk_tb_menu_info PRIMARY KEY (menu_sn);


--
-- Name: tb_note_info pk_tb_note_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_note_info
    ADD CONSTRAINT pk_tb_note_info PRIMARY KEY (note_id);


--
-- Name: tb_note_rcptn pk_tb_note_rcptn; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_note_rcptn
    ADD CONSTRAINT pk_tb_note_rcptn PRIMARY KEY (note_rcptn_id);


--
-- Name: tb_note_sndng pk_tb_note_sndng; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_note_sndng
    ADD CONSTRAINT pk_tb_note_sndng PRIMARY KEY (note_sndng_id);


--
-- Name: tb_noti_info pk_tb_noti_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_noti_info
    ADD CONSTRAINT pk_tb_noti_info PRIMARY KEY (noti_sn);


--
-- Name: tb_ognz_info pk_tb_ognz_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_ognz_info
    ADD CONSTRAINT pk_tb_ognz_info PRIMARY KEY (ognz_id);


--
-- Name: tb_onln_mnl_info pk_tb_onln_mnl_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_onln_mnl_info
    ADD CONSTRAINT pk_tb_onln_mnl_info PRIMARY KEY (onln_mnl_id);


--
-- Name: tb_onln_poll_artcl pk_tb_onln_poll_artcl; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_onln_poll_artcl
    ADD CONSTRAINT pk_tb_onln_poll_artcl PRIMARY KEY (poll_artcl_id);


--
-- Name: tb_onln_poll_manage pk_tb_onln_poll_manage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_onln_poll_manage
    ADD CONSTRAINT pk_tb_onln_poll_manage PRIMARY KEY (poll_id);


--
-- Name: tb_onln_poll_rslt pk_tb_onln_poll_rslt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_onln_poll_rslt
    ADD CONSTRAINT pk_tb_onln_poll_rslt PRIMARY KEY (poll_rslt_id);


--
-- Name: tb_plcy_manage pk_tb_plcy_manage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_plcy_manage
    ADD CONSTRAINT pk_tb_plcy_manage PRIMARY KEY (plcy_type_cd);


--
-- Name: tb_popup_info pk_tb_popup_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_popup_info
    ADD CONSTRAINT pk_tb_popup_info PRIMARY KEY (popup_id);


--
-- Name: tb_prgrm_lst pk_tb_prgrm_lst; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_prgrm_lst
    ADD CONSTRAINT pk_tb_prgrm_lst PRIMARY KEY (prgrm_file_nm);


--
-- Name: tb_privacy_log pk_tb_privacy_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_privacy_log
    ADD CONSTRAINT pk_tb_privacy_log PRIMARY KEY (dmnd_id);


--
-- Name: tb_role_info pk_tb_role_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_role_info
    ADD CONSTRAINT pk_tb_role_info PRIMARY KEY (role_id);


--
-- Name: tb_role_lyr pk_tb_role_lyr; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_role_lyr
    ADD CONSTRAINT pk_tb_role_lyr PRIMARY KEY (prnt_role_id, chld_role_id);


--
-- Name: tb_rpt_info pk_tb_rpt_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_rpt_info
    ADD CONSTRAINT pk_tb_rpt_info PRIMARY KEY (rpt_id);


--
-- Name: tb_rptp_stats pk_tb_rptp_stats; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_rptp_stats
    ADD CONSTRAINT pk_tb_rptp_stats PRIMARY KEY (reprt_id);


--
-- Name: tb_rward_manage pk_tb_rward_manage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_rward_manage
    ADD CONSTRAINT pk_tb_rward_manage PRIMARY KEY (rwrd_id);


--
-- Name: tb_schdl_info pk_tb_schdl_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_schdl_info
    ADD CONSTRAINT pk_tb_schdl_info PRIMARY KEY (schdl_id);


--
-- Name: tb_sms_info pk_tb_sms_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_sms_info
    ADD CONSTRAINT pk_tb_sms_info PRIMARY KEY (sms_id);


--
-- Name: tb_sms_rcptn pk_tb_sms_rcptn; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_sms_rcptn
    ADD CONSTRAINT pk_tb_sms_rcptn PRIMARY KEY (rcptn_telno, sms_id);


--
-- Name: tb_srvy_artcl pk_tb_srvy_artcl; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_srvy_artcl
    ADD CONSTRAINT pk_tb_srvy_artcl PRIMARY KEY (srvy_artcl_id);


--
-- Name: tb_srvy_info pk_tb_srvy_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_srvy_info
    ADD CONSTRAINT pk_tb_srvy_info PRIMARY KEY (srvy_id);


--
-- Name: tb_srvy_qstn pk_tb_srvy_qstn; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_srvy_qstn
    ADD CONSTRAINT pk_tb_srvy_qstn PRIMARY KEY (srvy_qstn_id);


--
-- Name: tb_srvy_rslt pk_tb_srvy_rslt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_srvy_rslt
    ADD CONSTRAINT pk_tb_srvy_rslt PRIMARY KEY (srvy_rspns_id);


--
-- Name: tb_srvy_rspdnt pk_tb_srvy_rspdnt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_srvy_rspdnt
    ADD CONSTRAINT pk_tb_srvy_rspdnt PRIMARY KEY (srvy_tmplt_id, srvy_id, srvy_rspdnt_id);


--
-- Name: tb_srvy_tmplt pk_tb_srvy_tmplt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_srvy_tmplt
    ADD CONSTRAINT pk_tb_srvy_tmplt PRIMARY KEY (srvy_tmplt_id);


--
-- Name: tb_stmp_info pk_tb_stmp_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_stmp_info
    ADD CONSTRAINT pk_tb_stmp_info PRIMARY KEY (mpng_crt_id);


--
-- Name: tb_sys_log pk_tb_sys_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_sys_log
    ADD CONSTRAINT pk_tb_sys_log PRIMARY KEY (dmnd_id);


--
-- Name: tb_tmplt_info pk_tb_tmplt_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_tmplt_info
    ADD CONSTRAINT pk_tb_tmplt_info PRIMARY KEY (tmplt_id);


--
-- Name: tb_user_absn pk_tb_user_absn; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_absn
    ADD CONSTRAINT pk_tb_user_absn PRIMARY KEY (user_id);


--
-- Name: tb_user_authrt_map pk_tb_user_authrt_map; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_authrt_map
    ADD CONSTRAINT pk_tb_user_authrt_map PRIMARY KEY (scrty_dcsn_trgt_id);


--
-- Name: tb_user_info pk_tb_user_info; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_info
    ADD CONSTRAINT pk_tb_user_info PRIMARY KEY (esntl_id);


--
-- Name: tb_user_log pk_tb_user_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_log
    ADD CONSTRAINT pk_tb_user_log PRIMARY KEY (ocrn_ymd, dmnd_user_id, mthd_nm, srvc_nm);


--
-- Name: tb_user_mdfcn_dtls pk_tb_user_mdfcn_dtls; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_mdfcn_dtls
    ADD CONSTRAINT pk_tb_user_mdfcn_dtls PRIMARY KEY (user_id, mdfcn_ymd);


--
-- Name: tb_user_noti pk_tb_user_noti; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_noti
    ADD CONSTRAINT pk_tb_user_noti PRIMARY KEY (noti_sn);


--
-- Name: tb_web_log pk_tb_web_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_web_log
    ADD CONSTRAINT pk_tb_web_log PRIMARY KEY (dmnd_id);


--
-- Name: revinfo revinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revinfo
    ADD CONSTRAINT revinfo_pkey PRIMARY KEY (rev);


--
-- Name: tb_auth_rfsh_tk uk_tb_auth_rfsh_tk_rfsh_tkn; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_auth_rfsh_tk
    ADD CONSTRAINT uk_tb_auth_rfsh_tk_rfsh_tkn UNIQUE (rfsh_tkn);


--
-- Name: tb_file_detail uk_tb_file_detail_sn; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_file_detail
    ADD CONSTRAINT uk_tb_file_detail_sn UNIQUE (atch_file_id, atch_file_seq);


--
-- Name: tb_user_info uk_tb_user_info_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_info
    ADD CONSTRAINT uk_tb_user_info_user_id UNIQUE (user_id);


--
-- Name: ecopseq_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ecopseq_pk ON public.ecopseq USING btree (table_name);


--
-- Name: idx_tb_menu_info_del_yn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tb_menu_info_del_yn ON public.tb_menu_info USING btree (up_menu_sn, menu_ordr) WHERE ((del_yn)::text = 'N'::text);


--
-- Name: ix_tb_admdst_cd_rcptn_log_01; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_tb_admdst_cd_rcptn_log_01 ON public.tb_admdst_cd_rcptn_log USING btree (ocrn_ymd, admdst_zone_se_cd, admdst_cd, opert_sn);


--
-- Name: ix_tb_club_user_map_cmnty_id_club_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tb_club_user_map_cmnty_id_club_id ON public.tb_club_user_map USING btree (club_id, cmnty_id);


--
-- Name: ix_tb_srvy_rspdnt_srvy_id_srvy_tmplt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tb_srvy_rspdnt_srvy_id_srvy_tmplt_id ON public.tb_srvy_rspdnt USING btree (srvy_id, srvy_tmplt_id);


--
-- Name: ix_tb_user_info_eml_addr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tb_user_info_eml_addr ON public.tb_user_info USING btree (eml_addr);


--
-- Name: ix_tb_user_info_join_ymd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tb_user_info_join_ymd ON public.tb_user_info USING btree (sbscrb_ymd);


--
-- Name: ix_tb_user_info_user_nm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tb_user_info_user_nm ON public.tb_user_info USING btree (user_nm);


--
-- Name: ix_tb_user_info_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tb_user_info_user_type ON public.tb_user_info USING btree (user_type_cd);


--
-- Name: ix_tb_user_mdfcn_dtls_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tb_user_mdfcn_dtls_user_id ON public.tb_user_mdfcn_dtls USING btree (user_id);


--
-- Name: uk_tb_bbs_stats_stats_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_tb_bbs_stats_stats_id ON public.tb_bbs_stats USING btree (stats_id);


--
-- Name: uk_tb_club_info_club_id_cmnty_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_tb_club_info_club_id_cmnty_id ON public.tb_club_info USING btree (club_id, cmnty_id);


--
-- Name: uk_tb_club_user_map_user_id_club_id_cmnty_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_tb_club_user_map_user_id_club_id_cmnty_id ON public.tb_club_user_map USING btree (club_id, cmnty_id, user_id);


--
-- Name: uk_tb_noti_info_ntcn_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_tb_noti_info_ntcn_no ON public.tb_noti_info USING btree (noti_sn);


--
-- Name: uk_tb_onln_mnl_info_online_mnl_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_tb_onln_mnl_info_online_mnl_id ON public.tb_onln_mnl_info USING btree (onln_mnl_id);


--
-- Name: tb_bbs_master_optn fk_tb_bbs_master_optn_tb_bbs_master; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_bbs_master_optn
    ADD CONSTRAINT fk_tb_bbs_master_optn_tb_bbs_master FOREIGN KEY (bbs_id) REFERENCES public.tb_bbs_master(bbs_id);


--
-- Name: tb_extrl_hr_info fk_tb_extrl_hr_info_tb_event_info; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_extrl_hr_info
    ADD CONSTRAINT fk_tb_extrl_hr_info_tb_event_info FOREIGN KEY (evnt_id) REFERENCES public.tb_event_info(evnt_id);


--
-- Name: tb_file_detail fk_tb_file_detail_tb_file_master; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_file_detail
    ADD CONSTRAINT fk_tb_file_detail_tb_file_master FOREIGN KEY (atch_file_id) REFERENCES public.tb_file_master(atch_file_id);


--
-- Name: tb_note_rcptn fk_tb_note_rcptn_tb_note_info; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_note_rcptn
    ADD CONSTRAINT fk_tb_note_rcptn_tb_note_info FOREIGN KEY (note_id) REFERENCES public.tb_note_info(note_id);


--
-- Name: tb_note_rcptn fk_tb_note_rcptn_tb_note_sndng; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_note_rcptn
    ADD CONSTRAINT fk_tb_note_rcptn_tb_note_sndng FOREIGN KEY (note_sndng_id) REFERENCES public.tb_note_sndng(note_sndng_id);


--
-- Name: tb_note_sndng fk_tb_note_sndng_tb_note_info; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_note_sndng
    ADD CONSTRAINT fk_tb_note_sndng_tb_note_info FOREIGN KEY (note_id) REFERENCES public.tb_note_info(note_id);


--
-- Name: tb_onln_poll_artcl fk_tb_onln_poll_artcl_tb_onln_poll_manage; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_onln_poll_artcl
    ADD CONSTRAINT fk_tb_onln_poll_artcl_tb_onln_poll_manage FOREIGN KEY (poll_id) REFERENCES public.tb_onln_poll_manage(poll_id);


--
-- Name: tb_user_log fk_tb_user_log_tb_user_info; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_user_log
    ADD CONSTRAINT fk_tb_user_log_tb_user_info FOREIGN KEY (dmnd_user_id) REFERENCES public.tb_user_info(esntl_id);


--
-- PostgreSQL database dump complete
--


