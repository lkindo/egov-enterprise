const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. DB 스키마 덤프
console.log("1. Fetching PostgreSQL schema information via DB Bridge...");
let dbColumns = [];
try {
    const query = `
        SELECT 
            table_name, 
            column_name, 
            data_type, 
            character_maximum_length, 
            is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, column_name;
    `;
    // DB Bridge 호출하여 결과를 JSON으로 가져옴
    // db-bridge.js는 '--json' 인자가 있으면 console.log로 JSON 형식 문자열을 출력함
    const output = execSync(`node .agent/scripts/db-bridge.js "${query.replace(/\s+/g, ' ')}" --json`, { encoding: 'utf8' });
    
    // JSON 부분만 발라내기
    const jsonStartIndex = output.indexOf('[');
    if (jsonStartIndex !== -1) {
        dbColumns = JSON.parse(output.substring(jsonStartIndex));
        console.log(`Successfully fetched ${dbColumns.length} columns from DB.`);
    } else {
        console.error("Failed to parse DB schema: No JSON array found in output.", output);
        process.exit(1);
    }
} catch (err) {
    console.error("DB Bridge Execution Error:", err.message);
    process.exit(1);
}

// DB 스펙 Map 구축: table_name -> { column_name -> column_info }
const dbSchemaMap = {};
dbColumns.forEach(c => {
    const tName = c.table_name.toLowerCase();
    if (!dbSchemaMap[tName]) {
        dbSchemaMap[tName] = {};
    }
    dbSchemaMap[tName][c.column_name.toLowerCase()] = {
        column_name: c.column_name,
        data_type: c.data_type,
        character_maximum_length: c.character_maximum_length,
        is_nullable: c.is_nullable === 'YES'
    };
});

// 2. Java Entity 파일 탐색 및 파싱
console.log("2. Scanning Java Entities...");
const entities = [];

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

// CamelCase to snake_case 변환 함수
function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, "");
}

function parseJavaEntity(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('@Entity')) return; // Entity 클래스가 아님

    // 테이블 이름 찾기
    const tableMatch = content.match(/@Table\s*\(\s*name\s*=\s*["']([^"']+)["']/);
    if (!tableMatch) return; // 테이블 지정이 없으면 기본명인데 본 프로젝트는 필수 지정됨
    
    const tableName = tableMatch[1].toLowerCase();
    
    // 필드 분석
    const entityInfo = {
        file: filePath,
        tableName: tableName,
        className: path.basename(filePath, '.java'),
        fields: []
    };

    // 소스코드를 멤버 변수 단위로 나누기 위해 대략적 파싱
    // 주석 제거
    const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    
    // 필드 및 어노테이션 블록 매칭
    // 간소화된 어노테이션 + 필드 패턴 매칭
    const fieldRegex = /((?:@[A-Za-z0-9_]+(?:\([^)]*\))?\s*)*)(?:private|protected|public)\s+([A-Za-z0-9_<>\?]+)\s+([A-Za-z0-9_]+)\s*(?:=[\s\S]*?)?;/g;
    
    let match;
    while ((match = fieldRegex.exec(cleanContent)) !== null) {
        const annotationsText = match[1];
        const fieldType = match[2];
        const fieldName = match[3];

        if (fieldName === 'serialVersionUID') continue;

        // @Transient 필드는 DB와 연동하지 않으므로 제외
        if (annotationsText.includes('@Transient')) continue;

        // 컬럼명 결정
        let columnName = toSnakeCase(fieldName);
        
        // @Column(name = "...") 체크
        const columnMatch = annotationsText.match(/@Column\s*\([^)]*name\s*=\s*["']([^"']+)["']/);
        if (columnMatch) {
            columnName = columnMatch[1];
        }

        // @JoinColumn(name = "...") 체크 (외래키 매핑)
        const joinColumnMatch = annotationsText.match(/@JoinColumn\s*\([^)]*name\s*=\s*["']([^"']+)["']/);
        if (joinColumnMatch) {
            columnName = joinColumnMatch[1];
        }

        // nullable 여부
        let isNullable = true;
        if (annotationsText.includes('nullable = false') || 
            annotationsText.includes('@NotNull') || 
            annotationsText.includes('@NotBlank') || 
            annotationsText.includes('@NotEmpty') ||
            annotationsText.includes('@NonNull')) {
            isNullable = false;
        }

        // length (문자열 길이 제한)
        let length = null;
        const lengthMatch = annotationsText.match(/length\s*=\s*(\d+)/);
        if (lengthMatch) {
            length = parseInt(lengthMatch[1]);
        }
        const sizeMatch = annotationsText.match(/@Size\s*\([^)]*max\s*=\s*(\d+)/);
        if (sizeMatch) {
            length = parseInt(sizeMatch[1]);
        }

        entityInfo.fields.push({
            fieldName: fieldName,
            fieldType: fieldType,
            columnName: columnName.toLowerCase(),
            isNullable: isNullable,
            length: length,
            annotations: annotationsText
        });
    }

    entities.push(entityInfo);
}

['api-server', 'business-suite', 'foundation'].forEach(dir => {
    if (fs.existsSync(dir)) walkDir(dir, parseJavaEntity);
});
console.log(`Parsed ${entities.length} entities.`);

// 3. 정합성 대조
console.log("3. Comparing Database and JPA Entities...");
const auditResults = {
    missingTables: [], // Entity 에는 정의되었으나 DB 에 테이블이 없는 경우
    columnMismatches: [], // Entity 에는 정의된 컬럼이 DB 에 없는 경우 (column not found 위험!)
    nullableMismatches: [], // DB 는 NOT NULL 인데 Entity 는 nullable = true 인 경우 (제약조건 위반 위험!)
    lengthMismatches: [], // Java 의 length 가 DB 컬럼의 maximum_length 보다 큰 경우 (Data truncation 위험!)
};

entities.forEach(entity => {
    const dbTable = dbSchemaMap[entity.tableName];
    if (!dbTable) {
        auditResults.missingTables.push({
            className: entity.className,
            tableName: entity.tableName,
            file: entity.file
        });
        return;
    }

    entity.fields.forEach(field => {
        // 연관관계 매핑 객체(Collection, List 등)는 조인 컬럼(@JoinColumn)이 명시되지 않았거나 필드가 일반 필드가 아니면 DB 직접 매핑에서 건너뜀
        if (field.fieldType.includes('List') || field.fieldType.includes('Set') || field.fieldType.includes('Map')) {
            // 컬렉션 타입은 @Column 이나 @JoinColumn 이 없으면 DB 필드와 1:1 대응되지 않음
            if (!field.annotations.includes('@JoinColumn') && !field.annotations.includes('@Column')) {
                return; 
            }
        }

        const dbCol = dbTable[field.columnName];
        if (!dbCol) {
            // @ManyToOne 등 매핑 필드인데 @JoinColumn이 명시되지 않은 필드는 skip 할 수 있도록 필터링
            // 자바 객체 타입인데 어노테이션에 Join 이나 Column이 없으면 JPA 연관관계 필드
            if (!field.annotations.includes('@Column') && !field.annotations.includes('@JoinColumn') && 
                (field.fieldType !== 'String' && field.fieldType !== 'Integer' && field.fieldType !== 'Long' && 
                 field.fieldType !== 'LocalDateTime' && field.fieldType !== 'LocalDate' && field.fieldType !== 'Double' &&
                 field.fieldType !== 'Boolean' && field.fieldType !== 'int' && field.fieldType !== 'long' && field.fieldType !== 'boolean')) {
                return;
            }

            auditResults.columnMismatches.push({
                className: entity.className,
                tableName: entity.tableName,
                fieldName: field.fieldName,
                columnName: field.columnName,
                file: entity.file
            });
            return;
        }

        // Nullable 정합성 검사: DB는 NOT NULL(false)인데 Entity는 Nullable(true)인 경우
        if (!dbCol.is_nullable && field.isNullable) {
            auditResults.nullableMismatches.push({
                className: entity.className,
                tableName: entity.tableName,
                fieldName: field.fieldName,
                columnName: field.columnName,
                file: entity.file
            });
        }

        // 길이 정합성 검사 (DB varchar 등이고 크기가 제한되어 있을 때)
        if (dbCol.character_maximum_length && field.length) {
            if (field.length > dbCol.character_maximum_length) {
                auditResults.lengthMismatches.push({
                    className: entity.className,
                    tableName: entity.tableName,
                    fieldName: field.fieldName,
                    columnName: field.columnName,
                    javaLength: field.length,
                    dbLength: dbCol.character_maximum_length,
                    file: entity.file
                });
            }
        }
    });
});

console.log("\n=== DB-BE Auditing Results ===");
console.log(`Missing Tables: ${auditResults.missingTables.length}`);
console.log(`Column Mismatches (Entity has column, DB does not): ${auditResults.columnMismatches.length}`);
console.log(`Nullable Mismatches (DB is NOT NULL, Entity is nullable): ${auditResults.nullableMismatches.length}`);
console.log(`Length Mismatches (Entity length > DB length): ${auditResults.lengthMismatches.length}`);

// 결과를 JSON 파일로 저장
fs.writeFileSync('scratch/db-be-audit-report.json', JSON.stringify(auditResults, null, 2));
console.log("\nSaved DB-BE audit report to scratch/db-be-audit-report.json");
