const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres.kmtcbkxvrbnfijvbdsrx:s5isI0KE48Bd9kD1@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?currentSchema=public"
});

const sql = `
-- 1. Create Missing Tables
CREATE TABLE IF NOT EXISTS nonlinemnual (
    online_mnl_id varchar(20) PRIMARY KEY,
    online_mnl_nm varchar(255) NOT NULL,
    online_mnl_se_code varchar(3) NOT NULL,
    online_mnl_dfn varchar(1000),
    online_mnl_dc text,
    frst_regist_pnttm timestamp,
    last_updt_pnttm timestamp,
    frst_register_id varchar(20),
    last_updusr_id varchar(20)
);

CREATE TABLE IF NOT EXISTS nqestnrrespond (
    qustnr_respond_id varchar(20) PRIMARY KEY,
    qestnr_id varchar(20) NOT NULL,
    qustnr_tmplat_id varchar(20) NOT NULL,
    sexdstn_code varchar(1),
    occp_ty_code varchar(1),
    respond_nm varchar(50),
    brthdy varchar(20),
    area_no varchar(4),
    middle_telno varchar(4),
    end_telno varchar(4),
    respond_id varchar(20),
    frst_regist_pnttm timestamp,
    last_updt_pnttm timestamp,
    frst_register_id varchar(20),
    last_updusr_id varchar(20)
);

CREATE TABLE IF NOT EXISTS nqestnrtmplat (
    qustnr_tmplat_id varchar(20) PRIMARY KEY,
    qustnr_tmplat_ty varchar(100),
    qustnr_tmplat_imagepathnm varchar(100),
    qustnr_tmplat_cn varchar(1000),
    frst_regist_pnttm timestamp,
    last_updt_pnttm timestamp,
    frst_register_id varchar(20),
    last_updusr_id varchar(20)
);

CREATE TABLE IF NOT EXISTS nwikmnthngreprt (
    reprt_id varchar(20) PRIMARY KEY,
    reprt_sj varchar(255) NOT NULL,
    reprt_cn varchar(4000),
    reprt_se varchar(1),
    reprt_de varchar(20),
    wrter_id varchar(20) NOT NULL,
    reprt_sttus varchar(1),
    frst_regist_pnttm timestamp,
    last_updt_pnttm timestamp,
    frst_register_id varchar(20),
    last_updusr_id varchar(20)
);

CREATE TABLE IF NOT EXISTS nindvdlpge (
    pge_id varchar(20) PRIMARY KEY,
    pge_nm varchar(255) NOT NULL,
    pge_dc varchar(1000),
    emplyr_id varchar(20) NOT NULL,
    frst_regist_pnttm timestamp,
    last_updt_pnttm timestamp,
    frst_register_id varchar(20),
    last_updusr_id varchar(20)
);

-- 2. Add Missing Columns
ALTER TABLE nleaderschdul ADD COLUMN IF NOT EXISTS schdul_ipcr_code varchar(20);

-- 3. Add Auditing Columns to ALL Tables
DO $$
DECLARE
    r RECORD;
    t text;
BEGIN
    -- 1. Drop all foreign keys first to allow type changes
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;

    -- 2. Convert all numeric to bigint
    FOR r IN (
        SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND (c.data_type = 'numeric' AND (c.numeric_scale = 0 OR c.numeric_scale IS NULL)
               OR c.data_type = 'integer')
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                ' ALTER COLUMN ' || quote_ident(r.column_name) || 
                ' TYPE bigint USING ' || quote_ident(r.column_name) || '::bigint';
    END LOOP;

    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS frst_regist_pnttm timestamp';
            EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS last_updt_pnttm timestamp';
            EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS frst_register_id varchar(20)';
            EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS last_updusr_id varchar(20)';
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Skipping table %', t;
        END;
    END LOOP;
END;
$$;

-- 4. Fix Popup Specific Type Mismatches
ALTER TABLE npopupmanage ALTER COLUMN popup_width_lc TYPE varchar(20) USING popup_width_lc::varchar(20);
ALTER TABLE npopupmanage ALTER COLUMN popup_vrticl_lc TYPE varchar(20) USING popup_vrticl_lc::varchar(20);
ALTER TABLE npopupmanage ALTER COLUMN popup_vrticl_size TYPE varchar(20) USING popup_vrticl_size::varchar(20);
ALTER TABLE npopupmanage ALTER COLUMN popup_width_size TYPE varchar(20) USING popup_width_size::varchar(20);

-- 5. Additional Type Fixes
ALTER TABLE nfiledetail ALTER COLUMN file_size TYPE bigint USING file_size::bigint;
ALTER TABLE nmenucreatdtls ALTER COLUMN menu_no TYPE bigint USING menu_no::bigint;
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('Mega Fix Success'); client.end(); })
  .catch(err => { console.error(err); client.end(); });
