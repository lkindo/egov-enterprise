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

const englishTerms = [
  'Overview', 'Admin', 'System', 'Dashboard', 'User', 'Users', 'Role', 'Roles',
  'Menu', 'Menus', 'Program', 'Programs', 'Code', 'Codes', 'Notice', 'Board',
  'Boards', 'Survey', 'Surveys', 'Approval', 'Approvals', 'Workflow', 'Workflows',
  'Help', 'Support', 'Login', 'Logout', 'Register', 'Profile', 'Settings', 'Home',
  'More', 'Previous', 'Next', 'Action', 'Actions', 'Details', 'Detail', 'Description',
  'Title', 'Name', 'Date', 'Created', 'Updated', 'Status', 'Type', 'Select', 'All',
  'Refresh', 'Confirm', 'Close', 'Back', 'Clear', 'Reset', 'Download', 'Upload',
  'Import', 'Export', 'Active', 'Inactive', 'Pending', 'Approved', 'Rejected',
  'Failed', 'Success', 'Error', 'Warning', 'Info', 'Total', 'Count', 'View',
  'Password', 'Email', 'Phone', 'Address', 'Language', 'Theme', 'Light', 'Dark',
  'ID', 'Yes', 'Cancel', 'Save', 'Edit', 'Delete', 'Create', 'New', 'Submit',
  'Search', 'List', 'Category', 'Required', 'Optional', 'Message', 'Messages'
];

const translationsMap = {
  'Overview': '개요', 'Admin': '관리자', 'System': '시스템', 'Dashboard': '대시보드',
  'User': '사용자', 'Users': '사용자', 'Role': '역할', 'Roles': '역할',
  'Menu': '메뉴', 'Menus': '메뉴', 'Program': '프로그램', 'Programs': '프로그램',
  'Code': '코드', 'Codes': '코드', 'Notice': '공지사항', 'Board': '게시판',
  'Boards': '게시판', 'Survey': '설문조사', 'Surveys': '설문조사', 'Approval': '결재',
  'Approvals': '결재', 'Workflow': '워크플로우', 'Workflows': '워크플로우',
  'Help': '도움말', 'Support': '고객지원', 'Login': '로그인', 'Logout': '로그아웃',
  'Register': '회원가입', 'Profile': '내 정보', 'Settings': '설정', 'Home': '홈',
  'More': '더보기', 'Previous': '이전', 'Next': '다음', 'Action': '액션',
  'Actions': '액션', 'Details': '상세정보', 'Detail': '상세정보', 'Description': '설명',
  'Title': '제목', 'Name': '이름', 'Date': '날짜', 'Created': '생성일',
  'Updated': '수정일', 'Status': '상태', 'Type': '유형', 'Select': '선택',
  'All': '전체', 'Refresh': '새로고침', 'Confirm': '확인', 'Close': '닫기',
  'Back': '뒤로가기', 'Clear': '초기화', 'Reset': '초기화', 'Download': '다운로드',
  'Upload': '업로드', 'Import': '가져오기', 'Export': '내보내기', 'Active': '활성',
  'Inactive': '비활성', 'Pending': '대기중', 'Approved': '승인됨', 'Rejected': '거절됨',
  'Failed': '실패', 'Success': '성공', 'Error': '오류', 'Warning': '경고',
  'Info': '정보', 'Total': '총', 'Count': '개수', 'View': '조회',
  'Password': '비밀번호', 'Email': '이메일', 'Phone': '전화번호', 'Address': '주소',
  'Language': '언어', 'Theme': '테마', 'Light': '라이트', 'Dark': '다크',
  'ID': '아이디', 'Yes': '네', 'Cancel': '취소', 'Save': '저장', 'Edit': '수정',
  'Delete': '삭제', 'Create': '생성', 'New': '신규', 'Submit': '제출',
  'Search': '검색', 'List': '목록', 'Category': '분류', 'Required': '필수',
  'Optional': '선택', 'Message': '메시지', 'Messages': '메시지'
};

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  englishTerms.forEach(eng => {
    const kor = translationsMap[eng];
    // 1. >Text<
    let regex = new RegExp('>' + eng + '<', 'g');
    newContent = newContent.replace(regex, '>' + kor + '<');
    
    // 2. > Text <
    regex = new RegExp('>\\\\s*' + eng + '\\\\s*<', 'g');
    newContent = newContent.replace(regex, '> ' + kor + ' <');

    // 3. "Text" as prop value e.g. label="Text"
    const attrs = ['placeholder', 'title', 'label', 'tooltip', 'description'];
    attrs.forEach(attr => {
      newContent = newContent.replace(new RegExp(attr + '="' + eng + '"', 'g'), attr + '="' + kor + '"');
      newContent = newContent.replace(new RegExp(attr + "='" + eng + "'", 'g'), attr + "='" + kor + "'");
      
      // Also catch dynamic variants like placeholder="Search members..."
      newContent = newContent.replace(new RegExp(attr + '="' + eng + ' ([^"]+)"', 'g'), attr + '="' + kor + ' "');
    });

    // 4. {"Text"} or {'Text'}
    newContent = newContent.replace(new RegExp('\\\\{"' + eng + '"\\\\}', 'g'), '{"' + kor + '"}');
    newContent = newContent.replace(new RegExp("\\\\{'" + eng + "'\\\\}", 'g'), "{'" + kor + "'}");
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
  }
});

console.log('Very aggressively modified ' + modifiedCount + ' files.');
