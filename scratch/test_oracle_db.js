const { Client } = require('pg');

const client = new Client({
  host: '129.154.54.178',
  port: 5432,
  user: 'egov',
  password: 'egov123',
  database: 'egovdb',
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log('Connecting to Oracle Cloud DB at 129.154.54.178:5432...');
  try {
    await client.connect();
    console.log('Successfully connected to the database!');
    const res = await client.query('SELECT current_database(), current_schema(), version()');
    console.log('Database Info:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testConnection();
