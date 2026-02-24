const fs = require('fs');

const files = [
  'd:\\project\\egov-enterprise\\frontend\\src\\app\\mypage\\page.tsx',
  'd:\\project\\egov-enterprise\\frontend\\src\\app\\admin\\system\\terms\\page.tsx',
  'd:\\project\\egov-enterprise\\frontend\\src\\app\\mypage\\profile\\page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace all Korean strings with English
  content = content.replace(/title=".*?"/g, (match) => {
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
    return "label: 'Settings'";
  });
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed:', file);
});

console.log('All files fixed!');
