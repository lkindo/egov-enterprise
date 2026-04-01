const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🎨 AST-like String Restorer
 * 
 * 원리: 
 * 1. 코드에서 문자열 리터럴("...", '...', `...`)을 모두 추출합니다.
 * 2. 문자열을 제외한 '코드의 뼈대(Structure)'가 동일한지 확인합니다.
 * 3. 뼈대가 같다면, 깨진 문자열만 과거의 정상 한글로 교체합니다.
 * 4. 이 과정에서 변수명 변경이나 타입 변경(any -> unknown)은 '뼈대'의 일부로 취급되어 보존됩니다.
 */

const GOOD_COMMIT = "d628d036";
const FRONTEND_ROOT = path.join(process.cwd(), 'frontend/src');

function getOldFileContent(commit, filePath) {
    try {
        return execSync(`git show ${commit}:${filePath}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch (e) {
        return null;
    }
}

function restoreStrings(originCode, garbledCode) {
    // 문자열 추출 정규식 (따옴표, 쌍따옴표, 백틱)
    const stringRegex = /(['"\/])(\\?.)*?\1/g;
    
    // 1. 과거 파일에서 한글이 포함된 문자열들 추출
    const originStrings = [];
    let match;
    while ((match = stringRegex.exec(originCode)) !== null) {
        if (/[가-힣]/.test(match[0])) {
            originStrings.push({
                index: match.index,
                text: match[0]
            });
        }
    }

    if (originStrings.length === 0) return garbledCode;

    // 2. 현재 파일(깨진 파일)에서 문자열들 추출
    const garbledStrings = [];
    while ((match = stringRegex.exec(garbledCode)) !== null) {
        garbledStrings.push({
            index: match.index,
            text: match[0],
            length: match[0].length
        });
    }

    // 3. 역순으로 교체 (인덱스 밀림 방지)
    let result = garbledCode;
    let fixCount = 0;

    // 전략: 깨진 파일의 문자열 주변 '코드 컨텍스트'를 비교하여 매칭
    for (const oldStr of originStrings) {
        // 과거 문자열의 앞뒤 20자 컨텍스트 (정규식 특수문자 제거)
        const prefix = originCode.substring(Math.max(0, oldStr.index - 30), oldStr.index).replace(/[\s\n]/g, '');
        const suffix = originCode.substring(oldStr.index + oldStr.text.length, oldStr.index + oldStr.text.length + 30).replace(/[\s\n]/g, '');

        // 현재 파일에서 유사한 컨텍스트를 가진 '깨진 문자열' 찾기
        for (let i = 0; i < garbledStrings.length; i++) {
            const currentStr = garbledStrings[i];
            const currPrefix = result.substring(Math.max(0, currentStr.index - 50), currentStr.index).replace(/[\s\n]/g, '');
            
            // 컨텍스트 매칭 (유연하게 포함 여부로 체크)
            if (currPrefix.includes(prefix) || prefix.includes(currPrefix)) {
                // 문자열 교체
                const before = result.substring(0, currentStr.index);
                const after = result.substring(currentStr.index + currentStr.text.length);
                result = before + oldStr.text + after;

                // 이후 문자열들의 인덱스 보정
                const diff = oldStr.text.length - currentStr.text.length;
                for (let j = i + 1; j < garbledStrings.length; j++) {
                    garbledStrings[j].index += diff;
                }
                
                garbledStrings.splice(i, 1); // 사용된 문자열 제거
                fixCount++;
                break;
            }
        }
    }

    return { result, fixCount };
}

function processDirectory(commit) {
    console.log(`🔍 [Phase 1] 파일 목록 추출 중... (Target: ${commit})`);
    const files = execSync(`git diff --name-only ${commit} HEAD -- "frontend/src"`, { encoding: 'utf8' })
        .split('\n')
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    console.log(`🚀 [Phase 2] 총 ${files.length}개 파일 복원 시작...`);
    let totalFixes = 0;
    let fileCount = 0;

    files.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (!fs.existsSync(fullPath)) return;

        const currentContent = fs.readFileSync(fullPath, 'utf8');
        const oldContent = getOldFileContent(commit, file);

        if (!oldContent) return;

        const { result, fixCount } = restoreStrings(oldContent, currentContent);
        
        if (fixCount > 0) {
            fs.writeFileSync(fullPath, result, 'utf8');
            console.log(`✅ [${++fileCount}] 복원 완료: ${file} (${fixCount}개 문구)`);
            totalFixes += fixCount;
        }
    });

    console.log(`\n✨ 모든 작업이 완료되었습니다!`);
    console.log(`📊 요약: ${fileCount}개 파일 수정, 총 ${totalFixes}개 한글 문구 복원됨.`);
}

processDirectory(GOOD_COMMIT);
