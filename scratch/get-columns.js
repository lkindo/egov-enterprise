const { Client } = require('pg');

const client = new Client({
  host: '129.154.54.178',
  port: 5432,
  user: 'egov',
  password: 'egov123',
  database: 'egovdb',
});

async function getColumns() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nmenuinfo' 
      ORDER BY ordinal_position;
    `);
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getColumns();
