const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres.kmtcbkxvrbnfijvbdsrx:s5isI0KE48Bd9kD1@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?currentSchema=public"
});

const sql = `
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.table_name, c.column_name, c.numeric_precision
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND c.data_type = 'numeric'
          AND c.numeric_scale = 0
    ) LOOP
        IF r.numeric_precision <= 9 THEN
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                    ' ALTER COLUMN ' || quote_ident(r.column_name) || 
                    ' TYPE integer USING ' || quote_ident(r.column_name) || '::integer';
        ELSIF r.numeric_precision <= 18 THEN
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                    ' ALTER COLUMN ' || quote_ident(r.column_name) || 
                    ' TYPE bigint USING ' || quote_ident(r.column_name) || '::bigint';
        END IF;
    END LOOP;
END;
$$;
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('Success'); client.end(); })
  .catch(err => { console.error(err); client.end(); });
