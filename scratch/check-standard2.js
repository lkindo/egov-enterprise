const { execSync } = require('child_process');

const out = execSync('node .agent/scripts/db-bridge.js "SELECT term_name, eng_abbr FROM meta_standard_terms" --json', { encoding: 'utf8' });
const jsonStart = out.indexOf('[');
const terms = JSON.parse(out.substring(jsonStart));

const mappings = [
    // UserMapper
    ['pswd_cnsr', 'pswd_crans'],
    ['ognz_id', 'orgnzt_id'],
    ['base_addr', 'home_addr'],
    ['dtl_addr', 'daddr'],
    ['crtfc_dn_value', 'sub_dn'],
    // BoardMapper
    ['created_date', 'frst_register_pnttm'],
    ['frst_register_nm', 'user_nm'],
    ['reply_lc', 'ans_lvl']
];

const found = {};
terms.forEach(t => {
    found[t.eng_abbr.toLowerCase()] = t.term_name;
});

const result = mappings.map(pair => {
    return {
        entity: { abbr: pair[0], standard: found[pair[0]] || null },
        dto: { abbr: pair[1], standard: found[pair[1]] || null }
    };
});

console.log(JSON.stringify(result, null, 2));
