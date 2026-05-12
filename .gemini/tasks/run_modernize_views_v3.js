const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const sqlFile = path.join(__dirname, 'modernize_views.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split by semicolon, but ignore semicolons inside parentheses/quotes if any.
// Since our generated SQL is simple, splitting by ;\n should work.
const queries = sql.split(/;\n/).map(q => q.trim()).filter(q => q.length > 0);

console.log(`Total queries to execute: ${queries.length}`);

queries.forEach((query, index) => {
    process.stdout.write(`[${index + 1}/${queries.length}] Executing... `);
    
    const escapedSql = query.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    try {
        execSync(`node .agent/scripts/db-bridge.js "${escapedSql}"`, { encoding: 'utf8', stdio: 'ignore' });
        console.log('✅');
    } catch (e) {
        console.log('❌');
        console.error(`  Error in query: ${query.substring(0, 50)}...`);
        console.error(`  Details: ${e.message.split('\n')[0]}`);
    }
});
