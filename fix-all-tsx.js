const fs = require('fs');
const path = require('path');

const frontendDir = 'd:\\project\\egov-enterprise\\frontend\\src';

// Find all tsx files
function findTsxFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results = results.concat(findTsxFiles(fullPath));
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  
  return results;
}

const files = findTsxFiles(frontendDir);
console.log('Found', files.length, 'tsx/ts files');

let fixedCount = 0;
files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Replace Korean strings with English equivalents
    // This is a temporary fix for encoding issues
    
    // Fix title attributes
    content = content.replace(/title="[^"]*?"/g, (match) => {
      if (match.includes('Terms') || match.includes('약관')) return 'title="Terms of Service"';
      if (match.includes('Profile') || match.includes('프로필')) return 'title="Profile Settings"';
      if (match.includes('Workspace') || match.includes('워크스페이스')) return 'title="Personal Workspace"';
      if (match.includes('Dashboard') || match.includes('대시보드')) return 'title="Dashboard"';
      if (match.includes('Settings') || match.includes('설정')) return 'title="Settings"';
      if (match.includes('Statistics') || match.includes('통계')) return 'title="Statistics"';
      if (match.includes('Board') || match.includes('게시판')) return 'title="Board"';
      if (match.includes('Schedule') || match.includes('일정')) return 'title="Schedule"';
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
      if (match.includes('Board') || match.includes('게시판')) return "label: 'Board'";
      if (match.includes('Schedule') || match.includes('일정')) return "label: 'Schedule'";
      if (match.includes('Settings') || match.includes('설정')) return "label: 'Settings'";
      return "label: 'Settings'";
    });
    
    // Fix broken JSX strings (missing closing quotes)
    content = content.replace(
      /label: '[^']*?icon: <(Lock|User|Zap|Home|Settings) size=\{16\} \/>/g,
      (match) => {
        if (match.includes('Lock')) return "label: 'Change Password', icon: <Lock size={16} />";
        if (match.includes('User')) return "label: 'Profile', icon: <User size={16} />";
        if (match.includes('Zap')) return "label: 'Dashboard', icon: <Zap size={16} />";
        return "label: 'Settings', icon: <Settings size={16} />";
      }
    );
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      fixedCount++;
      if (fixedCount <= 10) {
        console.log('Fixed:', path.relative(frontendDir, file));
      }
    }
  } catch (err) {
    console.log('Error processing:', file, err.message);
  }
});

console.log(`\nFixed ${fixedCount} files out of ${files.length} total.`);
