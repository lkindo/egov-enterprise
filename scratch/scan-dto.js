const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

const paths = [
    'd:/project/egov-enterprise/business-suite/src/main/java',
    'd:/project/egov-enterprise/api-server/src/main/java'
];
let files = [];
paths.forEach(p => {
    files = files.concat(walk(p).filter(f => f.endsWith('.java')));
});

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const filename = path.basename(file);
    const isDto = file.includes('dto') || filename.endsWith('Dto.java') || filename.endsWith('Request.java') || filename.endsWith('Response.java') || filename.endsWith('SearchResult.java') || filename.endsWith('Result.java');
    const isEntity = content.includes('@Entity');
    
    if (isDto || isEntity) {
        const hasLombok = /@(Getter|Setter|Data|Value|SuperBuilder|NoArgsConstructor|AllArgsConstructor)/.test(content);
        const lines = content.split('\n');
        let manualGetters = [];
        let manualSetters = [];
        let jsonIgnoreLines = [];
        
        lines.forEach((line, idx) => {
            const lineNum = idx + 1;
            
            // Collect @JsonIgnore annotations
            if (line.includes('@JsonIgnore')) {
                jsonIgnoreLines.push({ lineNum, text: line.trim() });
            }
            
            // Match public getters (getNm, isNm)
            const getterMatch = line.match(/public\s+([A-Za-z0-9<>_\[\]\s]+)\s+(get|is)([A-Z][A-Za-z0-9_]*)\s*\(\s*\)/);
            if (getterMatch) {
                const returnType = getterMatch[1].trim();
                const prefix = getterMatch[2];
                const methodName = getterMatch[3];
                
                // Exclude framework override methods
                const isLegacyProperty = !['Class', 'Authorities', 'Credentials', 'Details', 'Enabled', 'AccountNonExpired', 'AccountNonLocked', 'CredentialsNonExpired'].includes(methodName);
                if (isLegacyProperty) {
                    manualGetters.push({ lineNum, text: line.trim() });
                }
            }
            
            // Match public setters
            const setterMatch = line.match(/public\s+void\s+set([A-Z][A-Za-z0-9_]*)\s*\(/);
            if (setterMatch) {
                const methodName = setterMatch[1];
                manualSetters.push({ lineNum, text: line.trim() });
            }
        });
        
        // 만약 롬복이 선언되어 있는 경우에만 중복 Getter/Setter를 로깅 (요구사항 1)
        if (hasLombok && (manualGetters.length > 0 || manualSetters.length > 0)) {
            // Spring Security CustomUserDetails 등 예외 대상 검증
            if (filename.includes('CustomUserDetails') || filename.includes('UserDetails')) {
                return; // Spring Security 관련 규격은 제외
            }
            
            console.log(`File: ${file.replace(/\\/g, '/')}`);
            console.log(`  [Has Lombok: Yes]`);
            if (manualGetters.length > 0) {
                console.log('  Manual Getters:');
                manualGetters.forEach(g => console.log(`    Line ${g.lineNum}: ${g.text}`));
            }
            if (manualSetters.length > 0) {
                console.log('  Manual Setters:');
                manualSetters.forEach(s => console.log(`    Line ${s.lineNum}: ${s.text}`));
            }
            if (jsonIgnoreLines.length > 0) {
                console.log('  JsonIgnore occurrences:');
                jsonIgnoreLines.forEach(ji => console.log(`    Line ${ji.lineNum}: ${ji.text}`));
            }
        } else if (!hasLombok && (manualGetters.length > 3 || manualSetters.length > 3)) {
            // 롬복이 전혀 적용되지 않았으면서 수동 Getter/Setter가 과도하게 많은 레거시도 감지
            console.log(`File: ${file.replace(/\\/g, '/')} (WARNING: NO LOMBOK FOUND, BUT MANY MANUAL GETTERS/SETTERS)`);
            console.log(`  Manual Getters count: ${manualGetters.length}, Setters count: ${manualSetters.length}`);
        }
    }
});
