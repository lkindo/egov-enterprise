const fs = require('fs');

const words = [
    '비밀번호', '정답', '검열',
    '조직', '아이디',
    '기본', '주소', '자택',
    '상세',
    '인증', '고유명', '값',
    '최초', '등록', '시점', '일시',
    '답변', '위치', '레벨'
];

const wordsDB = JSON.parse(fs.readFileSync('scratch/terms.json', 'utf8')); 
// wait terms.json has meta_standard_terms. Let me fetch meta_standard_words instead.

const { execSync } = require('child_process');
const out = execSync('node .agent/scripts/db-bridge.js "SELECT word_name, eng_abbr FROM meta_standard_words" --json', { encoding: 'utf8' });
const ws = JSON.parse(out.substring(out.indexOf('[')));

const outT = execSync('node .agent/scripts/db-bridge.js "SELECT term_name, eng_abbr FROM meta_standard_terms" --json', { encoding: 'utf8' });
const ts = JSON.parse(outT.substring(outT.indexOf('[')));

words.forEach(w => {
    const r = ws.find(x => x.word_name === w);
    console.log(`Word [${w}]: `, r ? r.eng_abbr : 'NOT FOUND');
});

const termsToFind = [
    '비밀번호정답', '비밀번호검열',
    '조직아이디',
    '기본주소', '자택주소',
    '상세주소',
    '인증고유명값',
    '최초등록일시', '최초등록시점', '생성일시',
    '최초등록자명',
    '답변위치', '답변레벨'
];
console.log('--- TERMS ---');
termsToFind.forEach(t => {
    const r = ts.find(x => x.term_name === t);
    console.log(`Term [${t}]: `, r ? r.eng_abbr : 'NOT FOUND');
});
