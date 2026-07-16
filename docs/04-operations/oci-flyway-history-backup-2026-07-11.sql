--
-- PostgreSQL database dump
--

\restrict sRRMV3qbeS7U8EpdYZPZZYUmoKpmB4TmaoyFrkunIV7b18AOgiSSapMx95ThYUw

-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: egov
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO egov;

--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: egov
--

INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (1, '0', '<< Flyway Baseline >>', 'BASELINE', '<< Flyway Baseline >>', NULL, 'egov', '2026-04-25 11:51:02.344661', 0, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (2, '1', 'init auth tables', 'SQL', 'V1__init_auth_tables.sql', -368439005, 'egov', '2026-04-25 11:51:02.801899', 100, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (3, '1.1', 'add indexes', 'SQL', 'V1.1__add_indexes.sql', 616671893, 'egov', '2026-04-25 11:51:03.052156', 76, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (4, '1.2', 'add otp secret', 'SQL', 'V1.2__add_otp_secret.sql', 51563157, 'egov', '2026-04-27 22:59:14.40969', 102, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (5, '1.3', 'add login policy columns', 'SQL', 'V1.3__add_login_policy_columns.sql', 968913118, 'egov', '2026-04-27 23:00:54.042941', 91, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (6, '1.4', 'add scrap dc', 'SQL', 'V1.4__add_scrap_dc.sql', -1323087033, 'egov', '2026-04-30 22:36:03.911272', 52, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (7, '1.5', 'consolidate user tables', 'SQL', 'V1.5__consolidate_user_tables.sql', 561101559, 'egov', '2026-05-11 11:01:18.741957', 335, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (8, '1.6', 'rename orgnzt', 'SQL', 'V1.6__rename_orgnzt.sql', -1618680606, 'egov', '2026-06-02 13:39:19.022282', 62, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (9, '1.7', 'rename orgnzt info table', 'SQL', 'V1.7__rename_orgnzt_info_table.sql', 1923279972, 'egov', '2026-06-02 13:41:59.190998', 46, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (10, '1.8', 'add use yn to tb menu info', 'SQL', 'V1.8__add_use_yn_to_tb_menu_info.sql', 1504009090, 'egov', '2026-06-07 11:18:22.423029', 154, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (11, '1.9', 'change file detail pk', 'SQL', 'V1.9__change_file_detail_pk.sql', 1812066981, 'egov', '2026-06-14 17:10:49.463173', 432, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (12, '1.10', 'fix constraint naming', 'SQL', 'V1.10__fix_constraint_naming.sql', 2145427713, 'egov', '2026-07-05 18:04:41.066035', 1178, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (13, '1.11', 'create pst id seq', 'SQL', 'V1.11__create_pst_id_seq.sql', 1379878116, 'egov', '2026-07-05 18:04:42.527543', 27, true);
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) VALUES (14, '1.12', 'add menu soft delete index', 'SQL', 'V1.12__add_menu_soft_delete_index.sql', 1694926492, 'egov', '2026-07-05 18:04:42.652049', 266, true);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: egov
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: egov
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- PostgreSQL database dump complete
--

\unrestrict sRRMV3qbeS7U8EpdYZPZZYUmoKpmB4TmaoyFrkunIV7b18AOgiSSapMx95ThYUw

