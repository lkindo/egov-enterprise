const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const sqlFile = path.join(__dirname, 'modernize_views.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// The db-bridge script expects a query string as an argument.
// We need to escape double quotes and handle newlines.
// It's safer to run it through node and call the bridge function directly if possible,
// but since I only have shell access, I'll use a temporary JS file.

const bridgePath = path.join(process.cwd(), '.agent/scripts/db-bridge.js');

// We'll use a trick: require the bridge and call its internal logic or just use it via exec
// Actually, I'll just use a small JS to execute the SQL.

const runnerCode = `
const { Pool } = require('pg');
const fs = require('fs');

// Try to get config from application.yml like db-bridge does
// But for simplicity, I'll just use the same method as db-bridge
// Or I can just run the command multiple times for each view.

const sql = fs.readFileSync('${sqlFile.replace(/\\/g, '\\\\')}', 'utf8');
const queries = sql.split(';\\n\\n');

// Since I can't easily import the bridge's private config, 
// I'll just use the bridge script for EACH query to be safe.
`;

// Actually, I'll just run the bridge command for the whole file content.
// But 63KB might exceed shell argument limits.

// I'll split the SQL into 10-view chunks.
const queries = sql.split(/DROP VIEW IF EXISTS/);
const chunks = [];
let currentChunk = '';
for (let i = 1; i < queries.length; i++) {
    currentChunk += 'DROP VIEW IF EXISTS ' + queries[i];
    if (i % 5 === 0) {
        chunks.push(currentChunk);
        currentChunk = '';
    }
}
if (currentChunk) chunks.push(currentChunk);

chunks.forEach((chunk, index) => {
    console.log(`Executing chunk ${index + 1}/${chunks.length}...`);
    // Escape for shell
    const escapedSql = chunk.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    try {
        const output = execSync(`node .agent/scripts/db-bridge.js "${escapedSql}"`, { encoding: 'utf8' });
        console.log(output);
    } catch (e) {
        console.error(`Error in chunk ${index + 1}:`, e.message);
    }
});
