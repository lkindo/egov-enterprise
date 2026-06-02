const fs = require('fs');
const words = JSON.parse(fs.readFileSync('scratch/words.json', 'utf8'));
const terms = JSON.parse(fs.readFileSync('scratch/terms.json', 'utf8'));

const getWord = w => words.find(x => x.word_name === w)?.eng_abbr || '[X]';
const getTerm = t => terms.find(x => x.term_name === t)?.eng_abbr || '[X]';

console.log('Words:');
console.log('비밀번호:', getWord('비밀번호'));
console.log('정답:', getWord('정답'));
console.log('검열:', getWord('검열'));
console.log('조직:', getWord('조직'));
console.log('아이디:', getWord('아이디'));
console.log('기본:', getWord('기본'));
console.log('주소:', getWord('주소'));
console.log('자택:', getWord('자택'));
console.log('상세:', getWord('상세'));
console.log('인증:', getWord('인증'));
console.log('고유명:', getWord('고유명'));
console.log('값:', getWord('값'));
console.log('최초:', getWord('최초'));
console.log('등록:', getWord('등록'));
console.log('등록자:', getWord('등록자'));
console.log('시점:', getWord('시점'));
console.log('일시:', getWord('일시'));
console.log('생성:', getWord('생성'));
console.log('사용자:', getWord('사용자'));
console.log('명:', getWord('명'));
console.log('답변:', getWord('답변'));
console.log('위치:', getWord('위치'));
console.log('레벨:', getWord('레벨'));

console.log('Terms:');
console.log('비밀번호정답:', getTerm('비밀번호정답'));
console.log('비밀번호검열:', getTerm('비밀번호검열'));
console.log('조직아이디:', getTerm('조직아이디'));
console.log('기본주소:', getTerm('기본주소'));
console.log('자택주소:', getTerm('자택주소'));
console.log('상세주소:', getTerm('상세주소'));
console.log('인증고유명값:', getTerm('인증고유명값'));
console.log('최초등록일시:', getTerm('최초등록일시'));
console.log('최초등록시점:', getTerm('최초등록시점'));
console.log('최초등록자명:', getTerm('최초등록자명'));
console.log('답변위치:', getTerm('답변위치'));
console.log('답변레벨:', getTerm('답변레벨'));

