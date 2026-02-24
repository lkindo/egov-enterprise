const fs = require('fs');
const path = require('path');

const files = [
  'd:\\project\\egov-enterprise\\frontend\\src\\app\\mypage\\page.tsx',
  'd:\\project\\egov-enterprise\\frontend\\src\\app\\admin\\system\\terms\\page.tsx',
  'd:\\project\\egov-enterprise\\frontend\\src\\app\\mypage\\profile\\page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('File not found:', file);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix line 67 - missing closing quote in mypage/page.tsx
  content = content.replace(
    /label: '.*?icon: <Lock size=\{16\} \/> }/,
    "label: 'Change Password', icon: <Lock size={16} /> }"
  );
  
  // Replace all Korean strings with English
  content = content.replace(/title=".*?"/g, (match) => {
    if (match.includes('Workspace')) return 'title="Personal Workspace"';
    if (match.includes('Terms')) return 'title="Terms of Service"';
    if (match.includes('Profile')) return 'title="Profile Settings"';
    return 'title="Settings"';
  });
  
  content = content.replace(/label: '.*?'/g, (match) => {
    if (match.includes('Dashboard')) return "label: 'Dashboard'";
    if (match.includes('Profile')) return "label: 'Profile'";
    if (match.includes('Password')) return "label: 'Change Password'";
    if (match.includes('Terms')) return "label: 'Terms'";
    if (match.includes('Home')) return "label: 'Home'";
    if (match.includes('mypage')) return "label: 'My Page'";
    return "label: 'Settings'";
  });
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed:', path.basename(file));
});

console.log('All files fixed!');
