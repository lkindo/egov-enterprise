const fs = require('fs');
const path = require('path');

const entityConstraints = {};
const dtoFiles = [];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (dirPath.includes('node_modules') || dirPath.includes('.git') || dirPath.includes('build')) return;
        
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.java')) {
            callback(dirPath);
        }
    });
}

// 1. Scan Entities
function scanEntity(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('@Entity')) {
        if (filePath.endsWith('Dto.java') || filePath.endsWith('DTO.java') || filePath.endsWith('Request.java')) {
            // Ignore Response DTOs
            if (!filePath.endsWith('Response.java') && !filePath.includes('ResDto')) {
                dtoFiles.push(filePath);
            }
        }
        return;
    }

    const lines = content.split('\n');
    let currentColumnData = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('@Column')) {
            currentColumnData = { nullable: true, length: 255 };
            const lengthMatch = line.match(/length\s*=\s*(\d+)/);
            if (lengthMatch) currentColumnData.length = parseInt(lengthMatch[1]);
            
            const nullableMatch = line.match(/nullable\s*=\s*false/);
            if (nullableMatch) currentColumnData.nullable = false;
        }

        const fieldMatch = line.match(/private\s+([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*;/);
        if (fieldMatch) {
            const fieldType = fieldMatch[1];
            const fieldName = fieldMatch[2];
            
            if (currentColumnData) {
                currentColumnData.type = fieldType;
                entityConstraints[fieldName] = currentColumnData;
            } else if (line.includes('@Id')) {
                entityConstraints[fieldName] = { nullable: false, type: fieldType, length: null };
            }
            // Reset
            currentColumnData = null;
        }
    }
}

// 2. Inject Validation into DTOs
function fixDto(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has validation to prevent double-fixing
    if (/@(NotNull|NotEmpty|NotBlank|Size|Min|Max|Pattern|Email)/.test(content)) return;
    
    let modified = false;
    let lines = content.split('\n');
    let outLines = [];
    let importAdded = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Add import after package
        if (line.startsWith('package ') && !importAdded) {
            outLines.push(line);
            outLines.push('');
            outLines.push('import jakarta.validation.constraints.*;');
            importAdded = true;
            modified = true;
            continue;
        }

        const fieldMatch = line.match(/^\s*private\s+([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*;/);
        if (fieldMatch) {
            const fieldType = fieldMatch[1];
            const fieldName = fieldMatch[2];
            const constraints = entityConstraints[fieldName];
            
            if (constraints) {
                const indentMatch = line.match(/^(\s*)/);
                const indent = indentMatch ? indentMatch[1] : '    ';
                
                if (fieldType === 'String' && constraints.length && constraints.length !== 255) {
                    outLines.push(`${indent}@Size(max = ${constraints.length})`);
                    modified = true;
                }
                
                if (!constraints.nullable) {
                    if (fieldType === 'String') {
                        outLines.push(`${indent}@NotBlank`);
                    } else {
                        outLines.push(`${indent}@NotNull`);
                    }
                    modified = true;
                }
            }
        }
        
        outLines.push(line);
    }
    
    if (modified) {
        fs.writeFileSync(filePath, outLines.join('\n'));
        console.log(`[FIXED] ${filePath}`);
    }
}

console.log("🛡️ Starting API Contract Guardian - Phase 1: Auto-Fixing DTOs...");

['api-server', 'foundation', 'business-suite'].forEach(dir => {
    if (fs.existsSync(dir)) walkDir(dir, scanEntity);
});

console.log(`Extracted DB constraints for ${Object.keys(entityConstraints).length} fields.`);
console.log(`Found ${dtoFiles.length} Target DTO files. Applying fixes...`);

dtoFiles.forEach(fixDto);

console.log(`\nAuto-Fix Complete.`);
