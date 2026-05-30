const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
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

const javaFiles = walk('d:/project/egov-enterprise/api-server/src/main/java');
javaFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('private final') && content.includes('Service') && content.includes('Controller')) {
        const lines = content.split('\n');
        lines.forEach(line => {
            if (line.includes('private final') && line.includes('Service ')) {
                const serviceName = line.split('private final')[1].trim().split(' ')[0];
                if (!serviceName.startsWith('Egov') && !serviceName.endsWith('Interface')) {
                    // It might be a concrete class instead of Egov...Service
                    console.log(`[${path.basename(file)}]: ${line.trim()}`);
                }
            }
        });
    }
});
