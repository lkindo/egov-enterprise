const fs = require('fs');
const path = require('path');

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
            
            if (content.includes('.pstId(')) {
                content = content.replace(/\.pstId\(/g, '.id(');
                changed = true;
            }
            if (content.includes('.getPstId()')) {
                content = content.replace(/\.getPstId\(\)/g, '.getId()');
                changed = true;
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Reverted pstId in: ' + fullPath);
            }
        }
    });
}

walk('foundation/src/test/java');
