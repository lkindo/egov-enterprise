const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, '../build/reports/jacoco/jacocoRootReport/jacocoRootReport.xml');

if (!fs.existsSync(xmlPath)) {
    console.error('Jacoco XML report not found at:', xmlPath);
    process.exit(1);
}

console.log('Reading Jacoco XML report...');
const xmlContent = fs.readFileSync(xmlPath, 'utf8');

// Match class elements and their counters
// Structural hierarchy in Jacoco XML:
// <package name="nuri/business/service/board">
//   <class name="nuri/business/service/board/BoardManageService" ...>
//     <counter type="INSTRUCTION" missed="X" covered="Y"/>
//     <counter type="LINE" missed="X" covered="Y"/>
//     ...
//   </class>
// </package>

const packageRegex = /<package name="([^"]+)">([\s\S]*?)<\/package>/g;
const classRegex = /<class name="([^"]+)"[\s\S]*?>([\s\S]*?)<\/class>/g;
const counterRegex = /<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g;

const classes = [];

let packageMatch;
while ((packageMatch = packageRegex.exec(xmlContent)) !== null) {
    const packageName = packageMatch[1].replace(/\//g, '.');
    const packageBody = packageMatch[2];
    
    let classMatch;
    // We want to reset classRegex search index for each package body
    classRegex.lastIndex = 0;
    
    while ((classMatch = classRegex.exec(packageBody)) !== null) {
        const className = classMatch[1].replace(/\//g, '.');
        const classBody = classMatch[2];
        
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
        
        // Filter: focus on our business/foundation logic, exclude DTOs/Entities if any got through, or standard library code
        if (
            (className.startsWith('nuri.business.service') || className.startsWith('nuri.foundation.service')) &&
            !className.includes('Impl') && // Usually we want Impl or the interface? Ah, standard eGov might have Impl classes.
            !className.endsWith('Dto') &&
            !className.endsWith('VO')
        ) {
            classes.push({
                name: className,
                counters
            });
        }
    }
}

// Sort classes by missed instructions or line coverage
const lowCoverageClasses = classes
    .filter(c => c.counters.LINE && c.counters.LINE.total > 15) // Only classes of significant size
    .map(c => {
        const line = c.counters.LINE;
        const branch = c.counters.BRANCH || { missed: 0, covered: 0, total: 0, coverage: 100 };
        return {
            name: c.name,
            lineTotal: line.total,
            lineCovered: line.covered,
            lineCoverage: line.coverage.toFixed(1) + '%',
            branchTotal: branch.total,
            branchCovered: branch.covered,
            branchCoverage: branch.coverage.toFixed(1) + '%',
            rawLineCoverage: line.coverage,
            rawBranchCoverage: branch.coverage
        };
    })
    .sort((a, b) => a.rawLineCoverage - b.rawLineCoverage);

console.log('\n=== TOP 10 LOWEST COVERAGE SERVICES ===');
lowCoverageClasses.slice(0, 15).forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name}`);
    console.log(`   Line Coverage: ${c.lineCoverage} (${c.lineCovered}/${c.lineTotal})`);
    console.log(`   Branch Coverage: ${c.branchCoverage} (${c.branchCovered}/${c.branchTotal})`);
});
