const fs = require('fs');
const path = require('path');

const mapping = {
  'bbsNm': 'bbsTtl',
  'bbsIntrcn': 'bbsIntroCn',
  'bbsTyCode': 'bbsTypeCd',
  'bbsAttrbCode': 'bbsAttrCd',
  'replyPosblAt': 'replyPsblYn',
  'fileAtchPosblAt': 'fileAtchPsblYn',
  'atchPosblFileNumber': 'atchPsblFileCnt',
  'atchPosblFileSize': 'atchPsblFileSize', // Fixed mapping
  'useAt': 'useYn',
  'cmmntyId': 'cmntyId',
  'blogAt': 'blogYn',
  'commentAt': 'commentYn',
  'stsfdgAt': 'stsfdgYn'
};

const files = [
  'frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx',
  'frontend/src/app/admin/community/boards/maker/components/BoardPreview.tsx',
  'frontend/src/app/admin/community/boards/selectBoardList/BoardListClient.tsx',
  'frontend/src/lib/validation/schemas.ts',
  'frontend/src/app/admin/community/boards/master/page.tsx',
  'frontend/e2e/pages/BoardMasterPage.ts',
  'frontend/e2e/03-board-community.spec.ts',
  'frontend/src/app/admin/community/boards/write/page.tsx'
];

files.forEach(f => {
  const fullPath = path.resolve(f);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  Object.keys(mapping).forEach(key => {
    // Be more careful with partial matches if needed, but \b is usually safe
    const regex = new RegExp('\\b' + key + '\\b', 'g');
    content = content.replace(regex, mapping[key]);
  });
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${f}`);
});
