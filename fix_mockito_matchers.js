const fs = require('fs');
const path = require('path');

const renames = [
    { old: /boardMasterService\.createBoardMaster\("user1",/g, new: 'boardMasterService.createBoardMaster(eq("user1"),' },
    { old: /boardMasterService\.updateBoardMaster\("user1",/g, new: 'boardMasterService.updateBoardMaster(eq("user1"),' },
    { old: /boardMasterService\.deleteBoardMaster\("user1",/g, new: 'boardMasterService.deleteBoardMaster(eq("user1"),' },
    { old: /memoReportService\.createMemoReport\("user1",/g, new: 'memoReportService.createMemoReport(eq("user1"),' },
    { old: /memoReportService\.updateMemoReport\("user1",/g, new: 'memoReportService.updateMemoReport(eq("user1"),' },
    { old: /scheduleService\.createSchedule\("user1",/g, new: 'scheduleService.createSchedule(eq("user1"),' },
    { old: /scheduleService\.updateSchedule\("user1",/g, new: 'scheduleService.updateSchedule(eq("user1"),' },
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
                console.log('Fixed Mockito matchers: ' + fullPath);
            }
        }
    });
}

walk('business-suite/src/test/java');
