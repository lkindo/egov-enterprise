const fs = require('fs');
const path = require('path');

const mappings = [
    ['bbsIntroCn', 'bbsExpln'],
    ['ansPsblYn', 'ansPsbltyYn'],
    ['fileAtchPsblYn', 'fileAtchPsbltyYn'],
    ['atchPsblFileCnt', 'atchPsbltyFileQty'],
    ['atchPsblFileSize', 'atchPsbltyFileSz'],
    ['tmplatId', 'tmpltId'],
    ['frstRegisterId', 'frstRgtrId'],
    ['frstRegisterPnttm', 'createdDate'],
    ['lastUpdusrId', 'lastMdfrId'],
    ['lastUpdusrPnttm', 'lastModifiedDate'],
    ['lastUpdtPnttm', 'lastModifiedDate'],
    ['commentYn', 'ansYn'],
    ['schdulId', 'schdlId'],
    ['schdulSe', 'schdlSeCd'],
    ['schdulNm', 'schdlNm'],
    ['schdulCn', 'schdlCn'],
    ['reptitSeCode', 'reptSeCd'],
    ['schdulBgnde', 'schdlBgngYmd'],
    ['schdulEndde', 'schdlEndYmd'],
    ['schdulIpAdres', 'schdlIpAddr'],
    ['schdulChargerId', 'schdlPicId'],
    ['schdulDeptId', 'schdlDeptId'],
    ['schdulKindCode', 'schdlKndCd'],
    ['schdulPlace', 'schdlPlcNm'],
    ['schdulIpcrCode', 'schdlImprtCd'],
    ['scrapDc', 'scrapExpln'],
    ['trnsmitTelno', 'sndngTelno'],
    ['trnsmitCn', 'sndngCn'],
    ['resultCode', 'rsltCd'],
    ['resultMssage', 'rsltMsg'],
    // ['uniqId', 'linkUrl'], // Wait, uniqId and linkUrl might be too generic.
];

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function processFile(filePath) {
    if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('build')) return;
    const isJava = filePath.endsWith('.java');
    const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    if (!isJava && !isTs) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [oldName, newName] of mappings) {
        const oldCap = capitalize(oldName);
        const newCap = capitalize(newName);
        
        // Field names in TS/Java (using word boundaries)
        const fieldRegex = new RegExp(`\\b${oldName}\\b`, 'g');
        content = content.replace(fieldRegex, newName);

        if (isJava) {
            // Getters/Setters/Builders
            const getRegex = new RegExp(`\\bget${oldCap}\\b`, 'g');
            content = content.replace(getRegex, `get${newCap}`);
            
            const setRegex = new RegExp(`\\bset${oldCap}\\b`, 'g');
            content = content.replace(setRegex, `set${newCap}`);
            
            // For builders like .bbsIntroCn(...) -> .bbsExpln(...)
            const builderRegex = new RegExp(`\\.${oldName}\\(`, 'g');
            content = content.replace(builderRegex, `.${newName}(`);
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

walk('d:/project/egov-enterprise/business-suite/src/main/java');
walk('d:/project/egov-enterprise/business-suite/src/test/java');
walk('d:/project/egov-enterprise/api-server/src/main/java');
walk('d:/project/egov-enterprise/api-server/src/test/java');
walk('d:/project/egov-enterprise/frontend/src');
