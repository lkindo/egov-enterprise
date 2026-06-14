const fs = require('fs');
const path = require('path');

function camelToSnake(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

const targetDir = path.join(__dirname, '..', 'business-suite', 'src', 'main', 'java', 'nuri', 'business', 'domain');
let modifiedCount = 0;
let totalRemovedCount = 0;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath, callback);
        } else if (f.endsWith('.java')) {
            callback(fullPath);
        }
    });
}

function refactorFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let isModified = false;
    
    // 1단계: @Column(name = "xxx") 단독 사용 중 필드 스네이크 케이스와 일치하는 경우 어노테이션 라인 전체 제거
    // 멀티라인 어노테이션들과 필드를 매치하기 위해 정교한 정규식 스캔
    const singleColumnPattern = /@Column\s*\(\s*name\s*=\s*["']([^"']+)["']\s*\)\s*\r?\n(\s*(?:@[A-Za-z0-9_]+(?:\([^)]*\))?\s*\r?\n)*\s*(?:private|protected|public)\s+[A-Za-z0-9_<>]+\s+([A-Za-z0-9_]+)\s*;)/g;
    
    content = content.replace(singleColumnPattern, (match, colName, tail, fieldName) => {
        const expectedSnake = camelToSnake(fieldName);
        if (colName === expectedSnake) {
            isModified = true;
            totalRemovedCount++;
            // @Column(name = "xxx") 라인을 아예 날리고 그 아래의 어노테이션 및 필드 선언(tail)만 남김
            return tail;
        }
        return match;
    });

    // 2단계: @Column(name = "xxx", ...) 또는 @Column(..., name = "xxx", ...) 복합 사용 중 필드 스네이크 케이스와 일치하는 경우 name 속성만 제거
    const multiColumnPattern = /@Column\s*\(([^)]+)\)(\s*(?:\r?\n\s*@[A-Za-z0-9_]+(?:\([^)]*\))?)*\s*\r?\n\s*(?:private|protected|public)\s+[A-Za-z0-9_<>]+\s+([A-Za-z0-9_]+)\s*;)/g;
    
    content = content.replace(multiColumnPattern, (match, args, tail, fieldName) => {
        const expectedSnake = camelToSnake(fieldName);
        // name = "expectedSnake" 속성을 찾기 위한 정규식 (앞뒤 공백 및 콤마 처리 포함)
        const nameRegex = new RegExp(`\\s*name\\s*=\\s*["']${expectedSnake}["']\\s*,?\\s*`);
        
        if (nameRegex.test(args)) {
            let newArgs = args.replace(nameRegex, '').trim();
            // 앞뒤에 남은 콤마 제거
            newArgs = newArgs.replace(/^,|,$/g, '').trim();
            
            isModified = true;
            totalRemovedCount++;
            if (newArgs === '') {
                // 만약 모든 속성이 날아갔다면 어노테이션 자체를 생략
                return tail;
            } else {
                return `@Column(${newArgs})${tail}`;
            }
        }
        return match;
    });

    if (isModified) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedCount++;
        const relPath = filePath.split('egov-enterprise')[1] || filePath;
        console.log(`[REFACTORED] ${relPath}`);
    }
}

console.log(">>> Running JPA @Column name redundancy auto-refactoring...");
if (fs.existsSync(targetDir)) {
    walkDir(targetDir, refactorFile);
}
console.log(`\n>>> Refactoring Complete!`);
console.log(`Total files modified: ${modifiedCount}`);
console.log(`Total redundant @Column attributes/annotations removed: ${totalRemovedCount}`);
