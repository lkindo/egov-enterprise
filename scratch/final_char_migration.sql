-- 1. DROP VIEW
DROP VIEW IF EXISTS comvnusermaster;

-- 2. CONVERT CHARACTER TO VARCHAR
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.table_name, c.column_name, c.character_maximum_length
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND c.data_type = 'character'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                ' ALTER COLUMN ' || quote_ident(r.column_name) || 
                ' TYPE varchar(' || r.character_maximum_length || ') USING ' || 
                quote_ident(r.column_name) || '::varchar(' || r.character_maximum_length || ')';
    END LOOP;
END;
$$;

-- 3. RECREATE VIEW (Restore from backup definition)
CREATE VIEW comvnusermaster AS
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
   FROM ngnrlmber
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
   FROM nentrprsmber
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
   FROM nemplyrinfo;
