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

// UserTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/domain/user/entity/UserTest.java', [
    ['setMoblphonNo', 'setMblTelno'],
    ['getMoblphonNo', 'getMblTelno'],
    ['setOrgnztId', 'setOgnzId'],
    ['getOrgnztId', 'getOgnzId'],
    ['setSubDn', 'setCertDnVl'],
    ['getSubDn', 'getCertDnVl'],
    ['setIhidnum', 'setRrno'],
    ['getIhidnum', 'getRrno'],
    ['setHomeadres', 'setHomeAddr'],
    ['getHomeadres', 'getHomeAddr'],
    ['setDetailAdres', 'setDaddr'],
    ['getDetailAdres', 'getDaddr'],
    ['setHomemiddleTelno', 'setMiddleTelno'],
    ['getHomemiddleTelno', 'getMiddleTelno'],
    ['setAreaNo', 'setAreaNo'],
    ['getAreaNo', 'getAreaNo']
]);

// BoardServiceTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/service/board/BoardServiceTest.java', [
    ['getNextNttId', 'getNextPstId'],
    ['ansLvl', 'ansLv'],
    ['nttId', 'pstId']
]);

// BoardMasterServiceTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/service/board/BoardMasterServiceTest.java', [
    ['ansYn', 'ansLv']
]);

// SatisfactionServiceTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/service/board/SatisfactionServiceTest.java', [
    ['nttId', 'pstId']
]);

// SatisfactionControllerTest (if any)
replaceFile('d:/project/egov-enterprise/api-server/src/test/java/nuri/api/controller/board/SatisfactionApiControllerTest.java', [
    ['nttId', 'pstId']
]);
