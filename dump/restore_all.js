const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'supabase_data.sql');
const outputPath = path.join(__dirname, 'restore_full.sql');

const content = fs.readFileSync(sourcePath, 'utf8');
const lines = content.split('\n');

const outputLines = [
    'SET session_replication_role = replica;',
    'TRUNCATE TABLE public."nmenucreatdtls" CASCADE;',
    'TRUNCATE TABLE public."nmenuinfo" CASCADE;',
    'TRUNCATE TABLE public."nprogrmlist" CASCADE;',
    'TRUNCATE TABLE public."nauthorrolerelate" CASCADE;',
    'TRUNCATE TABLE public."nauthorinfo" CASCADE;',
    'TRUNCATE TABLE public."nroleinfo" CASCADE;',
    'TRUNCATE TABLE public."nroles_hierarchy" CASCADE;',
    'TRUNCATE TABLE public."nbbsmaster" CASCADE;',
    'TRUNCATE TABLE public."nbbsmasteroptn" CASCADE;',
    'TRUNCATE TABLE public."nbbs" CASCADE;',
    'TRUNCATE TABLE public."nemplyrinfo" CASCADE;',
    'TRUNCATE TABLE public."nemplyrscrtyestbs" CASCADE;',
    'TRUNCATE TABLE public."ntmplatinfo" CASCADE;',
    'TRUNCATE TABLE public."norgnztinfo" CASCADE;',
    'TRUNCATE TABLE public."ccmmnclcode" CASCADE;',
    'TRUNCATE TABLE public."ccmmncode" CASCADE;',
    'TRUNCATE TABLE public."ccmmndetailcode" CASCADE;',
    'TRUNCATE TABLE public."nqestnrinfo" CASCADE;',
    'TRUNCATE TABLE public."nqustnriem" CASCADE;',
    'TRUNCATE TABLE public."nqustnrqesitm" CASCADE;',
    'TRUNCATE TABLE public."nqustnrtmplat" CASCADE;',
    'TRUNCATE TABLE public."nentrprsmber" CASCADE;',
    'TRUNCATE TABLE public."ngnrlmber" CASCADE;',
    'TRUNCATE TABLE public."nrefresh_token" CASCADE;',
    'TRUNCATE TABLE public."npolicy" CASCADE;',
    'TRUNCATE TABLE public."revinfo" CASCADE;'
];

// Patterns
const roleRelatePattern = /INSERT INTO public\."nauthorrolerelate" \("author_code", "role_code", "creat_dt", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm"\) VALUES \((.*?), (.*?), (.*?), (.*?), (.*?), (.*?), (.*?)\)/i;
const bbsMasterPattern = /INSERT INTO public\."nbbsmaster"/i;

lines.forEach(line => {
    let processedLine = line;
    
    // Fix nauthorrolerelate
    if (roleRelatePattern.test(line)) {
        processedLine = line.replace(
            /\("author_code", "role_code", "creat_dt", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm"\)/,
            '("author_code", "role_code", "creat_dt", "frst_register_id", "last_updusr_id", "last_updt_pnttm")'
        ).replace(
            /VALUES \((.*?), (.*?), (.*?), (.*?), (.*?), (.*?), (.*?)\)/,
            'VALUES ($1, $2, $3, $4, $5, $7)'
        );
    }
    
    // Remove "ON CONFLICT DO NOTHING" first
    processedLine = processedLine.replace(/ ON CONFLICT DO NOTHING;/g, ';');

    // Fix nbbsmaster (NULL bbs_attrb_code -> 'BBSA01')
    if (bbsMasterPattern.test(processedLine)) {
        processedLine = processedLine.replace(/, NULL\);$/, ", 'BBSA01');");
    }
    
    outputLines.push(processedLine);
});

outputLines.push('SET session_replication_role = default;');

fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
console.log(`Saved full restored SQL (v3) to ${outputPath}`);



