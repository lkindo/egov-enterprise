const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (dirPath.includes('node_modules') || dirPath.includes('.git') || dirPath.includes('build')) return;
        
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('Dto.java') || f.endsWith('DTO.java') || f.endsWith('Request.java') || f.endsWith('Response.java')) {
            callback(dirPath);
        }
    });
}

let totalDtos = 0;
let missingValidationDtos = [];
let validDtos = 0;

function scanDto(filePath) {
    totalDtos++;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for Validation annotations
    const hasValidation = /@(NotNull|NotEmpty|NotBlank|Size|Min|Max|Pattern|Email)/.test(content);
    
    // Ignore pure Response DTOs which often don't need input validation
    if (filePath.endsWith('Response.java') || filePath.includes('ResDto')) {
        validDtos++;
        return;
    }
    
    if (!hasValidation) {
        missingValidationDtos.push(filePath);
    } else {
        validDtos++;
    }
}

console.log("🛡️ Starting API Contract Guardian - Phase 1: Code-Level DTO Validation Mirroring Audit...");
['api-server', 'foundation', 'business-suite'].forEach(dir => {
    if (fs.existsSync(dir)) walkDir(dir, scanDto);
});

console.log(`\nAudit Complete.`);
console.log(`Total DTOs Scanned: ${totalDtos}`);
console.log(`DTOs lacking DB Constraint Mirroring (No Validation Annotations): ${missingValidationDtos.length}`);

if (missingValidationDtos.length > 0) {
    console.log("\n[Sample DTOs missing Validation Mirroring]");
    missingValidationDtos.slice(0, 5).forEach(f => console.log(`- ${f}`));
}

fs.writeFileSync('guardian-report.txt', missingValidationDtos.join('\n'));
