const fs = require('fs');
const path = require('path');

const renames = [
    { old: /\.findByCodeGroupIdAndUseAt\(/g, new: '.findByCodeGroupIdAndUseYn(' },
    { old: /\.findTop100ByOrderByCreatDtDesc\(/g, new: '.findTop100ByOrderByCreatedDateDesc(' },
    { old: /\.getCrtDt\(\)/g, new: '.getCreatedDate()' },
    { old: /\.createdDate\("2024-01-01"\)/g, new: '.creatDt("2024-01-01")' },
    { old: /\.getCrtDt\(\)/g, new: '.getCreatDt()' }, // For DTOs
    { old: /\.selectLoginLogDetail\(logId\)/g, new: '.selectLoginLogDetail(any(LoginLogDto.class))' },
    { old: /\.selectSysLogDetail\(requestId\)/g, new: '.selectSysLogDetail(any(SysLogDto.class))' }
];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.java')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            for (const rename of renames) {
                if (rename.old.test(content)) {
                    content = content.replace(rename.old, rename.new);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated: ' + fullPath);
            }
        }
    });
}

walk('foundation/src/test/java');
