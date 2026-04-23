const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres.kmtcbkxvrbnfijvbdsrx:s5isI0KE48Bd9kD1@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?currentSchema=public"
});

const sql = `
-- Survey Table Fixes
ALTER TABLE nqustnrrspnsresult ADD COLUMN IF NOT EXISTS qustnr_rspns_id varchar(20);
ALTER TABLE nqustnrrspnsresult ADD COLUMN IF NOT EXISTS qestnr_id varchar(20);
ALTER TABLE nqustnrrspnsresult ADD COLUMN IF NOT EXISTS qustnr_tmplat_id varchar(20);
ALTER TABLE nqustnrrspnsresult ADD COLUMN IF NOT EXISTS qustnr_qesitm_id varchar(20);
ALTER TABLE nqustnrrspnsresult ADD COLUMN IF NOT EXISTS qustnr_iem_id varchar(20);

ALTER TABLE nqustnriem ADD COLUMN IF NOT EXISTS iem_sn bigint;
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('Survey Fix Success'); client.end(); })
  .catch(err => { console.error(err); client.end(); });
