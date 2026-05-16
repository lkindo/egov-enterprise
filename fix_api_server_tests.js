const fs = require('fs');
const path = require('path');

const renames = [
    { old: /\.statusCode\("A"\)/g, new: '.userSttsCd("A")' },
    { old: /\.id\(1L\)/g, new: '.pstId(1L)' },
    { old: /new UserDto\("adminUser", "[^"]+", "USR_0000000000000001", "ADMIN", null, null, null\)/g, new: 'UserDto.builder().userId("adminUser").userNm("관리자").esntlId("USR_0000000000000001").role("ADMIN").build()' },
    { old: /new UserDto\(safeUserId, maliciousUserName, "USR00001", null, null, null, null\)/g, new: 'UserDto.builder().userId(safeUserId).userNm(maliciousUserName).esntlId("USR00001").build()' },
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
                console.log('Fixed api-server test: ' + fullPath);
            }
        }
    });
}

walk('api-server/src/test/java');
