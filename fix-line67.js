const fs = require('fs');
const file = 'd:\\project\\egov-enterprise\\frontend\\src\\app\\mypage\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix line 67 - missing closing quote
content = content.replace(
  /label: '.*?icon: <Lock size=\{16\} \/> }/,
  "label: 'Change Password', icon: <Lock size={16} /> }"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed line 67');
