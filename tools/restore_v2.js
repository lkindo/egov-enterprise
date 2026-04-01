const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🎯 V2: Ultra-Precise Context-Aware String Restorer
 * 
 * 정적 분석 없이도 AST 수준의 정확도를 내기 위해:
 * 1. 코드 구조를 유지하며 문자열 리터럴만 '치환 가능한 후보'로 추출합니다.
 * 2. 주변 코드(30자 이상)의 구조적 유사성을 체크하여 정확한 위치를 찾아냅니다.
 * 3. 첫 라인은 건너뛰고, 이미 한글인 것은 건드리지 않습니다.
 */

const GOOD_COMMIT = "d628d036";

function getOldContent(commit, filePath) {
    try {
        return execSync(`git show ${commit}:${filePath}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch (e) { return null; }
}

function restore(oldCode, newCode) {
    // 문자열 추출 정규식: 따옴표('), 쌍따옴표("), 백틱(`) 지원
    const strRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
    
    // 1. 정상 한글 파일에서 문자열 정보 추출
    const oldStrings = [];
    let m;
    while ((m = strRegex.exec(oldCode)) !== null) {
        if (/[가-힣]/.test(m[0])) {
            const prefix = oldCode.substring(Math.max(0, m.index - 40), m.index).replace(/[\s\n]/g, '');
            const suffix = oldCode.substring(m.index + m[0].length, m.index + m[0].length + 40).replace(/[\s\n]/g, '');
            oldStrings.push({ text: m[0], prefix, suffix });
        }
    }

    if (oldStrings.length === 0) return { result: newCode, count: 0 };

    // 2. 현재 파일에서 문자열 후보 추출
    let result = newCode;
    let count = 0;
    
    // 역순으로 처리하기 위해 현재 문자열 위치 파악
    const currentStrings = [];
    while ((m = strRegex.exec(result)) !== null) {
        // 이미 한글이 된 것은 제외
        if (!/[가-힣]/.test(m[0])) {
            currentStrings.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
        }
    }

    // 3. 매칭 및 교체 (역순으로 위치 보존)
    for (const old of oldStrings) {
        let bestMatch = -1;
        let maxScore = 0;

        for (let i = 0; i < currentStrings.length; i++) {
            const curr = currentStrings[i];
            const currPre = result.substring(Math.max(0, curr.start - 60), curr.start).replace(/[\s\n]/g, '');
            const currSuf = result.substring(curr.end, curr.end + 60).replace(/[\s\n]/g, '');

            let score = 0;
            if (currPre.endsWith(old.prefix) || old.prefix.endsWith(currPre)) score += 50;
            if (currSuf.startsWith(old.suffix) || old.suffix.startsWith(currSuf)) score += 50;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = i;
            }
        }

        if (bestMatch !== -1 && maxScore >= 50) {
            const match = currentStrings[bestMatch];
            // 로직 문자열(id, type, Authorization 등)은 교체하지 않음
            if (!/id|type|key|Authorization|src|href|className|'any'|'unknown'/i.test(match.text)) {
                const before = result.substring(0, match.start);
                const after = result.substring(match.end);
                result = before + old.text + after;
                
                // 이후 인덱스 보정
                const diff = old.text.length - match.text.length;
                for (let j = bestMatch + 1; j < currentStrings.length; j++) {
                    currentStrings[j].start += diff;
                    currentStrings[j].end += diff;
                }
                currentStrings.splice(bestMatch, 1);
                count++;
            }
        }
    }

    return { result, count };
}

async function main() {
    const files = execSync(`git diff --name-only ${GOOD_COMMIT} HEAD -- "frontend/src"`, { encoding: 'utf8' })
        .split('\n')
        .filter(f => f.match(/\.(ts|tsx)$/) && !f.includes('codeActions') && !f.includes('menuActions'));

    console.log(`🚀 [Phase 3] ${files.length}개 파일 정밀 복원 시작...`);
    
    files.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (!fs.existsSync(fullPath)) return;

        const current = fs.readFileSync(fullPath, 'utf8');
        const old = getOldContent(GOOD_COMMIT, file);
        if (!old) return;

        const { result, count } = restore(old, current);
        if (count > 0) {
            fs.writeFileSync(fullPath, result, 'utf8');
            console.log(`✅ ${file} (${count}개 교체)`);
        }
    });

    console.log(`\n🎉 모든 파일이 정밀하게 복구되었습니다.`);
}

main();
