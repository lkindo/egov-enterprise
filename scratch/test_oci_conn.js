const { Client } = require('pg');

const client = new Client({
  host: '129.154.54.178',
  port: 5432,
  user: 'egov',
  password: 'egov123',
  database: 'egovdb',
});

async function testConnection() {
  try {
    console.log('Connecting to OCI DB...');
    await client.connect();
    console.log('Successfully connected!');
    const res = await client.query('SELECT count(*) FROM nbbsmaster');
    console.log('Query successful, count:', res.rows[0].count);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.stack);
    process.exit(1);
  }
}

testConnection();
