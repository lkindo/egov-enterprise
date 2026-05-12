const fs = require('fs');
const path = require('path');

const backupFile = path.join(__dirname, 'std_views_backup_utf8.json');
const outputFile = path.join(__dirname, 'modernize_views.sql');

const data = JSON.parse(fs.readFileSync(backupFile, 'utf8').replace(/^\uFEFF/, ''));

let sql = '';

data.forEach(view => {
    const viewName = view.table_name;
    let def = view.view_definition.trim();
    
    const selectMatch = def.match(/SELECT\s+(.+?)\s+FROM\s+(.+)/si);
    if (!selectMatch) return;

    const selectList = selectMatch[1];
    const fromClause = selectMatch[2];

    const columns = [];
    let currentColumn = '';
    let parenLevel = 0;
    for (let i = 0; i < selectList.length; i++) {
        const char = selectList[i];
        if (char === '(') parenLevel++;
        else if (char === ')') parenLevel--;
        
        if (char === ',' && parenLevel === 0) {
            columns.push(currentColumn.trim());
            currentColumn = '';
        } else {
            currentColumn += char;
        }
    }
    columns.push(currentColumn.trim());

    const modernizedColumns = columns.map(col => {
        const aliasMatch = col.match(/(.+?)\s+AS\s+(\w+)/i);
        let expression = col;
        let alias = null;
        
        if (aliasMatch) {
            expression = aliasMatch[1].trim();
            alias = aliasMatch[2].trim();
        } else {
            alias = expression;
        }

        // Surgical cleanup
        // Remove everything after :: (Postgres type cast)
        expression = expression.split('::')[0].trim();
        // Remove CAST(...) wrapping
        expression = expression.replace(/^CAST\((.*?)\s+AS\s+.*?\)$/i, '$1').trim();
        // Remove outer parentheses
        while (expression.startsWith('(') && expression.endsWith(')')) {
            expression = expression.substring(1, expression.length - 1).trim();
        }

        let targetType = null;
        const lowerAlias = alias.toLowerCase();

        if (lowerAlias.endsWith('_cd') || lowerAlias.endsWith('_yn')) {
            targetType = 'VARCHAR(10)';
        } else if (lowerAlias.endsWith('_id') || lowerAlias.endsWith('_nm') || lowerAlias.endsWith('_addr') || 
                   lowerAlias.endsWith('_path') || lowerAlias.endsWith('_url') || lowerAlias.endsWith('_no') ||
                   lowerAlias.endsWith('_cn') || lowerAlias.endsWith('_expln') || lowerAlias.endsWith('_ttl')) {
            targetType = 'VARCHAR(50)';
            if (lowerAlias.endsWith('_nm') && !lowerAlias.includes('id')) targetType = 'VARCHAR(256)';
            if (lowerAlias.endsWith('_ttl')) targetType = 'VARCHAR(256)';
            if (lowerAlias.endsWith('_cn') || lowerAlias.endsWith('_expln')) targetType = 'VARCHAR(1000)';
        } else if (lowerAlias.endsWith('_dt')) {
            targetType = 'TIMESTAMP';
        } else if (lowerAlias.endsWith('_ymd')) {
            targetType = 'VARCHAR(10)';
        }

        if (targetType) {
            return `CAST(${expression} AS ${targetType}) AS ${alias}`;
        }
        return col;
    });

    sql += `DROP VIEW IF EXISTS ${viewName} CASCADE;\n`;
    sql += `CREATE OR REPLACE VIEW ${viewName} AS\nSELECT ${modernizedColumns.join(',\n    ')}\nFROM ${fromClause.trim().replace(/;$/, '')};\n\n`;
});

fs.writeFileSync(outputFile, sql);
console.log(`Generated ${outputFile}`);
