const fs = require('fs');
const path = require('path');

const filesToFix = [
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/BannerIntegrationTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/BoardIntegrationTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/CommonCodeIntegrationTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/MenuIntegrationTest.java'
];

filesToFix.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Pattern 1: .method("text)") -> .method("text")
    // This targets the specific case where a string literal ends with a closing parenthesis that shouldn't be there.
    // We look for " followed by non-quote characters, ending with )", but wait... 
    // The issue is unclosed string literal. The ) is actually outside the string or part of it?
    // Based on viewed code: .bbsNm("??좎럩???좎럡苡??좎???)"
    // The quote is missing before the ).

    // Fix: ("(anything)) -> ("(anything)")
    content = content.replace(/\("(.*)\)\)/g, '("$1")');

    // Fix: .value("(text)"); -> .value("(text)")); (if it was .andExpect(... .value("text)")); )
    // This is getting complicated. Let's look at the errors again.

    // BannerIntegrationTest.java:58: error: ')' or ',' expected
    // .andExpect(jsonPath("$.data.content[0].bannerNm").value("??좎럩???獄쏄퀡瑗?)");
    // This is missing both a " and a ).

    content = content.replace(/\.value\("(.*?)\)\);/g, '.value("$1"));');

    // Let's just fix the missing quotes in all these files
    content = content.replace(/\("(.*)\)\)/g, '("$1")');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed: ' + filePath);
});
