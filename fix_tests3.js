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
    ['getPasswordHint', 'getPswdHint'],
    ['getPasswordCnsr', 'getPswdCrans'],
    ['getBaseAddr', 'getHomeAddr'],
    ['getCrtfcDnValue', 'getCertDnVl'],
    ['getPasswordUpdateDate', 'getChgPswdLastDt'],
    ['getPassword', 'getPswd'],
    ['getLockCount', 'getLckCnt'],
    ['getLockAt', 'getLckYn'],
    ['getLockLastDate', 'getLckLastPnttm'],
    ['getStatusCode', 'getUserSttsCd'],
    ['setUserType', 'setUserTypeCd'],
    ['getUserType', 'getUserTypeCd'],
    ['setPassword', 'setPswd'],
    ['setChangePasswordCount', 'setChgPwdCnt'],
    ['getChangePasswordCount', 'getChgPwdCnt'],
    ['setLockLastDate', 'setLckLastPnttm'],
    ['setHomeendTelno', 'setEndTelno']
]);

// BoardMasterServiceTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/service/board/BoardMasterServiceTest.java', [
    ['ansLv', 'ansYn']
]);
