const { Client } = require('pg');

const client = new Client({
  host: '129.154.54.178',
  port: 5432,
  user: 'egov',
  password: 'egov123',
  database: 'egovdb',
});

async function getAllSurveyMenus() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT menu_no, menu_nm, modern_route 
      FROM nmenuinfo 
      WHERE CAST(menu_no AS TEXT) LIKE '201%' 
      ORDER BY menu_no;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getAllSurveyMenus();
