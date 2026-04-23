-- comvnusermaster View 정의 (eGovFrame 표준)
CREATE OR REPLACE VIEW public.comvnusermaster AS
 SELECT ngnrlmber.esntl_id,
    ngnrlmber.mber_id AS user_id,
    ngnrlmber.password,
    ngnrlmber.mber_nm AS user_nm,
    ngnrlmber.zip AS user_zip,
    ngnrlmber.adres AS user_adres,
    ngnrlmber.mber_email_adres AS user_email,
    ngnrlmber.group_id,
    'GNR'::text AS user_se,
    ''::text AS orgnzt_id
   FROM public.ngnrlmber
UNION ALL
 SELECT nentrprsmber.esntl_id,
    nentrprsmber.entrprs_mber_id AS user_id,
    nentrprsmber.entrprs_mber_password AS password,
    nentrprsmber.cmpny_nm AS user_nm,
    nentrprsmber.zip AS user_zip,
    nentrprsmber.adres AS user_adres,
    nentrprsmber.applcnt_email_adres AS user_email,
    nentrprsmber.group_id,
    'ENT'::text AS user_se,
    ''::text AS orgnzt_id
   FROM public.nentrprsmber
UNION ALL
 SELECT nemplyrinfo.esntl_id,
    nemplyrinfo.emplyr_id AS user_id,
    nemplyrinfo.password,
    nemplyrinfo.user_nm,
    nemplyrinfo.zip AS user_zip,
    nemplyrinfo.house_adres AS user_adres,
    nemplyrinfo.email_adres AS user_email,
    nemplyrinfo.group_id,
    'USR'::text AS user_se,
    nemplyrinfo.orgnzt_id
   FROM public.nemplyrinfo;
