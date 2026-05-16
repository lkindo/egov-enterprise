const fs = require('fs');
const path = require('path');

const renames = [
    // Revert incorrect pstId renames in foundation tests
    { old: /Menu\.builder\(\)\.pstId\(/g, new: 'Menu.builder().id(' },
    { old: /CommunityUser\.builder\(\)\.pstId\(/g, new: 'CommunityUser.builder().id(' },
    { old: /AuthorityRole\.builder\(\)\.pstId\(/g, new: 'AuthorityRole.builder().id(' },
    { old: /InstitutionCodeRecptnLog\.builder\(\)\.pstId\(/g, new: 'InstitutionCodeRecptnLog.builder().id(' },
    { old: /r\.getPstId\(\)/g, new: 'r.getId()' }, // For projections if needed, but wait
    { old: /users\.get\(0\)\.getPstId\(\)/g, new: 'users.get(0).getId()' },
    { old: /\.getPstId\(\)/g, new: '.getId()' }, // General revert of getId

    // Re-apply correct pstId for Board (Pst) if context allows
    // Actually, Board entity HAS pstId field now.
    
    // Fix LoginPolicy / UserAbsence in foundation tests
    // They used .userId() but maybe it was .emplyrId() before?
    // UserAbsence entity has emplyrId field (Java), but standard SQL is USER_ID.
    // I might have missed standardizing UserAbsence Java field.
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
                console.log('Reverted/Fixed: ' + fullPath);
            }
        }
    });
}

walk('foundation/src/test/java');
walk('business-suite/src/test/java');
