const { Client } = require('pg');

const client = new Client({
  host: '129.154.54.178',
  port: 5432,
  user: 'egov',
  password: 'egov123',
  database: 'egovdb',
});

async function findMismatches() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT menu_no, menu_nm, modern_route, upper_menu_no 
      FROM nmenuinfo 
      WHERE menu_nm LIKE '%마이페이지%' 
         OR menu_nm LIKE '%설문%' 
         OR menu_nm LIKE '%서베이%' 
         OR modern_route LIKE '%mypage%'
         OR modern_route LIKE '%monitoring%'
      ORDER BY menu_no;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

findMismatches();
