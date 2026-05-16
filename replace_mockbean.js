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
            
            if (content.includes('@MockBean')) {
                content = content.replace(/@MockBean/g, '@MockitoBean');
                if (!content.includes('import org.springframework.test.context.bean.override.mockito.MockitoBean;')) {
                    content = content.replace(/import org.springframework.boot.test.mock.mockito.MockBean;/g, 'import org.springframework.test.context.bean.override.mockito.MockitoBean;');
                }
                changed = true;
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Replaced @MockBean in: ' + fullPath);
            }
        }
    });
}

walk('api-server/src/test/java');
walk('foundation/src/test/java');
walk('business-suite/src/test/java');
