const fs = require('fs');
const path = require('path');

const renames = [
    // Missing static imports
    { old: /spy\(/g, new: 'org.mockito.Mockito.spy(' },
    
    // SatisfactionServiceTest.java fixes
    { old: /satisfactionService\.getSatisfactionList\(1L, "BBS_01"\)/g, new: 'satisfactionService.getSatisfactionList("BBS_01", 1L)' },
    { old: /satisfactionService\.getAverageSatisfaction\(1L, "BBS_01"\)/g, new: 'satisfactionService.getAverageSatisfaction("BBS_01", 1L)' },
    { old: /satisfactionService\.deleteSatisfaction\(10L\)/g, new: 'satisfactionService.deleteSatisfaction(10L, "user1", null)' },
    
    // WorkReportServiceTest.java fixes
    { old: /workReportService\.getWorkReportList\("user01", "", pageable\)/g, new: 'workReportService.getWorkReportList("user01", null, "", pageable)' },
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
                console.log('Cleaned: ' + fullPath);
            }
        }
    });
}

walk('business-suite/src/test/java');
