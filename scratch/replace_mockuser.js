const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const targetDirs = [
    'd:/project/egov-enterprise/api-server/src/test/java',
    'd:/project/egov-enterprise/business-suite/src/test/java'
];

targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        walkDir(dir, filePath => {
            if (filePath.endsWith('Test.java')) {
                let content = fs.readFileSync(filePath, 'utf8');
                let modified = false;

                // Replace @WithMockUser imports
                if (content.includes('org.springframework.security.test.context.support.WithMockUser')) {
                    content = content.replace(
                        /import org\.springframework\.security\.test\.context\.support\.WithMockUser;/g,
                        'import nuri.business.security.annotation.WithMockCustomUser;'
                    );
                    modified = true;
                }

                // Replace @WithMockUser(...) occurrences
                if (content.includes('@WithMockUser')) {
                    // Match @WithMockUser(roles = "ADMIN") -> @WithMockCustomUser(role = "ADMIN")
                    // Match @WithMockUser(username = "test") -> @WithMockCustomUser(username = "test", esntlId = "test")
                    content = content.replace(/@WithMockUser\s*\(([^)]+)\)/g, (match, args) => {
                        let newArgs = args;
                        // Map roles = "X" to role = "X"
                        newArgs = newArgs.replace(/roles\s*=\s*\{?\s*"([^"]+)"\s*\}?/, 'role = "$1"');
                        // Add esntlId if username exists
                        let userMatch = newArgs.match(/username\s*=\s*"([^"]+)"/);
                        if (userMatch) {
                            newArgs += `, esntlId = "${userMatch[1]}"`;
                        }
                        return `@WithMockCustomUser(${newArgs})`;
                    });
                    
                    // Replace @WithMockUser without args
                    content = content.replace(/@WithMockUser(?!\w|\()/g, '@WithMockCustomUser');
                    modified = true;
                }

                if (modified) {
                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log('Modified: ' + filePath);
                }
            }
        });
    }
});
