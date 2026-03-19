const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('frontend/src');

const phrases = [
  { eng: 'Real-time Indexing Active', kor: '실시간 인덱싱 활성화' },
  { eng: '검색 members...', kor: '멤버 검색...' },
  { eng: 'Department Task Management Unit', kor: '부서 업무 관리 단위' },
  { eng: 'Total Active Tasks', kor: '진행중인 총 업무' },
  { eng: 'Thoughts', kor: '개의 생각' },
  { eng: 'Index', kor: '번호' },
  { eng: 'Community Name', kor: '커뮤니티명' },
  { eng: 'Introduction', kor: '소개' },
  { eng: 'Manager', kor: '관리자' },
  { eng: 'Established', kor: '개설일' },
  { eng: 'Select an item to view details', kor: '항목을 선택하여 상세정보를 확인하세요' },
  { eng: 'System Visitor Distribution', kor: '시스템 방문자 분포' },
  { eng: 'No data available…', kor: '데이터가 없습니다…' },
  { eng: 'Pro Tip', kor: '프로 팁' }
];

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  phrases.forEach(({eng, kor}) => {
     newContent = newContent.split(eng).join(kor);
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
  }
});

console.log('Phrase replacements modified ' + modifiedCount + ' files.');
