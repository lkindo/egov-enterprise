const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
    const config = {
        host: process.env.DB_HOST || '129.154.54.178',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'egovdb',
        user: process.env.DB_USERNAME || 'egov',
        password: process.env.DB_PASSWORD || 'egov123',
    };

    if (process.env.DB_SSL === 'true') {
        config.ssl = { rejectUnauthorized: false };
    }

    const client = new Client(config);

    try {
        await client.connect();
        console.log('Successfully connected to DB.');

        // 1. Fetch all standard words
        console.log('Fetching meta standard words...');
        const wordsRes = await client.query("SELECT LOWER(eng_abbr) as eng_abbr, word_name FROM meta_standard_words");
        const wordMap = new Map();
        for (const row of wordsRes.rows) {
            if (row.eng_abbr) {
                wordMap.set(row.eng_abbr.trim(), row.word_name.trim());
            }
        }
        console.log(`Loaded ${wordMap.size} standard words.`);

        // 2. Fetch all standard terms
        console.log('Fetching meta standard terms...');
        const termsRes = await client.query("SELECT LOWER(eng_abbr) as eng_abbr, term_name FROM meta_standard_terms");
        const termMap = new Map();
        for (const row of termsRes.rows) {
            if (row.eng_abbr) {
                termMap.set(row.eng_abbr.trim(), row.term_name.trim());
            }
        }
        console.log(`Loaded ${termMap.size} standard terms.`);

        // 3. Fetch all target tables starting with tb_
        console.log('Fetching target tables...');
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'tb_%'
            ORDER BY table_name
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`Found ${tables.length} tables starting with tb_.`);

        // 4. Fetch all columns of target tables
        console.log('Fetching target columns...');
        const columnsRes = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name LIKE 'tb_%'
            ORDER BY table_name, ordinal_position
        `);
        const columns = columnsRes.rows;
        console.log(`Found ${columns.length} columns.`);

        const ddlStatements = [];
        ddlStatements.push('-- eGov Enterprise DB & Table & Column Comments DDL Script');
        ddlStatements.push('-- Generated based on standard meta words and terms');
        ddlStatements.push('-- Date: ' + new Date().toISOString() + '\n');

        // Helper function to resolve term/word name
        function resolveName(engNameAbbr, isTable = false) {
            const clean = engNameAbbr.toLowerCase().trim();
            
            // For tables, remove 'tb_' prefix first
            let wordToResolve = clean;
            if (isTable && clean.startsWith('tb_')) {
                wordToResolve = clean.substring(3);
            }

            // 1. Direct Term Match
            if (termMap.has(wordToResolve)) {
                return termMap.get(wordToResolve);
            }

            // 2. Split and Word Match Combination
            const parts = wordToResolve.split('_');
            const resolvedParts = [];
            let allMatched = true;

            for (const part of parts) {
                if (wordMap.has(part)) {
                    resolvedParts.push(wordMap.get(part));
                } else {
                    resolvedParts.push(part); // Fallback to raw part if not in dictionary
                    allMatched = false;
                }
            }

            // Return joined words
            return resolvedParts.join('');
        }

        // 5. Generate Table DDL Comments
        console.log('Generating table comments...');
        ddlStatements.push('-- ========================================================');
        ddlStatements.push('-- TABLE COMMENTS');
        ddlStatements.push('-- ========================================================');
        for (const tableName of tables) {
            const koreanName = resolveName(tableName, true);
            ddlStatements.push(`COMMENT ON TABLE ${tableName} IS '${koreanName} (${tableName})';`);
        }
        ddlStatements.push('\n');

        // 6. Generate Column DDL Comments
        console.log('Generating column comments...');
        ddlStatements.push('-- ========================================================');
        ddlStatements.push('-- COLUMN COMMENTS');
        ddlStatements.push('-- ========================================================');
        
        let currentTable = '';
        for (const col of columns) {
            if (col.table_name !== currentTable) {
                currentTable = col.table_name;
                ddlStatements.push(`\n-- Comments for ${currentTable}`);
            }
            const koreanName = resolveName(col.column_name, false);
            ddlStatements.push(`COMMENT ON COLUMN ${col.table_name}.${col.column_name} IS '${koreanName} (${col.column_name})';`);
        }

        // 7. Write to SQL file
        const outputSqlPath = path.join(__dirname, 'generate_comments.sql');
        fs.writeFileSync(outputSqlPath, ddlStatements.join('\n'), 'utf-8');
        console.log(`Successfully generated comments DDL script at: ${outputSqlPath}`);

    } catch (err) {
        console.error('Error executing comment generation:', err);
    } finally {
        await client.end();
    }
}

run();
