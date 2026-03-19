const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'src');

const aggressiveTranslations = {
  // aggressive placeholder search
  'placeholder="Search[^"]*"': 'placeholder="검색..."',
  "placeholder='Search[^']*'": "placeholder='검색...'",
  
  // common buttons or text
  '>\\s*Save Changes\\s*<': '>변경사항 저장<',
  '>\\s*Save\\s*<': '>저장<',
  '>\\s*Cancel\\s*<': '>취소<',
  '>\\s*Submit\\s*<': '>제출<',
  '>\\s*Confirm\\s*<': '>확인<',
  '>\\s*Update\\s*<': '>업데이트<',
  '>\\s*Edit\\s*<': '>수정<',
  '>\\s*Delete\\s*<': '>삭제<',
  '>\\s*Create\\s*<': '>생성<',
  '>\\s*Add\\s*<': '>추가<',
  '>\\s*Close\\s*<': '>닫기<',
  '>\\s*View\\s*<': '>보기<',
  '>\\s*Next\\s*<': '>다음<',
  '>\\s*Previous\\s*<': '>이전<',
  '>\\s*Upload\\s*<': '>업로드<',
  '>\\s*Download\\s*<': '>다운로드<',
  '>\\s*Refresh\\s*<': '>새로고침<',
  '>\\s*Reset\\s*<': '>초기화<',
  '>\\s*Clear\\s*<': '>초기화<',
  '>\\s*Search\\s*<': '>검색<',
  '>\\s*Back\\s*<': '>뒤로<',
  '>\\s*Title\\s*<': '>제목<',
  '>\\s*Status\\s*<': '>상태<',
  '>\\s*Date\\s*<': '>날짜<',
  '>\\s*Author\\s*<': '>작성자<',
  '>\\s*Description\\s*<': '>설명<',

  // Literal string mappings, be careful so we just do object values or simple strings
  // but let's avoid replacing keys like `Edit: ...`
  // We can do this safely if they are within JSX brackets `{"Save"}` etc.
  '\\{\\s*"Save"\\s*\\}': '{"저장"}',
  '\\{\\s*"Cancel"\\s*\\}': '{"취소"}',
  '\\{\\s*"Submit"\\s*\\}': '{"제출"}',
  '\\{\\s*"Confirm"\\s*\\}': '{"확인"}',
  '\\{\\s*"Update"\\s*\\}': '{"업데이트"}',
  '\\{\\s*"Edit"\\s*\\}': '{"수정"}',
  '\\{\\s*"Delete"\\s*\\}': '{"삭제"}',
  '\\{\\s*"Create"\\s*\\}': '{"생성"}',
  '\\{\\s*"Add"\\s*\\}': '{"추가"}',
  '\\{\\s*"Close"\\s*\\}': '{"닫기"}',
  '\\{\\s*"View"\\s*\\}': '{"보기"}',
  '\\{\\s*"Search"\\s*\\}': '{"검색"}',
  
  // also matching single quotes
  "\\{\\s*'Save'\\s*\\}": "{'저장'}",
  "\\{\\s*'Cancel'\\s*\\}": "{'취소'}",
  "\\{\\s*'Submit'\\s*\\}": "{'제출'}",
  "\\{\\s*'Confirm'\\s*\\}": "{'확인'}",
  "\\{\\s*'Update'\\s*\\}": "{'업데이트'}",
  "\\{\\s*'Edit'\\s*\\}": "{'수정'}",
  "\\{\\s*'Delete'\\s*\\}": "{'삭제'}",
  "\\{\\s*'Create'\\s*\\}": "{'생성'}",
  "\\{\\s*'Add'\\s*\\}": "{'추가'}",
  "\\{\\s*'Close'\\s*\\}": "{'닫기'}",
  "\\{\\s*'View'\\s*\\}": "{'보기'}",
  "\\{\\s*'Search'\\s*\\}": "{'검색'}",
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

  Object.keys(aggressiveTranslations).forEach(regexStr => {
    const replacement = aggressiveTranslations[regexStr];
    // use 'gi' for case-insensitive matching where applicable
    const regex = new RegExp(regexStr, 'gi');
    content = content.replace(regex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Modified ${modifiedCount} files.`);
