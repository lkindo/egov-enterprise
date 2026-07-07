const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * DB Bridge for Antigravity
 * Usage: node db-bridge.js "SELECT * FROM table" [--json]
 */

async function run() {
    let query = process.argv[2];
    const isJson = process.argv.includes('--json');
    const fileIndex = process.argv.indexOf('--file');

    if (fileIndex !== -1 && process.argv[fileIndex + 1]) {
        const filePath = process.argv[fileIndex + 1];
        query = fs.readFileSync(path.resolve(filePath), 'utf-8');
    }

    if (!query) {
        console.error('Error: No query provided. Use "query" or --file path');
        process.exit(1);
    }

    // Default configuration (extracted from application.yml)
    const config = {
        host: process.env.DB_HOST || '129.154.54.178',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'egovdb',
        user: process.env.DB_USERNAME || 'egov',
        password: process.env.DB_PASSWORD || 'egov123',
        connectionTimeoutMillis: 3000,
    };
    
    if (process.env.DB_SSL === 'true') {
        config.ssl = { rejectUnauthorized: false };
    }

    const client = new Client(config);

    try {
        await client.connect();
        
        // Safety session timeouts configuration (3 seconds limit)
        await client.query("SET statement_timeout = 3000;");
        await client.query("SET lock_timeout = 3000;");
        
        if (!process.env.DB_HOST) {
            console.warn("⚠️ Warning: DB_HOST not provided in environment variables. Falling back to default sandbox IP: " + config.host);
        }
        
        // Support multiple statements
        const isRaw = process.argv.includes('--raw');
        const statements = isRaw ? [query] : query.split(';').map(s => s.trim()).filter(s => s.length > 0);
        
        for (const statement of statements) {
            try {
                const res = await client.query(statement);
                
                if (isJson) {
                    if (res.rows && res.rows.length > 0) {
                        console.log(JSON.stringify(res.rows, null, 2));
                    }
                } else {
                    if (res.rows && res.rows.length > 0) {
                        console.table(res.rows);
                    } else if (res.command) {
                        console.log(`${res.command} completed.`);
                    }
                }
            } catch (stmtErr) {
                console.error(`Statement Error [${statement.substring(0, 50)}...]:`, stmtErr.message);
                // Continue to next statement
            }
        }
    } catch (err) {
        console.error('Database Error:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
