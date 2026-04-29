const { Client } = require('pg');

const client = new Client({
  user: 'egov',
  host: '129.154.54.178',
  database: 'egovdb',
  password: 'egov123',
  port: 5432,
});

async function run() {
  try {
    await client.connect();
    console.log('--- Connected to OCI PostgreSQL ---');

    console.log('\n[NQESTNRINFO Columns]');
    const surveyCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'nqestnrinfo'");
    console.log(surveyCols.rows.map(r => r.column_name).join(', '));

    console.log('\n[NONLINEPOLLMANAGE Columns]');
    const pollCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'nonlinepollmanage'");
    console.log(pollCols.rows.map(r => r.column_name).join(', '));

    console.log('\n[NQESTNRINFO - Surveys]');
    const surveyRes = await client.query('SELECT * FROM nqestnrinfo ORDER BY frst_regist_pnttm DESC LIMIT 5');
    console.table(surveyRes.rows);

    console.log('\n[NONLINEPOLLMANAGE - Online Polls]');
    const pollRes = await client.query('SELECT * FROM nonlinepollmanage ORDER BY frst_regist_pnttm DESC LIMIT 5');
    console.table(pollRes.rows);

  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

run();
