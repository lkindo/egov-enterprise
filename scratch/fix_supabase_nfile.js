const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres.kmtcbkxvrbnfijvbdsrx:s5isI0KE48Bd9kD1@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?currentSchema=public"
});

const sql = `
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS frst_regist_pnttm timestamp;
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS last_updt_pnttm timestamp;
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS frst_register_id varchar(20);
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS last_updusr_id varchar(20);
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('Success'); client.end(); })
  .catch(err => { console.error(err); client.end(); });
