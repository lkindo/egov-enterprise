const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const sqlFile = path.join(__dirname, 'modernize_views.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split by DROP VIEW
const parts = sql.split(/DROP VIEW IF EXISTS/);
const queries = [];
for (let i = 1; i < parts.length; i++) {
    queries.push('DROP VIEW IF EXISTS ' + parts[i]);
}

console.log(`Total views to modernize: ${queries.length}`);

queries.forEach((query, index) => {
    const viewNameMatch = query.match(/DROP VIEW IF EXISTS (\w+)/);
    const viewName = viewNameMatch ? viewNameMatch[1] : `View ${index + 1}`;
    
    process.stdout.write(`[${index + 1}/${queries.length}] Modernizing ${viewName}... `);
    
    // Escape for shell
    const escapedSql = query.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    try {
        execSync(`node .agent/scripts/db-bridge.js "${escapedSql}"`, { encoding: 'utf8', stdio: 'ignore' });
        console.log('✅');
    } catch (e) {
        console.log('❌');
        console.error(`  Error: ${e.message.split('\n')[0]}`);
    }
});
