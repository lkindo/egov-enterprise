/**
 * Supabase 데이터 덤프 스크립트
 * pooler 세션 모드(5432)를 통해 public 스키마 모든 테이블 데이터를 INSERT 문으로 추출
 */
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
  max: 3,
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

async function dumpData() {
  const client = await pool.connect();
  const outFile = path.join(__dirname, 'supabase_data.sql');
  const stream = fs.createWriteStream(outFile, { encoding: 'utf8' });

  stream.write('-- Supabase Data Dump\n');
  stream.write('-- Generated: ' + new Date().toISOString() + '\n\n');
  stream.write('SET statement_timeout = 0;\n');
  stream.write('SET lock_timeout = 0;\n');
  stream.write('SET client_encoding = \'UTF8\';\n');
  stream.write('SET standard_conforming_strings = on;\n');
  stream.write('SET check_function_bodies = false;\n');
  stream.write('SET client_min_messages = warning;\n');
  stream.write('SET row_security = off;\n\n');

  try {
    // 1. 모든 테이블 목록 조회 (의존성 순서대로)
    console.log('[INFO] Fetching table list...');
    const tablesRes = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const tables = tablesRes.rows.map(r => r.tablename);
    console.log(`[INFO] Found ${tables.length} tables`);

    // 2. 시퀀스 현재값 덤프
    console.log('[INFO] Dumping sequences...');
    const seqRes = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    
    for (const row of seqRes.rows) {
      const seqName = row.sequence_name;
      try {
        const valRes = await client.query(`SELECT last_value, is_called FROM public."${seqName}"`);
        if (valRes.rows.length > 0) {
          const { last_value, is_called } = valRes.rows[0];
          stream.write(`SELECT pg_catalog.setval('public."${seqName}"', ${last_value}, ${is_called});\n`);
        }
      } catch (e) {
        console.warn(`[WARN] Could not dump sequence ${seqName}: ${e.message}`);
      }
    }
    stream.write('\n');

    // 3. 각 테이블 데이터 덤프
    let totalRows = 0;
    stream.write('-- Disable triggers during data load\n');
    stream.write('SET session_replication_role = replica;\n\n');

    for (const table of tables) {
      process.stdout.write(`[INFO] Dumping table: ${table}... `);
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM public."${table}"`);
        const count = parseInt(countRes.rows[0].count);
        
        if (count === 0) {
          console.log(`0 rows (skipped)`);
          continue;
        }

        // 컬럼 정보 조회
        const colRes = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        const columns = colRes.rows.map(r => r.column_name);

        // 배치로 데이터 조회 (메모리 절약)
        const BATCH_SIZE = 500;
        let offset = 0;
        let batchCount = 0;

        stream.write(`\n-- Data for table: ${table} (${count} rows)\n`);

        while (offset < count) {
          const dataRes = await client.query(
            `SELECT * FROM public."${table}" ORDER BY 1 LIMIT $1 OFFSET $2`,
            [BATCH_SIZE, offset]
          );

          if (dataRes.rows.length > 0) {
            const colList = columns.map(c => `"${c}"`).join(', ');
            for (const row of dataRes.rows) {
              const values = columns.map(c => escapeLiteral(row[c])).join(', ');
              stream.write(`INSERT INTO public."${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
            }
            batchCount += dataRes.rows.length;
          }
          offset += BATCH_SIZE;
        }

        console.log(`${count} rows OK`);
        totalRows += count;
      } catch (e) {
        console.error(`\n[ERROR] Table ${table}: ${e.message}`);
        stream.write(`-- ERROR dumping ${table}: ${e.message}\n`);
      }
    }

    stream.write('\n-- Re-enable triggers\n');
    stream.write('SET session_replication_role = DEFAULT;\n\n');
    stream.write(`\n-- Total rows dumped: ${totalRows}\n`);
    stream.write('-- Data dump complete\n');

    console.log(`\n[DONE] Total rows dumped: ${totalRows}`);
    console.log(`[DONE] Data saved to: ${outFile}`);

  } finally {
    client.release();
    await pool.end();
    stream.end();
  }
}

dumpData().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
