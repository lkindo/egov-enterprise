const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'src');

const translations = {
  'Search': '검색',
  'Search...': '검색...',
  'List': '목록',
  'Edit': '수정',
  'Delete': '삭제',
  'Save': '저장',
  'Cancel': '취소',
  'Create': '생성',
  'New': '신규',
  'Submit': '제출',
  'View': '보기',
  'User': '사용자',
  'Users': '사용자',
  'Admin': '관리자',
  'System': '시스템',
  'Settings': '설정',
  'Board': '게시판',
  'Notice': '공지사항',
  'Dashboard': '대시보드',
  'Status': '상태',
  'Options': '옵션',
  'Info': '정보',
  'Detail': '상세',
  'Details': '상세',
  'Title': '제목',
  'Name': '이름',
  'ID': '아이디',
  'Description': '설명',
  'Content': '내용',
  'Type': '유형',
  'Date': '날짜',
  'Action': '작업',
  'Actions': '작업',
  'Approve': '승인',
  'Reject': '반려',
  'Close': '닫기',
  'Back': '뒤로',
  'Confirm': '확인',
  'Update': '업데이트',
  'Add': '추가',
  'Remove': '제거',
  'Select': '선택',
  'Clear': '초기화',
  'Reset': '초기화',
  'Next': '다음',
  'Previous': '이전',
  'Login': '로그인',
  'Logout': '로그아웃',
  'Register': '등록',
  'Menu': '메뉴',
  'Profile': '프로필',
  'Password': '비밀번호',
  'Email': '이메일',
  'Role': '역할',
  'Roles': '역할',
  'Permission': '권한',
  'Permissions': '권한',
  'Department': '부서',
  'Company': '회사',
  'Phone': '전화번호',
  'Address': '주소',
  'Author': '작성자',
  'Created At': '생성일',
  'Updated At': '수정일',
  'Code': '코드',
  'Value': '값',
  'Category': '카테고리',
  'Group': '그룹',
  'Level': '레벨',
  'Order': '순서',
  'Active': '활성',
  'Inactive': '비활성',
  'Yes': '예',
  'No': '아니오',
  'All': '전체',
  'None': '없음',
  'Loading...': '로딩 중...',
  'No data': '데이터 없음',
  'No results found': '검색 결과 없음',
  'Please select': '선택해주세요',
  'Required': '필수',
  'Success': '성공',
  'Error': '오류',
  'Warning': '경고',
  'Information': '정보',
  'File': '파일',
  'Files': '파일',
  'Upload': '업로드',
  'Download': '다운로드',
  'Image': '이미지',
  'Images': '이미지',
  'Video': '비디오',
  'Audio': '오디오',
  'Document': '문서',
  'Text': '텍스트',
  'Link': '링크',
  'URL': 'URL',
  'Key': '키',
  'Filter': '필터',
  'Sort': '정렬',
  'Item': '항목',
  'Items': '항목',
  'Page': '페이지',
  'Total': '총',
  'Count': '개수',
  'Sum': '합계',
  'Average': '평균',
  'Minimum': '최소',
  'Maximum': '최대',
  'Amount': '금액',
  'Price': '가격',
  'Cost': '비용',
  'Fee': '수수료',
  'Tax': '세금',
  'Discount': '할인',
  'Rate': '비율',
  'Ratio': '비율',
  'Percent': '퍼센트',
  'Year': '년',
  'Month': '월',
  'Week': '주',
  'Day': '일',
  'Hour': '시간',
  'Minute': '분',
  'Second': '초',
  'Time': '시간',
  'Period': '기간',
  'Duration': '기간',
  'Start': '시작',
  'End': '종료',
  'Management': '관리',
  'Manage': '관리',
  'Refresh': '새로고침'
};

function walk(directory) {
  let results = [];
  if (!fs.existsSync(directory)) return results;
  const list = fs.readdirSync(directory);
  list.forEach(file => {
    file = path.join(directory, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  Object.keys(translations).forEach(eng => {
    const kor = translations[eng];
    
    // Replace >English< (with optional whitespace)
    const regexTag = new RegExp(`>(\\s*)${eng}(\\s*)<`, 'g');
    content = content.replace(regexTag, `>$1${kor}$2<`);
    
    // Replace placeholder="English"
    const regexPlaceholder1 = new RegExp(`placeholder="${eng}"`, 'g');
    content = content.replace(regexPlaceholder1, `placeholder="${kor}"`);
    
    const regexPlaceholder2 = new RegExp(`placeholder='${eng}'`, 'g');
    content = content.replace(regexPlaceholder2, `placeholder='${kor}'`);
    
    // Replace title="English"
    const regexTitle1 = new RegExp(`title="${eng}"`, 'g');
    content = content.replace(regexTitle1, `title="${kor}"`);
    
    const regexTitle2 = new RegExp(`title='${eng}'`, 'g');
    content = content.replace(regexTitle2, `title='${kor}'`);
    
    // Replace label="English"
    const regexLabel1 = new RegExp(`label="${eng}"`, 'g');
    content = content.replace(regexLabel1, `label="${kor}"`);
    
    const regexLabel2 = new RegExp(`label='${eng}'`, 'g');
    content = content.replace(regexLabel2, `label='${kor}'`);

    // Replace {"English"}
    const regexExpr1 = new RegExp(`\\{\\s*"${eng}"\\s*\\}`, 'g');
    content = content.replace(regexExpr1, `{"${kor}"}`);
    
    const regexExpr2 = new RegExp(`\\{\\s*'${eng}'\\s*\\}`, 'g');
    content = content.replace(regexExpr2, `{'${kor}'}`);

    // Replace label: "English" (for options/columns)
    const regexObjLabel1 = new RegExp(`label\\s*:\\s*"${eng}"`, 'g');
    content = content.replace(regexObjLabel1, `label: "${kor}"`);

    const regexObjLabel2 = new RegExp(`label\\s*:\\s*'${eng}'`, 'g');
    content = content.replace(regexObjLabel2, `label: '${kor}'`);

    const regexObjHeader1 = new RegExp(`header\\s*:\\s*"${eng}"`, 'g');
    content = content.replace(regexObjHeader1, `header: "${kor}"`);

    const regexObjHeader2 = new RegExp(`header\\s*:\\s*'${eng}'`, 'g');
    content = content.replace(regexObjHeader2, `header: '${kor}'`);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Modified ${modifiedCount} files.`);
