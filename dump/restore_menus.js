const fs = require('fs');
const path = require('path');

const tables = ["nauthorinfo", "nauthorrolerelate", "nprogrmlist", "nmenuinfo", "nmenucreatdtls", "nroleinfo", "nroles_hierarchy"];
const sourcePath = path.join(__dirname, 'supabase_data.sql');
const outputPath = path.join(__dirname, 'restore_menus_v2.sql');

const content = fs.readFileSync(sourcePath, 'utf8');
const lines = content.split('\n');

const outputLines = [
    'SET session_replication_role = replica;'
];

tables.forEach(table => {
    console.log(`Processing ${table}...`);
    const pattern = new RegExp(`INSERT INTO public\\."${table}"`, 'i');
    lines.forEach(line => {
        if (pattern.test(line)) {
            let processedLine = line;
            if (table === "nauthorrolerelate") {
                processedLine = line.replace(
                    /\("author_code", "role_code", "creat_dt", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm"\)/,
                    '("author_code", "role_code", "creat_dt", "frst_register_id", "last_updusr_id", "last_updt_pnttm")'
                );
                processedLine = processedLine.replace(
                    /VALUES \((.*?), (.*?), (.*?), (.*?), (.*?), (.*?), (.*?)\)/,
                    'VALUES ($1, $2, $3, $4, $5, $7)'
                );
            }
            outputLines.push(processedLine);
        }
    });
});

outputLines.push('SET session_replication_role = default;');

fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
console.log(`Saved to ${outputPath}`);
