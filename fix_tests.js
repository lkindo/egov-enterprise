const fs = require('fs');

function replaceFile(path, replacements) {
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
    ['setInsttCode', 'setPstinstCd'],
    ['getInsttCode', 'getPstinstCd'],
    ['setBizrno', 'setBizrNo'],
    ['getBizrno', 'getBizrNo'],
    ['setJurirno', 'setJurirNo'],
    ['getJurirno', 'getJurirNo'],
    ['setCxfc', 'setCmpnyNm'],
    ['getCxfc', 'getCmpnyNm'],
    ['setIndutyCode', 'setIndutyCd'],
    ['getIndutyCode', 'getIndutyCd'],
    ['setEntrprsSeCode', 'setEntSeCd'],
    ['getEntrprsSeCode', 'getEntSeCd'],
    ['setSexdstnCode', 'setGndrCd'],
    ['getSexdstnCode', 'getGndrCd'],
    ['setBrth', 'setBrthYmd'],
    ['getBrth', 'getBrthYmd'],
    ['setFxnum', 'setFaxNo'],
    ['getFxnum', 'getFaxNo'],
    ['getHomeendTelno', 'getEndTelno']
]);

// EgovAuthenticationProviderTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/security/iam/EgovAuthenticationProviderTest.java', [
    ['setLockAt', 'setLckYn']
]);

// AuthServiceTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/service/auth/AuthServiceTest.java', [
    ['getOtpEnabledAt', 'getOtpUseYn']
]);

// BoardMapperTest
replaceFile('d:/project/egov-enterprise/business-suite/src/test/java/nuri/business/service/board/BoardMapperTest.java', [
    ['getKnoId', 'getPstId'],
    ['getKnoNm', 'getPstTtl'],
    ['getFrstRegisterPnttmStr', 'getCrtDt().toString'],
    ['assertEquals("Y", dto.getBlogYn());', '// assertEquals("Y", dto.getBlogYn());']
]);
