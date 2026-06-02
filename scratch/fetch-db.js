const { execSync } = require('child_process');
const fs = require('fs');

const runQuery = (query, file) => {
    try {
        const out = execSync(`node .agent/scripts/db-bridge.js "${query}" --json`, { stdio: ['pipe', 'pipe', 'pipe'] });
        const str = out.toString('utf8');
        const start = str.indexOf('[');
        if (start !== -1) {
            fs.writeFileSync(file, str.substring(start));
        } else {
            console.log("No JSON found for", query);
        }
    } catch (e) {
        console.error("Error executing", query, e.message);
    }
};

runQuery("SELECT word_name, eng_abbr FROM meta_standard_words", "scratch/words.json");
runQuery("SELECT term_name, eng_abbr FROM meta_standard_terms", "scratch/terms.json");
