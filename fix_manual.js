const fs = require('fs');

const manualFixes = [
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/BannerIntegrationTest.java',
        fixes: [
            { search: '.value("??좎럩???獄쏄퀡瑗?)");', replace: '.value("??좎럩???獄쏄퀡瑗?");' }, // Wait, missing parenthesis!
            // Should be:
            { search: '.value("??좎럩???獄쏄퀡瑗?)");', replace: '.value("??좎럩???獄쏄퀡瑗?"));' },
            { search: '.bannerNm("獄쏆꼷??獄쏄퀡瑗?)"', replace: '.bannerNm("獄쏆꼷??獄쏄퀡瑗?")' },
            { search: '.value("獄쏆꼷??獄쏄퀡瑗?");', replace: '.value("獄쏆꼷??獄쏄퀡瑗?"));' }
        ]
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/BoardIntegrationTest.java',
        fixes: [
            { search: '.bbsNm("??좎럩???좎럡苡??좎???)"', replace: '.bbsNm("??좎럩???좎럡苡??좎???")' },
            { search: '.bbsIntrcn("??좎럩???좎럡苡??좎????좎럥梨?)"', replace: '.bbsIntrcn("??좎럩???좎럡苡??좎????좎럥梨?")' }
        ]
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/CommonCodeIntegrationTest.java',
        fixes: [
            { search: '.clCodeNm("??좎럩???좎럥?뉐뜝?)"', replace: '.clCodeNm("??좎럩???좎럥?뉐뜝?")' },
            { search: '.clCodeDc("??좎럩???좎럥?뉒몴?뤾퐬??)"', replace: '.clCodeDc("??좎럩???좎럥?뉒몴?뤾퐬??")' },
            { search: '.codeIdNm("??좎럩???좎럡?뉒뙴諭€???)"', replace: '.codeIdNm("??좎럩???좎럡?뉒뙴諭€???")' }
        ]
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/MenuIntegrationTest.java',
        fixes: [
            { search: '.menuNm("??좎럩???좎럥李??)"', replace: '.menuNm("??좎럩???좎럥李??")' },
            { search: '.menuDc("??좎럩???좎럥李??좎럩苑뺝뜝?)"', replace: '.menuDc("??좎럩???좎럥李??좎럩苑뺝뜝?")' },
            { search: '.menuNm("?봔€筌뤴뫀李??)"', replace: '.menuNm("?봔€筌뤴뫀李??")' }
        ]
    }
];

manualFixes.forEach(f => {
    if (!fs.existsSync(f.path)) {
        console.log('Not found: ' + f.path);
        return;
    }
    let content = fs.readFileSync(f.path, 'utf8');
    let modified = false;

    f.fixes.forEach(fix => {
        if (content.includes(fix.search)) {
            content = content.split(fix.search).join(fix.replace);
            modified = true;
        } else {
            console.log('Pattern not found in ' + f.path + ': ' + fix.search);
        }
    });

    if (modified) {
        fs.writeFileSync(f.path, content, 'utf8');
        console.log('Fixed: ' + f.path);
    }
});
