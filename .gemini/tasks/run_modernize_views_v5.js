const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const sqlFile = path.join(__dirname, 'modernize_views.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

const queries = sql.split(/;\n/).map(q => q.trim()).filter(q => q.length > 0);

console.log(`Total queries to execute: ${queries.length}`);

queries.forEach((query, index) => {
    process.stdout.write(`[${index + 1}/${queries.length}] Executing... `);
    
    // Replace newlines with spaces for shell safety
    const singleLineSql = query.replace(/\r?\n/g, ' ').trim();
    const escapedSql = singleLineSql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    
    try {
        const output = execSync(`node .agent/scripts/db-bridge.js "${escapedSql}"`, { encoding: 'utf8' });
        console.log('✅');
    } catch (e) {
        console.log('❌');
        console.error(`  Error in query: ${query.substring(0, 100)}...`);
        console.error(`  Details: ${e.stdout || e.message}`);
    }
});
