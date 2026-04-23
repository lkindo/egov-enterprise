const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres.kmtcbkxvrbnfijvbdsrx:s5isI0KE48Bd9kD1@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?currentSchema=public"
});
client.connect()
  .then(() => client.query('ALTER TABLE nemplyrinfo ALTER COLUMN brthdy TYPE varchar(20) USING brthdy::varchar(20);'))
  .then(() => { console.log('Success'); client.end(); })
  .catch(err => { console.error(err); client.end(); });
