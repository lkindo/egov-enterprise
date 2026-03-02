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

            // Fix unclosed quotes in .formatted()
            if (line.match(/\.formatted\(.*"\);$/)) {
                line = line.replace(/([^"]+)"\);$/, '$1);');
                modified = true;
            }

            // Fix lack of newline after double-slash comments containing Korean text
            // Pattern: // <Korean/Garbage> <Code>
            // We look for // followed by non-ascii characters and then some common code patterns
            if (line.includes('//') && line.match(/\/\/.*[^\x00-\x7F].*(latch\.await|long |mockMvc|when|return|assertThat|userService|Thread|System|for |if |try )/)) {
                let parts = line.split(/(\/\/.*[^\x00-\x7F].*)(latch\.await|long |mockMvc|when|return|assertThat|userService|Thread|System|for |if |try )/);
                if (parts.length > 2) {
                    // Re-insert leading whitespace for the code part
                    let indent = line.match(/^\s*/)[0];
                    line = parts[1] + "\n" + indent + parts[2] + parts.slice(3).join('');
                    modified = true;
                }
            }

            // Fix specifically broken line in StressTest.java 533-535 area
            if (line.includes('latch.await(60, TimeUnit.SECONDS);') && line.includes('//')) {
                let indent = line.match(/^\s*/)[0];
                line = line.replace('latch.await(60, TimeUnit.SECONDS);', '\n' + indent + 'latch.await(60, TimeUnit.SECONDS);');
                modified = true;
            }

            lines[i] = line;
        }

        if (modified) {
            fs.writeFileSync(file, lines.join('\n'), 'utf8');
            console.log('Processed (v2): ' + file);
        }
    });
});
