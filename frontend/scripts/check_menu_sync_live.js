const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function checkSync() {
  const config = {
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.kmtcbkxvrbnfijvbdsrx',
    password: 's5isI0KE48Bd9kD1',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(config);

  try {
    await client.connect();
    console.log('--- Connected to Supabase ---');

    // 1. Fetch all menus
    const res = await client.query('SELECT menu_no, menu_nm, modern_route, progrm_file_nm FROM public.nmenuinfo ORDER BY menu_no');
    const dbMenus = res.rows;

    // 2. Get local routes
    const appDir = path.join(__dirname, '..', 'src', 'app');
    const existingRoutes = new Set();

    function scanDir(dir, route = '') {
      const files = fs.readdirSync(dir);
      if (files.includes('page.tsx')) {
        existingRoutes.add((route || '/').toLowerCase());
      }
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.')) {
          scanDir(fullPath, route + '/' + file);
        }
      }
    }
    scanDir(appDir);

    console.log(`Found ${existingRoutes.size} frontend routes.`);

    // 3. Compare
    const results = [];
    for (const menu of dbMenus) {
      const { menu_nm, modern_route, menu_no, progrm_file_nm } = menu;
      
      if (!modern_route || modern_route === 'dir') continue;
      if (menu_nm.includes('[미사용]')) continue;

      const cleanRoute = modern_route.split('?')[0].toLowerCase().replace(/\/$/, '') || '/';
      
      // Dynamic route matching (replace [id] with regex)
      let match = existingRoutes.has(cleanRoute);
      if (!match) {
        for (const exRoute of existingRoutes) {
          const pattern = exRoute.replace(/\[.*?\]/g, '[^/]+');
          if (new RegExp(`^${pattern}$`).test(cleanRoute)) {
            match = true;
            break;
          }
        }
      }

      if (!match) {
        results.push({ menu_nm, menu_no, modern_route, status: 'File Missing' });
      }
    }

    if (results.length === 0) {
      console.log('✅ All active menu routes are correctly linked to frontend files.');
    } else {
      console.log('❌ Found Mismatches:');
      console.table(results);
    }

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await client.end();
  }
}

checkSync();
