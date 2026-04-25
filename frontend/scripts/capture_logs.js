const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  console.log('Navigating to http://localhost:3001/login...');
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="id"]', 'webmaster');
  await page.fill('input[name="password"]', '1');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 5000 }).catch(() => console.log('Login timeout'));
  
  const pages = [
    '/admin',
    '/admin/user/manage',
    '/admin/system/network',
    '/admin/system/programs',
    '/admin/security/authority'
  ];

  for (const p of pages) {
    console.log(`\n--- CHECKING PAGE: ${p} ---`);
    await page.goto(`http://localhost:3001${p}`);
    await page.waitForTimeout(3000);
  }

  await browser.close();
})();
