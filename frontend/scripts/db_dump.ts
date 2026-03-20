
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Supabase (PostgreSQL) Database Dump Script (Enhanced with Comments)
 */
async function runDump() {
  const config = {
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.kmtcbkxvrbnfijvbdsrx',
    password: 's5isI0KE48Bd9kD1',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(config);
  const dumpFile = path.join(process.cwd(), 'db_dump.sql');
  const fd = fs.openSync(dumpFile, 'w');

  try {
    console.log('--- Connecting to Supabase DB ---');
    await client.connect();

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables to dump.`);

    fs.writeSync(fd, `-- EGOV Enterprise DB Dump (Full with Comments) Created at ${new Date().toISOString()}\n\n`);

    for (const table of tables) {
      console.log(`Dumping table & comments: ${table}...`);
      
      // 1. Get Table Comment
      const tableCommentRes = await client.query(`
        SELECT obj_description(c.oid, 'pg_class') as description
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1
      `, [table]);
      const tableDescription = tableCommentRes.rows[0]?.description;

      // 2. Get Column info & Comments
      const colsRes = await client.query(`
        SELECT 
            cols.column_name, 
            cols.data_type, 
            cols.is_nullable, 
            cols.column_default, 
            cols.character_maximum_length,
            (
                SELECT d.description 
                FROM pg_catalog.pg_description d
                JOIN pg_catalog.pg_attribute a ON a.attrelid = d.objoid AND a.attnum = d.objsubid
                WHERE a.attrelid = ('public.' || quote_ident($1))::regclass
                AND a.attname = cols.column_name
            ) as column_comment
        FROM information_schema.columns cols
        WHERE cols.table_schema = 'public' AND cols.table_name = $1
        ORDER BY cols.ordinal_position
      `, [table]);

      const columns = colsRes.rows;
      const colDefinitions = columns.map(c => {
        let def = `"${c.column_name}" ${c.data_type}`;
        if (c.character_maximum_length) def += `(${c.character_maximum_length})`;
        if (c.is_nullable === 'NO') def += ' NOT NULL';
        if (c.column_default && !c.column_default.includes('nextval')) {
          def += ` DEFAULT ${c.column_default}`;
        }
        return def;
      }).join(',\n  ');

      fs.writeSync(fd, `\n-- Table: public.${table}\n`);
      fs.writeSync(fd, `CREATE TABLE IF NOT EXISTS public."${table}" (\n  ${colDefinitions}\n);\n`);

      // Write Table Comment
      if (tableDescription) {
        fs.writeSync(fd, `COMMENT ON TABLE public."${table}" IS '${tableDescription.replace(/'/g, "''")}';\n`);
      }

      // Write Column Comments
      for (const col of columns) {
        if (col.column_comment) {
          fs.writeSync(fd, `COMMENT ON COLUMN public."${table}"."${col.column_name}" IS '${col.column_comment.replace(/'/g, "''")}';\n`);
        }
      }

      // 3. Dump Data
      const dataRes = await client.query(`SELECT * FROM public."${table}"`);
      if (dataRes.rows.length > 0) {
        fs.writeSync(fd, `\nINSERT INTO public."${table}" (${columns.map(c => `"${c.column_name}"`).join(', ')}) VALUES\n`);
        const rows = dataRes.rows.map((row, index) => {
          const values = columns.map(c => {
            const val = row[c.column_name];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return String(val);
          }).join(', ');
          return `  (${values})${index === dataRes.rows.length - 1 ? ';' : ','}\n`;
        });
        for (const rowSql of rows) fs.writeSync(fd, rowSql);
      }
      fs.writeSync(fd, `\n-- --------------------------------------------------------\n`);
    }

    console.log('--- Dump Completed with Comments ---');
  } catch (err) {
    console.error(err);
  } finally {
    fs.closeSync(fd);
    await client.end();
  }
}

runDump();
