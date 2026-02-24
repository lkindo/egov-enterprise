const fs = require('fs');

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
  const original = content;
  
  // Replace any non-ASCII characters in strings with English equivalents
  // This is a brute-force approach to fix encoding issues
  
  // Fix title attributes
  content = content.replace(/title="[^"]*?"/g, (match) => {
    const hasTerms = match.includes('Terms') || match.includes('약관');
    const hasProfile = match.includes('Profile') || match.includes('프로필');
    const hasWorkspace = match.includes('Workspace') || match.includes('워크스페이스');
    if (hasTerms) return 'title="Terms of Service"';
    if (hasProfile) return 'title="Profile Settings"';
    if (hasWorkspace) return 'title="Personal Workspace"';
    return 'title="Settings"';
  });
  
  // Fix label attributes  
  content = content.replace(/label: '[^']*?'/g, (match) => {
    if (match.includes('Dashboard') || match.includes('대시보드')) return "label: 'Dashboard'";
    if (match.includes('Profile') || match.includes('프로필')) return "label: 'Profile'";
    if (match.includes('Password') || match.includes('비밀번호')) return "label: 'Change Password'";
    if (match.includes('Terms') || match.includes('약관')) return "label: 'Terms'";
    if (match.includes('My') || match.includes('마이')) return "label: 'My Page'";
    if (match.includes('Home') || match.includes('홈')) return "label: 'Home'";
    return "label: 'Settings'";
  });
  
  // Fix the broken line 67 issue - missing closing quote
  content = content.replace(
    /label: '[^']*?icon: <Lock size=\{16\} \/> }/,
    "label: 'Change Password', icon: <Lock size={16} /> }"
  );
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file.split('\\').pop());
  } else {
    console.log('No changes:', file.split('\\').pop());
  }
});

console.log('Done!');
