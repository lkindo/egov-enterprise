const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.java')) {
            results.push(file);
        }
    });
    return results;
}

const dirs = [
    'd:/project/egov-enterprise/api-server/src/test/java',
    'd:/project/egov-enterprise/common-service/src/test/java'
];

dirs.forEach(dir => {
    const files = walk(dir);
    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let lines = content.split(/\r?\n/);
        let modified = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // Fix triple/quadruple quote mess
            if (line.includes('""""')) {
                line = line.replace('""""', '"""');
                modified = true;
            }
            if (line.includes('"""))"')) {
                line = line.replace('"""))"', '"""))');
                modified = true;
            }
            if (line.includes('formatted(userId, index");')) {
                line = line.replace('formatted(userId, index");', 'formatted(userId, index);');
                modified = true;
            }

            // Fix unclosed quotes in isEqualTo
            if (line.includes('isEqualTo("') && !line.includes('");')) {
                if (line.trimEnd().endsWith(')')) {
                    line = line.replace(/\)\s*$/, '");');
                    modified = true;
                }
            }

            lines[i] = line;
        }

        if (modified) {
            fs.writeFileSync(file, lines.join('\n'), 'utf8');
            console.log('Cleaned: ' + file);
        }
    });
});
