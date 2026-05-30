const fs = require('fs');
const path = require('path');

const reportDir = 'd:/project/egov-enterprise/api-server/build/reports/tests/test';
const indexFile = path.join(reportDir, 'index.html');

if (!fs.existsSync(indexFile)) {
    console.log('No report found.');
    process.exit(1);
}

const html = fs.readFileSync(indexFile, 'utf8');

// A very naive regex to extract failed tests
// Usually failed tests are listed in <div id="tab0" class="tab"> ... <h2>Failed tests</h2> ... <ul class="linkList"> ... </ul>
const failedTestsSectionMatch = html.match(/<h2>Failed tests<\/h2>\s*<ul class="linkList">([\s\S]*?)<\/ul>/);

if (failedTestsSectionMatch) {
    const listHtml = failedTestsSectionMatch[1];
    const regex = /<a href="(.*?)">(.*?)<\/a>/g;
    let match;
    const failures = [];
    while ((match = regex.exec(listHtml)) !== null) {
        failures.push({ link: match[1], name: match[2] });
    }
    
    console.log(`Found ${failures.length} failed tests.`);
    failures.forEach(f => {
        const testHtmlPath = path.join(reportDir, f.link);
        if (fs.existsSync(testHtmlPath)) {
            const testHtml = fs.readFileSync(testHtmlPath, 'utf8');
            const errorMatch = testHtml.match(/<div class="test">\s*<a name=".*?"><\/a>\s*<h3 class="failures">(.*?)<\/h3>\s*<span class="code">\s*<pre>([\s\S]*?)<\/pre>/);
            if (errorMatch) {
                console.log(`\n--- ${f.name} (${errorMatch[1]}) ---`);
                console.log(errorMatch[2].substring(0, 500) + '...');
            } else {
                console.log(`\n--- ${f.name} ---`);
                console.log('Could not extract error details from ' + f.link);
            }
        } else {
            console.log(`\n--- ${f.name} --- (file ${f.link} not found)`);
        }
    });
} else {
    console.log('No Failed tests section found.');
}
