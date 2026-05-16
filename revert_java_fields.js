const fs = require('fs');
const path = require('path');

const renames = [
    // Board
    { old: /\.pstId\(/g, new: '.nttId(' },
    { old: /\.pstTtl\(/g, new: '.nttSj(' },
    { old: /\.pstCn\(/g, new: '.nttCn(' },
    { old: /\.pstSn\(/g, new: '.nttNo(' },
    { old: /\.getPstId\(\)/g, new: '.getNttId()' },
    { old: /\.getPstTtl\(\)/g, new: '.getNttSj()' },
    { old: /\.getPstCn\(\)/g, new: '.getNttCn()' },
    { old: /\.getPstSn\(\)/g, new: '.getNttNo()' },

    // WorkReport
    { old: /\.reprtId\(/g, new: '.reportId(' },
    { old: /\.reprtTtl\(/g, new: '.reportSubject(' },
    { old: /\.reprtCn\(/g, new: '.reportContents(' },
    { old: /\.getReprtId\(\)/g, new: '.getReportId()' },
    { old: /\.getReprtTtl\(\)/g, new: '.getReportSubject()' },
    { old: /\.getReprtCn\(\)/g, new: '.getReportContents()' },

    // Restde
    { old: /\.restdeYmd\(/g, new: '.restdeDe(' },
    { old: /\.restdeExpln\(/g, new: '.restdeDc(' },
    { old: /\.restdeSeCd\(/g, new: '.restdeSeCode(' },
    { old: /\.getRestdeYmd\(\)/g, new: '.getRestdeDe()' },
    { old: /\.getRestdeExpln\(\)/g, new: '.getRestdeDc()' },
    { old: /\.getRestdeSeCd\(\)/g, new: '.getRestdeSeCode()' },
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
                console.log('Reverted Java fields in: ' + fullPath);
            }
        }
    });
}

walk('business-suite/src/test/java');
walk('business-suite/src/main/java');
walk('api-server/src/test/java');
walk('api-server/src/main/java');
