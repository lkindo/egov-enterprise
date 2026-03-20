const { Client } = require('pg');

async function verifyRoutes() {
  const config = {
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.kmtcbkxvrbnfijvbdsrx',
    password: 's5isI0KE48Bd9kD1',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(config);

  try {
    await client.connect();
    console.log('--- Current Supabase DB Menu Routes (Selected Items) ---');

    const menuIds = [9020220, 2010100, 2010300, 2010400, 2010500, 2010600, 2010700, 2010800, 2030100];
    const res = await client.query('SELECT menu_no, menu_nm, modern_route FROM public.nmenuinfo WHERE menu_no = ANY($1)', [menuIds]);
    
    console.table(res.rows);
    console.log('--- Verification Completed ---');
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await client.end();
  }
}

verifyRoutes();
