const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.kmtcbkxvrbnfijvbdsrx',
  password: 's5isI0KE48Bd9kD1',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

function escapeLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function runDump() {
  const client = await pool.connect();
  const dumpFile = path.join(__dirname, '..', 'dump', 'supabase_full.sql');
  const stream = fs.createWriteStream(dumpFile, { encoding: 'utf8' });

  console.log('[1/3] Fetching table list and counts...');
  const tablesRes = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const tables = tablesRes.rows.map(r => r.tablename);
  
  const stats = [];
  stream.write('-- Supabase Full Data Dump\n');
  stream.write('-- Generated: ' + new Date().toISOString() + '\n\n');
  stream.write('SET session_replication_role = replica;\n\n');

  console.log(`[2/3] Dumping data for ${tables.length} tables...`);
  for (const table of tables) {
    try {
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${table}"`);
      const count = parseInt(countRes.rows[0].count);
      stats.push({ table, count, dumped: 0 });

      if (count === 0) continue;

      const colRes = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      const columns = colRes.rows.map(r => r.column_name);
      const colList = columns.map(c => `"${c}"`).join(', ');

      stream.write(`\n-- Table: ${table}\n`);
      const dataRes = await client.query(`SELECT * FROM public."${table}"`);
      for (const row of dataRes.rows) {
        const values = columns.map(c => escapeLiteral(row[c])).join(', ');
        stream.write(`INSERT INTO public."${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
        stats.find(s => s.table === table).dumped++;
      }
      process.stdout.write('.');
    } catch (e) {
      console.error(`\n[ERR] Table ${table}: ${e.message}`);
    }
  }

  stream.write('\nSET session_replication_role = DEFAULT;\n');
  stream.end();

  console.log('\n\n[3/3] Verification Report:');
  console.log('--------------------------------------------------');
  console.log('Table Name'.padEnd(30) + ' | ' + 'DB Count'.padStart(10) + ' | ' + 'Dumped'.padStart(10));
  console.log('--------------------------------------------------');
  let totalDb = 0;
  let totalDumped = 0;
  for (const s of stats) {
    console.log(`${s.table.padEnd(30)} | ${String(s.count).padStart(10)} | ${String(s.dumped).padStart(10)}`);
    totalDb += s.count;
    totalDumped += s.dumped;
  }
  console.log('--------------------------------------------------');
  console.log(`${'TOTAL'.padEnd(30)} | ${String(totalDb).padStart(10)} | ${String(totalDumped).padStart(10)}`);
  
  if (totalDb === totalDumped) {
    console.log('\n[SUCCESS] All data dumped successfully and verified!');
  } else {
    console.log('\n[WARNING] Mismatch in dumped row counts!');
  }

  await client.release();
  await pool.end();
}

runDump().catch(console.error);
