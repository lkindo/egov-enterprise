const fs = require('fs');
const path = require('path');

const renames = [
    { old: /jsonPath\("\$\.data\.list\[0\]\.nttId"\)/g, new: 'jsonPath("$.data.list[0].pstId")' },
    { old: /jsonPath\("\$\.data\.list\[0\]\.nttSj"\)/g, new: 'jsonPath("$.data.list[0].pstTtl")' },
    { old: /jsonPath\("\$\.data\.list\[0\]\.nttCn"\)/g, new: 'jsonPath("$.data.list[0].pstCn")' },
    { old: /jsonPath\("\$\.data\.list\[0\]\.bbsNm"\)/g, new: 'jsonPath("$.data.list[0].bbsTtl")' },
    { old: /jsonPath\("\$\.data\.cmmntyId"\)/g, new: 'jsonPath("$.data.cmntyId")' },
    { old: /jsonPath\("\$\.data\.cmmntyNm"\)/g, new: 'jsonPath("$.data.cmntyTtl")' },
    { old: /jsonPath\("\$\.data\.articleId"\)/g, new: 'jsonPath("$.data.pstId")' },
    { old: /jsonPath\("\$\.data\.rptId"\)/g, new: 'jsonPath("$.data.reprtId")' },
    { old: /jsonPath\("\$\.data\.rptTtl"\)/g, new: 'jsonPath("$.data.reprtTtl")' },
    { old: /jsonPath\("\$\.data\.qestnSj"\)/g, new: 'jsonPath("$.data.qestnTtl")' },
    { old: /jsonPath\("\$\.data\.id"\)/g, new: 'jsonPath("$.data.pstId")' },
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
                console.log('Fixed jsonPath: ' + fullPath);
            }
        }
    });
}

walk('business-suite/src/test/java');
