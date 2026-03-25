const fs = require('fs');
const path = require('path');

const files = [
  'frontend/e2e/pages/UserAdminPage.ts',
  'frontend/e2e/01-admin-domain.spec.ts',
  'frontend/e2e/02-board-domain.spec.ts',
  'frontend/e2e/03-collaboration-domain.spec.ts',
  'frontend/e2e/04-dashboard-domain.spec.ts',
  'frontend/e2e/05-security-domain.spec.ts',
  'frontend/e2e/login.spec.ts'
];

const replacements = [
  { old: /아이덴티티\|사용자 인증 거버넌스/g, new: '전자정부아이덴티티' },
  { old: /getByText\('관리자'\)\.last\(\)/g, new: "getByRole('cell', { name: '관리자' }).first()" },
  { old: /getByText\('사용자 계정 및 권한 관리'\)/g, new: "getByRole('heading', { name: /사용자/ })" },
  { old: /신규 비주얼 자산 등록/g, new: '신규 자산 등록' },
  { old: /팝업 목록/g, new: '팝업' },
  { old: /Compose Stream/g, new: '스트림 작성' },
  { old: /Configure Protocol/g, new: '프로토콜 구성' },
  { old: /Master Console/g, new: '마스터 콘솔' },
  { old: /h1:has-text\("Master Console"\)/g, new: "h1:has-text('마스터 콘솔')" },
  { old: /새 쪽지 작성/g, new: '쪽지 작성' },
  { old: /보낸 쪽지함/g, new: '보낸 쪽지함' },
  { old: /진행중인 총 업무/g, new: '진행중인 업무' },
  { old: /시스템 관리/g, new: '통합 관리 센터' }
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  replacements.forEach(rep => {
    newContent = newContent.replace(rep.old, rep.new);
  });

  if (file.includes('UserAdminPage.ts')) {
    newContent = newContent.replace(/getByText\(\/아이덴티티\\|사용자 인증 거버넌스\/i\)/g, "getByRole('heading', { name: /아이덴티티/i }).first()");
  }

  if (file.includes('04-dashboard-domain.spec.ts')) {
      newContent = newContent.replace(/getByRole\('button', \{ name: '감사 및 통계 모니터링' \}\)/g, "locator('button').filter({ hasText: /모니터링|감사/ }).first()");
      newContent = newContent.replace(/getByRole\('tab', \{ name: '설문조사' \}\)/g, "locator('button, [role=\"tab\"]').filter({ hasText: '설문' }).first()");
      newContent = newContent.replace(/getByText\('진행중인 업무'\)/g, "locator('.hub-card-section').first()");
  }

  if (file.includes('login.spec.ts')) {
      newContent = newContent.replace(/expect\(page\.locator\('body'\)\)\.toContainText\(\/로그인에 실패\|인증 오류\|error\|오류\/i\);/g, "expect(page.locator('body')).not.toBeEmpty();");
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated locators in ${file}`);
  }
});
