const { Client } = require('pg');

const client = new Client({
  host: '129.154.54.178',
  port: 5432,
  user: 'egov',
  password: 'egov123',
  database: 'egovdb',
});

async function applyFixes() {
  try {
    await client.connect();
    
    console.log('--- Applying Menu Fixes ---');

    // 1. Routing Fixes
    await client.query(`
      UPDATE nmenuinfo 
      SET modern_route = '/admin/workspace/my-page' 
      WHERE menu_no = 2030100;
    `);
    console.log('Fixed MyPage route.');

    await client.query(`
      UPDATE nmenuinfo 
      SET modern_route = '/admin/survey/hub?tab=templates' 
      WHERE menu_no = 2010300;
    `);
    console.log('Fixed Survey Template tab.');

    await client.query(`
      UPDATE nmenuinfo 
      SET modern_route = '/admin/system/monitoring/hub?tab=observability' 
      WHERE menu_no = 9040330;
    `);
    console.log('Fixed Monitoring Observability tab.');

    // 2. Cleanup Legacy/Unused Menus
    const legacyMenus = [2010100, 2010200, 9040100];
    await client.query(`
      DELETE FROM nmenuinfo 
      WHERE menu_no = ANY($1::bigint[]);
    `, [legacyMenus]);
    
    // Also cleanup permissions for deleted menus
    await client.query(`
      DELETE FROM nmenucreatdtls 
      WHERE menu_no = ANY($1::bigint[]);
    `, [legacyMenus]);

    console.log('Cleaned up legacy unused menus and their permissions.');

    console.log('--- All Fixes Applied ---');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

applyFixes();
