const fs = require('fs');
const path = require('path');

console.log("1. Loading API Specification and Zod Schemas...");

// 1. OpenAPI Specification 로드 (api-docs.json)
const openApiPath = path.resolve('api-docs.json');
if (!fs.existsSync(openApiPath)) {
    console.error("Error: api-docs.json not found in root directory.");
    process.exit(1);
}
const openApi = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));
const schemas = openApi.components ? openApi.components.schemas : {};

// OpenAPI 스펙 Map 구축: dtoName -> { fields: { fieldName -> { type, required } }, requiredFields: [] }
const openApiSchemaMap = {};
Object.entries(schemas).forEach(([dtoName, schemaInfo]) => {
    // ApiResponseVoid 등의 제네릭 래퍼나 Void DTO 등
    const properties = schemaInfo.properties || {};
    const requiredList = schemaInfo.required || [];
    
    const fields = {};
    Object.entries(properties).forEach(([fieldName, fieldSpec]) => {
        fields[fieldName] = {
            type: fieldSpec.type || 'object',
            required: requiredList.includes(fieldName),
            description: fieldSpec.description || ''
        };
    });
    
    openApiSchemaMap[dtoName] = {
        dtoName: dtoName,
        fields: fields,
        fieldCount: Object.keys(fields).length,
        requiredFields: requiredList
    };
});

console.log(`Successfully mapped ${Object.keys(openApiSchemaMap).length} DTOs from OpenAPI.`);

// 2. Frontend Zod Schema 로드 및 파싱 (generated-zod.ts)
const zodPath = path.resolve('frontend/src/types/generated-zod.ts');
if (!fs.existsSync(zodPath)) {
    console.error("Error: generated-zod.ts not found. Run npm run codegen:ts first or check path.");
    process.exit(1);
}

const zodContent = fs.readFileSync(zodPath, 'utf-8');
const lines = zodContent.split('\n');

// Zod 스키마 파싱
// export const [DTOName]Schema = z.object({
const zodSchemaMap = {};
let currentDtoName = null;
let currentFields = [];

lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('export const ') && trimmed.includes('Schema = z.object({')) {
        const match = trimmed.match(/export\s+const\s+([A-Za-z0-9_]+)Schema\s*=\s*z\.object\(\{/);
        if (match) {
            currentDtoName = match[1];
            currentFields = [];
        }
    } else if (currentDtoName && trimmed === '});') {
        zodSchemaMap[currentDtoName] = {
            dtoName: currentDtoName,
            fields: currentFields,
            fieldCount: currentFields.length
        };
        currentDtoName = null;
    } else if (currentDtoName && trimmed.length > 0) {
        // 필드 파싱
        // 예: reportId: z.string().optional(),
        // 예: userId: z.string().min(4).max(20).regex(...),
        const fieldMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*:/);
        if (fieldMatch) {
            const fieldName = fieldMatch[1];
            const isOptional = trimmed.includes('.optional()');
            currentFields.push({
                fieldName: fieldName,
                isOptional: isOptional,
                rawLine: trimmed
            });
        }
    }
});

console.log(`Successfully parsed ${Object.keys(zodSchemaMap).length} DTO Zod Schemas from Frontend.`);

// 3. 정합성 대조
console.log("3. Comparing OpenAPI DTOs and Zod Schemas...");
const auditResults = {
    missingInZod: [],     // OpenAPI 에는 있으나 Zod 에 없는 필드
    missingInOpenApi: [], // Zod 에는 있으나 OpenAPI 에 없는 필드 (FE가 더 많은 경우!)
    requiredMismatches: [], // Required 속성이 일치하지 않는 경우
    countMismatches: []   // 필드 개수 자체가 다른 경우
};

// OpenAPI DTO 기준 Zod 와 대조
Object.entries(openApiSchemaMap).forEach(([dtoName, openApiDto]) => {
    const zodDto = zodSchemaMap[dtoName];
    if (!zodDto) {
        // Zod 에 DTO 가 없는 경우 (보통 Void 타입 등이거나 자동 생성 제외되었을 수 있음)
        return;
    }

    const openApiFields = Object.keys(openApiDto.fields);
    const zodFields = zodDto.fields.map(f => f.fieldName);

    // 1. 필드 개수 및 불일치
    if (openApiDto.fieldCount !== zodDto.fieldCount) {
        auditResults.countMismatches.push({
            dtoName: dtoName,
            openApiCount: openApiDto.fieldCount,
            zodCount: zodDto.fieldCount,
            openApiFields: openApiFields,
            zodFields: zodFields
        });
    }

    // 2. OpenAPI 에는 있으나 Zod 에 없는 필드
    openApiFields.forEach(fieldName => {
        if (!zodFields.includes(fieldName)) {
            auditResults.missingInZod.push({
                dtoName: dtoName,
                fieldName: fieldName,
                spec: openApiDto.fields[fieldName]
            });
        }
    });

    // 3. Zod 에는 있으나 OpenAPI 에 없는 필드 (필드 개수 쌍 불일치의 주 원인!)
    zodDto.fields.forEach(zodField => {
        if (!openApiFields.includes(zodField.fieldName)) {
            auditResults.missingInOpenApi.push({
                dtoName: dtoName,
                fieldName: zodField.fieldName,
                rawLine: zodField.rawLine
            });
        }
        
        // 4. Required 속성 대조
        const openApiFieldSpec = openApiDto.fields[zodField.fieldName];
        if (openApiFieldSpec) {
            // BE 에서 필수(required: true)인데 FE Zod에서 optional()인 경우 또는 그 반대
            const beRequired = openApiFieldSpec.required;
            const feRequired = !zodField.isOptional;
            
            if (beRequired !== feRequired) {
                auditResults.requiredMismatches.push({
                    dtoName: dtoName,
                    fieldName: zodField.fieldName,
                    beRequired: beRequired,
                    feRequired: feRequired
                });
            }
        }
    });
});

console.log("\n=== BE-FE Schema Auditing Results ===");
console.log(`Zod vs OpenAPI Count Mismatches (DTO-level): ${auditResults.countMismatches.length}`);
console.log(`Fields missing in Zod (BE has, FE lacks): ${auditResults.missingInZod.length}`);
console.log(`Fields missing in OpenAPI (FE has, BE lacks - Extra FE fields!): ${auditResults.missingInOpenApi.length}`);
console.log(`Required Mismatches: ${auditResults.requiredMismatches.length}`);

// 결과를 JSON 파일로 저장
fs.writeFileSync('scratch/be-fe-audit-report.json', JSON.stringify(auditResults, null, 2));
console.log("\nSaved BE-FE audit report to scratch/be-fe-audit-report.json");
