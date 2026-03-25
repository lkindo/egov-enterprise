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
    } else if (filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('frontend/e2e');

const replacements = [
  { old: /Identity Fabric\|사용자 인증 거버넌스/g, new: '아이덴티티|사용자 인증 거버넌스' },
  { old: /내 업무 현황/g, new: '진행중인 총 업무' },
  { old: /심층 매트릭스 보고서/g, new: '인텔리전스 노드' },
  { old: /시스템 관리 센터/g, new: '통합 관리 센터' },
  { old: /설문 관리/g, new: '설문조사' },
  { old: /보안 감사 매트릭스/g, new: '감사 및 통계 모니터링' },
  { old: /사용자 검색 및 선택/g, new: '멤버 검색' },
  { old: /통합 게시판/g, new: '게시판' }
];

let modifiedCount = 0;

files.forEach(file => {
  if (file.includes('.bak')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  replacements.forEach(rep => {
    newContent = newContent.replace(rep.old, rep.new);
  });
  
  // Specific fix for admin user locator that fails
  if (file.includes('01-admin-domain.spec.ts')) {
      newContent = newContent.replace(/getByText\('관리자'\)\.first\(\)/g, "getByText('관리자').last()");
      newContent = newContent.replace(/getByText\('팝업 목록'\)\.first\(\)/g, "getByText('팝업').first()");
      newContent = newContent.replace(/getByText\('사용자 계정 관리'\)/g, "getByText('사용자 계정 및 권한 관리')");
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
  }
});

console.log(`Updated locators in ${modifiedCount} E2E files.`);
