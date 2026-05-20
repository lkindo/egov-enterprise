const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, '../build/reports/jacoco/jacocoRootReport/jacocoRootReport.xml');

if (!fs.existsSync(xmlPath)) {
    console.error('Jacoco XML report not found at:', xmlPath);
    process.exit(1);
}

console.log('Reading Jacoco XML report for target classes...');
const xmlContent = fs.readFileSync(xmlPath, 'utf8');

const packageRegex = /<package name="([^"]+)">([\s\S]*?)<\/package>/g;
const classRegex = /<class name="([^"]+)"[\s\S]*?>([\s\S]*?)<\/class>/g;
const counterRegex = /<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g;

const targetClasses = [
    'nuri.foundation.service.system.service.survey.SurveyService',
    'nuri.foundation.service.system.content.popup.PopupServiceImpl'
];

const results = [];

let packageMatch;
while ((packageMatch = packageRegex.exec(xmlContent)) !== null) {
    const packageName = packageMatch[1].replace(/\//g, '.');
    const packageBody = packageMatch[2];
    
    let classMatch;
    classRegex.lastIndex = 0;
    
    while ((classMatch = classRegex.exec(packageBody)) !== null) {
        const className = classMatch[1].replace(/\//g, '.');
        const classBody = classMatch[2];
        
        const lowerClassName = className.toLowerCase();
        if (
            lowerClassName.includes('popup') || 
            lowerClassName.includes('survey') || 
            lowerClassName.includes('viewcount') || 
            lowerClassName.includes('codeservice')
        ) {
            let counterMatch;
            counterRegex.lastIndex = 0;
            
            const counters = {};
            while ((counterMatch = counterRegex.exec(classBody)) !== null) {
                const type = counterMatch[1];
                const missed = parseInt(counterMatch[2], 10);
                const covered = parseInt(counterMatch[3], 10);
                const total = missed + covered;
                const coverage = total > 0 ? (covered / total) * 100 : 100;
                
                counters[type] = { missed, covered, total, coverage };
            }
            
            results.push({
                name: className,
                counters
            });
        }
    }
}

console.log('\n=== Target Classes Coverage Report ===');
results.forEach(r => {
    console.log(`\nClass: ${r.name}`);
    Object.keys(r.counters).forEach(type => {
        const c = r.counters[type];
        console.log(`  ${type}: ${c.coverage.toFixed(2)}% (${c.covered}/${c.total}) - Missed: ${c.missed}`);
    });
});
