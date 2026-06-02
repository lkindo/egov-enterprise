const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replaceAll(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(path, content);
        console.log('Updated', path);
    }
}

replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/domain/board/BoardTest.java', [
    ['setNttId', 'setPstId'],
    ['getNttId', 'getPstId'],
    ['setNttSj', 'setPstTtl'],
    ['getNttSj', 'getPstTtl'],
    ['setNttCn', 'setPstCn'],
    ['getNttCn', 'getPstCn'],
    ['setNttNo', 'setAnsSn'],
    ['setNtcrId', 'setUserId'],
    ['setNtcrNm', 'setUserNm'],
    ['setPassword', 'setPswd'],
    ['setNtceBgngYmd', 'setPstBgngYmd'],
    ['setNtceEndYmd', 'setPstEndYmd'],
    ['setInqireCo', 'setInqCnt'],
    ['setLikeCo', 'setLikeCnt'],
    ['setQnaStatus', 'setQnaSttsCd'],
    ['setQnaCategory', 'setQnaCatCd'],
    ['setSjBoldYn', 'setTtlBoldYn'],
    ['setParnts', 'setUpPstId'],
    ['setAnswerAt("Y")', 'setAnsLv(1)'], // answerAt was "Y"/"N", let's map to ansLv(1) just for compilation
    ['setNoticeAt', 'setUseYn']
]);

replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/domain/board/BoardRepositoryTest.java', [
    ['getFrstRegisterNm', 'getFrstRgtrNm']
]);

// Revert ansLv back to ansYn for BoardMaster
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/service/board/BoardMasterServiceTest.java', [
    ['ansLv', 'ansYn']
]);
