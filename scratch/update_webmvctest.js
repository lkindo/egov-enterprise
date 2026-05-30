const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else if (filepath.endsWith('.java')) {
            filelist.push(filepath);
        }
    }
    return filelist;
};

const files = walkSync('d:\\project\\egov-enterprise\\api-server\\src\\test\\java');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('@WebMvcTest')) {
        let modified = false;

        // Add import for ControllerTestSupport if missing
        if (!content.includes('import nuri.business.support.ControllerTestSupport;')) {
            // Find the last import
            const lastImportIdx = content.lastIndexOf('import ');
            if (lastImportIdx !== -1) {
                const endOfLine = content.indexOf('\n', lastImportIdx);
                content = content.slice(0, endOfLine + 1) + 'import nuri.business.support.ControllerTestSupport;\n' + content.slice(endOfLine + 1);
                modified = true;
            }
        }

        // Make class extend ControllerTestSupport
        const classMatch = content.match(/class\s+(\w+Test)\s*\{/);
        if (classMatch) {
            content = content.replace(classMatch[0], `class ${classMatch[1]} extends ControllerTestSupport {`);
            modified = true;
        }

        // Remove Autowired MockMvc and ObjectMapper
        content = content.replace(/\s*@Autowired\s+private\s+MockMvc\s+mockMvc;\s*/g, '\n\n    ');
        content = content.replace(/\s*@Autowired\s+private\s+ObjectMapper\s+objectMapper;\s*/g, '\n\n    ');

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated', file);
        }
    }
}
