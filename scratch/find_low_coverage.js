const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, '../build/reports/jacoco/jacocoRootReport/jacocoRootReport.xml');

if (!fs.existsSync(xmlPath)) {
    console.error('Jacoco XML report not found at: ' + xmlPath);
    process.exit(1);
}

console.log('Reading Jacoco XML report...');
const xml = fs.readFileSync(xmlPath, 'utf8');

// We want to find packages and their instruction/branch counters.
// Standard XML parsing via regex for simplicity without external dependencies
const packageRegex = /<package\s+name="([^"]+)">([\s\S]*?)<\/package>/g;
const counterRegex = /<counter\s+type="([^"]+)"\s+missed="(\d+)"\s+covered="(\d+)"\s*\/>/g;

const packages = [];

let match;
while ((match = packageRegex.exec(xml)) !== null) {
    const packageName = match[1].replace(/\//g, '.');
    const packageContent = match[2];
    
    // The counters at the very end of the package tag (not inside class tags) represent package totals.
    // Let's remove class tags to only parse package-level counters.
    const packageTotalsContent = packageContent.replace(/<class\s+[\s\S]*?<\/class>/g, '');
    
    let counterMatch;
    let instructionMissed = 0;
    let instructionCovered = 0;
    let branchMissed = 0;
    let branchCovered = 0;
    
    while ((counterMatch = counterRegex.exec(packageTotalsContent)) !== null) {
        const type = counterMatch[1];
        const missed = parseInt(counterMatch[2], 10);
        const covered = parseInt(counterMatch[3], 10);
        
        if (type === 'INSTRUCTION') {
            instructionMissed = missed;
            instructionCovered = covered;
        } else if (type === 'BRANCH') {
            branchMissed = missed;
            branchCovered = covered;
        }
    }
    
    const instructionTotal = instructionMissed + instructionCovered;
    const instructionPct = instructionTotal > 0 ? (instructionCovered / instructionTotal) * 100 : 0;
    
    const branchTotal = branchMissed + branchCovered;
    const branchPct = branchTotal > 0 ? (branchCovered / branchTotal) * 100 : 0;
    
    // We only care about nuri.* packages
    if (packageName.startsWith('nuri')) {
        packages.push({
            name: packageName,
            instruction: { missed: instructionMissed, covered: instructionCovered, total: instructionTotal, pct: instructionPct },
            branch: { missed: branchMissed, covered: branchCovered, total: branchTotal, pct: branchPct }
        });
    }
}

// Sort packages by instruction coverage percent ascending, then total instructions descending
packages.sort((a, b) => {
    if (a.instruction.pct !== b.instruction.pct) {
        return a.instruction.pct - b.instruction.pct;
    }
    return b.instruction.total - a.instruction.total;
});

console.log('\n--- Top 20 Packages with Lowest Instruction Coverage ---');
packages.slice(0, 20).forEach(pkg => {
    console.log(`Package: ${pkg.name}`);
    console.log(`  Instruction: ${pkg.instruction.pct.toFixed(2)}% (${pkg.instruction.covered}/${pkg.instruction.total}, missed ${pkg.instruction.missed})`);
    console.log(`  Branch:      ${pkg.branch.pct.toFixed(2)}% (${pkg.branch.covered}/${pkg.branch.total}, missed ${pkg.branch.missed})`);
});

// Let's also find individual classes inside domain or service packages that have low coverage
const classRegex = /<class\s+name="([^"]+)"[\s\S]*?>([\s\S]*?)<\/class>/g;
const classes = [];

packageRegex.lastIndex = 0; // reset
while ((match = packageRegex.exec(xml)) !== null) {
    const packageName = match[1].replace(/\//g, '.');
    const packageContent = match[2];
    
    if (!packageName.startsWith('nuri')) continue;
    
    let classMatch;
    // We must reset the class regex index since it's global
    classRegex.lastIndex = 0;
    while ((classMatch = classRegex.exec(packageContent)) !== null) {
        const className = classMatch[1].replace(/\//g, '.');
        const classContent = classMatch[2];
        
        let counterMatch;
        let instructionMissed = 0;
        let instructionCovered = 0;
        let branchMissed = 0;
        let branchCovered = 0;
        
        // Match only direct counters of the class, not method level counters.
        // Method level counters are inside method tags.
        const classTotalsContent = classContent.replace(/<method\s+[\s\S]*?<\/method>/g, '');
        
        while ((counterMatch = counterRegex.exec(classTotalsContent)) !== null) {
            const type = counterMatch[1];
            const missed = parseInt(counterMatch[2], 10);
            const covered = parseInt(counterMatch[3], 10);
            
            if (type === 'INSTRUCTION') {
                instructionMissed = missed;
                instructionCovered = covered;
            } else if (type === 'BRANCH') {
                branchMissed = missed;
                branchCovered = covered;
            }
        }
        
        const instructionTotal = instructionMissed + instructionCovered;
        const instructionPct = instructionTotal > 0 ? (instructionCovered / instructionTotal) * 100 : 0;
        
        const branchTotal = branchMissed + branchCovered;
        const branchPct = branchTotal > 0 ? (branchCovered / branchTotal) * 100 : 0;
        
        // Skip classes with very few instructions (like interfaces or simple enums)
        if (instructionTotal > 5) {
            classes.push({
                packageName,
                name: className,
                instruction: { missed: instructionMissed, covered: instructionCovered, total: instructionTotal, pct: instructionPct },
                branch: { missed: branchMissed, covered: branchCovered, total: branchTotal, pct: branchPct }
            });
        }
    }
}

// Sort classes by instruction coverage percent ascending, then total instructions descending
classes.sort((a, b) => {
    if (a.instruction.pct !== b.instruction.pct) {
        return a.instruction.pct - b.instruction.pct;
    }
    return b.instruction.total - a.instruction.total;
});

console.log('\n--- Top 30 Classes with Lowest Instruction Coverage (min 5 instructions) ---');
classes.slice(0, 30).forEach(cls => {
    console.log(`Class: ${cls.name}`);
    console.log(`  Package:     ${cls.packageName}`);
    console.log(`  Instruction: ${cls.instruction.pct.toFixed(2)}% (${cls.instruction.covered}/${cls.instruction.total}, missed ${cls.instruction.missed})`);
    console.log(`  Branch:      ${cls.branch.pct.toFixed(2)}% (${cls.branch.covered}/${cls.branch.total}, missed ${cls.branch.missed})`);
});

// Specific target package print (NEW)
console.log('\n======================================================');
console.log('🔍 [TARGET DOMAINS FINAL COVERAGE REPORT]');
console.log('======================================================');
const scrapPkg = packages.find(p => p.name === 'nuri.business.domain.scrap');
if (scrapPkg) {
    console.log(`[Scrap Domain]`);
    console.log(`  Instruction Coverage: ${scrapPkg.instruction.pct.toFixed(2)}% (${scrapPkg.instruction.covered}/${scrapPkg.instruction.total})`);
    console.log(`  Branch Coverage:      ${scrapPkg.branch.pct.toFixed(2)}% (${scrapPkg.branch.covered}/${scrapPkg.branch.total})`);
}
const adbkPkg = packages.find(p => p.name === 'nuri.business.domain.addressbook');
if (adbkPkg) {
    console.log(`[AddressBook Domain]`);
    console.log(`  Instruction Coverage: ${adbkPkg.instruction.pct.toFixed(2)}% (${adbkPkg.instruction.covered}/${adbkPkg.instruction.total})`);
    console.log(`  Branch Coverage:      ${adbkPkg.branch.pct.toFixed(2)}% (${adbkPkg.branch.covered}/${adbkPkg.branch.total})`);
}
console.log('======================================================');

