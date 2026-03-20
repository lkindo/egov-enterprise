import { Client } from 'pg';

async function updateRoutes() {
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
    console.log('--- Connecting to Supabase DB for Route Update ---');
    await client.connect();

    const queries = [
      ["/admin/workspace/mypage", 2030100],
      ["/admin/operation/external-hr", 2030200],
      ["/admin/user/absences", 2030500],
      ["/admin/operation/rewards", 2030300],
      ["/admin/security/group", 9020210],
      ["/admin/security/dept-authority", 9020230]
    ];

    for (const [route, menuNo] of queries) {
      console.log(`Updating Menu No ${menuNo} with route ${route}...`);
      await client.query('UPDATE public.nmenuinfo SET modern_route = $1 WHERE menu_no = $2', [route, menuNo]);
    }

    console.log('--- Update Completed ---');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    await client.end();
  }
}

updateRoutes();
