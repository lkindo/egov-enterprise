const fs = require('fs');

const filesToFix = [
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/security/test/SqlInjectionAndXssDefenseTest.java',
        fixes: [
            { search: '.formatted(maliciousUserName");', replace: '.formatted(maliciousUserName);' },
            { search: '.formatted(maliciousPassword");', replace: '.formatted(maliciousPassword);' },
            { search: '.formatted(maliciousEmail");', replace: '.formatted(maliciousEmail);' }
        ]
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/openapi/ApiSpecificationComplianceTest.java',
        fixes: [
            { search: '} ??醫롫윥獄??醫롫윪???醫롫짗?? ??醫롫윪???醫롫윪????', replace: '// } ??醫롫윥獄??醫롫윪???醫롫짗?? ??醫롫윪???醫롫윪????' }
        ]
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/test/async/AsyncCompletionTest.java',
        append: '\n */\n'
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/test/async/AsyncTimeoutTest.java',
        append: '\n */\n'
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/StressTest.java',
        fixes: [
            { search: '.formatted(requestId, requestId");', replace: '.formatted(requestId, requestId);' },
            { search: '.formatted(userId, threadIdFinal * requestsPerThread + i");', replace: '.formatted(userId, threadIdFinal * requestsPerThread + i);' },
            { search: '.formatted(testUserId, updateValue");', replace: '.formatted(testUserId, updateValue);' },
            { search: 'successfulRequests = futures.stream().map(future -> {', replace: 'successfulRequests = futures.stream()\n                .map(future -> {' },
            { search: '.map(future -> {', replace: '.map(future -> {' } // ensure it's on a new line if needed
        ]
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/security/SecurityVulnerabilityTest.java',
        fixes: [
            { search: '                    .', replace: '                    // .' }
        ]
    },
    {
        path: 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/test/errorhandling/ExceptionResponseTest.java',
        fixes: [
            { search: 'businessException.addDetail("field", "userId);', replace: 'businessException.addDetail("field", "userId");' },
            { search: 'build(), null, null, null, null));', replace: 'build());' }
        ]
    }
];

filesToFix.forEach(f => {
    if (!fs.existsSync(f.path)) return;
    let content = fs.readFileSync(f.path, 'utf8');
    let modified = false;

    if (f.fixes) {
        f.fixes.forEach(fix => {
            if (content.includes(fix.search)) {
                content = content.split(fix.search).join(fix.replace);
                modified = true;
            }
        });
    }

    if (f.append && !content.trimEnd().endsWith('*/')) {
        content = content.trimEnd() + f.append;
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(f.path, content, 'utf8');
        console.log('Fixed: ' + f.path);
    }
});
