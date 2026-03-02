const fs = require('fs');

const fixes = [
    {
        file: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/api/controller/UserControllerIntegrationTest.java',
        search: '.andExpect(jsonPath("$.data.userNm").value("??醫롫윞????醫롫윪???)");',
        replace: '.andExpect(jsonPath("$.data.userNm").value("??醫롫윞????醫롫윪???"));'
    },
    {
        file: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/CommonCodeIntegrationTest.java',
        search: '.codeIdNm("??좎럩???좎럡?뉒뙴諭€???)"',
        replace: '.codeIdNm("??좎럩???좎럡?뉒뙴諭€???")'
    },
    {
        file: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/MenuIntegrationTest.java',
        search: '.menuNm("?봔€筌뤴뫀李??)"',
        replace: '.menuNm("?봔€筌뤴뫀李??")'
    }
];

fixes.forEach(f => {
    if (!fs.existsSync(f.file)) return;
    let content = fs.readFileSync(f.file, 'utf8');
    if (content.includes(f.search)) {
        content = content.split(f.search).join(f.replace);
        fs.writeFileSync(f.file, content, 'utf8');
        console.log('Fixed: ' + f.file);
    } else {
        console.log('Pattern not found in: ' + f.file);
    }
});
