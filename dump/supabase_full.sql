--
-- PostgreSQL database dump
--

\restrict ygJeWpLHdQAihmxrPSyflcqocdGEoPnJRsoAx46zpaTjBU0ncZMuR4qhhXfl4fb

-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg13+1)

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

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP PUBLICATION IF EXISTS supabase_realtime;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_upload_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS "objects_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY public.nsmsrecptn DROP CONSTRAINT IF EXISTS nsmsrecptn_sms_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nroles_hierarchy DROP CONSTRAINT IF EXISTS nroles_hierarchy_parnts_role_fkey;
ALTER TABLE IF EXISTS ONLY public.nroles_hierarchy DROP CONSTRAINT IF EXISTS nroles_hierarchy_chldrn_role_fkey;
ALTER TABLE IF EXISTS ONLY public.nqustnrrspnsresult DROP CONSTRAINT IF EXISTS nqustnrrspnsresult_qestnr_id_qustnr_qesitm_id_qustnr_tmpla_fkey;
ALTER TABLE IF EXISTS ONLY public.nqustnrrespondinfo DROP CONSTRAINT IF EXISTS nqustnrrespondinfo_qustnr_tmplat_id_qestnr_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nqustnrqesitm DROP CONSTRAINT IF EXISTS nqustnrqesitm_qustnr_tmplat_id_qestnr_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nqustnriem DROP CONSTRAINT IF EXISTS nqustnriem_qestnr_id_qustnr_qesitm_id_qustnr_tmplat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nqestnrinfo DROP CONSTRAINT IF EXISTS nqestnrinfo_qustnr_tmplat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nproxyloginfo DROP CONSTRAINT IF EXISTS nproxyloginfo_proxy_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nonlinepollresult DROP CONSTRAINT IF EXISTS nonlinepollresult_poll_id_poll_iem_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nonlinepolliem DROP CONSTRAINT IF EXISTS nonlinepolliem_poll_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nnotetrnsmit DROP CONSTRAINT IF EXISTS nnotetrnsmit_note_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nnoterecptn DROP CONSTRAINT IF EXISTS nnoterecptn_note_id_note_trnsmit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nmtgplacefxtrs DROP CONSTRAINT IF EXISTS nmtgplacefxtrs_fxtrs_code_fkey;
ALTER TABLE IF EXISTS ONLY public.nmenuinfo DROP CONSTRAINT IF EXISTS nmenuinfo_upper_menu_no_fkey;
ALTER TABLE IF EXISTS ONLY public.nmenuinfo DROP CONSTRAINT IF EXISTS nmenuinfo_progrm_file_nm_fkey;
ALTER TABLE IF EXISTS ONLY public.nmenucreatdtls DROP CONSTRAINT IF EXISTS nmenucreatdtls_menu_no_fkey;
ALTER TABLE IF EXISTS ONLY public.nmenucreatdtls DROP CONSTRAINT IF EXISTS nmenucreatdtls_mapng_creat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nmenucreatdtls DROP CONSTRAINT IF EXISTS nmenucreatdtls_author_code_fkey;
ALTER TABLE IF EXISTS ONLY public.nleaderschdulde DROP CONSTRAINT IF EXISTS nleaderschdulde_schdul_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ngnrlmber DROP CONSTRAINT IF EXISTS ngnrlmber_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nfiledetail DROP CONSTRAINT IF EXISTS nfiledetail_atch_file_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nfaqinfo DROP CONSTRAINT IF EXISTS nfaqinfo_atch_file_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nextrlhrinfo DROP CONSTRAINT IF EXISTS nextrlhrinfo_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nentrprsmber DROP CONSTRAINT IF EXISTS nentrprsmber_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nemplyrinfo DROP CONSTRAINT IF EXISTS nemplyrinfo_orgnzt_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nemplyrinfo DROP CONSTRAINT IF EXISTS nemplyrinfo_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nemplyrinfo_aud DROP CONSTRAINT IF EXISTS nemplyrinfo_aud_revinfo_fkey;
ALTER TABLE IF EXISTS ONLY public.ndiaryinfo DROP CONSTRAINT IF EXISTS ndiaryinfo_schdul_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ncomment DROP CONSTRAINT IF EXISTS ncomment_ntt_id_bbs_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ncntntslist DROP CONSTRAINT IF EXISTS ncntntslist_emplyr_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ncntntslist DROP CONSTRAINT IF EXISTS ncntntslist_cntnts_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ncntcmessageitem DROP CONSTRAINT IF EXISTS ncntcmessageitem_cntc_mssage_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ncmmntyuser DROP CONSTRAINT IF EXISTS ncmmntyuser_cmmnty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nclubuser DROP CONSTRAINT IF EXISTS nclubuser_clb_id_cmmnty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nbloguser DROP CONSTRAINT IF EXISTS nbloguser_blog_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nauthorrolerelate DROP CONSTRAINT IF EXISTS nauthorrolerelate_role_code_fkey;
ALTER TABLE IF EXISTS ONLY public.nauthorrolerelate DROP CONSTRAINT IF EXISTS nauthorrolerelate_author_code_fkey;
ALTER TABLE IF EXISTS ONLY public.nanswer DROP CONSTRAINT IF EXISTS nanswer_bbs_id_fkey;
ALTER TABLE IF EXISTS ONLY public.nadbk DROP CONSTRAINT IF EXISTS nadbk_adbk_id_fkey;
ALTER TABLE IF EXISTS ONLY public.hemplyrinfochangedtls DROP CONSTRAINT IF EXISTS hemplyrinfochangedtls_emplyr_id_fkey;
ALTER TABLE IF EXISTS ONLY public.hemaildsptchmanage DROP CONSTRAINT IF EXISTS hemaildsptchmanage_atch_file_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ccmmndetailcode DROP CONSTRAINT IF EXISTS ccmmndetailcode_code_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ccmmncode DROP CONSTRAINT IF EXISTS ccmmncode_cl_code_fkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_oauth_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_flow_state_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_auth_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_user_id_fkey;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS protect_objects_delete ON storage.objects;
DROP TRIGGER IF EXISTS protect_buckets_delete ON storage.buckets;
DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP INDEX IF EXISTS storage.vector_indexes_name_bucket_id_idx;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name_lower;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.buckets_analytics_unique_name_idx;
DROP INDEX IF EXISTS storage.bucketid_objname;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_action_filter_key;
DROP INDEX IF EXISTS realtime.messages_inserted_at_topic_index;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public.sweblogsummary_pk;
DROP INDEX IF EXISTS public.susersummary_pk;
DROP INDEX IF EXISTS public.strsmrcvlogsummary_pk;
DROP INDEX IF EXISTS public.ssyslogsummary_pk;
DROP INDEX IF EXISTS public.sbbssummary_pk;
DROP INDEX IF EXISTS public.nweblog_pk;
DROP INDEX IF EXISTS public.nuserlog_pk;
DROP INDEX IF EXISTS public.nuserabsnce_pk;
DROP INDEX IF EXISTS public.ntrsmrcvmntrng_pk;
DROP INDEX IF EXISTS public.ntrsmrcvlog_pk;
DROP INDEX IF EXISTS public.ntroblinfo_pk;
DROP INDEX IF EXISTS public.ntmplatinfo_pk;
DROP INDEX IF EXISTS public.nsyslog_pk;
DROP INDEX IF EXISTS public.nsynchrnserverinfo_pk;
DROP INDEX IF EXISTS public.nstsfdg_pk;
DROP INDEX IF EXISTS public.nsmsrecptn_pk;
DROP INDEX IF EXISTS public.nsmsrecptn_i01;
DROP INDEX IF EXISTS public.nsms_pk;
DROP INDEX IF EXISTS public.nsitemap_pk;
DROP INDEX IF EXISTS public.nserverresrceloginfo_pk;
DROP INDEX IF EXISTS public.nserverinfo_pk;
DROP INDEX IF EXISTS public.nservereqpmninfo_pk;
DROP INDEX IF EXISTS public.nscrap_pk;
DROP INDEX IF EXISTS public.nschdulinfo_pk;
DROP INDEX IF EXISTS public.nroles_hierarchy_pk;
DROP INDEX IF EXISTS public.nroles_hierarchy_i02;
DROP INDEX IF EXISTS public.nroles_hierarchy_i01;
DROP INDEX IF EXISTS public.nroleinfo_pk;
DROP INDEX IF EXISTS public.nreprtstats_pk;
DROP INDEX IF EXISTS public.nqustnrtmplat_pk;
DROP INDEX IF EXISTS public.nqustnrrspnsresult_pk;
DROP INDEX IF EXISTS public.nqustnrrspnsresult_i01;
DROP INDEX IF EXISTS public.nqustnrrespondinfo_pk;
DROP INDEX IF EXISTS public.nqustnrrespondinfo_i01;
DROP INDEX IF EXISTS public.nqustnrqesitm_pk;
DROP INDEX IF EXISTS public.nqustnrqesitm_i02;
DROP INDEX IF EXISTS public.nqustnriem_pk;
DROP INDEX IF EXISTS public.nqustnriem_i01;
DROP INDEX IF EXISTS public.nqestnrinfo_pk;
DROP INDEX IF EXISTS public.nqestnrinfo_i01;
DROP INDEX IF EXISTS public.nqainfo_pk;
DROP INDEX IF EXISTS public.nproxyloginfo_pk;
DROP INDEX IF EXISTS public.nproxyinfo_pk;
DROP INDEX IF EXISTS public.nprogrmlist_pk;
DROP INDEX IF EXISTS public.nprocessmonloginfo_pk;
DROP INDEX IF EXISTS public.nprivacylog_pk;
DROP INDEX IF EXISTS public.npopupmanage_pk;
DROP INDEX IF EXISTS public.norgnztinfo_pk;
DROP INDEX IF EXISTS public.nonlinepollresult_pk;
DROP INDEX IF EXISTS public.nonlinepollresult_i01;
DROP INDEX IF EXISTS public.nonlinepollmanage_pk;
DROP INDEX IF EXISTS public.nonlinepolliem_pk;
DROP INDEX IF EXISTS public.nonlinepolliem_i01;
DROP INDEX IF EXISTS public.nonlinemanual_pk;
DROP INDEX IF EXISTS public.nntwrksvcmntrngloginfo_pk;
DROP INDEX IF EXISTS public.nntwrkinfo_pk;
DROP INDEX IF EXISTS public.nnttstats_pk;
DROP INDEX IF EXISTS public.nntfcinfo_pk;
DROP INDEX IF EXISTS public.nnotetrnsmit_pk;
DROP INDEX IF EXISTS public.nnotetrnsmit_i01;
DROP INDEX IF EXISTS public.nnoterecptn_pk;
DROP INDEX IF EXISTS public.nnoterecptn_i01;
DROP INDEX IF EXISTS public.nnote_pk;
DROP INDEX IF EXISTS public.nmtgplacefxtrs_pk;
DROP INDEX IF EXISTS public.nmtgplacefxtrs_i01;
DROP INDEX IF EXISTS public.nmenuinfo_pk;
DROP INDEX IF EXISTS public.nmenuinfo_i02;
DROP INDEX IF EXISTS public.nmenucreatdtls_pk;
DROP INDEX IF EXISTS public.nmenucreatdtls_i04;
DROP INDEX IF EXISTS public.nmenucreatdtls_i03;
DROP INDEX IF EXISTS public.nmenucreatdtls_i02;
DROP INDEX IF EXISTS public.nmemotodo_pk;
DROP INDEX IF EXISTS public.nmemoreprt_pk;
DROP INDEX IF EXISTS public.nmainimage_pk;
DROP INDEX IF EXISTS public.nloginpolicy_pk;
DROP INDEX IF EXISTS public.nloginlog_pk;
DROP INDEX IF EXISTS public.nleaderschdulde_pk;
DROP INDEX IF EXISTS public.nleaderschdul_pk;
DROP INDEX IF EXISTS public.nintnetsvc_pk;
DROP INDEX IF EXISTS public.ninsttcoderecptnlog_pk;
DROP INDEX IF EXISTS public.ninsttcode_pk;
DROP INDEX IF EXISTS public.ninfrmlsanctn_pk;
DROP INDEX IF EXISTS public.nindvdlpgeestbs_pk;
DROP INDEX IF EXISTS public.nindvdlpgecntnts_pk;
DROP INDEX IF EXISTS public.nindvdlinfopolicy_pk;
DROP INDEX IF EXISTS public.nhpcminfo_pk;
DROP INDEX IF EXISTS public.ngnrlmber_pk;
DROP INDEX IF EXISTS public.ngnrlmber_i01;
DROP INDEX IF EXISTS public.nfxtrsmanage_pk;
DROP INDEX IF EXISTS public.nfilesysmntrngloginfo_pk;
DROP INDEX IF EXISTS public.nfiledetail_pk;
DROP INDEX IF EXISTS public.nfiledetail_i01;
DROP INDEX IF EXISTS public.nfile_pk;
DROP INDEX IF EXISTS public.nfaqinfo_pk;
DROP INDEX IF EXISTS public.nfaqinfo_i01;
DROP INDEX IF EXISTS public.nentrprsmber_pk;
DROP INDEX IF EXISTS public.nentrprsmber_i01;
DROP INDEX IF EXISTS public.nemplyrscrtyestbs_pk;
DROP INDEX IF EXISTS public.nemplyrscrtyestbs_i04;
DROP INDEX IF EXISTS public.nemplyrinfo_pk;
DROP INDEX IF EXISTS public.nemplyrinfo_i02;
DROP INDEX IF EXISTS public.nemplyrinfo_i01;
DROP INDEX IF EXISTS public.ndtausestats_pk;
DROP INDEX IF EXISTS public.ndiaryinfo_pk;
DROP INDEX IF EXISTS public.ndiaryinfo_i01;
DROP INDEX IF EXISTS public.ndeptjobbx_pk;
DROP INDEX IF EXISTS public.ndeptjob_pk;
DROP INDEX IF EXISTS public.ncomment_pk;
DROP INDEX IF EXISTS public.ncomment_i01;
DROP INDEX IF EXISTS public.ncntntslist_pk;
DROP INDEX IF EXISTS public.ncntntslist_i02;
DROP INDEX IF EXISTS public.ncntntslist_i01;
DROP INDEX IF EXISTS public.ncntcservice_pk;
DROP INDEX IF EXISTS public.ncntcmessageitem_pk;
DROP INDEX IF EXISTS public.ncntcmessageitem_i01;
DROP INDEX IF EXISTS public.ncntcmessage_pk;
DROP INDEX IF EXISTS public.ncnsltlist_pk;
DROP INDEX IF EXISTS public.ncmmntyuser_pk;
DROP INDEX IF EXISTS public.ncmmntyuser_i01;
DROP INDEX IF EXISTS public.ncmmnty_pk;
DROP INDEX IF EXISTS public.nclubuser_pk;
DROP INDEX IF EXISTS public.nclubuser_i01;
DROP INDEX IF EXISTS public.nclub_pk;
DROP INDEX IF EXISTS public.nbkmkmenumanageresult_pk;
DROP INDEX IF EXISTS public.nbbsuse_pk;
DROP INDEX IF EXISTS public.nbbsuse_i01;
DROP INDEX IF EXISTS public.nbbsmasteroptn_pk;
DROP INDEX IF EXISTS public.nbbsmaster_pk;
DROP INDEX IF EXISTS public.nbbs_pk;
DROP INDEX IF EXISTS public.nbbs_i01;
DROP INDEX IF EXISTS public.nbanner_pk;
DROP INDEX IF EXISTS public.nbackupschduldfk_pk;
DROP INDEX IF EXISTS public.nauthorrolerelate_pk;
DROP INDEX IF EXISTS public.nauthorrolerelate_i02;
DROP INDEX IF EXISTS public.nauthorrolerelate_i01;
DROP INDEX IF EXISTS public.nauthorinfo_pk;
DROP INDEX IF EXISTS public.nauthorgroupinfo_pk;
DROP INDEX IF EXISTS public.nanswer_pk;
DROP INDEX IF EXISTS public.nadbkmanage_pk;
DROP INDEX IF EXISTS public.nadbk_pk;
DROP INDEX IF EXISTS public.nadbk_i01;
DROP INDEX IF EXISTS public.j_attachfile_pk;
DROP INDEX IF EXISTS public.imgtemp_pk;
DROP INDEX IF EXISTS public.idx_nmenuinfo_modern_route;
DROP INDEX IF EXISTS public.htrsmrcvmntrngloginfo_pk;
DROP INDEX IF EXISTS public.hhttpmonloginfo_pk;
DROP INDEX IF EXISTS public.hemplyrinfochangedtls_pk;
DROP INDEX IF EXISTS public.hemplyrinfochangedtls_i01;
DROP INDEX IF EXISTS public.hemaildsptchmanage_pk;
DROP INDEX IF EXISTS public.hemaildsptchmanage_i02;
DROP INDEX IF EXISTS public.hemaildsptchmanage_i01;
DROP INDEX IF EXISTS public.hdbmntrngloginfo_pk;
DROP INDEX IF EXISTS public.hconfmhistory_pk;
DROP INDEX IF EXISTS public.ecopseq_pk;
DROP INDEX IF EXISTS public.ccmmndetailcode_pk;
DROP INDEX IF EXISTS public.ccmmndetailcode_i01;
DROP INDEX IF EXISTS public.ccmmncode_pk;
DROP INDEX IF EXISTS public.ccmmncode_i01;
DROP INDEX IF EXISTS public.ccmmnclcode_pk;
DROP INDEX IF EXISTS public.cadministcoderecptnlog_pk;
DROP INDEX IF EXISTS public.cadministcode_pk;
DROP INDEX IF EXISTS auth.webauthn_credentials_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_credentials_credential_id_key;
DROP INDEX IF EXISTS auth.webauthn_challenges_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_challenges_expires_at_idx;
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_pattern_idx;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_oauth_client_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.oauth_consents_user_order_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_user_client_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_client_idx;
DROP INDEX IF EXISTS auth.oauth_clients_deleted_at_idx;
DROP INDEX IF EXISTS auth.oauth_auth_pending_exp_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_oauth_client_states_created_at;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_provider_type_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_identifier_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_enabled_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_created_at_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
ALTER TABLE IF EXISTS ONLY supabase_migrations.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY supabase_migrations.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_idempotency_key_key;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY storage.buckets_vectors DROP CONSTRAINT IF EXISTS buckets_vectors_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS buckets_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_analytics DROP CONSTRAINT IF EXISTS buckets_analytics_pkey;
ALTER TABLE IF EXISTS ONLY realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY realtime.subscription DROP CONSTRAINT IF EXISTS pk_subscription;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.sweblogsummary DROP CONSTRAINT IF EXISTS sweblogsummary_pkey;
ALTER TABLE IF EXISTS ONLY public.susersummary DROP CONSTRAINT IF EXISTS susersummary_pkey;
ALTER TABLE IF EXISTS ONLY public.strsmrcvlogsummary DROP CONSTRAINT IF EXISTS strsmrcvlogsummary_pkey;
ALTER TABLE IF EXISTS ONLY public.ssyslogsummary DROP CONSTRAINT IF EXISTS ssyslogsummary_pkey;
ALTER TABLE IF EXISTS ONLY public.sbbssummary DROP CONSTRAINT IF EXISTS sbbssummary_pkey;
ALTER TABLE IF EXISTS ONLY public.revinfo DROP CONSTRAINT IF EXISTS revinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nweblog DROP CONSTRAINT IF EXISTS nweblog_pkey;
ALTER TABLE IF EXISTS ONLY public.nuserlog DROP CONSTRAINT IF EXISTS nuserlog_pkey;
ALTER TABLE IF EXISTS ONLY public.nuserabsnce DROP CONSTRAINT IF EXISTS nuserabsnce_pkey;
ALTER TABLE IF EXISTS ONLY public.ntrsmrcvmntrng DROP CONSTRAINT IF EXISTS ntrsmrcvmntrng_pkey;
ALTER TABLE IF EXISTS ONLY public.ntrsmrcvlog DROP CONSTRAINT IF EXISTS ntrsmrcvlog_pkey;
ALTER TABLE IF EXISTS ONLY public.ntroblinfo DROP CONSTRAINT IF EXISTS ntroblinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.ntmplatinfo DROP CONSTRAINT IF EXISTS ntmplatinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nsyslog DROP CONSTRAINT IF EXISTS nsyslog_pkey;
ALTER TABLE IF EXISTS ONLY public.nsynchrnserverinfo DROP CONSTRAINT IF EXISTS nsynchrnserverinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nstsfdg DROP CONSTRAINT IF EXISTS nstsfdg_pkey;
ALTER TABLE IF EXISTS ONLY public.nsmsrecptn DROP CONSTRAINT IF EXISTS nsmsrecptn_pkey;
ALTER TABLE IF EXISTS ONLY public.nsms DROP CONSTRAINT IF EXISTS nsms_pkey;
ALTER TABLE IF EXISTS ONLY public.nsitemap DROP CONSTRAINT IF EXISTS nsitemap_pkey;
ALTER TABLE IF EXISTS ONLY public.nserverresrceloginfo DROP CONSTRAINT IF EXISTS nserverresrceloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nserverinfo DROP CONSTRAINT IF EXISTS nserverinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nservereqpmninfo DROP CONSTRAINT IF EXISTS nservereqpmninfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nscrap DROP CONSTRAINT IF EXISTS nscrap_pkey;
ALTER TABLE IF EXISTS ONLY public.nschdulinfo DROP CONSTRAINT IF EXISTS nschdulinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nrwardmanage DROP CONSTRAINT IF EXISTS nrwardmanage_pkey;
ALTER TABLE IF EXISTS ONLY public.nroles_hierarchy DROP CONSTRAINT IF EXISTS nroles_hierarchy_pkey;
ALTER TABLE IF EXISTS ONLY public.nroleinfo DROP CONSTRAINT IF EXISTS nroleinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nreprtstats DROP CONSTRAINT IF EXISTS nreprtstats_pkey;
ALTER TABLE IF EXISTS ONLY public.nrefresh_token DROP CONSTRAINT IF EXISTS nrefresh_token_token_key;
ALTER TABLE IF EXISTS ONLY public.nrefresh_token DROP CONSTRAINT IF EXISTS nrefresh_token_pkey;
ALTER TABLE IF EXISTS ONLY public.nqustnrtmplat DROP CONSTRAINT IF EXISTS nqustnrtmplat_pkey;
ALTER TABLE IF EXISTS ONLY public.nqustnrrspnsresult DROP CONSTRAINT IF EXISTS nqustnrrspnsresult_pkey;
ALTER TABLE IF EXISTS ONLY public.nqustnrrespondinfo DROP CONSTRAINT IF EXISTS nqustnrrespondinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nqustnrqesitm DROP CONSTRAINT IF EXISTS nqustnrqesitm_pkey;
ALTER TABLE IF EXISTS ONLY public.nqustnriem DROP CONSTRAINT IF EXISTS nqustnriem_pkey;
ALTER TABLE IF EXISTS ONLY public.nqestnrinfo DROP CONSTRAINT IF EXISTS nqestnrinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nqainfo DROP CONSTRAINT IF EXISTS nqainfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nproxyloginfo DROP CONSTRAINT IF EXISTS nproxyloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nproxyinfo DROP CONSTRAINT IF EXISTS nproxyinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nprogrmlist DROP CONSTRAINT IF EXISTS nprogrmlist_pkey;
ALTER TABLE IF EXISTS ONLY public.nprocessmonloginfo DROP CONSTRAINT IF EXISTS nprocessmonloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nprivacylog DROP CONSTRAINT IF EXISTS nprivacylog_pkey;
ALTER TABLE IF EXISTS ONLY public.npopupmanage DROP CONSTRAINT IF EXISTS npopupmanage_pkey;
ALTER TABLE IF EXISTS ONLY public.npolicy DROP CONSTRAINT IF EXISTS npolicy_pkey;
ALTER TABLE IF EXISTS ONLY public.norgnztinfo DROP CONSTRAINT IF EXISTS norgnztinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nonlinepollresult DROP CONSTRAINT IF EXISTS nonlinepollresult_pkey;
ALTER TABLE IF EXISTS ONLY public.nonlinepollmanage DROP CONSTRAINT IF EXISTS nonlinepollmanage_pkey;
ALTER TABLE IF EXISTS ONLY public.nonlinepolliem DROP CONSTRAINT IF EXISTS nonlinepolliem_pkey;
ALTER TABLE IF EXISTS ONLY public.nonlinemanual DROP CONSTRAINT IF EXISTS nonlinemanual_pkey;
ALTER TABLE IF EXISTS ONLY public.nntwrksvcmntrngloginfo DROP CONSTRAINT IF EXISTS nntwrksvcmntrngloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nntwrkinfo DROP CONSTRAINT IF EXISTS nntwrkinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nnttstats DROP CONSTRAINT IF EXISTS nnttstats_pkey;
ALTER TABLE IF EXISTS ONLY public.nntfcinfo DROP CONSTRAINT IF EXISTS nntfcinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nnotetrnsmit DROP CONSTRAINT IF EXISTS nnotetrnsmit_pkey;
ALTER TABLE IF EXISTS ONLY public.nnoterecptn DROP CONSTRAINT IF EXISTS nnoterecptn_pkey;
ALTER TABLE IF EXISTS ONLY public.nnote DROP CONSTRAINT IF EXISTS nnote_pkey;
ALTER TABLE IF EXISTS ONLY public.nmtgplacefxtrs DROP CONSTRAINT IF EXISTS nmtgplacefxtrs_pkey;
ALTER TABLE IF EXISTS ONLY public.nmenuinfo DROP CONSTRAINT IF EXISTS nmenuinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nmenucreatdtls DROP CONSTRAINT IF EXISTS nmenucreatdtls_pkey;
ALTER TABLE IF EXISTS ONLY public.nmemotodo DROP CONSTRAINT IF EXISTS nmemotodo_pkey;
ALTER TABLE IF EXISTS ONLY public.nmemoreprt DROP CONSTRAINT IF EXISTS nmemoreprt_pkey;
ALTER TABLE IF EXISTS ONLY public.nmainimage DROP CONSTRAINT IF EXISTS nmainimage_pkey;
ALTER TABLE IF EXISTS ONLY public.nloginpolicy DROP CONSTRAINT IF EXISTS nloginpolicy_pkey;
ALTER TABLE IF EXISTS ONLY public.nloginlog DROP CONSTRAINT IF EXISTS nloginlog_pkey;
ALTER TABLE IF EXISTS ONLY public.nleadersttus DROP CONSTRAINT IF EXISTS nleadersttus_pkey;
ALTER TABLE IF EXISTS ONLY public.nleaderschdulde DROP CONSTRAINT IF EXISTS nleaderschdulde_pkey;
ALTER TABLE IF EXISTS ONLY public.nleaderschdul DROP CONSTRAINT IF EXISTS nleaderschdul_pkey;
ALTER TABLE IF EXISTS ONLY public.nintnetsvc DROP CONSTRAINT IF EXISTS nintnetsvc_pkey;
ALTER TABLE IF EXISTS ONLY public.ninsttcoderecptnlog DROP CONSTRAINT IF EXISTS ninsttcoderecptnlog_pkey;
ALTER TABLE IF EXISTS ONLY public.ninsttcode DROP CONSTRAINT IF EXISTS ninsttcode_pkey;
ALTER TABLE IF EXISTS ONLY public.ninfrmlsanctn DROP CONSTRAINT IF EXISTS ninfrmlsanctn_pkey;
ALTER TABLE IF EXISTS ONLY public.nindvdlpgeestbs DROP CONSTRAINT IF EXISTS nindvdlpgeestbs_pkey;
ALTER TABLE IF EXISTS ONLY public.nindvdlpgecntnts DROP CONSTRAINT IF EXISTS nindvdlpgecntnts_pkey;
ALTER TABLE IF EXISTS ONLY public.nindvdlinfopolicy DROP CONSTRAINT IF EXISTS nindvdlinfopolicy_pkey;
ALTER TABLE IF EXISTS ONLY public.nhpcminfo DROP CONSTRAINT IF EXISTS nhpcminfo_pkey;
ALTER TABLE IF EXISTS ONLY public.ngnrlmber DROP CONSTRAINT IF EXISTS ngnrlmber_pkey;
ALTER TABLE IF EXISTS ONLY public.nfxtrsmanage DROP CONSTRAINT IF EXISTS nfxtrsmanage_pkey;
ALTER TABLE IF EXISTS ONLY public.nfilesysmntrngloginfo DROP CONSTRAINT IF EXISTS nfilesysmntrngloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nfiledetail DROP CONSTRAINT IF EXISTS nfiledetail_pkey;
ALTER TABLE IF EXISTS ONLY public.nfile DROP CONSTRAINT IF EXISTS nfile_pkey;
ALTER TABLE IF EXISTS ONLY public.nfaqinfo DROP CONSTRAINT IF EXISTS nfaqinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nextrlhrinfo DROP CONSTRAINT IF EXISTS nextrlhrinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.neventinfo DROP CONSTRAINT IF EXISTS neventinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nentrprsmber DROP CONSTRAINT IF EXISTS nentrprsmber_pkey;
ALTER TABLE IF EXISTS ONLY public.nemplyrscrtyestbs DROP CONSTRAINT IF EXISTS nemplyrscrtyestbs_pkey;
ALTER TABLE IF EXISTS ONLY public.nemplyrinfo DROP CONSTRAINT IF EXISTS nemplyrinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nemplyrinfo_aud DROP CONSTRAINT IF EXISTS nemplyrinfo_aud_pkey;
ALTER TABLE IF EXISTS ONLY public.ndtausestats DROP CONSTRAINT IF EXISTS ndtausestats_pkey;
ALTER TABLE IF EXISTS ONLY public.ndiaryinfo DROP CONSTRAINT IF EXISTS ndiaryinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.ndeptjobbx DROP CONSTRAINT IF EXISTS ndeptjobbx_pkey;
ALTER TABLE IF EXISTS ONLY public.ndeptjob DROP CONSTRAINT IF EXISTS ndeptjob_pkey;
ALTER TABLE IF EXISTS ONLY public.ncomment DROP CONSTRAINT IF EXISTS ncomment_pkey;
ALTER TABLE IF EXISTS ONLY public.ncntntslist DROP CONSTRAINT IF EXISTS ncntntslist_pkey;
ALTER TABLE IF EXISTS ONLY public.ncntcservice DROP CONSTRAINT IF EXISTS ncntcservice_pkey;
ALTER TABLE IF EXISTS ONLY public.ncntcmessageitem DROP CONSTRAINT IF EXISTS ncntcmessageitem_pkey;
ALTER TABLE IF EXISTS ONLY public.ncntcmessage DROP CONSTRAINT IF EXISTS ncntcmessage_pkey;
ALTER TABLE IF EXISTS ONLY public.ncnsltmanage DROP CONSTRAINT IF EXISTS ncnsltmanage_pkey;
ALTER TABLE IF EXISTS ONLY public.ncnsltlist DROP CONSTRAINT IF EXISTS ncnsltlist_pkey;
ALTER TABLE IF EXISTS ONLY public.ncmmntyuser DROP CONSTRAINT IF EXISTS ncmmntyuser_pkey;
ALTER TABLE IF EXISTS ONLY public.ncmmnty DROP CONSTRAINT IF EXISTS ncmmnty_pkey;
ALTER TABLE IF EXISTS ONLY public.nclubuser DROP CONSTRAINT IF EXISTS nclubuser_pkey;
ALTER TABLE IF EXISTS ONLY public.nclub DROP CONSTRAINT IF EXISTS nclub_pkey;
ALTER TABLE IF EXISTS ONLY public.ncalrestde DROP CONSTRAINT IF EXISTS ncalrestde_pkey;
ALTER TABLE IF EXISTS ONLY public.nbloguser DROP CONSTRAINT IF EXISTS nbloguser_pkey;
ALTER TABLE IF EXISTS ONLY public.nblog DROP CONSTRAINT IF EXISTS nblog_pkey;
ALTER TABLE IF EXISTS ONLY public.nbkmkmenumanageresult DROP CONSTRAINT IF EXISTS nbkmkmenumanageresult_pkey;
ALTER TABLE IF EXISTS ONLY public.nbbsuse DROP CONSTRAINT IF EXISTS nbbsuse_pkey;
ALTER TABLE IF EXISTS ONLY public.nbbsmasteroptn DROP CONSTRAINT IF EXISTS nbbsmasteroptn_pkey;
ALTER TABLE IF EXISTS ONLY public.nbbsmaster DROP CONSTRAINT IF EXISTS nbbsmaster_pkey;
ALTER TABLE IF EXISTS ONLY public.nbbs DROP CONSTRAINT IF EXISTS nbbs_pkey;
ALTER TABLE IF EXISTS ONLY public.nbanner DROP CONSTRAINT IF EXISTS nbanner_pkey;
ALTER TABLE IF EXISTS ONLY public.nbackupschduldfk DROP CONSTRAINT IF EXISTS nbackupschduldfk_pkey;
ALTER TABLE IF EXISTS ONLY public.nauthorrolerelate DROP CONSTRAINT IF EXISTS nauthorrolerelate_pkey;
ALTER TABLE IF EXISTS ONLY public.nauthorinfo DROP CONSTRAINT IF EXISTS nauthorinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nauthorgroupinfo DROP CONSTRAINT IF EXISTS nauthorgroupinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.nanswer DROP CONSTRAINT IF EXISTS nanswer_pkey;
ALTER TABLE IF EXISTS ONLY public.nadbkmanage DROP CONSTRAINT IF EXISTS nadbkmanage_pkey;
ALTER TABLE IF EXISTS ONLY public.nadbk DROP CONSTRAINT IF EXISTS nadbk_pkey;
ALTER TABLE IF EXISTS ONLY public.n_user_notification DROP CONSTRAINT IF EXISTS n_user_notification_pkey;
ALTER TABLE IF EXISTS ONLY public.j_attachfile DROP CONSTRAINT IF EXISTS j_attachfile_pkey;
ALTER TABLE IF EXISTS ONLY public.imgtemp DROP CONSTRAINT IF EXISTS imgtemp_pkey;
ALTER TABLE IF EXISTS ONLY public.ids DROP CONSTRAINT IF EXISTS ids_pkey;
ALTER TABLE IF EXISTS ONLY public.htrsmrcvmntrngloginfo DROP CONSTRAINT IF EXISTS htrsmrcvmntrngloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.hhttpmonloginfo DROP CONSTRAINT IF EXISTS hhttpmonloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.hemplyrinfochangedtls DROP CONSTRAINT IF EXISTS hemplyrinfochangedtls_pkey;
ALTER TABLE IF EXISTS ONLY public.hemaildsptchmanage DROP CONSTRAINT IF EXISTS hemaildsptchmanage_pkey;
ALTER TABLE IF EXISTS ONLY public.hdbmntrngloginfo DROP CONSTRAINT IF EXISTS hdbmntrngloginfo_pkey;
ALTER TABLE IF EXISTS ONLY public.hconfmhistory DROP CONSTRAINT IF EXISTS hconfmhistory_pkey;
ALTER TABLE IF EXISTS ONLY public.file_item DROP CONSTRAINT IF EXISTS file_item_pkey;
ALTER TABLE IF EXISTS ONLY public.file_group DROP CONSTRAINT IF EXISTS file_group_pkey;
ALTER TABLE IF EXISTS ONLY public.ecopseq DROP CONSTRAINT IF EXISTS ecopseq_pkey;
ALTER TABLE IF EXISTS ONLY public.comtnuserabsence DROP CONSTRAINT IF EXISTS comtnuserabsence_pkey;
ALTER TABLE IF EXISTS ONLY public.comtnindvdlpge DROP CONSTRAINT IF EXISTS comtnindvdlpge_pkey;
ALTER TABLE IF EXISTS ONLY public.ccmmndetailcode DROP CONSTRAINT IF EXISTS ccmmndetailcode_pkey;
ALTER TABLE IF EXISTS ONLY public.ccmmncode DROP CONSTRAINT IF EXISTS ccmmncode_pkey;
ALTER TABLE IF EXISTS ONLY public.ccmmnclcode DROP CONSTRAINT IF EXISTS ccmmnclcode_pkey;
ALTER TABLE IF EXISTS ONLY public.cadministcoderecptnlog DROP CONSTRAINT IF EXISTS cadministcoderecptnlog_pkey;
ALTER TABLE IF EXISTS ONLY public.cadministcode DROP CONSTRAINT IF EXISTS cadministcode_pkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_pkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY auth.sso_providers DROP CONSTRAINT IF EXISTS sso_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_entity_id_key;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_unique;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_client_unique;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_clients DROP CONSTRAINT IF EXISTS oauth_clients_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_client_states DROP CONSTRAINT IF EXISTS oauth_client_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_id_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_code_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_last_challenged_at_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_authentication_method_pkey;
ALTER TABLE IF EXISTS ONLY auth.instances DROP CONSTRAINT IF EXISTS instances_pkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_provider_id_provider_unique;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_pkey;
ALTER TABLE IF EXISTS ONLY auth.flow_state DROP CONSTRAINT IF EXISTS flow_state_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_identifier_key;
ALTER TABLE IF EXISTS ONLY auth.audit_log_entries DROP CONSTRAINT IF EXISTS audit_log_entries_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS amr_id_pk;
ALTER TABLE IF EXISTS auth.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS supabase_migrations.schema_migrations;
DROP TABLE IF EXISTS storage.vector_indexes;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.buckets_vectors;
DROP TABLE IF EXISTS storage.buckets_analytics;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages;
DROP TABLE IF EXISTS public.sweblogsummary;
DROP TABLE IF EXISTS public.susersummary;
DROP TABLE IF EXISTS public.strsmrcvlogsummary;
DROP TABLE IF EXISTS public.ssyslogsummary;
DROP TABLE IF EXISTS public.sbbssummary;
DROP SEQUENCE IF EXISTS public.revinfo_seq;
DROP TABLE IF EXISTS public.revinfo;
DROP TABLE IF EXISTS public.nweblog;
DROP TABLE IF EXISTS public.nuserlog;
DROP TABLE IF EXISTS public.nuserabsnce;
DROP SEQUENCE IF EXISTS public.ntt_id_seq;
DROP TABLE IF EXISTS public.ntrsmrcvmntrng;
DROP TABLE IF EXISTS public.ntrsmrcvlog;
DROP TABLE IF EXISTS public.ntroblinfo;
DROP TABLE IF EXISTS public.ntmplatinfo;
DROP TABLE IF EXISTS public.nsyslog;
DROP TABLE IF EXISTS public.nsynchrnserverinfo;
DROP TABLE IF EXISTS public.nstsfdg;
DROP TABLE IF EXISTS public.nsmsrecptn;
DROP TABLE IF EXISTS public.nsms;
DROP TABLE IF EXISTS public.nsitemap;
DROP TABLE IF EXISTS public.nserverresrceloginfo;
DROP TABLE IF EXISTS public.nserverinfo;
DROP TABLE IF EXISTS public.nservereqpmninfo;
DROP TABLE IF EXISTS public.nscrap;
DROP TABLE IF EXISTS public.nschdulinfo;
DROP TABLE IF EXISTS public.nrwardmanage;
DROP TABLE IF EXISTS public.nroughmap;
DROP TABLE IF EXISTS public.nroles_hierarchy;
DROP TABLE IF EXISTS public.nroleinfo;
DROP TABLE IF EXISTS public.nreprtstats;
DROP TABLE IF EXISTS public.nrefresh_token;
DROP TABLE IF EXISTS public.nqustnrtmplat;
DROP TABLE IF EXISTS public.nqustnrrspnsresult;
DROP TABLE IF EXISTS public.nqustnrrespondinfo;
DROP TABLE IF EXISTS public.nqustnrqesitm;
DROP TABLE IF EXISTS public.nqustnriem;
DROP TABLE IF EXISTS public.nqestnrinfo;
DROP TABLE IF EXISTS public.nqainfo;
DROP TABLE IF EXISTS public.nproxyloginfo;
DROP TABLE IF EXISTS public.nproxyinfo;
DROP TABLE IF EXISTS public.nprogrmlist;
DROP TABLE IF EXISTS public.nprocessmonloginfo;
DROP TABLE IF EXISTS public.nprivacylog;
DROP TABLE IF EXISTS public.npopupmanage;
DROP TABLE IF EXISTS public.npolicy;
DROP TABLE IF EXISTS public.norgnztinfo;
DROP TABLE IF EXISTS public.nonlinepollresult;
DROP TABLE IF EXISTS public.nonlinepollmanage;
DROP TABLE IF EXISTS public.nonlinepolliem;
DROP TABLE IF EXISTS public.nonlinemanual;
DROP TABLE IF EXISTS public.nntwrksvcmntrngloginfo;
DROP TABLE IF EXISTS public.nntwrkinfo;
DROP TABLE IF EXISTS public.nnttstats;
DROP TABLE IF EXISTS public.nntfcinfo;
DROP TABLE IF EXISTS public.nnotetrnsmit;
DROP TABLE IF EXISTS public.nnoterecptn;
DROP TABLE IF EXISTS public.nnote;
DROP TABLE IF EXISTS public.nmtgplacefxtrs;
DROP TABLE IF EXISTS public.nmenuinfo;
DROP TABLE IF EXISTS public.nmenucreatdtls;
DROP TABLE IF EXISTS public.nmemotodo;
DROP TABLE IF EXISTS public.nmemoreprt;
DROP TABLE IF EXISTS public.nmainimage;
DROP TABLE IF EXISTS public.nloginpolicy;
DROP TABLE IF EXISTS public.nloginlog;
DROP TABLE IF EXISTS public.nleadersttus;
DROP TABLE IF EXISTS public.nleaderschdulde;
DROP TABLE IF EXISTS public.nleaderschdul;
DROP TABLE IF EXISTS public.nintnetsvc;
DROP TABLE IF EXISTS public.ninsttcoderecptnlog;
DROP TABLE IF EXISTS public.ninsttcode;
DROP TABLE IF EXISTS public.ninfrmlsanctn;
DROP TABLE IF EXISTS public.nindvdlpgeestbs;
DROP TABLE IF EXISTS public.nindvdlpgecntnts;
DROP TABLE IF EXISTS public.nindvdlinfopolicy;
DROP TABLE IF EXISTS public.nhpcminfo;
DROP TABLE IF EXISTS public.nfxtrsmanage;
DROP TABLE IF EXISTS public.nfilesysmntrngloginfo;
DROP TABLE IF EXISTS public.nfiledetail;
DROP TABLE IF EXISTS public.nfile;
DROP TABLE IF EXISTS public.nfaqinfo;
DROP TABLE IF EXISTS public.nextrlhrinfo;
DROP TABLE IF EXISTS public.neventinfo;
DROP TABLE IF EXISTS public.nemplyrscrtyestbs;
DROP TABLE IF EXISTS public.nemplyrinfo_aud;
DROP TABLE IF EXISTS public.ndtausestats;
DROP TABLE IF EXISTS public.ndiaryinfo;
DROP TABLE IF EXISTS public.ndeptjobbx;
DROP TABLE IF EXISTS public.ndeptjob;
DROP TABLE IF EXISTS public.ncomment;
DROP TABLE IF EXISTS public.ncntntslist;
DROP TABLE IF EXISTS public.ncntcservice;
DROP TABLE IF EXISTS public.ncntcmessageitem;
DROP TABLE IF EXISTS public.ncntcmessage;
DROP TABLE IF EXISTS public.ncnsltmanage;
DROP TABLE IF EXISTS public.ncnsltlist;
DROP TABLE IF EXISTS public.ncmmntyuser;
DROP TABLE IF EXISTS public.ncmmnty;
DROP TABLE IF EXISTS public.nclubuser;
DROP TABLE IF EXISTS public.nclub;
DROP TABLE IF EXISTS public.ncalrestde;
DROP TABLE IF EXISTS public.nbloguser;
DROP TABLE IF EXISTS public.nblog;
DROP TABLE IF EXISTS public.nbkmkmenumanageresult;
DROP TABLE IF EXISTS public.nbbsuse;
DROP TABLE IF EXISTS public.nbbsmasteroptn;
DROP TABLE IF EXISTS public.nbbsmaster;
DROP TABLE IF EXISTS public.nbbs;
DROP TABLE IF EXISTS public.nbanner;
DROP TABLE IF EXISTS public.nbackupschduldfk;
DROP TABLE IF EXISTS public.nauthorrolerelate;
DROP TABLE IF EXISTS public.nauthorinfo;
DROP TABLE IF EXISTS public.nauthorgroupinfo;
DROP TABLE IF EXISTS public.nanswer;
DROP TABLE IF EXISTS public.nadbkmanage;
DROP TABLE IF EXISTS public.nadbk;
DROP TABLE IF EXISTS public.n_user_notification;
DROP TABLE IF EXISTS public.j_attachfile;
DROP TABLE IF EXISTS public.imgtemp;
DROP TABLE IF EXISTS public.ids;
DROP TABLE IF EXISTS public.htrsmrcvmntrngloginfo;
DROP TABLE IF EXISTS public.hhttpmonloginfo;
DROP TABLE IF EXISTS public.hemplyrinfochangedtls;
DROP TABLE IF EXISTS public.hemaildsptchmanage;
DROP TABLE IF EXISTS public.hdbmntrngloginfo;
DROP TABLE IF EXISTS public.hconfmhistory;
DROP TABLE IF EXISTS public.file_item;
DROP TABLE IF EXISTS public.file_group;
DROP TABLE IF EXISTS public.ecopseq;
DROP VIEW IF EXISTS public.comvnusermaster;
DROP TABLE IF EXISTS public.ngnrlmber;
DROP TABLE IF EXISTS public.nentrprsmber;
DROP TABLE IF EXISTS public.nemplyrinfo;
DROP TABLE IF EXISTS public.comtnuserabsence;
DROP TABLE IF EXISTS public.comtnindvdlpge;
DROP TABLE IF EXISTS public.ccmmndetailcode;
DROP TABLE IF EXISTS public.ccmmncode;
DROP TABLE IF EXISTS public.ccmmnclcode;
DROP TABLE IF EXISTS public.cadministcoderecptnlog;
DROP TABLE IF EXISTS public.cadministcode;
DROP TABLE IF EXISTS auth.webauthn_credentials;
DROP TABLE IF EXISTS auth.webauthn_challenges;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.oauth_consents;
DROP TABLE IF EXISTS auth.oauth_clients;
DROP TABLE IF EXISTS auth.oauth_client_states;
DROP TABLE IF EXISTS auth.oauth_authorizations;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.custom_oauth_providers;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text);
DROP FUNCTION IF EXISTS storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text);
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.protect_delete();
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket();
DROP FUNCTION IF EXISTS storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text);
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.enforce_bucket_name_length();
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS storage.buckettype;
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.oauth_response_type;
DROP TYPE IF EXISTS auth.oauth_registration_type;
DROP TYPE IF EXISTS auth.oauth_client_type;
DROP TYPE IF EXISTS auth.oauth_authorization_status;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS supabase_migrations;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS pgbouncer;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS auth;
--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: cadministcode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cadministcode (
    administ_zone_se character varying(1) NOT NULL,
    administ_zone_code character varying(10) NOT NULL,
    use_at character varying(1) NOT NULL,
    administ_zone_nm character varying(60),
    upper_administ_zone_code character varying(10),
    creat_de character varying(8),
    abl_de character varying(8),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE cadministcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cadministcode IS 'CADMINISTCODE';


--
-- Name: COLUMN cadministcode.administ_zone_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.administ_zone_se IS 'ADMINIST구역구분';


--
-- Name: COLUMN cadministcode.administ_zone_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.administ_zone_code IS 'ADMINIST구역코드';


--
-- Name: COLUMN cadministcode.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.use_at IS '사용여부';


--
-- Name: COLUMN cadministcode.administ_zone_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.administ_zone_nm IS 'ADMINIST구역명';


--
-- Name: COLUMN cadministcode.upper_administ_zone_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.upper_administ_zone_code IS 'UPPERADMINIST구역코드';


--
-- Name: COLUMN cadministcode.creat_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.creat_de IS 'CREAT일자';


--
-- Name: COLUMN cadministcode.abl_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.abl_de IS '폐지일자';


--
-- Name: COLUMN cadministcode.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN cadministcode.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN cadministcode.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN cadministcode.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcode.last_updusr_id IS '최종수정자아이디';


--
-- Name: cadministcoderecptnlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cadministcoderecptnlog (
    occrrnc_de character(20) NOT NULL,
    administ_zone_se character(1) NOT NULL,
    administ_zone_code character varying(10) NOT NULL,
    opert_sn numeric(10,0) NOT NULL,
    change_se_code character varying(2),
    process_se character varying(2),
    administ_zone_nm character varying(60),
    lowest_administ_zone_nm character varying(60),
    ctprvn_code character varying(2),
    signgu_code character varying(3),
    emd_code character varying(3),
    li_code character varying(2),
    creat_de character(20),
    abl_de character(20),
    abl_ennc character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE cadministcoderecptnlog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cadministcoderecptnlog IS 'CADMINISTCODERECPTNLOG';


--
-- Name: COLUMN cadministcoderecptnlog.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN cadministcoderecptnlog.administ_zone_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.administ_zone_se IS 'ADMINIST구역구분';


--
-- Name: COLUMN cadministcoderecptnlog.administ_zone_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.administ_zone_code IS 'ADMINIST구역코드';


--
-- Name: COLUMN cadministcoderecptnlog.opert_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.opert_sn IS 'OPERT일련번호';


--
-- Name: COLUMN cadministcoderecptnlog.change_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.change_se_code IS 'CHANGE구분코드';


--
-- Name: COLUMN cadministcoderecptnlog.process_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.process_se IS 'PROCESS구분';


--
-- Name: COLUMN cadministcoderecptnlog.administ_zone_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.administ_zone_nm IS 'ADMINIST구역명';


--
-- Name: COLUMN cadministcoderecptnlog.lowest_administ_zone_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.lowest_administ_zone_nm IS 'LOWESTADMINIST구역명';


--
-- Name: COLUMN cadministcoderecptnlog.ctprvn_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.ctprvn_code IS '법원방지코드';


--
-- Name: COLUMN cadministcoderecptnlog.signgu_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.signgu_code IS 'SIGNGU코드';


--
-- Name: COLUMN cadministcoderecptnlog.emd_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.emd_code IS '읍면동코드';


--
-- Name: COLUMN cadministcoderecptnlog.li_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.li_code IS '리코드';


--
-- Name: COLUMN cadministcoderecptnlog.creat_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.creat_de IS 'CREAT일자';


--
-- Name: COLUMN cadministcoderecptnlog.abl_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.abl_de IS '폐지일자';


--
-- Name: COLUMN cadministcoderecptnlog.abl_ennc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.abl_ennc IS '폐지ENNC';


--
-- Name: COLUMN cadministcoderecptnlog.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN cadministcoderecptnlog.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN cadministcoderecptnlog.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN cadministcoderecptnlog.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cadministcoderecptnlog.last_updt_pnttm IS '최종수정시점';


--
-- Name: ccmmnclcode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ccmmnclcode (
    cl_code character varying(3) NOT NULL,
    cl_code_nm character varying(180),
    cl_code_dc character varying(600),
    use_at character varying(1),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE ccmmnclcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ccmmnclcode IS 'CCMMNCLCODE';


--
-- Name: COLUMN ccmmnclcode.cl_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.cl_code IS 'CL코드';


--
-- Name: COLUMN ccmmnclcode.cl_code_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.cl_code_nm IS 'CL코드명';


--
-- Name: COLUMN ccmmnclcode.cl_code_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.cl_code_dc IS 'CL코드설명';


--
-- Name: COLUMN ccmmnclcode.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.use_at IS '사용여부';


--
-- Name: COLUMN ccmmnclcode.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ccmmnclcode.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ccmmnclcode.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ccmmnclcode.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmnclcode.last_updusr_id IS '최종수정자아이디';


--
-- Name: ccmmncode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ccmmncode (
    code_id character varying(18) NOT NULL,
    code_id_nm character varying(180),
    code_id_dc character varying(600),
    use_at character varying(1),
    cl_code character varying(3),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE ccmmncode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ccmmncode IS 'CCMMNCODE';


--
-- Name: COLUMN ccmmncode.code_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.code_id IS '코드아이디';


--
-- Name: COLUMN ccmmncode.code_id_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.code_id_nm IS '코드아이디명';


--
-- Name: COLUMN ccmmncode.code_id_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.code_id_dc IS '코드아이디설명';


--
-- Name: COLUMN ccmmncode.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.use_at IS '사용여부';


--
-- Name: COLUMN ccmmncode.cl_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.cl_code IS 'CL코드';


--
-- Name: COLUMN ccmmncode.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ccmmncode.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ccmmncode.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ccmmncode.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmncode.last_updusr_id IS '최종수정자아이디';


--
-- Name: ccmmndetailcode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ccmmndetailcode (
    code_id character varying(18) NOT NULL,
    code character varying(45) NOT NULL,
    code_nm character varying(180),
    code_dc character varying(600),
    use_at character varying(1),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE ccmmndetailcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ccmmndetailcode IS 'CCMMNDETAILCODE';


--
-- Name: COLUMN ccmmndetailcode.code_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.code_id IS '코드아이디';


--
-- Name: COLUMN ccmmndetailcode.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.code IS '코드';


--
-- Name: COLUMN ccmmndetailcode.code_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.code_nm IS '코드명';


--
-- Name: COLUMN ccmmndetailcode.code_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.code_dc IS '코드설명';


--
-- Name: COLUMN ccmmndetailcode.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.use_at IS '사용여부';


--
-- Name: COLUMN ccmmndetailcode.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ccmmndetailcode.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ccmmndetailcode.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ccmmndetailcode.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ccmmndetailcode.last_updusr_id IS '최종수정자아이디';


--
-- Name: comtnindvdlpge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comtnindvdlpge (
    cntnts_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    cntnts_dc character varying(255),
    cntnts_link_url character varying(255),
    cntnts_nm character varying(100),
    cntnts_use_at character varying(1)
);


--
-- Name: comtnuserabsence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comtnuserabsence (
    emplyr_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    user_absnce_at character varying(1) NOT NULL
);


--
-- Name: nemplyrinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nemplyrinfo (
    emplyr_id character varying(20) NOT NULL,
    orgnzt_id character(20),
    user_nm character varying(60) NOT NULL,
    password character varying(200) NOT NULL,
    empl_no character varying(20),
    ihidnum character varying(200),
    sexdstn_code character(1),
    brthdy character(20),
    fxnum character varying(20),
    house_adres character varying(100) NOT NULL,
    password_hint character varying(100) NOT NULL,
    password_cnsr character varying(100) NOT NULL,
    house_end_telno character varying(4) NOT NULL,
    area_no character varying(12) NOT NULL,
    detail_adres character varying(100),
    zip character varying(6) NOT NULL,
    offm_telno character varying(20),
    mbtlnum character varying(20),
    email_adres character varying(50),
    ofcps_nm character varying(60),
    house_middle_telno character varying(4) NOT NULL,
    group_id character(20),
    pstinst_code character(8),
    emplyr_sttus_code character(1) NOT NULL,
    esntl_id character(20) NOT NULL,
    crtfc_dn_value character varying(100),
    sbscrb_de timestamp without time zone,
    lock_at character(1),
    lock_cnt numeric(3,0),
    lock_last_pnttm timestamp without time zone,
    chg_pwd_last_pnttm timestamp without time zone,
    chg_pwd_cnt integer,
    role character varying(60) DEFAULT 'USER'::character varying,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nemplyrinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nemplyrinfo IS 'NEMPLYRINFO';


--
-- Name: COLUMN nemplyrinfo.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN nemplyrinfo.orgnzt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.orgnzt_id IS '조직아이디';


--
-- Name: COLUMN nemplyrinfo.user_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.user_nm IS '사용자명';


--
-- Name: COLUMN nemplyrinfo.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.password IS '비밀번호';


--
-- Name: COLUMN nemplyrinfo.empl_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.empl_no IS '사원번호';


--
-- Name: COLUMN nemplyrinfo.ihidnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.ihidnum IS '주민등록번호';


--
-- Name: COLUMN nemplyrinfo.sexdstn_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.sexdstn_code IS 'SEXDSTN코드';


--
-- Name: COLUMN nemplyrinfo.brthdy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.brthdy IS '생년월일';


--
-- Name: COLUMN nemplyrinfo.fxnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.fxnum IS 'FXNUM';


--
-- Name: COLUMN nemplyrinfo.house_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.house_adres IS '택주소';


--
-- Name: COLUMN nemplyrinfo.password_hint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.password_hint IS '비밀번호힌트';


--
-- Name: COLUMN nemplyrinfo.password_cnsr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.password_cnsr IS '비밀번호답변';


--
-- Name: COLUMN nemplyrinfo.house_end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.house_end_telno IS '택종료전화번호';


--
-- Name: COLUMN nemplyrinfo.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.area_no IS '지역번호';


--
-- Name: COLUMN nemplyrinfo.detail_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.detail_adres IS 'DETAIL주소';


--
-- Name: COLUMN nemplyrinfo.zip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.zip IS '우편번호';


--
-- Name: COLUMN nemplyrinfo.offm_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.offm_telno IS '사무실전화번호';


--
-- Name: COLUMN nemplyrinfo.mbtlnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.mbtlnum IS '휴대폰번호';


--
-- Name: COLUMN nemplyrinfo.email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.email_adres IS '이메일주소';


--
-- Name: COLUMN nemplyrinfo.ofcps_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.ofcps_nm IS 'OFCPS명';


--
-- Name: COLUMN nemplyrinfo.house_middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.house_middle_telno IS '택MIDDLE전화번호';


--
-- Name: COLUMN nemplyrinfo.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.group_id IS '그룹아이디';


--
-- Name: COLUMN nemplyrinfo.pstinst_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.pstinst_code IS '게시물기관코드';


--
-- Name: COLUMN nemplyrinfo.emplyr_sttus_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.emplyr_sttus_code IS '사용자상태코드';


--
-- Name: COLUMN nemplyrinfo.esntl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.esntl_id IS '필수아이디';


--
-- Name: COLUMN nemplyrinfo.crtfc_dn_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.crtfc_dn_value IS 'CRTFCDNVALUE';


--
-- Name: COLUMN nemplyrinfo.sbscrb_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.sbscrb_de IS 'SBSCRB일자';


--
-- Name: COLUMN nemplyrinfo.lock_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.lock_at IS 'LOCK여부';


--
-- Name: COLUMN nemplyrinfo.lock_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.lock_cnt IS 'LOCK수';


--
-- Name: COLUMN nemplyrinfo.lock_last_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.lock_last_pnttm IS 'LOCK최종시점';


--
-- Name: COLUMN nemplyrinfo.chg_pwd_last_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrinfo.chg_pwd_last_pnttm IS '변경PWD최종시점';


--
-- Name: nentrprsmber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nentrprsmber (
    entrprs_mber_id character varying(20) NOT NULL,
    entrprs_se_code character(8),
    bizrno character varying(10),
    jurirno character varying(13),
    cmpny_nm character varying(60) NOT NULL,
    cxfc character varying(50),
    zip character varying(6) NOT NULL,
    adres character varying(100) NOT NULL,
    entrprs_middle_telno character varying(4) NOT NULL,
    fxnum character varying(20),
    induty_code character(1),
    applcnt_nm character varying(50) NOT NULL,
    applcnt_ihidnum character varying(200),
    sbscrb_de timestamp without time zone,
    entrprs_mber_sttus character varying(15),
    entrprs_mber_password character varying(200),
    entrprs_mber_password_hint character varying(100) NOT NULL,
    entrprs_mber_password_cnsr character varying(100) NOT NULL,
    group_id character(20),
    detail_adres character varying(100),
    entrprs_end_telno character varying(4) NOT NULL,
    area_no character varying(4) NOT NULL,
    applcnt_email_adres character varying(50) NOT NULL,
    esntl_id character(20) NOT NULL,
    lock_at character(1),
    lock_cnt numeric(3,0),
    lock_last_pnttm timestamp without time zone,
    chg_pwd_last_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nentrprsmber; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nentrprsmber IS 'NENTRPRSMBER';


--
-- Name: COLUMN nentrprsmber.entrprs_mber_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_mber_id IS '기업회원아이디';


--
-- Name: COLUMN nentrprsmber.entrprs_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_se_code IS '기업구분코드';


--
-- Name: COLUMN nentrprsmber.bizrno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.bizrno IS 'BIZRNO';


--
-- Name: COLUMN nentrprsmber.jurirno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.jurirno IS 'JURIRNO';


--
-- Name: COLUMN nentrprsmber.cmpny_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.cmpny_nm IS 'CMPNY명';


--
-- Name: COLUMN nentrprsmber.cxfc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.cxfc IS 'CXFC';


--
-- Name: COLUMN nentrprsmber.zip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.zip IS '우편번호';


--
-- Name: COLUMN nentrprsmber.adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.adres IS '주소';


--
-- Name: COLUMN nentrprsmber.entrprs_middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_middle_telno IS '기업MIDDLE전화번호';


--
-- Name: COLUMN nentrprsmber.fxnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.fxnum IS 'FXNUM';


--
-- Name: COLUMN nentrprsmber.induty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.induty_code IS 'INDUTY코드';


--
-- Name: COLUMN nentrprsmber.applcnt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.applcnt_nm IS '출원수명';


--
-- Name: COLUMN nentrprsmber.applcnt_ihidnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.applcnt_ihidnum IS '출원수주민등록번호';


--
-- Name: COLUMN nentrprsmber.sbscrb_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.sbscrb_de IS 'SBSCRB일자';


--
-- Name: COLUMN nentrprsmber.entrprs_mber_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_mber_sttus IS '기업회원상태';


--
-- Name: COLUMN nentrprsmber.entrprs_mber_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_mber_password IS '기업회원비밀번호';


--
-- Name: COLUMN nentrprsmber.entrprs_mber_password_hint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_mber_password_hint IS '기업회원비밀번호힌트';


--
-- Name: COLUMN nentrprsmber.entrprs_mber_password_cnsr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_mber_password_cnsr IS '기업회원비밀번호답변';


--
-- Name: COLUMN nentrprsmber.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.group_id IS '그룹아이디';


--
-- Name: COLUMN nentrprsmber.detail_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.detail_adres IS 'DETAIL주소';


--
-- Name: COLUMN nentrprsmber.entrprs_end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.entrprs_end_telno IS '기업종료전화번호';


--
-- Name: COLUMN nentrprsmber.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.area_no IS '지역번호';


--
-- Name: COLUMN nentrprsmber.applcnt_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.applcnt_email_adres IS '출원수이메일주소';


--
-- Name: COLUMN nentrprsmber.esntl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.esntl_id IS '필수아이디';


--
-- Name: COLUMN nentrprsmber.lock_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.lock_at IS 'LOCK여부';


--
-- Name: COLUMN nentrprsmber.lock_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.lock_cnt IS 'LOCK수';


--
-- Name: COLUMN nentrprsmber.lock_last_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.lock_last_pnttm IS 'LOCK최종시점';


--
-- Name: COLUMN nentrprsmber.chg_pwd_last_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nentrprsmber.chg_pwd_last_pnttm IS '변경PWD최종시점';


--
-- Name: ngnrlmber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ngnrlmber (
    mber_id character varying(20) NOT NULL,
    password character varying(200) NOT NULL,
    password_hint character varying(100),
    password_cnsr character varying(100),
    ihidnum character varying(200),
    mber_nm character varying(50) NOT NULL,
    zip character varying(6) NOT NULL,
    adres character varying(100) NOT NULL,
    area_no character varying(4) NOT NULL,
    mber_sttus character varying(15),
    detail_adres character varying(100),
    end_telno character varying(4) NOT NULL,
    mbtlnum character varying(20) NOT NULL,
    group_id character(20),
    mber_fxnum character varying(20),
    mber_email_adres character varying(50),
    middle_telno character varying(4) NOT NULL,
    sbscrb_de timestamp without time zone,
    sexdstn_code character(1),
    esntl_id character(20) NOT NULL,
    lock_at character(1),
    lock_cnt numeric(3,0),
    lock_last_pnttm timestamp without time zone,
    chg_pwd_last_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ngnrlmber; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ngnrlmber IS 'NGNRLMBER';


--
-- Name: COLUMN ngnrlmber.mber_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.mber_id IS '회원아이디';


--
-- Name: COLUMN ngnrlmber.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.password IS '비밀번호';


--
-- Name: COLUMN ngnrlmber.password_hint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.password_hint IS '비밀번호힌트';


--
-- Name: COLUMN ngnrlmber.password_cnsr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.password_cnsr IS '비밀번호답변';


--
-- Name: COLUMN ngnrlmber.ihidnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.ihidnum IS '주민등록번호';


--
-- Name: COLUMN ngnrlmber.mber_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.mber_nm IS '회원명';


--
-- Name: COLUMN ngnrlmber.zip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.zip IS '우편번호';


--
-- Name: COLUMN ngnrlmber.adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.adres IS '주소';


--
-- Name: COLUMN ngnrlmber.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.area_no IS '지역번호';


--
-- Name: COLUMN ngnrlmber.mber_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.mber_sttus IS '회원상태';


--
-- Name: COLUMN ngnrlmber.detail_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.detail_adres IS 'DETAIL주소';


--
-- Name: COLUMN ngnrlmber.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.end_telno IS '종료전화번호';


--
-- Name: COLUMN ngnrlmber.mbtlnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.mbtlnum IS '휴대폰번호';


--
-- Name: COLUMN ngnrlmber.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.group_id IS '그룹아이디';


--
-- Name: COLUMN ngnrlmber.mber_fxnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.mber_fxnum IS '회원FXNUM';


--
-- Name: COLUMN ngnrlmber.mber_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.mber_email_adres IS '회원이메일주소';


--
-- Name: COLUMN ngnrlmber.middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.middle_telno IS 'MIDDLE전화번호';


--
-- Name: COLUMN ngnrlmber.sbscrb_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.sbscrb_de IS 'SBSCRB일자';


--
-- Name: COLUMN ngnrlmber.sexdstn_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.sexdstn_code IS 'SEXDSTN코드';


--
-- Name: COLUMN ngnrlmber.esntl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.esntl_id IS '필수아이디';


--
-- Name: COLUMN ngnrlmber.lock_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.lock_at IS 'LOCK여부';


--
-- Name: COLUMN ngnrlmber.lock_cnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.lock_cnt IS 'LOCK수';


--
-- Name: COLUMN ngnrlmber.lock_last_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.lock_last_pnttm IS 'LOCK최종시점';


--
-- Name: COLUMN ngnrlmber.chg_pwd_last_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ngnrlmber.chg_pwd_last_pnttm IS '변경PWD최종시점';


--
-- Name: comvnusermaster; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.comvnusermaster AS
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


--
-- Name: ecopseq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ecopseq (
    table_name character varying(20) NOT NULL,
    next_id numeric(30,0)
);


--
-- Name: TABLE ecopseq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ecopseq IS 'ECOPSEQ';


--
-- Name: COLUMN ecopseq.table_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.table_name IS 'TABLENAME';


--
-- Name: COLUMN ecopseq.next_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ecopseq.next_id IS 'NEXT아이디';


--
-- Name: file_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_group (
    id bigint NOT NULL,
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    atch_file_id character varying(50) NOT NULL,
    use_at character varying(1)
);


--
-- Name: file_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.file_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.file_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: file_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_item (
    id bigint NOT NULL,
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    file_extsn character varying(255),
    file_size bigint,
    file_sn integer,
    file_stre_cours character varying(255) NOT NULL,
    orignl_file_nm character varying(255) NOT NULL,
    stre_file_nm character varying(255) NOT NULL,
    file_group_id bigint NOT NULL
);


--
-- Name: file_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.file_item ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.file_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: hconfmhistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hconfmhistory (
    confm_no numeric(8,0) NOT NULL,
    confm_rqester_id character varying(20) NOT NULL,
    confmer_id character varying(20),
    confm_de character(20),
    confm_ty_code character(4) NOT NULL,
    confm_sttus_code character(4) NOT NULL,
    opert_ty_code character(4),
    opert_id character varying(20),
    trget_job_ty_code character(3),
    trget_job_id character(20)
);


--
-- Name: TABLE hconfmhistory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hconfmhistory IS 'HCONFMHISTORY';


--
-- Name: COLUMN hconfmhistory.confm_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.confm_no IS 'CONFM번호';


--
-- Name: COLUMN hconfmhistory.confm_rqester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.confm_rqester_id IS 'CONFMRQESTER아이디';


--
-- Name: COLUMN hconfmhistory.confmer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.confmer_id IS 'CONFMER아이디';


--
-- Name: COLUMN hconfmhistory.confm_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.confm_de IS 'CONFM일자';


--
-- Name: COLUMN hconfmhistory.confm_ty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.confm_ty_code IS 'CONFM유형코드';


--
-- Name: COLUMN hconfmhistory.confm_sttus_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.confm_sttus_code IS 'CONFM상태코드';


--
-- Name: COLUMN hconfmhistory.opert_ty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.opert_ty_code IS 'OPERT유형코드';


--
-- Name: COLUMN hconfmhistory.opert_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.opert_id IS 'OPERT아이디';


--
-- Name: COLUMN hconfmhistory.trget_job_ty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.trget_job_ty_code IS 'TRGET작업유형코드';


--
-- Name: COLUMN hconfmhistory.trget_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hconfmhistory.trget_job_id IS 'TRGET작업아이디';


--
-- Name: hdbmntrngloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hdbmntrngloginfo (
    data_sourc_nm character varying(60) NOT NULL,
    server_nm character varying(60),
    dbms_knd character varying(2),
    ceck_sql character varying(250),
    mngr_nm character varying(60),
    mngr_email_adres character varying(50),
    mntrng_sttus character(2),
    log_info character varying(2000),
    creat_dt timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updt_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    log_id character(20) NOT NULL
);


--
-- Name: TABLE hdbmntrngloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hdbmntrngloginfo IS 'HDBMNTRNGLOGINFO';


--
-- Name: COLUMN hdbmntrngloginfo.data_sourc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.data_sourc_nm IS '자료SOURC명';


--
-- Name: COLUMN hdbmntrngloginfo.server_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.server_nm IS 'SERVER명';


--
-- Name: COLUMN hdbmntrngloginfo.dbms_knd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.dbms_knd IS 'DBMS종류';


--
-- Name: COLUMN hdbmntrngloginfo.ceck_sql; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.ceck_sql IS 'CECKSQL';


--
-- Name: COLUMN hdbmntrngloginfo.mngr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.mngr_nm IS '관리자명';


--
-- Name: COLUMN hdbmntrngloginfo.mngr_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.mngr_email_adres IS '관리자이메일주소';


--
-- Name: COLUMN hdbmntrngloginfo.mntrng_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.mntrng_sttus IS 'MNTRNG상태';


--
-- Name: COLUMN hdbmntrngloginfo.log_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.log_info IS '로그정보';


--
-- Name: COLUMN hdbmntrngloginfo.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN hdbmntrngloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN hdbmntrngloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN hdbmntrngloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN hdbmntrngloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN hdbmntrngloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hdbmntrngloginfo.log_id IS '로그아이디';


--
-- Name: hemaildsptchmanage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hemaildsptchmanage (
    mssage_id character varying(20) NOT NULL,
    email_cn character varying(4000),
    sndr character varying(100) NOT NULL,
    rcver character varying(100) NOT NULL,
    sj character varying(255) NOT NULL,
    sndng_result_code character varying(20),
    dsptch_dt character varying(20) NOT NULL,
    atch_file_id character varying(20),
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20)
);


--
-- Name: TABLE hemaildsptchmanage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hemaildsptchmanage IS 'HEMAILDSPTCHMANAGE';


--
-- Name: COLUMN hemaildsptchmanage.mssage_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.mssage_id IS 'MSSAGE아이디';


--
-- Name: COLUMN hemaildsptchmanage.email_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.email_cn IS '이메일내용';


--
-- Name: COLUMN hemaildsptchmanage.sndr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.sndr IS '발송자';


--
-- Name: COLUMN hemaildsptchmanage.rcver; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.rcver IS '수화자';


--
-- Name: COLUMN hemaildsptchmanage.sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.sj IS '제목';


--
-- Name: COLUMN hemaildsptchmanage.sndng_result_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.sndng_result_code IS '발송RESULT코드';


--
-- Name: COLUMN hemaildsptchmanage.dsptch_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.dsptch_dt IS '발신일시';


--
-- Name: COLUMN hemaildsptchmanage.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemaildsptchmanage.atch_file_id IS '첨부파일아이디';


--
-- Name: hemplyrinfochangedtls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hemplyrinfochangedtls (
    emplyr_id character varying(20) NOT NULL,
    change_de character(20) NOT NULL,
    orgnzt_id character(20),
    group_id character(20),
    empl_no character varying(20),
    sexdstn_code character(1),
    brthdy character(20),
    fxnum character varying(20),
    house_adres character varying(100),
    house_end_telno character varying(4),
    area_no character varying(4),
    detail_adres character varying(100),
    zip character varying(6),
    offm_telno character varying(20),
    mbtlnum character varying(20),
    email_adres character varying(50),
    house_middle_telno character varying(4),
    pstinst_code character(8),
    emplyr_sttus_code character(1),
    esntl_id character(20)
);


--
-- Name: TABLE hemplyrinfochangedtls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hemplyrinfochangedtls IS 'HEMPLYRINFOCHANGEDTLS';


--
-- Name: COLUMN hemplyrinfochangedtls.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN hemplyrinfochangedtls.change_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.change_de IS 'CHANGE일자';


--
-- Name: COLUMN hemplyrinfochangedtls.orgnzt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.orgnzt_id IS '조직아이디';


--
-- Name: COLUMN hemplyrinfochangedtls.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.group_id IS '그룹아이디';


--
-- Name: COLUMN hemplyrinfochangedtls.empl_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.empl_no IS '사원번호';


--
-- Name: COLUMN hemplyrinfochangedtls.sexdstn_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.sexdstn_code IS 'SEXDSTN코드';


--
-- Name: COLUMN hemplyrinfochangedtls.brthdy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.brthdy IS '생년월일';


--
-- Name: COLUMN hemplyrinfochangedtls.fxnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.fxnum IS 'FXNUM';


--
-- Name: COLUMN hemplyrinfochangedtls.house_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.house_adres IS '택주소';


--
-- Name: COLUMN hemplyrinfochangedtls.house_end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.house_end_telno IS '택종료전화번호';


--
-- Name: COLUMN hemplyrinfochangedtls.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.area_no IS '지역번호';


--
-- Name: COLUMN hemplyrinfochangedtls.detail_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.detail_adres IS 'DETAIL주소';


--
-- Name: COLUMN hemplyrinfochangedtls.zip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.zip IS '우편번호';


--
-- Name: COLUMN hemplyrinfochangedtls.offm_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.offm_telno IS '사무실전화번호';


--
-- Name: COLUMN hemplyrinfochangedtls.mbtlnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.mbtlnum IS '휴대폰번호';


--
-- Name: COLUMN hemplyrinfochangedtls.email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.email_adres IS '이메일주소';


--
-- Name: COLUMN hemplyrinfochangedtls.house_middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.house_middle_telno IS '택MIDDLE전화번호';


--
-- Name: COLUMN hemplyrinfochangedtls.pstinst_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.pstinst_code IS '게시물기관코드';


--
-- Name: COLUMN hemplyrinfochangedtls.emplyr_sttus_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.emplyr_sttus_code IS '사용자상태코드';


--
-- Name: COLUMN hemplyrinfochangedtls.esntl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hemplyrinfochangedtls.esntl_id IS '필수아이디';


--
-- Name: hhttpmonloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hhttpmonloginfo (
    sys_id character varying(20) NOT NULL,
    site_url character varying(100),
    websvc_knd character varying(10),
    http_sttus_code character varying(3),
    creat_dt timestamp without time zone,
    log_info character varying(2000),
    mngr_nm character varying(60),
    mngr_email_adres character varying(50),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    log_id character(20) NOT NULL
);


--
-- Name: TABLE hhttpmonloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hhttpmonloginfo IS 'HHTTPMONLOGINFO';


--
-- Name: COLUMN hhttpmonloginfo.sys_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.sys_id IS '시스템아이디';


--
-- Name: COLUMN hhttpmonloginfo.site_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.site_url IS '사이트URL';


--
-- Name: COLUMN hhttpmonloginfo.websvc_knd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.websvc_knd IS '웹봉사종류';


--
-- Name: COLUMN hhttpmonloginfo.http_sttus_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.http_sttus_code IS 'HTTP상태코드';


--
-- Name: COLUMN hhttpmonloginfo.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN hhttpmonloginfo.log_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.log_info IS '로그정보';


--
-- Name: COLUMN hhttpmonloginfo.mngr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.mngr_nm IS '관리자명';


--
-- Name: COLUMN hhttpmonloginfo.mngr_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.mngr_email_adres IS '관리자이메일주소';


--
-- Name: COLUMN hhttpmonloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN hhttpmonloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN hhttpmonloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN hhttpmonloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN hhttpmonloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hhttpmonloginfo.log_id IS '로그아이디';


--
-- Name: htrsmrcvmntrngloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.htrsmrcvmntrngloginfo (
    log_id character(20) NOT NULL,
    cntc_id character(8) NOT NULL,
    test_class_nm character varying(255),
    mngr_nm character varying(60),
    mngr_email_adres character varying(50),
    mntrng_sttus character(2),
    log_info character varying(2000),
    creat_dt timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone NOT NULL
);


--
-- Name: TABLE htrsmrcvmntrngloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.htrsmrcvmntrngloginfo IS 'HTRSMRCVMNTRNGLOGINFO';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.log_id IS '로그아이디';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.cntc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.cntc_id IS '접촉아이디';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.test_class_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.test_class_nm IS '시험CLASS명';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.mngr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.mngr_nm IS '관리자명';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.mngr_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.mngr_email_adres IS '관리자이메일주소';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.mntrng_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.mntrng_sttus IS 'MNTRNG상태';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.log_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.log_info IS '로그정보';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN htrsmrcvmntrngloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.htrsmrcvmntrngloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: ids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ids (
    table_name character varying(20) NOT NULL,
    next_id numeric(30,0) NOT NULL
);


--
-- Name: imgtemp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imgtemp (
    orgnzt_code character varying(10) NOT NULL,
    erncsl_se character varying(2) NOT NULL,
    image_info bytea NOT NULL,
    image_ty character varying(20),
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20)
);


--
-- Name: TABLE imgtemp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.imgtemp IS 'IMGTEMP';


--
-- Name: COLUMN imgtemp.orgnzt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.imgtemp.orgnzt_code IS '조직코드';


--
-- Name: COLUMN imgtemp.erncsl_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.imgtemp.erncsl_se IS 'ERNCSL구분';


--
-- Name: COLUMN imgtemp.image_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.imgtemp.image_info IS 'IMAGE정보';


--
-- Name: COLUMN imgtemp.image_ty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.imgtemp.image_ty IS 'IMAGE유형';


--
-- Name: j_attachfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.j_attachfile (
    file_id character varying(13) NOT NULL,
    file_seq integer NOT NULL,
    file_name character varying(100) NOT NULL,
    file_size integer,
    file_mask character varying(100),
    download_count integer,
    download_expire_date character varying(8),
    download_limit_count integer,
    reg_date timestamp without time zone,
    delete_yn character varying(1)
);


--
-- Name: TABLE j_attachfile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.j_attachfile IS 'JATTACHFILE';


--
-- Name: COLUMN j_attachfile.file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.file_id IS '파일아이디';


--
-- Name: COLUMN j_attachfile.file_seq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.file_seq IS '파일순서';


--
-- Name: COLUMN j_attachfile.file_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.file_name IS '파일NAME';


--
-- Name: COLUMN j_attachfile.file_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.file_size IS '파일SIZE';


--
-- Name: COLUMN j_attachfile.file_mask; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.file_mask IS '파일MASK';


--
-- Name: COLUMN j_attachfile.download_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.download_count IS 'DOWNLOADCOUNT';


--
-- Name: COLUMN j_attachfile.download_expire_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.download_expire_date IS 'DOWNLOADEXPIREDATE';


--
-- Name: COLUMN j_attachfile.download_limit_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.download_limit_count IS 'DOWNLOADLIMITCOUNT';


--
-- Name: COLUMN j_attachfile.reg_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.reg_date IS '등록DATE';


--
-- Name: COLUMN j_attachfile.delete_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.j_attachfile.delete_yn IS 'DELETE여부';


--
-- Name: n_user_notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.n_user_notification (
    ntcn_no character varying(20) NOT NULL,
    ntcn_sj character varying(250) NOT NULL,
    ntcn_cn character varying(2500),
    receiver_id character varying(20) NOT NULL,
    is_read character varying(1) DEFAULT 'N'::character varying,
    link_url character varying(255),
    frst_register_id character varying(255),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(255),
    last_updt_pnttm timestamp without time zone,
    ntcn_tm character varying(20),
    bh_ntcn_intrvl character varying(20)
);


--
-- Name: nadbk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nadbk (
    emplyr_id character varying(20),
    ncrd_id character(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    adbk_constnt_id character varying(20) NOT NULL,
    nm character varying(50),
    email_adres character varying(50),
    mbtlnum character varying(20),
    fxnum character varying(20),
    offm_telno character varying(20),
    house_telno character varying(20),
    adbk_id character varying(20) NOT NULL
);


--
-- Name: TABLE nadbk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nadbk IS 'NADBK';


--
-- Name: COLUMN nadbk.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN nadbk.ncrd_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.ncrd_id IS 'NCRD아이디';


--
-- Name: COLUMN nadbk.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nadbk.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nadbk.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nadbk.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nadbk.adbk_constnt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.adbk_constnt_id IS '주소록CONSTNT아이디';


--
-- Name: COLUMN nadbk.nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.nm IS '명';


--
-- Name: COLUMN nadbk.email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.email_adres IS '이메일주소';


--
-- Name: COLUMN nadbk.mbtlnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.mbtlnum IS '휴대폰번호';


--
-- Name: COLUMN nadbk.fxnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.fxnum IS 'FXNUM';


--
-- Name: COLUMN nadbk.offm_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.offm_telno IS '사무실전화번호';


--
-- Name: COLUMN nadbk.house_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.house_telno IS '택전화번호';


--
-- Name: COLUMN nadbk.adbk_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbk.adbk_id IS '주소록아이디';


--
-- Name: nadbkmanage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nadbkmanage (
    adbk_id character varying(20) NOT NULL,
    adbk_nm character varying(100) NOT NULL,
    othbc_scope character varying(20) NOT NULL,
    use_at character varying(1) NOT NULL,
    wrter_id character varying(20),
    trget_orgnzt_id character varying(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(20) NOT NULL,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nadbkmanage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nadbkmanage IS 'NADBKMANAGE';


--
-- Name: COLUMN nadbkmanage.adbk_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.adbk_id IS '주소록아이디';


--
-- Name: COLUMN nadbkmanage.adbk_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.adbk_nm IS '주소록명';


--
-- Name: COLUMN nadbkmanage.othbc_scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.othbc_scope IS 'OTHBCSCOPE';


--
-- Name: COLUMN nadbkmanage.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.use_at IS '사용여부';


--
-- Name: COLUMN nadbkmanage.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.wrter_id IS 'WRTER아이디';


--
-- Name: COLUMN nadbkmanage.trget_orgnzt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.trget_orgnzt_id IS 'TRGET조직아이디';


--
-- Name: COLUMN nadbkmanage.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nadbkmanage.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nadbkmanage.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nadbkmanage.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nadbkmanage.last_updusr_id IS '최종수정자아이디';


--
-- Name: nanswer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nanswer (
    ntt_id numeric(20,0) NOT NULL,
    bbs_id character(30) NOT NULL,
    wrter_id character varying(20),
    answer character varying(200),
    use_at character(1) NOT NULL,
    wrter_nm character varying(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    answer_no numeric(20,0) NOT NULL
);


--
-- Name: TABLE nanswer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nanswer IS 'NANSWER';


--
-- Name: COLUMN nanswer.ntt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.ntt_id IS 'NTT아이디';


--
-- Name: COLUMN nanswer.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nanswer.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.wrter_id IS 'WRTER아이디';


--
-- Name: COLUMN nanswer.answer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.answer IS 'ANSWER';


--
-- Name: COLUMN nanswer.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.use_at IS '사용여부';


--
-- Name: COLUMN nanswer.wrter_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.wrter_nm IS 'WRTER명';


--
-- Name: COLUMN nanswer.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nanswer.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nanswer.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nanswer.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nanswer.answer_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nanswer.answer_no IS 'ANSWER번호';


--
-- Name: nauthorgroupinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nauthorgroupinfo (
    group_id character varying(20) NOT NULL,
    group_nm character varying(60) NOT NULL,
    group_creat_de timestamp without time zone NOT NULL,
    group_dc character varying(100),
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nauthorgroupinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nauthorgroupinfo IS 'NAUTHORGROUPINFO';


--
-- Name: COLUMN nauthorgroupinfo.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorgroupinfo.group_id IS '그룹아이디';


--
-- Name: COLUMN nauthorgroupinfo.group_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorgroupinfo.group_nm IS '그룹명';


--
-- Name: COLUMN nauthorgroupinfo.group_creat_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorgroupinfo.group_creat_de IS '그룹CREAT일자';


--
-- Name: COLUMN nauthorgroupinfo.group_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorgroupinfo.group_dc IS '그룹설명';


--
-- Name: nauthorinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nauthorinfo (
    author_code character varying(30) NOT NULL,
    author_nm character varying(60) NOT NULL,
    author_dc character varying(200),
    author_creat_de timestamp without time zone NOT NULL,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nauthorinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nauthorinfo IS 'NAUTHORINFO';


--
-- Name: COLUMN nauthorinfo.author_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorinfo.author_code IS '권한코드';


--
-- Name: COLUMN nauthorinfo.author_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorinfo.author_nm IS '권한명';


--
-- Name: COLUMN nauthorinfo.author_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorinfo.author_dc IS '권한설명';


--
-- Name: COLUMN nauthorinfo.author_creat_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorinfo.author_creat_de IS '권한CREAT일자';


--
-- Name: nauthorrolerelate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nauthorrolerelate (
    author_code character varying(30) NOT NULL,
    role_code character varying(50) NOT NULL,
    creat_dt timestamp without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nauthorrolerelate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nauthorrolerelate IS 'NAUTHORROLERELATE';


--
-- Name: COLUMN nauthorrolerelate.author_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorrolerelate.author_code IS '권한코드';


--
-- Name: COLUMN nauthorrolerelate.role_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorrolerelate.role_code IS '역할코드';


--
-- Name: COLUMN nauthorrolerelate.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nauthorrolerelate.creat_dt IS 'CREAT일시';


--
-- Name: nbackupschduldfk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbackupschduldfk (
    backup_opert_id character varying(20) NOT NULL,
    execut_schdul_dfk_se character(1) NOT NULL
);


--
-- Name: TABLE nbackupschduldfk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbackupschduldfk IS 'NBACKUPSCHDULDFK';


--
-- Name: COLUMN nbackupschduldfk.backup_opert_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbackupschduldfk.backup_opert_id IS 'BACKUPOPERT아이디';


--
-- Name: COLUMN nbackupschduldfk.execut_schdul_dfk_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbackupschduldfk.execut_schdul_dfk_se IS 'EXECUTSCHDULDFK구분';


--
-- Name: nbanner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbanner (
    banner_id character varying(20) NOT NULL,
    banner_nm character varying(100) NOT NULL,
    link_url character varying(255) NOT NULL,
    banner_image character varying(100) NOT NULL,
    banner_dc character varying(1000),
    reflct_at character varying(1) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    banner_image_file character varying(20),
    sort_ordr integer
);


--
-- Name: TABLE nbanner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbanner IS 'NBANNER';


--
-- Name: COLUMN nbanner.banner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.banner_id IS 'BANNER아이디';


--
-- Name: COLUMN nbanner.banner_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.banner_nm IS 'BANNER명';


--
-- Name: COLUMN nbanner.link_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.link_url IS '연계URL';


--
-- Name: COLUMN nbanner.banner_image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.banner_image IS 'BANNERIMAGE';


--
-- Name: COLUMN nbanner.banner_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.banner_dc IS 'BANNER설명';


--
-- Name: COLUMN nbanner.reflct_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.reflct_at IS '반영여부';


--
-- Name: COLUMN nbanner.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nbanner.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nbanner.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nbanner.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nbanner.banner_image_file; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.banner_image_file IS 'BANNERIMAGE파일';


--
-- Name: COLUMN nbanner.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbanner.sort_ordr IS '정렬순서';


--
-- Name: nbbs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbbs (
    ntt_id numeric(20,0) NOT NULL,
    bbs_id character varying(255) NOT NULL,
    ntt_no bigint,
    ntt_sj character varying(2000),
    ntt_cn text,
    answer_at character varying(1),
    parntsctt_no bigint,
    answer_lc integer,
    sort_ordr bigint,
    rdcnt integer,
    use_at character varying(1) NOT NULL,
    ntce_bgnde character varying(20),
    ntce_endde character varying(20),
    ntcr_id character varying(20),
    ntcr_nm character varying(20),
    password character varying(200),
    atch_file_id character varying(20),
    notice_at character varying(1),
    sj_bold_at character varying(1),
    secret_at character varying(1),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    blog_id character varying(20),
    comment_co integer DEFAULT 0,
    file_co integer DEFAULT 0,
    event_date timestamp without time zone,
    qna_status character varying(10) DEFAULT 'OPEN'::character varying,
    qna_category character varying(50)
);


--
-- Name: TABLE nbbs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbbs IS 'NBBS';


--
-- Name: COLUMN nbbs.ntt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntt_id IS 'NTT아이디';


--
-- Name: COLUMN nbbs.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nbbs.ntt_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntt_no IS 'NTT번호';


--
-- Name: COLUMN nbbs.ntt_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntt_sj IS 'NTT제목';


--
-- Name: COLUMN nbbs.ntt_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntt_cn IS '게시물 내용 (제한 없음)';


--
-- Name: COLUMN nbbs.answer_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.answer_at IS 'ANSWER여부';


--
-- Name: COLUMN nbbs.parntsctt_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.parntsctt_no IS 'PARNTSCTT번호';


--
-- Name: COLUMN nbbs.answer_lc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.answer_lc IS 'ANSWER위치';


--
-- Name: COLUMN nbbs.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.sort_ordr IS '정렬순서';


--
-- Name: COLUMN nbbs.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.rdcnt IS 'RDCNT';


--
-- Name: COLUMN nbbs.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.use_at IS '사용여부';


--
-- Name: COLUMN nbbs.ntce_bgnde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntce_bgnde IS '공지시작일';


--
-- Name: COLUMN nbbs.ntce_endde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntce_endde IS '공지종료일';


--
-- Name: COLUMN nbbs.ntcr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntcr_id IS 'NTCR아이디';


--
-- Name: COLUMN nbbs.ntcr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.ntcr_nm IS 'NTCR명';


--
-- Name: COLUMN nbbs.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.password IS '비밀번호';


--
-- Name: COLUMN nbbs.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN nbbs.notice_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.notice_at IS 'NOTICE여부';


--
-- Name: COLUMN nbbs.sj_bold_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.sj_bold_at IS '제목BOLD여부';


--
-- Name: COLUMN nbbs.secret_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.secret_at IS 'SECRET여부';


--
-- Name: COLUMN nbbs.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nbbs.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nbbs.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nbbs.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nbbs.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.blog_id IS '블로그아이디';


--
-- Name: COLUMN nbbs.comment_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.comment_co IS '댓글 수';


--
-- Name: COLUMN nbbs.file_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.file_co IS '첨부파일 수';


--
-- Name: COLUMN nbbs.event_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.event_date IS '이벤트/일정 날짜 (캘린더 템플릿용)';


--
-- Name: COLUMN nbbs.qna_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.qna_status IS '질문 해결 상태 (OPEN, SOLVED) (Q&A 템플릿용)';


--
-- Name: COLUMN nbbs.qna_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbs.qna_category IS '질문 카테고리 (Q&A 템플릿용)';


--
-- Name: nbbsmaster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbbsmaster (
    bbs_id character varying(20) NOT NULL,
    bbs_nm character varying(765) NOT NULL,
    bbs_intrcn character varying(7200),
    bbs_ty_code character varying(6) NOT NULL,
    reply_posbl_at character varying(1),
    file_atch_posbl_at character varying(1) NOT NULL,
    atch_posbl_file_number integer NOT NULL,
    atch_posbl_file_size bigint,
    use_at character varying(1) NOT NULL,
    tmplat_id character varying(20),
    cmmnty_id character varying(20),
    frst_register_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    blog_id character varying(20),
    blog_at character varying(1),
    bbs_attrb_code character varying(6)
);


--
-- Name: TABLE nbbsmaster; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbbsmaster IS 'NBBSMASTER';


--
-- Name: COLUMN nbbsmaster.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nbbsmaster.bbs_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.bbs_nm IS '게시판명';


--
-- Name: COLUMN nbbsmaster.bbs_intrcn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.bbs_intrcn IS '게시판도입내용';


--
-- Name: COLUMN nbbsmaster.bbs_ty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.bbs_ty_code IS '게시판유형코드';


--
-- Name: COLUMN nbbsmaster.reply_posbl_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.reply_posbl_at IS 'REPLYPOS선하증권여부';


--
-- Name: COLUMN nbbsmaster.file_atch_posbl_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.file_atch_posbl_at IS '파일첨부POS선하증권여부';


--
-- Name: COLUMN nbbsmaster.atch_posbl_file_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.atch_posbl_file_number IS '첨부POS선하증권파일NUMBER';


--
-- Name: COLUMN nbbsmaster.atch_posbl_file_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.atch_posbl_file_size IS '첨부POS선하증권파일SIZE';


--
-- Name: COLUMN nbbsmaster.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.use_at IS '사용여부';


--
-- Name: COLUMN nbbsmaster.tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.tmplat_id IS '템플릿아이디';


--
-- Name: COLUMN nbbsmaster.cmmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.cmmnty_id IS '커뮤니티아이디';


--
-- Name: COLUMN nbbsmaster.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nbbsmaster.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nbbsmaster.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nbbsmaster.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nbbsmaster.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.blog_id IS '블로그아이디';


--
-- Name: COLUMN nbbsmaster.blog_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmaster.blog_at IS '블로그여부';


--
-- Name: nbbsmasteroptn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbbsmasteroptn (
    bbs_id character varying(20) NOT NULL,
    answer_at character varying(1) NOT NULL,
    stsfdg_at character varying(1) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(20) NOT NULL,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nbbsmasteroptn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbbsmasteroptn IS 'NBBSMASTEROPTN';


--
-- Name: COLUMN nbbsmasteroptn.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmasteroptn.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nbbsmasteroptn.answer_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmasteroptn.answer_at IS 'ANSWER여부';


--
-- Name: COLUMN nbbsmasteroptn.stsfdg_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmasteroptn.stsfdg_at IS 'STSFDG여부';


--
-- Name: COLUMN nbbsmasteroptn.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmasteroptn.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nbbsmasteroptn.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmasteroptn.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nbbsmasteroptn.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmasteroptn.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nbbsmasteroptn.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsmasteroptn.last_updusr_id IS '최종수정자아이디';


--
-- Name: nbbsuse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbbsuse (
    bbs_id character varying(20) NOT NULL,
    trget_id character varying(20) NOT NULL,
    use_at character varying(1) NOT NULL,
    regist_se_code character varying(6),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nbbsuse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbbsuse IS 'NBBSUSE';


--
-- Name: COLUMN nbbsuse.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nbbsuse.trget_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.trget_id IS 'TRGET아이디';


--
-- Name: COLUMN nbbsuse.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.use_at IS '사용여부';


--
-- Name: COLUMN nbbsuse.regist_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.regist_se_code IS '등록구분코드';


--
-- Name: COLUMN nbbsuse.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nbbsuse.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nbbsuse.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nbbsuse.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbbsuse.last_updusr_id IS '최종수정자아이디';


--
-- Name: nbkmkmenumanageresult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbkmkmenumanageresult (
    menu_id bigint NOT NULL,
    emplyr_id character varying(20) NOT NULL,
    menu_nm character varying(60) NOT NULL,
    progrm_stre_path character varying(100) NOT NULL,
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nbkmkmenumanageresult; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbkmkmenumanageresult IS 'NBKMKMENUMANAGERESULT';


--
-- Name: COLUMN nbkmkmenumanageresult.menu_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbkmkmenumanageresult.menu_id IS '메뉴아이디';


--
-- Name: COLUMN nbkmkmenumanageresult.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbkmkmenumanageresult.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN nbkmkmenumanageresult.menu_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbkmkmenumanageresult.menu_nm IS '메뉴명';


--
-- Name: COLUMN nbkmkmenumanageresult.progrm_stre_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbkmkmenumanageresult.progrm_stre_path IS '프로그램저장경로';


--
-- Name: nblog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nblog (
    blog_id character varying(20) NOT NULL,
    blog_nm character varying(255) NOT NULL,
    blog_intrcn character varying(2400),
    use_at character varying(1) NOT NULL,
    regist_se_code character varying(6),
    tmplat_id character varying(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    bbs_id character varying(20) DEFAULT NULL::bpchar,
    blog_at character varying(1) DEFAULT NULL::bpchar
);


--
-- Name: TABLE nblog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nblog IS 'NBLOG';


--
-- Name: COLUMN nblog.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.blog_id IS '블로그아이디';


--
-- Name: COLUMN nblog.blog_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.blog_nm IS '블로그명';


--
-- Name: COLUMN nblog.blog_intrcn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.blog_intrcn IS '블로그도입내용';


--
-- Name: COLUMN nblog.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.use_at IS '사용여부';


--
-- Name: COLUMN nblog.regist_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.regist_se_code IS '등록구분코드';


--
-- Name: COLUMN nblog.tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.tmplat_id IS '템플릿아이디';


--
-- Name: COLUMN nblog.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nblog.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nblog.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nblog.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nblog.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nblog.blog_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nblog.blog_at IS '블로그여부';


--
-- Name: nbloguser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbloguser (
    blog_id character varying(20) NOT NULL,
    emplyr_id character varying(20) NOT NULL,
    mngr_at character varying(1) NOT NULL,
    mber_sttus character varying(1),
    sbscrb_de timestamp without time zone,
    secsn_de character(20),
    use_at character varying(1),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nbloguser; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nbloguser IS 'NBLOGUSER';


--
-- Name: COLUMN nbloguser.blog_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.blog_id IS '블로그아이디';


--
-- Name: COLUMN nbloguser.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN nbloguser.mngr_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.mngr_at IS '관리자여부';


--
-- Name: COLUMN nbloguser.mber_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.mber_sttus IS '회원상태';


--
-- Name: COLUMN nbloguser.sbscrb_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.sbscrb_de IS 'SBSCRB일자';


--
-- Name: COLUMN nbloguser.secsn_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.secsn_de IS 'SECSN일자';


--
-- Name: COLUMN nbloguser.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.use_at IS '사용여부';


--
-- Name: COLUMN nbloguser.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nbloguser.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nbloguser.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nbloguser.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nbloguser.last_updusr_id IS '최종수정자아이디';


--
-- Name: ncalrestde; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncalrestde (
    restde_no integer NOT NULL,
    frst_regist_pnttm timestamp(6) without time zone,
    last_updt_pnttm timestamp(6) without time zone,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    restde_dc character varying(200),
    restde_de character varying(8),
    restde_nm character varying(60),
    restde_se_code character varying(1)
);


--
-- Name: ncalrestde_restde_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ncalrestde ALTER COLUMN restde_no ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.ncalrestde_restde_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: nclub; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nclub (
    clb_id character(20) NOT NULL,
    cmmnty_id character(20) NOT NULL,
    clb_nm character varying(255) NOT NULL,
    clb_intrcn character varying(2400),
    use_at character(1) NOT NULL,
    regist_se_code character(6),
    tmplat_id character(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nclub; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nclub IS 'NCLUB';


--
-- Name: COLUMN nclub.clb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.clb_id IS 'CLB아이디';


--
-- Name: COLUMN nclub.cmmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.cmmnty_id IS '커뮤니티아이디';


--
-- Name: COLUMN nclub.clb_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.clb_nm IS 'CLB명';


--
-- Name: COLUMN nclub.clb_intrcn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.clb_intrcn IS 'CLB도입내용';


--
-- Name: COLUMN nclub.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.use_at IS '사용여부';


--
-- Name: COLUMN nclub.regist_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.regist_se_code IS '등록구분코드';


--
-- Name: COLUMN nclub.tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.tmplat_id IS '템플릿아이디';


--
-- Name: COLUMN nclub.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nclub.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nclub.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nclub.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclub.last_updusr_id IS '최종수정자아이디';


--
-- Name: nclubuser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nclubuser (
    clb_id character(20) NOT NULL,
    cmmnty_id character(20) NOT NULL,
    oprtr_at character(1) NOT NULL,
    sbscrb_de timestamp without time zone,
    secsn_de character(20),
    use_at character(1) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    emplyr_id character varying(20) NOT NULL
);


--
-- Name: TABLE nclubuser; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nclubuser IS 'NCLUBUSER';


--
-- Name: COLUMN nclubuser.clb_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.clb_id IS 'CLB아이디';


--
-- Name: COLUMN nclubuser.cmmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.cmmnty_id IS '커뮤니티아이디';


--
-- Name: COLUMN nclubuser.oprtr_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.oprtr_at IS '작업자여부';


--
-- Name: COLUMN nclubuser.sbscrb_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.sbscrb_de IS 'SBSCRB일자';


--
-- Name: COLUMN nclubuser.secsn_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.secsn_de IS 'SECSN일자';


--
-- Name: COLUMN nclubuser.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.use_at IS '사용여부';


--
-- Name: COLUMN nclubuser.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nclubuser.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nclubuser.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nclubuser.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nclubuser.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nclubuser.emplyr_id IS '사용자아이디';


--
-- Name: ncmmnty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncmmnty (
    cmmnty_id character varying(20) NOT NULL,
    cmmnty_nm character varying(255) NOT NULL,
    cmmnty_intrcn character varying(2400),
    use_at character varying(1) NOT NULL,
    regist_se_code character varying(6),
    tmplat_id character varying(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE ncmmnty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncmmnty IS 'NCMMNTY';


--
-- Name: COLUMN ncmmnty.cmmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.cmmnty_id IS '커뮤니티아이디';


--
-- Name: COLUMN ncmmnty.cmmnty_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.cmmnty_nm IS '커뮤니티명';


--
-- Name: COLUMN ncmmnty.cmmnty_intrcn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.cmmnty_intrcn IS '커뮤니티도입내용';


--
-- Name: COLUMN ncmmnty.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.use_at IS '사용여부';


--
-- Name: COLUMN ncmmnty.regist_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.regist_se_code IS '등록구분코드';


--
-- Name: COLUMN ncmmnty.tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.tmplat_id IS '템플릿아이디';


--
-- Name: COLUMN ncmmnty.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ncmmnty.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ncmmnty.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ncmmnty.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmnty.last_updusr_id IS '최종수정자아이디';


--
-- Name: ncmmntyuser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncmmntyuser (
    cmmnty_id character varying(20) NOT NULL,
    emplyr_id character varying(20) NOT NULL,
    mngr_at character varying(1) NOT NULL,
    mber_sttus character varying(15),
    sbscrb_de timestamp without time zone,
    secsn_de character(20),
    use_at character varying(1),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE ncmmntyuser; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncmmntyuser IS 'NCMMNTYUSER';


--
-- Name: COLUMN ncmmntyuser.cmmnty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.cmmnty_id IS '커뮤니티아이디';


--
-- Name: COLUMN ncmmntyuser.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN ncmmntyuser.mngr_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.mngr_at IS '관리자여부';


--
-- Name: COLUMN ncmmntyuser.mber_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.mber_sttus IS '회원상태';


--
-- Name: COLUMN ncmmntyuser.sbscrb_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.sbscrb_de IS 'SBSCRB일자';


--
-- Name: COLUMN ncmmntyuser.secsn_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.secsn_de IS 'SECSN일자';


--
-- Name: COLUMN ncmmntyuser.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.use_at IS '사용여부';


--
-- Name: COLUMN ncmmntyuser.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ncmmntyuser.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ncmmntyuser.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ncmmntyuser.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncmmntyuser.last_updusr_id IS '최종수정자아이디';


--
-- Name: ncnsltlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncnsltlist (
    cnslt_id character varying(20) NOT NULL,
    cnslt_sj character varying(255),
    othbc_at character varying(1),
    email_adres character varying(50),
    cnslt_cn character varying(2500),
    managt_cn character varying(2500),
    managt_de character varying(20),
    rdcnt integer,
    atch_file_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    area_no character varying(4),
    middle_telno character varying(4),
    end_telno character varying(4),
    frst_mbtlnum character varying(4),
    middle_mbtlnum character varying(4),
    end_mbtlnum character varying(4),
    writng_de character varying(20),
    wrter_nm character varying(20),
    email_answer_at character varying(1),
    qna_process_sttus_code character varying(3),
    writng_password character varying(20)
);


--
-- Name: TABLE ncnsltlist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncnsltlist IS 'NCNSLTLIST';


--
-- Name: COLUMN ncnsltlist.cnslt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.cnslt_id IS '컨설팅아이디';


--
-- Name: COLUMN ncnsltlist.cnslt_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.cnslt_sj IS '컨설팅제목';


--
-- Name: COLUMN ncnsltlist.othbc_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.othbc_at IS 'OTHBC여부';


--
-- Name: COLUMN ncnsltlist.email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.email_adres IS '이메일주소';


--
-- Name: COLUMN ncnsltlist.cnslt_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.cnslt_cn IS '컨설팅내용';


--
-- Name: COLUMN ncnsltlist.managt_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.managt_cn IS 'MANAGT내용';


--
-- Name: COLUMN ncnsltlist.managt_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.managt_de IS 'MANAGT일자';


--
-- Name: COLUMN ncnsltlist.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.rdcnt IS 'RDCNT';


--
-- Name: COLUMN ncnsltlist.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN ncnsltlist.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ncnsltlist.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ncnsltlist.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ncnsltlist.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ncnsltlist.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.area_no IS '지역번호';


--
-- Name: COLUMN ncnsltlist.middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.middle_telno IS 'MIDDLE전화번호';


--
-- Name: COLUMN ncnsltlist.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.end_telno IS '종료전화번호';


--
-- Name: COLUMN ncnsltlist.frst_mbtlnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.frst_mbtlnum IS '최초휴대폰번호';


--
-- Name: COLUMN ncnsltlist.middle_mbtlnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.middle_mbtlnum IS 'MIDDLE휴대폰번호';


--
-- Name: COLUMN ncnsltlist.end_mbtlnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.end_mbtlnum IS '종료휴대폰번호';


--
-- Name: COLUMN ncnsltlist.writng_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.writng_de IS 'WRITNG일자';


--
-- Name: COLUMN ncnsltlist.wrter_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.wrter_nm IS 'WRTER명';


--
-- Name: COLUMN ncnsltlist.email_answer_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.email_answer_at IS '이메일ANSWER여부';


--
-- Name: COLUMN ncnsltlist.qna_process_sttus_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.qna_process_sttus_code IS '질의응답PROCESS상태코드';


--
-- Name: COLUMN ncnsltlist.writng_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncnsltlist.writng_password IS 'WRITNG비밀번호';


--
-- Name: ncnsltmanage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncnsltmanage (
    cnslt_id character varying(20) NOT NULL,
    cnslt_sj character varying(255) NOT NULL,
    cnslt_cn text,
    othbc_at character(1),
    writng_de character varying(20),
    wrter_id character varying(20) NOT NULL,
    wrter_nm character varying(20),
    managt_cn text,
    managt_de character varying(20),
    qna_process_sttus_code character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: ncntcmessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncntcmessage (
    cntc_mssage_id character varying(20) NOT NULL,
    cntc_mssage_nm character varying(100),
    upper_cntc_mssage_id character varying(20),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    use_at character(1)
);


--
-- Name: TABLE ncntcmessage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncntcmessage IS 'NCNTCMESSAGE';


--
-- Name: COLUMN ncntcmessage.cntc_mssage_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.cntc_mssage_id IS '접촉MSSAGE아이디';


--
-- Name: COLUMN ncntcmessage.cntc_mssage_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.cntc_mssage_nm IS '접촉MSSAGE명';


--
-- Name: COLUMN ncntcmessage.upper_cntc_mssage_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.upper_cntc_mssage_id IS 'UPPER접촉MSSAGE아이디';


--
-- Name: COLUMN ncntcmessage.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ncntcmessage.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ncntcmessage.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ncntcmessage.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ncntcmessage.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessage.use_at IS '사용여부';


--
-- Name: ncntcmessageitem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncntcmessageitem (
    cntc_mssage_id character varying(20) NOT NULL,
    iem_id character varying(20) NOT NULL,
    iem_nm character varying(100),
    iem_ty character varying(50),
    iem_lt numeric(8,0),
    use_at character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ncntcmessageitem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncntcmessageitem IS 'NCNTCMESSAGEITEM';


--
-- Name: COLUMN ncntcmessageitem.cntc_mssage_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.cntc_mssage_id IS '접촉MSSAGE아이디';


--
-- Name: COLUMN ncntcmessageitem.iem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.iem_id IS 'IEM아이디';


--
-- Name: COLUMN ncntcmessageitem.iem_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.iem_nm IS 'IEM명';


--
-- Name: COLUMN ncntcmessageitem.iem_ty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.iem_ty IS 'IEM유형';


--
-- Name: COLUMN ncntcmessageitem.iem_lt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.iem_lt IS 'IEM로트';


--
-- Name: COLUMN ncntcmessageitem.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.use_at IS '사용여부';


--
-- Name: COLUMN ncntcmessageitem.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ncntcmessageitem.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ncntcmessageitem.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ncntcmessageitem.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcmessageitem.last_updt_pnttm IS '최종수정시점';


--
-- Name: ncntcservice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncntcservice (
    instt_id character varying(20) NOT NULL,
    sys_id character varying(20) NOT NULL,
    svc_id character varying(20) NOT NULL,
    svc_nm character varying(255),
    requst_mssage_id character varying(20),
    rspns_mssage_id character varying(20),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    use_at character(1)
);


--
-- Name: TABLE ncntcservice; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncntcservice IS 'NCNTCSERVICE';


--
-- Name: COLUMN ncntcservice.instt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.instt_id IS 'INSTT아이디';


--
-- Name: COLUMN ncntcservice.sys_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.sys_id IS '시스템아이디';


--
-- Name: COLUMN ncntcservice.svc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.svc_id IS '봉사아이디';


--
-- Name: COLUMN ncntcservice.svc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.svc_nm IS '봉사명';


--
-- Name: COLUMN ncntcservice.requst_mssage_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.requst_mssage_id IS 'REQUSTMSSAGE아이디';


--
-- Name: COLUMN ncntcservice.rspns_mssage_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.rspns_mssage_id IS '응답MSSAGE아이디';


--
-- Name: COLUMN ncntcservice.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ncntcservice.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ncntcservice.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ncntcservice.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ncntcservice.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntcservice.use_at IS '사용여부';


--
-- Name: ncntntslist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncntntslist (
    cntnts_id character varying(20) NOT NULL,
    emplyr_id character varying(20) NOT NULL
);


--
-- Name: TABLE ncntntslist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncntntslist IS 'NCNTNTSLIST';


--
-- Name: COLUMN ncntntslist.cntnts_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntntslist.cntnts_id IS 'CNTNTS아이디';


--
-- Name: COLUMN ncntntslist.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncntntslist.emplyr_id IS '사용자아이디';


--
-- Name: ncomment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncomment (
    ntt_id bigint NOT NULL,
    bbs_id character varying(20) NOT NULL,
    answer_no bigint NOT NULL,
    wrter_id character varying(20),
    wrter_nm character varying(20),
    answer text,
    use_at character varying(1) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    password character varying(200)
);


--
-- Name: TABLE ncomment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ncomment IS 'NCOMMENT';


--
-- Name: COLUMN ncomment.ntt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.ntt_id IS 'NTT아이디';


--
-- Name: COLUMN ncomment.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.bbs_id IS '게시판아이디';


--
-- Name: COLUMN ncomment.answer_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.answer_no IS 'ANSWER번호';


--
-- Name: COLUMN ncomment.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.wrter_id IS 'WRTER아이디';


--
-- Name: COLUMN ncomment.wrter_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.wrter_nm IS 'WRTER명';


--
-- Name: COLUMN ncomment.answer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.answer IS '댓글 내용 (용량 확장)';


--
-- Name: COLUMN ncomment.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.use_at IS '사용여부';


--
-- Name: COLUMN ncomment.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ncomment.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ncomment.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ncomment.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ncomment.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ncomment.password IS '비밀번호';


--
-- Name: ndeptjob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ndeptjob (
    dept_job_id character varying(20) NOT NULL,
    dept_jobbx_id character varying(20) NOT NULL,
    dept_job_nm character varying(255) NOT NULL,
    dept_job_cn character varying(2500) NOT NULL,
    atch_file_id character varying(20),
    charger_id character varying(20) NOT NULL,
    priort character varying(1) NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ndeptjob; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ndeptjob IS 'NDEPTJOB';


--
-- Name: COLUMN ndeptjob.dept_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.dept_job_id IS '부서작업아이디';


--
-- Name: COLUMN ndeptjob.dept_jobbx_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.dept_jobbx_id IS '부서JOBBX아이디';


--
-- Name: COLUMN ndeptjob.dept_job_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.dept_job_nm IS '부서작업명';


--
-- Name: COLUMN ndeptjob.dept_job_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.dept_job_cn IS '부서작업내용';


--
-- Name: COLUMN ndeptjob.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN ndeptjob.charger_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.charger_id IS 'CHARGER아이디';


--
-- Name: COLUMN ndeptjob.priort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.priort IS 'PRIORT';


--
-- Name: COLUMN ndeptjob.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ndeptjob.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ndeptjob.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ndeptjob.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjob.last_updt_pnttm IS '최종수정시점';


--
-- Name: ndeptjobbx; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ndeptjobbx (
    dept_jobbx_id character varying(20) NOT NULL,
    dept_jobbx_nm character varying(100) NOT NULL,
    dept_id character varying(20) NOT NULL,
    indict_ordr integer,
    frst_register_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ndeptjobbx; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ndeptjobbx IS 'NDEPTJOBBX';


--
-- Name: COLUMN ndeptjobbx.dept_jobbx_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.dept_jobbx_id IS '부서JOBBX아이디';


--
-- Name: COLUMN ndeptjobbx.dept_jobbx_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.dept_jobbx_nm IS '부서JOBBX명';


--
-- Name: COLUMN ndeptjobbx.dept_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.dept_id IS '부서아이디';


--
-- Name: COLUMN ndeptjobbx.indict_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.indict_ordr IS 'INDICT순서';


--
-- Name: COLUMN ndeptjobbx.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ndeptjobbx.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ndeptjobbx.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ndeptjobbx.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndeptjobbx.last_updt_pnttm IS '최종수정시점';


--
-- Name: ndiaryinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ndiaryinfo (
    schdul_id character varying(20) NOT NULL,
    diary_id character varying(20) NOT NULL,
    diary_progrsrt integer,
    diary_nm character varying(255),
    drct_matter character varying(2500),
    partclr_matter character varying(2500),
    atch_file_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE ndiaryinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ndiaryinfo IS 'NDIARYINFO';


--
-- Name: COLUMN ndiaryinfo.schdul_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.schdul_id IS 'SCHDUL아이디';


--
-- Name: COLUMN ndiaryinfo.diary_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.diary_id IS 'DI배열아이디';


--
-- Name: COLUMN ndiaryinfo.diary_progrsrt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.diary_progrsrt IS 'DI배열PROGRSRT';


--
-- Name: COLUMN ndiaryinfo.diary_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.diary_nm IS 'DI배열명';


--
-- Name: COLUMN ndiaryinfo.drct_matter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.drct_matter IS '직접MATTER';


--
-- Name: COLUMN ndiaryinfo.partclr_matter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.partclr_matter IS '부분접수자MATTER';


--
-- Name: COLUMN ndiaryinfo.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN ndiaryinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ndiaryinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ndiaryinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN ndiaryinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndiaryinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: ndtausestats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ndtausestats (
    dta_use_stats_id character varying(20) NOT NULL,
    bbs_id character varying(20) NOT NULL,
    ntt_id bigint NOT NULL,
    atch_file_id character varying(20) NOT NULL,
    file_sn integer NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ndtausestats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ndtausestats IS 'NDTAUSESTATS';


--
-- Name: COLUMN ndtausestats.dta_use_stats_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.dta_use_stats_id IS 'DTA사용통계아이디';


--
-- Name: COLUMN ndtausestats.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.bbs_id IS '게시판아이디';


--
-- Name: COLUMN ndtausestats.ntt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.ntt_id IS 'NTT아이디';


--
-- Name: COLUMN ndtausestats.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN ndtausestats.file_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.file_sn IS '파일일련번호';


--
-- Name: COLUMN ndtausestats.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ndtausestats.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ndtausestats.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ndtausestats.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ndtausestats.last_updt_pnttm IS '최종수정시점';


--
-- Name: nemplyrinfo_aud; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nemplyrinfo_aud (
    emplyr_id character varying(60) NOT NULL,
    rev integer NOT NULL,
    revtype smallint,
    orgnzt_id character(20),
    user_nm character varying(180),
    password character varying(600),
    empl_no character varying(60),
    ihidnum character varying(600),
    sexdstn_code character(1),
    brthdy character(60),
    fxnum character varying(60),
    house_adres character varying(300),
    password_hint character varying(300),
    password_cnsr character varying(300),
    house_end_telno character varying(12),
    area_no character varying(12),
    detail_adres character varying(300),
    zip character varying(18),
    offm_telno character varying(60),
    mbtlnum character varying(60),
    email_adres character varying(150),
    ofcps_nm character varying(180),
    house_middle_telno character varying(12),
    group_id character(20),
    pstinst_code character(24),
    emplyr_sttus_code character varying(15),
    esntl_id character(60),
    crtfc_dn_value character varying(300),
    sbscrb_de timestamp without time zone,
    lock_at character(1),
    lock_cnt numeric(3,0),
    lock_last_pnttm timestamp without time zone,
    chg_pwd_last_pnttm timestamp without time zone,
    chg_pwd_cnt integer,
    role character varying(180)
);


--
-- Name: nemplyrscrtyestbs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nemplyrscrtyestbs (
    scrty_dtrmn_trget_id character varying(20) NOT NULL,
    mber_ty_code character(5),
    author_code character varying(30) NOT NULL,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nemplyrscrtyestbs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nemplyrscrtyestbs IS 'NEMPLYRSCRTYESTBS';


--
-- Name: COLUMN nemplyrscrtyestbs.scrty_dtrmn_trget_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrscrtyestbs.scrty_dtrmn_trget_id IS '보안일시잔존TRGET아이디';


--
-- Name: COLUMN nemplyrscrtyestbs.mber_ty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrscrtyestbs.mber_ty_code IS '회원유형코드';


--
-- Name: COLUMN nemplyrscrtyestbs.author_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nemplyrscrtyestbs.author_code IS '권한코드';


--
-- Name: neventinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.neventinfo (
    event_id character(20) NOT NULL,
    bsns_year character(4),
    bsns_code character varying(2),
    event_cn character varying(1000),
    event_svc_bgnde character(20),
    svc_use_nmpr_co numeric(10,0),
    charger_nm character varying(50),
    prparetg_cn character varying(2500),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    event_svc_endde character(20),
    event_ty_code character(1),
    event_confm_at character(1),
    event_confm_de character(20)
);


--
-- Name: TABLE neventinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.neventinfo IS '행사정보';


--
-- Name: nextrlhrinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nextrlhrinfo (
    event_id character(20) NOT NULL,
    extrl_hr_id character(20) NOT NULL,
    sexdstn_code character(1),
    extrl_hr_nm character varying(60),
    occp_ty_code character(1),
    psitn_instt_nm character varying(100),
    brthdy character(20),
    area_no character varying(4),
    middle_telno character varying(4),
    end_telno character varying(4),
    email_adres character varying(50),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nextrlhrinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nextrlhrinfo IS '외부인사정보';


--
-- Name: nfaqinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nfaqinfo (
    faq_id character(20) NOT NULL,
    qestn_sj character varying(255),
    qestn_cn character varying(2500),
    answer_cn character varying(2500),
    rdcnt numeric(10,0),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20) NOT NULL,
    atch_file_id character(20),
    qna_process_sttus_code character(1)
);


--
-- Name: TABLE nfaqinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nfaqinfo IS 'NFAQINFO';


--
-- Name: COLUMN nfaqinfo.faq_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.faq_id IS 'FAQ아이디';


--
-- Name: COLUMN nfaqinfo.qestn_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.qestn_sj IS 'QESTN제목';


--
-- Name: COLUMN nfaqinfo.qestn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.qestn_cn IS 'QESTN내용';


--
-- Name: COLUMN nfaqinfo.answer_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.answer_cn IS 'ANSWER내용';


--
-- Name: COLUMN nfaqinfo.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.rdcnt IS 'RDCNT';


--
-- Name: COLUMN nfaqinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nfaqinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nfaqinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nfaqinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nfaqinfo.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN nfaqinfo.qna_process_sttus_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfaqinfo.qna_process_sttus_code IS '질의응답PROCESS상태코드';


--
-- Name: nfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nfile (
    atch_file_id character(20) NOT NULL,
    creat_dt timestamp without time zone NOT NULL,
    use_at character(1)
);


--
-- Name: TABLE nfile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nfile IS 'NFILE';


--
-- Name: COLUMN nfile.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfile.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN nfile.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfile.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN nfile.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfile.use_at IS '사용여부';


--
-- Name: nfiledetail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nfiledetail (
    atch_file_id character(20) NOT NULL,
    file_sn numeric(10,0) NOT NULL,
    file_stre_cours character varying(2000) NOT NULL,
    stre_file_nm character varying(255) NOT NULL,
    orignl_file_nm character varying(255),
    file_extsn character varying(20) NOT NULL,
    file_cn text,
    file_size numeric(8,0)
);


--
-- Name: TABLE nfiledetail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nfiledetail IS 'NFILEDETAIL';


--
-- Name: COLUMN nfiledetail.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN nfiledetail.file_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.file_sn IS '파일일련번호';


--
-- Name: COLUMN nfiledetail.file_stre_cours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.file_stre_cours IS '파일저장COURS';


--
-- Name: COLUMN nfiledetail.stre_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.stre_file_nm IS '저장파일명';


--
-- Name: COLUMN nfiledetail.orignl_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.orignl_file_nm IS 'ORIGNL파일명';


--
-- Name: COLUMN nfiledetail.file_extsn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.file_extsn IS '파일내선일련번호';


--
-- Name: COLUMN nfiledetail.file_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.file_cn IS '파일내용';


--
-- Name: COLUMN nfiledetail.file_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfiledetail.file_size IS '파일SIZE';


--
-- Name: nfilesysmntrngloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nfilesysmntrngloginfo (
    file_sys_id character(20) NOT NULL,
    file_sys_nm character varying(60) NOT NULL,
    file_sys_manage_nm character varying(255) NOT NULL,
    file_sys_size numeric(8,0) NOT NULL,
    file_sys_thrhld numeric(8,0) NOT NULL,
    file_sys_usgqty numeric(8,0),
    mntrng_sttus character(2),
    log_info character varying(2000),
    creat_dt timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    log_id character(20) NOT NULL
);


--
-- Name: TABLE nfilesysmntrngloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nfilesysmntrngloginfo IS 'NFILESYSMNTRNGLOGINFO';


--
-- Name: COLUMN nfilesysmntrngloginfo.file_sys_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.file_sys_id IS '파일시스템아이디';


--
-- Name: COLUMN nfilesysmntrngloginfo.file_sys_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.file_sys_nm IS '파일시스템명';


--
-- Name: COLUMN nfilesysmntrngloginfo.file_sys_manage_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.file_sys_manage_nm IS '파일시스템MANAGE명';


--
-- Name: COLUMN nfilesysmntrngloginfo.file_sys_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.file_sys_size IS '파일시스템SIZE';


--
-- Name: COLUMN nfilesysmntrngloginfo.file_sys_thrhld; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.file_sys_thrhld IS '파일시스템THRHLD';


--
-- Name: COLUMN nfilesysmntrngloginfo.file_sys_usgqty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.file_sys_usgqty IS '파일시스템용도수량';


--
-- Name: COLUMN nfilesysmntrngloginfo.mntrng_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.mntrng_sttus IS 'MNTRNG상태';


--
-- Name: COLUMN nfilesysmntrngloginfo.log_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.log_info IS '로그정보';


--
-- Name: COLUMN nfilesysmntrngloginfo.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN nfilesysmntrngloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nfilesysmntrngloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nfilesysmntrngloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nfilesysmntrngloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nfilesysmntrngloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfilesysmntrngloginfo.log_id IS '로그아이디';


--
-- Name: nfxtrsmanage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nfxtrsmanage (
    fxtrs_code character(14) NOT NULL,
    fxtrs_nm character varying(100) NOT NULL,
    makr_nm character varying(100),
    price numeric(16,0)
);


--
-- Name: TABLE nfxtrsmanage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nfxtrsmanage IS 'NFXTRSMANAGE';


--
-- Name: COLUMN nfxtrsmanage.fxtrs_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfxtrsmanage.fxtrs_code IS '비품코드';


--
-- Name: COLUMN nfxtrsmanage.fxtrs_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfxtrsmanage.fxtrs_nm IS '비품명';


--
-- Name: COLUMN nfxtrsmanage.makr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfxtrsmanage.makr_nm IS 'MAKR명';


--
-- Name: COLUMN nfxtrsmanage.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nfxtrsmanage.price IS 'PRICE';


--
-- Name: nhpcminfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhpcminfo (
    hpcm_id character(20) NOT NULL,
    hpcm_se_code character(1),
    hpcm_dfn character varying(1000),
    hpcm_dc character varying(2500),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nhpcminfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nhpcminfo IS 'NHPCMINFO';


--
-- Name: COLUMN nhpcminfo.hpcm_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.hpcm_id IS 'HPCM아이디';


--
-- Name: COLUMN nhpcminfo.hpcm_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.hpcm_se_code IS 'HPCM구분코드';


--
-- Name: COLUMN nhpcminfo.hpcm_dfn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.hpcm_dfn IS 'HPCM정의';


--
-- Name: COLUMN nhpcminfo.hpcm_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.hpcm_dc IS 'HPCM설명';


--
-- Name: COLUMN nhpcminfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nhpcminfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nhpcminfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nhpcminfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nhpcminfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: nindvdlinfopolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nindvdlinfopolicy (
    indvdl_info_policy_id character(20) NOT NULL,
    indvdl_info_policy_cn character varying(2500),
    indvdl_info_policy_agre_at character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    indvdl_info_policy_nm character varying(255)
);


--
-- Name: TABLE nindvdlinfopolicy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nindvdlinfopolicy IS 'NINDVDLINFOPOLICY';


--
-- Name: COLUMN nindvdlinfopolicy.indvdl_info_policy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.indvdl_info_policy_id IS 'INDVDL정보POLICY아이디';


--
-- Name: COLUMN nindvdlinfopolicy.indvdl_info_policy_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.indvdl_info_policy_cn IS 'INDVDL정보POLICY내용';


--
-- Name: COLUMN nindvdlinfopolicy.indvdl_info_policy_agre_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.indvdl_info_policy_agre_at IS 'INDVDL정보POLICY동의여부';


--
-- Name: COLUMN nindvdlinfopolicy.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nindvdlinfopolicy.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nindvdlinfopolicy.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nindvdlinfopolicy.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nindvdlinfopolicy.indvdl_info_policy_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlinfopolicy.indvdl_info_policy_nm IS 'INDVDL정보POLICY명';


--
-- Name: nindvdlpgecntnts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nindvdlpgecntnts (
    cntnts_id character varying(20) NOT NULL,
    cntnts_nm character varying(100) NOT NULL,
    cntc_url character varying(255) NOT NULL,
    cntnts_use_at character(1) NOT NULL,
    cntnts_link_url character varying(1000),
    cntnts_dc character varying(250)
);


--
-- Name: TABLE nindvdlpgecntnts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nindvdlpgecntnts IS 'NINDVDLPGECNTNTS';


--
-- Name: COLUMN nindvdlpgecntnts.cntnts_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgecntnts.cntnts_id IS 'CNTNTS아이디';


--
-- Name: COLUMN nindvdlpgecntnts.cntnts_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgecntnts.cntnts_nm IS 'CNTNTS명';


--
-- Name: COLUMN nindvdlpgecntnts.cntc_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgecntnts.cntc_url IS '접촉URL';


--
-- Name: COLUMN nindvdlpgecntnts.cntnts_use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgecntnts.cntnts_use_at IS 'CNTNTS사용여부';


--
-- Name: COLUMN nindvdlpgecntnts.cntnts_link_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgecntnts.cntnts_link_url IS 'CNTNTS연계URL';


--
-- Name: COLUMN nindvdlpgecntnts.cntnts_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgecntnts.cntnts_dc IS 'CNTNTS설명';


--
-- Name: nindvdlpgeestbs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nindvdlpgeestbs (
    emplyr_id character varying(20) NOT NULL,
    upend_image character varying(1024),
    titlebar_color character(7),
    algn_mthd character(1),
    algn_co numeric(10,0)
);


--
-- Name: TABLE nindvdlpgeestbs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nindvdlpgeestbs IS 'NINDVDLPGEESTBS';


--
-- Name: COLUMN nindvdlpgeestbs.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgeestbs.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN nindvdlpgeestbs.upend_image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgeestbs.upend_image IS '상단IMAGE';


--
-- Name: COLUMN nindvdlpgeestbs.titlebar_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgeestbs.titlebar_color IS 'TITLEBARCOLOR';


--
-- Name: COLUMN nindvdlpgeestbs.algn_mthd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgeestbs.algn_mthd IS 'ALGN방법';


--
-- Name: COLUMN nindvdlpgeestbs.algn_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nindvdlpgeestbs.algn_co IS 'ALGN수';


--
-- Name: ninfrmlsanctn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ninfrmlsanctn (
    infrml_sanctn_id character(20) NOT NULL,
    job_se_code character(3) NOT NULL,
    applcnt_id character varying(20) NOT NULL,
    reqst_de character(20) NOT NULL,
    sanctner_id character varying(20) NOT NULL,
    confm_at character(1) NOT NULL,
    sanctn_dt timestamp without time zone,
    return_resn character varying(1000),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ninfrmlsanctn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ninfrmlsanctn IS 'NINFRMLSANCTN';


--
-- Name: COLUMN ninfrmlsanctn.infrml_sanctn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.infrml_sanctn_id IS '침해남성SANCTN아이디';


--
-- Name: COLUMN ninfrmlsanctn.job_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.job_se_code IS '작업구분코드';


--
-- Name: COLUMN ninfrmlsanctn.applcnt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.applcnt_id IS '출원수아이디';


--
-- Name: COLUMN ninfrmlsanctn.reqst_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.reqst_de IS 'REQST일자';


--
-- Name: COLUMN ninfrmlsanctn.sanctner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.sanctner_id IS 'SANCTNER아이디';


--
-- Name: COLUMN ninfrmlsanctn.confm_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.confm_at IS 'CONFM여부';


--
-- Name: COLUMN ninfrmlsanctn.sanctn_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.sanctn_dt IS 'SANCTN일시';


--
-- Name: COLUMN ninfrmlsanctn.return_resn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.return_resn IS 'RETURNRESN';


--
-- Name: COLUMN ninfrmlsanctn.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ninfrmlsanctn.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ninfrmlsanctn.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ninfrmlsanctn.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninfrmlsanctn.last_updt_pnttm IS '최종수정시점';


--
-- Name: ninsttcode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ninsttcode (
    instt_code character(7) NOT NULL,
    all_instt_nm character varying(255),
    lowest_instt_nm character varying(100),
    instt_abrv_nm character varying(50),
    odr character(1),
    ord character(3),
    instt_odr character(2),
    upper_instt_code character(7),
    best_instt_code character(7),
    reprsnt_instt_code character(7),
    instt_ty_lclas character varying(100),
    instt_ty_mlsfc character varying(100),
    instt_ty_sclas character varying(100),
    telno character varying(20),
    fxnum character varying(20),
    creat_de character(20),
    abl_de character(20),
    abl_ennc character(1),
    change_de character(20),
    change_time character varying(6),
    bsis_de character(20),
    sort_ordr numeric(8,0),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ninsttcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ninsttcode IS 'NINSTTCODE';


--
-- Name: COLUMN ninsttcode.instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.instt_code IS 'INSTT코드';


--
-- Name: COLUMN ninsttcode.all_instt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.all_instt_nm IS 'ALLINSTT명';


--
-- Name: COLUMN ninsttcode.lowest_instt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.lowest_instt_nm IS 'LOWESTINSTT명';


--
-- Name: COLUMN ninsttcode.instt_abrv_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.instt_abrv_nm IS 'INSTTABRV명';


--
-- Name: COLUMN ninsttcode.odr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.odr IS '발주자';


--
-- Name: COLUMN ninsttcode.ord; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.ord IS 'ORD';


--
-- Name: COLUMN ninsttcode.instt_odr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.instt_odr IS 'INSTT발주자';


--
-- Name: COLUMN ninsttcode.upper_instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.upper_instt_code IS 'UPPERINSTT코드';


--
-- Name: COLUMN ninsttcode.best_instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.best_instt_code IS 'BESTINSTT코드';


--
-- Name: COLUMN ninsttcode.reprsnt_instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.reprsnt_instt_code IS 'REPRSNTINSTT코드';


--
-- Name: COLUMN ninsttcode.instt_ty_lclas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.instt_ty_lclas IS 'INSTT유형LCLAS';


--
-- Name: COLUMN ninsttcode.instt_ty_mlsfc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.instt_ty_mlsfc IS 'INSTT유형MLSFC';


--
-- Name: COLUMN ninsttcode.instt_ty_sclas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.instt_ty_sclas IS 'INSTT유형SCLAS';


--
-- Name: COLUMN ninsttcode.telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.telno IS '전화번호';


--
-- Name: COLUMN ninsttcode.fxnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.fxnum IS 'FXNUM';


--
-- Name: COLUMN ninsttcode.creat_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.creat_de IS 'CREAT일자';


--
-- Name: COLUMN ninsttcode.abl_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.abl_de IS '폐지일자';


--
-- Name: COLUMN ninsttcode.abl_ennc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.abl_ennc IS '폐지ENNC';


--
-- Name: COLUMN ninsttcode.change_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.change_de IS 'CHANGE일자';


--
-- Name: COLUMN ninsttcode.change_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.change_time IS 'CHANGETIME';


--
-- Name: COLUMN ninsttcode.bsis_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.bsis_de IS 'BSIS일자';


--
-- Name: COLUMN ninsttcode.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.sort_ordr IS '정렬순서';


--
-- Name: COLUMN ninsttcode.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ninsttcode.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ninsttcode.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ninsttcode.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcode.last_updt_pnttm IS '최종수정시점';


--
-- Name: ninsttcoderecptnlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ninsttcoderecptnlog (
    occrrnc_de character(20) NOT NULL,
    instt_code character(7) NOT NULL,
    opert_sn numeric(10,0) NOT NULL,
    change_se_code character varying(2),
    process_se character varying(2),
    etc_code character(2),
    all_instt_nm character varying(255),
    lowest_instt_nm character varying(100),
    instt_abrv_nm character varying(50),
    odr character(1),
    ord character(3),
    instt_odr character(2),
    upper_instt_code character(7),
    best_instt_code character(7),
    reprsnt_instt_code character(7),
    instt_ty_lclas character varying(100),
    instt_ty_mlsfc character varying(100),
    instt_ty_sclas character varying(100),
    telno character varying(20),
    fxnum character varying(20),
    creat_de character(20),
    abl_de character(20),
    abl_ennc character(1),
    change_de character(20),
    change_time character varying(6),
    bsis_de character(20),
    sort_ordr numeric(8,0),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ninsttcoderecptnlog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ninsttcoderecptnlog IS 'NINSTTCODERECPTNLOG';


--
-- Name: COLUMN ninsttcoderecptnlog.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN ninsttcoderecptnlog.instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.instt_code IS 'INSTT코드';


--
-- Name: COLUMN ninsttcoderecptnlog.opert_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.opert_sn IS 'OPERT일련번호';


--
-- Name: COLUMN ninsttcoderecptnlog.change_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.change_se_code IS 'CHANGE구분코드';


--
-- Name: COLUMN ninsttcoderecptnlog.process_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.process_se IS 'PROCESS구분';


--
-- Name: COLUMN ninsttcoderecptnlog.etc_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.etc_code IS '기타코드';


--
-- Name: COLUMN ninsttcoderecptnlog.all_instt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.all_instt_nm IS 'ALLINSTT명';


--
-- Name: COLUMN ninsttcoderecptnlog.lowest_instt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.lowest_instt_nm IS 'LOWESTINSTT명';


--
-- Name: COLUMN ninsttcoderecptnlog.instt_abrv_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.instt_abrv_nm IS 'INSTTABRV명';


--
-- Name: COLUMN ninsttcoderecptnlog.odr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.odr IS '발주자';


--
-- Name: COLUMN ninsttcoderecptnlog.ord; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.ord IS 'ORD';


--
-- Name: COLUMN ninsttcoderecptnlog.instt_odr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.instt_odr IS 'INSTT발주자';


--
-- Name: COLUMN ninsttcoderecptnlog.upper_instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.upper_instt_code IS 'UPPERINSTT코드';


--
-- Name: COLUMN ninsttcoderecptnlog.best_instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.best_instt_code IS 'BESTINSTT코드';


--
-- Name: COLUMN ninsttcoderecptnlog.reprsnt_instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.reprsnt_instt_code IS 'REPRSNTINSTT코드';


--
-- Name: COLUMN ninsttcoderecptnlog.instt_ty_lclas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.instt_ty_lclas IS 'INSTT유형LCLAS';


--
-- Name: COLUMN ninsttcoderecptnlog.instt_ty_mlsfc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.instt_ty_mlsfc IS 'INSTT유형MLSFC';


--
-- Name: COLUMN ninsttcoderecptnlog.instt_ty_sclas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.instt_ty_sclas IS 'INSTT유형SCLAS';


--
-- Name: COLUMN ninsttcoderecptnlog.telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.telno IS '전화번호';


--
-- Name: COLUMN ninsttcoderecptnlog.fxnum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.fxnum IS 'FXNUM';


--
-- Name: COLUMN ninsttcoderecptnlog.creat_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.creat_de IS 'CREAT일자';


--
-- Name: COLUMN ninsttcoderecptnlog.abl_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.abl_de IS '폐지일자';


--
-- Name: COLUMN ninsttcoderecptnlog.abl_ennc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.abl_ennc IS '폐지ENNC';


--
-- Name: COLUMN ninsttcoderecptnlog.change_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.change_de IS 'CHANGE일자';


--
-- Name: COLUMN ninsttcoderecptnlog.change_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.change_time IS 'CHANGETIME';


--
-- Name: COLUMN ninsttcoderecptnlog.bsis_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.bsis_de IS 'BSIS일자';


--
-- Name: COLUMN ninsttcoderecptnlog.sort_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.sort_ordr IS '정렬순서';


--
-- Name: COLUMN ninsttcoderecptnlog.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ninsttcoderecptnlog.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ninsttcoderecptnlog.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ninsttcoderecptnlog.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ninsttcoderecptnlog.last_updt_pnttm IS '최종수정시점';


--
-- Name: nintnetsvc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nintnetsvc (
    intnet_svc_id character(20) NOT NULL,
    intnet_svc_nm character varying(20) NOT NULL,
    intnet_svc_dc character varying(200),
    reflct_at character(1) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nintnetsvc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nintnetsvc IS 'NINTNETSVC';


--
-- Name: COLUMN nintnetsvc.intnet_svc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.intnet_svc_id IS 'INTNET봉사아이디';


--
-- Name: COLUMN nintnetsvc.intnet_svc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.intnet_svc_nm IS 'INTNET봉사명';


--
-- Name: COLUMN nintnetsvc.intnet_svc_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.intnet_svc_dc IS 'INTNET봉사설명';


--
-- Name: COLUMN nintnetsvc.reflct_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.reflct_at IS '반영여부';


--
-- Name: COLUMN nintnetsvc.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nintnetsvc.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nintnetsvc.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nintnetsvc.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nintnetsvc.last_updt_pnttm IS '최종수정시점';


--
-- Name: nleaderschdul; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nleaderschdul (
    schdul_id character(20) NOT NULL,
    schdul_se character(1),
    schdul_nm character varying(255) NOT NULL,
    schdul_cn character varying(2500) NOT NULL,
    schdul_place character varying(255),
    leader_id character varying(20) NOT NULL,
    reptit_se_code character(1),
    schdul_bgnde character(20),
    schdul_endde character(20),
    schdul_charger_id character varying(20) NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nleaderschdul; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nleaderschdul IS 'NLEADERSCHDUL';


--
-- Name: COLUMN nleaderschdul.schdul_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_id IS 'SCHDUL아이디';


--
-- Name: COLUMN nleaderschdul.schdul_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_se IS 'SCHDUL구분';


--
-- Name: COLUMN nleaderschdul.schdul_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_nm IS 'SCHDUL명';


--
-- Name: COLUMN nleaderschdul.schdul_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_cn IS 'SCHDUL내용';


--
-- Name: COLUMN nleaderschdul.schdul_place; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_place IS 'SCHDULPLACE';


--
-- Name: COLUMN nleaderschdul.leader_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.leader_id IS 'LEADER아이디';


--
-- Name: COLUMN nleaderschdul.reptit_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.reptit_se_code IS 'REPTIT구분코드';


--
-- Name: COLUMN nleaderschdul.schdul_bgnde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_bgnde IS 'SCHDUL시작일';


--
-- Name: COLUMN nleaderschdul.schdul_endde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_endde IS 'SCHDUL종료일';


--
-- Name: COLUMN nleaderschdul.schdul_charger_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.schdul_charger_id IS 'SCHDULCHARGER아이디';


--
-- Name: COLUMN nleaderschdul.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nleaderschdul.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nleaderschdul.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nleaderschdul.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdul.last_updt_pnttm IS '최종수정시점';


--
-- Name: nleaderschdulde; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nleaderschdulde (
    schdul_id character(20) NOT NULL,
    schdul_de character(8) NOT NULL
);


--
-- Name: TABLE nleaderschdulde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nleaderschdulde IS 'NLEADERSCHDULDE';


--
-- Name: COLUMN nleaderschdulde.schdul_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdulde.schdul_id IS 'SCHDUL아이디';


--
-- Name: COLUMN nleaderschdulde.schdul_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleaderschdulde.schdul_de IS 'SCHDUL일자';


--
-- Name: nleadersttus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nleadersttus (
    leader_id character varying(20) NOT NULL,
    leader_sttus character(1) NOT NULL,
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nleadersttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nleadersttus IS 'NLEADERSTTUS';


--
-- Name: COLUMN nleadersttus.leader_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleadersttus.leader_id IS 'LEADER아이디';


--
-- Name: COLUMN nleadersttus.leader_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleadersttus.leader_sttus IS 'LEADER상태';


--
-- Name: COLUMN nleadersttus.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleadersttus.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nleadersttus.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleadersttus.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nleadersttus.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleadersttus.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nleadersttus.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nleadersttus.last_updusr_id IS '최종수정자아이디';


--
-- Name: nloginlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nloginlog (
    log_id character(20) NOT NULL,
    conect_id character varying(20),
    conect_ip character varying(23),
    conect_mthd character(4),
    error_occrrnc_at character(1),
    error_code character(3),
    creat_dt timestamp without time zone
);


--
-- Name: TABLE nloginlog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nloginlog IS 'NLOGINLOG';


--
-- Name: COLUMN nloginlog.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginlog.log_id IS '로그아이디';


--
-- Name: COLUMN nloginlog.conect_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginlog.conect_id IS 'CONECT아이디';


--
-- Name: COLUMN nloginlog.conect_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginlog.conect_ip IS 'CONECTIP';


--
-- Name: COLUMN nloginlog.conect_mthd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginlog.conect_mthd IS 'CONECT방법';


--
-- Name: COLUMN nloginlog.error_occrrnc_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginlog.error_occrrnc_at IS 'ERROROCCRRNC여부';


--
-- Name: COLUMN nloginlog.error_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginlog.error_code IS 'ERROR코드';


--
-- Name: COLUMN nloginlog.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginlog.creat_dt IS 'CREAT일시';


--
-- Name: nloginpolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nloginpolicy (
    emplyr_id character varying(20) NOT NULL,
    ip_info character varying(23) NOT NULL,
    dplct_perm_at character(1) NOT NULL,
    lmtt_at character(1) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nloginpolicy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nloginpolicy IS 'NLOGINPOLICY';


--
-- Name: COLUMN nloginpolicy.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN nloginpolicy.ip_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.ip_info IS 'IP정보';


--
-- Name: COLUMN nloginpolicy.dplct_perm_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.dplct_perm_at IS 'DPLCTPERM여부';


--
-- Name: COLUMN nloginpolicy.lmtt_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.lmtt_at IS 'LMTT여부';


--
-- Name: COLUMN nloginpolicy.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nloginpolicy.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nloginpolicy.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nloginpolicy.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nloginpolicy.last_updt_pnttm IS '최종수정시점';


--
-- Name: nmainimage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nmainimage (
    image_id character(20) NOT NULL,
    image_nm character varying(20) NOT NULL,
    image character varying(60) NOT NULL,
    image_dc character varying(200),
    reflct_at character(1) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    image_file character varying(60)
);


--
-- Name: TABLE nmainimage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nmainimage IS 'NMAINIMAGE';


--
-- Name: COLUMN nmainimage.image_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.image_id IS 'IMAGE아이디';


--
-- Name: COLUMN nmainimage.image_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.image_nm IS 'IMAGE명';


--
-- Name: COLUMN nmainimage.image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.image IS 'IMAGE';


--
-- Name: COLUMN nmainimage.image_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.image_dc IS 'IMAGE설명';


--
-- Name: COLUMN nmainimage.reflct_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.reflct_at IS '반영여부';


--
-- Name: COLUMN nmainimage.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nmainimage.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nmainimage.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nmainimage.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nmainimage.image_file; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmainimage.image_file IS 'IMAGE파일';


--
-- Name: nmemoreprt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nmemoreprt (
    reprt_sj character varying(255) NOT NULL,
    report_de character(20) NOT NULL,
    wrter_id character varying(20) NOT NULL,
    reportr_id character varying(20) NOT NULL,
    report_cn character varying(2500) NOT NULL,
    atch_file_id character(20),
    drct_matter character varying(2500),
    drct_matter_regist_dt character varying(14),
    reportr_inqire_dt character varying(14),
    frst_register_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    reprt_id character(6) NOT NULL
);


--
-- Name: TABLE nmemoreprt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nmemoreprt IS 'NMEMOREPRT';


--
-- Name: COLUMN nmemoreprt.reprt_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.reprt_sj IS 'REPRT제목';


--
-- Name: COLUMN nmemoreprt.report_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.report_de IS 'REPORT일자';


--
-- Name: COLUMN nmemoreprt.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.wrter_id IS 'WRTER아이디';


--
-- Name: COLUMN nmemoreprt.reportr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.reportr_id IS 'REPORTR아이디';


--
-- Name: COLUMN nmemoreprt.report_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.report_cn IS 'REPORT내용';


--
-- Name: COLUMN nmemoreprt.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN nmemoreprt.drct_matter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.drct_matter IS '직접MATTER';


--
-- Name: COLUMN nmemoreprt.drct_matter_regist_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.drct_matter_regist_dt IS '직접MATTER등록일시';


--
-- Name: COLUMN nmemoreprt.reportr_inqire_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.reportr_inqire_dt IS 'REPORTRINQIRE일시';


--
-- Name: COLUMN nmemoreprt.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nmemoreprt.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nmemoreprt.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nmemoreprt.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nmemoreprt.reprt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemoreprt.reprt_id IS 'REPRT아이디';


--
-- Name: nmemotodo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nmemotodo (
    todo_id character(20) NOT NULL,
    todo_sj character varying(255) NOT NULL,
    todo_begin_time character varying(14) NOT NULL,
    todo_end_time character varying(14) NOT NULL,
    wrter_id character varying(20) NOT NULL,
    todo_cn character varying(2500) NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nmemotodo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nmemotodo IS 'NMEMOTODO';


--
-- Name: COLUMN nmemotodo.todo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.todo_id IS 'TODO아이디';


--
-- Name: COLUMN nmemotodo.todo_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.todo_sj IS 'TODO제목';


--
-- Name: COLUMN nmemotodo.todo_begin_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.todo_begin_time IS 'TODOBEGINTIME';


--
-- Name: COLUMN nmemotodo.todo_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.todo_end_time IS 'TODO종료TIME';


--
-- Name: COLUMN nmemotodo.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.wrter_id IS 'WRTER아이디';


--
-- Name: COLUMN nmemotodo.todo_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.todo_cn IS 'TODO내용';


--
-- Name: COLUMN nmemotodo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nmemotodo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nmemotodo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nmemotodo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmemotodo.last_updt_pnttm IS '최종수정시점';


--
-- Name: nmenucreatdtls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nmenucreatdtls (
    menu_no numeric(20,0) NOT NULL,
    author_code character varying(30) NOT NULL,
    mapng_creat_id character varying(30),
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nmenucreatdtls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nmenucreatdtls IS 'NMENUCREATDTLS';


--
-- Name: COLUMN nmenucreatdtls.menu_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenucreatdtls.menu_no IS '메뉴번호';


--
-- Name: COLUMN nmenucreatdtls.author_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenucreatdtls.author_code IS '권한코드';


--
-- Name: COLUMN nmenucreatdtls.mapng_creat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenucreatdtls.mapng_creat_id IS 'MAPNGCREAT아이디';


--
-- Name: nmenuinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nmenuinfo (
    menu_nm character varying(60) NOT NULL,
    progrm_file_nm character varying(60) NOT NULL,
    menu_no numeric(20,0) NOT NULL,
    upper_menu_no numeric(20,0),
    menu_ordr numeric(5,0) NOT NULL,
    menu_dc character varying(250),
    relate_image_path character varying(100),
    relate_image_nm character varying(60),
    route_updated_at timestamp without time zone,
    modern_route character varying(500),
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nmenuinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nmenuinfo IS 'NMENUINFO';


--
-- Name: COLUMN nmenuinfo.menu_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.menu_nm IS '메뉴명';


--
-- Name: COLUMN nmenuinfo.progrm_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.progrm_file_nm IS '프로그램파일명';


--
-- Name: COLUMN nmenuinfo.menu_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.menu_no IS '메뉴번호';


--
-- Name: COLUMN nmenuinfo.upper_menu_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.upper_menu_no IS 'UPPER메뉴번호';


--
-- Name: COLUMN nmenuinfo.menu_ordr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.menu_ordr IS '메뉴순서';


--
-- Name: COLUMN nmenuinfo.menu_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.menu_dc IS '메뉴설명';


--
-- Name: COLUMN nmenuinfo.relate_image_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.relate_image_path IS 'RELATEIMAGE경로';


--
-- Name: COLUMN nmenuinfo.relate_image_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmenuinfo.relate_image_nm IS 'RELATEIMAGE명';


--
-- Name: nmtgplacefxtrs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nmtgplacefxtrs (
    mtgrum_id character(20) NOT NULL,
    fxtrs_code character(14) NOT NULL,
    qy numeric(20,0) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nmtgplacefxtrs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nmtgplacefxtrs IS 'NMTGPLACEFXTRS';


--
-- Name: COLUMN nmtgplacefxtrs.mtgrum_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmtgplacefxtrs.mtgrum_id IS 'MTGRUM아이디';


--
-- Name: COLUMN nmtgplacefxtrs.fxtrs_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmtgplacefxtrs.fxtrs_code IS '비품코드';


--
-- Name: COLUMN nmtgplacefxtrs.qy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmtgplacefxtrs.qy IS 'QY';


--
-- Name: COLUMN nmtgplacefxtrs.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmtgplacefxtrs.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nmtgplacefxtrs.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmtgplacefxtrs.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nmtgplacefxtrs.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmtgplacefxtrs.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nmtgplacefxtrs.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nmtgplacefxtrs.last_updt_pnttm IS '최종수정시점';


--
-- Name: nnote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nnote (
    note_id character(20) NOT NULL,
    note_sj character varying(255),
    note_cn character varying(4000),
    atch_file_id character(20),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nnote; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nnote IS 'NNOTE';


--
-- Name: COLUMN nnote.note_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.note_id IS '쪽지아이디';


--
-- Name: COLUMN nnote.note_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.note_sj IS '쪽지제목';


--
-- Name: COLUMN nnote.note_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.note_cn IS '쪽지내용';


--
-- Name: COLUMN nnote.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN nnote.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nnote.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nnote.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nnote.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnote.last_updt_pnttm IS '최종수정시점';


--
-- Name: nnoterecptn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nnoterecptn (
    note_id character(20) NOT NULL,
    note_trnsmit_id character(20) NOT NULL,
    note_recptn_id character(20) NOT NULL,
    rcver_id character(20),
    open_yn character(1),
    recptn_se character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nnoterecptn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nnoterecptn IS 'NNOTERECPTN';


--
-- Name: COLUMN nnoterecptn.note_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.note_id IS '쪽지아이디';


--
-- Name: COLUMN nnoterecptn.note_trnsmit_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.note_trnsmit_id IS '쪽지TRNSMIT아이디';


--
-- Name: COLUMN nnoterecptn.note_recptn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.note_recptn_id IS '쪽지RECPTN아이디';


--
-- Name: COLUMN nnoterecptn.rcver_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.rcver_id IS '수화자아이디';


--
-- Name: COLUMN nnoterecptn.open_yn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.open_yn IS '개봉여부';


--
-- Name: COLUMN nnoterecptn.recptn_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.recptn_se IS 'RECPTN구분';


--
-- Name: COLUMN nnoterecptn.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nnoterecptn.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nnoterecptn.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nnoterecptn.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnoterecptn.last_updt_pnttm IS '최종수정시점';


--
-- Name: nnotetrnsmit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nnotetrnsmit (
    note_id character(20) NOT NULL,
    note_trnsmit_id character(20) NOT NULL,
    trnsmiter_id character(20),
    delete_at character(8),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nnotetrnsmit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nnotetrnsmit IS 'NNOTETRNSMIT';


--
-- Name: COLUMN nnotetrnsmit.note_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.note_id IS '쪽지아이디';


--
-- Name: COLUMN nnotetrnsmit.note_trnsmit_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.note_trnsmit_id IS '쪽지TRNSMIT아이디';


--
-- Name: COLUMN nnotetrnsmit.trnsmiter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.trnsmiter_id IS 'TRNSMITER아이디';


--
-- Name: COLUMN nnotetrnsmit.delete_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.delete_at IS 'DELETE여부';


--
-- Name: COLUMN nnotetrnsmit.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nnotetrnsmit.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nnotetrnsmit.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nnotetrnsmit.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnotetrnsmit.last_updt_pnttm IS '최종수정시점';


--
-- Name: nntfcinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nntfcinfo (
    ntcn_no numeric(20,0) NOT NULL,
    ntcn_sj character varying(60) NOT NULL,
    ntcn_cn character varying(100) NOT NULL,
    ntcn_tm character varying(14) NOT NULL,
    bh_ntcn_intrvl character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(20) NOT NULL,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nntfcinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nntfcinfo IS 'NNTFCINFO';


--
-- Name: COLUMN nntfcinfo.ntcn_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.ntcn_no IS 'NTCN번호';


--
-- Name: COLUMN nntfcinfo.ntcn_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.ntcn_sj IS 'NTCN제목';


--
-- Name: COLUMN nntfcinfo.ntcn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.ntcn_cn IS 'NTCN내용';


--
-- Name: COLUMN nntfcinfo.ntcn_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.ntcn_tm IS 'NTCN시각';


--
-- Name: COLUMN nntfcinfo.bh_ntcn_intrvl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.bh_ntcn_intrvl IS 'BHNTCN도입값';


--
-- Name: COLUMN nntfcinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nntfcinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nntfcinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nntfcinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntfcinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: nnttstats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nnttstats (
    stats_id character(18) NOT NULL,
    ntce_co numeric(10,0),
    avrg_rdcnt numeric(10,0),
    top_rdcnt numeric(10,0),
    mumm_rdcnt numeric(10,0),
    top_ntcr_id character varying(20)
);


--
-- Name: TABLE nnttstats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nnttstats IS 'NNTTSTATS';


--
-- Name: COLUMN nnttstats.stats_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnttstats.stats_id IS '통계아이디';


--
-- Name: COLUMN nnttstats.ntce_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnttstats.ntce_co IS '공지수';


--
-- Name: COLUMN nnttstats.avrg_rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnttstats.avrg_rdcnt IS 'AVRGRDCNT';


--
-- Name: COLUMN nnttstats.top_rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnttstats.top_rdcnt IS 'TOPRDCNT';


--
-- Name: COLUMN nnttstats.mumm_rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnttstats.mumm_rdcnt IS 'MUMMRDCNT';


--
-- Name: COLUMN nnttstats.top_ntcr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nnttstats.top_ntcr_id IS 'TOPNTCR아이디';


--
-- Name: nntwrkinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nntwrkinfo (
    ntwrk_id character(20) NOT NULL,
    ntwrk_ip character varying(23),
    gtwy character varying(23),
    subnet character varying(23),
    domn_nm_server character varying(23),
    manage_iem character(2),
    user_nm character varying(60),
    use_at character(1),
    rgsde timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nntwrkinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nntwrkinfo IS 'NNTWRKINFO';


--
-- Name: COLUMN nntwrkinfo.ntwrk_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.ntwrk_id IS 'NTWRK아이디';


--
-- Name: COLUMN nntwrkinfo.ntwrk_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.ntwrk_ip IS 'NTWRKIP';


--
-- Name: COLUMN nntwrkinfo.gtwy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.gtwy IS 'GTWY';


--
-- Name: COLUMN nntwrkinfo.subnet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.subnet IS 'SUBNET';


--
-- Name: COLUMN nntwrkinfo.domn_nm_server; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.domn_nm_server IS 'DOMN명SERVER';


--
-- Name: COLUMN nntwrkinfo.manage_iem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.manage_iem IS 'MANAGEIEM';


--
-- Name: COLUMN nntwrkinfo.user_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.user_nm IS '사용자명';


--
-- Name: COLUMN nntwrkinfo.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.use_at IS '사용여부';


--
-- Name: COLUMN nntwrkinfo.rgsde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.rgsde IS 'RGSDE';


--
-- Name: COLUMN nntwrkinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nntwrkinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nntwrkinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nntwrkinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrkinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: nntwrksvcmntrngloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nntwrksvcmntrngloginfo (
    sys_ip character varying(23) NOT NULL,
    sys_port numeric(5,0) NOT NULL,
    sys_nm character varying(255) NOT NULL,
    mntrng_sttus character(2),
    log_info character varying(2000),
    creat_dt timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone NOT NULL,
    log_id character(20) NOT NULL
);


--
-- Name: TABLE nntwrksvcmntrngloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nntwrksvcmntrngloginfo IS 'NNTWRKSVCMNTRNGLOGINFO';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.sys_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.sys_ip IS '시스템IP';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.sys_port; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.sys_port IS '시스템포트';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.sys_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.sys_nm IS '시스템명';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.mntrng_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.mntrng_sttus IS 'MNTRNG상태';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.log_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.log_info IS '로그정보';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nntwrksvcmntrngloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nntwrksvcmntrngloginfo.log_id IS '로그아이디';


--
-- Name: nonlinemanual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nonlinemanual (
    online_mnl_id character(20) NOT NULL,
    online_mnl_se_code character(3),
    online_mnl_dfn text,
    online_mnl_dc text,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    online_mnl_nm character varying(255)
);


--
-- Name: TABLE nonlinemanual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nonlinemanual IS 'NONLINEMANUAL';


--
-- Name: COLUMN nonlinemanual.online_mnl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.online_mnl_id IS 'ONLINE매뉴얼아이디';


--
-- Name: COLUMN nonlinemanual.online_mnl_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.online_mnl_se_code IS 'ONLINE매뉴얼구분코드';


--
-- Name: COLUMN nonlinemanual.online_mnl_dfn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.online_mnl_dfn IS 'ONLINE매뉴얼정의';


--
-- Name: COLUMN nonlinemanual.online_mnl_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.online_mnl_dc IS 'ONLINE매뉴얼설명';


--
-- Name: COLUMN nonlinemanual.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nonlinemanual.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nonlinemanual.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nonlinemanual.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nonlinemanual.online_mnl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinemanual.online_mnl_nm IS 'ONLINE매뉴얼명';


--
-- Name: nonlinepolliem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nonlinepolliem (
    poll_iem_nm character varying(255),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    poll_iem_id character(20) NOT NULL,
    poll_id character(20) NOT NULL
);


--
-- Name: TABLE nonlinepolliem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nonlinepolliem IS 'NONLINEPOLLIEM';


--
-- Name: COLUMN nonlinepolliem.poll_iem_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepolliem.poll_iem_nm IS 'POLLIEM명';


--
-- Name: COLUMN nonlinepolliem.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepolliem.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nonlinepolliem.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepolliem.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nonlinepolliem.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepolliem.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nonlinepolliem.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepolliem.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nonlinepolliem.poll_iem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepolliem.poll_iem_id IS 'POLLIEM아이디';


--
-- Name: COLUMN nonlinepolliem.poll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepolliem.poll_id IS 'POLL아이디';


--
-- Name: nonlinepollmanage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nonlinepollmanage (
    poll_id character(20) NOT NULL,
    poll_nm character varying(255),
    poll_bgnde character(10),
    poll_endde character(10),
    poll_knd character(3),
    poll_dsuse_ennc character(1),
    poll_atmc_dsuse_ennc character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nonlinepollmanage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nonlinepollmanage IS 'NONLINEPOLLMANAGE';


--
-- Name: COLUMN nonlinepollmanage.poll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.poll_id IS 'POLL아이디';


--
-- Name: COLUMN nonlinepollmanage.poll_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.poll_nm IS 'POLL명';


--
-- Name: COLUMN nonlinepollmanage.poll_bgnde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.poll_bgnde IS 'POLL시작일';


--
-- Name: COLUMN nonlinepollmanage.poll_endde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.poll_endde IS 'POLL종료일';


--
-- Name: COLUMN nonlinepollmanage.poll_knd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.poll_knd IS 'POLL종류';


--
-- Name: COLUMN nonlinepollmanage.poll_dsuse_ennc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.poll_dsuse_ennc IS 'POLLDSUSEENNC';


--
-- Name: COLUMN nonlinepollmanage.poll_atmc_dsuse_ennc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.poll_atmc_dsuse_ennc IS 'POLLATMCDSUSEENNC';


--
-- Name: COLUMN nonlinepollmanage.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nonlinepollmanage.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nonlinepollmanage.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nonlinepollmanage.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollmanage.last_updt_pnttm IS '최종수정시점';


--
-- Name: nonlinepollresult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nonlinepollresult (
    poll_result_id character(20) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    poll_iem_id character(20) NOT NULL,
    poll_id character(20) NOT NULL
);


--
-- Name: TABLE nonlinepollresult; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nonlinepollresult IS 'NONLINEPOLLRESULT';


--
-- Name: COLUMN nonlinepollresult.poll_result_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollresult.poll_result_id IS 'POLLRESULT아이디';


--
-- Name: COLUMN nonlinepollresult.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollresult.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nonlinepollresult.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollresult.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nonlinepollresult.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollresult.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nonlinepollresult.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollresult.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nonlinepollresult.poll_iem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollresult.poll_iem_id IS 'POLLIEM아이디';


--
-- Name: COLUMN nonlinepollresult.poll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nonlinepollresult.poll_id IS 'POLL아이디';


--
-- Name: norgnztinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.norgnztinfo (
    orgnzt_id character(20) NOT NULL,
    orgnzt_nm character varying(20) NOT NULL,
    orgnzt_dc character varying(100),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE norgnztinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.norgnztinfo IS 'NORGNZTINFO';


--
-- Name: COLUMN norgnztinfo.orgnzt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.norgnztinfo.orgnzt_id IS '조직아이디';


--
-- Name: COLUMN norgnztinfo.orgnzt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.norgnztinfo.orgnzt_nm IS '조직명';


--
-- Name: COLUMN norgnztinfo.orgnzt_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.norgnztinfo.orgnzt_dc IS '조직설명';


--
-- Name: npolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.npolicy (
    policy_type character varying(30) NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE npolicy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.npolicy IS '시스템 정책(저작권, 개인정보처리방침 등)';


--
-- Name: COLUMN npolicy.policy_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npolicy.policy_type IS '정책 유형 (COPYRIGHT, PRIVACY 등)';


--
-- Name: COLUMN npolicy.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npolicy.title IS '제목';


--
-- Name: COLUMN npolicy.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npolicy.content IS '내용';


--
-- Name: npopupmanage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.npopupmanage (
    popup_id character varying(20) NOT NULL,
    popup_sj_nm character varying(1024),
    file_url character varying(1024),
    popup_width_lc character varying(20),
    popup_width_size numeric,
    ntce_bgnde character(20),
    ntce_endde character(20),
    stopvew_setup_at character(1),
    ntce_at character(1),
    popup_vrticl_lc character varying(20),
    popup_vrticl_size numeric,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE npopupmanage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.npopupmanage IS 'NPOPUPMANAGE';


--
-- Name: COLUMN npopupmanage.popup_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.popup_id IS '팝업아이디';


--
-- Name: COLUMN npopupmanage.popup_sj_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.popup_sj_nm IS '팝업제목명';


--
-- Name: COLUMN npopupmanage.file_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.file_url IS '파일URL';


--
-- Name: COLUMN npopupmanage.popup_width_lc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.popup_width_lc IS '팝업가로위치';


--
-- Name: COLUMN npopupmanage.popup_width_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.popup_width_size IS '팝업가로SIZE';


--
-- Name: COLUMN npopupmanage.ntce_bgnde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.ntce_bgnde IS '공지시작일';


--
-- Name: COLUMN npopupmanage.ntce_endde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.ntce_endde IS '공지종료일';


--
-- Name: COLUMN npopupmanage.stopvew_setup_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.stopvew_setup_at IS 'STOPVEWSETUP여부';


--
-- Name: COLUMN npopupmanage.ntce_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.ntce_at IS '공지여부';


--
-- Name: COLUMN npopupmanage.popup_vrticl_lc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.popup_vrticl_lc IS '팝업세로위치';


--
-- Name: COLUMN npopupmanage.popup_vrticl_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.popup_vrticl_size IS '팝업세로SIZE';


--
-- Name: COLUMN npopupmanage.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN npopupmanage.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN npopupmanage.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN npopupmanage.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.npopupmanage.last_updt_pnttm IS '최종수정시점';


--
-- Name: nprivacylog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nprivacylog (
    requst_id character varying(20) NOT NULL,
    inqire_dt timestamp without time zone NOT NULL,
    srvc_nm character varying(500),
    inqire_info character varying(100),
    rqester_id character varying(20),
    rqester_ip character varying(23)
);


--
-- Name: TABLE nprivacylog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nprivacylog IS 'NPRIVACYLOG';


--
-- Name: COLUMN nprivacylog.requst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprivacylog.requst_id IS 'REQUST아이디';


--
-- Name: COLUMN nprivacylog.inqire_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprivacylog.inqire_dt IS 'INQIRE일시';


--
-- Name: COLUMN nprivacylog.srvc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprivacylog.srvc_nm IS '서비스명';


--
-- Name: COLUMN nprivacylog.inqire_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprivacylog.inqire_info IS 'INQIRE정보';


--
-- Name: COLUMN nprivacylog.rqester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprivacylog.rqester_id IS 'RQESTER아이디';


--
-- Name: COLUMN nprivacylog.rqester_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprivacylog.rqester_ip IS 'RQESTERIP';


--
-- Name: nprocessmonloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nprocessmonloginfo (
    procs_id character(20) NOT NULL,
    procs_nm character varying(60),
    procs_sttus character varying(3),
    creat_dt timestamp without time zone,
    log_info character varying(2000),
    mngr_nm character varying(60),
    mngr_email_adres character varying(50),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    log_id character(20) NOT NULL
);


--
-- Name: TABLE nprocessmonloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nprocessmonloginfo IS 'NPROCESSMONLOGINFO';


--
-- Name: COLUMN nprocessmonloginfo.procs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.procs_id IS '공정아이디';


--
-- Name: COLUMN nprocessmonloginfo.procs_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.procs_nm IS '공정명';


--
-- Name: COLUMN nprocessmonloginfo.procs_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.procs_sttus IS '공정상태';


--
-- Name: COLUMN nprocessmonloginfo.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN nprocessmonloginfo.log_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.log_info IS '로그정보';


--
-- Name: COLUMN nprocessmonloginfo.mngr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.mngr_nm IS '관리자명';


--
-- Name: COLUMN nprocessmonloginfo.mngr_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.mngr_email_adres IS '관리자이메일주소';


--
-- Name: COLUMN nprocessmonloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nprocessmonloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nprocessmonloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nprocessmonloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nprocessmonloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprocessmonloginfo.log_id IS '로그아이디';


--
-- Name: nprogrmlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nprogrmlist (
    progrm_file_nm character varying(60) NOT NULL,
    progrm_stre_path character varying(100) NOT NULL,
    progrm_korean_nm character varying(60),
    progrm_dc character varying(200),
    url character varying(100) NOT NULL,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nprogrmlist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nprogrmlist IS '프로그램목록';


--
-- Name: COLUMN nprogrmlist.progrm_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprogrmlist.progrm_file_nm IS '프로그램파일명';


--
-- Name: COLUMN nprogrmlist.progrm_stre_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprogrmlist.progrm_stre_path IS '프로그램저장경로';


--
-- Name: COLUMN nprogrmlist.progrm_korean_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprogrmlist.progrm_korean_nm IS '프로그램KOREAN명';


--
-- Name: COLUMN nprogrmlist.progrm_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprogrmlist.progrm_dc IS '프로그램설명';


--
-- Name: COLUMN nprogrmlist.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nprogrmlist.url IS 'URL';


--
-- Name: nproxyinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nproxyinfo (
    proxy_id character(20) NOT NULL,
    proxy_nm character varying(60),
    proxy_ip character varying(23),
    proxy_port character varying(10),
    trget_svc_nm character varying(255),
    svc_dc character varying(2000),
    svc_ip character varying(23),
    svc_port character varying(10),
    svc_sttus character(2),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nproxyinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nproxyinfo IS 'NPROXYINFO';


--
-- Name: COLUMN nproxyinfo.proxy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.proxy_id IS 'PROXY아이디';


--
-- Name: COLUMN nproxyinfo.proxy_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.proxy_nm IS 'PROXY명';


--
-- Name: COLUMN nproxyinfo.proxy_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.proxy_ip IS 'PROXYIP';


--
-- Name: COLUMN nproxyinfo.proxy_port; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.proxy_port IS 'PROXY포트';


--
-- Name: COLUMN nproxyinfo.trget_svc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.trget_svc_nm IS 'TRGET봉사명';


--
-- Name: COLUMN nproxyinfo.svc_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.svc_dc IS '봉사설명';


--
-- Name: COLUMN nproxyinfo.svc_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.svc_ip IS '봉사IP';


--
-- Name: COLUMN nproxyinfo.svc_port; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.svc_port IS '봉사포트';


--
-- Name: COLUMN nproxyinfo.svc_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.svc_sttus IS '봉사상태';


--
-- Name: COLUMN nproxyinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nproxyinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nproxyinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nproxyinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: nproxyloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nproxyloginfo (
    proxy_id character(20) NOT NULL,
    clnt_ip character varying(23),
    clnt_port character varying(10),
    conect_time timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    log_id character(20) NOT NULL
);


--
-- Name: TABLE nproxyloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nproxyloginfo IS 'NPROXYLOGINFO';


--
-- Name: COLUMN nproxyloginfo.proxy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.proxy_id IS 'PROXY아이디';


--
-- Name: COLUMN nproxyloginfo.clnt_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.clnt_ip IS '클라이언트IP';


--
-- Name: COLUMN nproxyloginfo.clnt_port; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.clnt_port IS '클라이언트포트';


--
-- Name: COLUMN nproxyloginfo.conect_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.conect_time IS 'CONECTTIME';


--
-- Name: COLUMN nproxyloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nproxyloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nproxyloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nproxyloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nproxyloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nproxyloginfo.log_id IS '로그아이디';


--
-- Name: nqainfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nqainfo (
    qa_id character(20) NOT NULL,
    qestn_sj character varying(255),
    qestn_cn character varying(2500),
    writng_de character(20),
    rdcnt numeric(10,0),
    email_adres character varying(50),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    qna_process_sttus_code character(1),
    wrter_nm character varying(20),
    answer_cn character varying(2500),
    writng_password character varying(20),
    answer_de character(20),
    email_answer_at character(1),
    area_no character varying(4),
    middle_telno character varying(4),
    end_telno character varying(4)
);


--
-- Name: TABLE nqainfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nqainfo IS 'NQAINFO';


--
-- Name: COLUMN nqainfo.qa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.qa_id IS '질의응답아이디';


--
-- Name: COLUMN nqainfo.qestn_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.qestn_sj IS 'QESTN제목';


--
-- Name: COLUMN nqainfo.qestn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.qestn_cn IS 'QESTN내용';


--
-- Name: COLUMN nqainfo.writng_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.writng_de IS 'WRITNG일자';


--
-- Name: COLUMN nqainfo.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.rdcnt IS 'RDCNT';


--
-- Name: COLUMN nqainfo.email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.email_adres IS '이메일주소';


--
-- Name: COLUMN nqainfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nqainfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nqainfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nqainfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nqainfo.qna_process_sttus_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.qna_process_sttus_code IS '질의응답PROCESS상태코드';


--
-- Name: COLUMN nqainfo.wrter_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.wrter_nm IS 'WRTER명';


--
-- Name: COLUMN nqainfo.answer_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.answer_cn IS 'ANSWER내용';


--
-- Name: COLUMN nqainfo.writng_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.writng_password IS 'WRITNG비밀번호';


--
-- Name: COLUMN nqainfo.answer_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.answer_de IS 'ANSWER일자';


--
-- Name: COLUMN nqainfo.email_answer_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.email_answer_at IS '이메일ANSWER여부';


--
-- Name: COLUMN nqainfo.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.area_no IS '지역번호';


--
-- Name: COLUMN nqainfo.middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.middle_telno IS 'MIDDLE전화번호';


--
-- Name: COLUMN nqainfo.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqainfo.end_telno IS '종료전화번호';


--
-- Name: nqestnrinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nqestnrinfo (
    qustnr_tmplat_id character(20) NOT NULL,
    qestnr_id character(20) NOT NULL,
    qustnr_sj character varying(255),
    qustnr_purps character varying(1000),
    qustnr_writng_guidance_cn character varying(2000),
    qustnr_trget character varying(1000),
    qustnr_bgnde character(20),
    qustnr_endde character(20),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nqestnrinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nqestnrinfo IS 'NQESTNRINFO';


--
-- Name: COLUMN nqestnrinfo.qustnr_tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qustnr_tmplat_id IS '설문템플릿아이디';


--
-- Name: COLUMN nqestnrinfo.qestnr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qestnr_id IS '설문아이디';


--
-- Name: COLUMN nqestnrinfo.qustnr_sj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qustnr_sj IS '설문제목';


--
-- Name: COLUMN nqestnrinfo.qustnr_purps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qustnr_purps IS '설문PURPS';


--
-- Name: COLUMN nqestnrinfo.qustnr_writng_guidance_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qustnr_writng_guidance_cn IS '설문WRITNGGUIDANCE내용';


--
-- Name: COLUMN nqestnrinfo.qustnr_trget; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qustnr_trget IS '설문TRGET';


--
-- Name: COLUMN nqestnrinfo.qustnr_bgnde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qustnr_bgnde IS '설문시작일';


--
-- Name: COLUMN nqestnrinfo.qustnr_endde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.qustnr_endde IS '설문종료일';


--
-- Name: COLUMN nqestnrinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nqestnrinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nqestnrinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nqestnrinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqestnrinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: nqustnriem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nqustnriem (
    qustnr_tmplat_id character(20) NOT NULL,
    qestnr_id character(20) NOT NULL,
    qustnr_qesitm_id character(20) NOT NULL,
    qustnr_iem_id character varying(20) NOT NULL,
    iem_sn numeric(5,0),
    iem_cn character varying(1000),
    etc_answer_at character(1),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nqustnriem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nqustnriem IS 'NQUSTNRIEM';


--
-- Name: COLUMN nqustnriem.qustnr_tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.qustnr_tmplat_id IS '설문템플릿아이디';


--
-- Name: COLUMN nqustnriem.qestnr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.qestnr_id IS '설문아이디';


--
-- Name: COLUMN nqustnriem.qustnr_qesitm_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.qustnr_qesitm_id IS '설문QESITM아이디';


--
-- Name: COLUMN nqustnriem.qustnr_iem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.qustnr_iem_id IS '설문IEM아이디';


--
-- Name: COLUMN nqustnriem.iem_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.iem_sn IS 'IEM일련번호';


--
-- Name: COLUMN nqustnriem.iem_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.iem_cn IS 'IEM내용';


--
-- Name: COLUMN nqustnriem.etc_answer_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.etc_answer_at IS '기타ANSWER여부';


--
-- Name: COLUMN nqustnriem.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nqustnriem.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nqustnriem.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nqustnriem.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnriem.last_updusr_id IS '최종수정자아이디';


--
-- Name: nqustnrqesitm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nqustnrqesitm (
    qestnr_id character(20) NOT NULL,
    qustnr_qesitm_id character(20) NOT NULL,
    qustnr_tmplat_id character(20) NOT NULL,
    qestn_sn numeric(10,0),
    qestn_ty_code character(1),
    qestn_cn character varying(2500),
    mxmm_choise_co numeric(5,0),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updt_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20) NOT NULL
);


--
-- Name: TABLE nqustnrqesitm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nqustnrqesitm IS 'NQUSTNRQESITM';


--
-- Name: COLUMN nqustnrqesitm.qestnr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.qestnr_id IS '설문아이디';


--
-- Name: COLUMN nqustnrqesitm.qustnr_qesitm_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.qustnr_qesitm_id IS '설문QESITM아이디';


--
-- Name: COLUMN nqustnrqesitm.qustnr_tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.qustnr_tmplat_id IS '설문템플릿아이디';


--
-- Name: COLUMN nqustnrqesitm.qestn_sn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.qestn_sn IS 'QESTN일련번호';


--
-- Name: COLUMN nqustnrqesitm.qestn_ty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.qestn_ty_code IS 'QESTN유형코드';


--
-- Name: COLUMN nqustnrqesitm.qestn_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.qestn_cn IS 'QESTN내용';


--
-- Name: COLUMN nqustnrqesitm.mxmm_choise_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.mxmm_choise_co IS 'MXMMCHOISE수';


--
-- Name: COLUMN nqustnrqesitm.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nqustnrqesitm.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nqustnrqesitm.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nqustnrqesitm.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrqesitm.last_updusr_id IS '최종수정자아이디';


--
-- Name: nqustnrrespondinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nqustnrrespondinfo (
    qustnr_tmplat_id character(20) NOT NULL,
    qestnr_id character(20) NOT NULL,
    qustnr_respond_id character(20) NOT NULL,
    sexdstn_code character(1),
    occp_ty_code character(1),
    respond_nm character varying(50),
    brthdy character(20),
    area_no character varying(4),
    middle_telno character varying(4),
    end_telno character varying(4),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nqustnrrespondinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nqustnrrespondinfo IS 'NQUSTNRRESPONDINFO';


--
-- Name: COLUMN nqustnrrespondinfo.qustnr_tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.qustnr_tmplat_id IS '설문템플릿아이디';


--
-- Name: COLUMN nqustnrrespondinfo.qestnr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.qestnr_id IS '설문아이디';


--
-- Name: COLUMN nqustnrrespondinfo.qustnr_respond_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.qustnr_respond_id IS '설문응답아이디';


--
-- Name: COLUMN nqustnrrespondinfo.sexdstn_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.sexdstn_code IS 'SEXDSTN코드';


--
-- Name: COLUMN nqustnrrespondinfo.occp_ty_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.occp_ty_code IS 'OCCP유형코드';


--
-- Name: COLUMN nqustnrrespondinfo.respond_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.respond_nm IS '응답명';


--
-- Name: COLUMN nqustnrrespondinfo.brthdy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.brthdy IS '생년월일';


--
-- Name: COLUMN nqustnrrespondinfo.area_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.area_no IS '지역번호';


--
-- Name: COLUMN nqustnrrespondinfo.middle_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.middle_telno IS 'MIDDLE전화번호';


--
-- Name: COLUMN nqustnrrespondinfo.end_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.end_telno IS '종료전화번호';


--
-- Name: COLUMN nqustnrrespondinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nqustnrrespondinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nqustnrrespondinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nqustnrrespondinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrespondinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: nqustnrrspnsresult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nqustnrrspnsresult (
    qustnr_rspns_result_id character(20) NOT NULL,
    qestnr_id character(20) NOT NULL,
    qustnr_qesitm_id character(20) NOT NULL,
    qustnr_tmplat_id character(20) NOT NULL,
    respond_answer_cn character varying(1000),
    etc_answer_cn character varying(1000),
    respond_nm character varying(50),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    qustnr_iem_id character varying(20)
);


--
-- Name: TABLE nqustnrrspnsresult; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nqustnrrspnsresult IS 'NQUSTNRRSPNSRESULT';


--
-- Name: COLUMN nqustnrrspnsresult.qustnr_rspns_result_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.qustnr_rspns_result_id IS '설문응답RESULT아이디';


--
-- Name: COLUMN nqustnrrspnsresult.qestnr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.qestnr_id IS '설문아이디';


--
-- Name: COLUMN nqustnrrspnsresult.qustnr_qesitm_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.qustnr_qesitm_id IS '설문QESITM아이디';


--
-- Name: COLUMN nqustnrrspnsresult.qustnr_tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.qustnr_tmplat_id IS '설문템플릿아이디';


--
-- Name: COLUMN nqustnrrspnsresult.respond_answer_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.respond_answer_cn IS '응답ANSWER내용';


--
-- Name: COLUMN nqustnrrspnsresult.etc_answer_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.etc_answer_cn IS '기타ANSWER내용';


--
-- Name: COLUMN nqustnrrspnsresult.respond_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.respond_nm IS '응답명';


--
-- Name: COLUMN nqustnrrspnsresult.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nqustnrrspnsresult.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nqustnrrspnsresult.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nqustnrrspnsresult.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nqustnrrspnsresult.qustnr_iem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrrspnsresult.qustnr_iem_id IS '설문IEM아이디';


--
-- Name: nqustnrtmplat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nqustnrtmplat (
    qustnr_tmplat_id character(20) NOT NULL,
    qustnr_tmplat_ty character varying(100),
    qustnr_tmplat_dc character varying(2000),
    qustnr_tmplat_path_nm character varying(100),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    qustnr_tmplat_image_info bytea
);


--
-- Name: TABLE nqustnrtmplat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nqustnrtmplat IS 'NQUSTNRTMPLAT';


--
-- Name: COLUMN nqustnrtmplat.qustnr_tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.qustnr_tmplat_id IS '설문템플릿아이디';


--
-- Name: COLUMN nqustnrtmplat.qustnr_tmplat_ty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.qustnr_tmplat_ty IS '설문템플릿유형';


--
-- Name: COLUMN nqustnrtmplat.qustnr_tmplat_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.qustnr_tmplat_dc IS '설문템플릿설명';


--
-- Name: COLUMN nqustnrtmplat.qustnr_tmplat_path_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.qustnr_tmplat_path_nm IS '설문템플릿경로명';


--
-- Name: COLUMN nqustnrtmplat.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nqustnrtmplat.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nqustnrtmplat.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nqustnrtmplat.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nqustnrtmplat.qustnr_tmplat_image_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nqustnrtmplat.qustnr_tmplat_image_info IS '설문템플릿IMAGE정보';


--
-- Name: nrefresh_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nrefresh_token (
    user_id character varying(20) NOT NULL,
    token character varying(255) NOT NULL,
    expiry_date timestamp without time zone NOT NULL
);


--
-- Name: nreprtstats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nreprtstats (
    reprt_id character(6) NOT NULL,
    reprt_nm character varying(20) NOT NULL,
    reprt_sttus character(2) NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    reprt_ty character(2)
);


--
-- Name: TABLE nreprtstats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nreprtstats IS 'NREPRTSTATS';


--
-- Name: COLUMN nreprtstats.reprt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.reprt_id IS 'REPRT아이디';


--
-- Name: COLUMN nreprtstats.reprt_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.reprt_nm IS 'REPRT명';


--
-- Name: COLUMN nreprtstats.reprt_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.reprt_sttus IS 'REPRT상태';


--
-- Name: COLUMN nreprtstats.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nreprtstats.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nreprtstats.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nreprtstats.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nreprtstats.reprt_ty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nreprtstats.reprt_ty IS 'REPRT유형';


--
-- Name: nroleinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nroleinfo (
    role_code character varying(50) NOT NULL,
    role_nm character varying(60) NOT NULL,
    role_pttrn character varying(300),
    role_dc character varying(200),
    role_ty character varying(80),
    role_sort character varying(10),
    role_creat_de timestamp without time zone NOT NULL,
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nroleinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nroleinfo IS 'NROLEINFO';


--
-- Name: COLUMN nroleinfo.role_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroleinfo.role_code IS '역할코드';


--
-- Name: COLUMN nroleinfo.role_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroleinfo.role_nm IS '역할명';


--
-- Name: COLUMN nroleinfo.role_pttrn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroleinfo.role_pttrn IS '역할PTTRN';


--
-- Name: COLUMN nroleinfo.role_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroleinfo.role_dc IS '역할설명';


--
-- Name: COLUMN nroleinfo.role_ty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroleinfo.role_ty IS '역할유형';


--
-- Name: COLUMN nroleinfo.role_sort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroleinfo.role_sort IS '역할정렬';


--
-- Name: COLUMN nroleinfo.role_creat_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroleinfo.role_creat_de IS '역할CREAT일자';


--
-- Name: nroles_hierarchy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nroles_hierarchy (
    parnts_role character varying(30) NOT NULL,
    chldrn_role character varying(30) NOT NULL
);


--
-- Name: TABLE nroles_hierarchy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nroles_hierarchy IS 'NROLESHIERARCHY';


--
-- Name: COLUMN nroles_hierarchy.parnts_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroles_hierarchy.parnts_role IS 'PARNTS역할';


--
-- Name: COLUMN nroles_hierarchy.chldrn_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroles_hierarchy.chldrn_role IS '자녀강수량역할';


--
-- Name: nroughmap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nroughmap (
    roughmap_id character varying(75) NOT NULL,
    roughmapsj character varying(75) NOT NULL,
    roughmapaddress character varying(200),
    la character varying(48),
    lo character varying(48),
    markerla character varying(48),
    markerlo character varying(48),
    infowindow character varying(20),
    zoomlevel character varying(10),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nroughmap; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nroughmap IS 'NROUGHMAP';


--
-- Name: COLUMN nroughmap.roughmap_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.roughmap_id IS 'ROUGHMAP아이디';


--
-- Name: COLUMN nroughmap.roughmapsj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.roughmapsj IS 'ROUGHMAPSJ';


--
-- Name: COLUMN nroughmap.roughmapaddress; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.roughmapaddress IS 'ROUGHMAPADDRESS';


--
-- Name: COLUMN nroughmap.la; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.la IS 'LA';


--
-- Name: COLUMN nroughmap.lo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.lo IS 'LO';


--
-- Name: COLUMN nroughmap.markerla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.markerla IS 'MARKERLA';


--
-- Name: COLUMN nroughmap.markerlo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.markerlo IS 'MARKERLO';


--
-- Name: COLUMN nroughmap.infowindow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.infowindow IS 'INFOWINDOW';


--
-- Name: COLUMN nroughmap.zoomlevel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.zoomlevel IS 'ZOOMLEVEL';


--
-- Name: COLUMN nroughmap.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nroughmap.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nroughmap.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nroughmap.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nroughmap.last_updusr_id IS '최종수정자아이디';


--
-- Name: nrwardmanage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nrwardmanage (
    rward_id character(20) NOT NULL,
    rwardwnr_id character varying(20) NOT NULL,
    rward_code character(2) NOT NULL,
    rward_de character(20) NOT NULL,
    rward_nm character varying(255) NOT NULL,
    pblen_cn character varying(1000),
    sanctner_id character varying(20) NOT NULL,
    confm_at character(1),
    sanctn_dt timestamp without time zone,
    return_resn character varying(1000),
    atch_file_id character(20),
    infrml_sanctn_id character(20),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nrwardmanage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nrwardmanage IS '포상관리';


--
-- Name: nschdulinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nschdulinfo (
    schdul_id character(20) NOT NULL,
    schdul_se character(1),
    schdul_dept_id character varying(20),
    schdul_knd_code character(1),
    schdul_bgnde character(20),
    schdul_endde character(20),
    schdul_nm character varying(255),
    schdul_cn character varying(2500),
    schdul_place character varying(255),
    schdul_ipcr_code character(1),
    schdul_charger_id character varying(20),
    atch_file_id character(20),
    frst_regist_pnttm timestamp without time zone,
    frst_register_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    reptit_se_code character(1)
);


--
-- Name: TABLE nschdulinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nschdulinfo IS 'NSCHDULINFO';


--
-- Name: COLUMN nschdulinfo.schdul_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_id IS 'SCHDUL아이디';


--
-- Name: COLUMN nschdulinfo.schdul_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_se IS 'SCHDUL구분';


--
-- Name: COLUMN nschdulinfo.schdul_dept_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_dept_id IS 'SCHDUL부서아이디';


--
-- Name: COLUMN nschdulinfo.schdul_knd_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_knd_code IS 'SCHDUL종류코드';


--
-- Name: COLUMN nschdulinfo.schdul_bgnde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_bgnde IS 'SCHDUL시작일';


--
-- Name: COLUMN nschdulinfo.schdul_endde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_endde IS 'SCHDUL종료일';


--
-- Name: COLUMN nschdulinfo.schdul_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_nm IS 'SCHDUL명';


--
-- Name: COLUMN nschdulinfo.schdul_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_cn IS 'SCHDUL내용';


--
-- Name: COLUMN nschdulinfo.schdul_place; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_place IS 'SCHDULPLACE';


--
-- Name: COLUMN nschdulinfo.schdul_ipcr_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_ipcr_code IS 'SCHDULIP직업코드';


--
-- Name: COLUMN nschdulinfo.schdul_charger_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.schdul_charger_id IS 'SCHDULCHARGER아이디';


--
-- Name: COLUMN nschdulinfo.atch_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.atch_file_id IS '첨부파일아이디';


--
-- Name: COLUMN nschdulinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nschdulinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nschdulinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nschdulinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nschdulinfo.reptit_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nschdulinfo.reptit_se_code IS 'REPTIT구분코드';


--
-- Name: nscrap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nscrap (
    scrap_id character(20) NOT NULL,
    ntt_id numeric(20,0) NOT NULL,
    bbs_id character(30) NOT NULL,
    scrap_nm character varying(100) NOT NULL,
    use_at character(1) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(20) NOT NULL,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nscrap; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nscrap IS 'NSCRAP';


--
-- Name: COLUMN nscrap.scrap_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.scrap_id IS 'SCRAP아이디';


--
-- Name: COLUMN nscrap.ntt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.ntt_id IS 'NTT아이디';


--
-- Name: COLUMN nscrap.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nscrap.scrap_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.scrap_nm IS 'SCRAP명';


--
-- Name: COLUMN nscrap.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.use_at IS '사용여부';


--
-- Name: COLUMN nscrap.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nscrap.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nscrap.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nscrap.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nscrap.last_updusr_id IS '최종수정자아이디';


--
-- Name: nservereqpmninfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nservereqpmninfo (
    server_eqpmn_id character varying(20) NOT NULL,
    server_eqpmn_nm character varying(60),
    server_eqpmn_ip character varying(23),
    server_eqpmn_mngr character varying(60),
    mngr_email_adres character varying(50),
    opersysm_info character varying(2000),
    cpu_info character varying(2000),
    mory_info character varying(2000),
    hddisk character(18),
    etc_info character varying(250),
    rgsde timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nservereqpmninfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nservereqpmninfo IS 'NSERVEREQPMNINFO';


--
-- Name: COLUMN nservereqpmninfo.server_eqpmn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.server_eqpmn_id IS 'SERVEREQPMN아이디';


--
-- Name: COLUMN nservereqpmninfo.server_eqpmn_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.server_eqpmn_nm IS 'SERVEREQPMN명';


--
-- Name: COLUMN nservereqpmninfo.server_eqpmn_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.server_eqpmn_ip IS 'SERVEREQPMNIP';


--
-- Name: COLUMN nservereqpmninfo.server_eqpmn_mngr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.server_eqpmn_mngr IS 'SERVEREQPMN관리자';


--
-- Name: COLUMN nservereqpmninfo.mngr_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.mngr_email_adres IS '관리자이메일주소';


--
-- Name: COLUMN nservereqpmninfo.opersysm_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.opersysm_info IS 'OPERSYSM정보';


--
-- Name: COLUMN nservereqpmninfo.cpu_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.cpu_info IS 'CPU정보';


--
-- Name: COLUMN nservereqpmninfo.mory_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.mory_info IS 'MORY정보';


--
-- Name: COLUMN nservereqpmninfo.hddisk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.hddisk IS 'HDDISK';


--
-- Name: COLUMN nservereqpmninfo.etc_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.etc_info IS '기타정보';


--
-- Name: COLUMN nservereqpmninfo.rgsde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.rgsde IS 'RGSDE';


--
-- Name: COLUMN nservereqpmninfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nservereqpmninfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nservereqpmninfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nservereqpmninfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nservereqpmninfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: nserverinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nserverinfo (
    server_id character(20) NOT NULL,
    server_nm character varying(60),
    server_knd character(2),
    rgsde timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nserverinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nserverinfo IS 'NSERVERINFO';


--
-- Name: COLUMN nserverinfo.server_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.server_id IS 'SERVER아이디';


--
-- Name: COLUMN nserverinfo.server_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.server_nm IS 'SERVER명';


--
-- Name: COLUMN nserverinfo.server_knd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.server_knd IS 'SERVER종류';


--
-- Name: COLUMN nserverinfo.rgsde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.rgsde IS 'RGSDE';


--
-- Name: COLUMN nserverinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nserverinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nserverinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nserverinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: nserverresrceloginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nserverresrceloginfo (
    server_eqpmn_id character varying(20) NOT NULL,
    cpu_use_rt numeric(3,0),
    mory_use_rt numeric(3,0),
    svc_sttus character(2),
    log_info character varying(2000),
    creat_dt timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    server_id character(20) NOT NULL,
    last_updt_pnttm timestamp without time zone,
    log_id character(20) NOT NULL
);


--
-- Name: TABLE nserverresrceloginfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nserverresrceloginfo IS 'NSERVERRESRCELOGINFO';


--
-- Name: COLUMN nserverresrceloginfo.server_eqpmn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.server_eqpmn_id IS 'SERVEREQPMN아이디';


--
-- Name: COLUMN nserverresrceloginfo.cpu_use_rt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.cpu_use_rt IS 'CPU사용비율';


--
-- Name: COLUMN nserverresrceloginfo.mory_use_rt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.mory_use_rt IS 'MORY사용비율';


--
-- Name: COLUMN nserverresrceloginfo.svc_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.svc_sttus IS '봉사상태';


--
-- Name: COLUMN nserverresrceloginfo.log_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.log_info IS '로그정보';


--
-- Name: COLUMN nserverresrceloginfo.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN nserverresrceloginfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nserverresrceloginfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nserverresrceloginfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nserverresrceloginfo.server_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.server_id IS 'SERVER아이디';


--
-- Name: COLUMN nserverresrceloginfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nserverresrceloginfo.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nserverresrceloginfo.log_id IS '로그아이디';


--
-- Name: nsitemap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nsitemap (
    mapng_creat_id character varying(30) NOT NULL,
    creatr_id character varying(20) NOT NULL,
    mapng_file_nm character varying(60) NOT NULL,
    mapng_file_path character varying(100) NOT NULL
);


--
-- Name: TABLE nsitemap; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nsitemap IS 'NSITEMAP';


--
-- Name: COLUMN nsitemap.mapng_creat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsitemap.mapng_creat_id IS 'MAPNGCREAT아이디';


--
-- Name: COLUMN nsitemap.creatr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsitemap.creatr_id IS '생성자아이디';


--
-- Name: COLUMN nsitemap.mapng_file_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsitemap.mapng_file_nm IS 'MAPNG파일명';


--
-- Name: COLUMN nsitemap.mapng_file_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsitemap.mapng_file_path IS 'MAPNG파일경로';


--
-- Name: nsms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nsms (
    sms_id character(20) NOT NULL,
    trnsmis_telno character varying(12) NOT NULL,
    trnsmis_cn character varying(80) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    frst_register_id character varying(20) NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nsms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nsms IS 'NSMS';


--
-- Name: COLUMN nsms.sms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsms.sms_id IS 'SMS아이디';


--
-- Name: COLUMN nsms.trnsmis_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsms.trnsmis_telno IS 'TRNSMIS전화번호';


--
-- Name: COLUMN nsms.trnsmis_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsms.trnsmis_cn IS 'TRNSMIS내용';


--
-- Name: COLUMN nsms.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsms.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nsms.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsms.frst_register_id IS '최초등록자아이디';


--
-- Name: nsmsrecptn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nsmsrecptn (
    sms_id character(20) NOT NULL,
    recptn_telno character varying(12) NOT NULL,
    result_code character varying(4),
    result_mssage character varying(4000)
);


--
-- Name: TABLE nsmsrecptn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nsmsrecptn IS 'NSMSRECPTN';


--
-- Name: COLUMN nsmsrecptn.sms_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsmsrecptn.sms_id IS 'SMS아이디';


--
-- Name: COLUMN nsmsrecptn.recptn_telno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsmsrecptn.recptn_telno IS 'RECPTN전화번호';


--
-- Name: COLUMN nsmsrecptn.result_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsmsrecptn.result_code IS 'RESULT코드';


--
-- Name: COLUMN nsmsrecptn.result_mssage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsmsrecptn.result_mssage IS 'RESULTMSSAGE';


--
-- Name: nstsfdg; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nstsfdg (
    stsfdg_no numeric(20,0) NOT NULL,
    ntt_id numeric(20,0) NOT NULL,
    bbs_id character(30) NOT NULL,
    wrter_id character varying(20),
    wrter_nm character varying(20),
    password character varying(200),
    stsfdg numeric(1,0) NOT NULL,
    stsfdg_cn character varying(200),
    use_at character(1) NOT NULL,
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updt_pnttm timestamp without time zone,
    frst_register_id character varying(20) NOT NULL,
    last_updusr_id character varying(20)
);


--
-- Name: TABLE nstsfdg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nstsfdg IS 'NSTSFDG';


--
-- Name: COLUMN nstsfdg.stsfdg_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.stsfdg_no IS 'STSFDG번호';


--
-- Name: COLUMN nstsfdg.ntt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.ntt_id IS 'NTT아이디';


--
-- Name: COLUMN nstsfdg.bbs_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.bbs_id IS '게시판아이디';


--
-- Name: COLUMN nstsfdg.wrter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.wrter_id IS 'WRTER아이디';


--
-- Name: COLUMN nstsfdg.wrter_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.wrter_nm IS 'WRTER명';


--
-- Name: COLUMN nstsfdg.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.password IS '비밀번호';


--
-- Name: COLUMN nstsfdg.stsfdg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.stsfdg IS 'STSFDG';


--
-- Name: COLUMN nstsfdg.stsfdg_cn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.stsfdg_cn IS 'STSFDG내용';


--
-- Name: COLUMN nstsfdg.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.use_at IS '사용여부';


--
-- Name: COLUMN nstsfdg.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nstsfdg.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.last_updt_pnttm IS '최종수정시점';


--
-- Name: COLUMN nstsfdg.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nstsfdg.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nstsfdg.last_updusr_id IS '최종수정자아이디';


--
-- Name: nsynchrnserverinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nsynchrnserverinfo (
    server_id character(20) NOT NULL,
    server_nm character varying(60),
    server_ip character varying(23),
    server_port character varying(10),
    ftp_id character varying(20),
    ftp_password character varying(20),
    synchrn_lc character varying(255),
    reflct_at character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nsynchrnserverinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nsynchrnserverinfo IS 'NSYNCHRNSERVERINFO';


--
-- Name: COLUMN nsynchrnserverinfo.server_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.server_id IS 'SERVER아이디';


--
-- Name: COLUMN nsynchrnserverinfo.server_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.server_nm IS 'SERVER명';


--
-- Name: COLUMN nsynchrnserverinfo.server_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.server_ip IS 'SERVERIP';


--
-- Name: COLUMN nsynchrnserverinfo.server_port; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.server_port IS 'SERVER포트';


--
-- Name: COLUMN nsynchrnserverinfo.ftp_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.ftp_id IS 'FTP아이디';


--
-- Name: COLUMN nsynchrnserverinfo.ftp_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.ftp_password IS 'FTP비밀번호';


--
-- Name: COLUMN nsynchrnserverinfo.synchrn_lc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.synchrn_lc IS 'SYNCHRN위치';


--
-- Name: COLUMN nsynchrnserverinfo.reflct_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.reflct_at IS '반영여부';


--
-- Name: COLUMN nsynchrnserverinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nsynchrnserverinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nsynchrnserverinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nsynchrnserverinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsynchrnserverinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: nsyslog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nsyslog (
    requst_id character varying(20) NOT NULL,
    job_se_code character(3),
    instt_code character(7),
    occrrnc_de timestamp without time zone,
    rqester_ip character varying(23),
    rqester_id character varying(20),
    trget_menu_nm character varying(255),
    svc_nm character varying(255),
    method_nm character varying(60),
    process_se_code character(3),
    process_co numeric(10,0),
    process_time character varying(14),
    rspns_code character(3),
    error_se character(1),
    error_co numeric(10,0),
    error_code character(3),
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nsyslog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nsyslog IS 'NSYSLOG';


--
-- Name: COLUMN nsyslog.requst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.requst_id IS 'REQUST아이디';


--
-- Name: COLUMN nsyslog.job_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.job_se_code IS '작업구분코드';


--
-- Name: COLUMN nsyslog.instt_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.instt_code IS 'INSTT코드';


--
-- Name: COLUMN nsyslog.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN nsyslog.rqester_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.rqester_ip IS 'RQESTERIP';


--
-- Name: COLUMN nsyslog.rqester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.rqester_id IS 'RQESTER아이디';


--
-- Name: COLUMN nsyslog.trget_menu_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.trget_menu_nm IS 'TRGET메뉴명';


--
-- Name: COLUMN nsyslog.svc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.svc_nm IS '봉사명';


--
-- Name: COLUMN nsyslog.method_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.method_nm IS 'METHOD명';


--
-- Name: COLUMN nsyslog.process_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.process_se_code IS 'PROCESS구분코드';


--
-- Name: COLUMN nsyslog.process_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.process_co IS 'PROCESS수';


--
-- Name: COLUMN nsyslog.process_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.process_time IS 'PROCESSTIME';


--
-- Name: COLUMN nsyslog.rspns_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.rspns_code IS '응답코드';


--
-- Name: COLUMN nsyslog.error_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.error_se IS 'ERROR구분';


--
-- Name: COLUMN nsyslog.error_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.error_co IS 'ERROR수';


--
-- Name: COLUMN nsyslog.error_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nsyslog.error_code IS 'ERROR코드';


--
-- Name: ntmplatinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ntmplatinfo (
    tmplat_id character(20) NOT NULL,
    tmplat_nm character varying(255),
    tmplat_cours character varying(2000),
    use_at character(1),
    tmplat_se_code character(6),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ntmplatinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ntmplatinfo IS 'NTMPLATINFO';


--
-- Name: COLUMN ntmplatinfo.tmplat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.tmplat_id IS '템플릿아이디';


--
-- Name: COLUMN ntmplatinfo.tmplat_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.tmplat_nm IS '템플릿명';


--
-- Name: COLUMN ntmplatinfo.tmplat_cours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.tmplat_cours IS '템플릿COURS';


--
-- Name: COLUMN ntmplatinfo.use_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.use_at IS '사용여부';


--
-- Name: COLUMN ntmplatinfo.tmplat_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.tmplat_se_code IS '템플릿구분코드';


--
-- Name: COLUMN ntmplatinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ntmplatinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ntmplatinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ntmplatinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntmplatinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: ntroblinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ntroblinfo (
    trobl_id character(20) NOT NULL,
    trobl_nm character varying(60),
    trobl_knd character(2),
    trobl_dc character varying(2000),
    trobl_occrrnc_time character varying(14),
    trobl_rqester_nm character varying(60),
    trobl_requst_time character varying(14),
    trobl_process_result character varying(2000),
    trobl_opetr_nm character varying(60),
    trobl_process_time character varying(14),
    process_sttus character(1),
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE ntroblinfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ntroblinfo IS 'NTROBLINFO';


--
-- Name: COLUMN ntroblinfo.trobl_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_id IS 'TROBL아이디';


--
-- Name: COLUMN ntroblinfo.trobl_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_nm IS 'TROBL명';


--
-- Name: COLUMN ntroblinfo.trobl_knd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_knd IS 'TROBL종류';


--
-- Name: COLUMN ntroblinfo.trobl_dc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_dc IS 'TROBL설명';


--
-- Name: COLUMN ntroblinfo.trobl_occrrnc_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_occrrnc_time IS 'TROBLOCCRRNCTIME';


--
-- Name: COLUMN ntroblinfo.trobl_rqester_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_rqester_nm IS 'TROBLRQESTER명';


--
-- Name: COLUMN ntroblinfo.trobl_requst_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_requst_time IS 'TROBLREQUSTTIME';


--
-- Name: COLUMN ntroblinfo.trobl_process_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_process_result IS 'TROBLPROCESSRESULT';


--
-- Name: COLUMN ntroblinfo.trobl_opetr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_opetr_nm IS 'TROBLOPETR명';


--
-- Name: COLUMN ntroblinfo.trobl_process_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.trobl_process_time IS 'TROBLPROCESSTIME';


--
-- Name: COLUMN ntroblinfo.process_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.process_sttus IS 'PROCESS상태';


--
-- Name: COLUMN ntroblinfo.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ntroblinfo.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ntroblinfo.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ntroblinfo.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntroblinfo.last_updt_pnttm IS '최종수정시점';


--
-- Name: ntrsmrcvlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ntrsmrcvlog (
    requst_id character varying(20) NOT NULL,
    occrrnc_de character(20),
    trsmrcv_se_code character(3),
    cntc_id character(8),
    provd_instt_id character(8),
    provd_sys_id character(8),
    provd_svc_id character(8),
    requst_instt_id character(8),
    requst_sys_id character(8),
    requst_trnsmit_tm character varying(14),
    requst_recptn_tm character varying(14),
    rspns_trnsmit_tm character varying(14),
    rspns_recptn_tm character varying(14),
    result_code character varying(4),
    result_mssage character varying(4000),
    frst_regist_pnttm timestamp without time zone,
    rqester_id character varying(20)
);


--
-- Name: TABLE ntrsmrcvlog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ntrsmrcvlog IS 'NTRSMRCVLOG';


--
-- Name: COLUMN ntrsmrcvlog.requst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.requst_id IS 'REQUST아이디';


--
-- Name: COLUMN ntrsmrcvlog.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN ntrsmrcvlog.trsmrcv_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.trsmrcv_se_code IS '전송수령구분코드';


--
-- Name: COLUMN ntrsmrcvlog.cntc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.cntc_id IS '접촉아이디';


--
-- Name: COLUMN ntrsmrcvlog.provd_instt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.provd_instt_id IS 'PROVDINSTT아이디';


--
-- Name: COLUMN ntrsmrcvlog.provd_sys_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.provd_sys_id IS 'PROVD시스템아이디';


--
-- Name: COLUMN ntrsmrcvlog.provd_svc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.provd_svc_id IS 'PROVD봉사아이디';


--
-- Name: COLUMN ntrsmrcvlog.requst_instt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.requst_instt_id IS 'REQUSTINSTT아이디';


--
-- Name: COLUMN ntrsmrcvlog.requst_sys_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.requst_sys_id IS 'REQUST시스템아이디';


--
-- Name: COLUMN ntrsmrcvlog.requst_trnsmit_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.requst_trnsmit_tm IS 'REQUSTTRNSMIT시각';


--
-- Name: COLUMN ntrsmrcvlog.requst_recptn_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.requst_recptn_tm IS 'REQUSTRECPTN시각';


--
-- Name: COLUMN ntrsmrcvlog.rspns_trnsmit_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.rspns_trnsmit_tm IS '응답TRNSMIT시각';


--
-- Name: COLUMN ntrsmrcvlog.rspns_recptn_tm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.rspns_recptn_tm IS '응답RECPTN시각';


--
-- Name: COLUMN ntrsmrcvlog.result_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.result_code IS 'RESULT코드';


--
-- Name: COLUMN ntrsmrcvlog.result_mssage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.result_mssage IS 'RESULTMSSAGE';


--
-- Name: COLUMN ntrsmrcvlog.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ntrsmrcvlog.rqester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvlog.rqester_id IS 'RQESTER아이디';


--
-- Name: ntrsmrcvmntrng; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ntrsmrcvmntrng (
    cntc_id character(8) NOT NULL,
    test_class_nm character varying(255),
    mngr_nm character varying(60),
    mngr_email_adres character varying(50),
    mntrng_sttus character(2),
    creat_dt timestamp without time zone,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone NOT NULL,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone NOT NULL
);


--
-- Name: TABLE ntrsmrcvmntrng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ntrsmrcvmntrng IS 'NTRSMRCVMNTRNG';


--
-- Name: COLUMN ntrsmrcvmntrng.cntc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.cntc_id IS '접촉아이디';


--
-- Name: COLUMN ntrsmrcvmntrng.test_class_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.test_class_nm IS '시험CLASS명';


--
-- Name: COLUMN ntrsmrcvmntrng.mngr_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.mngr_nm IS '관리자명';


--
-- Name: COLUMN ntrsmrcvmntrng.mngr_email_adres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.mngr_email_adres IS '관리자이메일주소';


--
-- Name: COLUMN ntrsmrcvmntrng.mntrng_sttus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.mntrng_sttus IS 'MNTRNG상태';


--
-- Name: COLUMN ntrsmrcvmntrng.creat_dt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.creat_dt IS 'CREAT일시';


--
-- Name: COLUMN ntrsmrcvmntrng.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN ntrsmrcvmntrng.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN ntrsmrcvmntrng.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN ntrsmrcvmntrng.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ntrsmrcvmntrng.last_updt_pnttm IS '최종수정시점';


--
-- Name: ntt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ntt_id_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nuserabsnce; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nuserabsnce (
    emplyr_id character varying(20) NOT NULL,
    user_absnce_at character(1) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nuserabsnce; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nuserabsnce IS 'NUSERABSNCE';


--
-- Name: COLUMN nuserabsnce.emplyr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserabsnce.emplyr_id IS '사용자아이디';


--
-- Name: COLUMN nuserabsnce.user_absnce_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserabsnce.user_absnce_at IS '사용자ABSNCE여부';


--
-- Name: COLUMN nuserabsnce.frst_register_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserabsnce.frst_register_id IS '최초등록자아이디';


--
-- Name: COLUMN nuserabsnce.frst_regist_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserabsnce.frst_regist_pnttm IS '최초등록시점';


--
-- Name: COLUMN nuserabsnce.last_updusr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserabsnce.last_updusr_id IS '최종수정자아이디';


--
-- Name: COLUMN nuserabsnce.last_updt_pnttm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserabsnce.last_updt_pnttm IS '최종수정시점';


--
-- Name: nuserlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nuserlog (
    occrrnc_de character(8) NOT NULL,
    rqester_id character varying(20) NOT NULL,
    svc_nm character varying(255) NOT NULL,
    method_nm character varying(60) NOT NULL,
    creat_co numeric(10,0),
    updt_co numeric(10,0),
    rdcnt numeric(10,0),
    delete_co numeric(10,0),
    outpt_co numeric(10,0),
    error_co numeric(10,0)
);


--
-- Name: TABLE nuserlog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nuserlog IS 'NUSERLOG';


--
-- Name: COLUMN nuserlog.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN nuserlog.rqester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.rqester_id IS 'RQESTER아이디';


--
-- Name: COLUMN nuserlog.svc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.svc_nm IS '봉사명';


--
-- Name: COLUMN nuserlog.method_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.method_nm IS 'METHOD명';


--
-- Name: COLUMN nuserlog.creat_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.creat_co IS 'CREAT수';


--
-- Name: COLUMN nuserlog.updt_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.updt_co IS '수정수';


--
-- Name: COLUMN nuserlog.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.rdcnt IS 'RDCNT';


--
-- Name: COLUMN nuserlog.delete_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.delete_co IS 'DELETE수';


--
-- Name: COLUMN nuserlog.outpt_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.outpt_co IS 'OUTPT수';


--
-- Name: COLUMN nuserlog.error_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nuserlog.error_co IS 'ERROR수';


--
-- Name: nweblog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nweblog (
    requst_id character varying(20) NOT NULL,
    occrrnc_de timestamp without time zone,
    url character varying(200),
    rqester_id character varying(20),
    rqester_ip character varying(23),
    frst_register_id character varying(20),
    last_updusr_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updt_pnttm timestamp without time zone
);


--
-- Name: TABLE nweblog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nweblog IS 'NWEBLOG';


--
-- Name: COLUMN nweblog.requst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nweblog.requst_id IS 'REQUST아이디';


--
-- Name: COLUMN nweblog.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nweblog.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN nweblog.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nweblog.url IS 'URL';


--
-- Name: COLUMN nweblog.rqester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nweblog.rqester_id IS 'RQESTER아이디';


--
-- Name: COLUMN nweblog.rqester_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nweblog.rqester_ip IS 'RQESTERIP';


--
-- Name: revinfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revinfo (
    rev integer NOT NULL,
    revtstmp bigint
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
-- Name: sbbssummary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sbbssummary (
    occrrnc_de character(20) NOT NULL,
    stats_se character varying(10) NOT NULL,
    detail_stats_se character varying(10) NOT NULL,
    creat_co numeric(10,0),
    tot_rdcnt numeric(10,0),
    avrg_rdcnt numeric(10,0),
    top_inqire_bbsctt_id character varying(20),
    mumm_inqire_bbsctt_id character varying(20),
    top_ntcr_id character varying(20)
);


--
-- Name: TABLE sbbssummary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sbbssummary IS 'SBBSSUMMARY';


--
-- Name: COLUMN sbbssummary.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN sbbssummary.stats_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.stats_se IS '통계구분';


--
-- Name: COLUMN sbbssummary.detail_stats_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.detail_stats_se IS 'DETAIL통계구분';


--
-- Name: COLUMN sbbssummary.creat_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.creat_co IS 'CREAT수';


--
-- Name: COLUMN sbbssummary.tot_rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.tot_rdcnt IS '집계RDCNT';


--
-- Name: COLUMN sbbssummary.avrg_rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.avrg_rdcnt IS 'AVRGRDCNT';


--
-- Name: COLUMN sbbssummary.top_inqire_bbsctt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.top_inqire_bbsctt_id IS 'TOPINQIREBBSCTT아이디';


--
-- Name: COLUMN sbbssummary.mumm_inqire_bbsctt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.mumm_inqire_bbsctt_id IS 'MUMMINQIREBBSCTT아이디';


--
-- Name: COLUMN sbbssummary.top_ntcr_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sbbssummary.top_ntcr_id IS 'TOPNTCR아이디';


--
-- Name: ssyslogsummary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ssyslogsummary (
    occrrnc_de character(8) NOT NULL,
    svc_nm character varying(255) NOT NULL,
    method_nm character varying(60) NOT NULL,
    creat_co numeric(10,0),
    updt_co numeric(10,0),
    rdcnt numeric(10,0),
    delete_co numeric(10,0),
    outpt_co numeric(10,0),
    error_co numeric(10,0)
);


--
-- Name: TABLE ssyslogsummary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ssyslogsummary IS 'SSYSLOGSUMMARY';


--
-- Name: COLUMN ssyslogsummary.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN ssyslogsummary.svc_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.svc_nm IS '봉사명';


--
-- Name: COLUMN ssyslogsummary.method_nm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.method_nm IS 'METHOD명';


--
-- Name: COLUMN ssyslogsummary.creat_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.creat_co IS 'CREAT수';


--
-- Name: COLUMN ssyslogsummary.updt_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.updt_co IS '수정수';


--
-- Name: COLUMN ssyslogsummary.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.rdcnt IS 'RDCNT';


--
-- Name: COLUMN ssyslogsummary.delete_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.delete_co IS 'DELETE수';


--
-- Name: COLUMN ssyslogsummary.outpt_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.outpt_co IS 'OUTPT수';


--
-- Name: COLUMN ssyslogsummary.error_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ssyslogsummary.error_co IS 'ERROR수';


--
-- Name: strsmrcvlogsummary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strsmrcvlogsummary (
    occrrnc_de character(20) NOT NULL,
    trsmrcv_se_code character(3) NOT NULL,
    provd_instt_id character(8) NOT NULL,
    provd_sys_id character(8) NOT NULL,
    provd_svc_id character(8) NOT NULL,
    requst_instt_id character(8) NOT NULL,
    requst_sys_id character(8) NOT NULL,
    rdcnt numeric(10,0),
    error_co numeric(10,0)
);


--
-- Name: TABLE strsmrcvlogsummary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.strsmrcvlogsummary IS 'STRSMRCVLOGSUMMARY';


--
-- Name: COLUMN strsmrcvlogsummary.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN strsmrcvlogsummary.trsmrcv_se_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.trsmrcv_se_code IS '전송수령구분코드';


--
-- Name: COLUMN strsmrcvlogsummary.provd_instt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.provd_instt_id IS 'PROVDINSTT아이디';


--
-- Name: COLUMN strsmrcvlogsummary.provd_sys_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.provd_sys_id IS 'PROVD시스템아이디';


--
-- Name: COLUMN strsmrcvlogsummary.provd_svc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.provd_svc_id IS 'PROVD봉사아이디';


--
-- Name: COLUMN strsmrcvlogsummary.requst_instt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.requst_instt_id IS 'REQUSTINSTT아이디';


--
-- Name: COLUMN strsmrcvlogsummary.requst_sys_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.requst_sys_id IS 'REQUST시스템아이디';


--
-- Name: COLUMN strsmrcvlogsummary.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.rdcnt IS 'RDCNT';


--
-- Name: COLUMN strsmrcvlogsummary.error_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.strsmrcvlogsummary.error_co IS 'ERROR수';


--
-- Name: susersummary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.susersummary (
    occrrnc_de character(20) NOT NULL,
    stats_se character varying(10) NOT NULL,
    detail_stats_se character varying(10) NOT NULL,
    user_co numeric(10,0)
);


--
-- Name: TABLE susersummary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.susersummary IS 'SUSERSUMMARY';


--
-- Name: COLUMN susersummary.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.susersummary.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN susersummary.stats_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.susersummary.stats_se IS '통계구분';


--
-- Name: COLUMN susersummary.detail_stats_se; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.susersummary.detail_stats_se IS 'DETAIL통계구분';


--
-- Name: COLUMN susersummary.user_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.susersummary.user_co IS '사용자수';


--
-- Name: sweblogsummary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sweblogsummary (
    occrrnc_de character(8) NOT NULL,
    url character varying(200) NOT NULL,
    rdcnt numeric(10,0)
);


--
-- Name: TABLE sweblogsummary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sweblogsummary IS 'SWEBLOGSUMMARY';


--
-- Name: COLUMN sweblogsummary.occrrnc_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sweblogsummary.occrrnc_de IS 'OCCRRNC일자';


--
-- Name: COLUMN sweblogsummary.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sweblogsummary.url IS 'URL';


--
-- Name: COLUMN sweblogsummary.rdcnt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sweblogsummary.rdcnt IS 'RDCNT';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: cadministcode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cadministcode (administ_zone_se, administ_zone_code, use_at, administ_zone_nm, upper_administ_zone_code, creat_de, abl_de, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: cadministcoderecptnlog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cadministcoderecptnlog (occrrnc_de, administ_zone_se, administ_zone_code, opert_sn, change_se_code, process_se, administ_zone_nm, lowest_administ_zone_nm, ctprvn_code, signgu_code, emd_code, li_code, creat_de, abl_de, abl_ennc, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ccmmnclcode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ccmmnclcode (cl_code, cl_code_nm, cl_code_dc, use_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
EFC	전자정부 프레임워크 공통서비스	전자정부 프레임워크 공통서비스	Y	2025-12-29 01:39:40.572061	SYSTEM	2025-12-29 01:39:40.572061	SYSTEM
\.


--
-- Data for Name: ccmmncode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ccmmncode (code_id, code_id_nm, code_id_dc, use_at, cl_code, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
COM001	등록구분	게시판, 커뮤니티, 동호회 등록구분코드	Y	EFC	2025-12-29 01:39:40.573576	SYSTEM	2025-12-29 01:39:40.573576	SYSTEM
COM002	이력구분	시스템이력등록구분	Y	EFC	2025-12-29 01:39:40.575477	SYSTEM	2025-12-29 01:39:40.575477	SYSTEM
COM003	업무구분	업무구분코드	Y	EFC	2025-12-29 01:39:40.576387	SYSTEM	2025-12-29 01:39:40.576387	SYSTEM
COM005	템플릿유형	템플릿유형구분코드	Y	EFC	2025-12-29 01:39:40.577216	SYSTEM	2025-12-29 01:39:40.577216	SYSTEM
COM006	승인유형	동호회, 커뮤니티 승인 유형	Y	EFC	2025-12-29 01:39:40.57798	SYSTEM	2025-12-29 01:39:40.57798	SYSTEM
COM007	승인상태	동호회, 커뮤니티 승인 상태	Y	EFC	2025-12-29 01:39:40.578754	SYSTEM	2025-12-29 01:39:40.578754	SYSTEM
COM008	처리상태	송수신 요청의 처리상태	Y	EFC	2025-12-29 01:39:40.579719	SYSTEM	2025-12-29 01:39:40.579719	SYSTEM
COM009	게시판속성	게시판 속성	Y	EFC	2025-12-29 01:39:40.58057	SYSTEM	2025-12-29 01:39:40.58057	SYSTEM
COM010	권한유형	시스템을 사용하기 위한 권한 구분	Y	EFC	2025-12-29 01:39:40.581321	SYSTEM	2025-12-29 01:39:40.581321	SYSTEM
COM011	롤유형	시스템의 기능을 사용하기 위한 롤 구분	Y	EFC	2025-12-29 01:39:40.582047	SYSTEM	2025-12-29 01:39:40.582047	SYSTEM
COM012	회원유형	일반/기업/업무담당자를 구현하기 위한 사용자 구분	Y	EFC	2025-12-29 01:39:40.582911	SYSTEM	2025-12-29 01:39:40.582911	SYSTEM
COM013	회원상태	회원 가입 신청/승인/삭제를 위한 상태 구분	Y	EFC	2025-12-29 01:39:40.583788	SYSTEM	2025-12-29 01:39:40.583788	SYSTEM
COM014	성별구분	남녀 성별 구분	Y	EFC	2025-12-29 01:39:40.584664	SYSTEM	2025-12-29 01:39:40.584664	SYSTEM
COM015	인증방식유형	주민등록번호 인증, Gpin 인증과 같은 사용자 인증 구분	Y	EFC	2025-12-29 01:39:40.585425	SYSTEM	2025-12-29 01:39:40.585425	SYSTEM
COM016	변경요청처리 상태	프로그램 변경의 요청/처리 등의 변경요청 상태 구분	Y	EFC	2025-12-29 01:39:40.586267	SYSTEM	2025-12-29 01:39:40.586267	SYSTEM
COM017	휴일구분	휴일의 구분	Y	EFC	2025-12-29 01:39:40.587308	SYSTEM	2025-12-29 01:39:40.587308	SYSTEM
COM018	질문유형	질문유형 객관식/주관식 상태구분	Y	EFC	2025-12-29 01:39:40.588376	SYSTEM	2025-12-29 01:39:40.588376	SYSTEM
COM019	일정중요도	일정중요도 낮음/보통/높음 상태구분	Y	EFC	2025-12-29 01:39:40.589304	SYSTEM	2025-12-29 01:39:40.589304	SYSTEM
COM020	일정구분	일정구분 부서일지정보/일지정보 상태구분	Y	EFC	2025-12-29 01:39:40.590276	SYSTEM	2025-12-29 01:39:40.590276	SYSTEM
COM021	도움말구분	도움말 설명 구분코드	Y	EFC	2025-12-29 01:39:40.591177	SYSTEM	2025-12-29 01:39:40.591177	SYSTEM
COM022	비밀번호 힌트	비밀번호 힌트 구분코드	Y	EFC	2025-12-29 01:39:40.591913	SYSTEM	2025-12-29 01:39:40.591913	SYSTEM
COM023	사이트주제분류	사이트주제분류 설명 구분코드	Y	EFC	2025-12-29 01:39:40.592641	SYSTEM	2025-12-29 01:39:40.592641	SYSTEM
COM024	발송결과구분	발송메일 수신결과 구분 코드	Y	EFC	2025-12-29 01:39:40.593428	SYSTEM	2025-12-29 01:39:40.593428	SYSTEM
COM025	소속기관	소속기관정보를 관리할때 사용하는 구분코드(시스템별로 재정의)	Y	EFC	2025-12-29 01:39:40.594302	SYSTEM	2025-12-29 01:39:40.594302	SYSTEM
COM026	기업구분	기업구분정보를 관리할때 사용하는 구분코드(시스템별로 재정의)	Y	EFC	2025-12-29 01:39:40.595054	SYSTEM	2025-12-29 01:39:40.595054	SYSTEM
COM027	업종	대표업종코드(시스템별로 재정의)	Y	EFC	2025-12-29 01:39:40.595819	SYSTEM	2025-12-29 01:39:40.595819	SYSTEM
COM028	질의응답처리상태	Q/A 처리상태코드	Y	EFC	2025-12-29 01:39:40.59672	SYSTEM	2025-12-29 01:39:40.59672	SYSTEM
COM029	롤유형코드		Y	EFC	2025-12-29 01:39:40.59746	SYSTEM	2025-12-29 01:39:40.59746	SYSTEM
COM030	일정구분	일정구분 코드	Y	EFC	2025-12-29 01:39:40.59826	SYSTEM	2025-12-29 01:39:40.59826	SYSTEM
COM031	반복구분	일정 반복구분 코드	Y	EFC	2025-12-29 01:39:40.599028	SYSTEM	2025-12-29 01:39:40.599028	SYSTEM
COM032	작업유형	승인이력 작업유형	Y	EFC	2025-12-29 01:39:40.600019	SYSTEM	2025-12-29 01:39:40.600019	SYSTEM
COM033	시스템로그구분		Y	EFC	2025-12-29 01:39:40.600792	SYSTEM	2025-12-29 01:39:40.600792	SYSTEM
COM034	직업유형	직업유형코드	Y	EFC	2025-12-29 01:39:40.601721	SYSTEM	2025-12-29 01:39:40.601721	SYSTEM
COM035	행사유형	행사/이벤트/캠페인 구분	Y	EFC	2025-12-29 01:39:40.602648	SYSTEM	2025-12-29 01:39:40.602648	SYSTEM
COM036	보고서 진행상태코드	보고서의 진행상태를 코드화 하여 관리한다.	Y	EFC	2025-12-29 01:39:40.603595	SYSTEM	2025-12-29 01:39:40.603595	SYSTEM
COM038	온라인POLL페기유무	온라인POLL-온라인POLL페기유무	Y	EFC	2025-12-29 01:39:40.60452	SYSTEM	2025-12-29 01:39:40.60452	SYSTEM
COM039	온라인POLL구분	온라인POLL-온온라인POLL구분	Y	EFC	2025-12-29 01:39:40.60538	SYSTEM	2025-12-29 01:39:40.60538	SYSTEM
COM040	보고서 종류코드	보고서 종류코드	Y	EFC	2025-12-29 01:39:40.60627	SYSTEM	2025-12-29 01:39:40.60627	SYSTEM
COM041	온라인메뉴얼구분	온라인메누얼-온라인메뉴얼구분	Y	EFC	2025-12-29 01:39:40.607321	SYSTEM	2025-12-29 01:39:40.607321	SYSTEM
COM042	보고서통계기간구분	보고서통계기간구분	Y	EFC	2025-12-29 01:39:40.608096	SYSTEM	2025-12-29 01:39:40.608096	SYSTEM
COM043	기관코드변경구분	기관코드변경구분	Y	EFC	2025-12-29 01:39:40.608857	SYSTEM	2025-12-29 01:39:40.608857	SYSTEM
COM044	기관코드수신처리구분	기관코드수신처리구분	Y	EFC	2025-12-29 01:39:40.609635	SYSTEM	2025-12-29 01:39:40.609635	SYSTEM
COM045	사용여부	사용여부	Y	EFC	2025-12-29 01:39:40.610408	SYSTEM	2025-12-29 01:39:40.610408	SYSTEM
COM046	모니터링상태구분	모니터링상태구분	Y	EFC	2025-12-29 01:39:40.61141	SYSTEM	2025-12-29 01:39:40.61141	SYSTEM
COM047	실행주기구분	실행주기구분	Y	EFC	2025-12-29 01:39:40.612479	SYSTEM	2025-12-29 01:39:40.612479	SYSTEM
COM048	DBMS종류	DBMS종류	Y	EFC	2025-12-29 01:39:40.61367	SYSTEM	2025-12-29 01:39:40.61367	SYSTEM
COM049	압축구분	압축구분	Y	EFC	2025-12-29 01:39:40.614989	SYSTEM	2025-12-29 01:39:40.614989	SYSTEM
COM050	수신구분	쪽지관리	Y	EFC	2025-12-29 01:39:40.615882	SYSTEM	2025-12-29 01:39:40.615882	SYSTEM
COM051	승인여부	승인여부구분코드	Y	EFC	2025-12-29 01:39:40.616609	SYSTEM	2025-12-29 01:39:40.616609	SYSTEM
COM052	달력구분	달력구분	Y	EFC	2025-12-29 01:39:40.617372	SYSTEM	2025-12-29 01:39:40.617372	SYSTEM
COM053	행사구분	행사구분	Y	EFC	2025-12-29 01:39:40.618198	SYSTEM	2025-12-29 01:39:40.618198	SYSTEM
COM054	경조구분	경조구분	Y	EFC	2025-12-29 01:39:40.619273	SYSTEM	2025-12-29 01:39:40.619273	SYSTEM
COM055	포상구분	포상구분	Y	EFC	2025-12-29 01:39:40.620323	SYSTEM	2025-12-29 01:39:40.620323	SYSTEM
COM056	휴가구분	휴가구분	Y	EFC	2025-12-29 01:39:40.621226	SYSTEM	2025-12-29 01:39:40.621226	SYSTEM
COM057	일정구분	일정구분	Y	EFC	2025-12-29 01:39:40.622083	SYSTEM	2025-12-29 01:39:40.622083	SYSTEM
COM058	반복구분코드	반복구분코드	Y	EFC	2025-12-29 01:39:40.622949	SYSTEM	2025-12-29 01:39:40.622949	SYSTEM
COM059	우선순위	우선순위	Y	EFC	2025-12-29 01:39:40.623778	SYSTEM	2025-12-29 01:39:40.623778	SYSTEM
COM060	보고서구분	보고서구분	Y	EFC	2025-12-29 01:39:40.624767	SYSTEM	2025-12-29 01:39:40.624767	SYSTEM
COM061	간부상태	간부상태	Y	EFC	2025-12-29 01:39:40.625561	SYSTEM	2025-12-29 01:39:40.625561	SYSTEM
COM062	 HTTP상태코드	HTTP상태코드	Y	EFC	2025-12-29 01:39:40.626355	SYSTEM	2025-12-29 01:39:40.626355	SYSTEM
COM063	상태관리	상태관리	Y	EFC	2025-12-29 01:39:40.627189	SYSTEM	2025-12-29 01:39:40.627189	SYSTEM
COM064	서버종류코드	서버종류코드	Y	EFC	2025-12-29 01:39:40.62796	SYSTEM	2025-12-29 01:39:40.62796	SYSTEM
COM065	장애종류코드	장애종류코드	Y	EFC	2025-12-29 01:39:40.628788	SYSTEM	2025-12-29 01:39:40.628788	SYSTEM
COM066	서버자원종류	서버자원종류	Y	EFC	2025-12-29 01:39:40.629554	SYSTEM	2025-12-29 01:39:40.629554	SYSTEM
COM067	네트워크관리항목	네트워크관리항목	Y	EFC	2025-12-29 01:39:40.630511	SYSTEM	2025-12-29 01:39:40.630511	SYSTEM
COM068	처리상태코드	처리상태코드	Y	EFC	2025-12-29 01:39:40.631625	SYSTEM	2025-12-29 01:39:40.631625	SYSTEM
COM069	기념일구분	기념일구분	Y	EFC	2025-12-29 01:39:40.632476	SYSTEM	2025-12-29 01:39:40.632476	SYSTEM
COM070	위치구분	회의실 위치구분	Y	EFC	2025-12-29 01:39:40.633544	SYSTEM	2025-12-29 01:39:40.633544	SYSTEM
COM071	당직체크구분	당직체크구분	Y	EFC	2025-12-29 01:39:40.634356	SYSTEM	2025-12-29 01:39:40.634356	SYSTEM
COM072	서비스상태	서비스상태	Y	EFC	2025-12-29 01:39:40.63527	SYSTEM	2025-12-29 01:39:40.63527	SYSTEM
COM073	가족관계	가족관계	Y	EFC	2025-12-29 01:39:40.636258	SYSTEM	2025-12-29 01:39:40.636258	SYSTEM
COM074	요일구분	요일구분	Y	EFC	2025-12-29 01:39:40.637409	SYSTEM	2025-12-29 01:39:40.637409	SYSTEM
COM075	업무구분코드	업무구분코드	Y	EFC	2025-12-29 01:39:40.638622	SYSTEM	2025-12-29 01:39:40.638622	SYSTEM
COM076	실행상태구분	실행상태구분	Y	EFC	2025-12-29 01:39:40.639645	SYSTEM	2025-12-29 01:39:40.639645	SYSTEM
COM101	게시판유형	게시판유형	Y	EFC	2025-12-29 01:39:40.640862	SYSTEM	2025-12-29 01:39:40.640862	SYSTEM
COM102	단어구분	단어구분	Y	EFC	2025-12-29 01:39:40.641785	SYSTEM	2025-12-29 01:39:40.641785	SYSTEM
\.


--
-- Data for Name: ccmmndetailcode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ccmmndetailcode (code_id, code, code_nm, code_dc, use_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
COM001	REGC01	단일 게시판 이용등록	단일 게시판 이용등록	Y	2025-12-29 01:39:40.642797	SYSTEM	2025-12-29 01:39:40.642797	SYSTEM
COM001	REGC02	커뮤니티 등록	커뮤니티 등록	Y	2025-12-29 01:39:40.644489	SYSTEM	2025-12-29 01:39:40.644489	SYSTEM
COM001	REGC03	동호회 등록	동호회 등록	Y	2025-12-29 01:39:40.645375	SYSTEM	2025-12-29 01:39:40.645375	SYSTEM
COM001	REGC04	명함등록	명함등록	Y	2025-12-29 01:39:40.646259	SYSTEM	2025-12-29 01:39:40.646259	SYSTEM
COM001	REGC05	동호회 게시판 등록	동호회 게시판 등록	Y	2025-12-29 01:39:40.647085	SYSTEM	2025-12-29 01:39:40.647085	SYSTEM
COM001	REGC06	커뮤니티 게시판 등록	커뮤니티 게시판 등록	Y	2025-12-29 01:39:40.647955	SYSTEM	2025-12-29 01:39:40.647955	SYSTEM
COM001	REGC07	게시판사용자등록	게시판사용자등록	Y	2025-12-29 01:39:40.64894	SYSTEM	2025-12-29 01:39:40.64894	SYSTEM
COM002	HIST01	소프트웨어패치	소프트웨어패치	Y	2025-12-29 01:39:40.649798	SYSTEM	2025-12-29 01:39:40.649798	SYSTEM
COM002	HIST02	소프트웨어설치	소프트웨어설치	Y	2025-12-29 01:39:40.650606	SYSTEM	2025-12-29 01:39:40.650606	SYSTEM
COM002	HIST03	소프트웨어삭제	소프트웨어삭제	Y	2025-12-29 01:39:40.651314	SYSTEM	2025-12-29 01:39:40.651314	SYSTEM
COM002	HIST04	하드웨어업그레이드	하드웨어업그레이드	Y	2025-12-29 01:39:40.65198	SYSTEM	2025-12-29 01:39:40.65198	SYSTEM
COM002	HIST05	하드웨어삭제	하드웨어삭제	Y	2025-12-29 01:39:40.652798	SYSTEM	2025-12-29 01:39:40.652798	SYSTEM
COM003	BBS	게시판	게시판	Y	2025-12-29 01:39:40.65366	SYSTEM	2025-12-29 01:39:40.65366	SYSTEM
COM003	CMY	커뮤니티	커뮤니티	Y	2025-12-29 01:39:40.654603	SYSTEM	2025-12-29 01:39:40.654603	SYSTEM
COM003	CLB	동호회	동호회	Y	2025-12-29 01:39:40.655571	SYSTEM	2025-12-29 01:39:40.655571	SYSTEM
COM003	NCD	명함	명함	Y	2025-12-29 01:39:40.656472	SYSTEM	2025-12-29 01:39:40.656472	SYSTEM
COM005	TMPT01	게시판템플릿	게시판템플릿	Y	2025-12-29 01:39:40.657516	SYSTEM	2025-12-29 01:39:40.657516	SYSTEM
COM005	TMPT02	커뮤니티템플릿	커뮤니티템플릿	Y	2025-12-29 01:39:40.658237	SYSTEM	2025-12-29 01:39:40.658237	SYSTEM
COM005	TMPT03	블로그템플릿	블로그템플릿	Y	2025-12-29 01:39:40.658937	SYSTEM	2025-12-29 01:39:40.658937	SYSTEM
COM006	CF01	커뮤니티등록	커뮤니티등록	Y	2025-12-29 01:39:40.660055	SYSTEM	2025-12-29 01:39:40.660055	SYSTEM
COM006	CF02	커뮤니티삭제	커뮤니티삭제	Y	2025-12-29 01:39:40.6609	SYSTEM	2025-12-29 01:39:40.6609	SYSTEM
COM006	CF03	동호회등록	동호회등록	Y	2025-12-29 01:39:40.661767	SYSTEM	2025-12-29 01:39:40.661767	SYSTEM
COM006	CF04	동호회삭제	동호회삭제	Y	2025-12-29 01:39:40.662701	SYSTEM	2025-12-29 01:39:40.662701	SYSTEM
COM006	CF05	커뮤니티운영자등록	커뮤니티운영자등록	Y	2025-12-29 01:39:40.663537	SYSTEM	2025-12-29 01:39:40.663537	SYSTEM
COM006	CF06	커뮤니티운영자삭제	커뮤니티운영자삭제	Y	2025-12-29 01:39:40.664243	SYSTEM	2025-12-29 01:39:40.664243	SYSTEM
COM006	CF07	동호회운영자등록	동호회운영자등록	Y	2025-12-29 01:39:40.66491	SYSTEM	2025-12-29 01:39:40.66491	SYSTEM
COM006	CF08	동호회운영자삭제	동호회운영자삭제	Y	2025-12-29 01:39:40.665663	SYSTEM	2025-12-29 01:39:40.665663	SYSTEM
COM006	CF09	게시판이용등록	게시판이용등록	Y	2025-12-29 01:39:40.666433	SYSTEM	2025-12-29 01:39:40.666433	SYSTEM
COM006	CF10	게시판삭제	게시판삭제	Y	2025-12-29 01:39:40.667272	SYSTEM	2025-12-29 01:39:40.667272	SYSTEM
COM006	CF11	커뮤니티사용자등록	커뮤니티사용자등록	Y	2025-12-29 01:39:40.668123	SYSTEM	2025-12-29 01:39:40.668123	SYSTEM
COM006	CF12	커뮤니티사용자탈퇴	커뮤니티사용자탈퇴	Y	2025-12-29 01:39:40.668847	SYSTEM	2025-12-29 01:39:40.668847	SYSTEM
COM006	CF13	동호회사용자등록	동호회사용자등록	Y	2025-12-29 01:39:40.669762	SYSTEM	2025-12-29 01:39:40.669762	SYSTEM
COM006	CF14	동호회사용자탈퇴	동호회사용자탈퇴	Y	2025-12-29 01:39:40.670693	SYSTEM	2025-12-29 01:39:40.670693	SYSTEM
COM007	AP01	승인요청	승인요청	Y	2025-12-29 01:39:40.671684	SYSTEM	2025-12-29 01:39:40.671684	SYSTEM
COM007	AP02	승인허가	승인허가	Y	2025-12-29 01:39:40.672496	SYSTEM	2025-12-29 01:39:40.672496	SYSTEM
COM007	AP03	승인반려	승인반려	Y	2025-12-29 01:39:40.673455	SYSTEM	2025-12-29 01:39:40.673455	SYSTEM
COM008	S01	전송요청	전송요청	Y	2025-12-29 01:39:40.674352	SYSTEM	2025-12-29 01:39:40.674352	SYSTEM
COM008	S02	전송완료	전송완료	Y	2025-12-29 01:39:40.675491	SYSTEM	2025-12-29 01:39:40.675491	SYSTEM
COM008	S03	전송실패	전송실패	Y	2025-12-29 01:39:40.676346	SYSTEM	2025-12-29 01:39:40.676346	SYSTEM
COM008	S04	수신요청	수신요청	Y	2025-12-29 01:39:40.677018	SYSTEM	2025-12-29 01:39:40.677018	SYSTEM
COM008	S05	수신완료	수신완료	Y	2025-12-29 01:39:40.677836	SYSTEM	2025-12-29 01:39:40.677836	SYSTEM
COM008	S06	수신실패	수신실패	Y	2025-12-29 01:39:40.678522	SYSTEM	2025-12-29 01:39:40.678522	SYSTEM
COM009	BBSA01	유효게시판	유효게시판	Y	2025-12-29 01:39:40.679484	SYSTEM	2025-12-29 01:39:40.679484	SYSTEM
COM009	BBSA02	갤러리	갤러리	Y	2025-12-29 01:39:40.680311	SYSTEM	2025-12-29 01:39:40.680311	SYSTEM
COM009	BBSA03	일반게시판	일반게시판	Y	2025-12-29 01:39:40.681079	SYSTEM	2025-12-29 01:39:40.681079	SYSTEM
COM010	PRVS001	시스템 관련 권한(최상위 권한)	시스템 관련 권한(최상위 권한)	Y	2025-12-29 01:39:40.681924	SYSTEM	2025-12-29 01:39:40.681924	SYSTEM
COM010	PRVD001	데이터베이스 관련 권한	데이터베이스 관련 권한	Y	2025-12-29 01:39:40.682591	SYSTEM	2025-12-29 01:39:40.682591	SYSTEM
COM010	PRVU001	사용자 관련 권한	사용자 관련 권한	Y	2025-12-29 01:39:40.683354	SYSTEM	2025-12-29 01:39:40.683354	SYSTEM
COM010	PRVA001	어플리케이션 관련 권한	어플리케이션 관련 권한	Y	2025-12-29 01:39:40.68415	SYSTEM	2025-12-29 01:39:40.68415	SYSTEM
COM010	PRVB001	게시판 관련 권한	게시판 관련 권한	Y	2025-12-29 01:39:40.685027	SYSTEM	2025-12-29 01:39:40.685027	SYSTEM
COM010	PRVC001	커뮤니티 관련 권한	커뮤니티 관련 권한	Y	2025-12-29 01:39:40.685935	SYSTEM	2025-12-29 01:39:40.685935	SYSTEM
COM011	ROLS001	시스템 관리 최상위 롤	시스템 관리 최상위 롤	Y	2025-12-29 01:39:40.686903	SYSTEM	2025-12-29 01:39:40.686903	SYSTEM
COM011	ROLS002	시스템 접근(view) 롤	시스템 접근(view) 롤	Y	2025-12-29 01:39:40.68793	SYSTEM	2025-12-29 01:39:40.68793	SYSTEM
COM011	ROLS003	시스템 설정 등록/변경 롤	시스템 설정 등록/변경 롤	Y	2025-12-29 01:39:40.68882	SYSTEM	2025-12-29 01:39:40.68882	SYSTEM
COM011	ROLS004	시스템 파일 등록/변경 롤	시스템 파일 등록/변경 롤	Y	2025-12-29 01:39:40.689714	SYSTEM	2025-12-29 01:39:40.689714	SYSTEM
COM011	ROLD001	데이터베이스 관련 최상위 롤	데이터베이스 관련 최상위 롤	Y	2025-12-29 01:39:40.690802	SYSTEM	2025-12-29 01:39:40.690802	SYSTEM
COM011	ROLD002	데이터베이스 스키마 등록/변경 롤	데이터베이스 스키마 등록/변경 롤	Y	2025-12-29 01:39:40.691704	SYSTEM	2025-12-29 01:39:40.691704	SYSTEM
COM011	ROLD003	데이터 조회 롤	데이터 조회 롤	Y	2025-12-29 01:39:40.6924	SYSTEM	2025-12-29 01:39:40.6924	SYSTEM
COM011	ROLD004	데이터 등록/변경 롤	데이터 등록/변경 롤	Y	2025-12-29 01:39:40.693109	SYSTEM	2025-12-29 01:39:40.693109	SYSTEM
COM011	ROLU001	사용자 관련 최상위 롤	사용자 관련 최상위 롤	Y	2025-12-29 01:39:40.693906	SYSTEM	2025-12-29 01:39:40.693906	SYSTEM
COM011	ROLU002	업무 시스템 사용자 관리 롤	업무 시스템 사용자 관리 롤	Y	2025-12-29 01:39:40.694599	SYSTEM	2025-12-29 01:39:40.694599	SYSTEM
COM011	ROLU003	기업회원 시스템 사용자 관리 롤	기업회원 시스템 사용자 관리 롤	Y	2025-12-29 01:39:40.695481	SYSTEM	2025-12-29 01:39:40.695481	SYSTEM
COM011	ROLU004	일반회원 시스템 사용자 관리 롤	일반회원 시스템 사용자 관리 롤	Y	2025-12-29 01:39:40.696322	SYSTEM	2025-12-29 01:39:40.696322	SYSTEM
COM011	ROLU005	게시판 사용자 관리 롤	게시판 사용자 관리 롤	Y	2025-12-29 01:39:40.697229	SYSTEM	2025-12-29 01:39:40.697229	SYSTEM
COM011	ROLU006	커뮤니티 사용자 관리 롤	커뮤니티 사용자 관리 롤	Y	2025-12-29 01:39:40.698036	SYSTEM	2025-12-29 01:39:40.698036	SYSTEM
COM011	ROLA001	어플리케이션 관련 최상위 롤	어플리케이션 관련 최상위 롤	Y	2025-12-29 01:39:40.698726	SYSTEM	2025-12-29 01:39:40.698726	SYSTEM
COM011	ROLA002	업무 어플리케이션 접근 롤	업무 어플리케이션 접근 롤	Y	2025-12-29 01:39:40.699749	SYSTEM	2025-12-29 01:39:40.699749	SYSTEM
COM011	ROLA003	업무 어플리케이션 관리 롤	업무 어플리케이션 관리 롤	Y	2025-12-29 01:39:40.700457	SYSTEM	2025-12-29 01:39:40.700457	SYSTEM
COM011	ROLA004	일반 어플리케이션 접근 롤	일반 어플리케이션 접근 롤	Y	2025-12-29 01:39:40.701109	SYSTEM	2025-12-29 01:39:40.701109	SYSTEM
COM011	ROLA005	일반 어프리케이션 관리 롤	일반 어프리케이션 관리 롤	Y	2025-12-29 01:39:40.701953	SYSTEM	2025-12-29 01:39:40.701953	SYSTEM
COM011	ROLA006	어플리케이션 약관 관리 롤	어플리케이션 약관 관리 롤	Y	2025-12-29 01:39:40.702781	SYSTEM	2025-12-29 01:39:40.702781	SYSTEM
COM011	ROLA007	어플리케이션 저작권 관리 롤	어플리케이션 저작권 관리 롤	Y	2025-12-29 01:39:40.703725	SYSTEM	2025-12-29 01:39:40.703725	SYSTEM
COM011	ROLA008	통계 및 보고서 접근 롤	통계 및 보고서 접근 롤	Y	2025-12-29 01:39:40.704731	SYSTEM	2025-12-29 01:39:40.704731	SYSTEM
COM011	ROLB001	게시판 관련 최상위 롤	게시판 관련 최상위 롤	Y	2025-12-29 01:39:40.705566	SYSTEM	2025-12-29 01:39:40.705566	SYSTEM
COM011	ROLB002	게시판 생성 롤	게시판 생성 롤	Y	2025-12-29 01:39:40.706597	SYSTEM	2025-12-29 01:39:40.706597	SYSTEM
COM011	ROLB003	게시판 접근 롤	게시판 접근 롤	Y	2025-12-29 01:39:40.707694	SYSTEM	2025-12-29 01:39:40.707694	SYSTEM
COM011	ROLB004	게시판 글쓰기 롤	게시판 글쓰기 롤	Y	2025-12-29 01:39:40.708551	SYSTEM	2025-12-29 01:39:40.708551	SYSTEM
COM011	ROLB005	게시판 글 수정/삭제 롤	게시판 글 수정/삭제 롤	Y	2025-12-29 01:39:40.709414	SYSTEM	2025-12-29 01:39:40.709414	SYSTEM
COM011	ROLC001	커뮤니티 관련 최상위 롤	커뮤니티 관련 최상위 롤	Y	2025-12-29 01:39:40.710081	SYSTEM	2025-12-29 01:39:40.710081	SYSTEM
COM011	ROLC002	커뮤니티 생성 롤	커뮤니티 생성 롤	Y	2025-12-29 01:39:40.710788	SYSTEM	2025-12-29 01:39:40.710788	SYSTEM
COM011	ROLC003	커뮤니티 접근 롤	커뮤니티 접근 롤	Y	2025-12-29 01:39:40.711472	SYSTEM	2025-12-29 01:39:40.711472	SYSTEM
COM011	ROLC004	커뮤니티 글쓰기 롤	커뮤니티 글쓰기 롤	Y	2025-12-29 01:39:40.712234	SYSTEM	2025-12-29 01:39:40.712234	SYSTEM
COM011	ROLC005	커뮤니티 글 수정/삭제 롤	커뮤니티 글 수정/삭제 롤	Y	2025-12-29 01:39:40.713174	SYSTEM	2025-12-29 01:39:40.713174	SYSTEM
COM011	ROLC006	파일 업로드 롤	파일 업로드 롤	Y	2025-12-29 01:39:40.714061	SYSTEM	2025-12-29 01:39:40.714061	SYSTEM
COM012	USR01	일반 회원 유형	일반 회원 유형	Y	2025-12-29 01:39:40.71481	SYSTEM	2025-12-29 01:39:40.71481	SYSTEM
COM012	USR02	기업 회원 유형	기업 회원 유형	Y	2025-12-29 01:39:40.715673	SYSTEM	2025-12-29 01:39:40.715673	SYSTEM
COM012	USR03	업무 담당자(사용자) 유형	업무 담당자(사용자) 유형	Y	2025-12-29 01:39:40.716366	SYSTEM	2025-12-29 01:39:40.716366	SYSTEM
COM012	USR99	사용자 유형 최상위 롤	사용자 유형 최상위 롤	Y	2025-12-29 01:39:40.717092	SYSTEM	2025-12-29 01:39:40.717092	SYSTEM
COM013	A	회원 가입 신청 상태	회원 가입 신청 상태	Y	2025-12-29 01:39:40.717886	SYSTEM	2025-12-29 01:39:40.717886	SYSTEM
COM013	P	회원 가입 승인 상태	회원 가입 승인 상태	Y	2025-12-29 01:39:40.718684	SYSTEM	2025-12-29 01:39:40.718684	SYSTEM
COM013	D	회원 가입 삭제 상태	회원 가입 삭제 상태	Y	2025-12-29 01:39:40.719776	SYSTEM	2025-12-29 01:39:40.719776	SYSTEM
COM014	M	남자	남자	Y	2025-12-29 01:39:40.720753	SYSTEM	2025-12-29 01:39:40.720753	SYSTEM
COM014	F	여자	여자	Y	2025-12-29 01:39:40.721746	SYSTEM	2025-12-29 01:39:40.721746	SYSTEM
COM015	ATH01	주민등록번호 인증	주민등록번호 인증	Y	2025-12-29 01:39:40.722579	SYSTEM	2025-12-29 01:39:40.722579	SYSTEM
COM015	ATH02	GPIN 인증	GPIN 인증	Y	2025-12-29 01:39:40.72348	SYSTEM	2025-12-29 01:39:40.72348	SYSTEM
COM016	PUR01	프로그램 변경 요청 신청	프로그램 변경 요청 신청	Y	2025-12-29 01:39:40.724338	SYSTEM	2025-12-29 01:39:40.724338	SYSTEM
COM016	PUR02	프로그램 변경 요청 수락	프로그램 변경 요청 수락	Y	2025-12-29 01:39:40.72531	SYSTEM	2025-12-29 01:39:40.72531	SYSTEM
COM016	PUR03	프로그램 변경 진행	프로그램 변경 진행	Y	2025-12-29 01:39:40.726128	SYSTEM	2025-12-29 01:39:40.726128	SYSTEM
COM016	PUR04	프로그램 변경 완료	프로그램 변경 완료	Y	2025-12-29 01:39:40.72692	SYSTEM	2025-12-29 01:39:40.72692	SYSTEM
COM016	PUR05	프로그램 변경 이관	프로그램 변경 이관	Y	2025-12-29 01:39:40.727601	SYSTEM	2025-12-29 01:39:40.727601	SYSTEM
COM017	01	법정휴일	법정휴일	Y	2025-12-29 01:39:40.728233	SYSTEM	2025-12-29 01:39:40.728233	SYSTEM
COM017	02	법정공휴일	법정공휴일	Y	2025-12-29 01:39:40.728991	SYSTEM	2025-12-29 01:39:40.728991	SYSTEM
COM017	03	임시공휴일	임시공휴일	Y	2025-12-29 01:39:40.729693	SYSTEM	2025-12-29 01:39:40.729693	SYSTEM
COM018	1	객관식	객관식	Y	2025-12-29 01:39:40.730586	SYSTEM	2025-12-29 01:39:40.730586	SYSTEM
COM018	2	주관식	주관식	Y	2025-12-29 01:39:40.731373	SYSTEM	2025-12-29 01:39:40.731373	SYSTEM
COM019	A	높음	높음	Y	2025-12-29 01:39:40.732105	SYSTEM	2025-12-29 01:39:40.732105	SYSTEM
COM019	B	보통	보통	Y	2025-12-29 01:39:40.732993	SYSTEM	2025-12-29 01:39:40.732993	SYSTEM
COM019	C	낮음	낮음	Y	2025-12-29 01:39:40.733644	SYSTEM	2025-12-29 01:39:40.733644	SYSTEM
COM020	1	부서일정관리	부서일정관리	Y	2025-12-29 01:39:40.734327	SYSTEM	2025-12-29 01:39:40.734327	SYSTEM
COM020	2	일정관리	일정관리	Y	2025-12-29 01:39:40.735101	SYSTEM	2025-12-29 01:39:40.735101	SYSTEM
COM021	1	기능설명	기능설명	Y	2025-12-29 01:39:40.7359	SYSTEM	2025-12-29 01:39:40.7359	SYSTEM
COM021	2	절차설명	절차설명	Y	2025-12-29 01:39:40.7371	SYSTEM	2025-12-29 01:39:40.7371	SYSTEM
COM022	P01	가장 기억에 남는 장소는?	가장 기억에 남는 장소는?	Y	2025-12-29 01:39:40.738287	SYSTEM	2025-12-29 01:39:40.738287	SYSTEM
COM022	P02	나의 좌우명은?	나의 좌우명은?	Y	2025-12-29 01:39:40.739243	SYSTEM	2025-12-29 01:39:40.739243	SYSTEM
COM022	P03	나의 보물 제1호는?	나의 보물 제1호는?	Y	2025-12-29 01:39:40.740158	SYSTEM	2025-12-29 01:39:40.740158	SYSTEM
COM022	P04	가장 기억에 남는 선생님 성함은?	가장 기억에 남는 선생님 성함은?	Y	2025-12-29 01:39:40.741015	SYSTEM	2025-12-29 01:39:40.741015	SYSTEM
COM022	P05	다른 사람은 모르는 나만의 신체비밀은?	다른 사람은 모르는 나만의 신체비밀은?	Y	2025-12-29 01:39:40.741784	SYSTEM	2025-12-29 01:39:40.741784	SYSTEM
COM022	P06	오래도록 기억하고 싶은 날짜는?	오래도록 기억하고 싶은 날짜는?	Y	2025-12-29 01:39:40.742645	SYSTEM	2025-12-29 01:39:40.742645	SYSTEM
COM022	P07	받았던 선물 중 기억에 남는 독특한 선물은?	받았던 선물 중 기억에 남는 독특한 선물은?	Y	2025-12-29 01:39:40.74337	SYSTEM	2025-12-29 01:39:40.74337	SYSTEM
COM022	P08	가장 생각나는 친구 이름은?	가장 생각나는 친구 이름은?	Y	2025-12-29 01:39:40.744089	SYSTEM	2025-12-29 01:39:40.744089	SYSTEM
COM022	P09	인상 깊게 읽은 책 이름은?	인상 깊게 읽은 책 이름은?	Y	2025-12-29 01:39:40.744804	SYSTEM	2025-12-29 01:39:40.744804	SYSTEM
COM022	P10	내가 존경하는 인물은?	내가 존경하는 인물은?	Y	2025-12-29 01:39:40.745508	SYSTEM	2025-12-29 01:39:40.745508	SYSTEM
COM022	P11	나의 노래방 애창곡은?	나의 노래방 애창곡은?	Y	2025-12-29 01:39:40.746381	SYSTEM	2025-12-29 01:39:40.746381	SYSTEM
COM022	P12	가장 감명깊게 본 영화는?	가장 감명깊게 본 영화는?	Y	2025-12-29 01:39:40.747277	SYSTEM	2025-12-29 01:39:40.747277	SYSTEM
COM022	P13	좋아하는 스포츠팀 이름은?	좋아하는 스포츠팀 이름은?	Y	2025-12-29 01:39:40.748082	SYSTEM	2025-12-29 01:39:40.748082	SYSTEM
COM023	01	경제	경제	Y	2025-12-29 01:39:40.748802	SYSTEM	2025-12-29 01:39:40.748802	SYSTEM
COM023	02	전산	전산	Y	2025-12-29 01:39:40.749484	SYSTEM	2025-12-29 01:39:40.749484	SYSTEM
COM023	03	행정	행정	Y	2025-12-29 01:39:40.750144	SYSTEM	2025-12-29 01:39:40.750144	SYSTEM
COM024	R	요청	요청	Y	2025-12-29 01:39:40.751023	SYSTEM	2025-12-29 01:39:40.751023	SYSTEM
COM024	F	실패	실패	Y	2025-12-29 01:39:40.751767	SYSTEM	2025-12-29 01:39:40.751767	SYSTEM
COM024	C	완료	완료	Y	2025-12-29 01:39:40.752615	SYSTEM	2025-12-29 01:39:40.752615	SYSTEM
COM025	00000001	공공기관	공공기관	Y	2025-12-29 01:39:40.753616	SYSTEM	2025-12-29 01:39:40.753616	SYSTEM
COM025	00000002	금융기관	금융기관	Y	2025-12-29 01:39:40.75461	SYSTEM	2025-12-29 01:39:40.75461	SYSTEM
COM025	00000003	교육기관	교육기관	Y	2025-12-29 01:39:40.755546	SYSTEM	2025-12-29 01:39:40.755546	SYSTEM
COM025	00000004	의료기관	의료기관	Y	2025-12-29 01:39:40.756414	SYSTEM	2025-12-29 01:39:40.756414	SYSTEM
COM026	C0000001	대기업	대기업	Y	2025-12-29 01:39:40.757343	SYSTEM	2025-12-29 01:39:40.757343	SYSTEM
COM026	C0000002	중소기업	중소기업	Y	2025-12-29 01:39:40.758092	SYSTEM	2025-12-29 01:39:40.758092	SYSTEM
COM026	C0000003	다국적기업	다국적기업	Y	2025-12-29 01:39:40.7589	SYSTEM	2025-12-29 01:39:40.7589	SYSTEM
COM027	A	축산업	축산업	Y	2025-12-29 01:39:40.759791	SYSTEM	2025-12-29 01:39:40.759791	SYSTEM
COM027	B	어업	어업	Y	2025-12-29 01:39:40.760595	SYSTEM	2025-12-29 01:39:40.760595	SYSTEM
COM027	C	광업	광업	Y	2025-12-29 01:39:40.761349	SYSTEM	2025-12-29 01:39:40.761349	SYSTEM
COM027	D	제조업	제조업	Y	2025-12-29 01:39:40.762136	SYSTEM	2025-12-29 01:39:40.762136	SYSTEM
COM027	E	전기,가스및수도사업	전기,가스및수도사업	Y	2025-12-29 01:39:40.762846	SYSTEM	2025-12-29 01:39:40.762846	SYSTEM
COM027	F	건설업	건설업	Y	2025-12-29 01:39:40.763532	SYSTEM	2025-12-29 01:39:40.763532	SYSTEM
COM027	G	도소매 및 소비자용품수리업	도소매 및 소비자용품수리업	Y	2025-12-29 01:39:40.764228	SYSTEM	2025-12-29 01:39:40.764228	SYSTEM
COM027	H	숙박및음식점	숙박및음식점	Y	2025-12-29 01:39:40.764939	SYSTEM	2025-12-29 01:39:40.764939	SYSTEM
COM027	I	운수창고및통신업	운수창고및통신업	Y	2025-12-29 01:39:40.765752	SYSTEM	2025-12-29 01:39:40.765752	SYSTEM
COM027	J	금융및보험업	금융및보험업	Y	2025-12-29 01:39:40.766556	SYSTEM	2025-12-29 01:39:40.766556	SYSTEM
COM027	K	부동산,임대및사업서비스업	부동산,임대및사업서비스업	Y	2025-12-29 01:39:40.76742	SYSTEM	2025-12-29 01:39:40.76742	SYSTEM
COM027	M	교육서비스업	교육서비스업	Y	2025-12-29 01:39:40.768125	SYSTEM	2025-12-29 01:39:40.768125	SYSTEM
COM027	N	보건업	보건업	Y	2025-12-29 01:39:40.768764	SYSTEM	2025-12-29 01:39:40.768764	SYSTEM
COM027	O	기타공공,사회및개인서비스업	기타공공,사회및개인서비스업	Y	2025-12-29 01:39:40.769732	SYSTEM	2025-12-29 01:39:40.769732	SYSTEM
COM027	P	가사서비스업	가사서비스업	Y	2025-12-29 01:39:40.770607	SYSTEM	2025-12-29 01:39:40.770607	SYSTEM
COM028	1	접수대기	접수대기	Y	2025-12-29 01:39:40.771571	SYSTEM	2025-12-29 01:39:40.771571	SYSTEM
COM028	2	접수	접수	Y	2025-12-29 01:39:40.773825	SYSTEM	2025-12-29 01:39:40.773825	SYSTEM
COM028	3	완료	완료	Y	2025-12-29 01:39:40.774912	SYSTEM	2025-12-29 01:39:40.774912	SYSTEM
COM029	method	METHOD	METHOD	Y	2025-12-29 01:39:40.775868	SYSTEM	2025-12-29 01:39:40.775868	SYSTEM
COM029	pointcut	POINTCUT	POINTCUT	Y	2025-12-29 01:39:40.776791	SYSTEM	2025-12-29 01:39:40.776791	SYSTEM
COM029	url	URL	URL	Y	2025-12-29 01:39:40.77759	SYSTEM	2025-12-29 01:39:40.77759	SYSTEM
COM030	1	회의	회의	Y	2025-12-29 01:39:40.778439	SYSTEM	2025-12-29 01:39:40.778439	SYSTEM
COM030	2	세미나	세미나	Y	2025-12-29 01:39:40.779436	SYSTEM	2025-12-29 01:39:40.779436	SYSTEM
COM030	3	강의	강의	Y	2025-12-29 01:39:40.780244	SYSTEM	2025-12-29 01:39:40.780244	SYSTEM
COM030	4	교육	교육	Y	2025-12-29 01:39:40.780907	SYSTEM	2025-12-29 01:39:40.780907	SYSTEM
COM030	5	기타	기타	Y	2025-12-29 01:39:40.781599	SYSTEM	2025-12-29 01:39:40.781599	SYSTEM
COM030	6	휴일	휴일	Y	2025-12-29 01:39:40.782359	SYSTEM	2025-12-29 01:39:40.782359	SYSTEM
COM031	1	당일	당일	Y	2025-12-29 01:39:40.783339	SYSTEM	2025-12-29 01:39:40.783339	SYSTEM
COM031	2	반복	반복	Y	2025-12-29 01:39:40.784137	SYSTEM	2025-12-29 01:39:40.784137	SYSTEM
COM031	3	연속	연속	Y	2025-12-29 01:39:40.784836	SYSTEM	2025-12-29 01:39:40.784836	SYSTEM
COM031	4	요일반복	요일반복	Y	2025-12-29 01:39:40.785559	SYSTEM	2025-12-29 01:39:40.785559	SYSTEM
COM032	WC01	회원가입	회원가입	Y	2025-12-29 01:39:40.786416	SYSTEM	2025-12-29 01:39:40.786416	SYSTEM
COM032	WC02	사용자등록	사용자등록	Y	2025-12-29 01:39:40.78739	SYSTEM	2025-12-29 01:39:40.78739	SYSTEM
COM032	WC03	회원탈퇴	회원탈퇴	Y	2025-12-29 01:39:40.788289	SYSTEM	2025-12-29 01:39:40.788289	SYSTEM
COM032	WC04	사용자삭제	사용자삭제	Y	2025-12-29 01:39:40.789137	SYSTEM	2025-12-29 01:39:40.789137	SYSTEM
COM032	WC05	커뮤니티등록	커뮤니티등록	Y	2025-12-29 01:39:40.790089	SYSTEM	2025-12-29 01:39:40.790089	SYSTEM
COM032	WC06	동호회등록	동호회등록	Y	2025-12-29 01:39:40.790942	SYSTEM	2025-12-29 01:39:40.790942	SYSTEM
COM032	WC07	커뮤니티폐쇄	커뮤니티폐쇄	Y	2025-12-29 01:39:40.791815	SYSTEM	2025-12-29 01:39:40.791815	SYSTEM
COM032	WC08	동호회폐쇄	동호회폐쇄	Y	2025-12-29 01:39:40.792633	SYSTEM	2025-12-29 01:39:40.792633	SYSTEM
COM032	WC09	게시판등록	게시판등록	Y	2025-12-29 01:39:40.793424	SYSTEM	2025-12-29 01:39:40.793424	SYSTEM
COM032	WC10	게시판폐쇄	게시판폐쇄	Y	2025-12-29 01:39:40.794203	SYSTEM	2025-12-29 01:39:40.794203	SYSTEM
COM033	C	생성	생성	Y	2025-12-29 01:39:40.794907	SYSTEM	2025-12-29 01:39:40.794907	SYSTEM
COM033	R	조회	조회	Y	2025-12-29 01:39:40.795809	SYSTEM	2025-12-29 01:39:40.795809	SYSTEM
COM033	U	수정	수정	Y	2025-12-29 01:39:40.796672	SYSTEM	2025-12-29 01:39:40.796672	SYSTEM
COM033	D	삭제	삭제	Y	2025-12-29 01:39:40.797496	SYSTEM	2025-12-29 01:39:40.797496	SYSTEM
COM034	1	학생	학생	Y	2025-12-29 01:39:40.798397	SYSTEM	2025-12-29 01:39:40.798397	SYSTEM
COM034	2	대학생	대학생	Y	2025-12-29 01:39:40.79922	SYSTEM	2025-12-29 01:39:40.79922	SYSTEM
COM034	3	군인	군인	Y	2025-12-29 01:39:40.800109	SYSTEM	2025-12-29 01:39:40.800109	SYSTEM
COM034	4	교사	교사	Y	2025-12-29 01:39:40.801049	SYSTEM	2025-12-29 01:39:40.801049	SYSTEM
COM034	5	기타	기타	Y	2025-12-29 01:39:40.802076	SYSTEM	2025-12-29 01:39:40.802076	SYSTEM
COM035	1	행사	행사	Y	2025-12-29 01:39:40.803254	SYSTEM	2025-12-29 01:39:40.803254	SYSTEM
COM035	2	이벤트	이벤트	Y	2025-12-29 01:39:40.804499	SYSTEM	2025-12-29 01:39:40.804499	SYSTEM
COM035	3	캠페인	캠페인	Y	2025-12-29 01:39:40.805586	SYSTEM	2025-12-29 01:39:40.805586	SYSTEM
COM036	01	작성	작성	Y	2025-12-29 01:39:40.806659	SYSTEM	2025-12-29 01:39:40.806659	SYSTEM
COM036	02	상신	상신	Y	2025-12-29 01:39:40.808015	SYSTEM	2025-12-29 01:39:40.808015	SYSTEM
COM036	03	반려	반려	Y	2025-12-29 01:39:40.808924	SYSTEM	2025-12-29 01:39:40.808924	SYSTEM
COM036	04	결재완료	결재완료	Y	2025-12-29 01:39:40.809944	SYSTEM	2025-12-29 01:39:40.809944	SYSTEM
COM038	N	N	아니오	Y	2025-12-29 01:39:40.810909	SYSTEM	2025-12-29 01:39:40.810909	SYSTEM
COM038	Y	Y	예	Y	2025-12-29 01:39:40.811973	SYSTEM	2025-12-29 01:39:40.811973	SYSTEM
COM039	001	사회	사회	Y	2025-12-29 01:39:40.812914	SYSTEM	2025-12-29 01:39:40.812914	SYSTEM
COM039	002	정치	정치	Y	2025-12-29 01:39:40.813917	SYSTEM	2025-12-29 01:39:40.813917	SYSTEM
COM039	003	경제	경제	Y	2025-12-29 01:39:40.814889	SYSTEM	2025-12-29 01:39:40.814889	SYSTEM
COM039	004	문화	문화	Y	2025-12-29 01:39:40.816023	SYSTEM	2025-12-29 01:39:40.816023	SYSTEM
COM039	005	인문	인문	Y	2025-12-29 01:39:40.816854	SYSTEM	2025-12-29 01:39:40.816854	SYSTEM
COM039	006	공학	공학	Y	2025-12-29 01:39:40.817692	SYSTEM	2025-12-29 01:39:40.817692	SYSTEM
COM039	007	기타	기타	Y	2025-12-29 01:39:40.818522	SYSTEM	2025-12-29 01:39:40.818522	SYSTEM
COM040	01	휴가계획서	휴가계획서	Y	2025-12-29 01:39:40.819491	SYSTEM	2025-12-29 01:39:40.819491	SYSTEM
COM040	02	출장보고서	출장보고서	Y	2025-12-29 01:39:40.820567	SYSTEM	2025-12-29 01:39:40.820567	SYSTEM
COM040	03	교육보고서	교육보고서	Y	2025-12-29 01:39:40.821554	SYSTEM	2025-12-29 01:39:40.821554	SYSTEM
COM040	04	판품요청서	판품요청서	Y	2025-12-29 01:39:40.822435	SYSTEM	2025-12-29 01:39:40.822435	SYSTEM
COM040	05	지원요청서	지원요청서	Y	2025-12-29 01:39:40.823529	SYSTEM	2025-12-29 01:39:40.823529	SYSTEM
COM041	001	절차설명	절차설명	Y	2025-12-29 01:39:40.825047	SYSTEM	2025-12-29 01:39:40.825047	SYSTEM
COM041	002	기능설명	기능설명	Y	2025-12-29 01:39:40.826494	SYSTEM	2025-12-29 01:39:40.826494	SYSTEM
COM041	003	기타설명	기타설명	Y	2025-12-29 01:39:40.827762	SYSTEM	2025-12-29 01:39:40.827762	SYSTEM
COM042	%Y	연도별	연도별	Y	2025-12-29 01:39:40.828814	SYSTEM	2025-12-29 01:39:40.828814	SYSTEM
COM042	%Y-%m	월별	월별	Y	2025-12-29 01:39:40.829718	SYSTEM	2025-12-29 01:39:40.829718	SYSTEM
COM042	%Y-%m-%d	일별	일별	Y	2025-12-29 01:39:40.830782	SYSTEM	2025-12-29 01:39:40.830782	SYSTEM
COM043	01	생성	생성	Y	2025-12-29 01:39:40.831754	SYSTEM	2025-12-29 01:39:40.831754	SYSTEM
COM043	02	변경	변경	Y	2025-12-29 01:39:40.832652	SYSTEM	2025-12-29 01:39:40.832652	SYSTEM
COM043	03	말소	말소	Y	2025-12-29 01:39:40.833529	SYSTEM	2025-12-29 01:39:40.833529	SYSTEM
COM044	00	수신처리	수신처리	Y	2025-12-29 01:39:40.834452	SYSTEM	2025-12-29 01:39:40.834452	SYSTEM
COM044	01	처리완료	처리완료	Y	2025-12-29 01:39:40.835421	SYSTEM	2025-12-29 01:39:40.835421	SYSTEM
COM044	10	기등록	기등록	Y	2025-12-29 01:39:40.836424	SYSTEM	2025-12-29 01:39:40.836424	SYSTEM
COM044	11	생성오류	생성오류	Y	2025-12-29 01:39:40.837332	SYSTEM	2025-12-29 01:39:40.837332	SYSTEM
COM044	12	변경오류	변경오류	Y	2025-12-29 01:39:40.838275	SYSTEM	2025-12-29 01:39:40.838275	SYSTEM
COM044	13	말소오류	말소오류	Y	2025-12-29 01:39:40.839205	SYSTEM	2025-12-29 01:39:40.839205	SYSTEM
COM046	01	정상	정상	Y	2025-12-29 01:39:40.840116	SYSTEM	2025-12-29 01:39:40.840116	SYSTEM
COM046	02	비정상	비정상	Y	2025-12-29 01:39:40.840896	SYSTEM	2025-12-29 01:39:40.840896	SYSTEM
COM047	01	매일	매일	Y	2025-12-29 01:39:40.841666	SYSTEM	2025-12-29 01:39:40.841666	SYSTEM
COM047	02	매주	매주	Y	2025-12-29 01:39:40.842499	SYSTEM	2025-12-29 01:39:40.842499	SYSTEM
COM047	03	매월	매월	Y	2025-12-29 01:39:40.843318	SYSTEM	2025-12-29 01:39:40.843318	SYSTEM
COM047	04	매년	매년	Y	2025-12-29 01:39:40.844306	SYSTEM	2025-12-29 01:39:40.844306	SYSTEM
COM047	05	한번만	한번만	Y	2025-12-29 01:39:40.845338	SYSTEM	2025-12-29 01:39:40.845338	SYSTEM
COM048	01	Oracle	Oracle	Y	2025-12-29 01:39:40.846327	SYSTEM	2025-12-29 01:39:40.846327	SYSTEM
COM048	02	Mysql	Mysql	Y	2025-12-29 01:39:40.847376	SYSTEM	2025-12-29 01:39:40.847376	SYSTEM
COM048	03	Tibero	Tibero	Y	2025-12-29 01:39:40.848213	SYSTEM	2025-12-29 01:39:40.848213	SYSTEM
COM048	04	Altibase	Altibase	Y	2025-12-29 01:39:40.848947	SYSTEM	2025-12-29 01:39:40.848947	SYSTEM
COM049	01	Tar	Tar	Y	2025-12-29 01:39:40.849688	SYSTEM	2025-12-29 01:39:40.849688	SYSTEM
COM049	02	ZIP	ZIP	Y	2025-12-29 01:39:40.85094	SYSTEM	2025-12-29 01:39:40.85094	SYSTEM
COM050	1	수신	수신	Y	2025-12-29 01:39:40.852122	SYSTEM	2025-12-29 01:39:40.852122	SYSTEM
COM050	2	참조	참조	Y	2025-12-29 01:39:40.853266	SYSTEM	2025-12-29 01:39:40.853266	SYSTEM
COM051	01	신청중	신청중	Y	2025-12-29 01:39:40.854331	SYSTEM	2025-12-29 01:39:40.854331	SYSTEM
COM051	02	승인	승인	Y	2025-12-29 01:39:40.855416	SYSTEM	2025-12-29 01:39:40.855416	SYSTEM
COM051	03	반려	반려	Y	2025-12-29 01:39:40.856344	SYSTEM	2025-12-29 01:39:40.856344	SYSTEM
COM052	01	양력	양력	Y	2025-12-29 01:39:40.857186	SYSTEM	2025-12-29 01:39:40.857186	SYSTEM
COM052	02	음력	음력	Y	2025-12-29 01:39:40.857958	SYSTEM	2025-12-29 01:39:40.857958	SYSTEM
COM053	01	교육	교육	Y	2025-12-29 01:39:40.858838	SYSTEM	2025-12-29 01:39:40.858838	SYSTEM
COM053	02	세미나	세미나	Y	2025-12-29 01:39:40.859787	SYSTEM	2025-12-29 01:39:40.859787	SYSTEM
COM053	03	홍보	홍보	Y	2025-12-29 01:39:40.860966	SYSTEM	2025-12-29 01:39:40.860966	SYSTEM
COM053	04	단합	단합	Y	2025-12-29 01:39:40.861906	SYSTEM	2025-12-29 01:39:40.861906	SYSTEM
COM053	05	간담회	간담회	Y	2025-12-29 01:39:40.863097	SYSTEM	2025-12-29 01:39:40.863097	SYSTEM
COM053	99	기타	기타	Y	2025-12-29 01:39:40.864517	SYSTEM	2025-12-29 01:39:40.864517	SYSTEM
COM054	01	결혼	결혼	Y	2025-12-29 01:39:40.865547	SYSTEM	2025-12-29 01:39:40.865547	SYSTEM
COM054	02	출생	출생	Y	2025-12-29 01:39:40.866607	SYSTEM	2025-12-29 01:39:40.866607	SYSTEM
COM054	03	회갑	회갑	Y	2025-12-29 01:39:40.867646	SYSTEM	2025-12-29 01:39:40.867646	SYSTEM
COM054	04	사망	사망	Y	2025-12-29 01:39:40.868795	SYSTEM	2025-12-29 01:39:40.868795	SYSTEM
COM054	05	출산	출산	Y	2025-12-29 01:39:40.869889	SYSTEM	2025-12-29 01:39:40.869889	SYSTEM
COM054	99	기타	기타	Y	2025-12-29 01:39:40.870891	SYSTEM	2025-12-29 01:39:40.870891	SYSTEM
COM055	01	우수사원	우수사원	Y	2025-12-29 01:39:40.872077	SYSTEM	2025-12-29 01:39:40.872077	SYSTEM
COM055	02	우수팀	우수팀	Y	2025-12-29 01:39:40.873141	SYSTEM	2025-12-29 01:39:40.873141	SYSTEM
COM055	99	기타	기타	Y	2025-12-29 01:39:40.874305	SYSTEM	2025-12-29 01:39:40.874305	SYSTEM
COM056	01	연차휴가	연차휴가	Y	2025-12-29 01:39:40.875428	SYSTEM	2025-12-29 01:39:40.875428	SYSTEM
COM056	02	반차휴가	반차휴가	Y	2025-12-29 01:39:40.877428	SYSTEM	2025-12-29 01:39:40.877428	SYSTEM
COM056	03	무급휴가	무급휴가	Y	2025-12-29 01:39:40.878295	SYSTEM	2025-12-29 01:39:40.878295	SYSTEM
COM056	04	유급휴가	유급휴가	Y	2025-12-29 01:39:40.879065	SYSTEM	2025-12-29 01:39:40.879065	SYSTEM
COM056	05	대체휴가	대체휴가	Y	2025-12-29 01:39:40.880226	SYSTEM	2025-12-29 01:39:40.880226	SYSTEM
COM056	99	기타	기타	Y	2025-12-29 01:39:40.881203	SYSTEM	2025-12-29 01:39:40.881203	SYSTEM
COM057	1	회의	회의	Y	2025-12-29 01:39:40.882001	SYSTEM	2025-12-29 01:39:40.882001	SYSTEM
COM057	2	방문	방문	Y	2025-12-29 01:39:40.88292	SYSTEM	2025-12-29 01:39:40.88292	SYSTEM
COM057	3	세미나	세미나	Y	2025-12-29 01:39:40.884008	SYSTEM	2025-12-29 01:39:40.884008	SYSTEM
COM057	4	기타	기타	Y	2025-12-29 01:39:40.884798	SYSTEM	2025-12-29 01:39:40.884798	SYSTEM
COM058	1	반복없음	당일	Y	2025-12-29 01:39:40.885575	SYSTEM	2025-12-29 01:39:40.885575	SYSTEM
COM058	2	매일	매일	Y	2025-12-29 01:39:40.886973	SYSTEM	2025-12-29 01:39:40.886973	SYSTEM
COM058	3	매주	매주	Y	2025-12-29 01:39:40.888247	SYSTEM	2025-12-29 01:39:40.888247	SYSTEM
COM058	4	매월	매월	Y	2025-12-29 01:39:40.889242	SYSTEM	2025-12-29 01:39:40.889242	SYSTEM
COM059	1	높음	높음	Y	2025-12-29 01:39:40.890394	SYSTEM	2025-12-29 01:39:40.890394	SYSTEM
COM059	2	보통	보통	Y	2025-12-29 01:39:40.891596	SYSTEM	2025-12-29 01:39:40.891596	SYSTEM
COM059	3	낮음	낮음	Y	2025-12-29 01:39:40.892648	SYSTEM	2025-12-29 01:39:40.892648	SYSTEM
COM060	1	주간보고	주간보고	Y	2025-12-29 01:39:40.893675	SYSTEM	2025-12-29 01:39:40.893675	SYSTEM
COM060	2	월간보고	월간보고	Y	2025-12-29 01:39:40.894631	SYSTEM	2025-12-29 01:39:40.894631	SYSTEM
COM061	1	재실	재실	Y	2025-12-29 01:39:40.895432	SYSTEM	2025-12-29 01:39:40.895432	SYSTEM
COM061	2	자리비움	자리비움	Y	2025-12-29 01:39:40.896538	SYSTEM	2025-12-29 01:39:40.896538	SYSTEM
COM061	3	회의중	회의중	Y	2025-12-29 01:39:40.897519	SYSTEM	2025-12-29 01:39:40.897519	SYSTEM
COM061	4	출장중	출장중	Y	2025-12-29 01:39:40.898595	SYSTEM	2025-12-29 01:39:40.898595	SYSTEM
COM061	5	휴가중	휴가중	Y	2025-12-29 01:39:40.899412	SYSTEM	2025-12-29 01:39:40.899412	SYSTEM
COM062	100	Continue 	Continue 	Y	2025-12-29 01:39:40.900424	SYSTEM	2025-12-29 01:39:40.900424	SYSTEM
COM062	101	Switching Protocols 	Switching Protocols 	Y	2025-12-29 01:39:40.901179	SYSTEM	2025-12-29 01:39:40.901179	SYSTEM
COM062	200	OK 	OK 	Y	2025-12-29 01:39:40.901926	SYSTEM	2025-12-29 01:39:40.901926	SYSTEM
COM062	201	Created 	Created 	Y	2025-12-29 01:39:40.902688	SYSTEM	2025-12-29 01:39:40.902688	SYSTEM
COM062	202	Accepted 	Accepted 	Y	2025-12-29 01:39:40.90366	SYSTEM	2025-12-29 01:39:40.90366	SYSTEM
COM062	203	Non-Authoritative Information 	Non-Authoritative Information 	Y	2025-12-29 01:39:40.904677	SYSTEM	2025-12-29 01:39:40.904677	SYSTEM
COM062	204	No Content 	No Content 	Y	2025-12-29 01:39:40.905759	SYSTEM	2025-12-29 01:39:40.905759	SYSTEM
COM062	205	Reset Content 	Reset Content 	Y	2025-12-29 01:39:40.906898	SYSTEM	2025-12-29 01:39:40.906898	SYSTEM
COM062	206	Partial Content 	Partial Content 	Y	2025-12-29 01:39:40.908156	SYSTEM	2025-12-29 01:39:40.908156	SYSTEM
COM062	300	Multiple Choices 	Multiple Choices 	Y	2025-12-29 01:39:40.909569	SYSTEM	2025-12-29 01:39:40.909569	SYSTEM
COM062	301	Moved Permanently 	Moved Permanently 	Y	2025-12-29 01:39:40.910354	SYSTEM	2025-12-29 01:39:40.910354	SYSTEM
COM062	302	Found 	Found 	Y	2025-12-29 01:39:40.911297	SYSTEM	2025-12-29 01:39:40.911297	SYSTEM
COM062	303	See Other 	See Other 	Y	2025-12-29 01:39:40.91199	SYSTEM	2025-12-29 01:39:40.91199	SYSTEM
COM062	304	Not Modified 	Not Modified 	Y	2025-12-29 01:39:40.912807	SYSTEM	2025-12-29 01:39:40.912807	SYSTEM
COM062	305	Use Proxy 	Use Proxy 	Y	2025-12-29 01:39:40.913715	SYSTEM	2025-12-29 01:39:40.913715	SYSTEM
COM062	307	Temporary Redirect 	Temporary Redirect 	Y	2025-12-29 01:39:40.914503	SYSTEM	2025-12-29 01:39:40.914503	SYSTEM
COM062	400	Bad Request 	Bad Request 	Y	2025-12-29 01:39:40.915355	SYSTEM	2025-12-29 01:39:40.915355	SYSTEM
COM062	401	Unauthorized 	Unauthorized 	Y	2025-12-29 01:39:40.91609	SYSTEM	2025-12-29 01:39:40.91609	SYSTEM
COM062	403	Forbidden 	Forbidden 	Y	2025-12-29 01:39:40.916892	SYSTEM	2025-12-29 01:39:40.916892	SYSTEM
COM062	404	Not Found 	Not Found 	Y	2025-12-29 01:39:40.917562	SYSTEM	2025-12-29 01:39:40.917562	SYSTEM
COM062	405	Method Not Allowed 	Method Not Allowed 	Y	2025-12-29 01:39:40.918224	SYSTEM	2025-12-29 01:39:40.918224	SYSTEM
COM062	406	Not Acceptable 	Not Acceptable 	Y	2025-12-29 01:39:40.919191	SYSTEM	2025-12-29 01:39:40.919191	SYSTEM
COM062	407	Proxy Authentication Required 	Proxy Authentication Required 	Y	2025-12-29 01:39:40.920092	SYSTEM	2025-12-29 01:39:40.920092	SYSTEM
COM062	408	Request Timeout 	Request Timeout 	Y	2025-12-29 01:39:40.921079	SYSTEM	2025-12-29 01:39:40.921079	SYSTEM
COM062	409	Conflict 	Conflict 	Y	2025-12-29 01:39:40.922186	SYSTEM	2025-12-29 01:39:40.922186	SYSTEM
COM062	410	Gone 	Gone 	Y	2025-12-29 01:39:40.923093	SYSTEM	2025-12-29 01:39:40.923093	SYSTEM
COM062	411	Length Required 	Length Required 	Y	2025-12-29 01:39:40.924054	SYSTEM	2025-12-29 01:39:40.924054	SYSTEM
COM062	412	Precondition Failed 	Precondition Failed 	Y	2025-12-29 01:39:40.92484	SYSTEM	2025-12-29 01:39:40.92484	SYSTEM
COM062	413	Request Entity Too Large 	Request Entity Too Large 	Y	2025-12-29 01:39:40.925679	SYSTEM	2025-12-29 01:39:40.925679	SYSTEM
COM062	414	Request URI Too Long 	Request URI Too Long 	Y	2025-12-29 01:39:40.926548	SYSTEM	2025-12-29 01:39:40.926548	SYSTEM
COM062	415	Unsupported Media Type 	Unsupported Media Type 	Y	2025-12-29 01:39:40.927407	SYSTEM	2025-12-29 01:39:40.927407	SYSTEM
COM062	416	Requested Range Not Satisfiable 	Requested Range Not Satisfiable 	Y	2025-12-29 01:39:40.928094	SYSTEM	2025-12-29 01:39:40.928094	SYSTEM
COM062	417	Expectation Failed 	Expectation Failed 	Y	2025-12-29 01:39:40.92891	SYSTEM	2025-12-29 01:39:40.92891	SYSTEM
COM062	500	Internal Server Error 	Internal Server Error 	Y	2025-12-29 01:39:40.929727	SYSTEM	2025-12-29 01:39:40.929727	SYSTEM
COM062	501	Not Implemented 	Not Implemented 	Y	2025-12-29 01:39:40.930499	SYSTEM	2025-12-29 01:39:40.930499	SYSTEM
COM062	502	Bad Gateway 	Bad Gateway 	Y	2025-12-29 01:39:40.931257	SYSTEM	2025-12-29 01:39:40.931257	SYSTEM
COM062	503	Service Unavailable 	Service Unavailable 	Y	2025-12-29 01:39:40.932274	SYSTEM	2025-12-29 01:39:40.932274	SYSTEM
COM062	504	Gateway Timeout 	Gateway Timeout 	Y	2025-12-29 01:39:40.933069	SYSTEM	2025-12-29 01:39:40.933069	SYSTEM
COM062	505	HTTP Version Not Supported 	HTTP Version Not Supported 	Y	2025-12-29 01:39:40.933938	SYSTEM	2025-12-29 01:39:40.933938	SYSTEM
COM063	100	Runnable	Runnable	Y	2025-12-29 01:39:40.934591	SYSTEM	2025-12-29 01:39:40.934591	SYSTEM
COM063	200	Sleeping	Sleeping	Y	2025-12-29 01:39:40.935428	SYSTEM	2025-12-29 01:39:40.935428	SYSTEM
COM063	300	Swapped	Swapped	Y	2025-12-29 01:39:40.936312	SYSTEM	2025-12-29 01:39:40.936312	SYSTEM
COM063	400	Zombie	Zombie	Y	2025-12-29 01:39:40.937409	SYSTEM	2025-12-29 01:39:40.937409	SYSTEM
COM063	500	Stopped	Stopped	Y	2025-12-29 01:39:40.938403	SYSTEM	2025-12-29 01:39:40.938403	SYSTEM
COM064	01	웹 서버	웹 서버	Y	2025-12-29 01:39:40.939478	SYSTEM	2025-12-29 01:39:40.939478	SYSTEM
COM064	02	WAS	WAS	Y	2025-12-29 01:39:40.940376	SYSTEM	2025-12-29 01:39:40.940376	SYSTEM
COM064	03	DB 서버	DB 서버	Y	2025-12-29 01:39:40.941327	SYSTEM	2025-12-29 01:39:40.941327	SYSTEM
COM064	04	Mail 서버	Mail 서버	Y	2025-12-29 01:39:40.942175	SYSTEM	2025-12-29 01:39:40.942175	SYSTEM
COM064	05	DNS 서버	DNS 서버	Y	2025-12-29 01:39:40.942856	SYSTEM	2025-12-29 01:39:40.942856	SYSTEM
COM064	99	기타 서버	기타 서버	Y	2025-12-29 01:39:40.943653	SYSTEM	2025-12-29 01:39:40.943653	SYSTEM
COM065	01	네트워크 장애	네트워크 장애	Y	2025-12-29 01:39:40.944478	SYSTEM	2025-12-29 01:39:40.944478	SYSTEM
COM065	02	하드웨어 장애	하드웨어 장애	Y	2025-12-29 01:39:40.945245	SYSTEM	2025-12-29 01:39:40.945245	SYSTEM
COM065	03	어플리케이션 장애	어플리케이션 장애	Y	2025-12-29 01:39:40.946075	SYSTEM	2025-12-29 01:39:40.946075	SYSTEM
COM065	04	서비스 장애	서비스 장애	Y	2025-12-29 01:39:40.946855	SYSTEM	2025-12-29 01:39:40.946855	SYSTEM
COM065	05	모니터링 장애	모니터링 장애	Y	2025-12-29 01:39:40.947573	SYSTEM	2025-12-29 01:39:40.947573	SYSTEM
COM065	06	정전	정전	Y	2025-12-29 01:39:40.948276	SYSTEM	2025-12-29 01:39:40.948276	SYSTEM
COM065	07	화재	화재	Y	2025-12-29 01:39:40.94905	SYSTEM	2025-12-29 01:39:40.94905	SYSTEM
COM065	08	홍수	홍수	Y	2025-12-29 01:39:40.949792	SYSTEM	2025-12-29 01:39:40.949792	SYSTEM
COM065	99	기타 장애	기타 장애	Y	2025-12-29 01:39:40.950546	SYSTEM	2025-12-29 01:39:40.950546	SYSTEM
COM066	01	CPU	CPU	Y	2025-12-29 01:39:40.95136	SYSTEM	2025-12-29 01:39:40.95136	SYSTEM
COM066	02	메모리	메모리	Y	2025-12-29 01:39:40.952232	SYSTEM	2025-12-29 01:39:40.952232	SYSTEM
COM067	01	서버	서버	Y	2025-12-29 01:39:40.95331	SYSTEM	2025-12-29 01:39:40.95331	SYSTEM
COM067	02	라우터	라우터	Y	2025-12-29 01:39:40.954221	SYSTEM	2025-12-29 01:39:40.954221	SYSTEM
COM067	03	스위치	스위치	Y	2025-12-29 01:39:40.955157	SYSTEM	2025-12-29 01:39:40.955157	SYSTEM
COM067	04	PC	PC	Y	2025-12-29 01:39:40.956034	SYSTEM	2025-12-29 01:39:40.956034	SYSTEM
COM067	05	프린터	프린터	Y	2025-12-29 01:39:40.957186	SYSTEM	2025-12-29 01:39:40.957186	SYSTEM
COM067	99	기타	기타	Y	2025-12-29 01:39:40.958051	SYSTEM	2025-12-29 01:39:40.958051	SYSTEM
COM068	A	접수	접수	Y	2025-12-29 01:39:40.958837	SYSTEM	2025-12-29 01:39:40.958837	SYSTEM
COM068	C	완료	완료	Y	2025-12-29 01:39:40.959559	SYSTEM	2025-12-29 01:39:40.959559	SYSTEM
COM068	R	요청	요청	Y	2025-12-29 01:39:40.960416	SYSTEM	2025-12-29 01:39:40.960416	SYSTEM
COM069	01	생일	생일	Y	2025-12-29 01:39:40.961238	SYSTEM	2025-12-29 01:39:40.961238	SYSTEM
COM069	02	기념	기념	N	2025-12-29 01:39:40.962234	SYSTEM	2025-12-29 01:39:40.962234	SYSTEM
COM069	03	결혼	결혼	Y	2025-12-29 01:39:40.963076	SYSTEM	2025-12-29 01:39:40.963076	SYSTEM
COM069	04	탄생	탄생	Y	2025-12-29 01:39:40.963938	SYSTEM	2025-12-29 01:39:40.963938	SYSTEM
COM069	05	축하	축하	Y	2025-12-29 01:39:40.96475	SYSTEM	2025-12-29 01:39:40.96475	SYSTEM
COM069	06	출장	출장	Y	2025-12-29 01:39:40.965474	SYSTEM	2025-12-29 01:39:40.965474	SYSTEM
COM069	07	퇴원	퇴원	Y	2025-12-29 01:39:40.966345	SYSTEM	2025-12-29 01:39:40.966345	SYSTEM
COM069	99	기타	기타	Y	2025-12-29 01:39:40.967178	SYSTEM	2025-12-29 01:39:40.967178	SYSTEM
COM070	01	본관1층	본관1층	Y	2025-12-29 01:39:40.968162	SYSTEM	2025-12-29 01:39:40.968162	SYSTEM
COM070	02	본관2층	본관2층	Y	2025-12-29 01:39:40.968928	SYSTEM	2025-12-29 01:39:40.968928	SYSTEM
COM070	03	본관3층	본관3층	Y	2025-12-29 01:39:40.969908	SYSTEM	2025-12-29 01:39:40.969908	SYSTEM
COM070	04	본관4층	본관4층	Y	2025-12-29 01:39:40.970854	SYSTEM	2025-12-29 01:39:40.970854	SYSTEM
COM070	05	본관5층	본관5층	Y	2025-12-29 01:39:40.97179	SYSTEM	2025-12-29 01:39:40.97179	SYSTEM
COM070	06	별관1층	별관1층	Y	2025-12-29 01:39:40.972686	SYSTEM	2025-12-29 01:39:40.972686	SYSTEM
COM070	07	별관2층	별관2층	Y	2025-12-29 01:39:40.973668	SYSTEM	2025-12-29 01:39:40.973668	SYSTEM
COM070	99	기타	기타	Y	2025-12-29 01:39:40.97457	SYSTEM	2025-12-29 01:39:40.97457	SYSTEM
COM071	01	전기시설	전기시설	Y	2025-12-29 01:39:40.975398	SYSTEM	2025-12-29 01:39:40.975398	SYSTEM
COM071	02	소등상태	소등상태	Y	2025-12-29 01:39:40.976135	SYSTEM	2025-12-29 01:39:40.976135	SYSTEM
COM071	03	방화요소	방화요소	Y	2025-12-29 01:39:40.976808	SYSTEM	2025-12-29 01:39:40.976808	SYSTEM
COM071	04	소방시설	소방시설	Y	2025-12-29 01:39:40.977529	SYSTEM	2025-12-29 01:39:40.977529	SYSTEM
COM071	05	비상 KEY	비상 KEY	Y	2025-12-29 01:39:40.97819	SYSTEM	2025-12-29 01:39:40.97819	SYSTEM
COM071	06	시건장치	시건장치	Y	2025-12-29 01:39:40.979304	SYSTEM	2025-12-29 01:39:40.979304	SYSTEM
COM071	99	기타	기타	Y	2025-12-29 01:39:40.980361	SYSTEM	2025-12-29 01:39:40.980361	SYSTEM
COM072	01	정상	정상	Y	2025-12-29 01:39:40.981211	SYSTEM	2025-12-29 01:39:40.981211	SYSTEM
COM072	02	오류	오류	Y	2025-12-29 01:39:40.981888	SYSTEM	2025-12-29 01:39:40.981888	SYSTEM
COM072	03	중지	중지	Y	2025-12-29 01:39:40.982849	SYSTEM	2025-12-29 01:39:40.982849	SYSTEM
COM072	09	기타	기타	Y	2025-12-29 01:39:40.984141	SYSTEM	2025-12-29 01:39:40.984141	SYSTEM
COM073	01	본인	본인	Y	2025-12-29 01:39:40.985209	SYSTEM	2025-12-29 01:39:40.985209	SYSTEM
COM073	02	배우자	배우자	Y	2025-12-29 01:39:40.98633	SYSTEM	2025-12-29 01:39:40.98633	SYSTEM
COM073	03	자녀	자녀	Y	2025-12-29 01:39:40.987752	SYSTEM	2025-12-29 01:39:40.987752	SYSTEM
COM073	04	부친	부친	Y	2025-12-29 01:39:40.988756	SYSTEM	2025-12-29 01:39:40.988756	SYSTEM
COM073	05	모친	모친	Y	2025-12-29 01:39:40.9896	SYSTEM	2025-12-29 01:39:40.9896	SYSTEM
COM073	06	배우자부친	배우자부친	Y	2025-12-29 01:39:40.990501	SYSTEM	2025-12-29 01:39:40.990501	SYSTEM
COM073	07	배우자모친	배우자모친	Y	2025-12-29 01:39:40.991452	SYSTEM	2025-12-29 01:39:40.991452	SYSTEM
COM073	08	조부	조부	Y	2025-12-29 01:39:40.992365	SYSTEM	2025-12-29 01:39:40.992365	SYSTEM
COM073	09	조모	조모	Y	2025-12-29 01:39:40.993174	SYSTEM	2025-12-29 01:39:40.993174	SYSTEM
COM073	10	형제자매(본인)	형제자매(본인)	Y	2025-12-29 01:39:40.993902	SYSTEM	2025-12-29 01:39:40.993902	SYSTEM
COM073	11	외조부	외조부	Y	2025-12-29 01:39:40.994616	SYSTEM	2025-12-29 01:39:40.994616	SYSTEM
COM073	12	외조모	외조모	Y	2025-12-29 01:39:40.995364	SYSTEM	2025-12-29 01:39:40.995364	SYSTEM
COM073	13	백숙부	백숙부	Y	2025-12-29 01:39:40.996186	SYSTEM	2025-12-29 01:39:40.996186	SYSTEM
COM073	14	백숙모	백숙모	Y	2025-12-29 01:39:40.997269	SYSTEM	2025-12-29 01:39:40.997269	SYSTEM
COM073	15	형제자매(배우자)	형제자매(배우자)	Y	2025-12-29 01:39:40.998251	SYSTEM	2025-12-29 01:39:40.998251	SYSTEM
COM073	99	기타	기타	Y	2025-12-29 01:39:40.99906	SYSTEM	2025-12-29 01:39:40.99906	SYSTEM
COM074	1	일요일	일요일	Y	2025-12-29 01:39:40.999792	SYSTEM	2025-12-29 01:39:40.999792	SYSTEM
COM074	2	월요일	월요일	Y	2025-12-29 01:39:41.000621	SYSTEM	2025-12-29 01:39:41.000621	SYSTEM
COM074	3	화요일	화요일	Y	2025-12-29 01:39:41.001407	SYSTEM	2025-12-29 01:39:41.001407	SYSTEM
COM074	4	수요일	수요일	Y	2025-12-29 01:39:41.002339	SYSTEM	2025-12-29 01:39:41.002339	SYSTEM
COM074	5	목요일	목요일	Y	2025-12-29 01:39:41.003367	SYSTEM	2025-12-29 01:39:41.003367	SYSTEM
COM074	6	금요일	금요일	Y	2025-12-29 01:39:41.004391	SYSTEM	2025-12-29 01:39:41.004391	SYSTEM
COM074	7	토요일	토요일	Y	2025-12-29 01:39:41.005296	SYSTEM	2025-12-29 01:39:41.005296	SYSTEM
COM075	001	경조신청	경조신청	Y	2025-12-29 01:39:41.006347	SYSTEM	2025-12-29 01:39:41.006347	SYSTEM
COM075	002	포상신청	포상신청	Y	2025-12-29 01:39:41.007152	SYSTEM	2025-12-29 01:39:41.007152	SYSTEM
COM075	003	휴가신청	휴가신청	Y	2025-12-29 01:39:41.008003	SYSTEM	2025-12-29 01:39:41.008003	SYSTEM
COM075	004	행사신청	행사신청	Y	2025-12-29 01:39:41.008867	SYSTEM	2025-12-29 01:39:41.008867	SYSTEM
COM076	01	정상	정상	Y	2025-12-29 01:39:41.009672	SYSTEM	2025-12-29 01:39:41.009672	SYSTEM
COM076	02	비정상	비정상	Y	2025-12-29 01:39:41.010516	SYSTEM	2025-12-29 01:39:41.010516	SYSTEM
COM076	03	수행중	수행중	Y	2025-12-29 01:39:41.011277	SYSTEM	2025-12-29 01:39:41.011277	SYSTEM
COM101	BBST01	통합게시판	통합게시판	Y	2025-12-29 01:39:41.012308	SYSTEM	2025-12-29 01:39:41.012308	SYSTEM
COM101	BBST02	블로그형게시판	블로그형게시판	Y	2025-12-29 01:39:41.013297	SYSTEM	2025-12-29 01:39:41.013297	SYSTEM
COM101	BBST03	방명록	방명록	Y	2025-12-29 01:39:41.014217	SYSTEM	2025-12-29 01:39:41.014217	SYSTEM
COM102	1	표준어	표준어	Y	2025-12-29 01:39:41.015247	SYSTEM	2025-12-29 01:39:41.015247	SYSTEM
COM102	2	동의어	동의어	Y	2025-12-29 01:39:41.016058	SYSTEM	2025-12-29 01:39:41.016058	SYSTEM
\.


--
-- Data for Name: comtnindvdlpge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comtnindvdlpge (cntnts_id, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id, cntnts_dc, cntnts_link_url, cntnts_nm, cntnts_use_at) FROM stdin;
\.


--
-- Data for Name: comtnuserabsence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comtnuserabsence (emplyr_id, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id, user_absnce_at) FROM stdin;
\.


--
-- Data for Name: ecopseq; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ecopseq (table_name, next_id) FROM stdin;
ADBKUSER_ID	1
ADBK_ID	1
ADMINIST_WORD_ID	1
ADMIN_CODE_OPERT	1
ANN_ID	1
BACKUP_OPERT_ID	1
BACKUP_RESULT_ID	1
BANNER_ID	1
BATCH_OPERT_ID	1
BATCH_RESULT_ID	1
BATCH_SCHDUL_ID	1
BBS_ID	1
CLB_ID	1
CMMNTY_ID	1
CNSLT_ID	1
CNTC_ID	1
CNTC_MESSAGE_ID	1
CNTNTS_ID	1
ECOPSEQ	1
CPYRHT_ID	1
CTSNN_ID	1
DAM_ID	1
DB_MNTRNG_LOG_ID	1
DEPT_JOB_BX_ID	1
DEPT_JOB_ID	1
DIARY_ID	1
DUS_ID	1
EVENTINFO_ID	1
EVENT_ID	1
EXTRLHRINFO_ID	1
FAQ_ID	1
FILESYS_LOGID	1
FILESYS_MNTRNG	1
FILE_ID	1
GROUP_ID	1
HPCM_ID	1
HTTL_ID	1
HTTP_ID	1
INDVDL_INFO_ID	1
INFRML_SANCTN	1
INSTT_CODE_OPERT	1
INSTT_ID	1
ISG_ID	1
ITEM_ID	1
KNO_ID	1
KNO_ID2	1
LEADER_SCHDUL_ID	1
LOGINLOG_ID	1
LSI_ID	1
MAILMSG_ID	1
MEMO_REPRT	1
MEMO_TODO_ID	1
MSI_ID	1
MTG_ID	1
MTG_PLACE_ID	1
NCRD_ID	1
NEWS_ID	1
NOTE_ID	1
NOTE_RECPTN_ID	1
NOTE_TRNSMIT_ID	1
NTWRKSVC_LOGID	1
NTWRK_ID	1
ONLINE_MUL_ID	1
POLL_IEM_ID	1
POLL_MGR_ID	1
POLL_RUT_ID	1
POPUP_ID	1
PROC_ID	1
PROL_ID	1
PROXYLOG_ID	1
PROXYSVC_ID	1
QA_ID	1
QESITM_	1
QESRSPNS_ID	1
QESTNR_QESITM_ID	1
QESTNR_RPD_ID	1
QUSTNRQESTN_ID	1
QUSTNRTMPLA_ID	1
RECOMEND_SITE_ID	1
RESTDE_ID	1
RESVE_ID	1
ROLE_ID	20
RSS_ID	1
RS_ID	1
RWARD_ID	1
SCHDUL_ID	1
SCRAP_ID	1
SERVER_ID	1
SEVEQ_ID	1
SITE_ID	1
SMS_ID	1
SRCHWRD_ID	1
SRCHWRD_MANAGEID	2
SRCHWRD_MANAGE_I	1
SVCRESMONTLOG_ID	1
SVC_ID	1
SYNCHRNSERVER_ID	1
SYSLOG_ID	1
SYS_ID	1
TEST1	1
TMPLAT_ID	1
TROBL_ID	1
TRSMRCVLOG_ID	1
TR_MNTRNG_LOG_ID	1
UNITY_LINK_ID	1
USE_STPLAT_ID	3
USRCNFRM_ID	3
WEBLOG_ID	1
WIKI_ID	1
WIKMNTHNG_REPRT	1
WORD_ID	1
NTT_ID	1
ORGNZT_ID	1
ANSWER_NO	1
STSFDG_NO	1
ROUGHMAP_ID	1
ids	180
\.


--
-- Data for Name: file_group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_group (id, frst_regist_pnttm, last_updt_pnttm, atch_file_id, use_at) FROM stdin;
\.


--
-- Data for Name: file_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_item (id, frst_regist_pnttm, last_updt_pnttm, file_extsn, file_size, file_sn, file_stre_cours, orignl_file_nm, stre_file_nm, file_group_id) FROM stdin;
\.


--
-- Data for Name: hconfmhistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hconfmhistory (confm_no, confm_rqester_id, confmer_id, confm_de, confm_ty_code, confm_sttus_code, opert_ty_code, opert_id, trget_job_ty_code, trget_job_id) FROM stdin;
\.


--
-- Data for Name: hdbmntrngloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hdbmntrngloginfo (data_sourc_nm, server_nm, dbms_knd, ceck_sql, mngr_nm, mngr_email_adres, mntrng_sttus, log_info, creat_dt, frst_register_id, frst_regist_pnttm, last_updt_pnttm, last_updusr_id, log_id) FROM stdin;
\.


--
-- Data for Name: hemaildsptchmanage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hemaildsptchmanage (mssage_id, email_cn, sndr, rcver, sj, sndng_result_code, dsptch_dt, atch_file_id, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: hemplyrinfochangedtls; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hemplyrinfochangedtls (emplyr_id, change_de, orgnzt_id, group_id, empl_no, sexdstn_code, brthdy, fxnum, house_adres, house_end_telno, area_no, detail_adres, zip, offm_telno, mbtlnum, email_adres, house_middle_telno, pstinst_code, emplyr_sttus_code, esntl_id) FROM stdin;
\.


--
-- Data for Name: hhttpmonloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hhttpmonloginfo (sys_id, site_url, websvc_knd, http_sttus_code, creat_dt, log_info, mngr_nm, mngr_email_adres, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, log_id) FROM stdin;
\.


--
-- Data for Name: htrsmrcvmntrngloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.htrsmrcvmntrngloginfo (log_id, cntc_id, test_class_nm, mngr_nm, mngr_email_adres, mntrng_sttus, log_info, creat_dt, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ids; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ids (table_name, next_id) FROM stdin;
BBS_ID	1
FILE_ID	1
USER_ID	1
DEPT_JOB_ID	0
DEPT_JOB_BX_ID	0
MEMO_TODO_ID	0
WIK_MNTHNG_ID	0
\.


--
-- Data for Name: imgtemp; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.imgtemp (orgnzt_code, erncsl_se, image_info, image_ty, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: j_attachfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.j_attachfile (file_id, file_seq, file_name, file_size, file_mask, download_count, download_expire_date, download_limit_count, reg_date, delete_yn) FROM stdin;
\.


--
-- Data for Name: n_user_notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.n_user_notification (ntcn_no, ntcn_sj, ntcn_cn, receiver_id, is_read, link_url, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, ntcn_tm, bh_ntcn_intrvl) FROM stdin;
NT001	테스트 알림입니다	알림 내용입니다	webmaster	N	\N	\N	2026-02-25 00:59:33.78407	\N	\N	\N	\N
\.


--
-- Data for Name: nadbk; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nadbk (emplyr_id, ncrd_id, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id, adbk_constnt_id, nm, email_adres, mbtlnum, fxnum, offm_telno, house_telno, adbk_id) FROM stdin;
\.


--
-- Data for Name: nadbkmanage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nadbkmanage (adbk_id, adbk_nm, othbc_scope, use_at, wrter_id, trget_orgnzt_id, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nanswer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nanswer (ntt_id, bbs_id, wrter_id, answer, use_at, wrter_nm, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, answer_no) FROM stdin;
\.


--
-- Data for Name: nauthorgroupinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nauthorgroupinfo (group_id, group_nm, group_creat_de, group_dc, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
GROUP_00000000000000	0번  그룹입니다	2025-12-29 01:39:41.016754	0번  그룹입니다	\N	\N	\N	\N
\.


--
-- Data for Name: nauthorinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nauthorinfo (author_code, author_nm, author_dc, author_creat_de, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
ROLE_ANONYMOUS	익명 사용자		2025-12-29 01:39:41.026182	\N	\N	\N	\N
IS_AUTHENTICATED_ANONYMOUSLY	스프링시큐리티 내부사용(롤부여 금지)		2025-12-29 01:39:41.027127	\N	\N	\N	\N
IS_AUTHENTICATED_REMEMBERED	스프링시큐리티 내부사용(롤부여 금지)		2025-12-29 01:39:41.027958	\N	\N	\N	\N
IS_AUTHENTICATED_FULLY	스프링시큐리티 내부사용(롤부여 금지)		2025-12-29 01:39:41.028944	\N	\N	\N	\N
ROLE_USER	일반 사용자		2025-12-29 01:39:41.029712	\N	\N	\N	\N
ROLE_ADMIN	관리자		2025-12-29 01:39:41.03039	\N	\N	\N	\N
\.


--
-- Data for Name: nauthorrolerelate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nauthorrolerelate (author_code, role_code, creat_dt, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
ROLE_ANONYMOUS	web-000001	2025-12-29 01:39:41.049719	\N	\N	\N	\N
ROLE_ANONYMOUS	web-000002	2025-12-29 01:39:41.051165	\N	\N	\N	\N
ROLE_ANONYMOUS	web-000004	2025-12-29 01:39:41.051856	\N	\N	\N	\N
ROLE_ANONYMOUS	web-000007	2025-12-29 01:39:41.052869	\N	\N	\N	\N
ROLE_ANONYMOUS	web-000009	2025-12-29 01:39:41.053803	\N	\N	\N	\N
ROLE_ANONYMOUS	web-000010	2025-12-29 01:39:41.05489	\N	\N	\N	\N
ROLE_ANONYMOUS	web-000011	2025-12-29 01:39:41.055978	\N	\N	\N	\N
ROLE_ANONYMOUS	web-000012	2025-12-29 01:39:41.056851	\N	\N	\N	\N
ROLE_USER	web-000003	2025-12-29 01:39:41.057908	\N	\N	\N	\N
ROLE_ADMIN	web-000003	2025-12-29 01:39:41.058783	\N	\N	\N	\N
\.


--
-- Data for Name: nbackupschduldfk; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbackupschduldfk (backup_opert_id, execut_schdul_dfk_se) FROM stdin;
\.


--
-- Data for Name: nbanner; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbanner (banner_id, banner_nm, link_url, banner_image, banner_dc, reflct_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, banner_image_file, sort_ordr) FROM stdin;
\.


--
-- Data for Name: nbbs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbbs (ntt_id, bbs_id, ntt_no, ntt_sj, ntt_cn, answer_at, parntsctt_no, answer_lc, sort_ordr, rdcnt, use_at, ntce_bgnde, ntce_endde, ntcr_id, ntcr_nm, password, atch_file_id, notice_at, sj_bold_at, secret_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, blog_id, comment_co, file_co, event_date, qna_status, qna_category) FROM stdin;
1	BBSMSTR_AAAAAAAAAAAA	\N	공지사항 테스트	테스트 게시글입니다.	\N	\N	\N	\N	0	Y	20250101	20261231	\N	\N	\N	\N	\N	\N	\N	2025-12-29 04:52:47.171193	SYSTEM	\N	\N	\N	0	0	\N	OPEN	\N
2	BBSMSTR_CCCCCCCCCCCC	\N	업무 테스트	업무 테스트입니다.	\N	\N	\N	\N	0	Y	20250101	20261231	\N	\N	\N	\N	\N	\N	\N	2025-12-29 04:52:47.171193	SYSTEM	\N	\N	\N	0	0	\N	OPEN	\N
1001	BBSMSTR_AAAAAAAAAAAA	1	DEBUG TEST TITLE	DEBUG TEST CONTENT	N	0	0	1	0	Y	\N	\N	USRCNFRM_00000000002	일반사용자	\N	\N	\N	\N	\N	2026-03-24 16:31:28.761856	user_regular	2026-03-24 16:31:28.761856	user_regular	\N	0	0	\N	OPEN	\N
1002	BBSMSTR_AAAAAAAAAAAA	1	DEBUG TEST TITLE	DEBUG TEST CONTENT	N	0	0	2	0	Y	\N	\N	USRCNFRM_00000000002	일반사용자	\N	\N	\N	\N	\N	2026-03-24 16:33:02.113985	user_regular	2026-03-24 16:33:02.113985	user_regular	\N	0	0	\N	OPEN	\N
1003	BBSMSTR_AAAAAAAAAAAA	1	DEBUG TEST TITLE	DEBUG TEST CONTENT	N	0	0	3	0	Y	\N	\N	USRCNFRM_00000000002	일반사용자	\N	\N	\N	\N	\N	2026-03-24 16:34:11.019956	user_regular	2026-03-24 16:34:11.019956	user_regular	\N	0	0	\N	OPEN	\N
1004	BBSMSTR_CCCCCCCCCCCC	1	E2E Test Post - 1774337759030	This is an automated test content.	N	0	0	1	0	Y	\N	\N	USRCNFRM_00000000002	일반사용자	\N	\N	\N	\N	\N	2026-03-24 16:36:05.333854	user_regular	2026-03-24 16:36:05.333854	user_regular	\N	0	0	\N	OPEN	\N
1006	BBSMSTR_CCCCCCCCCCCC	1	E2E Test Post - 1774339192402	This is an automated test content.	N	0	0	3	1	Y	\N	\N	USRCNFRM_00000000002	일반사용자	\N	\N	\N	\N	\N	2026-03-24 17:00:02.007118	user_regular	2026-03-24 17:00:21.428773	user_regular	\N	0	0	\N	OPEN	\N
1005	BBSMSTR_CCCCCCCCCCCC	1	E2E Test Post - 1774338011457	This is an automated test content.	N	0	0	2	1	Y	\N	\N	USRCNFRM_00000000002	일반사용자	\N	\N	\N	\N	\N	2026-03-24 16:40:18.408036	user_regular	2026-03-25 11:07:15.122568	webmaster	\N	0	0	\N	OPEN	\N
1007	BBSMSTR_CCCCCCCCCCCC	1	Workflow Test - 1774441035587	<p>System integration test content.</p>	N	0	0	4	1	Y	\N	\N	USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-03-25 21:17:38.584933	webmaster	2026-03-25 21:18:30.644263	webmaster	\N	0	0	\N	OPEN	\N
1008	BBSMSTR_000000000160	1	테스트1	<p>테스트1</p>	N	0	0	1	0	Y	\N	\N	USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-11 23:13:29.497794	webmaster	2026-04-11 23:13:29.497794	webmaster	\N	0	0	\N	OPEN	\N
1009	BBSMSTR_AAAAAAAAAAAA	1	E2E Test Article 1775975108053	This is a test content created by Playwright automated test at 2026-04-12T06:25:08.053Z	N	0	0	4	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:25:17.952606	webmaster	2026-04-12 15:25:17.952606	webmaster	\N	0	0	\N	OPEN	\N
1010	BBSMSTR_AAAAAAAAAAAA	1	E2E Test Article 1775975153116	This is a test content created by Playwright automated test at 2026-04-12T06:25:53.116Z	N	0	0	5	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:26:03.718619	webmaster	2026-04-12 15:26:03.718619	webmaster	\N	0	0	\N	OPEN	\N
1011	BBSMSTR_AAAAAAAAAAAA	1	E2E Test Article 1775975210862	This is a test content created by Playwright automated test at 2026-04-12T06:26:50.862Z	N	0	0	6	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:27:02.697911	webmaster	2026-04-12 15:27:02.697911	webmaster	\N	0	0	\N	OPEN	\N
1012	BBSMSTR_AAAAAAAAAAAA	1	E2E Test Article 1775975253088	This is a test content created by Playwright automated test at 2026-04-12T06:27:33.088Z	N	0	0	7	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:27:46.329004	webmaster	2026-04-12 15:27:46.329004	webmaster	\N	0	0	\N	OPEN	\N
1013	BBSMSTR_AAAAAAAAAAAA	1	E2E Test Article 1775975487819	This is a test content created by Playwright automated test at 2026-04-12T06:31:27.819Z	N	0	0	8	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:31:38.668621	webmaster	2026-04-12 15:31:38.668621	webmaster	\N	0	0	\N	OPEN	\N
1014	BBSMSTR_AAAAAAAAAAAA	1	E2E Test Article 1775975525550	This is a test content created by Playwright automated test at 2026-04-12T06:32:05.550Z	N	0	0	9	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:32:17.408073	webmaster	2026-04-12 15:32:17.408073	webmaster	\N	0	0	\N	OPEN	\N
1015	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775976396571	Playwright Test Content 2026-04-12T06:46:36.571Z	N	0	0	10	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:46:43.367992	webmaster	2026-04-12 15:46:43.367992	webmaster	\N	0	0	\N	OPEN	\N
1016	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775976424003	Playwright Test Content 2026-04-12T06:47:04.003Z	N	0	0	11	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:47:11.558992	webmaster	2026-04-12 15:47:11.558992	webmaster	\N	0	0	\N	OPEN	\N
1017	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775976622077	Playwright Test Content 2026-04-12T06:50:22.077Z	N	0	0	12	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:50:33.398406	webmaster	2026-04-12 15:50:33.398406	webmaster	\N	0	0	\N	OPEN	\N
1018	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775976658369	Playwright Test Content 2026-04-12T06:50:58.369Z	N	0	0	13	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:51:10.718337	webmaster	2026-04-12 15:51:10.718337	webmaster	\N	0	0	\N	OPEN	\N
1019	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775976961499	Playwright Test Content 2026-04-12T06:56:01.499Z	N	0	0	14	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:56:13.078547	webmaster	2026-04-12 15:56:13.078547	webmaster	\N	0	0	\N	OPEN	\N
1020	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977002136	Playwright Test Content 2026-04-12T06:56:42.136Z	N	0	0	15	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 15:56:57.379088	webmaster	2026-04-12 15:56:57.379088	webmaster	\N	0	0	\N	OPEN	\N
1021	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977493962	Playwright Test Content 2026-04-12T07:04:53.962Z	N	0	0	16	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:05:02.188664	webmaster	2026-04-12 16:05:02.188664	webmaster	\N	0	0	\N	OPEN	\N
1022	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977525421	Playwright Test Content 2026-04-12T07:05:25.421Z	N	0	0	17	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:05:33.068695	webmaster	2026-04-12 16:05:33.068695	webmaster	\N	0	0	\N	OPEN	\N
1023	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977635506	Playwright Test Content 2026-04-12T07:07:15.506Z	N	0	0	18	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:07:29.619879	webmaster	2026-04-12 16:07:29.619879	webmaster	\N	0	0	\N	OPEN	\N
1024	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977678536	Playwright Test Content 2026-04-12T07:07:58.536Z	N	0	0	19	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:08:08.039102	webmaster	2026-04-12 16:08:08.039102	webmaster	\N	0	0	\N	OPEN	\N
1025	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977733937	Playwright Test Content 2026-04-12T07:08:53.937Z	N	0	0	20	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:09:03.829378	webmaster	2026-04-12 16:09:03.829378	webmaster	\N	0	0	\N	OPEN	\N
1026	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977764080	Playwright Test Content 2026-04-12T07:09:24.080Z	N	0	0	21	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:09:32.128845	webmaster	2026-04-12 16:09:32.128845	webmaster	\N	0	0	\N	OPEN	\N
1027	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977820800	Playwright Test Content 2026-04-12T07:10:20.800Z	N	0	0	22	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:10:29.399457	webmaster	2026-04-12 16:10:29.399457	webmaster	\N	0	0	\N	OPEN	\N
1028	BBSMSTR_AAAAAAAAAAAA	1	E2E Article 1775977851049	Playwright Test Content 2026-04-12T07:10:51.049Z	N	0	0	23	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:11:02.089345	webmaster	2026-04-12 16:11:02.089345	webmaster	\N	0	0	\N	OPEN	\N
1029	BBSMSTR_AAAAAAAAAAAA	1	E2E Article List 1775980534968	Playwright Test Content 2026-04-12T07:55:34.968Z	N	0	0	24	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:55:57.661648	webmaster	2026-04-12 16:55:57.661648	webmaster	\N	0	0	\N	OPEN	\N
1030	BBSMSTR_EEEEEEEEEEEE	1	E2E Article Calendar 1775980534971	Playwright Test Content 2026-04-12T07:55:34.971Z	N	0	0	1	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:55:57.932391	webmaster	2026-04-12 16:55:57.932391	webmaster	\N	0	0	\N	OPEN	\N
1031	BBSMSTR_DDDDDDDDDDDD	1	E2E Article QNA 1775980534970	Playwright Test Content 2026-04-12T07:55:34.970Z	N	0	0	1	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:56:00.067686	webmaster	2026-04-12 16:56:00.067686	webmaster	\N	0	0	\N	OPEN	\N
1032	BBSMSTR_AAAAAAAAAAAA	1	E2E Article List 1775980593263	Playwright Test Content 2026-04-12T07:56:33.263Z	N	0	0	25	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:56:41.23247	webmaster	2026-04-12 16:56:41.23247	webmaster	\N	0	0	\N	OPEN	\N
1033	BBSMSTR_EEEEEEEEEEEE	1	E2E Article Calendar 1775980603628	Playwright Test Content 2026-04-12T07:56:43.628Z	N	0	0	2	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:57:00.831988	webmaster	2026-04-12 16:57:00.831988	webmaster	\N	0	0	\N	OPEN	\N
1034	BBSMSTR_DDDDDDDDDDDD	1	E2E Article QNA 1775980603684	Playwright Test Content 2026-04-12T07:56:43.684Z	N	0	0	2	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 16:57:04.262981	webmaster	2026-04-12 16:57:04.262981	webmaster	\N	0	0	\N	OPEN	\N
1036	BBSMSTR_DDDDDDDDDDDD	1	E2E Article QNA 1775986090570	Playwright Test Content 2026-04-12T09:28:10.570Z	N	0	0	3	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 18:28:19.540736	webmaster	2026-04-12 18:28:19.540736	webmaster	\N	0	0	\N	OPEN	\N
1035	BBSMSTR_AAAAAAAAAAAA	1	E2E Article List 1775986090569	Playwright Test Content 2026-04-12T09:28:10.569Z	N	0	0	26	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 18:28:19.540736	webmaster	2026-04-12 18:28:19.540736	webmaster	\N	0	0	\N	OPEN	\N
1037	BBSMSTR_AAAAAAAAAAAA	1	E2E Article List 1775986118940	Playwright Test Content 2026-04-12T09:28:38.940Z	N	0	0	27	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 18:28:48.104895	webmaster	2026-04-12 18:28:48.104895	webmaster	\N	0	0	\N	OPEN	\N
1038	BBSMSTR_DDDDDDDDDDDD	1	E2E Article QNA 1775986119836	Playwright Test Content 2026-04-12T09:28:39.836Z	N	0	0	4	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 18:28:49.265528	webmaster	2026-04-12 18:28:49.265528	webmaster	\N	0	0	\N	OPEN	\N
1039	BBSMSTR_EEEEEEEEEEEE	1	E2E Article Calendar 1775986148079	Playwright Test Content 2026-04-12T09:29:08.079Z	N	0	0	3	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 18:29:16.414909	webmaster	2026-04-12 18:29:16.414909	webmaster	\N	0	0	\N	OPEN	\N
1040	BBSMSTR_EEEEEEEEEEEE	1	E2E Article Calendar 1775986207613	Playwright Test Content 2026-04-12T09:30:07.613Z	N	0	0	4	0	Y			USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 18:30:16.995254	webmaster	2026-04-12 18:30:16.995254	webmaster	\N	0	0	\N	OPEN	\N
1041	BBSMSTR_000000000160	1	테스트1	<p>테스트1</p><ul><li><p>테스트1</p></li></ul><h2 style="text-align: left;"></h2><p></p>	N	0	0	2	0	Y	\N	\N	USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 22:07:38.259139	webmaster	2026-04-12 22:07:38.259139	webmaster	\N	0	0	\N	OPEN	\N
1042	BBSMSTR_000000000160	1	Final Test Data	<p>Confirmed data for list visibility check.</p>	N	0	0	3	0	Y	\N	\N	USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 22:31:51.997375	webmaster	2026-04-12 22:31:51.997375	webmaster	\N	0	0	\N	OPEN	\N
1043	BBSMSTR_000000000160	1	Final Test Data - 2	<p>Content Visibility Test 2</p>	N	0	0	4	0	Y	\N	\N	USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 22:34:43.460564	webmaster	2026-04-12 22:34:43.460564	webmaster	\N	0	0	\N	OPEN	\N
1044	BBSMSTR_000000000160	1	Visibility Check Final	<p>test content for visibility check</p>	N	0	0	5	0	Y	\N	\N	USRCNFRM_99999999999	관리자	\N	\N	\N	\N	\N	2026-04-12 22:38:02.563774	webmaster	2026-04-12 22:38:02.563774	webmaster	\N	0	0	\N	OPEN	\N
\.


--
-- Data for Name: nbbsmaster; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbbsmaster (bbs_id, bbs_nm, bbs_intrcn, bbs_ty_code, reply_posbl_at, file_atch_posbl_at, atch_posbl_file_number, atch_posbl_file_size, use_at, tmplat_id, cmmnty_id, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, blog_id, blog_at, bbs_attrb_code) FROM stdin;
BBSMSTR_AAAAAAAAAAAA	공지사항	공지사항 게시판	BBST01	Y	Y	3	5242880	Y	TMPLAT_BOARD_DEFAULT	\N	SYSTEM	2025-12-29 04:51:11.602304	\N	\N	\N	\N	\N
BBSMSTR_000000000060	E2E_WIZARD_1774397715142	E2E Test Description for E2E_WIZARD_1774397715142	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:15:19.703137	webmaster	2026-03-25 09:15:19.703137	\N	N	\N
BBSMSTR_000000000061	E2E_WIZARD_1774397836128	E2E Test Description for E2E_WIZARD_1774397836128	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:17:19.954097	webmaster	2026-03-25 09:17:19.954097	\N	N	\N
BBSMSTR_000000000070	E2E_WIZARD_1774398347916	E2E Test Description for E2E_WIZARD_1774398347916	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:25:52.613085	webmaster	2026-03-25 09:25:52.613085	\N	N	\N
BBSMSTR_000000000080	E2E_WIZARD_1774398596618	E2E Test Description for E2E_WIZARD_1774398596618	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:30:00.388978	webmaster	2026-03-25 09:30:00.388978	\N	N	\N
BBSMSTR_000000000090	E2E_WIZARD_1774398718926	E2E Test Description for E2E_WIZARD_1774398718926	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:32:02.749443	webmaster	2026-03-25 09:32:02.749443	\N	N	\N
BBSMSTR_000000000100	E2E_WIZARD_1774398869107	E2E Test Description for E2E_WIZARD_1774398869107	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:34:32.867884	webmaster	2026-03-25 09:34:32.867884	\N	N	\N
BBSMSTR_000000000101	E2E_WIZARD_1774398989581	E2E Test Description for E2E_WIZARD_1774398989581	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:36:33.730258	webmaster	2026-03-25 09:36:33.730258	\N	N	\N
BBSMSTR_000000000110	test	test	BBST02	Y	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:46:35.381262	webmaster	2026-03-25 09:46:35.381262	\N	N	\N
BBSMSTR_000000000120	test	test	BBST02	Y	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 09:50:10.175635	webmaster	2026-03-25 09:50:10.175635	\N	N	\N
BBSMSTR_000000000121	E2E_WIZARD_1774401084208	E2E Test Description for E2E_WIZARD_1774401084208	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 10:11:27.389465	webmaster	2026-03-25 10:11:27.389465	\N	N	\N
BBSMSTR_000000000130	E2E_WIZARD_1774434653568	E2E Test Description for E2E_WIZARD_1774434653568	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 19:31:03.273227	webmaster	2026-03-25 19:31:03.273227	\N	N	\N
BBSMSTR_000000000132	E2E_WIZARD_1774434882614	E2E Test Description for E2E_WIZARD_1774434882614	BBST02	N	Y	3	5242880	Y	TMPLT_LIST		webmaster	2026-03-25 19:34:45.958779	webmaster	2026-03-25 19:34:45.958779	\N	N	\N
BBSMSTR_000000000140	E2E Test Board 1774796716740	This is an automated E2E test board creation.	BBST02	N	Y	3	5242880	N	TMPLT_LIST	\N	webmaster	2026-03-30 00:05:32.510369	webmaster	2026-03-30 02:37:27.4403	\N	N	\N
BBSMSTR_000000000131	E2E Test Board 1774434865898	This is an automated E2E test board creation.	BBST01	N	Y	3	5242880	N	TMPLT_HUB		webmaster	2026-03-25 19:34:33.910995	webmaster	2026-03-30 02:37:28.88978	\N	N	\N
BBSMSTR_000000000150	E2E Test Board 1775556282455	This is an automated E2E test board creation.	BBST01	N	Y	3	5242880	N	TMPLT_HUB	\N	webmaster	2026-04-07 19:05:03.75703	webmaster	2026-04-07 19:34:36.593944	\N	N	\N
BBSMSTR_000000000151	E2E Test Board 1775562468101	This is an automated E2E test board creation.	BBST01	N	Y	3	5242880	N	TMPLT_HUB	\N	webmaster	2026-04-07 20:48:15.09655	webmaster	2026-04-07 20:51:42.750014	\N	N	\N
BBSMSTR_000000000160	test1	테스트1	BBST03	Y	Y	3	5242880	Y	TMPLT_GALLERY	\N	webmaster	2026-04-11 22:51:52.349745	webmaster	2026-04-11 22:51:52.349745	\N	N	\N
BBSMSTR_000000000170	E2E Test Board 1776005933428	This is an automated E2E test board creation.	BBST02	N	Y	3	5242880	N	TMPLT_LIST	\N	webmaster	2026-04-12 23:59:54.494484	webmaster	2026-04-13 00:27:28.189642	\N	N	\N
BBSMSTR_BBBBBBBBBBBB	자주 묻는 질문(FAQ)	지식 허브 FAQ 게시판	BBST06	N	Y	3	5242880	Y	TMPLT_FAQ	\N	SYSTEM	2026-04-17 07:37:30.357512	\N	\N	\N	\N	\N
BBSMSTR_DDDDDDDDDDDD	질의응답(Q&A)	Q&A 게시판입니다.	BBST04	Y	Y	3	\N	Y	TMPLT_QNA	\N	USRCNFRM_00000000001	2026-04-12 07:53:36.432144	\N	\N	\N	\N	\N
BBSMSTR_EEEEEEEEEEEE	엔터프라이즈 위키	일정 게시판입니다.	BBST07	N	Y	3	\N	Y	TMPLT_WIKI	\N	USRCNFRM_00000000001	2026-04-12 07:53:36.432144	\N	\N	\N	\N	\N
BBSMSTR_CCCCCCCCCCCC	자유게시판	업무 게시판	BBST01	Y	Y	3	5242880	Y	TMPLAT_BOARD_DEFAULT	\N	SYSTEM	2025-12-29 04:51:11.602304	\N	\N	\N	\N	\N
\.


--
-- Data for Name: nbbsmasteroptn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbbsmasteroptn (bbs_id, answer_at, stsfdg_at, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
BBSMSTR_000000000060	N	N	2026-03-25 09:15:19.703137	2026-03-25 09:15:19.703137	webmaster	\N
BBSMSTR_000000000061	N	N	2026-03-25 09:17:19.954097	2026-03-25 09:17:19.954097	webmaster	\N
BBSMSTR_000000000070	N	N	2026-03-25 09:25:52.613085	2026-03-25 09:25:52.613085	webmaster	\N
BBSMSTR_000000000080	N	N	2026-03-25 09:30:00.231795	2026-03-25 09:30:00.231795	webmaster	webmaster
BBSMSTR_000000000090	N	N	2026-03-25 09:32:02.592677	2026-03-25 09:32:02.592677	webmaster	webmaster
BBSMSTR_000000000100	N	N	2026-03-25 09:34:32.70843	2026-03-25 09:34:32.70843	webmaster	webmaster
BBSMSTR_000000000101	N	N	2026-03-25 09:36:33.395139	2026-03-25 09:36:33.395139	webmaster	webmaster
BBSMSTR_000000000110	N	N	2026-03-25 09:46:35.207878	2026-03-25 09:46:35.207878	webmaster	webmaster
BBSMSTR_000000000120	N	N	2026-03-25 09:50:10.008953	2026-03-25 09:50:10.008953	webmaster	webmaster
BBSMSTR_000000000121	N	N	2026-03-25 10:11:27.237195	2026-03-25 10:11:27.237195	webmaster	webmaster
BBSMSTR_000000000130	N	N	2026-03-25 19:31:02.99984	2026-03-25 19:31:02.99984	webmaster	webmaster
BBSMSTR_000000000132	N	N	2026-03-25 19:34:45.801843	2026-03-25 19:34:45.801843	webmaster	webmaster
BBSMSTR_000000000140	N	N	2026-03-30 00:05:32.328809	2026-03-30 02:37:27.443315	webmaster	\N
BBSMSTR_000000000131	N	N	2026-03-25 19:34:33.75737	2026-03-30 02:37:28.88978	webmaster	webmaster
BBSMSTR_000000000150	N	N	2026-04-07 19:05:03.415205	2026-04-07 19:34:36.593944	webmaster	\N
BBSMSTR_000000000151	N	N	2026-04-07 20:48:14.931268	2026-04-07 20:51:42.750014	webmaster	\N
BBSMSTR_000000000160	N	N	2026-04-11 22:51:52.108724	2026-04-11 22:51:52.108724	webmaster	\N
BBSMSTR_000000000170	N	N	2026-04-12 23:59:53.958227	2026-04-13 00:27:28.189642	webmaster	\N
BBSMSTR_DDDDDDDDDDDD	Y	Y	2026-04-17 07:37:30.357512	\N	SYSTEM	\N
\.


--
-- Data for Name: nbbsuse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbbsuse (bbs_id, trget_id, use_at, regist_se_code, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nbkmkmenumanageresult; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbkmkmenumanageresult (menu_id, emplyr_id, menu_nm, progrm_stre_path, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nblog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nblog (blog_id, blog_nm, blog_intrcn, use_at, regist_se_code, tmplat_id, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, bbs_id, blog_at) FROM stdin;
\.


--
-- Data for Name: nbloguser; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nbloguser (blog_id, emplyr_id, mngr_at, mber_sttus, sbscrb_de, secsn_de, use_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: ncalrestde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncalrestde (restde_no, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id, restde_dc, restde_de, restde_nm, restde_se_code) FROM stdin;
\.


--
-- Data for Name: nclub; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nclub (clb_id, cmmnty_id, clb_nm, clb_intrcn, use_at, regist_se_code, tmplat_id, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nclubuser; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nclubuser (clb_id, cmmnty_id, oprtr_at, sbscrb_de, secsn_de, use_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, emplyr_id) FROM stdin;
\.


--
-- Data for Name: ncmmnty; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncmmnty (cmmnty_id, cmmnty_nm, cmmnty_intrcn, use_at, regist_se_code, tmplat_id, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: ncmmntyuser; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncmmntyuser (cmmnty_id, emplyr_id, mngr_at, mber_sttus, sbscrb_de, secsn_de, use_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: ncnsltlist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncnsltlist (cnslt_id, cnslt_sj, othbc_at, email_adres, cnslt_cn, managt_cn, managt_de, rdcnt, atch_file_id, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, area_no, middle_telno, end_telno, frst_mbtlnum, middle_mbtlnum, end_mbtlnum, writng_de, wrter_nm, email_answer_at, qna_process_sttus_code, writng_password) FROM stdin;
\.


--
-- Data for Name: ncnsltmanage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncnsltmanage (cnslt_id, cnslt_sj, cnslt_cn, othbc_at, writng_de, wrter_id, wrter_nm, managt_cn, managt_de, qna_process_sttus_code, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ncntcmessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncntcmessage (cntc_mssage_id, cntc_mssage_nm, upper_cntc_mssage_id, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, use_at) FROM stdin;
\.


--
-- Data for Name: ncntcmessageitem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncntcmessageitem (cntc_mssage_id, iem_id, iem_nm, iem_ty, iem_lt, use_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ncntcservice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncntcservice (instt_id, sys_id, svc_id, svc_nm, requst_mssage_id, rspns_mssage_id, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, use_at) FROM stdin;
\.


--
-- Data for Name: ncntntslist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncntntslist (cntnts_id, emplyr_id) FROM stdin;
\.


--
-- Data for Name: ncomment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncomment (ntt_id, bbs_id, answer_no, wrter_id, wrter_nm, answer, use_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, password) FROM stdin;
\.


--
-- Data for Name: ndeptjob; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ndeptjob (dept_job_id, dept_jobbx_id, dept_job_nm, dept_job_cn, atch_file_id, charger_id, priort, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ndeptjobbx; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ndeptjobbx (dept_jobbx_id, dept_jobbx_nm, dept_id, indict_ordr, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ndiaryinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ndiaryinfo (schdul_id, diary_id, diary_progrsrt, diary_nm, drct_matter, partclr_matter, atch_file_id, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: ndtausestats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ndtausestats (dta_use_stats_id, bbs_id, ntt_id, atch_file_id, file_sn, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nemplyrinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nemplyrinfo (emplyr_id, orgnzt_id, user_nm, password, empl_no, ihidnum, sexdstn_code, brthdy, fxnum, house_adres, password_hint, password_cnsr, house_end_telno, area_no, detail_adres, zip, offm_telno, mbtlnum, email_adres, ofcps_nm, house_middle_telno, group_id, pstinst_code, emplyr_sttus_code, esntl_id, crtfc_dn_value, sbscrb_de, lock_at, lock_cnt, lock_last_pnttm, chg_pwd_last_pnttm, chg_pwd_cnt, role, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
TEST1	ORGNZT_0000000000000	테스트1	yfHoVdC88xaHuSkJSJYdLcw3athlaHO9oUzEvD/EwFI=	20112059	\N	F	20111130            	1566-2059	서울 중구 무교동 한국정보화진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	관리자	1566	GROUP_00000000000000	00000001	P	USRCNFRM_00000000000		2025-12-29 01:39:41.018651	\N	\N	\N	\N	\N	USER	\N	\N	\N	\N
webmaster	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$saMrv8x8HW94SaeINmB.iuFhtgKp3C482NVFjGl3YF2mZ9SHceBYq	20112060	\N	F	20111130            	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001	P	USRCNFRM_99999999999		2025-12-29 01:39:41.020582	N	0	\N	2026-04-22 14:03:46.603665	\N	ADMIN	\N	SYSTEM	\N	2026-04-22 14:03:46.683844
user_regular	\N	일반사용자	{bcrypt}$2a$10$w5r8aqylrglwKDUgdUdtNeNt5ohSt/GVbwRvpw5/Sb5f5cMJCrSMm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002	\N	2026-04-14 17:58:22.573552	N	0	\N	2026-04-22 14:03:46.836792	\N	USER	SYSTEM	SYSTEM	2026-04-14 17:58:22.573552	2026-04-22 14:03:46.849987
\.


--
-- Data for Name: nemplyrinfo_aud; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nemplyrinfo_aud (emplyr_id, rev, revtype, orgnzt_id, user_nm, password, empl_no, ihidnum, sexdstn_code, brthdy, fxnum, house_adres, password_hint, password_cnsr, house_end_telno, area_no, detail_adres, zip, offm_telno, mbtlnum, email_adres, ofcps_nm, house_middle_telno, group_id, pstinst_code, emplyr_sttus_code, esntl_id, crtfc_dn_value, sbscrb_de, lock_at, lock_cnt, lock_last_pnttm, chg_pwd_last_pnttm, chg_pwd_cnt, role) FROM stdin;
webmaster	2	1	ORGNZT_0000000000000	웹마스터	lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w=	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	\N	\N	ADMIN
webmaster	52	1	ORGNZT_0000000000000	관리자	lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w=	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	\N	\N	USER
user_regular	102	0	\N	일반사용자	{bcrypt}$2a$10$y.7OXJ.JCAOUJ9bmPbojs.e8FN/5agnbptQChcsCVXUXXdlvWRe.y	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	\N	\N	\N	\N	USER
webmaster	152	1	ORGNZT_0000000000000	관리자	lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w=	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	\N	\N	ADMIN
user_regular	202	1	\N	일반사용자	{bcrypt}$2a$10$y.7OXJ.JCAOUJ9bmPbojs.e8FN/5agnbptQChcsCVXUXXdlvWRe.y	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	\N	\N	USER
webmaster	252	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$WtyGwq7drkUf2Hs4VoMjA.PhbF.gQfOSVf.iCzJj0CM5Fel97jnCC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-13 21:43:06.736408	\N	ADMIN
user_regular	253	1	\N	일반사용자	{bcrypt}$2a$10$pIu45C1xfsYJaCx.Y73jPe3oS72roCtb6kw9coBxM1C5bZM20VGPG	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-13 21:43:08.20165	\N	USER
webmaster	302	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$3xVZk5pqXP1fyDClWF3SxucfsAUuIGb4hapbcheX4rlBdhgxooxy2	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-13 21:46:12.233245	\N	ADMIN
user_regular	303	1	\N	일반사용자	{bcrypt}$2a$10$vs1vvvKoqK45VMysUMgB0umSVlgcyT2W8tBMLqJULmILqyMO4uVgO	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-13 21:46:13.677888	\N	USER
webmaster	352	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$wioqTzNzidylclEZXus4wu4O2lnIMYCJfY0PWs.NHNEA32Jt.48GS	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-13 22:47:05.19088	\N	ADMIN
user_regular	353	1	\N	일반사용자	{bcrypt}$2a$10$it7gZ1J4irCAjaImFZbBHOG4QV8yn7PJ2MnibX6jnRwO6DddY5RPC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-13 22:47:08.10708	\N	USER
webmaster	402	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$Q9Y0.9qQXFnWWEEpVPGA1.miEiuLe9dlaDH.ENP9zf82mCcZxEsg6	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-16 10:39:54.273457	\N	ADMIN
user_regular	403	1	\N	일반사용자	{bcrypt}$2a$10$ERurSoj6qSUhdRQpUasd4OvU8TD71T2MFt4Bwlq5R96wyBlqySRBq	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-16 10:39:55.700856	\N	USER
webmaster	452	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$9/3VZVgUcHLJKosvpJU3kO2UYZ1X5yYSD/Y04UcuNOTUTvvUiAjCm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-16 10:50:58.943355	\N	ADMIN
user_regular	453	1	\N	일반사용자	{bcrypt}$2a$10$YLnjeRgCB6mjYwqm9a5IKOmUQ0ZSGeWkV/vAJAH5kotq62lXZ63tG	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-16 10:51:00.455719	\N	USER
webmaster	502	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$vdG5n3LwckbOcP9TfWDGv.DCjd5o9CNmeb5Ka8PY7rePUdu/lYHIO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-16 10:58:37.2967	\N	ADMIN
user_regular	503	1	\N	일반사용자	{bcrypt}$2a$10$Y3zWVBMBqq0S4MjUrYIw6OPSGrJv95WVKtIm6zi75/8x3xPjMtU3m	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-16 10:58:38.62766	\N	USER
webmaster	552	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$NRnqN.nwZxWe01BiSsk4Su.qlAj87Ys//VJVJf2WKEs3JzaQyJsGO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-16 16:32:57.671166	\N	ADMIN
user_regular	553	1	\N	일반사용자	{bcrypt}$2a$10$bMmSeYF1.khtxxRUcD2tOO3U82j8K8xiUTm9RLJFu6DsyGIfxJOHy	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-16 16:32:59.145887	\N	USER
webmaster	602	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$FDSBWywwUWAv6AoqJAUe9eYgtK5cpSP/OC9ma9AZRJMGcHclUHU7y	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-16 17:21:21.88991	\N	ADMIN
user_regular	603	1	\N	일반사용자	{bcrypt}$2a$10$PQ07f5KHZKGPIKAvtX6cMeTs6BHIXiNRTxG8yCxWR21i1uS7m5hku	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-16 17:21:23.288012	\N	USER
webmaster	652	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$44wmaR7kyu1Ybc1H3lHM8O6QVtbi2lUn/4suBtKL70ydt9cHug8I.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-17 11:32:28.377496	\N	ADMIN
user_regular	653	1	\N	일반사용자	{bcrypt}$2a$10$yEzb/opLhRjXKaGOB.BJVuXH.CPTFvDboOVZGfDI3/nX.hd8oji0K	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-17 11:32:29.824023	\N	USER
webmaster	702	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$pWHLs5w1IjWnH3EyZ8EPXOTn1HFRc1ptS5W14F.f8IvCwQjCjjtQy	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-17 14:21:15.776474	\N	ADMIN
user_regular	703	1	\N	일반사용자	{bcrypt}$2a$10$5DeaJHeidSqs4cwLB3WG2.yZvorQsnFZ2DY46dd/M8GAyWh7VfyRa	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-17 14:21:17.270965	\N	USER
webmaster	752	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$RnbcvYJKgmfeF9XxLzvfkeBc8fKnCs9YrgIgyR9Un7Qc.m5Z059J6	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-17 14:28:06.914002	\N	ADMIN
user_regular	753	1	\N	일반사용자	{bcrypt}$2a$10$AQpQ/7GYG7p5eMReOZnzDObhzYwUZoeUiZW5JS0oCMemqnsGAT6kC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-17 14:28:08.321533	\N	USER
webmaster	802	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$/Z/5VaCKaw3WaFeey6zKxOTJ5OL9lnjYJLA6uLC2J3EjlP9nJTg/O	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-17 14:42:38.805996	\N	ADMIN
user_regular	803	1	\N	일반사용자	{bcrypt}$2a$10$af62to5jz..1svBBsmf.A.azyOTgG2i2QGIqImxrUTZ96tTbYMibC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-17 14:42:40.215488	\N	USER
webmaster	852	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$iKTBPg5nmWGgF0bVqcRryOlfDjvGWqJUnD4AsnxXrF5Ca4fwyMGxO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-18 20:27:26.726488	\N	ADMIN
user_regular	853	1	\N	일반사용자	{bcrypt}$2a$10$MXRQwfs2VLr9GMPZwfjYXOk6J9AA4M4lIUFbLTrphyg4SFcFKaiCm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-18 20:27:28.357349	\N	USER
webmaster	902	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$sndYBd4Tf/wH0T2ojfyyNeYKXZKg0GGEu13zTRwZyfifESAl.IOl6	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-18 20:30:23.405805	\N	ADMIN
user_regular	903	1	\N	일반사용자	{bcrypt}$2a$10$vmbn.w.E//e2wesiE/Xy8eVYhEtyvGdJLIeqvpfLQZEh6YSV1hj6m	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-18 20:30:25.053211	\N	USER
webmaster	952	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$6b.5U1cfs/MMzizcTpuGsey6g5d2GyTBTskEZJbxG5uWqqkDYObPW	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-18 20:41:34.534806	\N	ADMIN
user_regular	953	1	\N	일반사용자	{bcrypt}$2a$10$Gyw5XgWzyIYZYVpuGcfzyuIOm81lIQj3QJ.nIHM/VoTHwZlWIcodG	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-18 20:41:36.129053	\N	USER
webmaster	1002	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$Nv8PV7bTk3WuONiTCpN.Tuzz6P.cj0vWx.arr6ryYpsrWl0c5M3RK	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-18 20:44:57.927852	\N	ADMIN
user_regular	1003	1	\N	일반사용자	{bcrypt}$2a$10$Db1QciticSR6XTe.aSsSVe9Q/v08g22WhJG5C3xlHva7XSIGRWlAC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-18 20:44:59.35866	\N	USER
webmaster	1052	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$jatOkRjK7.XPATU.Q4Kq1OpxzKQSNoVpBHWGFhCviaC8nA7vk4gfG	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-19 09:42:38.467502	\N	ADMIN
user_regular	1053	1	\N	일반사용자	{bcrypt}$2a$10$tH2l1pfbFeXvRjWzP2jtAudj4CSRSNRDSF0GE5gesk/kzM7FXeyWC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-19 09:42:39.867958	\N	USER
webmaster	1102	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$wzhbpJXZtrxL5iSkDYInCeF3gGQz6XxalPz5N1VvsvOS27BwzRkoy	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-19 10:00:04.948004	\N	ADMIN
user_regular	1103	1	\N	일반사용자	{bcrypt}$2a$10$ZpsVdVOEY8j7UxewVOyRhuV0O.XNjU2Vg5FSqtapWT4scmHApWKou	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-19 10:00:06.391101	\N	USER
webmaster	1152	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$Fj6tu2cWkiYL.1Uf86b6luX3UExvIIR7399bfWJW5cGhuAIJIhEqm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-19 10:08:12.150491	\N	ADMIN
user_regular	1153	1	\N	일반사용자	{bcrypt}$2a$10$WZP5KrSGpG9WJLmSHOaOBeLW7bKSb5/1whhHmZn2bgvU9T6aIlpQ2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-19 10:08:13.554039	\N	USER
webmaster	1202	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$w7oT8zi3T1nI8gcSKG01h.LAjbO1FJNjsohFsyymgCz9a7wrzm1ve	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-19 22:50:49.658561	\N	ADMIN
user_regular	1203	1	\N	일반사용자	{bcrypt}$2a$10$S7nxmcG8u.cuhFyJeV.WouRJ06qxSPeesGGhsvtWExEB82UnWnzE2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-19 22:50:51.370014	\N	USER
webmaster	1252	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$D5nqOrNKMcVAdM/Mf0hcpu9Wu6VrSH5zm6v8Bux0LpX3SfIneY/yq	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-20 12:39:56.249317	\N	ADMIN
user_regular	1253	1	\N	일반사용자	{bcrypt}$2a$10$mCaiocFzOZJBljOcCOAA2.5KvD3BIDpGs0SEnHIsdQtVGLOIXem5u	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-20 12:39:57.654703	\N	USER
webmaster	1302	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$o/3hQVKxJRUh0z.CbXIYpe.NClBHZDTZ3e.IlOnvj8mhmDk1TPPdu	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-20 16:06:30.835874	\N	ADMIN
user_regular	1303	1	\N	일반사용자	{bcrypt}$2a$10$aVbDS3jKl85XM/h0IccYquTzzjtzUXdSfyJ.SamH0I9Iv8h3YfMD6	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-20 16:06:32.279072	\N	USER
webmaster	1352	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$fygXaUhcsf1y3ndGTver.uNp2CpUJjrF.Z5k9aX0b1gdky33Pt8rS	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-20 20:14:49.694041	\N	ADMIN
user_regular	1353	1	\N	일반사용자	{bcrypt}$2a$10$N2tVOO/yMRhDZN1oFJAqhOnRamTjDuXMVNnC6wJAcmX9DBoym2XXe	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-20 20:14:51.229222	\N	USER
webmaster	1402	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$ZMAW9Qo4myR/oJmFFjEuO.G0rodndR6fNNfKZiCcKT9xnApZHJRHS	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-21 11:51:43.135114	\N	ADMIN
user_regular	1403	1	\N	일반사용자	{bcrypt}$2a$10$cCNXTSGWkKPdomtJQJWOcuzvjgX5.HghfU8bMWp1JEPejSPV6S7Zm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-21 11:51:45.137666	\N	USER
webmaster	1452	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$cUVHjcWW.uhkaJeiI4vKeOY5TcgB3ubpSVy1s2hhMhlPRqd4BgAPm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-21 17:10:04.931056	\N	ADMIN
user_regular	1453	1	\N	일반사용자	{bcrypt}$2a$10$srn6DW0KI5n1xKg.phOaR.BBuTVIA5C4Inn6xn171ijD9ojn9q6HC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-21 17:10:07.181563	\N	USER
webmaster	1502	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$1uxaNEPKEqKh9p.KFtVl2.f8MB9C7tFxSxH0B/9J.CQaQC2C4Qioq	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-22 14:33:53.540385	\N	ADMIN
user_regular	1503	1	\N	일반사용자	{bcrypt}$2a$10$/RYOhydD33dhRxasXSftU.Qp6buy1V8aN7z8Zx0OWduDR1U0GSlAu	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-22 14:33:55.259669	\N	USER
webmaster	1552	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$ssSBVazt5nyqyHHSwYZ1jOrySWf0EJXMF0L67BjapGaJJSV246eTq	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-22 15:53:39.815118	\N	ADMIN
user_regular	1553	1	\N	일반사용자	{bcrypt}$2a$10$j/Qi.3TUFlEc/UAWaUw.B./hbLR1kZ.ZxywpyZFlDMDWjrHI1ZZGe	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-22 15:53:41.327996	\N	USER
webmaster	1602	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$eWgdMKSp2OW5zoigm4aCmOu.hhzwZRc3K3RzdRtAOIzawH/LAlNhC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-22 15:55:29.519979	\N	ADMIN
user_regular	1603	1	\N	일반사용자	{bcrypt}$2a$10$gxOoLbTQ55.oSlZq4i7nxeQ3FGqxIYXLjnzjedaWEwDbuXDdzgtDS	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-22 15:55:31.092762	\N	USER
webmaster	1652	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$9SfGTixU3Qj30I6uV8lvmexlzUr98L2E2N71ysCG7KXrFoZ29tnAO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-23 08:50:49.93961	\N	ADMIN
user_regular	1653	1	\N	일반사용자	{bcrypt}$2a$10$l71cm.fZZdTm0svRXfL.MeN7PLPC3/aT6EudLSKi7rxkgowxLEOX6	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-23 08:50:51.486457	\N	USER
webmaster	1702	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$a4JDilBTslgskV18xbNRu.ySufNWbmfW3DIha54U5AArjj8htwcsi	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-23 22:33:02.858915	\N	ADMIN
user_regular	1703	1	\N	일반사용자	{bcrypt}$2a$10$Hx9oX0H4fT7rPrq5DOISvOF/JyJfNoXl9TiqeBlJAlbn4zg1JsCoG	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-23 22:33:04.472991	\N	USER
webmaster	1752	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$MEB9r1fMmKZuU7yEAil4des8L8vSfQrb/VBeFZ3oKt8t9LeWg/xEi	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-24 08:56:52.378885	\N	ADMIN
user_regular	1753	1	\N	일반사용자	{bcrypt}$2a$10$M82K03GmVeBxUUdyGjYtfufFJ0IiSnFn398npsRMqQEcnkJLTr41S	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-24 08:56:53.875387	\N	USER
webmaster	1802	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$7kqS3mD6UARdW3oXjRhMme3z06MpC6Fgzr5uAgggWdOIaVFij5s5i	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-24 10:13:11.899747	\N	ADMIN
user_regular	1803	1	\N	일반사용자	{bcrypt}$2a$10$DDd9N4ubgrkCtE0Er1bcQOLJTK0KPOkgyHw4gv8Y4VZJLHueAeqSC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-24 10:13:13.499557	\N	USER
webmaster	1852	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$eeN6Cx/eaGavqNEo5b7A5e5rijnz/HWsvt0t7C707F.Yt/VC8S4Z2	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-24 22:19:44.379642	\N	ADMIN
user_regular	1853	1	\N	일반사용자	{bcrypt}$2a$10$HCPdnLVZlVIK8W4XI/.F0u7q18o.wnkCEkSK74cj7GRDq3t7qgKcm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-24 22:19:46.543192	\N	USER
webmaster	1902	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$x69P2Qp8zZmYd69OP4MMB.niCTozZLbaOjM1Zpql5jzn44/7YRTs2	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 00:17:27.162285	\N	ADMIN
user_regular	1903	1	\N	일반사용자	{bcrypt}$2a$10$xHrQhLF7O1AT6U.KJD1j0OD9y1KrBVPWuv0l.bhMJwC5UvVWmhv02	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 00:17:29.965136	\N	USER
webmaster	1952	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$UTxQKHPBzVe8Mqyh36dJTOhpRXfDOFxgJveSHPW8Wng3wuQ9l/5L2	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 06:29:04.224336	\N	ADMIN
user_regular	1953	1	\N	일반사용자	{bcrypt}$2a$10$gLleOJxdVlvlwsKHCA0WO.GM59R4ngKVFdeFHcT4gcOmWAfZbhgRe	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 06:29:05.745527	\N	USER
webmaster	2002	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$Y.t9m6BUWsPvJV.zdjV7r.KGtKmlUtAYuUHAu.yZ2sHzKtl3hxPtO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 08:28:12.889548	\N	ADMIN
user_regular	2003	1	\N	일반사용자	{bcrypt}$2a$10$Uay0aFNYBf2m0DQ0fqvUuO3XKKWeEF2rRksNe2zZF4UwZA05M0oNO	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 08:28:14.350397	\N	USER
webmaster	2052	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$uiL1P0UoOD5sOgYfwHIlEe9qhTOx5vLQ/fzTjQagfbf4a4Iwe.Vxe	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:02:22.518856	\N	ADMIN
user_regular	2053	1	\N	일반사용자	{bcrypt}$2a$10$t/GcWaS2jRz7Ha5Xt/YAa.tELU.grh73TRdb2uniH0O3thjWJRQsS	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:02:23.89275	\N	USER
webmaster	2102	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$K.OCVywJ0WZyOf4mLZ6ycuFZY0uS.Chw7n6QwQ/MAJSzJ0fhpts9q	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:05:18.232796	\N	ADMIN
user_regular	2103	1	\N	일반사용자	{bcrypt}$2a$10$cHirys1ql8SmElcmbm8hHuDNm0LxJB452lqrCFD4Js9ghaHwW/rCi	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:05:19.641013	\N	USER
webmaster	2152	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$8jmKL9oWVSBwb4zKgrxML.WfIPhIcLiMszT5DUUBDRkDNIF4G62qm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:10:20.648243	\N	ADMIN
user_regular	2153	1	\N	일반사용자	{bcrypt}$2a$10$JZ4W6r3.XYqhSUPkymL0vODmyZ7cI3Z.QImUFjO6Ypt/H6lAdDvPm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:10:21.979308	\N	USER
webmaster	2202	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$8lRW/lvhZTe0.slxzeNiiezU5uM2F1e/KDkM13DdBFxnQMeG3KorC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:14:12.227681	\N	ADMIN
user_regular	2203	1	\N	일반사용자	{bcrypt}$2a$10$WGrZGm0bFKJMjaQ3dQ6lj.ks5Vs1sVYA3ZxJwBdf2bmcnLaicWuAq	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:14:13.551065	\N	USER
webmaster	2252	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$p1kNLmRYURbFw0VPj7WEDeU0WZFcybOmIUdzuWCHTVQxmhNXCFXVm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:24:56.238949	\N	ADMIN
user_regular	2253	1	\N	일반사용자	{bcrypt}$2a$10$M0ith/ShNuDRu9SiOT.JO.MHUlooL6Enp/YW0ouwcJn1CRMYocjzO	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:25:06.317324	\N	USER
webmaster	2302	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$3yJsbkFwaVp6dcmHx8lco.B7qAmVjRtgkO1vHYjQb4giWf8dQSEYC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:28:55.213381	\N	ADMIN
user_regular	2303	1	\N	일반사용자	{bcrypt}$2a$10$3CdcoyU48ANAoZal30gdUujPqXI4UFvcsgj4Lwj0YUEpsEHljBkXq	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:28:56.615528	\N	USER
webmaster	2352	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$w4k0AWD68IfJCipxV5/TJum1m/wU.pqOrZel4nhvrmef4jzuz93Me	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:31:45.406684	\N	ADMIN
user_regular	2353	1	\N	일반사용자	{bcrypt}$2a$10$rgGxDAjak9OAoMYuhKsKhOw9SBOLTVXbrkEDz5N8d5Z16omNYvvZO	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:31:46.756069	\N	USER
webmaster	2402	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$NF/6DG2bfh2I0G12/9QqCe08LRjOv0LxRbK.OSX0qD00Luz13OUMW	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:34:02.458987	\N	ADMIN
user_regular	2403	1	\N	일반사용자	{bcrypt}$2a$10$w6IZ2E8oEaAYtFKIdquRPOLDMOb7c1iSAkiLp2jIwcGjOdIYHbn96	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:34:03.83739	\N	USER
webmaster	2452	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$qsHqT/8pxXRs8IDzySxp3uvFErzl2Htj/74HU7nOeOC/CpQ07ROye	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:39:09.568383	\N	ADMIN
user_regular	2453	1	\N	일반사용자	{bcrypt}$2a$10$JpK6DDU2rIH1cPRtb.bui.gyTHuWfUoK3RK4Tzx3dGvwoLqIenME2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:39:10.980058	\N	USER
webmaster	2502	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$9CBg8JSitz.KsndxFGsoMOIFIbzoqXrhbBDpC/FPkL1eNJ07cs3PG	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 09:48:58.159987	\N	ADMIN
user_regular	2503	1	\N	일반사용자	{bcrypt}$2a$10$NWFQyjR9e0ej8h22i4qTme8OxwZbSpQHhsLyZxdeaXr5I8ATFMPaW	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 09:48:59.552294	\N	USER
webmaster	2552	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$LfXvMsiuL5nBYIVA094sh.6yn4wQadAFxXxOjz4FpQgYBF8nGeQpu	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 18:29:14.252788	\N	ADMIN
user_regular	2553	1	\N	일반사용자	{bcrypt}$2a$10$QFMwNhi.5JltP1TirpDHIOWpT7jN85g46IUyjNJiyG6VNE9iRnYFW	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 18:29:16.063771	\N	USER
webmaster	2602	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$BY6cvagRmK29RzLOo49pROfedsi6N5xH.wPKmB0vC2PKZnMQ5oY7.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 18:30:18.046612	\N	ADMIN
user_regular	2603	1	\N	일반사용자	{bcrypt}$2a$10$2Hd/vxYhIz1ga4YOqLTx1eVz.1r2sK4JNh/epW7htlNPoHhJZkTve	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 18:30:20.097226	\N	USER
webmaster	2652	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$2bGo7.OUsz5LMRQHzy6/i.cOV/2EwyLvuUx6vhRTEPibw49vAg6AO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 18:31:52.862164	\N	ADMIN
user_regular	2653	1	\N	일반사용자	{bcrypt}$2a$10$SxXsrqWt7hcWYQ3L7.dk/u32E6k8wKt8YlQUZzKsoWtyh0n547NeC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 18:31:55.141731	\N	USER
webmaster	2702	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$h4wDF0ue1vf8LrTaJUWd3.r0iYWDTEYm.3O6Od/WLwMJLv2KimLTC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 18:39:28.028025	\N	ADMIN
user_regular	2703	1	\N	일반사용자	{bcrypt}$2a$10$iKh.5basDTSlsjXAWEZ/lORqFCaQOWT852W6K.eNKCxm8bflRaWl.	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 18:39:32.835639	\N	USER
webmaster	2752	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$RHpNHWjpWYlS4UL9pD2dNuA4sn06K5Ftqdu.gEL8glLZdPya.tjA.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 18:50:23.801061	\N	ADMIN
user_regular	2753	1	\N	일반사용자	{bcrypt}$2a$10$aqy7NE6wI7KhaEtgC8vDPefum3uE3oOfKL2/2TJnmTRDTiPS8qBMW	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 18:50:26.71998	\N	USER
webmaster	2802	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$oVF97KW7UN5OeRj4SK3X8.cEbIxfy1P9w62tu8UQ4cLUN8NFAMH.O	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-25 23:47:40.531971	\N	ADMIN
user_regular	2803	1	\N	일반사용자	{bcrypt}$2a$10$OsSFaTG3/VX30fn8WkkBDerdenQxSYeJJ.4CV.j2VdeIajEWQwcni	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-25 23:47:42.154795	\N	USER
webmaster	2852	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$fGjmtpBNr3ZPR8UGz1sk1u0fk647fTNnUAasglS2kfglTpI/Od5KS	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 00:07:03.120908	\N	ADMIN
user_regular	2853	1	\N	일반사용자	{bcrypt}$2a$10$IfKmgS1W3ndyHSKD9eoIJOzGyS6JgX0B2dBbOfJP5lQSO1U9C6Jma	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 00:07:05.006779	\N	USER
webmaster	2902	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$7m3bizsbJuMoSedD8x7HYuNqvwzBWJPzfmG3UByIelmAuTNzHLbGq	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 00:44:56.124109	\N	ADMIN
user_regular	2903	1	\N	일반사용자	{bcrypt}$2a$10$s1BLL5TpiT3YrCyCFQWFWejz9amhfJ6cBNm/6z30Pueb5eFZrZ4v2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 00:44:57.658495	\N	USER
webmaster	2952	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$utBnRHAAEfqumiFzQLLIIe1lPtaHv5in7kunS57c2SCypQuvMC0TO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 10:32:47.753471	\N	ADMIN
user_regular	2953	1	\N	일반사용자	{bcrypt}$2a$10$tT.K80J5t4ADEy3P4N3qe.8ERNDuTAuKjfFgtMMi9FIBsiZrFHPlu	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 10:32:49.201186	\N	USER
webmaster	3002	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$O9e5YDkHnKJ1ryXsHk7hde6Non0Df4K99IU28v0Sq83lfudcUMrIy	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 10:33:36.962887	\N	ADMIN
user_regular	3003	1	\N	일반사용자	{bcrypt}$2a$10$.zy2HHY0s/7osLYrfI9Eg.OOkCg06lhOKBV8nUDR6V3leGdKdDUWS	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 10:33:38.31581	\N	USER
webmaster	3052	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$bwhN.l2oV674PqasByos1O5IZ8pfVrXcg89GiChdfON93sba5VEPm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 11:01:12.735438	\N	ADMIN
user_regular	3053	1	\N	일반사용자	{bcrypt}$2a$10$RdKyM8BB/8DSVPgSzCmOAesF02WbSu3srYpto/y1maTokZdlLBDBG	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 11:01:14.212613	\N	USER
webmaster	3102	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$KOkKxTSZaDd4A5g0s8swUOUdCQim0RIt2zXbfgAlF2zJsoupGbmV.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 11:10:16.154499	\N	ADMIN
user_regular	3103	1	\N	일반사용자	{bcrypt}$2a$10$wo0KjioQd8HFrwOXlWxiAemjQx1XJ7Rj/86sCl0A2Mwv1cCxmz/US	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 11:10:17.723928	\N	USER
webmaster	3152	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$/sEDmUV1FBNSwio7lmFO5O71iDSivSLjFdA.nW0LBksiso9yJgSCO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 11:25:59.957214	\N	ADMIN
user_regular	3153	1	\N	일반사용자	{bcrypt}$2a$10$vyDo3d7bXIbURqNJkK6WgOTus/a/JJ0gI2VolT/PSvWRGuM6d6Ioy	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 11:26:01.624164	\N	USER
webmaster	3202	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$hO.M3M60KG8OFmjhcpGF6.A0M0oMlUNQqFYAM8s6GCf1Ala5AJqaK	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 11:39:25.857542	\N	ADMIN
user_regular	3203	1	\N	일반사용자	{bcrypt}$2a$10$JWyiCjROp4u2IfVjAKTGYuEw3ECRfDgvbmL8JAawH95FSlq4pP6AW	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 11:39:27.259552	\N	USER
webmaster	3252	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$zRf.nG9SrRU.d49K3vqiXusea2K69rPaeQfyh6HJO3GHwzE93hCLa	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 11:46:18.868445	\N	ADMIN
user_regular	3253	1	\N	일반사용자	{bcrypt}$2a$10$Xe1GfPsE/kE7mCDaw7sa/udy9WrIqe/bUG8rfhH7/hw6Lmxh6Qvrq	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 11:46:20.492858	\N	USER
webmaster	3302	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$GWrNDe65qfo.xymWUstMtu.PbSFqvL4pRBIlSwIzgGRaczuF7n21i	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-26 13:02:50.354626	\N	ADMIN
user_regular	3303	1	\N	일반사용자	{bcrypt}$2a$10$hd5XZY1U9RR5L0ujaQwuNOwNT7fwDVRqOtEfq/CCJ4U4dn/LDUEna	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-26 13:02:51.937168	\N	USER
webmaster	3352	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$8YUWPqQv8LFtUeNnbbTwmOfgp0nUQyGko57RsgtFMTXQUhCEb5ad.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-28 17:31:18.90237	\N	ADMIN
user_regular	3353	1	\N	일반사용자	{bcrypt}$2a$10$9seYdM5juQdyme/lqIllrOIHseP8FnyFC7Hnfvwfs4b7w15EcwObC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-28 17:31:20.462098	\N	USER
webmaster	3402	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$U3fWjm85DvDgbMYeCo8oQuo3AO7OveeJvA8DNwv38f8nuKEmFoMWC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-28 18:00:22.194848	\N	ADMIN
user_regular	3403	1	\N	일반사용자	{bcrypt}$2a$10$geuEsGAIP2wEIC15w2RBFOeCWtHrmAlAvqU4L0djEkm9Q48k3ABwy	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-28 18:00:23.987463	\N	USER
webmaster	3452	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$8Bl4wi.DjWXfAO.fBlZ6Ge1FPg.4DV7mM441J6rrOHx/hrrV/JiHy	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-28 18:04:08.033531	\N	ADMIN
user_regular	3453	1	\N	일반사용자	{bcrypt}$2a$10$.twp97Z2OEqdcCvFpgC./.N9RKx7qgm83UkTUAN1dlrSiPUH2ESZm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-28 18:04:09.602668	\N	USER
webmaster	3502	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$U9maOk0f1.NT1.MgAWMm3OHPA88M0p1fGOlHFQCTettftH3j9bYl.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 01:07:56.126994	\N	ADMIN
user_regular	3503	1	\N	일반사용자	{bcrypt}$2a$10$UWXGMqF/lyzuLP20wQjHeOhpQlJv3iT.VQutlWihnsLDNF/duNt.y	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 01:07:57.500802	\N	USER
webmaster	3552	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$yqzAIu9abQ87fyET3UmUFOkON7c3evluGwwSIvJuaaQcwdBZpQUIS	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 01:11:30.868537	\N	ADMIN
user_regular	3553	1	\N	일반사용자	{bcrypt}$2a$10$8r3/DmtqnqZMk/CCD4lLhukUK/n.KAI81vBr5xkxUJ9b7.H4hroS.	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 01:11:32.357097	\N	USER
webmaster	3602	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$TO35uRks2ci6IOdkct9i1OUyaLu2YqKKl1XoYuCno1rhI/3cCnq5K	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 01:13:12.819929	\N	ADMIN
user_regular	3603	1	\N	일반사용자	{bcrypt}$2a$10$cbHuugOB6npbiLTz8mvWz.56skv69vLu98ihF6DjXuIipK0HV3ITa	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 01:13:14.269961	\N	USER
webmaster	3652	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$EBobehi29Igh1Bs1oH/bsOw6a8MbAT6Fj/Kwr55d1xa...IfsQhxO	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 01:16:01.505648	\N	ADMIN
user_regular	3653	1	\N	일반사용자	{bcrypt}$2a$10$TewHiwUXuTI1i/8tFEdziO9Fh0AOWZga5i9yLR4IDdeqvJdXbtGt2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 01:16:02.908868	\N	USER
webmaster	3702	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$pKEGDtwg/uQ.Cx489stcsu/zgDs3LIhm45Iv1xgNp//LEiSIxLIjq	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 01:38:20.461542	\N	ADMIN
user_regular	3703	1	\N	일반사용자	{bcrypt}$2a$10$7pRS3npybcdyqyfr4sw4UOU5Ml7Ez3AvnLrPqZ3h0BlitQqp9mF1.	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 01:38:22.123421	\N	USER
webmaster	3752	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$Ox30CYzMr/gh8MsxuTvg9ekZ59LQskdNVE/1eT3ZWimQHF7wjchNm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 11:56:38.252448	\N	ADMIN
user_regular	3753	1	\N	일반사용자	{bcrypt}$2a$10$/zeL.9FUHr0EubIU/0yBXOs876UJYL.ay2chVqGhKNlTbuPrA0dNG	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 11:56:40.083586	\N	USER
webmaster	3802	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$dVYjiMwhpydDhiiYxrEnCeoQ4FKHrsXGdb6ZGsALQgLKgCC1VOJsm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 12:21:29.796119	\N	ADMIN
user_regular	3803	1	\N	일반사용자	{bcrypt}$2a$10$aOmFmIprlINazj7TZYgnqeVthuT1FF9Ru/qSUPFpt0Vor0DyHD9yi	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 12:21:31.171359	\N	USER
webmaster	3852	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$T2zm/6I955j3bpW5LcDJqOj9P0XQdVtdE7dblLSgJbBpNPdXiCgpy	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 13:29:00.925122	\N	ADMIN
user_regular	3853	1	\N	일반사용자	{bcrypt}$2a$10$yw77e61SUncn00p0XHdSdOSoJ5kKtXQbB7qYGCS/MRv4YKWx1NelW	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 13:29:02.300386	\N	USER
webmaster	3902	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$KZEw/yz0DNXY6hXt3E9tWOp.gllF4zoPSKGO1DgIYOadyP1ezEpc2	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 13:39:52.630067	\N	ADMIN
user_regular	3903	1	\N	일반사용자	{bcrypt}$2a$10$Hh.5nvksN.5IoyHgSkGmYuGqfoxSIP7/Be6cps4.lziPHuXl1fgt2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 13:39:53.975757	\N	USER
webmaster	3952	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$KfbXqqEMNmzj13NTf3gycuIb.O2dEhhGbLCKeYG59u7d0iGrnliNe	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 16:49:39.023716	\N	ADMIN
user_regular	3953	1	\N	일반사용자	{bcrypt}$2a$10$61sSoDlKZnpkRTAhcuh/V.onpaq0.eBYrPrfneh2AW6YoxpQquKZi	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 16:49:40.363827	\N	USER
webmaster	4002	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$8wTn3D7J3yQ5uHH3T6XGs.rHnA4Pq4W9QDIJy9no2yLj/FkoHMjK2	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 17:06:10.108154	\N	ADMIN
user_regular	4003	1	\N	일반사용자	{bcrypt}$2a$10$TyJpvGy2wgEHLNZfogyTiuB7i2U7bRWeOaZKXhZushRWTlJslxboa	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 17:06:12.249195	\N	USER
webmaster	4052	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$Vzd/pcHJG69ys0UYBLwdP.tP0tmpTE6Cfje5hXeq9ipYbgJBdDu0y	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 17:15:46.38731	\N	ADMIN
user_regular	4053	1	\N	일반사용자	{bcrypt}$2a$10$GnzNkGqwl01j2ZYFnZXXQOqsIVxAj1nXi5b4/SbResvrBGxY5f3Xu	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 17:15:47.774623	\N	USER
webmaster	4102	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$wu4.P5I/dU38QvqXnOyHtuyYgEomPOHeO1NVlkMeIO9I08AW3zu1.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 17:17:19.535635	\N	ADMIN
user_regular	4103	1	\N	일반사용자	{bcrypt}$2a$10$JEtkQnVKkQtycT2GZLcYaufwGIcENx2huf5X0ic90a7RhT.jgL4ku	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 17:17:20.951908	\N	USER
webmaster	4152	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$JTdlq2OtykUk4S.T8DkDQumpTrZKNPUVc5XRvFhXKUsyrpm2iKGTC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 17:35:46.606565	\N	ADMIN
user_regular	4153	1	\N	일반사용자	{bcrypt}$2a$10$NxdL9QFe8EXhroJoOdEY2Oq6AQAOZe9HBWjvu6KY27SBq8ZucQ2Km	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 17:35:48.026241	\N	USER
webmaster	4202	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$k.ChhwngJV1JmCkd1SxRAer7d4us5KW6BXiWBpojiOBNKSop2Hfim	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 17:40:33.639652	\N	ADMIN
user_regular	4203	1	\N	일반사용자	{bcrypt}$2a$10$.uQMZQtezaLtNoYX0XGi9ekLx/QKnbZ/DTIbRkNypzzah.PSotyKe	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 17:40:34.976801	\N	USER
webmaster	4252	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$n6maO2OKCcRZ1cHBo93CN.6Joty4rEzyE4VS6dBttQfR9il7Iu1mW	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 17:54:40.49296	\N	ADMIN
user_regular	4253	1	\N	일반사용자	{bcrypt}$2a$10$REWY2ADYErmrR8UBtaXSCeqE4ffcGOUc5NSfRl4ZYXb5k4fCSPqRa	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 17:54:42.0722	\N	USER
webmaster	4302	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$QQC3N46cZ2l.HIp.N8C.sOALV2RsYhMvdobqhcbqV.0xMQjCol.9O	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 18:30:37.970634	\N	ADMIN
user_regular	4303	1	\N	일반사용자	{bcrypt}$2a$10$DfrQ7HGvuZBOdEsITbWbfOyI50Bmk1ANt/crtoqN1A8TVykVUF9NC	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 18:30:39.56128	\N	USER
webmaster	4352	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$.5.Jo4wqZQM07ye.NnIjSuIOyHc2OCz9a/HeOkZ.Etkn8dEvVg2dm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 19:16:18.365256	\N	ADMIN
user_regular	4353	1	\N	일반사용자	{bcrypt}$2a$10$OIVQj42XKkxo0xd/36ErxOmbzFcvi4cgI0IFOPn6oKtSYi3Bax1vO	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 19:16:19.952351	\N	USER
webmaster	4402	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$/vGxZBfXxM66PDKGDbLiVeyElkWst23TzSLJdC.mWbYATBNJvMb7W	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 19:41:31.373523	\N	ADMIN
user_regular	4403	1	\N	일반사용자	{bcrypt}$2a$10$UM6LBxbm/w5mvGBZCgS0zeOZ.p4tt9m5dX75sJomfOHh5X19gp26i	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 19:41:33.14752	\N	USER
webmaster	4452	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$fKarvHtVOXDKBbUb1n6Z8.4yzaVklHLU0kpZQAWiLVJ9Pe0Y.ulWK	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 20:54:25.948977	\N	ADMIN
user_regular	4453	1	\N	일반사용자	{bcrypt}$2a$10$VqdsHPvxP2d.goFxPFT0WOR8Kd/1/0M4.w5AQ7KC0/nOygCv5sbDy	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 20:54:27.529152	\N	USER
webmaster	4502	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$0E0bCrzKEIoXJIje/VN5B.R8bYUWLhuEzUGhXwKaY0YQvMfiBr0vi	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 21:33:18.016053	\N	ADMIN
user_regular	4503	1	\N	일반사용자	{bcrypt}$2a$10$ZHHCpc4oVKAZfoqd61ez8Ocelj6RiSt/uMSdAS9jTHb1YFXvwkKxm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 21:33:19.532931	\N	USER
webmaster	4552	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$xYVwfpVV0EDmHgKmBQ2TtuK9kNxBED.ZnxYYBHqjih5eUw0IhPd4a	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 21:44:00.892877	\N	ADMIN
user_regular	4553	1	\N	일반사용자	{bcrypt}$2a$10$E.8hPoiRPaz7ZD/BLlLGx.3e0SsX4t4GfYnBOzzJ2Yk8js5NkZHkK	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 21:44:02.394449	\N	USER
webmaster	4602	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$n1HeDoUCM9XBiKujaJOPWuhOOTiJfEmg6.7N8VQAbt2/0Q7QlGN2G	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-29 23:52:41.754251	\N	ADMIN
user_regular	4603	1	\N	일반사용자	{bcrypt}$2a$10$IiW.ydEvUq0zo4W4tRevX.j/A.RTds0Ty3sQDVlsDk7HZjnXVPh4a	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-29 23:52:43.266468	\N	USER
webmaster	4652	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$jpcfGey1HNiL.kh631Ugq.hGZfjixfjKb23Wa8cO0sEJ69Htr/Bri	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 01:15:07.492075	\N	ADMIN
user_regular	4653	1	\N	일반사용자	{bcrypt}$2a$10$xiooL0JnL0TzU7TXI2zRVOlMM3gDejALO6Adr8QMYDlnkrOSLjmMO	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-13 11:46:17.404083	N	0	\N	2026-03-30 01:15:10.469426	\N	USER
user_regular	4654	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
webmaster	4702	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$.FB/UF6AXXzbC6lZ5f6amOoAZ30Jefp.FhsGbf4c8Rsv9LkuQSBB.	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 06:29:19.194047	\N	ADMIN
user_regular	4703	0	\N	일반사용자	{bcrypt}$2a$10$J8iq17LiyjrvNdOj6u0rw.Xg3X7YDl1nq4lr4DrXht.8pvEzYgS3K	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 06:29:20.800264	N	\N	\N	\N	\N	USER
user_regular	4704	1	\N	일반사용자	{bcrypt}$2a$10$J8iq17LiyjrvNdOj6u0rw.Xg3X7YDl1nq4lr4DrXht.8pvEzYgS3K	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 06:29:20.800264	N	0	\N	\N	\N	USER
webmaster	4752	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$beijjlhYW4aw5tqKb2mu4eJLC/hNll5keIkROdBP/.vo.JF7DwGpK	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 09:06:39.156225	\N	ADMIN
user_regular	4753	1	\N	일반사용자	{bcrypt}$2a$10$rLrDwXHTyC9MDSRoWXlzcOfXCkbkFCEzrDZchgcrOrZ9Ho7mJgCN.	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 06:29:20.800264	N	0	\N	2026-03-30 09:06:40.589679	\N	USER
user_regular	4754	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
webmaster	4802	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$VhTHiJFINBRWYo6xXhqKAuMzfOkYBhLYAHap37c7toxxZsJGTf2Kq	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 09:38:39.13181	\N	ADMIN
user_regular	4803	0	\N	일반사용자	{bcrypt}$2a$10$Vi2QQ.RaVXJuixr/qMZQ8OWQh3bLw1iaKmdCmUmINWudHuHWmwW6C	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	\N	\N	\N	\N	USER
user_regular	4804	1	\N	일반사용자	{bcrypt}$2a$10$Vi2QQ.RaVXJuixr/qMZQ8OWQh3bLw1iaKmdCmUmINWudHuHWmwW6C	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	\N	\N	USER
webmaster	4852	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$izBcVLIDjSWGc1GCHHiXsOvdXia94y2YhmHOCrNndHKJR6jETdLKG	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 09:50:29.193665	\N	ADMIN
user_regular	4853	1	\N	일반사용자	{bcrypt}$2a$10$2cd9I.5fXzyb.3U4VyD4QeWiNClBNqvBnF2f84jeHQ/OpG0/Pj1X2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-30 09:50:30.6104	\N	USER
webmaster	4902	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$/BpfjPhmmc6v8w4Xi9xx0uJ1iU2jxaq31r.eAa1hFdBroE4cBOqcW	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 09:52:25.585659	\N	ADMIN
user_regular	4903	1	\N	일반사용자	{bcrypt}$2a$10$MxrOXRpzQV3WDw2wjHXGW.MdnJJ4qIjZuihLe9XWNFOahnfhe4pC6	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-30 09:52:27.019305	\N	USER
webmaster	4952	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$ogy9IRC/kJ.WnHXfIpCORup/Ddj9I/NBvIz6L6ZNxrRR./G2YkzWy	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 21:26:14.924559	\N	ADMIN
user_regular	4953	1	\N	일반사용자	{bcrypt}$2a$10$WX67ByXYMnHXf7sdUxhpmOJ42PCjuab7EG/NOd/E0/wnDQBcxPOa6	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-30 21:26:16.511447	\N	USER
webmaster	5002	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$pJZaue5NYLczTz1kyWS6t.5pvAo8/Vmv62WaJl6XPeAmz8aVgs5fm	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 21:48:26.576509	\N	ADMIN
user_regular	5003	1	\N	일반사용자	{bcrypt}$2a$10$C5IImled5JJyiFiqDtEqj.mdeyfIFnrN4FH9V56nt6U.awQ8Hqdwu	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-30 21:48:29.76886	\N	USER
webmaster	5052	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$Bhkb6sTwKEfRyCgpnC8KKejMRvIIwNAoNF4keo8jbR72zzwgq0A3a	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-30 22:21:00.39527	\N	ADMIN
user_regular	5053	1	\N	일반사용자	{bcrypt}$2a$10$EqdcKXU5noYtIHQrDmhkrOW7h8PauxFmuTPLAlDggoQTjw2tUhwei	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-30 22:21:01.98272	\N	USER
webmaster	5102	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$J5NipHJPM79O4ivvSZVlgO8NNYkbZAt7MHiVOTa3e2a2BbbiE56ba	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-31 12:01:06.981235	\N	ADMIN
user_regular	5103	1	\N	일반사용자	{bcrypt}$2a$10$fLsj5cu3oezxSTUjcYPQVOdJ9yAzqXw7ea6LqihvBX6EATO52h5l6	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-31 12:01:08.312084	\N	USER
webmaster	5152	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$KqxBpxldXb9RTYCwPdcBLuaOIU0a2P2fxFM4AyuxlPtoNTzSZU0xC	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-31 12:39:41.245055	\N	ADMIN
user_regular	5153	1	\N	일반사용자	{bcrypt}$2a$10$likKy8Pf1uPcoYROdw8UZejFUIBCpy0zJ/VMiKLt0n.vTa1aCnv82	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-31 12:39:42.534994	\N	USER
webmaster	5202	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$nlkaPCcl0/RwkXMdkiCF3..o9eE8X.EjH1B36xCuDldpgFAVk.KsK	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-31 12:41:02.688834	\N	ADMIN
user_regular	5203	1	\N	일반사용자	{bcrypt}$2a$10$bVG/Pkc0pWt2mzTMTTcS3OkfoKqQSYABGXRro/8lC2afA6jAXb3O2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-31 12:41:03.969956	\N	USER
webmaster	5252	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$ErWt6/vfKKL9Dr8mWba8p.I6DYKhTYyQU4HO65SqhFwYsbHpD4bnW	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-31 12:44:47.236068	\N	ADMIN
user_regular	5253	1	\N	일반사용자	{bcrypt}$2a$10$BP.u7VE/TWm55tTs0B6smumcoI.TZFxywC9nkNaYdIrZ8GGZNFRY.	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-31 12:44:48.583143	\N	USER
webmaster	5302	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$euIb9sAbuyk9BFzFX92z0ustrDbK.YxkdZ2o77fPxikrCFxrBIwci	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-31 12:46:30.088382	\N	ADMIN
user_regular	5303	1	\N	일반사용자	{bcrypt}$2a$10$b8MHrKgCQGJ3Zu2edOG2H.kuvZYW2K6zl/QO2pIaTHDw2EprcR9bi	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-31 12:46:31.374758	\N	USER
webmaster	5352	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$q.s1lMVGvyzhLmTBKY7RpemDThdDvQKSzcoOwdBzNlUtu2jXI.pAK	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-31 16:31:21.288079	\N	ADMIN
user_regular	5353	1	\N	일반사용자	{bcrypt}$2a$10$7tJnjqhXizO0nnQz7N0Fwuh9HR1WM5zenERGnM0Xf.aQok.6APeRm	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-31 16:31:22.624612	\N	USER
webmaster	5402	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$10.WslisyyTA786OyjF9xuju/AoTHD1Zwxv3x2YLCBmnKzrSuWSzS	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-03-31 22:58:19.770356	\N	ADMIN
user_regular	5403	1	\N	일반사용자	{bcrypt}$2a$10$kcNCkbWRFMKeSIJUhuTNruXo.E0zWKOHEiv4L39ozzk.pG9UXjtAS	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-03-31 22:58:21.168288	\N	USER
webmaster	5452	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$gkHKN/MF1x52idvzC93UHe5ztnUU3dNwvZDPFsZx54Kscr2Dxi/7q	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-04-01 17:29:21.418999	\N	ADMIN
user_regular	5453	1	\N	일반사용자	{bcrypt}$2a$10$UOi.fLOJeVlSr9cXi//1jO7zQEk/VafTXj/YGZJxsa3Juv5Sl4LxS	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-04-01 17:29:22.756843	\N	USER
webmaster	5502	1	ORGNZT_0000000000000	관리자	{bcrypt}$2a$10$v3PwvoQMGI80xtzvAeQlZuE2G3mQlbe5iQb28dSBLg9BsHBhXQNKe	20112060	\N	F	20111130                                                    	1566-2059	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	P01	전자정부표준프레임워크센터	2059	02	전자정부표준프레임워크센터	100775	1566-2059	1566-2059	egovframesupport@gmail.com	웹관리자	1566	GROUP_00000000000000	00000001                	P	USRCNFRM_99999999999                                        		2025-12-29 01:39:41.020582	N	0	\N	2026-04-01 17:31:01.411788	\N	ADMIN
user_regular	5503	1	\N	일반사용자	{bcrypt}$2a$10$aqfQ7elMcfWy/LuoNiaSV.a7tve1h45/Xt70RbhiC.Z6bXGlIhfs2	\N	\N	\N	\N	\N	Seoul	P01	Hint Answer	0000	02	\N	000000	\N	\N	\N	\N	0000	\N	\N	P	USRCNFRM_00000000002                                        	\N	2026-03-30 09:38:40.791223	N	0	\N	2026-04-01 17:31:02.686998	\N	USER
\.


--
-- Data for Name: nemplyrscrtyestbs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nemplyrscrtyestbs (scrty_dtrmn_trget_id, mber_ty_code, author_code, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
USRCNFRM_00000000001	USR01	ROLE_USER	\N	\N	\N	\N
USRCNFRM_00000000000	USR03	ROLE_USER	\N	\N	\N	\N
USRCNFRM_00000000002	\N	ROLE_USER	\N	\N	\N	\N
USRCNFRM_99999999999	USR03	ROLE_ADMIN	\N	\N	\N	\N
\.


--
-- Data for Name: nentrprsmber; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nentrprsmber (entrprs_mber_id, entrprs_se_code, bizrno, jurirno, cmpny_nm, cxfc, zip, adres, entrprs_middle_telno, fxnum, induty_code, applcnt_nm, applcnt_ihidnum, sbscrb_de, entrprs_mber_sttus, entrprs_mber_password, entrprs_mber_password_hint, entrprs_mber_password_cnsr, group_id, detail_adres, entrprs_end_telno, area_no, applcnt_email_adres, esntl_id, lock_at, lock_cnt, lock_last_pnttm, chg_pwd_last_pnttm, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
ENTERPRISE	C0000001	1008360001	1000310000011	NIA	이가브	100775	서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원	1566	1566-2059	O	관리자	\N	2025-12-29 01:39:41.022943	P	c3OjO3zLDnA7H76K6HT9HGgMLhLpazgLihL5jcwt48s=	P01	전자정부표준프레임워크센터	GROUP_00000000000000	표준프레임워크센터	2059	02	egovframesupport@gmail.com	USRCNFRM_00000000002	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: neventinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.neventinfo (event_id, bsns_year, bsns_code, event_cn, event_svc_bgnde, svc_use_nmpr_co, charger_nm, prparetg_cn, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, event_svc_endde, event_ty_code, event_confm_at, event_confm_de) FROM stdin;
\.


--
-- Data for Name: nextrlhrinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nextrlhrinfo (event_id, extrl_hr_id, sexdstn_code, extrl_hr_nm, occp_ty_code, psitn_instt_nm, brthdy, area_no, middle_telno, end_telno, email_adres, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nfaqinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nfaqinfo (faq_id, qestn_sj, qestn_cn, answer_cn, rdcnt, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, atch_file_id, qna_process_sttus_code) FROM stdin;
\.


--
-- Data for Name: nfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nfile (atch_file_id, creat_dt, use_at) FROM stdin;
\.


--
-- Data for Name: nfiledetail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nfiledetail (atch_file_id, file_sn, file_stre_cours, stre_file_nm, orignl_file_nm, file_extsn, file_cn, file_size) FROM stdin;
\.


--
-- Data for Name: nfilesysmntrngloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nfilesysmntrngloginfo (file_sys_id, file_sys_nm, file_sys_manage_nm, file_sys_size, file_sys_thrhld, file_sys_usgqty, mntrng_sttus, log_info, creat_dt, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, log_id) FROM stdin;
\.


--
-- Data for Name: nfxtrsmanage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nfxtrsmanage (fxtrs_code, fxtrs_nm, makr_nm, price) FROM stdin;
\.


--
-- Data for Name: ngnrlmber; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ngnrlmber (mber_id, password, password_hint, password_cnsr, ihidnum, mber_nm, zip, adres, area_no, mber_sttus, detail_adres, end_telno, mbtlnum, group_id, mber_fxnum, mber_email_adres, middle_telno, sbscrb_de, sexdstn_code, esntl_id, lock_at, lock_cnt, lock_last_pnttm, chg_pwd_last_pnttm, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
USER	p9ddPCJCWPhbI8pHFSs3VFoL/M4kkGa0owIFCGd136M=	P01	전자정부표준프레임워크센터	\N	일반회원	100775	서울 중구 무교동 한국정보화진흥원	02	P	전자정부표준프레임워크센터	2059	1566-2059	GROUP_00000000000000	1566-2059	egovframesupport@gmail.com	1566	2025-12-29 01:39:41.021619	F	USRCNFRM_00000000001	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: nhpcminfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nhpcminfo (hpcm_id, hpcm_se_code, hpcm_dfn, hpcm_dc, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nindvdlinfopolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nindvdlinfopolicy (indvdl_info_policy_id, indvdl_info_policy_cn, indvdl_info_policy_agre_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, indvdl_info_policy_nm) FROM stdin;
\.


--
-- Data for Name: nindvdlpgecntnts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nindvdlpgecntnts (cntnts_id, cntnts_nm, cntc_url, cntnts_use_at, cntnts_link_url, cntnts_dc) FROM stdin;
\.


--
-- Data for Name: nindvdlpgeestbs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nindvdlpgeestbs (emplyr_id, upend_image, titlebar_color, algn_mthd, algn_co) FROM stdin;
\.


--
-- Data for Name: ninfrmlsanctn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ninfrmlsanctn (infrml_sanctn_id, job_se_code, applcnt_id, reqst_de, sanctner_id, confm_at, sanctn_dt, return_resn, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ninsttcode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ninsttcode (instt_code, all_instt_nm, lowest_instt_nm, instt_abrv_nm, odr, ord, instt_odr, upper_instt_code, best_instt_code, reprsnt_instt_code, instt_ty_lclas, instt_ty_mlsfc, instt_ty_sclas, telno, fxnum, creat_de, abl_de, abl_ennc, change_de, change_time, bsis_de, sort_ordr, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ninsttcoderecptnlog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ninsttcoderecptnlog (occrrnc_de, instt_code, opert_sn, change_se_code, process_se, etc_code, all_instt_nm, lowest_instt_nm, instt_abrv_nm, odr, ord, instt_odr, upper_instt_code, best_instt_code, reprsnt_instt_code, instt_ty_lclas, instt_ty_mlsfc, instt_ty_sclas, telno, fxnum, creat_de, abl_de, abl_ennc, change_de, change_time, bsis_de, sort_ordr, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nintnetsvc; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nintnetsvc (intnet_svc_id, intnet_svc_nm, intnet_svc_dc, reflct_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nleaderschdul; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nleaderschdul (schdul_id, schdul_se, schdul_nm, schdul_cn, schdul_place, leader_id, reptit_se_code, schdul_bgnde, schdul_endde, schdul_charger_id, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nleaderschdulde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nleaderschdulde (schdul_id, schdul_de) FROM stdin;
\.


--
-- Data for Name: nleadersttus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nleadersttus (leader_id, leader_sttus, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nloginlog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nloginlog (log_id, conect_id, conect_ip, conect_mthd, error_occrrnc_at, error_code, creat_dt) FROM stdin;
\.


--
-- Data for Name: nloginpolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nloginpolicy (emplyr_id, ip_info, dplct_perm_at, lmtt_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nmainimage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nmainimage (image_id, image_nm, image, image_dc, reflct_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, image_file) FROM stdin;
\.


--
-- Data for Name: nmemoreprt; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nmemoreprt (reprt_sj, report_de, wrter_id, reportr_id, report_cn, atch_file_id, drct_matter, drct_matter_regist_dt, reportr_inqire_dt, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, reprt_id) FROM stdin;
\.


--
-- Data for Name: nmemotodo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nmemotodo (todo_id, todo_sj, todo_begin_time, todo_end_time, wrter_id, todo_cn, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nmenucreatdtls; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nmenucreatdtls (menu_no, author_code, mapng_creat_id, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
2070000	ROLE_ADMIN	\N	\N	\N	\N	\N
2030300	ROLE_ADMIN	\N	\N	\N	\N	\N
2010210	ROLE_ADMIN	\N	\N	\N	\N	\N
2010210	ROLE_USER	\N	\N	\N	\N	\N
1000001	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1020400	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1060000	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1060100	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1060200	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
2010900	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
9040340	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
9040350	ROLE_ADMIN	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1000000	ROLE_ADMIN	\N	\N	\N	\N	\N
1000000	ROLE_USER	\N	\N	\N	\N	\N
2000000	ROLE_ADMIN	\N	\N	\N	\N	\N
2000000	ROLE_USER	\N	\N	\N	\N	\N
9000000	ROLE_ADMIN	\N	\N	\N	\N	\N
1000001	ROLE_USER	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1020400	ROLE_USER	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1060000	ROLE_USER	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1060100	ROLE_USER	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1060200	ROLE_USER	\N	admin	\N	2026-03-31 02:48:56.01525	\N
2010900	ROLE_USER	\N	admin	\N	2026-03-31 02:48:56.01525	\N
1050000	ROLE_ADMIN	\N	\N	\N	\N	\N
1050000	ROLE_USER	\N	\N	\N	\N	\N
1050100	ROLE_ADMIN	\N	\N	\N	\N	\N
1050100	ROLE_USER	\N	\N	\N	\N	\N
9030200	ROLE_ADMIN	\N	\N	\N	\N	\N
9010500	ROLE_ADMIN	\N	\N	\N	\N	\N
800000000	ROLE_ADMIN	\N	\N	\N	\N	\N
1010000	ROLE_ADMIN	\N	\N	\N	\N	\N
1020000	ROLE_ADMIN	\N	\N	\N	\N	\N
1030000	ROLE_ADMIN	\N	\N	\N	\N	\N
1040000	ROLE_ADMIN	\N	\N	\N	\N	\N
2010000	ROLE_ADMIN	\N	\N	\N	\N	\N
2020000	ROLE_ADMIN	\N	\N	\N	\N	\N
2030000	ROLE_ADMIN	\N	\N	\N	\N	\N
2040000	ROLE_ADMIN	\N	\N	\N	\N	\N
2050000	ROLE_ADMIN	\N	\N	\N	\N	\N
2060000	ROLE_ADMIN	\N	\N	\N	\N	\N
9010000	ROLE_ADMIN	\N	\N	\N	\N	\N
9020000	ROLE_ADMIN	\N	\N	\N	\N	\N
9030000	ROLE_ADMIN	\N	\N	\N	\N	\N
9040000	ROLE_ADMIN	\N	\N	\N	\N	\N
9010100	ROLE_ADMIN	\N	\N	\N	\N	\N
9010300	ROLE_ADMIN	\N	\N	\N	\N	\N
9010400	ROLE_ADMIN	\N	\N	\N	\N	\N
9020100	ROLE_ADMIN	\N	\N	\N	\N	\N
9020310	ROLE_ADMIN	\N	\N	\N	\N	\N
9030100	ROLE_ADMIN	\N	\N	\N	\N	\N
9040100	ROLE_ADMIN	\N	\N	\N	\N	\N
1010200	ROLE_ADMIN	\N	\N	\N	\N	\N
1020100	ROLE_ADMIN	\N	\N	\N	\N	\N
1020200	ROLE_ADMIN	\N	\N	\N	\N	\N
1020300	ROLE_ADMIN	\N	\N	\N	\N	\N
1030100	ROLE_ADMIN	\N	\N	\N	\N	\N
1040100	ROLE_ADMIN	\N	\N	\N	\N	\N
1040200	ROLE_ADMIN	\N	\N	\N	\N	\N
2010100	ROLE_ADMIN	\N	\N	\N	\N	\N
2010200	ROLE_ADMIN	\N	\N	\N	\N	\N
2010300	ROLE_ADMIN	\N	\N	\N	\N	\N
2010400	ROLE_ADMIN	\N	\N	\N	\N	\N
2010500	ROLE_ADMIN	\N	\N	\N	\N	\N
2010600	ROLE_ADMIN	\N	\N	\N	\N	\N
2010700	ROLE_ADMIN	\N	\N	\N	\N	\N
2010800	ROLE_ADMIN	\N	\N	\N	\N	\N
2020100	ROLE_ADMIN	\N	\N	\N	\N	\N
2030100	ROLE_ADMIN	\N	\N	\N	\N	\N
2030200	ROLE_ADMIN	\N	\N	\N	\N	\N
2030400	ROLE_ADMIN	\N	\N	\N	\N	\N
2030500	ROLE_ADMIN	\N	\N	\N	\N	\N
9010210	ROLE_ADMIN	\N	\N	\N	\N	\N
9020110	ROLE_ADMIN	\N	\N	\N	\N	\N
9020120	ROLE_ADMIN	\N	\N	\N	\N	\N
9020130	ROLE_ADMIN	\N	\N	\N	\N	\N
9020210	ROLE_ADMIN	\N	\N	\N	\N	\N
9020220	ROLE_ADMIN	\N	\N	\N	\N	\N
9020230	ROLE_ADMIN	\N	\N	\N	\N	\N
9020311	ROLE_ADMIN	\N	\N	\N	\N	\N
9020312	ROLE_ADMIN	\N	\N	\N	\N	\N
9030110	ROLE_ADMIN	\N	\N	\N	\N	\N
9030120	ROLE_ADMIN	\N	\N	\N	\N	\N
9040200	ROLE_ADMIN	\N	\N	\N	\N	\N
9040310	ROLE_ADMIN	\N	\N	\N	\N	\N
9040320	ROLE_ADMIN	\N	\N	\N	\N	\N
9040330	ROLE_ADMIN	\N	\N	\N	\N	\N
9030130	ROLE_ADMIN	\N	\N	\N	\N	\N
800000000	ROLE_USER	\N	\N	\N	\N	\N
1010000	ROLE_USER	\N	\N	\N	\N	\N
1020000	ROLE_USER	\N	\N	\N	\N	\N
1030000	ROLE_USER	\N	\N	\N	\N	\N
1040000	ROLE_USER	\N	\N	\N	\N	\N
2010000	ROLE_USER	\N	\N	\N	\N	\N
2020000	ROLE_USER	\N	\N	\N	\N	\N
2030000	ROLE_USER	\N	\N	\N	\N	\N
2040000	ROLE_USER	\N	\N	\N	\N	\N
2050000	ROLE_USER	\N	\N	\N	\N	\N
9010100	ROLE_USER	\N	\N	\N	\N	\N
9010300	ROLE_USER	\N	\N	\N	\N	\N
9010400	ROLE_USER	\N	\N	\N	\N	\N
9020100	ROLE_USER	\N	\N	\N	\N	\N
9030100	ROLE_USER	\N	\N	\N	\N	\N
1010200	ROLE_USER	\N	\N	\N	\N	\N
1020100	ROLE_USER	\N	\N	\N	\N	\N
1020200	ROLE_USER	\N	\N	\N	\N	\N
1020300	ROLE_USER	\N	\N	\N	\N	\N
1030100	ROLE_USER	\N	\N	\N	\N	\N
1040100	ROLE_USER	\N	\N	\N	\N	\N
1040200	ROLE_USER	\N	\N	\N	\N	\N
2010200	ROLE_USER	\N	\N	\N	\N	\N
2010700	ROLE_USER	\N	\N	\N	\N	\N
2010800	ROLE_USER	\N	\N	\N	\N	\N
2020100	ROLE_USER	\N	\N	\N	\N	\N
2030100	ROLE_USER	\N	\N	\N	\N	\N
2030200	ROLE_USER	\N	\N	\N	\N	\N
2030400	ROLE_USER	\N	\N	\N	\N	\N
2030500	ROLE_USER	\N	\N	\N	\N	\N
9010220	ROLE_ADMIN	\N	\N	\N	\N	\N
9010220	ROLE_USER	\N	\N	\N	\N	\N
9010230	ROLE_ADMIN	\N	\N	\N	\N	\N
9020110	ROLE_USER	\N	\N	\N	\N	\N
9020130	ROLE_USER	\N	\N	\N	\N	\N
9020312	ROLE_USER	\N	\N	\N	\N	\N
9030110	ROLE_USER	\N	\N	\N	\N	\N
9030120	ROLE_USER	\N	\N	\N	\N	\N
9040101	ROLE_ADMIN	\N	\N	\N	\N	\N
9040101	ROLE_USER	\N	\N	\N	\N	\N
9040102	ROLE_ADMIN	\N	\N	\N	\N	\N
9040103	ROLE_ADMIN	\N	\N	\N	\N	\N
9040104	ROLE_ADMIN	\N	\N	\N	\N	\N
9040105	ROLE_ADMIN	\N	\N	\N	\N	\N
9040105	ROLE_USER	\N	\N	\N	\N	\N
9040106	ROLE_ADMIN	\N	\N	\N	\N	\N
9040106	ROLE_USER	\N	\N	\N	\N	\N
9040200	ROLE_USER	\N	\N	\N	\N	\N
\.


--
-- Data for Name: nmenuinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nmenuinfo (menu_nm, progrm_file_nm, menu_no, upper_menu_no, menu_ordr, menu_dc, relate_image_path, relate_image_nm, route_updated_at, modern_route, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
마이페이지관리	EgovIndvdlpgeCntntsList	2030100	2030000	22		\N	\N	2026-04-11 21:59:15.867609	/admin/workspace/mypage	\N	admin	\N	2026-04-11 21:59:15.86761
test1	EgovBBSMaster	8744343	2000000	1	Auto-generated menu for board test1	\N	\N	2026-04-11 22:51:53.905475	/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000160	webmaster	webmaster	2026-04-11 22:51:53.74828	2026-04-11 22:51:53.74828
사용자지원	dir	2030000	2000000	21		\N	\N	2026-04-11 21:59:15.418063	/admin/notifications	\N	admin	\N	2026-04-11 21:59:15.418063
협업	dir	2020000	2000000	28		\N	\N	2026-04-10 21:21:11.89944	/admin/collaboration/mail-history	\N	admin	\N	2026-04-10 21:21:11.899441
엔터프라이즈 위키	HpcmListInqire	2040000	2000000	30		\N	\N	2026-04-10 21:21:12.799202	/admin/help/faq?tab=WIKI	\N	admin	\N	2026-04-10 21:21:12.799202
자주 묻는 질문(FAQ)	FaqListInqire	2060000	2000000	31		\N	\N	2026-04-10 21:21:13.238742	/admin/help/faq?tab=FAQ	\N	admin	\N	2026-04-10 21:21:13.238742
스크랩 목록	selectScrapList	2020100	2020000	29		\N	\N	2026-04-10 21:21:12.350526	/admin/collaboration/scraps	\N	admin	\N	2026-04-10 21:21:12.349512
온라인 매뉴얼 관리	listOnlineManual	2050000	2000000	33		\N	\N	2026-04-10 21:21:14.129711	/admin/uss/olh/online-manual	\N	admin	\N	2026-04-10 21:21:14.129712
설문 및 여론조사 관리	dir	2010000	2000000	34		\N	\N	2026-04-10 21:21:14.570088	/admin/survey/hub?tab=manage	\N	admin	\N	2026-04-10 21:21:14.569089
설문템플릿관리	EgovQustnrTmplatManageList	2010300	2010000	35		\N	\N	2026-04-10 21:21:15.018833	/admin/survey/hub?tab=manage	\N	admin	\N	2026-04-10 21:21:15.018834
응답자관리	EgovQustnrRespondManageList	2010400	2010000	36		\N	\N	2026-04-10 21:21:15.469887	/admin/survey/hub?tab=respondents	\N	admin	\N	2026-04-10 21:21:15.468875
질문관리	EgovQustnrQestnManageList	2010500	2010000	37		\N	\N	2026-04-10 21:21:15.909937	/admin/survey/hub?tab=questions	\N	admin	\N	2026-04-10 21:21:15.909417
항목관리	EgovQustnrItemManageList	2010600	2010000	38		\N	\N	2026-04-10 21:21:16.358644	/admin/survey/hub?tab=items	\N	admin	\N	2026-04-10 21:21:16.358644
설문 통계 및 결과 분석	dir	2010210	2010000	41		\N	\N	2026-04-10 21:21:17.699966	/admin/survey/hub?tab=stats	\N	admin	\N	2026-04-10 21:21:17.698942
[미사용] 서베이기능그룹	EgovQustnrManageList	2010100	800000000	1		\N	\N	2026-03-26 00:03:16.937349	/admin/survey/hub?tab=manage	\N	\N	\N	2026-03-26 00:03:16.937349
[미사용] 서베이기능그룹	EgovQustnrRespondInfoManageList	2010200	800000000	2		\N	\N	2026-03-26 00:03:16.937349	/admin/survey/hub?tab=manage	\N	\N	\N	2026-03-26 00:03:16.937349
통합 코드 관리 허브	dir	9010100	9010000	45		\N	\N	2026-04-10 21:21:19.489505	/admin/system/common-code	\N	admin	\N	2026-04-10 21:21:19.489505
그룹관리	EgovGroupList	9020210	9020000	53		\N	\N	2026-04-10 21:21:23.038323	/admin/security/group	\N	admin	\N	2026-04-10 21:21:23.038323
롤관리	EgovRoleList	9020220	9020000	55		\N	\N	2026-04-10 21:21:23.92914	/admin/security/role	\N	admin	\N	2026-04-10 21:21:23.929141
행사 정보 관리	EventAdminService	9030400	9030000	70		\N	\N	2026-04-10 21:21:30.4309	/admin/operation/events	\N	admin	\N	2026-04-10 21:21:30.4309
ROOT	dir	800000000	800000000	0	\N	\N	\N	\N	\N	\N	\N	\N	\N
💬 커뮤니티 및 콘텐츠	dir	2000000	\N	20		\N	\N	2026-04-10 21:21:08.300864	/admin/community/boards/master	\N	admin	\N	2026-04-10 21:21:08.299955
⚙️ 시스템 관리 센터	dir	9000000	\N	43		\N	\N	2026-04-10 21:21:18.590459	/admin/user/manage	\N	admin	\N	2026-04-10 21:21:18.588445
🏢 워크스페이스	dir	1000000	\N	1		\N	\N	2026-03-31 12:56:38.863339	/admin/work-hub	\N	admin	\N	2026-03-31 12:56:38.85599
질의응답(Q&A)	CnsltAnswerListInqire	2070000	2000000	32		\N	\N	2026-04-10 21:21:13.689276	/admin/help/faq?tab=QNA	\N	admin	\N	2026-04-10 21:21:13.689277
외부인사정보	EgovTnextrlHrInfoList	2030200	2030000	24		\N	\N	2026-04-10 21:21:10.099387	/admin/operation/external-hr	\N	admin	\N	2026-04-10 21:21:10.099388
시스템 알림 설정	selectNotificationList	2030400	2030000	26		\N	\N	2026-04-10 21:21:11.00102	/admin/notifications	\N	admin	\N	2026-04-10 21:21:10.999511
사용자부재관리	selectUserAbsnceListView	2030500	2030000	27		\N	\N	2026-04-10 21:21:11.450985	/admin/user/absences	\N	admin	\N	2026-04-10 21:21:11.449989
포털 콘텐츠 및 UI 관리	dir	9010300	9010000	46		\N	\N	2026-04-10 21:21:19.938575	/admin/system/layout	\N	admin	\N	2026-04-10 21:21:19.938575
통합 보안 및 접속 정책	dir	9020100	9020000	59		\N	\N	2026-04-10 21:21:25.712311	/admin/system/monitoring/hub?tab=security	\N	admin	\N	2026-04-10 21:21:25.710797
통합 게시판 마스터 콘솔	BoardMasterConsole	9030140	9030100	65		\N	\N	2026-04-10 21:21:28.275332	/admin/community/boards/master	\N	admin	\N	2026-04-10 21:21:28.275332
약도 관리	RoughMapAdminService	9030500	9030000	71		\N	\N	2026-04-10 21:21:30.88104	/admin/operation/rough-map	\N	admin	\N	2026-04-10 21:21:30.880534
[미사용] 통계 폴더	dir	9040100	800000000	1		\N	\N	2026-03-26 00:03:16.937349	/admin/system/monitoring	\N	\N	\N	2026-03-26 00:03:16.937349
일정 관리	EgovIndvdlSchdulManageList	1010200	1010000	3		\N	\N	2026-04-10 21:48:05.896402	/admin/work-hub?tab=calendar	\N	admin	\N	2026-04-10 21:48:05.895385
개인 및 부서 일정	dir	1010000	1000000	2		\N	\N	2026-04-10 21:21:00.179088	/admin/work-hub?tab=job	\N	admin	\N	2026-04-10 21:21:00.169594
메일 및 통합 메시지 센터	dir	1020000	1000000	4		\N	\N	2026-04-10 21:48:06.356566	/admin/collaboration/mail-history	\N	admin	\N	2026-04-10 21:48:06.355535
문자메시지	selectSmsList	1020100	1020000	5		\N	\N	2026-04-10 21:48:06.784993	/admin/uss/ion/sms	\N	admin	\N	2026-04-10 21:48:06.784994
test	EgovBBSMaster	8808554	2030000	23		\N	\N	2026-04-11 21:59:16.316789	/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000120	webmaster	webmaster	2026-03-25 09:50:11.62575	2026-04-11 21:59:16.316789
메일발송	insertSndngMailView	1020200	1020000	6		\N	\N	2026-04-10 21:21:02.018356	/admin/collaboration/mail-send	\N	admin	\N	2026-04-10 21:21:02.018357
쪽지함	listNoteTrnsmit	1020300	1020000	7		\N	\N	2026-04-10 21:21:02.47115	/admin/collaboration/mail-history	\N	admin	\N	2026-04-10 21:21:02.470133
인적 자원 및 주소록 관리	dir	1030000	1000000	9		\N	\N	2026-04-10 21:21:03.359565	/admin/collaboration/address-book	\N	admin	\N	2026-04-10 21:21:03.359565
주소록관리	selectAdbkList	1030100	1030000	10		\N	\N	2026-04-10 21:21:03.810204	/admin/collaboration/address-book	\N	admin	\N	2026-04-10 21:21:03.809191
업무 보고 및 보고함	dir	1040000	1000000	11		\N	\N	2026-04-10 21:21:04.26015	/admin/work-hub	\N	admin	\N	2026-04-10 21:21:04.259058
부서 업무 관리	selectDeptJobBxList	1040100	1040000	12		\N	\N	2026-04-10 21:21:04.709386	/admin/work-hub?tab=report	\N	admin	\N	2026-04-10 21:21:04.709386
업무 보고 관리	selectWikMnthngReprtList	1040200	1040000	13		\N	\N	2026-04-10 21:21:05.1589	/admin/work-hub?tab=report	\N	admin	\N	2026-04-10 21:21:05.158901
전자결재 및 문서 관리	dir	1050000	1000000	14		\N	\N	2026-04-10 21:21:05.608956	/admin/sanctn/forms	\N	admin	\N	2026-04-10 21:21:05.608957
내 결재함 및 대시보드	ApprovalDashboard	1050100	1050000	15		\N	\N	2026-04-10 21:21:06.059532	/approvals	\N	admin	\N	2026-04-10 21:21:06.059532
워크플로우 프로세스 설정	WorkflowEngineManage	9010500	9010000	48		\N	\N	2026-04-10 21:21:20.829579	/admin/workflow	\N	admin	\N	2026-04-10 21:21:20.82958
게시판 및 커뮤니티 관리	dir	9030100	9030000	64		\N	\N	2026-04-10 21:21:27.848218	/admin/community/boards	\N	admin	\N	2026-04-10 21:21:27.848219
게시판사용정보	selectBBSUseInfs	9030110	9030100	66		\N	\N	2026-04-10 21:21:28.702163	/admin/community/boards	\N	admin	\N	2026-04-10 21:21:28.702164
템플릿관리	selectTemplateInfs	9030120	9030100	67		\N	\N	2026-04-10 21:21:29.127022	/admin/community/templates	\N	admin	\N	2026-04-10 21:21:29.127023
결재 양식 관리	SanctnFormManage	9030200	9030000	69		\N	\N	2026-04-10 21:21:29.989022	/admin/sanctn/forms	\N	admin	\N	2026-04-10 21:21:29.989023
메모보고 관리	MemoReportAdminService	9030600	9030000	72		\N	\N	2026-04-10 21:21:31.330461	/admin/operation/memo-reports	\N	admin	\N	2026-04-10 21:21:31.329955
발송메일내역	selectSndngMailList	9040200	9040000	74		\N	\N	2026-04-10 21:21:32.229418	/admin/collaboration/mail-history	\N	admin	\N	2026-04-10 21:21:32.2284
💌 업무 쪽지함	dir	1020400	1020000	8		\N	\N	2026-04-10 21:21:02.909957	/note	admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:02.909958
🛠️ 스마트 툴킷 허브	dir	1060000	1000000	16		\N	\N	2026-04-10 21:21:06.510963		admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:06.510342
부서 업무 관리 도구	dir	1060100	1060000	17		\N	\N	2026-04-10 21:21:06.959334	/smart-toolkit/dept-job	admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:06.958828
통합 일정 도구	dir	1060200	1060000	18		\N	\N	2026-04-10 21:21:07.399207	/smart-toolkit/schedule	admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:07.399207
🔍 통합 검색	dir	1000001	1000000	19		\N	\N	2026-04-10 21:21:07.850947	/search	admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:07.849948
포상관리	selectRwardManageList	2030300	2030000	25		\N	\N	2026-04-10 21:21:10.549566	/admin/operation/rewards	\N	admin	\N	2026-04-10 21:21:10.549566
온라인poll관리	listOnlinePollManage	2010700	2010000	39		\N	\N	2026-04-10 21:21:16.809088	/admin/survey/hub?tab=templates	\N	admin	\N	2026-04-10 21:21:16.809088
온라인poll참여	listOnlinePollPartcptn	2010800	2010000	40		\N	\N	2026-04-10 21:21:17.25863	/admin/survey/polls/participate	\N	admin	\N	2026-04-10 21:21:17.258631
📝 온라인 설문 참여	dir	2010900	2000000	42		\N	\N	2026-04-10 21:21:18.139427	/survey	admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:18.139428
배너 및 팝업 관리	selectBannerMainList	9010400	9010000	47		\N	\N	2026-04-10 21:21:20.388741	/admin/system/banner	\N	admin	\N	2026-04-10 21:21:20.388742
계정 및 사용자 관리	EgovEntrprsMberManage	9020310	9020000	54		\N	\N	2026-04-10 21:21:23.47915	/admin/user/manage	\N	admin	\N	2026-04-10 21:21:23.47915
권한(보안) 정책 관리	EgovAuthorList	9020311	9020000	56		\N	\N	2026-04-10 21:21:24.380037	/admin/security/authority	\N	admin	\N	2026-04-10 21:21:24.380037
부서 및 조직 관리	selectDeptManageListView	9020312	9020000	57		\N	\N	2026-04-10 21:21:24.830293	/admin/user/departments	\N	admin	\N	2026-04-10 21:21:24.829292
부서권한관리	EgovDeptAuthorList	9020230	9020000	58		\N	\N	2026-04-10 21:21:25.270239	/admin/security/dept-authority	\N	admin	\N	2026-04-10 21:21:25.269231
로그인	egovLoginUsr	9020110	9020100	60		\N	\N	2026-04-10 21:21:26.141205	/admin/system/monitoring/hub?tab=security	\N	admin	\N	2026-04-10 21:21:26.141206
로그인정책관리	selectLoginPolicyList	9020120	9020100	61		\N	\N	2026-04-10 21:21:26.567359	/admin/system/monitoring/hub?tab=policy	\N	admin	\N	2026-04-10 21:21:26.56736
개인정보보호정책확인	listIndvdlInfoPolicy	9020130	9020100	62		\N	\N	2026-04-10 21:21:26.992509	/admin/user/indvdl-info-policy	\N	admin	\N	2026-04-10 21:21:26.992509
댓글 및 평가 관리	CommentManage	9030130	9030100	68		\N	\N	2026-04-10 21:21:29.555818	/admin/system/comments	\N	admin	\N	2026-04-10 21:21:29.554753
보안 감사 로그	SecurityAudit	9040310	9040000	75		\N	\N	2026-04-10 21:21:32.678836	/admin/system/monitoring/hub?tab=security	\N	admin	\N	2026-04-10 21:21:32.678836
시스템 감사 로그	SystemAudit	9040320	9040000	76		\N	\N	2026-04-10 21:21:33.119169	/admin/system/monitoring/hub?tab=system	\N	admin	\N	2026-04-10 21:21:33.118059
시스템 상태 모니터링	SystemObservability	9040330	9040000	77		\N	\N	2026-04-10 21:21:33.568002	/admin/system/monitoring/hub?tab=health	\N	admin	\N	2026-04-10 21:21:33.568003
상세 접속 로그 (Login)	dir	9040340	9040000	84		\N	\N	2026-04-10 21:21:36.700042	/admin/system/logs/login	admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:36.700043
상세 시스템 로그 (System)	dir	9040350	9040000	85		\N	\N	2026-04-10 21:21:37.14806	/admin/system/logs/system	admin	admin	2026-03-31 02:48:47.985947	2026-04-10 21:21:37.14806
시스템 기반 설정	dir	9010000	9000000	44		\N	\N	2026-04-10 21:21:19.038709		\N	admin	\N	2026-04-10 21:21:19.03871
메뉴 관리	EgovMenuListSelect	9010210	9010000	49		\N	\N	2026-04-10 21:21:21.26925	/admin/system/menus	\N	admin	\N	2026-04-10 21:21:21.269251
메뉴생성관리	EgovMenuCreatManageSelect	9010220	9010000	50		\N	\N	2026-04-10 21:21:21.720785	/admin/system/menus/by-authority	\N	admin	\N	2026-04-10 21:21:21.720785
프로그램 관리	EgovProgramListManageSelect	9010230	9010000	51		\N	\N	2026-04-10 21:21:22.158948	/admin/system/programs	\N	admin	\N	2026-04-10 21:21:22.158949
계정 및 권한 관리	dir	9020000	9000000	52		\N	\N	2026-04-10 21:21:22.599448		\N	admin	\N	2026-04-10 21:21:22.599449
서비스 운영 관리	dir	9030000	9000000	63		\N	\N	2026-04-10 21:21:27.417322		\N	admin	\N	2026-04-10 21:21:27.417323
감사 및 통계 모니터링	dir	9040000	9000000	73		\N	\N	2026-04-10 21:21:31.780884		\N	admin	\N	2026-04-10 21:21:31.780349
게시물통계	selectBbsStats	9040101	9040000	78		\N	\N	2026-04-10 21:21:34.019583	/admin/stats/board	\N	admin	\N	2026-04-10 21:21:34.019584
사용자통계	selectUserStats	9040102	9040000	79		\N	\N	2026-04-10 21:21:34.468864	/admin/stats/user	\N	admin	\N	2026-04-10 21:21:34.468864
접속통계	selectConectStats	9040103	9040000	80		\N	\N	2026-04-10 21:21:34.909457	/admin/stats/user	\N	admin	\N	2026-04-10 21:21:34.909458
화면통계	selectScrinStats	9040104	9040000	81		\N	\N	2026-04-10 21:21:35.359435	/admin/stats/screen	\N	admin	\N	2026-04-10 21:21:35.358288
보고서통계	selectReprtStatsListView	9040105	9040000	82		\N	\N	2026-04-10 21:21:35.809052	/admin/stats/report	\N	admin	\N	2026-04-10 21:21:35.809052
콘텐츠 사용량 통계	selectDtaUseStatsList	9040106	9040000	83		\N	\N	2026-04-10 21:21:36.249785	/admin/stats/data-usage	\N	admin	\N	2026-04-10 21:21:36.248785
\.


--
-- Data for Name: nmtgplacefxtrs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nmtgplacefxtrs (mtgrum_id, fxtrs_code, qy, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nnote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nnote (note_id, note_sj, note_cn, atch_file_id, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nnoterecptn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nnoterecptn (note_id, note_trnsmit_id, note_recptn_id, rcver_id, open_yn, recptn_se, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nnotetrnsmit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nnotetrnsmit (note_id, note_trnsmit_id, trnsmiter_id, delete_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nntfcinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nntfcinfo (ntcn_no, ntcn_sj, ntcn_cn, ntcn_tm, bh_ntcn_intrvl, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nnttstats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nnttstats (stats_id, ntce_co, avrg_rdcnt, top_rdcnt, mumm_rdcnt, top_ntcr_id) FROM stdin;
\.


--
-- Data for Name: nntwrkinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nntwrkinfo (ntwrk_id, ntwrk_ip, gtwy, subnet, domn_nm_server, manage_iem, user_nm, use_at, rgsde, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nntwrksvcmntrngloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nntwrksvcmntrngloginfo (sys_ip, sys_port, sys_nm, mntrng_sttus, log_info, creat_dt, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, log_id) FROM stdin;
\.


--
-- Data for Name: nonlinemanual; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nonlinemanual (online_mnl_id, online_mnl_se_code, online_mnl_dfn, online_mnl_dc, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, online_mnl_nm) FROM stdin;
\.


--
-- Data for Name: nonlinepolliem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nonlinepolliem (poll_iem_nm, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, poll_iem_id, poll_id) FROM stdin;
\.


--
-- Data for Name: nonlinepollmanage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nonlinepollmanage (poll_id, poll_nm, poll_bgnde, poll_endde, poll_knd, poll_dsuse_ennc, poll_atmc_dsuse_ennc, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nonlinepollresult; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nonlinepollresult (poll_result_id, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, poll_iem_id, poll_id) FROM stdin;
\.


--
-- Data for Name: norgnztinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.norgnztinfo (orgnzt_id, orgnzt_nm, orgnzt_dc, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
ORGNZT_0000000000000	기본조직	기본조직	\N	\N	\N	\N
\.


--
-- Data for Name: npolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.npolicy (policy_type, title, content, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
COPYRIGHT	저작권 정책	본 시스템의 모든 저작권은 ...	2026-04-07 09:47:54.750209	SYSTEM	\N	\N
PRIVACY	개인정보처리방침	본 시스템은 사용자의 개인정보를 ...	2026-04-07 09:47:54.750209	SYSTEM	\N	\N
\.


--
-- Data for Name: npopupmanage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.npopupmanage (popup_id, popup_sj_nm, file_url, popup_width_lc, popup_width_size, ntce_bgnde, ntce_endde, stopvew_setup_at, ntce_at, popup_vrticl_lc, popup_vrticl_size, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nprivacylog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nprivacylog (requst_id, inqire_dt, srvc_nm, inqire_info, rqester_id, rqester_ip) FROM stdin;
\.


--
-- Data for Name: nprocessmonloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nprocessmonloginfo (procs_id, procs_nm, procs_sttus, creat_dt, log_info, mngr_nm, mngr_email_adres, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, log_id) FROM stdin;
\.


--
-- Data for Name: nprogrmlist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nprogrmlist (progrm_file_nm, progrm_stre_path, progrm_korean_nm, progrm_dc, url, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
dir	dir	디렉토리	디렉토리	/admin/system/common-code	\N	\N	\N	2026-03-26 00:03:16.937349
EgovIndvdlpgeCntntsList	/uss/mpe/	마이페이지관리	마이페이지관리	/admin/workspace/mypage	\N	\N	\N	2026-03-26 00:03:16.937349
WorkflowEngineManage	/admin/workflow/	워크플로우 프로세스 설정	워크플로우 프로세스 설정	/admin/workflow	\N	\N	\N	2026-03-26 00:03:16.937349
SanctnFormManage	/admin/sanctn/forms/	결재 양식 관리	결재 양식 관리	/admin/sanctn/forms	\N	\N	\N	2026-03-26 00:03:16.937349
ApprovalDashboard	/approvals/	내 결재함 및 대시보드	신규 전자결재 대시보드	/admin/sanctn/forms	\N	\N	\N	2026-03-26 00:03:16.937349
EgovEntrprsMberManage	@/services/foundation/user/	기업회원관리	기업회원관리	/admin/user/manage	\N	\N	\N	2026-03-26 00:03:16.937349
EgovMenuCreatManageSelect	@/services/foundation/system/	메뉴생성관리	메뉴생성관리	/admin/system/menus/by-authority	\N	\N	\N	2026-03-26 00:03:16.937349
EgovCcmCmmnClCodeList	@/services/foundation/system/	공통분류코드	공통분류코드	/admin/system/common-code	\N	\N	\N	2026-03-26 00:03:16.937349
EgovGroupList	@/services/foundation/security/	그룹관리	그룹관리	/admin/security/group	\N	\N	\N	2026-03-26 00:03:16.937349
EgovDeptAuthorList	@/services/foundation/security/	부서권한관리	부서권한관리	/admin/security/dept-authority	\N	\N	\N	2026-03-26 00:03:16.937349
FaqListInqire	@/services/business/help/	FAQ관리	FAQ관리	/admin/help/faq?tab=FAQ	\N	\N	\N	2026-03-26 00:03:16.937349
EgovDeptSchdulManageList	@/services/business/schedule/	부서일정관리	부서일정관리	/admin/work-hub?tab=calendar	\N	\N	\N	2026-03-26 00:03:16.937349
EgovIndvdlSchdulManageList	@/services/business/schedule/	일정관리	일정관리	/admin/work-hub?tab=calendar	\N	\N	\N	2026-03-26 00:03:16.937349
listIndvdlInfoPolicy	@/services/foundation/user/	개인정보보호정책확인	개인정보보호정책확인	/admin/user/indvdl-info-policy	\N	\N	\N	2026-03-26 00:03:16.937349
selectDeptManageListView	@/services/foundation/user/	부서관리	부서관리	/admin/user/departments	\N	\N	\N	2026-03-26 00:03:16.937349
KnowledgeAdminService	@/services/business/knowledge/	지식 자산 관리 서비스	\N	/admin/help/knowledge	\N	\N	\N	2026-03-26 01:47:19.380814
EventAdminService	@/services/foundation/operation/	행사 정보 관리 서비스	\N	/admin/operation/events	\N	\N	\N	2026-03-26 01:47:19.380814
insertSndngMailView	/cop/ems/	메일발송	메일발송	/admin/collaboration/mail-send	\N	\N	\N	2026-03-26 00:03:16.937349
SecurityAudit	/admin/security/audit	보안 감사 로그	보안 감사 로그	/admin/system/monitoring/hub?tab=security	\N	\N	\N	2026-03-26 00:03:16.937349
SystemAudit	/admin/system/audit	시스템 감사 로그	시스템 감사 로그	/admin/system/monitoring/hub?tab=system	\N	\N	\N	2026-03-26 00:03:16.937349
SystemObservability	/admin/observability	시스템 상태 모니터링	시스템 상태 모니터링	/admin/system/monitoring/hub?tab=health	\N	\N	\N	2026-03-26 00:03:16.937349
listRequestOffer	/dam/spe/req/	지식정보제공	지식정보제공	/admin/knowledge/request-offer	\N	\N	\N	2026-03-26 00:03:16.937349
RoughMapAdminService	@/services/business/roughmap/	약도 정보 관리 서비스	\N	/admin/operation/rough-map	\N	\N	\N	2026-03-26 01:59:59.671288
selectProxySvcList	/utl/sys/pxy/	프록시서비스	프록시서비스	/admin/system/monitoring	\N	\N	\N	2026-03-26 00:03:16.937349
EgovQustnrManageList	/uss/olp/qmc/	설문관리	설문관리	/admin/survey/hub?tab=manage	\N	\N	\N	2026-03-26 00:03:16.937349
getInsttCodeRecptnList	@/services/foundation/system/	기관코드수신	기관코드수신	/admin/system/instt-code-recptn	\N	\N	\N	2026-03-26 00:03:16.937349
selectBkmkMenuManageList	@/services/foundation/system/	바로가기메뉴관리	바로가기메뉴관리	/admin/system/bkmk-menu	\N	\N	\N	2026-03-26 00:03:16.937349
selectLoginPolicyList	@/services/foundation/auth/	로그인정책관리	로그인정책관리	/admin/system/monitoring/hub?tab=policy	\N	\N	\N	2026-03-26 00:03:16.937349
selectConectStats	@/services/foundation/stats/	접속통계	접속통계	/admin/stats/user	\N	\N	\N	2026-03-26 00:03:16.937349
selectDtaUseStatsList	@/services/foundation/stats/	자료이용현황통계	자료이용현황통계	/admin/stats/data-usage	\N	\N	\N	2026-03-26 00:03:16.937349
SelectLoginLogList	@/services/foundation/system/	접속로그관리	접속로그관리	/admin/system/logs/login	\N	\N	\N	2026-03-26 00:03:16.937349
selectBbsStats	@/services/business/board/	게시물통계	게시물통계	/admin/stats/board	\N	\N	\N	2026-03-26 00:03:16.937349
CommentManage	@/services/business/comment/	댓글 및 평가 관리	댓글 및 평가 관리	/admin/system/comments	\N	\N	\N	2026-03-26 00:03:16.937349
HpcmListInqire	@/services/business/help/	도움말	도움말	/admin/help/faq?tab=WIKI	\N	\N	\N	2026-03-26 00:03:16.937349
EgovQustnrRespondInfoManageList	/uss/olp/qnn/	설문조사	설문조사	/admin/survey/hub?tab=manage	\N	\N	\N	2026-03-26 00:03:16.937349
EgovQustnrTmplatManageList	/uss/olp/qtm/	설문템플릿관리	설문템플릿관리	/admin/survey/hub?tab=manage	\N	\N	\N	2026-03-26 00:03:16.937349
MemoReportAdminService	@/services/business/memoreport/	메모보고 관리 서비스	\N	/admin/operation/memo-reports	\N	\N	\N	2026-03-26 02:00:50.124317
selectScrapList	/cop/scp/	스크랩 목록	스크랩 목록	/admin/collaboration/scraps	\N	\N	\N	2026-03-26 00:03:16.937349
selectNotificationList	/uss/ion/noi/	정보알림이	정보알림이	/admin/notifications	\N	\N	\N	2026-03-26 00:03:16.937349
selectSmsList	/cop/sms/	문자메시지	문자메시지	/admin/uss/ion/sms	\N	\N	\N	2026-03-26 00:03:16.937349
QnaListInqire	@/services/business/help/	Q&amp;A관리	Q&amp;A관리	/admin/help/qna	\N	\N	\N	2026-03-26 00:03:16.937349
selectDeptJobBxList	@/services/business/deptjob/	부서업무함관리	부서업무함관리	/admin/work-hub?tab=report	\N	\N	\N	2026-03-26 00:03:16.937349
loginSessionView	/utl/sys/rsc/	로그인세션정보체크	로그인세션정보체크	/admin/system/logs/login	\N	\N	\N	2026-03-26 00:03:16.937349
selectAnnvrsryMainList	/uss/ion/ans/	기념일목록(확인용)	기념일목록(확인용)	/uss/ion/anniversaries	\N	\N	\N	2026-03-26 00:03:16.937349
selectAnnvrsryManageList	/uss/ion/ans/	기념일관리	기념일관리	/uss/ion/anniversaries	\N	\N	\N	2026-03-26 00:03:16.937349
EgovQustnrRespondManageList	/uss/olp/qrm/	응답자관리	응답자관리	/admin/survey/hub?tab=respondents	\N	\N	\N	2026-03-26 00:03:16.937349
selectWikMnthngReprtList	/cop/smt/wmr/	주간/월간보고관리	주간/월간보고관리	/admin/work-hub?tab=report	\N	\N	\N	2026-03-26 00:03:16.937349
selectTemplateInfs	/cop/tpl/	템플릿관리	템플릿관리	/admin/community/templates	\N	\N	\N	2026-03-26 00:03:16.937349
selectIntnetSvcGuidanceList	/uss/ion/isg/	인터넷서비스안내및관리	인터넷서비스안내및관리	/admin/uss/ion/internet-service	\N	\N	\N	2026-03-26 00:03:16.937349
listNoteTrnsmit	/uss/ion/nts/	보낸쪽지함관리	보낸쪽지함관리	/admin/collaboration/mail-history	\N	\N	\N	2026-03-26 00:03:16.937349
EgovQustnrQestnManageList	/uss/olp/qqm/	질문관리	질문관리	/admin/survey/hub?tab=questions	\N	\N	\N	2026-03-26 00:03:16.937349
EgovQustnrItemManageList	/uss/olp/qim/	항목관리	항목관리	/admin/survey/hub?tab=items	\N	\N	\N	2026-03-26 00:03:16.937349
BoardMasterConsole	/admin/community/boards/master	통합 게시판 마스터 콘솔	게시판 생성 및 관리 마운트 포인트	/admin/community/boards/master	\N	\N	\N	2026-03-26 00:03:16.937349
EgovTnextrlHrInfoList	/uss/ion/ecc/	외부인사정보	외부인사정보	/admin/operation/external-hr	\N	\N	\N	2026-03-26 00:03:16.937349
selectUserAbsnceListView	/uss/ion/uas/	사용자부재관리	사용자부재관리	/admin/user/absences	\N	\N	\N	2026-03-26 00:03:16.937349
selectSndngMailList	/cop/ems/	발송메일내역	발송메일내역	/admin/collaboration/mail-history	\N	\N	\N	2026-03-26 00:03:16.937349
EgovProgramListManageSelect	@/services/foundation/system/	프로그램관리	프로그램관리	/admin/system/programs	\N	\N	\N	2026-03-26 00:03:16.937349
EgovRoleList	@/services/foundation/security/	롤관리	롤관리	/admin/security/role	\N	\N	\N	2026-03-26 00:03:16.937349
EgovAuthorList	@/services/foundation/security/	권한관리	권한관리	/admin/security/authority	\N	\N	\N	2026-03-26 00:03:16.937349
egovLoginUsr	@/services/foundation/auth/	로그인	로그인	/admin/system/monitoring/hub?tab=security	\N	\N	\N	2026-03-26 00:03:16.937349
selectUserStats	@/services/foundation/stats/	사용자통계	사용자통계	/admin/stats/user	\N	\N	\N	2026-03-26 00:03:16.937349
selectScrinStats	@/services/foundation/stats/	화면통계	화면통계	/admin/stats/screen	\N	\N	\N	2026-03-26 00:03:16.937349
selectReprtStatsListView	@/services/foundation/stats/	보고서통계	보고서통계	/admin/stats/report	\N	\N	\N	2026-03-26 00:03:16.937349
CnsltAnswerListInqire	@/services/business/help/	상담답변관리	상담답변관리 프로그램	/admin/help/faq?tab=QNA	\N	\N	\N	2026-03-26 00:03:16.937349
selectAdbkList	/cop/adb/	주소록관리	주소록관리	/admin/collaboration/address-book	\N	\N	\N	2026-03-26 00:03:16.937349
selectRwardManageList	/uss/ion/rwd/	포상관리	포상관리	/admin/operation/rewards	\N	\N	\N	2026-03-26 00:03:16.937349
listOnlinePollManage	/uss/olp/opm/	온라인poll관리	온라인poll관리	/admin/survey/hub?tab=templates	\N	\N	\N	2026-03-26 00:03:16.937349
selectBannerMainList	/uss/ion/bnr/	MYPAGE배너관리	MYPAGE배너관리	/admin/system/banner	\N	\N	\N	2026-03-26 00:03:16.937349
listOnlinePollPartcptn	/uss/olp/opp/	온라인poll참여	온라인poll참여	/admin/survey/polls/participate	\N	\N	\N	2026-03-26 00:03:16.937349
EgovMenuListSelect	@/services/foundation/system/	메뉴리스트관리	메뉴리스트관리	/admin/system/menus	\N	\N	\N	2026-03-26 00:03:16.937349
SelectSysLogList	@/services/foundation/system/	로그관리	로그관리	/admin/system/logs/system	\N	\N	\N	2026-03-26 00:03:16.937349
SelectTrsmrcvLogList	@/services/foundation/system/	송/수신로그관리	송/수신로그관리	/admin/system/logs/transfer	\N	\N	\N	2026-03-26 00:03:16.937349
SelectUserLogList	@/services/foundation/system/	사용로그관리	사용로그관리	/admin/system/logs/user	\N	\N	\N	2026-03-26 00:03:16.937349
SelectWebLogList	@/services/foundation/system/	웹로그관리	웹로그관리	/admin/system/logs/web	\N	\N	\N	2026-03-26 00:03:16.937349
EgovBBSMaster	@/services/business/board/	자동생성메뉴(test)	\N	/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000131	\N	\N	\N	2026-03-26 00:03:16.937349
selectBBSUseInfs	@/services/business/board/	게시판사용정보	게시판사용정보	/admin/community/boards	\N	\N	\N	2026-03-26 00:03:16.937349
listOnlineManual	@/services/business/help/	온라인매뉴얼	온라인매뉴얼	/admin/uss/olh/online-manual	\N	\N	\N	2026-03-26 00:03:16.937349
QnaAnswerListInqire	@/services/business/help/	Q&amp;A답변관리	Q&amp;A답변관리	/admin/uss/olh/qna-answer	\N	\N	\N	2026-03-26 00:03:16.937349
\.


--
-- Data for Name: nproxyinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nproxyinfo (proxy_id, proxy_nm, proxy_ip, proxy_port, trget_svc_nm, svc_dc, svc_ip, svc_port, svc_sttus, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nproxyloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nproxyloginfo (proxy_id, clnt_ip, clnt_port, conect_time, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, log_id) FROM stdin;
\.


--
-- Data for Name: nqainfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nqainfo (qa_id, qestn_sj, qestn_cn, writng_de, rdcnt, email_adres, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, qna_process_sttus_code, wrter_nm, answer_cn, writng_password, answer_de, email_answer_at, area_no, middle_telno, end_telno) FROM stdin;
\.


--
-- Data for Name: nqestnrinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nqestnrinfo (qustnr_tmplat_id, qestnr_id, qustnr_sj, qustnr_purps, qustnr_writng_guidance_cn, qustnr_trget, qustnr_bgnde, qustnr_endde, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
TMPLAT_0000000000001	QESTNR_0000000000001	2025년 직원 만족도 조사	직원들의 근무 환경 만족도를 조사합니다.	솔직하게 답변해 주시기 바랍니다.	전 직원	2025-01-01          	2025-12-31          	2025-12-29 01:39:41.36303	USER	2025-12-29 01:39:41.36303	USER
\.


--
-- Data for Name: nqustnriem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nqustnriem (qustnr_tmplat_id, qestnr_id, qustnr_qesitm_id, qustnr_iem_id, iem_sn, iem_cn, etc_answer_at, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
TMPLAT_0000000000001	QESTNR_0000000000001	QESITM_0000000000001	IEM_0000000000000001	1	매우 만족	\N	2025-12-29 01:39:41.366601	USER	2025-12-29 01:39:41.366601	USER
TMPLAT_0000000000001	QESTNR_0000000000001	QESITM_0000000000001	IEM_0000000000000002	2	만족	\N	2025-12-29 01:39:41.368301	USER	2025-12-29 01:39:41.368301	USER
TMPLAT_0000000000001	QESTNR_0000000000001	QESITM_0000000000001	IEM_0000000000000003	3	보통	\N	2025-12-29 01:39:41.369248	USER	2025-12-29 01:39:41.369248	USER
TMPLAT_0000000000001	QESTNR_0000000000001	QESITM_0000000000001	IEM_0000000000000004	4	불만족	\N	2025-12-29 01:39:41.370317	USER	2025-12-29 01:39:41.370317	USER
\.


--
-- Data for Name: nqustnrqesitm; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nqustnrqesitm (qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id, qestn_sn, qestn_ty_code, qestn_cn, mxmm_choise_co, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
QESTNR_0000000000001	QESITM_0000000000001	TMPLAT_0000000000001	1	1	현재 근무 환경에 만족하십니까?	1	2025-12-29 01:39:41.364409	USER	2025-12-29 01:39:41.364409	USER
QESTNR_0000000000001	QESITM_0000000000002	TMPLAT_0000000000001	2	2	개선이 필요한 점을 자유롭게 기술해 주세요.	1	2025-12-29 01:39:41.365826	USER	2025-12-29 01:39:41.365826	USER
\.


--
-- Data for Name: nqustnrrespondinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nqustnrrespondinfo (qustnr_tmplat_id, qestnr_id, qustnr_respond_id, sexdstn_code, occp_ty_code, respond_nm, brthdy, area_no, middle_telno, end_telno, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nqustnrrspnsresult; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nqustnrrspnsresult (qustnr_rspns_result_id, qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id, respond_answer_cn, etc_answer_cn, respond_nm, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, qustnr_iem_id) FROM stdin;
RESULT_0000000000001	QESTNR_0000000000001	QESITM_0000000000001	TMPLAT_0000000000001	1	\N	홍길동	2025-12-29 01:39:41.371426	USER	2025-12-29 01:39:41.371426	USER	IEM_0000000000000001
RESULT_0000000000002	QESTNR_0000000000001	QESITM_0000000000002	TMPLAT_0000000000001	휴게 공간이 더 필요합니다.	\N	홍길동	2025-12-29 01:39:41.373122	USER	2025-12-29 01:39:41.373122	USER	\N
\.


--
-- Data for Name: nqustnrtmplat; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nqustnrtmplat (qustnr_tmplat_id, qustnr_tmplat_ty, qustnr_tmplat_dc, qustnr_tmplat_path_nm, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, qustnr_tmplat_image_info) FROM stdin;
TMPLAT_0000000000001	기본설문	기본 설문 템플릿입니다.	/WEB-INF/jsp/egovframework/com/uss/olp/qri/template/template01.jsp	2025-12-29 01:39:41.36197	USER	2025-12-29 01:39:41.36197	USER	\N
\.


--
-- Data for Name: nrefresh_token; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nrefresh_token (user_id, token, expiry_date) FROM stdin;
webmaster	eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ3ZWJtYXN0ZXIiLCJpYXQiOjE3NzI2MTIzOTUsImV4cCI6MTc3MzIxNzE5NX0.0ZoEXDsEuC4Z7BYUbMPG7lPty1953-ZVqux_MvaZhibEUVg7nCne3zsapdCmndj7ZiZG7YiAyIf4SlEIhNdxqw	2026-03-11 08:19:55.892
\.


--
-- Data for Name: nreprtstats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nreprtstats (reprt_id, reprt_nm, reprt_sttus, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm, reprt_ty) FROM stdin;
\.


--
-- Data for Name: nroleinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nroleinfo (role_code, role_nm, role_pttrn, role_dc, role_ty, role_sort, role_creat_de, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
web-000001	로그인롤	\\A/uat/uia/.*\\.do.*\\Z	로그인허용을 위한 롤	url	1	2025-12-29 01:39:41.039781	\N	\N	\N	\N
web-000002	좌측메뉴	/EgovLeft.do	좌측 메뉴에 대한 접근 제한 롤	url	2	2025-12-29 01:39:41.041053	\N	\N	\N	\N
web-000003	모든접근제한	\\A/.*\\.do.*\\Z	모든자원에 대한 접근 제한 롤	url	3	2025-12-29 01:39:41.041815	\N	\N	\N	\N
web-000004	회원관리	\\A/uss/umt/.*\\.do.*\\Z	회원관리에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.042669	\N	\N	\N	\N
web-000005	실명확인	\\A/sec/rnc/.*\\.do.*\\Z	실명확인에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.043583	\N	\N	\N	\N
web-000006	우편번호	\\A/sym/ccm/zip/.*\\.do.*\\Z	우편번호관리에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.044452	\N	\N	\N	\N
web-000007	로그인이미지	\\A/uss/ion/lsi/.*\\.do.*\\Z	로그인이미지관리에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.045167	\N	\N	\N	\N
web-000008	파일다운로드	/cmm/fms/FileDown.do.*	파일다운로드에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.046004	\N	\N	\N	\N
web-000009	상단메뉴	/EgovTop.do	상단메뉴에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.046785	\N	\N	\N	\N
web-000010	하단메뉴	/EgovBottom.do	하단메뉴에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.047544	\N	\N	\N	\N
web-000011	왼쪽메뉴	/EgovLeft.do	왼쪽메뉴에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.048232	\N	\N	\N	\N
web-000012	Validator모듈	/validator.do	Validator에 대한 접근 제한 롤	url	1	2025-12-29 01:39:41.049071	\N	\N	\N	\N
\.


--
-- Data for Name: nroles_hierarchy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nroles_hierarchy (parnts_role, chldrn_role) FROM stdin;
ROLE_ANONYMOUS	IS_AUTHENTICATED_ANONYMOUSLY
IS_AUTHENTICATED_ANONYMOUSLY	IS_AUTHENTICATED_REMEMBERED
IS_AUTHENTICATED_REMEMBERED	IS_AUTHENTICATED_FULLY
IS_AUTHENTICATED_FULLY	ROLE_USER
ROLE_USER	ROLE_ADMIN
\.


--
-- Data for Name: nroughmap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nroughmap (roughmap_id, roughmapsj, roughmapaddress, la, lo, markerla, markerlo, infowindow, zoomlevel, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nrwardmanage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nrwardmanage (rward_id, rwardwnr_id, rward_code, rward_de, rward_nm, pblen_cn, sanctner_id, confm_at, sanctn_dt, return_resn, atch_file_id, infrml_sanctn_id, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nschdulinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nschdulinfo (schdul_id, schdul_se, schdul_dept_id, schdul_knd_code, schdul_bgnde, schdul_endde, schdul_nm, schdul_cn, schdul_place, schdul_ipcr_code, schdul_charger_id, atch_file_id, frst_regist_pnttm, frst_register_id, last_updt_pnttm, last_updusr_id, reptit_se_code) FROM stdin;
\.


--
-- Data for Name: nscrap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nscrap (scrap_id, ntt_id, bbs_id, scrap_nm, use_at, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nservereqpmninfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nservereqpmninfo (server_eqpmn_id, server_eqpmn_nm, server_eqpmn_ip, server_eqpmn_mngr, mngr_email_adres, opersysm_info, cpu_info, mory_info, hddisk, etc_info, rgsde, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nserverinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nserverinfo (server_id, server_nm, server_knd, rgsde, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nserverresrceloginfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nserverresrceloginfo (server_eqpmn_id, cpu_use_rt, mory_use_rt, svc_sttus, log_info, creat_dt, frst_register_id, frst_regist_pnttm, last_updusr_id, server_id, last_updt_pnttm, log_id) FROM stdin;
\.


--
-- Data for Name: nsitemap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nsitemap (mapng_creat_id, creatr_id, mapng_file_nm, mapng_file_path) FROM stdin;
\.


--
-- Data for Name: nsms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nsms (sms_id, trnsmis_telno, trnsmis_cn, frst_regist_pnttm, frst_register_id, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nsmsrecptn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nsmsrecptn (sms_id, recptn_telno, result_code, result_mssage) FROM stdin;
\.


--
-- Data for Name: nstsfdg; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nstsfdg (stsfdg_no, ntt_id, bbs_id, wrter_id, wrter_nm, password, stsfdg, stsfdg_cn, use_at, frst_regist_pnttm, last_updt_pnttm, frst_register_id, last_updusr_id) FROM stdin;
\.


--
-- Data for Name: nsynchrnserverinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nsynchrnserverinfo (server_id, server_nm, server_ip, server_port, ftp_id, ftp_password, synchrn_lc, reflct_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nsyslog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nsyslog (requst_id, job_se_code, instt_code, occrrnc_de, rqester_ip, rqester_id, trget_menu_nm, svc_nm, method_nm, process_se_code, process_co, process_time, rspns_code, error_se, error_co, error_code, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ntmplatinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ntmplatinfo (tmplat_id, tmplat_nm, tmplat_cours, use_at, tmplat_se_code, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
TMPLAT_BOARD_DEFAULT	게시판 기본템플릿	/css/egovframework/com/cop/tpl/egovbbsTemplate.css	Y	TMPT01	SYSTEM	2025-12-29 01:39:41.354615	\N	\N
TMPLAT_CMNTY_DEFAULT	커뮤니티 기본템플릿	egovframework/com/cop/tpl/EgovCmmntyBaseTmpl	Y	TMPT02	SYSTEM	2025-12-29 01:39:41.356026	\N	\N
TMPLAT_CLUB__DEFAULT	동호회 기본템플릿	egovframework/com/cop/tpl/EgovClbBaseTmpl	Y	TMPT03	SYSTEM	2025-12-29 01:39:41.356913	\N	\N
\.


--
-- Data for Name: ntroblinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ntroblinfo (trobl_id, trobl_nm, trobl_knd, trobl_dc, trobl_occrrnc_time, trobl_rqester_nm, trobl_requst_time, trobl_process_result, trobl_opetr_nm, trobl_process_time, process_sttus, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: ntrsmrcvlog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ntrsmrcvlog (requst_id, occrrnc_de, trsmrcv_se_code, cntc_id, provd_instt_id, provd_sys_id, provd_svc_id, requst_instt_id, requst_sys_id, requst_trnsmit_tm, requst_recptn_tm, rspns_trnsmit_tm, rspns_recptn_tm, result_code, result_mssage, frst_regist_pnttm, rqester_id) FROM stdin;
\.


--
-- Data for Name: ntrsmrcvmntrng; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ntrsmrcvmntrng (cntc_id, test_class_nm, mngr_nm, mngr_email_adres, mntrng_sttus, creat_dt, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nuserabsnce; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nuserabsnce (emplyr_id, user_absnce_at, frst_register_id, frst_regist_pnttm, last_updusr_id, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: nuserlog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nuserlog (occrrnc_de, rqester_id, svc_nm, method_nm, creat_co, updt_co, rdcnt, delete_co, outpt_co, error_co) FROM stdin;
\.


--
-- Data for Name: nweblog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nweblog (requst_id, occrrnc_de, url, rqester_id, rqester_ip, frst_register_id, last_updusr_id, frst_regist_pnttm, last_updt_pnttm) FROM stdin;
\.


--
-- Data for Name: revinfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revinfo (rev, revtstmp) FROM stdin;
2	1772542236737
52	1772973711613
102	1773369977868
152	1773384125309
202	1773405692302
252	1773405787152
253	1773405788514
302	1773405972642
303	1773405973974
352	1773409626583
353	1773409628472
402	1773625194671
403	1773625196015
452	1773625859334
453	1773625860772
502	1773626317665
503	1773626318936
552	1773646378094
553	1773646379466
602	1773649282270
603	1773649283597
652	1773714748786
653	1773714750131
702	1773724876179
703	1773724877587
752	1773725287344
753	1773725288625
802	1773726159188
803	1773726160529
852	1773833247238
853	1773833248661
902	1773833423861
903	1773833425391
952	1773834095004
953	1773834096451
1002	1773834298317
1003	1773834299670
1052	1773880958866
1053	1773880960841
1102	1773882005370
1103	1773882006701
1152	1773882492543
1153	1773882493869
1202	1773928250166
1203	1773928251693
1252	1773977996649
1253	1773977997958
1302	1773990391266
1303	1773990392580
1352	1774005290120
1353	1774005291555
1402	1774061503739
1403	1774061505459
1452	1774080605785
1453	1774080607512
1502	1774157634059
1503	1774157635580
1552	1774162420258
1553	1774162421623
1602	1774162529971
1603	1774162531410
1652	1774223450404
1653	1774223451810
1702	1774272783344
1703	1774272784786
1752	1774310212814
1753	1774310214196
1802	1774314792305
1803	1774314793820
1852	1774358385053
1853	1774358386891
1902	1774365448024
1903	1774365450395
1952	1774387744657
1953	1774387746058
2002	1774394893296
2003	1774394894668
2052	1774396942902
2053	1774396944201
2102	1774397118615
2103	1774397119958
2152	1774397421011
2153	1774397422282
2202	1774397652595
2203	1774397653855
2252	1774398299925
2253	1774398306714
2302	1774398535629
2303	1774398536919
2352	1774398705779
2353	1774398707062
2402	1774398842827
2403	1774398844141
2452	1774399149971
2453	1774399151298
2502	1774399738534
2503	1774399739869
2552	1774430954870
2553	1774430956362
2602	1774431018894
2603	1774431020419
2652	1774431113720
2653	1774431115464
2702	1774431570204
2703	1774431573423
2752	1774432225177
2753	1774432227190
2802	1774450061035
2803	1774450062448
2852	1774451223708
2853	1774451225319
2902	1774453496562
2903	1774453497960
2952	1774488768159
2953	1774488769517
3002	1774488817340
3003	1774488818617
3052	1774490473123
3053	1774490474528
3102	1774491016641
3103	1774491018036
3152	1774491960522
3153	1774491961953
3202	1774492766257
3203	1774492767559
3252	1774493179316
3253	1774493180820
3302	1774497770839
3303	1774497772264
3352	1774686679353
3353	1774686680775
3402	1774688422821
3403	1774688424303
3452	1774688648467
3453	1774688649925
3502	1774714076524
3503	1774714077786
3552	1774714291307
3553	1774714292655
3602	1774714393249
3603	1774714394565
3652	1774714561892
3653	1774714563205
3702	1774715901048
3703	1774715902416
3752	1774752998911
3753	1774753000394
3802	1774754490196
3803	1774754491463
3852	1774758541321
3853	1774758542593
3902	1774759192997
3903	1774759194258
3952	1774770579414
3953	1774770580645
4002	1774771571023
4003	1774771572558
4052	1774772146774
4053	1774772148067
4102	1774772239940
4103	1774772241233
4152	1774773347016
4153	1774773348318
4202	1774773634016
4203	1774773635259
4252	1774774481026
4253	1774774482370
4302	1774776638438
4303	1774776639862
4352	1774779378855
4353	1774779380236
4402	1774780892036
4403	1774780893458
4452	1774785266421
4453	1774785267830
4502	1774787598461
4503	1774787599833
4552	1774788241343
4553	1774788242682
4602	1774795962196
4603	1774795963555
4652	1774800908620
4653	1774800910931
4654	1774805844300
4702	1774819759602
4703	1774819760968
4704	1774819843870
4752	1774829199592
4753	1774829200887
4754	1774829569466
4802	1774831119603
4803	1774831120959
4804	1774831220263
4852	1774831829631
4853	1774831830902
4902	1774831946024
4903	1774831947310
4952	1774873575399
4953	1774873576813
5002	1774874908238
5003	1774874910074
5052	1774876860880
5053	1774876862273
5102	1774926067339
5103	1774926068606
5152	1774928381611
5153	1774928382819
5202	1774928463041
5203	1774928464261
5252	1774928687654
5253	1774928688867
5302	1774928790450
5303	1774928791664
5352	1774942281661
5353	1774942282911
5402	1774965500171
5403	1774965501460
5452	1775032161796
5453	1775032163057
5502	1775032261761
5503	1775032262977
\.


--
-- Data for Name: sbbssummary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sbbssummary (occrrnc_de, stats_se, detail_stats_se, creat_co, tot_rdcnt, avrg_rdcnt, top_inqire_bbsctt_id, mumm_inqire_bbsctt_id, top_ntcr_id) FROM stdin;
\.


--
-- Data for Name: ssyslogsummary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ssyslogsummary (occrrnc_de, svc_nm, method_nm, creat_co, updt_co, rdcnt, delete_co, outpt_co, error_co) FROM stdin;
\.


--
-- Data for Name: strsmrcvlogsummary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.strsmrcvlogsummary (occrrnc_de, trsmrcv_se_code, provd_instt_id, provd_sys_id, provd_svc_id, requst_instt_id, requst_sys_id, rdcnt, error_co) FROM stdin;
\.


--
-- Data for Name: susersummary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.susersummary (occrrnc_de, stats_se, detail_stats_se, user_co) FROM stdin;
\.


--
-- Data for Name: sweblogsummary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sweblogsummary (occrrnc_de, url, rdcnt) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-02-26 06:09:09
20211116045059	2026-02-26 06:09:09
20211116050929	2026-02-26 06:09:09
20211116051442	2026-02-26 06:09:09
20211116212300	2026-02-26 06:09:09
20211116213355	2026-02-26 06:09:09
20211116213934	2026-02-26 06:09:09
20211116214523	2026-02-26 06:09:09
20211122062447	2026-02-26 06:09:09
20211124070109	2026-02-26 06:09:09
20211202204204	2026-02-26 06:09:09
20211202204605	2026-02-26 06:09:09
20211210212804	2026-02-26 06:09:09
20211228014915	2026-02-26 07:34:24
20220107221237	2026-02-26 07:34:24
20220228202821	2026-02-26 07:34:24
20220312004840	2026-02-26 07:34:24
20220603231003	2026-02-26 07:34:24
20220603232444	2026-02-26 07:34:24
20220615214548	2026-02-26 07:34:24
20220712093339	2026-02-26 07:34:24
20220908172859	2026-02-26 07:34:24
20220916233421	2026-02-26 07:34:24
20230119133233	2026-02-26 07:34:24
20230128025114	2026-02-26 07:34:24
20230128025212	2026-02-26 07:34:24
20230227211149	2026-02-26 07:34:24
20230228184745	2026-02-26 07:34:24
20230308225145	2026-02-26 07:34:24
20230328144023	2026-02-26 07:34:24
20231018144023	2026-02-26 07:34:24
20231204144023	2026-02-26 07:34:24
20231204144024	2026-02-26 07:34:24
20231204144025	2026-02-26 07:34:24
20240108234812	2026-02-26 07:34:24
20240109165339	2026-02-26 07:34:24
20240227174441	2026-02-26 07:34:24
20240311171622	2026-02-26 07:34:24
20240321100241	2026-02-26 07:34:24
20240401105812	2026-02-26 07:34:24
20240418121054	2026-02-26 07:34:24
20240523004032	2026-02-26 07:34:24
20240618124746	2026-02-26 07:34:24
20240801235015	2026-02-26 07:34:24
20240805133720	2026-02-26 07:34:24
20240827160934	2026-02-26 07:34:24
20240919163303	2026-02-26 07:34:24
20240919163305	2026-02-26 07:34:24
20241019105805	2026-02-26 07:34:24
20241030150047	2026-02-26 07:34:24
20241108114728	2026-02-26 07:34:24
20241121104152	2026-02-26 07:34:24
20241130184212	2026-02-26 07:34:24
20241220035512	2026-02-26 07:34:24
20241220123912	2026-02-26 07:34:24
20241224161212	2026-02-26 07:34:24
20250107150512	2026-02-26 07:34:24
20250110162412	2026-02-26 07:34:24
20250123174212	2026-02-26 07:34:24
20250128220012	2026-02-26 07:34:24
20250506224012	2026-02-26 07:34:24
20250523164012	2026-02-26 07:34:24
20250714121412	2026-02-26 07:34:24
20250905041441	2026-02-26 07:34:24
20251103001201	2026-02-26 07:34:24
20251120212548	2026-02-26 07:34:24
20251120215549	2026-02-26 07:34:25
20260218120000	2026-03-05 12:46:26
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-02-26 06:09:36.434107
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-02-26 06:09:36.449526
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-02-26 06:09:36.453179
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-02-26 06:09:36.468722
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-02-26 06:09:36.47695
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-02-26 06:09:36.481448
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-02-26 06:09:36.485842
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-02-26 06:09:36.490137
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-02-26 06:09:36.494407
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-02-26 06:09:36.498519
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-02-26 06:09:36.5025
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-02-26 06:09:36.506805
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-02-26 06:09:36.511066
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-02-26 06:09:36.51525
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-02-26 06:09:36.519404
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-02-26 06:09:36.537975
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-02-26 06:09:36.542305
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-02-26 06:09:36.546212
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-02-26 06:09:36.550102
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-02-26 06:09:36.554527
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-02-26 06:09:36.558746
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-02-26 06:09:36.563583
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-02-26 06:09:36.574497
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-02-26 06:09:36.583457
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-02-26 06:09:36.587646
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-02-26 06:09:36.591467
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-02-26 06:09:36.595621
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-02-26 06:09:36.598815
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-02-26 06:09:36.602234
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-02-26 06:09:36.605726
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-02-26 06:09:36.609336
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-02-26 06:09:36.612796
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-02-26 06:09:36.616511
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-02-26 06:09:36.619999
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-02-26 06:09:36.623413
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-02-26 06:09:36.626863
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-02-26 06:09:36.630217
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-02-26 06:09:36.633544
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-02-26 06:09:36.637946
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-02-26 06:09:36.64563
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-02-26 06:09:36.649012
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-02-26 06:09:36.658134
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-02-26 06:09:36.661629
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-02-26 06:09:36.665074
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-02-26 06:09:36.668703
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-02-26 06:09:36.672971
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-02-26 06:09:36.681944
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-02-26 06:09:36.686232
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-02-26 06:09:36.689876
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-02-26 06:09:36.70356
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-02-26 06:09:36.709843
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-02-26 06:09:37.080958
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-02-26 06:09:37.082481
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-02-26 06:09:37.090697
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-02-26 06:09:37.09309
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-02-26 06:09:37.094675
56	fix-optimized-search-function	cb58526ebc23048049fd5bf2fd148d18b04a2073	2026-02-26 06:09:37.099069
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: -
--

COPY supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) FROM stdin;
20260303024959	{"-- 1. 로그 및 시스템 관제 (Logs to Audit)\nUPDATE NMENUINFO SET modern_route = '/admin/system/audit' WHERE modern_route = '/admin/system/logs' OR progrm_file_nm = 'SelectSysLogList';\nUPDATE NMENUINFO SET modern_route = '/admin/system/audit' WHERE progrm_file_nm IN ('SelectUserLogList', 'SelectTrsmrcvLogList', 'SelectWebLogList');\nUPDATE NMENUINFO SET modern_route = '/admin/system/audit' WHERE progrm_file_nm = 'SelectLoginLogList';\n\n-- 2. 보안 및 권한 (Security)\nUPDATE NMENUINFO SET modern_route = '/admin/security/dept-authority' WHERE progrm_file_nm = 'EgovDeptAuthorList';\nUPDATE NMENUINFO SET modern_route = '/admin/user/login-policy' WHERE progrm_file_nm = 'selectLoginPolicyList';\n\n-- 3. 스마트 일정/일지 (Smart Toolkit)\nUPDATE NMENUINFO SET modern_route = '/smart-toolkit/schedule' WHERE progrm_file_nm IN ('EgovIndvdlSchdulManageList', 'EgovAllSchdulManageList', 'selectLeaderSchdulList', 'getBatchSchdulList');\nUPDATE NMENUINFO SET modern_route = '/smart-toolkit/schedule/dept' WHERE progrm_file_nm = 'EgovDeptSchdulManageList';\nUPDATE NMENUINFO SET modern_route = '/smart-toolkit/dept-job' WHERE progrm_file_nm IN ('selectDeptJobList', 'selectDeptJobBxList');\nUPDATE NMENUINFO SET modern_route = '/smart-toolkit/work-report' WHERE progrm_file_nm IN ('selectWikMnthngReprtList', 'selectMemoTodoList', 'selectMemoReprtList');\n\n-- 4. 근태 및 복지 (USS)\nUPDATE NMENUINFO SET modern_route = '/uss/ion/vacation' WHERE modern_route = '/uss/ion/vacations' OR progrm_file_nm IN ('EgovVcatnManageList', 'EgovVcatnConfmList');\nUPDATE NMENUINFO SET modern_route = '/uss/ion/anniversaries' WHERE progrm_file_nm IN ('selectAnnvrsryManageList', 'selectAnnvrsryMainList');\nUPDATE NMENUINFO SET modern_route = '/uss/ion/duty' WHERE progrm_file_nm IN ('EgovBndtManageList', 'EgovBndtCeckManageList');\nUPDATE NMENUINFO SET modern_route = '/uss/ion/events' WHERE progrm_file_nm IN ('EgovEventCmpgnList', 'EgovEventReqstManageList', 'EgovEventRcrptManageList', 'selectEventRceptConfmList');\nUPDATE NMENUINFO SET modern_route = '/uss/ion/user-absences' WHERE progrm_file_nm = 'selectUserAbsnceListView';\nUPDATE NMENUINFO SET modern_route = '/admin/system/reward' WHERE progrm_file_nm IN ('selectRwardManageList', 'EgovRwardConfmList');\n\n-- 5. 공통 코드 (Common Code)\nUPDATE NMENUINFO SET modern_route = '/admin/system/common-code/groups' WHERE progrm_file_nm = 'EgovCcmCmmnClCodeList';\nUPDATE NMENUINFO SET modern_route = '/admin/system/common-code/codes' WHERE progrm_file_nm = 'EgovCcmCmmnCodeList';\nUPDATE NMENUINFO SET modern_route = '/admin/system/common-code/details' WHERE progrm_file_nm = 'EgovCcmCmmnDetailCodeList';\n\n-- 6. 지식 관리 (DAM)\nUPDATE NMENUINFO SET modern_route = '/admin/dam/personal' WHERE progrm_file_nm = 'EgovComDamPersonalList';\nUPDATE NMENUINFO SET modern_route = '/admin/dam/map' WHERE progrm_file_nm IN ('EgovComDamMapMaterialList', 'EgovComDamMapTeamList');\nUPDATE NMENUINFO SET modern_route = '/admin/dam/specialist' WHERE progrm_file_nm = 'EgovComDamSpecialistList';\nUPDATE NMENUINFO SET modern_route = '/admin/dam/management' WHERE progrm_file_nm = 'EgovComDamManagementList';\nUPDATE NMENUINFO SET modern_route = '/admin/dam/appraisal' WHERE progrm_file_nm = 'EgovComDamAppraisalList';\n\n-- 7. 설문 (Survey)\nUPDATE NMENUINFO SET modern_route = '/admin/survey/manage' WHERE progrm_file_nm IN ('EgovQustnrManageList', 'EgovQustnrTmplatManageList', 'EgovQustnrRespondManageList', 'EgovQustnrQestnManageList', 'EgovQustnrItemManageList');\nUPDATE NMENUINFO SET modern_route = '/survey/response' WHERE progrm_file_nm = 'EgovQustnrRespondInfoManageList';\n\n-- 8. 도움말 및 지원 (Help)\nUPDATE NMENUINFO SET modern_route = '/admin/help/faq' WHERE progrm_file_nm = 'FaqListInqire';\nUPDATE NMENUINFO SET modern_route = '/admin/help/qna' WHERE progrm_file_nm IN ('CnsltListInqire', 'CnsltAnswerListInqire');\n\n-- 9. 통계 (Stats)\nUPDATE NMENUINFO SET modern_route = '/admin/stats' WHERE progrm_file_nm = 'selectConectStats';\n\n-- 10. 커뮤니티 (Community)\nUPDATE NMENUINFO SET modern_route = '/admin/community' WHERE progrm_file_nm LIKE '%BBSMaster%' OR progrm_file_nm LIKE '%Cmmnty%';\n\n-- 11. 기타 (Others)\nUPDATE NMENUINFO SET modern_route = '/admin/user/manage' WHERE progrm_file_nm = 'EgovEntrprsMberManage';\nUPDATE NMENUINFO SET modern_route = '/cop/scp/selectScrapList' WHERE progrm_file_nm = 'selectScrapList';\n"}	fix_all_modern_routes_v3	lkindo@gmail.com	\N	\N
20260306124458	{"ALTER TABLE public.norgnztinfo \nADD COLUMN frst_regist_pnttm TIMESTAMP,\nADD COLUMN frst_register_id VARCHAR(20),\nADD COLUMN last_updt_pnttm TIMESTAMP,\nADD COLUMN last_updusr_id VARCHAR(20);"}	add_auditing_columns_to_norgnztinfo	lkindo@gmail.com	\N	\N
20260310000836	{"DROP TABLE IF EXISTS ebt.czip CASCADE;\nDROP TABLE IF EXISTS public.czip CASCADE;\nDROP TABLE IF EXISTS public.rdnmadrzip CASCADE;\nDROP TABLE IF EXISTS ebt.nczip CASCADE;\nDROP TABLE IF EXISTS public.nczip CASCADE;"}	remove_zip_tables	lkindo@gmail.com	\N	\N
20260310001901	{"DROP SCHEMA IF EXISTS ebt CASCADE;"}	drop_ebt_schema	lkindo@gmail.com	\N	\N
20260313011823	{"CREATE TABLE NEVENTINFO\n(\n    EVENT_ID              CHAR(20) NOT NULL,\n    BSNS_YEAR             CHAR(4) NULL,\n    BSNS_CODE             VARCHAR(2) NULL,\n    EVENT_CN              VARCHAR(1000) NULL,\n    EVENT_SVC_BGNDE       CHAR(20) NULL,\n    SVC_USE_NMPR_CO       NUMERIC(10) NULL,\n    CHARGER_NM            VARCHAR(50) NULL,\n    PRPARETG_CN           VARCHAR(2500) NULL,\n    FRST_REGIST_PNTTM     TIMESTAMP NULL,\n    FRST_REGISTER_ID      VARCHAR(20) NULL,\n    LAST_UPDT_PNTTM       TIMESTAMP NULL,\n    LAST_UPDUSR_ID        VARCHAR(20) NULL,\n    EVENT_SVC_ENDDE       CHAR(20) NULL,\n    EVENT_TY_CODE         CHAR(1) NULL,\n    EVENT_CONFM_AT        CHAR(1) NULL,\n    EVENT_CONFM_DE        CHAR(20) NULL,\n    PRIMARY KEY (EVENT_ID)\n);\n\nCREATE TABLE NEXTRLHRINFO\n(\n    EVENT_ID              CHAR(20) NOT NULL,\n    EXTRL_HR_ID           CHAR(20) NOT NULL,\n    SEXDSTN_CODE          CHAR(1) NULL,\n    EXTRL_HR_NM           VARCHAR(60) NULL,\n    OCCP_TY_CODE          CHAR(1) NULL,\n    PSITN_INSTT_NM        VARCHAR(100) NULL,\n    BRTHDY                CHAR(20) NULL,\n    AREA_NO               VARCHAR(4) NULL,\n    MIDDLE_TELNO          VARCHAR(4) NULL,\n    END_TELNO             VARCHAR(4) NULL,\n    EMAIL_ADRES           VARCHAR(50) NULL,\n    FRST_REGIST_PNTTM     TIMESTAMP NULL,\n    FRST_REGISTER_ID      VARCHAR(20) NULL,\n    LAST_UPDT_PNTTM       TIMESTAMP NULL,\n    LAST_UPDUSR_ID        VARCHAR(20) NULL,\n    PRIMARY KEY (EVENT_ID, EXTRL_HR_ID),\n    FOREIGN KEY (EVENT_ID) REFERENCES NEVENTINFO(EVENT_ID)\n);\n\nCREATE TABLE NRWARDMANAGE\n(\n    RWARD_ID              CHAR(20) NOT NULL,\n    RWARDWNR_ID           VARCHAR(20) NOT NULL,\n    RWARD_CODE            CHAR(2) NOT NULL,\n    RWARD_DE              CHAR(20) NOT NULL,\n    RWARD_NM              VARCHAR(255) NOT NULL,\n    PBLEN_CN              VARCHAR(1000) NULL,\n    SANCTNER_ID           VARCHAR(20) NOT NULL,\n    CONFM_AT              CHAR(1) NULL,\n    SANCTN_DT             TIMESTAMP NULL,\n    RETURN_RESN           VARCHAR(1000) NULL,\n    ATCH_FILE_ID          CHAR(20) NULL,\n    INFRML_SANCTN_ID      CHAR(20) NULL,\n    FRST_REGISTER_ID      VARCHAR(20) NULL,\n    FRST_REGIST_PNTTM     TIMESTAMP NULL,\n    LAST_UPDUSR_ID        VARCHAR(20) NULL,\n    LAST_UPDT_PNTTM       TIMESTAMP NULL,\n    PRIMARY KEY (RWARD_ID)\n);\n\nCOMMENT ON TABLE NEVENTINFO IS '행사정보';\nCOMMENT ON TABLE NEXTRLHRINFO IS '외부인사정보';\nCOMMENT ON TABLE NRWARDMANAGE IS '포상관리';\n"}	add_hr_and_reward_tables	lkindo@gmail.com	\N	\N
20260318011253	{"-- Cleanup unimplemented menus and programs marked for deletion\n\n-- 1. Delete authorities\nDELETE FROM nmenucreatdtls \nWHERE menu_no IN (\n    SELECT menu_no FROM nmenuinfo \n    WHERE modern_route IN (\n        '/admin/user/cpyrht-prtc-policy',\n        '/admin/user/word-dicary',\n        '/admin/uss/olh/admin-word',\n        '/admin/system/programs/history',\n        '/admin/system/unity-link',\n        '/admin/uss/ion/login-image',\n        '/admin/uss/ion/rss',\n        '/admin/uss/ion/site',\n        '/admin/uss/ion/twitter',\n        '/admin/uss/ion/wiki'\n    )\n);\n\n-- 2. Delete menus\nDELETE FROM nmenuinfo \nWHERE modern_route IN (\n    '/admin/user/cpyrht-prtc-policy',\n    '/admin/user/word-dicary',\n    '/admin/uss/olh/admin-word',\n    '/admin/system/programs/history',\n    '/admin/system/unity-link',\n    '/admin/uss/ion/login-image',\n    '/admin/uss/ion/rss',\n    '/admin/uss/ion/site',\n    '/admin/uss/ion/twitter',\n    '/admin/uss/ion/wiki'\n);\n\n-- 3. Delete programs that are not used by any other menu\nDELETE FROM nprogrmlist \nWHERE progrm_file_nm NOT IN (SELECT DISTINCT progrm_file_nm FROM nmenuinfo WHERE progrm_file_nm IS NOT NULL)\nAND progrm_file_nm IN (\n    'WordDicaryListInqire',\n    'listAdministrationWord',\n    'listAdministrationWordManage',\n    'listWikiBookmark',\n    'selectTwitterMain',\n    'listRssTagService',\n    'listUnityLink',\n    'listRssTagManage',\n    'SiteListInqire',\n    'CpyrhtPrtcPolicyListInqire',\n    'selectLoginScrinImageList',\n    'EgovProgramChgHstListSelect'\n);\n\n-- 4. Delete feature-specific tables if they exist (only for features on deletion list)\nDROP TABLE IF EXISTS NSITEINFO CASCADE;\nDROP TABLE IF EXISTS NUNITYLINK CASCADE;\n"}	cleanup_unimplemented_menus_v1	lkindo@gmail.com	\N	\N
20260318053551	{"-- 1. 현대화된 폴더 구조에 맞게 메뉴 경로 최적화\nUPDATE nmenuinfo \nSET modern_route = '/admin/survey/polls/manage' \nWHERE menu_no = 5270000; -- 온라인poll관리\n\n-- 2. 중복되거나 비어있는 경로 보정 (필요한 경우 추가)\n-- 현재로서는 온라인poll관리 외에는 대부분의 modern_route가 실제 구현된 페이지(또는 최상위 핸들러)와 일치함.\n\n-- 3. '삭제대상'으로 분류된 메뉴들 최종 제거 (데이터만 남아있을 경우 대비)\nDELETE FROM nmenuinfo \nWHERE modern_route IN (\n    '/admin/user/cpyrht-prtc-policy',\n    '/admin/user/word-dicary',\n    '/admin/uss/olh/admin-word',\n    '/admin/system/programs/history',\n    '/admin/system/unity-link',\n    '/admin/uss/ion/login-image',\n    '/admin/uss/ion/rss',\n    '/admin/uss/ion/site',\n    '/admin/uss/ion/twitter',\n    '/admin/uss/ion/wiki'\n);\n"}	optimize_menu_routes_and_icons	lkindo@gmail.com	\N	\N
20260407094754	{"CREATE TABLE IF NOT EXISTS public.npolicy (\n    policy_type VARCHAR(30) PRIMARY KEY,\n    title VARCHAR(255) NOT NULL,\n    content TEXT NOT NULL,\n    frst_regist_pnttm TIMESTAMP WITHOUT TIME ZONE,\n    frst_register_id VARCHAR(20),\n    last_updt_pnttm TIMESTAMP WITHOUT TIME ZONE,\n    last_updusr_id VARCHAR(20)\n);\n\nCOMMENT ON TABLE public.npolicy IS '시스템 정책(저작권, 개인정보처리방침 등)';\nCOMMENT ON COLUMN public.npolicy.policy_type IS '정책 유형 (COPYRIGHT, PRIVACY 등)';\nCOMMENT ON COLUMN public.npolicy.title IS '제목';\nCOMMENT ON COLUMN public.npolicy.content IS '내용';\n\n-- 초기 데이터 삽입 (테스트 및 초기 구동용)\nINSERT INTO public.npolicy (policy_type, title, content, frst_regist_pnttm, frst_register_id)\nVALUES \n('COPYRIGHT', '저작권 정책', '본 시스템의 모든 저작권은 ...', CURRENT_TIMESTAMP, 'SYSTEM'),\n('PRIVACY', '개인정보처리방침', '본 시스템은 사용자의 개인정보를 ...', CURRENT_TIMESTAMP, 'SYSTEM')\nON CONFLICT (policy_type) DO NOTHING;\n"}	create_npolicy_table	lkindo@gmail.com	\N	\N
20260410142000	{"ALTER TABLE public.nbbs ADD COLUMN IF NOT EXISTS event_date timestamp;\nALTER TABLE public.nbbs ADD COLUMN IF NOT EXISTS qna_status varchar(10) DEFAULT 'OPEN';\nALTER TABLE public.nbbs ADD COLUMN IF NOT EXISTS qna_category varchar(50);\n\nCOMMENT ON COLUMN public.nbbs.event_date IS '이벤트/일정 날짜 (캘린더 템플릿용)';\nCOMMENT ON COLUMN public.nbbs.qna_status IS '질문 해결 상태 (OPEN, SOLVED) (Q&A 템플릿용)';\nCOMMENT ON COLUMN public.nbbs.qna_category IS '질문 카테고리 (Q&A 템플릿용)';"}	add_board_template_columns	lkindo@gmail.com	\N	\N
20260410145433	{"ALTER TABLE nknowledge ADD COLUMN status_cd VARCHAR(20) DEFAULT 'OPEN';\nALTER TABLE nknowledge ADD COLUMN category_cd VARCHAR(50);\nALTER TABLE nknowledge ADD COLUMN inqire_co INTEGER DEFAULT 0;\nCOMMENT ON COLUMN nknowledge.status_cd IS '상태 코드 (OPEN, SOLVED, DRAFT, PUBLISHED 등)';\nCOMMENT ON COLUMN nknowledge.category_cd IS '분류 코드 (기술, 인사, 복지 등)';\nCOMMENT ON COLUMN nknowledge.inqire_co IS '조회수';"}	add_status_and_inquiry_to_knowledge	lkindo@gmail.com	\N	\N
20260410150611	{"DROP TABLE IF EXISTS nknowledge CASCADE;"}	remove_redundant_knowledge_table	lkindo@gmail.com	\N	\N
20260412065532	{"CREATE SEQUENCE IF NOT EXISTS public.ntt_id_seq START WITH 1000 INCREMENT BY 1;"}	create_bbs_sequences	lkindo@gmail.com	\N	\N
20260419143924	{"-- 게시판 본문 길이 제한 해제 (255 -> TEXT)\nALTER TABLE nbbs ALTER COLUMN ntt_cn TYPE TEXT;\n\n-- 게시판 마스터 정보 필드 보강 (필요시)\nCOMMENT ON COLUMN nbbs.ntt_cn IS '게시물 내용 (제한 없음)';\n"}	fix_nbbs_content_length	lkindo@gmail.com	\N	\N
20260419145156	{"ALTER TABLE public.ncomment ALTER COLUMN answer TYPE TEXT;\nCOMMENT ON COLUMN public.ncomment.answer IS '댓글 내용 (용량 확장)';"}	expand_comment_length	lkindo@gmail.com	\N	\N
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: file_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_group_id_seq', 1, false);


--
-- Name: file_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_item_id_seq', 1, false);


--
-- Name: ncalrestde_restde_no_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ncalrestde_restde_no_seq', 1, false);


--
-- Name: ntt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ntt_id_seq', 1044, true);


--
-- Name: revinfo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.revinfo_seq', 5551, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: cadministcode cadministcode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cadministcode
    ADD CONSTRAINT cadministcode_pkey PRIMARY KEY (administ_zone_se, administ_zone_code);


--
-- Name: cadministcoderecptnlog cadministcoderecptnlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cadministcoderecptnlog
    ADD CONSTRAINT cadministcoderecptnlog_pkey PRIMARY KEY (occrrnc_de, administ_zone_se, administ_zone_code, opert_sn);


--
-- Name: ccmmnclcode ccmmnclcode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccmmnclcode
    ADD CONSTRAINT ccmmnclcode_pkey PRIMARY KEY (cl_code);


--
-- Name: ccmmncode ccmmncode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccmmncode
    ADD CONSTRAINT ccmmncode_pkey PRIMARY KEY (code_id);


--
-- Name: ccmmndetailcode ccmmndetailcode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccmmndetailcode
    ADD CONSTRAINT ccmmndetailcode_pkey PRIMARY KEY (code_id, code);


--
-- Name: comtnindvdlpge comtnindvdlpge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comtnindvdlpge
    ADD CONSTRAINT comtnindvdlpge_pkey PRIMARY KEY (cntnts_id);


--
-- Name: comtnuserabsence comtnuserabsence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comtnuserabsence
    ADD CONSTRAINT comtnuserabsence_pkey PRIMARY KEY (emplyr_id);


--
-- Name: ecopseq ecopseq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecopseq
    ADD CONSTRAINT ecopseq_pkey PRIMARY KEY (table_name);


--
-- Name: file_group file_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_group
    ADD CONSTRAINT file_group_pkey PRIMARY KEY (id);


--
-- Name: file_item file_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_item
    ADD CONSTRAINT file_item_pkey PRIMARY KEY (id);


--
-- Name: hconfmhistory hconfmhistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hconfmhistory
    ADD CONSTRAINT hconfmhistory_pkey PRIMARY KEY (confm_no);


--
-- Name: hdbmntrngloginfo hdbmntrngloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hdbmntrngloginfo
    ADD CONSTRAINT hdbmntrngloginfo_pkey PRIMARY KEY (log_id);


--
-- Name: hemaildsptchmanage hemaildsptchmanage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hemaildsptchmanage
    ADD CONSTRAINT hemaildsptchmanage_pkey PRIMARY KEY (mssage_id);


--
-- Name: hemplyrinfochangedtls hemplyrinfochangedtls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hemplyrinfochangedtls
    ADD CONSTRAINT hemplyrinfochangedtls_pkey PRIMARY KEY (emplyr_id, change_de);


--
-- Name: hhttpmonloginfo hhttpmonloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hhttpmonloginfo
    ADD CONSTRAINT hhttpmonloginfo_pkey PRIMARY KEY (sys_id, log_id);


--
-- Name: htrsmrcvmntrngloginfo htrsmrcvmntrngloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.htrsmrcvmntrngloginfo
    ADD CONSTRAINT htrsmrcvmntrngloginfo_pkey PRIMARY KEY (log_id);


--
-- Name: ids ids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ids
    ADD CONSTRAINT ids_pkey PRIMARY KEY (table_name);


--
-- Name: imgtemp imgtemp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imgtemp
    ADD CONSTRAINT imgtemp_pkey PRIMARY KEY (orgnzt_code, erncsl_se);


--
-- Name: j_attachfile j_attachfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.j_attachfile
    ADD CONSTRAINT j_attachfile_pkey PRIMARY KEY (file_id, file_seq);


--
-- Name: n_user_notification n_user_notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.n_user_notification
    ADD CONSTRAINT n_user_notification_pkey PRIMARY KEY (ntcn_no);


--
-- Name: nadbk nadbk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nadbk
    ADD CONSTRAINT nadbk_pkey PRIMARY KEY (adbk_constnt_id, adbk_id);


--
-- Name: nadbkmanage nadbkmanage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nadbkmanage
    ADD CONSTRAINT nadbkmanage_pkey PRIMARY KEY (adbk_id);


--
-- Name: nanswer nanswer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nanswer
    ADD CONSTRAINT nanswer_pkey PRIMARY KEY (ntt_id, bbs_id, answer_no);


--
-- Name: nauthorgroupinfo nauthorgroupinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nauthorgroupinfo
    ADD CONSTRAINT nauthorgroupinfo_pkey PRIMARY KEY (group_id);


--
-- Name: nauthorinfo nauthorinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nauthorinfo
    ADD CONSTRAINT nauthorinfo_pkey PRIMARY KEY (author_code);


--
-- Name: nauthorrolerelate nauthorrolerelate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nauthorrolerelate
    ADD CONSTRAINT nauthorrolerelate_pkey PRIMARY KEY (author_code, role_code);


--
-- Name: nbackupschduldfk nbackupschduldfk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbackupschduldfk
    ADD CONSTRAINT nbackupschduldfk_pkey PRIMARY KEY (backup_opert_id, execut_schdul_dfk_se);


--
-- Name: nbanner nbanner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbanner
    ADD CONSTRAINT nbanner_pkey PRIMARY KEY (banner_id);


--
-- Name: nbbs nbbs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbbs
    ADD CONSTRAINT nbbs_pkey PRIMARY KEY (ntt_id, bbs_id);


--
-- Name: nbbsmaster nbbsmaster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbbsmaster
    ADD CONSTRAINT nbbsmaster_pkey PRIMARY KEY (bbs_id);


--
-- Name: nbbsmasteroptn nbbsmasteroptn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbbsmasteroptn
    ADD CONSTRAINT nbbsmasteroptn_pkey PRIMARY KEY (bbs_id);


--
-- Name: nbbsuse nbbsuse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbbsuse
    ADD CONSTRAINT nbbsuse_pkey PRIMARY KEY (bbs_id, trget_id);


--
-- Name: nbkmkmenumanageresult nbkmkmenumanageresult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbkmkmenumanageresult
    ADD CONSTRAINT nbkmkmenumanageresult_pkey PRIMARY KEY (menu_id, emplyr_id);


--
-- Name: nblog nblog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nblog
    ADD CONSTRAINT nblog_pkey PRIMARY KEY (blog_id);


--
-- Name: nbloguser nbloguser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbloguser
    ADD CONSTRAINT nbloguser_pkey PRIMARY KEY (blog_id, emplyr_id);


--
-- Name: ncalrestde ncalrestde_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncalrestde
    ADD CONSTRAINT ncalrestde_pkey PRIMARY KEY (restde_no);


--
-- Name: nclub nclub_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nclub
    ADD CONSTRAINT nclub_pkey PRIMARY KEY (clb_id, cmmnty_id);


--
-- Name: nclubuser nclubuser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nclubuser
    ADD CONSTRAINT nclubuser_pkey PRIMARY KEY (clb_id, cmmnty_id, emplyr_id);


--
-- Name: ncmmnty ncmmnty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncmmnty
    ADD CONSTRAINT ncmmnty_pkey PRIMARY KEY (cmmnty_id);


--
-- Name: ncmmntyuser ncmmntyuser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncmmntyuser
    ADD CONSTRAINT ncmmntyuser_pkey PRIMARY KEY (cmmnty_id, emplyr_id);


--
-- Name: ncnsltlist ncnsltlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncnsltlist
    ADD CONSTRAINT ncnsltlist_pkey PRIMARY KEY (cnslt_id);


--
-- Name: ncnsltmanage ncnsltmanage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncnsltmanage
    ADD CONSTRAINT ncnsltmanage_pkey PRIMARY KEY (cnslt_id);


--
-- Name: ncntcmessage ncntcmessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncntcmessage
    ADD CONSTRAINT ncntcmessage_pkey PRIMARY KEY (cntc_mssage_id);


--
-- Name: ncntcmessageitem ncntcmessageitem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncntcmessageitem
    ADD CONSTRAINT ncntcmessageitem_pkey PRIMARY KEY (cntc_mssage_id, iem_id);


--
-- Name: ncntcservice ncntcservice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncntcservice
    ADD CONSTRAINT ncntcservice_pkey PRIMARY KEY (instt_id, sys_id, svc_id);


--
-- Name: ncntntslist ncntntslist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncntntslist
    ADD CONSTRAINT ncntntslist_pkey PRIMARY KEY (cntnts_id, emplyr_id);


--
-- Name: ncomment ncomment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncomment
    ADD CONSTRAINT ncomment_pkey PRIMARY KEY (ntt_id, bbs_id, answer_no);


--
-- Name: ndeptjob ndeptjob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndeptjob
    ADD CONSTRAINT ndeptjob_pkey PRIMARY KEY (dept_job_id);


--
-- Name: ndeptjobbx ndeptjobbx_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndeptjobbx
    ADD CONSTRAINT ndeptjobbx_pkey PRIMARY KEY (dept_jobbx_id);


--
-- Name: ndiaryinfo ndiaryinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndiaryinfo
    ADD CONSTRAINT ndiaryinfo_pkey PRIMARY KEY (schdul_id, diary_id);


--
-- Name: ndtausestats ndtausestats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndtausestats
    ADD CONSTRAINT ndtausestats_pkey PRIMARY KEY (dta_use_stats_id);


--
-- Name: nemplyrinfo_aud nemplyrinfo_aud_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nemplyrinfo_aud
    ADD CONSTRAINT nemplyrinfo_aud_pkey PRIMARY KEY (emplyr_id, rev);


--
-- Name: nemplyrinfo nemplyrinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nemplyrinfo
    ADD CONSTRAINT nemplyrinfo_pkey PRIMARY KEY (emplyr_id);


--
-- Name: nemplyrscrtyestbs nemplyrscrtyestbs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nemplyrscrtyestbs
    ADD CONSTRAINT nemplyrscrtyestbs_pkey PRIMARY KEY (scrty_dtrmn_trget_id);


--
-- Name: nentrprsmber nentrprsmber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nentrprsmber
    ADD CONSTRAINT nentrprsmber_pkey PRIMARY KEY (entrprs_mber_id);


--
-- Name: neventinfo neventinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neventinfo
    ADD CONSTRAINT neventinfo_pkey PRIMARY KEY (event_id);


--
-- Name: nextrlhrinfo nextrlhrinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nextrlhrinfo
    ADD CONSTRAINT nextrlhrinfo_pkey PRIMARY KEY (event_id, extrl_hr_id);


--
-- Name: nfaqinfo nfaqinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfaqinfo
    ADD CONSTRAINT nfaqinfo_pkey PRIMARY KEY (faq_id);


--
-- Name: nfile nfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfile
    ADD CONSTRAINT nfile_pkey PRIMARY KEY (atch_file_id);


--
-- Name: nfiledetail nfiledetail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfiledetail
    ADD CONSTRAINT nfiledetail_pkey PRIMARY KEY (atch_file_id, file_sn);


--
-- Name: nfilesysmntrngloginfo nfilesysmntrngloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfilesysmntrngloginfo
    ADD CONSTRAINT nfilesysmntrngloginfo_pkey PRIMARY KEY (file_sys_id, log_id);


--
-- Name: nfxtrsmanage nfxtrsmanage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfxtrsmanage
    ADD CONSTRAINT nfxtrsmanage_pkey PRIMARY KEY (fxtrs_code);


--
-- Name: ngnrlmber ngnrlmber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ngnrlmber
    ADD CONSTRAINT ngnrlmber_pkey PRIMARY KEY (mber_id);


--
-- Name: nhpcminfo nhpcminfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhpcminfo
    ADD CONSTRAINT nhpcminfo_pkey PRIMARY KEY (hpcm_id);


--
-- Name: nindvdlinfopolicy nindvdlinfopolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nindvdlinfopolicy
    ADD CONSTRAINT nindvdlinfopolicy_pkey PRIMARY KEY (indvdl_info_policy_id);


--
-- Name: nindvdlpgecntnts nindvdlpgecntnts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nindvdlpgecntnts
    ADD CONSTRAINT nindvdlpgecntnts_pkey PRIMARY KEY (cntnts_id);


--
-- Name: nindvdlpgeestbs nindvdlpgeestbs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nindvdlpgeestbs
    ADD CONSTRAINT nindvdlpgeestbs_pkey PRIMARY KEY (emplyr_id);


--
-- Name: ninfrmlsanctn ninfrmlsanctn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ninfrmlsanctn
    ADD CONSTRAINT ninfrmlsanctn_pkey PRIMARY KEY (infrml_sanctn_id);


--
-- Name: ninsttcode ninsttcode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ninsttcode
    ADD CONSTRAINT ninsttcode_pkey PRIMARY KEY (instt_code);


--
-- Name: ninsttcoderecptnlog ninsttcoderecptnlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ninsttcoderecptnlog
    ADD CONSTRAINT ninsttcoderecptnlog_pkey PRIMARY KEY (occrrnc_de, instt_code, opert_sn);


--
-- Name: nintnetsvc nintnetsvc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nintnetsvc
    ADD CONSTRAINT nintnetsvc_pkey PRIMARY KEY (intnet_svc_id);


--
-- Name: nleaderschdul nleaderschdul_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nleaderschdul
    ADD CONSTRAINT nleaderschdul_pkey PRIMARY KEY (schdul_id);


--
-- Name: nleaderschdulde nleaderschdulde_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nleaderschdulde
    ADD CONSTRAINT nleaderschdulde_pkey PRIMARY KEY (schdul_id, schdul_de);


--
-- Name: nleadersttus nleadersttus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nleadersttus
    ADD CONSTRAINT nleadersttus_pkey PRIMARY KEY (leader_id);


--
-- Name: nloginlog nloginlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nloginlog
    ADD CONSTRAINT nloginlog_pkey PRIMARY KEY (log_id);


--
-- Name: nloginpolicy nloginpolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nloginpolicy
    ADD CONSTRAINT nloginpolicy_pkey PRIMARY KEY (emplyr_id);


--
-- Name: nmainimage nmainimage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmainimage
    ADD CONSTRAINT nmainimage_pkey PRIMARY KEY (image_id);


--
-- Name: nmemoreprt nmemoreprt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmemoreprt
    ADD CONSTRAINT nmemoreprt_pkey PRIMARY KEY (reprt_id);


--
-- Name: nmemotodo nmemotodo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmemotodo
    ADD CONSTRAINT nmemotodo_pkey PRIMARY KEY (todo_id);


--
-- Name: nmenucreatdtls nmenucreatdtls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmenucreatdtls
    ADD CONSTRAINT nmenucreatdtls_pkey PRIMARY KEY (menu_no, author_code);


--
-- Name: nmenuinfo nmenuinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmenuinfo
    ADD CONSTRAINT nmenuinfo_pkey PRIMARY KEY (menu_no);


--
-- Name: nmtgplacefxtrs nmtgplacefxtrs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmtgplacefxtrs
    ADD CONSTRAINT nmtgplacefxtrs_pkey PRIMARY KEY (mtgrum_id, fxtrs_code);


--
-- Name: nnote nnote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nnote
    ADD CONSTRAINT nnote_pkey PRIMARY KEY (note_id);


--
-- Name: nnoterecptn nnoterecptn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nnoterecptn
    ADD CONSTRAINT nnoterecptn_pkey PRIMARY KEY (note_id, note_trnsmit_id, note_recptn_id);


--
-- Name: nnotetrnsmit nnotetrnsmit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nnotetrnsmit
    ADD CONSTRAINT nnotetrnsmit_pkey PRIMARY KEY (note_id, note_trnsmit_id);


--
-- Name: nntfcinfo nntfcinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nntfcinfo
    ADD CONSTRAINT nntfcinfo_pkey PRIMARY KEY (ntcn_no);


--
-- Name: nnttstats nnttstats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nnttstats
    ADD CONSTRAINT nnttstats_pkey PRIMARY KEY (stats_id);


--
-- Name: nntwrkinfo nntwrkinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nntwrkinfo
    ADD CONSTRAINT nntwrkinfo_pkey PRIMARY KEY (ntwrk_id);


--
-- Name: nntwrksvcmntrngloginfo nntwrksvcmntrngloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nntwrksvcmntrngloginfo
    ADD CONSTRAINT nntwrksvcmntrngloginfo_pkey PRIMARY KEY (sys_ip, sys_port, log_id);


--
-- Name: nonlinemanual nonlinemanual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlinemanual
    ADD CONSTRAINT nonlinemanual_pkey PRIMARY KEY (online_mnl_id);


--
-- Name: nonlinepolliem nonlinepolliem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlinepolliem
    ADD CONSTRAINT nonlinepolliem_pkey PRIMARY KEY (poll_id, poll_iem_id);


--
-- Name: nonlinepollmanage nonlinepollmanage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlinepollmanage
    ADD CONSTRAINT nonlinepollmanage_pkey PRIMARY KEY (poll_id);


--
-- Name: nonlinepollresult nonlinepollresult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlinepollresult
    ADD CONSTRAINT nonlinepollresult_pkey PRIMARY KEY (poll_result_id, poll_iem_id, poll_id);


--
-- Name: norgnztinfo norgnztinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.norgnztinfo
    ADD CONSTRAINT norgnztinfo_pkey PRIMARY KEY (orgnzt_id);


--
-- Name: npolicy npolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.npolicy
    ADD CONSTRAINT npolicy_pkey PRIMARY KEY (policy_type);


--
-- Name: npopupmanage npopupmanage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.npopupmanage
    ADD CONSTRAINT npopupmanage_pkey PRIMARY KEY (popup_id);


--
-- Name: nprivacylog nprivacylog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nprivacylog
    ADD CONSTRAINT nprivacylog_pkey PRIMARY KEY (requst_id);


--
-- Name: nprocessmonloginfo nprocessmonloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nprocessmonloginfo
    ADD CONSTRAINT nprocessmonloginfo_pkey PRIMARY KEY (procs_id, log_id);


--
-- Name: nprogrmlist nprogrmlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nprogrmlist
    ADD CONSTRAINT nprogrmlist_pkey PRIMARY KEY (progrm_file_nm);


--
-- Name: nproxyinfo nproxyinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nproxyinfo
    ADD CONSTRAINT nproxyinfo_pkey PRIMARY KEY (proxy_id);


--
-- Name: nproxyloginfo nproxyloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nproxyloginfo
    ADD CONSTRAINT nproxyloginfo_pkey PRIMARY KEY (proxy_id, log_id);


--
-- Name: nqainfo nqainfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqainfo
    ADD CONSTRAINT nqainfo_pkey PRIMARY KEY (qa_id);


--
-- Name: nqestnrinfo nqestnrinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqestnrinfo
    ADD CONSTRAINT nqestnrinfo_pkey PRIMARY KEY (qustnr_tmplat_id, qestnr_id);


--
-- Name: nqustnriem nqustnriem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnriem
    ADD CONSTRAINT nqustnriem_pkey PRIMARY KEY (qustnr_tmplat_id, qestnr_id, qustnr_qesitm_id, qustnr_iem_id);


--
-- Name: nqustnrqesitm nqustnrqesitm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnrqesitm
    ADD CONSTRAINT nqustnrqesitm_pkey PRIMARY KEY (qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id);


--
-- Name: nqustnrrespondinfo nqustnrrespondinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnrrespondinfo
    ADD CONSTRAINT nqustnrrespondinfo_pkey PRIMARY KEY (qustnr_tmplat_id, qestnr_id, qustnr_respond_id);


--
-- Name: nqustnrrspnsresult nqustnrrspnsresult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnrrspnsresult
    ADD CONSTRAINT nqustnrrspnsresult_pkey PRIMARY KEY (qustnr_rspns_result_id, qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id);


--
-- Name: nqustnrtmplat nqustnrtmplat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnrtmplat
    ADD CONSTRAINT nqustnrtmplat_pkey PRIMARY KEY (qustnr_tmplat_id);


--
-- Name: nrefresh_token nrefresh_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nrefresh_token
    ADD CONSTRAINT nrefresh_token_pkey PRIMARY KEY (user_id);


--
-- Name: nrefresh_token nrefresh_token_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nrefresh_token
    ADD CONSTRAINT nrefresh_token_token_key UNIQUE (token);


--
-- Name: nreprtstats nreprtstats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nreprtstats
    ADD CONSTRAINT nreprtstats_pkey PRIMARY KEY (reprt_id);


--
-- Name: nroleinfo nroleinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nroleinfo
    ADD CONSTRAINT nroleinfo_pkey PRIMARY KEY (role_code);


--
-- Name: nroles_hierarchy nroles_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nroles_hierarchy
    ADD CONSTRAINT nroles_hierarchy_pkey PRIMARY KEY (parnts_role, chldrn_role);


--
-- Name: nrwardmanage nrwardmanage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nrwardmanage
    ADD CONSTRAINT nrwardmanage_pkey PRIMARY KEY (rward_id);


--
-- Name: nschdulinfo nschdulinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nschdulinfo
    ADD CONSTRAINT nschdulinfo_pkey PRIMARY KEY (schdul_id);


--
-- Name: nscrap nscrap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nscrap
    ADD CONSTRAINT nscrap_pkey PRIMARY KEY (scrap_id);


--
-- Name: nservereqpmninfo nservereqpmninfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nservereqpmninfo
    ADD CONSTRAINT nservereqpmninfo_pkey PRIMARY KEY (server_eqpmn_id);


--
-- Name: nserverinfo nserverinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nserverinfo
    ADD CONSTRAINT nserverinfo_pkey PRIMARY KEY (server_id);


--
-- Name: nserverresrceloginfo nserverresrceloginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nserverresrceloginfo
    ADD CONSTRAINT nserverresrceloginfo_pkey PRIMARY KEY (server_eqpmn_id, server_id, log_id);


--
-- Name: nsitemap nsitemap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsitemap
    ADD CONSTRAINT nsitemap_pkey PRIMARY KEY (mapng_creat_id);


--
-- Name: nsms nsms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsms
    ADD CONSTRAINT nsms_pkey PRIMARY KEY (sms_id);


--
-- Name: nsmsrecptn nsmsrecptn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsmsrecptn
    ADD CONSTRAINT nsmsrecptn_pkey PRIMARY KEY (sms_id, recptn_telno);


--
-- Name: nstsfdg nstsfdg_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nstsfdg
    ADD CONSTRAINT nstsfdg_pkey PRIMARY KEY (stsfdg_no);


--
-- Name: nsynchrnserverinfo nsynchrnserverinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsynchrnserverinfo
    ADD CONSTRAINT nsynchrnserverinfo_pkey PRIMARY KEY (server_id);


--
-- Name: nsyslog nsyslog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsyslog
    ADD CONSTRAINT nsyslog_pkey PRIMARY KEY (requst_id);


--
-- Name: ntmplatinfo ntmplatinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ntmplatinfo
    ADD CONSTRAINT ntmplatinfo_pkey PRIMARY KEY (tmplat_id);


--
-- Name: ntroblinfo ntroblinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ntroblinfo
    ADD CONSTRAINT ntroblinfo_pkey PRIMARY KEY (trobl_id);


--
-- Name: ntrsmrcvlog ntrsmrcvlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ntrsmrcvlog
    ADD CONSTRAINT ntrsmrcvlog_pkey PRIMARY KEY (requst_id);


--
-- Name: ntrsmrcvmntrng ntrsmrcvmntrng_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ntrsmrcvmntrng
    ADD CONSTRAINT ntrsmrcvmntrng_pkey PRIMARY KEY (cntc_id);


--
-- Name: nuserabsnce nuserabsnce_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nuserabsnce
    ADD CONSTRAINT nuserabsnce_pkey PRIMARY KEY (emplyr_id);


--
-- Name: nuserlog nuserlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nuserlog
    ADD CONSTRAINT nuserlog_pkey PRIMARY KEY (occrrnc_de, rqester_id, svc_nm, method_nm);


--
-- Name: nweblog nweblog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nweblog
    ADD CONSTRAINT nweblog_pkey PRIMARY KEY (requst_id);


--
-- Name: revinfo revinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revinfo
    ADD CONSTRAINT revinfo_pkey PRIMARY KEY (rev);


--
-- Name: sbbssummary sbbssummary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sbbssummary
    ADD CONSTRAINT sbbssummary_pkey PRIMARY KEY (occrrnc_de, stats_se, detail_stats_se);


--
-- Name: ssyslogsummary ssyslogsummary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ssyslogsummary
    ADD CONSTRAINT ssyslogsummary_pkey PRIMARY KEY (occrrnc_de, svc_nm, method_nm);


--
-- Name: strsmrcvlogsummary strsmrcvlogsummary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strsmrcvlogsummary
    ADD CONSTRAINT strsmrcvlogsummary_pkey PRIMARY KEY (occrrnc_de, trsmrcv_se_code, provd_instt_id, provd_sys_id, provd_svc_id, requst_instt_id, requst_sys_id);


--
-- Name: susersummary susersummary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.susersummary
    ADD CONSTRAINT susersummary_pkey PRIMARY KEY (occrrnc_de, stats_se, detail_stats_se);


--
-- Name: sweblogsummary sweblogsummary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sweblogsummary
    ADD CONSTRAINT sweblogsummary_pkey PRIMARY KEY (occrrnc_de, url);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: cadministcode_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cadministcode_pk ON public.cadministcode USING btree (administ_zone_se, administ_zone_code);


--
-- Name: cadministcoderecptnlog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cadministcoderecptnlog_pk ON public.cadministcoderecptnlog USING btree (occrrnc_de, administ_zone_se, administ_zone_code, opert_sn);


--
-- Name: ccmmnclcode_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ccmmnclcode_pk ON public.ccmmnclcode USING btree (cl_code);


--
-- Name: ccmmncode_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ccmmncode_i01 ON public.ccmmncode USING btree (cl_code);


--
-- Name: ccmmncode_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ccmmncode_pk ON public.ccmmncode USING btree (code_id);


--
-- Name: ccmmndetailcode_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ccmmndetailcode_i01 ON public.ccmmndetailcode USING btree (code_id);


--
-- Name: ccmmndetailcode_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ccmmndetailcode_pk ON public.ccmmndetailcode USING btree (code_id, code);


--
-- Name: ecopseq_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ecopseq_pk ON public.ecopseq USING btree (table_name);


--
-- Name: hconfmhistory_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hconfmhistory_pk ON public.hconfmhistory USING btree (confm_no);


--
-- Name: hdbmntrngloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hdbmntrngloginfo_pk ON public.hdbmntrngloginfo USING btree (log_id);


--
-- Name: hemaildsptchmanage_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hemaildsptchmanage_i01 ON public.hemaildsptchmanage USING btree (sndr);


--
-- Name: hemaildsptchmanage_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hemaildsptchmanage_i02 ON public.hemaildsptchmanage USING btree (atch_file_id);


--
-- Name: hemaildsptchmanage_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hemaildsptchmanage_pk ON public.hemaildsptchmanage USING btree (mssage_id);


--
-- Name: hemplyrinfochangedtls_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hemplyrinfochangedtls_i01 ON public.hemplyrinfochangedtls USING btree (emplyr_id);


--
-- Name: hemplyrinfochangedtls_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hemplyrinfochangedtls_pk ON public.hemplyrinfochangedtls USING btree (emplyr_id, change_de);


--
-- Name: hhttpmonloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hhttpmonloginfo_pk ON public.hhttpmonloginfo USING btree (sys_id, log_id);


--
-- Name: htrsmrcvmntrngloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX htrsmrcvmntrngloginfo_pk ON public.htrsmrcvmntrngloginfo USING btree (log_id);


--
-- Name: idx_nmenuinfo_modern_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nmenuinfo_modern_route ON public.nmenuinfo USING btree (modern_route);


--
-- Name: imgtemp_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX imgtemp_pk ON public.imgtemp USING btree (orgnzt_code, erncsl_se);


--
-- Name: j_attachfile_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX j_attachfile_pk ON public.j_attachfile USING btree (file_id, file_seq);


--
-- Name: nadbk_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nadbk_i01 ON public.nadbk USING btree (adbk_id);


--
-- Name: nadbk_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nadbk_pk ON public.nadbk USING btree (adbk_constnt_id, adbk_id);


--
-- Name: nadbkmanage_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nadbkmanage_pk ON public.nadbkmanage USING btree (adbk_id);


--
-- Name: nanswer_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nanswer_pk ON public.nanswer USING btree (ntt_id, bbs_id, answer_no);


--
-- Name: nauthorgroupinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nauthorgroupinfo_pk ON public.nauthorgroupinfo USING btree (group_id);


--
-- Name: nauthorinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nauthorinfo_pk ON public.nauthorinfo USING btree (author_code);


--
-- Name: nauthorrolerelate_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nauthorrolerelate_i01 ON public.nauthorrolerelate USING btree (author_code);


--
-- Name: nauthorrolerelate_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nauthorrolerelate_i02 ON public.nauthorrolerelate USING btree (role_code);


--
-- Name: nauthorrolerelate_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nauthorrolerelate_pk ON public.nauthorrolerelate USING btree (author_code, role_code);


--
-- Name: nbackupschduldfk_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nbackupschduldfk_pk ON public.nbackupschduldfk USING btree (backup_opert_id, execut_schdul_dfk_se);


--
-- Name: nbanner_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nbanner_pk ON public.nbanner USING btree (banner_id);


--
-- Name: nbbs_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nbbs_i01 ON public.nbbs USING btree (bbs_id);


--
-- Name: nbbs_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nbbs_pk ON public.nbbs USING btree (ntt_id, bbs_id);


--
-- Name: nbbsmaster_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nbbsmaster_pk ON public.nbbsmaster USING btree (bbs_id);


--
-- Name: nbbsmasteroptn_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nbbsmasteroptn_pk ON public.nbbsmasteroptn USING btree (bbs_id);


--
-- Name: nbbsuse_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nbbsuse_i01 ON public.nbbsuse USING btree (bbs_id);


--
-- Name: nbbsuse_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nbbsuse_pk ON public.nbbsuse USING btree (bbs_id, trget_id);


--
-- Name: nbkmkmenumanageresult_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nbkmkmenumanageresult_pk ON public.nbkmkmenumanageresult USING btree (menu_id, emplyr_id);


--
-- Name: nclub_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nclub_pk ON public.nclub USING btree (clb_id, cmmnty_id);


--
-- Name: nclubuser_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nclubuser_i01 ON public.nclubuser USING btree (clb_id, cmmnty_id);


--
-- Name: nclubuser_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nclubuser_pk ON public.nclubuser USING btree (clb_id, cmmnty_id, emplyr_id);


--
-- Name: ncmmnty_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncmmnty_pk ON public.ncmmnty USING btree (cmmnty_id);


--
-- Name: ncmmntyuser_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ncmmntyuser_i01 ON public.ncmmntyuser USING btree (cmmnty_id);


--
-- Name: ncmmntyuser_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncmmntyuser_pk ON public.ncmmntyuser USING btree (cmmnty_id, emplyr_id);


--
-- Name: ncnsltlist_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncnsltlist_pk ON public.ncnsltlist USING btree (cnslt_id);


--
-- Name: ncntcmessage_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncntcmessage_pk ON public.ncntcmessage USING btree (cntc_mssage_id);


--
-- Name: ncntcmessageitem_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ncntcmessageitem_i01 ON public.ncntcmessageitem USING btree (cntc_mssage_id);


--
-- Name: ncntcmessageitem_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncntcmessageitem_pk ON public.ncntcmessageitem USING btree (cntc_mssage_id, iem_id);


--
-- Name: ncntcservice_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncntcservice_pk ON public.ncntcservice USING btree (instt_id, sys_id, svc_id);


--
-- Name: ncntntslist_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ncntntslist_i01 ON public.ncntntslist USING btree (cntnts_id);


--
-- Name: ncntntslist_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ncntntslist_i02 ON public.ncntntslist USING btree (emplyr_id);


--
-- Name: ncntntslist_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncntntslist_pk ON public.ncntntslist USING btree (cntnts_id, emplyr_id);


--
-- Name: ncomment_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ncomment_i01 ON public.ncomment USING btree (ntt_id, bbs_id);


--
-- Name: ncomment_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ncomment_pk ON public.ncomment USING btree (ntt_id, bbs_id, answer_no);


--
-- Name: ndeptjob_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ndeptjob_pk ON public.ndeptjob USING btree (dept_job_id);


--
-- Name: ndeptjobbx_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ndeptjobbx_pk ON public.ndeptjobbx USING btree (dept_jobbx_id);


--
-- Name: ndiaryinfo_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ndiaryinfo_i01 ON public.ndiaryinfo USING btree (schdul_id);


--
-- Name: ndiaryinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ndiaryinfo_pk ON public.ndiaryinfo USING btree (schdul_id, diary_id);


--
-- Name: ndtausestats_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ndtausestats_pk ON public.ndtausestats USING btree (dta_use_stats_id);


--
-- Name: nemplyrinfo_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nemplyrinfo_i01 ON public.nemplyrinfo USING btree (orgnzt_id);


--
-- Name: nemplyrinfo_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nemplyrinfo_i02 ON public.nemplyrinfo USING btree (group_id);


--
-- Name: nemplyrinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nemplyrinfo_pk ON public.nemplyrinfo USING btree (emplyr_id);


--
-- Name: nemplyrscrtyestbs_i04; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nemplyrscrtyestbs_i04 ON public.nemplyrscrtyestbs USING btree (author_code);


--
-- Name: nemplyrscrtyestbs_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nemplyrscrtyestbs_pk ON public.nemplyrscrtyestbs USING btree (scrty_dtrmn_trget_id);


--
-- Name: nentrprsmber_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nentrprsmber_i01 ON public.nentrprsmber USING btree (group_id);


--
-- Name: nentrprsmber_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nentrprsmber_pk ON public.nentrprsmber USING btree (entrprs_mber_id);


--
-- Name: nfaqinfo_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nfaqinfo_i01 ON public.nfaqinfo USING btree (atch_file_id);


--
-- Name: nfaqinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nfaqinfo_pk ON public.nfaqinfo USING btree (faq_id);


--
-- Name: nfile_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nfile_pk ON public.nfile USING btree (atch_file_id);


--
-- Name: nfiledetail_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nfiledetail_i01 ON public.nfiledetail USING btree (atch_file_id);


--
-- Name: nfiledetail_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nfiledetail_pk ON public.nfiledetail USING btree (atch_file_id, file_sn);


--
-- Name: nfilesysmntrngloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nfilesysmntrngloginfo_pk ON public.nfilesysmntrngloginfo USING btree (file_sys_id, log_id);


--
-- Name: nfxtrsmanage_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nfxtrsmanage_pk ON public.nfxtrsmanage USING btree (fxtrs_code);


--
-- Name: ngnrlmber_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ngnrlmber_i01 ON public.ngnrlmber USING btree (group_id);


--
-- Name: ngnrlmber_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ngnrlmber_pk ON public.ngnrlmber USING btree (mber_id);


--
-- Name: nhpcminfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nhpcminfo_pk ON public.nhpcminfo USING btree (hpcm_id);


--
-- Name: nindvdlinfopolicy_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nindvdlinfopolicy_pk ON public.nindvdlinfopolicy USING btree (indvdl_info_policy_id);


--
-- Name: nindvdlpgecntnts_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nindvdlpgecntnts_pk ON public.nindvdlpgecntnts USING btree (cntnts_id);


--
-- Name: nindvdlpgeestbs_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nindvdlpgeestbs_pk ON public.nindvdlpgeestbs USING btree (emplyr_id);


--
-- Name: ninfrmlsanctn_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ninfrmlsanctn_pk ON public.ninfrmlsanctn USING btree (infrml_sanctn_id);


--
-- Name: ninsttcode_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ninsttcode_pk ON public.ninsttcode USING btree (instt_code);


--
-- Name: ninsttcoderecptnlog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ninsttcoderecptnlog_pk ON public.ninsttcoderecptnlog USING btree (occrrnc_de, instt_code, opert_sn);


--
-- Name: nintnetsvc_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nintnetsvc_pk ON public.nintnetsvc USING btree (intnet_svc_id);


--
-- Name: nleaderschdul_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nleaderschdul_pk ON public.nleaderschdul USING btree (schdul_id);


--
-- Name: nleaderschdulde_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nleaderschdulde_pk ON public.nleaderschdulde USING btree (schdul_id, schdul_de);


--
-- Name: nloginlog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nloginlog_pk ON public.nloginlog USING btree (log_id);


--
-- Name: nloginpolicy_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nloginpolicy_pk ON public.nloginpolicy USING btree (emplyr_id);


--
-- Name: nmainimage_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nmainimage_pk ON public.nmainimage USING btree (image_id);


--
-- Name: nmemoreprt_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nmemoreprt_pk ON public.nmemoreprt USING btree (reprt_id);


--
-- Name: nmemotodo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nmemotodo_pk ON public.nmemotodo USING btree (todo_id);


--
-- Name: nmenucreatdtls_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nmenucreatdtls_i02 ON public.nmenucreatdtls USING btree (menu_no);


--
-- Name: nmenucreatdtls_i03; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nmenucreatdtls_i03 ON public.nmenucreatdtls USING btree (mapng_creat_id);


--
-- Name: nmenucreatdtls_i04; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nmenucreatdtls_i04 ON public.nmenucreatdtls USING btree (author_code);


--
-- Name: nmenucreatdtls_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nmenucreatdtls_pk ON public.nmenucreatdtls USING btree (menu_no, author_code);


--
-- Name: nmenuinfo_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nmenuinfo_i02 ON public.nmenuinfo USING btree (upper_menu_no);


--
-- Name: nmenuinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nmenuinfo_pk ON public.nmenuinfo USING btree (menu_no);


--
-- Name: nmtgplacefxtrs_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nmtgplacefxtrs_i01 ON public.nmtgplacefxtrs USING btree (mtgrum_id);


--
-- Name: nmtgplacefxtrs_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nmtgplacefxtrs_pk ON public.nmtgplacefxtrs USING btree (mtgrum_id, fxtrs_code);


--
-- Name: nnote_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nnote_pk ON public.nnote USING btree (note_id);


--
-- Name: nnoterecptn_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nnoterecptn_i01 ON public.nnoterecptn USING btree (note_id, note_trnsmit_id);


--
-- Name: nnoterecptn_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nnoterecptn_pk ON public.nnoterecptn USING btree (note_id, note_trnsmit_id, note_recptn_id);


--
-- Name: nnotetrnsmit_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nnotetrnsmit_i01 ON public.nnotetrnsmit USING btree (note_id);


--
-- Name: nnotetrnsmit_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nnotetrnsmit_pk ON public.nnotetrnsmit USING btree (note_id, note_trnsmit_id);


--
-- Name: nntfcinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nntfcinfo_pk ON public.nntfcinfo USING btree (ntcn_no);


--
-- Name: nnttstats_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nnttstats_pk ON public.nnttstats USING btree (stats_id);


--
-- Name: nntwrkinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nntwrkinfo_pk ON public.nntwrkinfo USING btree (ntwrk_id);


--
-- Name: nntwrksvcmntrngloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nntwrksvcmntrngloginfo_pk ON public.nntwrksvcmntrngloginfo USING btree (sys_ip, sys_port, log_id);


--
-- Name: nonlinemanual_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nonlinemanual_pk ON public.nonlinemanual USING btree (online_mnl_id);


--
-- Name: nonlinepolliem_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nonlinepolliem_i01 ON public.nonlinepolliem USING btree (poll_id);


--
-- Name: nonlinepolliem_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nonlinepolliem_pk ON public.nonlinepolliem USING btree (poll_id, poll_iem_id);


--
-- Name: nonlinepollmanage_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nonlinepollmanage_pk ON public.nonlinepollmanage USING btree (poll_id);


--
-- Name: nonlinepollresult_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nonlinepollresult_i01 ON public.nonlinepollresult USING btree (poll_iem_id, poll_id);


--
-- Name: nonlinepollresult_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nonlinepollresult_pk ON public.nonlinepollresult USING btree (poll_result_id, poll_iem_id, poll_id);


--
-- Name: norgnztinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX norgnztinfo_pk ON public.norgnztinfo USING btree (orgnzt_id);


--
-- Name: npopupmanage_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX npopupmanage_pk ON public.npopupmanage USING btree (popup_id);


--
-- Name: nprivacylog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nprivacylog_pk ON public.nprivacylog USING btree (requst_id);


--
-- Name: nprocessmonloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nprocessmonloginfo_pk ON public.nprocessmonloginfo USING btree (procs_id, log_id);


--
-- Name: nprogrmlist_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nprogrmlist_pk ON public.nprogrmlist USING btree (progrm_file_nm);


--
-- Name: nproxyinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nproxyinfo_pk ON public.nproxyinfo USING btree (proxy_id);


--
-- Name: nproxyloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nproxyloginfo_pk ON public.nproxyloginfo USING btree (proxy_id, log_id);


--
-- Name: nqainfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nqainfo_pk ON public.nqainfo USING btree (qa_id);


--
-- Name: nqestnrinfo_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nqestnrinfo_i01 ON public.nqestnrinfo USING btree (qustnr_tmplat_id);


--
-- Name: nqestnrinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nqestnrinfo_pk ON public.nqestnrinfo USING btree (qustnr_tmplat_id, qestnr_id);


--
-- Name: nqustnriem_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nqustnriem_i01 ON public.nqustnriem USING btree (qustnr_qesitm_id, qestnr_id, qustnr_tmplat_id);


--
-- Name: nqustnriem_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nqustnriem_pk ON public.nqustnriem USING btree (qustnr_tmplat_id, qestnr_id, qustnr_qesitm_id, qustnr_iem_id);


--
-- Name: nqustnrqesitm_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nqustnrqesitm_i02 ON public.nqustnrqesitm USING btree (qestnr_id, qustnr_tmplat_id);


--
-- Name: nqustnrqesitm_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nqustnrqesitm_pk ON public.nqustnrqesitm USING btree (qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id);


--
-- Name: nqustnrrespondinfo_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nqustnrrespondinfo_i01 ON public.nqustnrrespondinfo USING btree (qestnr_id, qustnr_tmplat_id);


--
-- Name: nqustnrrespondinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nqustnrrespondinfo_pk ON public.nqustnrrespondinfo USING btree (qustnr_tmplat_id, qestnr_id, qustnr_respond_id);


--
-- Name: nqustnrrspnsresult_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nqustnrrspnsresult_i01 ON public.nqustnrrspnsresult USING btree (qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id);


--
-- Name: nqustnrrspnsresult_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nqustnrrspnsresult_pk ON public.nqustnrrspnsresult USING btree (qustnr_rspns_result_id, qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id);


--
-- Name: nqustnrtmplat_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nqustnrtmplat_pk ON public.nqustnrtmplat USING btree (qustnr_tmplat_id);


--
-- Name: nreprtstats_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nreprtstats_pk ON public.nreprtstats USING btree (reprt_id);


--
-- Name: nroleinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nroleinfo_pk ON public.nroleinfo USING btree (role_code);


--
-- Name: nroles_hierarchy_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nroles_hierarchy_i01 ON public.nroles_hierarchy USING btree (parnts_role);


--
-- Name: nroles_hierarchy_i02; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nroles_hierarchy_i02 ON public.nroles_hierarchy USING btree (chldrn_role);


--
-- Name: nroles_hierarchy_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nroles_hierarchy_pk ON public.nroles_hierarchy USING btree (parnts_role, chldrn_role);


--
-- Name: nschdulinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nschdulinfo_pk ON public.nschdulinfo USING btree (schdul_id);


--
-- Name: nscrap_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nscrap_pk ON public.nscrap USING btree (scrap_id);


--
-- Name: nservereqpmninfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nservereqpmninfo_pk ON public.nservereqpmninfo USING btree (server_eqpmn_id);


--
-- Name: nserverinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nserverinfo_pk ON public.nserverinfo USING btree (server_id);


--
-- Name: nserverresrceloginfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nserverresrceloginfo_pk ON public.nserverresrceloginfo USING btree (server_eqpmn_id, server_id, log_id);


--
-- Name: nsitemap_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nsitemap_pk ON public.nsitemap USING btree (mapng_creat_id);


--
-- Name: nsms_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nsms_pk ON public.nsms USING btree (sms_id);


--
-- Name: nsmsrecptn_i01; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nsmsrecptn_i01 ON public.nsmsrecptn USING btree (sms_id);


--
-- Name: nsmsrecptn_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nsmsrecptn_pk ON public.nsmsrecptn USING btree (sms_id, recptn_telno);


--
-- Name: nstsfdg_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nstsfdg_pk ON public.nstsfdg USING btree (stsfdg_no);


--
-- Name: nsynchrnserverinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nsynchrnserverinfo_pk ON public.nsynchrnserverinfo USING btree (server_id);


--
-- Name: nsyslog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nsyslog_pk ON public.nsyslog USING btree (requst_id);


--
-- Name: ntmplatinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ntmplatinfo_pk ON public.ntmplatinfo USING btree (tmplat_id);


--
-- Name: ntroblinfo_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ntroblinfo_pk ON public.ntroblinfo USING btree (trobl_id);


--
-- Name: ntrsmrcvlog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ntrsmrcvlog_pk ON public.ntrsmrcvlog USING btree (requst_id);


--
-- Name: ntrsmrcvmntrng_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ntrsmrcvmntrng_pk ON public.ntrsmrcvmntrng USING btree (cntc_id);


--
-- Name: nuserabsnce_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nuserabsnce_pk ON public.nuserabsnce USING btree (emplyr_id);


--
-- Name: nuserlog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nuserlog_pk ON public.nuserlog USING btree (occrrnc_de, rqester_id, svc_nm, method_nm);


--
-- Name: nweblog_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nweblog_pk ON public.nweblog USING btree (requst_id);


--
-- Name: sbbssummary_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sbbssummary_pk ON public.sbbssummary USING btree (occrrnc_de, stats_se, detail_stats_se);


--
-- Name: ssyslogsummary_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ssyslogsummary_pk ON public.ssyslogsummary USING btree (occrrnc_de, svc_nm, method_nm);


--
-- Name: strsmrcvlogsummary_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX strsmrcvlogsummary_pk ON public.strsmrcvlogsummary USING btree (occrrnc_de, trsmrcv_se_code, provd_instt_id, provd_sys_id, provd_svc_id, requst_instt_id, requst_sys_id);


--
-- Name: susersummary_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX susersummary_pk ON public.susersummary USING btree (occrrnc_de, stats_se, detail_stats_se);


--
-- Name: sweblogsummary_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sweblogsummary_pk ON public.sweblogsummary USING btree (occrrnc_de, url);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ccmmncode ccmmncode_cl_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccmmncode
    ADD CONSTRAINT ccmmncode_cl_code_fkey FOREIGN KEY (cl_code) REFERENCES public.ccmmnclcode(cl_code);


--
-- Name: ccmmndetailcode ccmmndetailcode_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccmmndetailcode
    ADD CONSTRAINT ccmmndetailcode_code_id_fkey FOREIGN KEY (code_id) REFERENCES public.ccmmncode(code_id);


--
-- Name: hemaildsptchmanage hemaildsptchmanage_atch_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hemaildsptchmanage
    ADD CONSTRAINT hemaildsptchmanage_atch_file_id_fkey FOREIGN KEY (atch_file_id) REFERENCES public.nfile(atch_file_id);


--
-- Name: hemplyrinfochangedtls hemplyrinfochangedtls_emplyr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hemplyrinfochangedtls
    ADD CONSTRAINT hemplyrinfochangedtls_emplyr_id_fkey FOREIGN KEY (emplyr_id) REFERENCES public.nemplyrinfo(emplyr_id);


--
-- Name: nadbk nadbk_adbk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nadbk
    ADD CONSTRAINT nadbk_adbk_id_fkey FOREIGN KEY (adbk_id) REFERENCES public.nadbkmanage(adbk_id) ON DELETE CASCADE;


--
-- Name: nanswer nanswer_bbs_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nanswer
    ADD CONSTRAINT nanswer_bbs_id_fkey FOREIGN KEY (bbs_id) REFERENCES public.nbbsmasteroptn(bbs_id);


--
-- Name: nauthorrolerelate nauthorrolerelate_author_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nauthorrolerelate
    ADD CONSTRAINT nauthorrolerelate_author_code_fkey FOREIGN KEY (author_code) REFERENCES public.nauthorinfo(author_code) ON DELETE CASCADE;


--
-- Name: nauthorrolerelate nauthorrolerelate_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nauthorrolerelate
    ADD CONSTRAINT nauthorrolerelate_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.nroleinfo(role_code) ON DELETE CASCADE;


--
-- Name: nbloguser nbloguser_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbloguser
    ADD CONSTRAINT nbloguser_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.nblog(blog_id);


--
-- Name: nclubuser nclubuser_clb_id_cmmnty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nclubuser
    ADD CONSTRAINT nclubuser_clb_id_cmmnty_id_fkey FOREIGN KEY (clb_id, cmmnty_id) REFERENCES public.nclub(clb_id, cmmnty_id);


--
-- Name: ncmmntyuser ncmmntyuser_cmmnty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncmmntyuser
    ADD CONSTRAINT ncmmntyuser_cmmnty_id_fkey FOREIGN KEY (cmmnty_id) REFERENCES public.ncmmnty(cmmnty_id);


--
-- Name: ncntcmessageitem ncntcmessageitem_cntc_mssage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncntcmessageitem
    ADD CONSTRAINT ncntcmessageitem_cntc_mssage_id_fkey FOREIGN KEY (cntc_mssage_id) REFERENCES public.ncntcmessage(cntc_mssage_id);


--
-- Name: ncntntslist ncntntslist_cntnts_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncntntslist
    ADD CONSTRAINT ncntntslist_cntnts_id_fkey FOREIGN KEY (cntnts_id) REFERENCES public.nindvdlpgecntnts(cntnts_id);


--
-- Name: ncntntslist ncntntslist_emplyr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncntntslist
    ADD CONSTRAINT ncntntslist_emplyr_id_fkey FOREIGN KEY (emplyr_id) REFERENCES public.nindvdlpgeestbs(emplyr_id);


--
-- Name: ncomment ncomment_ntt_id_bbs_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ncomment
    ADD CONSTRAINT ncomment_ntt_id_bbs_id_fkey FOREIGN KEY (ntt_id, bbs_id) REFERENCES public.nbbs(ntt_id, bbs_id);


--
-- Name: ndiaryinfo ndiaryinfo_schdul_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndiaryinfo
    ADD CONSTRAINT ndiaryinfo_schdul_id_fkey FOREIGN KEY (schdul_id) REFERENCES public.nschdulinfo(schdul_id);


--
-- Name: nemplyrinfo_aud nemplyrinfo_aud_revinfo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nemplyrinfo_aud
    ADD CONSTRAINT nemplyrinfo_aud_revinfo_fkey FOREIGN KEY (rev) REFERENCES public.revinfo(rev);


--
-- Name: nemplyrinfo nemplyrinfo_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nemplyrinfo
    ADD CONSTRAINT nemplyrinfo_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.nauthorgroupinfo(group_id) ON DELETE SET NULL;


--
-- Name: nemplyrinfo nemplyrinfo_orgnzt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nemplyrinfo
    ADD CONSTRAINT nemplyrinfo_orgnzt_id_fkey FOREIGN KEY (orgnzt_id) REFERENCES public.norgnztinfo(orgnzt_id) ON DELETE SET NULL;


--
-- Name: nentrprsmber nentrprsmber_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nentrprsmber
    ADD CONSTRAINT nentrprsmber_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.nauthorgroupinfo(group_id) ON DELETE SET NULL;


--
-- Name: nextrlhrinfo nextrlhrinfo_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nextrlhrinfo
    ADD CONSTRAINT nextrlhrinfo_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.neventinfo(event_id);


--
-- Name: nfaqinfo nfaqinfo_atch_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfaqinfo
    ADD CONSTRAINT nfaqinfo_atch_file_id_fkey FOREIGN KEY (atch_file_id) REFERENCES public.nfile(atch_file_id);


--
-- Name: nfiledetail nfiledetail_atch_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfiledetail
    ADD CONSTRAINT nfiledetail_atch_file_id_fkey FOREIGN KEY (atch_file_id) REFERENCES public.nfile(atch_file_id);


--
-- Name: ngnrlmber ngnrlmber_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ngnrlmber
    ADD CONSTRAINT ngnrlmber_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.nauthorgroupinfo(group_id) ON DELETE SET NULL;


--
-- Name: nleaderschdulde nleaderschdulde_schdul_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nleaderschdulde
    ADD CONSTRAINT nleaderschdulde_schdul_id_fkey FOREIGN KEY (schdul_id) REFERENCES public.nleaderschdul(schdul_id);


--
-- Name: nmenucreatdtls nmenucreatdtls_author_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmenucreatdtls
    ADD CONSTRAINT nmenucreatdtls_author_code_fkey FOREIGN KEY (author_code) REFERENCES public.nauthorinfo(author_code);


--
-- Name: nmenucreatdtls nmenucreatdtls_mapng_creat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmenucreatdtls
    ADD CONSTRAINT nmenucreatdtls_mapng_creat_id_fkey FOREIGN KEY (mapng_creat_id) REFERENCES public.nsitemap(mapng_creat_id) ON DELETE CASCADE;


--
-- Name: nmenucreatdtls nmenucreatdtls_menu_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmenucreatdtls
    ADD CONSTRAINT nmenucreatdtls_menu_no_fkey FOREIGN KEY (menu_no) REFERENCES public.nmenuinfo(menu_no);


--
-- Name: nmenuinfo nmenuinfo_progrm_file_nm_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmenuinfo
    ADD CONSTRAINT nmenuinfo_progrm_file_nm_fkey FOREIGN KEY (progrm_file_nm) REFERENCES public.nprogrmlist(progrm_file_nm) ON DELETE CASCADE;


--
-- Name: nmenuinfo nmenuinfo_upper_menu_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmenuinfo
    ADD CONSTRAINT nmenuinfo_upper_menu_no_fkey FOREIGN KEY (upper_menu_no) REFERENCES public.nmenuinfo(menu_no);


--
-- Name: nmtgplacefxtrs nmtgplacefxtrs_fxtrs_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmtgplacefxtrs
    ADD CONSTRAINT nmtgplacefxtrs_fxtrs_code_fkey FOREIGN KEY (fxtrs_code) REFERENCES public.nfxtrsmanage(fxtrs_code);


--
-- Name: nnoterecptn nnoterecptn_note_id_note_trnsmit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nnoterecptn
    ADD CONSTRAINT nnoterecptn_note_id_note_trnsmit_id_fkey FOREIGN KEY (note_id, note_trnsmit_id) REFERENCES public.nnotetrnsmit(note_id, note_trnsmit_id);


--
-- Name: nnotetrnsmit nnotetrnsmit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nnotetrnsmit
    ADD CONSTRAINT nnotetrnsmit_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.nnote(note_id);


--
-- Name: nonlinepolliem nonlinepolliem_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlinepolliem
    ADD CONSTRAINT nonlinepolliem_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.nonlinepollmanage(poll_id);


--
-- Name: nonlinepollresult nonlinepollresult_poll_id_poll_iem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nonlinepollresult
    ADD CONSTRAINT nonlinepollresult_poll_id_poll_iem_id_fkey FOREIGN KEY (poll_id, poll_iem_id) REFERENCES public.nonlinepolliem(poll_id, poll_iem_id);


--
-- Name: nproxyloginfo nproxyloginfo_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nproxyloginfo
    ADD CONSTRAINT nproxyloginfo_proxy_id_fkey FOREIGN KEY (proxy_id) REFERENCES public.nproxyinfo(proxy_id);


--
-- Name: nqestnrinfo nqestnrinfo_qustnr_tmplat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqestnrinfo
    ADD CONSTRAINT nqestnrinfo_qustnr_tmplat_id_fkey FOREIGN KEY (qustnr_tmplat_id) REFERENCES public.nqustnrtmplat(qustnr_tmplat_id);


--
-- Name: nqustnriem nqustnriem_qestnr_id_qustnr_qesitm_id_qustnr_tmplat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnriem
    ADD CONSTRAINT nqustnriem_qestnr_id_qustnr_qesitm_id_qustnr_tmplat_id_fkey FOREIGN KEY (qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id) REFERENCES public.nqustnrqesitm(qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id);


--
-- Name: nqustnrqesitm nqustnrqesitm_qustnr_tmplat_id_qestnr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnrqesitm
    ADD CONSTRAINT nqustnrqesitm_qustnr_tmplat_id_qestnr_id_fkey FOREIGN KEY (qustnr_tmplat_id, qestnr_id) REFERENCES public.nqestnrinfo(qustnr_tmplat_id, qestnr_id);


--
-- Name: nqustnrrespondinfo nqustnrrespondinfo_qustnr_tmplat_id_qestnr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnrrespondinfo
    ADD CONSTRAINT nqustnrrespondinfo_qustnr_tmplat_id_qestnr_id_fkey FOREIGN KEY (qustnr_tmplat_id, qestnr_id) REFERENCES public.nqestnrinfo(qustnr_tmplat_id, qestnr_id);


--
-- Name: nqustnrrspnsresult nqustnrrspnsresult_qestnr_id_qustnr_qesitm_id_qustnr_tmpla_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nqustnrrspnsresult
    ADD CONSTRAINT nqustnrrspnsresult_qestnr_id_qustnr_qesitm_id_qustnr_tmpla_fkey FOREIGN KEY (qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id) REFERENCES public.nqustnrqesitm(qestnr_id, qustnr_qesitm_id, qustnr_tmplat_id);


--
-- Name: nroles_hierarchy nroles_hierarchy_chldrn_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nroles_hierarchy
    ADD CONSTRAINT nroles_hierarchy_chldrn_role_fkey FOREIGN KEY (chldrn_role) REFERENCES public.nauthorinfo(author_code) ON DELETE CASCADE;


--
-- Name: nroles_hierarchy nroles_hierarchy_parnts_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nroles_hierarchy
    ADD CONSTRAINT nroles_hierarchy_parnts_role_fkey FOREIGN KEY (parnts_role) REFERENCES public.nauthorinfo(author_code) ON DELETE CASCADE;


--
-- Name: nsmsrecptn nsmsrecptn_sms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsmsrecptn
    ADD CONSTRAINT nsmsrecptn_sms_id_fkey FOREIGN KEY (sms_id) REFERENCES public.nsms(sms_id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict ygJeWpLHdQAihmxrPSyflcqocdGEoPnJRsoAx46zpaTjBU0ncZMuR4qhhXfl4fb

