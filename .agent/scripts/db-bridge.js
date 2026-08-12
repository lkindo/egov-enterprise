const fs = require('fs');
const path = require('path');

/**
 * Read-only DB bridge for schema and metadata inspection.
 *
 * Usage:
 *   node db-bridge.js "SELECT ..." [--json]
 *   node db-bridge.js --file query.sql [--json]
 *
 * All connection values must be supplied through environment variables. The bridge intentionally
 * rejects DML, DDL, transaction control, multiple statements and known side-effecting functions.
 * PostgreSQL READ ONLY transaction mode is applied as a second line of defense.
 */

const WRITE_KEYWORDS = /\b(?:insert|update|delete|merge|alter|create|drop|truncate|grant|revoke|copy|call|do|vacuum|refresh|reindex|cluster|comment|set|reset|listen|notify|unlisten|begin|start|commit|rollback|savepoint|release|prepare|execute|deallocate|lock)\b/i;
const SIDE_EFFECTING_SELECT = /\b(?:nextval|setval|dblink_exec|lo_import|pg_write_file|pg_file_write|pg_rotate_logfile)\s*\(/i;
const LOCKING_SELECT = /\bfor\s+(?:no\s+key\s+update|key\s+share|update|share)\b/i;

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value.trim();
}

function readDbConfig(environment = process.env) {
    const portText = environment.DB_PORT || '5432';
    const port = Number.parseInt(portText, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535 || String(port) !== String(portText).trim()) {
        throw new Error('DB_PORT must be an integer between 1 and 65535');
    }

    const config = {
        host: requireEnvironmentValue(environment, 'DB_HOST'),
        port,
        database: requireEnvironmentValue(environment, 'DB_NAME'),
        user: requireEnvironmentValue(environment, 'DB_USERNAME'),
        password: requireEnvironmentValue(environment, 'DB_PASSWORD'),
        connectionTimeoutMillis: 3000,
        application_name: 'egov-read-only-db-bridge',
    };

    if (environment.DB_SSL === 'true') {
        config.ssl = {
            rejectUnauthorized: environment.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        };
    }
    return config;
}

/**
 * Replaces quoted values and comments with spaces while preserving SQL control characters in the
 * executable stream. PostgreSQL dollar quotes and nested block comments are handled so that a
 * semicolon or write keyword hidden in text does not cause a false decision.
 */
function executableSql(sql) {
    let output = '';
    let index = 0;
    let state = 'normal';
    let blockDepth = 0;
    let dollarTag = '';

    while (index < sql.length) {
        const char = sql[index];
        const next = sql[index + 1];

        if (state === 'line-comment') {
            if (char === '\n' || char === '\r') {
                state = 'normal';
                output += char;
            } else {
                output += ' ';
            }
            index += 1;
            continue;
        }

        if (state === 'block-comment') {
            if (char === '/' && next === '*') {
                blockDepth += 1;
                output += '  ';
                index += 2;
            } else if (char === '*' && next === '/') {
                blockDepth -= 1;
                output += '  ';
                index += 2;
                if (blockDepth === 0) {
                    state = 'normal';
                }
            } else {
                output += char === '\n' || char === '\r' ? char : ' ';
                index += 1;
            }
            continue;
        }

        if (state === 'single-quote') {
            if (char === "'" && next === "'") {
                output += '  ';
                index += 2;
            } else if (char === "'") {
                state = 'normal';
                output += ' ';
                index += 1;
            } else {
                output += char === '\n' || char === '\r' ? char : ' ';
                index += 1;
            }
            continue;
        }

        if (state === 'double-quote') {
            if (char === '"' && next === '"') {
                output += '  ';
                index += 2;
            } else if (char === '"') {
                state = 'normal';
                output += ' ';
                index += 1;
            } else {
                output += char === '\n' || char === '\r' ? char : ' ';
                index += 1;
            }
            continue;
        }

        if (state === 'dollar-quote') {
            if (sql.startsWith(dollarTag, index)) {
                output += ' '.repeat(dollarTag.length);
                index += dollarTag.length;
                state = 'normal';
            } else {
                output += char === '\n' || char === '\r' ? char : ' ';
                index += 1;
            }
            continue;
        }

        if (char === '-' && next === '-') {
            state = 'line-comment';
            output += '  ';
            index += 2;
        } else if (char === '/' && next === '*') {
            state = 'block-comment';
            blockDepth = 1;
            output += '  ';
            index += 2;
        } else if (char === "'") {
            state = 'single-quote';
            output += ' ';
            index += 1;
        } else if (char === '"') {
            state = 'double-quote';
            output += ' ';
            index += 1;
        } else if (char === '$') {
            const match = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
            if (match) {
                dollarTag = match[0];
                state = 'dollar-quote';
                output += ' '.repeat(dollarTag.length);
                index += dollarTag.length;
            } else {
                output += char;
                index += 1;
            }
        } else {
            output += char;
            index += 1;
        }
    }

    if (state === 'single-quote' || state === 'double-quote' || state === 'dollar-quote'
            || state === 'block-comment') {
        throw new Error('SQL contains an unterminated quote or block comment');
    }
    return output;
}

function assertReadOnlyQuery(query) {
    if (typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('No SQL query was provided');
    }

    const executable = executableSql(query).trim();
    const withoutTrailingTerminator = executable.replace(/;\s*$/, '').trim();
    if (withoutTrailingTerminator.includes(';')) {
        throw new Error('Multiple SQL statements are not allowed');
    }

    if (!/^(?:select|with|show|explain|values)\b/i.test(withoutTrailingTerminator)) {
        throw new Error('Only read-only SELECT, WITH, SHOW, EXPLAIN or VALUES queries are allowed');
    }
    if (WRITE_KEYWORDS.test(withoutTrailingTerminator)) {
        throw new Error('The SQL contains a write or transaction-control keyword');
    }
    if (/\bselect\b[\s\S]*\binto\b/i.test(withoutTrailingTerminator)) {
        throw new Error('SELECT INTO is not allowed');
    }
    if (LOCKING_SELECT.test(withoutTrailingTerminator)) {
        throw new Error('Locking SELECT statements are not allowed');
    }
    if (SIDE_EFFECTING_SELECT.test(withoutTrailingTerminator)) {
        throw new Error('The SQL calls a known side-effecting function');
    }
    if (/^with\b/i.test(withoutTrailingTerminator)
            && !/\bselect\b/i.test(withoutTrailingTerminator)) {
        throw new Error('A WITH query must terminate in SELECT');
    }
    if (/^explain\b/i.test(withoutTrailingTerminator)
            && !/\b(?:select|with|values)\b/i.test(withoutTrailingTerminator.replace(/^explain\b/i, ''))) {
        throw new Error('EXPLAIN may only inspect a read-only query');
    }

    return query.trim().replace(/;\s*$/, '');
}

function readQuery(args) {
    const fileIndex = args.indexOf('--file');
    if (fileIndex >= 0) {
        const filePath = args[fileIndex + 1];
        if (!filePath || filePath.startsWith('--')) {
            throw new Error('--file requires a path');
        }
        return fs.readFileSync(path.resolve(filePath), 'utf8');
    }

    const query = args.find(argument => !argument.startsWith('--'));
    if (!query) {
        throw new Error('No query provided. Pass SQL directly or use --file path');
    }
    return query;
}

async function run(args = process.argv.slice(2), environment = process.env) {
    const query = assertReadOnlyQuery(readQuery(args));
    const config = readDbConfig(environment);
    const isJson = args.includes('--json');
    const { Client } = require('pg');
    const client = new Client(config);
    let transactionStarted = false;

    try {
        await client.connect();
        await client.query('BEGIN TRANSACTION READ ONLY');
        transactionStarted = true;
        await client.query("SET LOCAL statement_timeout = '3s'");
        await client.query("SET LOCAL lock_timeout = '3s'");

        const result = await client.query(query);
        if (isJson) {
            console.log(JSON.stringify(result.rows || [], null, 2));
        } else if (result.rows && result.rows.length > 0) {
            console.table(result.rows);
        } else {
            console.log('Query completed with no rows.');
        }
    } finally {
        if (transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch {
                // The original error remains authoritative; the connection is closed below.
            }
        }
        await client.end();
    }
}

if (require.main === module) {
    run().catch(error => {
        console.error(`Database bridge failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    assertReadOnlyQuery,
    executableSql,
    readDbConfig,
    readQuery,
    run,
};
