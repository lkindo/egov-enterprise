const fs = require('fs');
const path = require('path');

// 경로 설정
const projectRoot = path.join(__dirname, '..', '..');
const apiDocsPath = process.env.CODEGEN_API_DOCS_PATH
  ? path.resolve(process.env.CODEGEN_API_DOCS_PATH)
  : path.join(projectRoot, 'api-docs.json');
const outputPath = process.env.CODEGEN_ZOD_OUTPUT_PATH
  ? path.resolve(process.env.CODEGEN_ZOD_OUTPUT_PATH)
  : path.join(projectRoot, 'frontend', 'src', 'types', 'generated-zod.ts');
const operationsOutputPath = process.env.CODEGEN_OPERATIONS_OUTPUT_PATH
  ? path.resolve(process.env.CODEGEN_OPERATIONS_OUTPUT_PATH)
  : path.join(projectRoot, 'frontend', 'src', 'types', 'generated-operations.ts');

console.log('Loading api-docs.json...');
if (!fs.existsSync(apiDocsPath)) {
  console.error(`Error: api-docs.json not found at ${apiDocsPath}`);
  process.exit(1);
}

const apiDocs = JSON.parse(fs.readFileSync(apiDocsPath, 'utf8'));
const schemas = apiDocs.components?.schemas || {};
const schemaNames = Object.keys(schemas);

console.log(`Found ${schemaNames.length} schemas in api-docs.json.`);

// 헬퍼 함수: $ref에서 스키마 이름 추출
function getSchemaNameFromRef(ref) {
  if (!ref) return null;
  if (!ref.startsWith('#/components/schemas/')) {
    throw new Error(`Unsupported schema reference: ${ref}`);
  }
  const parts = ref.split('/');
  const schemaName = parts[parts.length - 1];
  if (!Object.hasOwn(schemas, schemaName)) {
    throw new Error(`Unresolved schema reference: ${ref}`);
  }
  return schemaName;
}

// 헬퍼 함수: 개별 프로퍼티를 Zod 코드로 변환
function directionalSchemaName(schemaName, direction) {
  if (direction === 'request') return `${schemaName}RequestSchema`;
  if (direction === 'response') return `${schemaName}ResponseSchema`;
  return `${schemaName}Schema`;
}

function referencedSchemaExpression(schemaName, direction) {
  const expression = directionalSchemaName(schemaName, direction);
  const schema = schemas[schemaName];
  return direction === 'request' && schema?.type === 'object' && schema.properties
    ? `${expression}.strict()`
    : expression;
}

function propertyAllowedInDirection(prop, direction) {
  if (direction === 'request' && prop.readOnly === true) return false;
  if (direction === 'response' && prop.writeOnly === true) return false;
  return true;
}

function convertPropertyToZod(
  propName,
  prop,
  requiredList = [],
  currentSchemaName = '',
  direction = 'neutral',
) {
  let zodChain = '';
  const isRequired = requiredList.includes(propName);
  let unionNullable = false;

  if (Array.isArray(prop.type)) {
    const uniqueTypes = [...new Set(prop.type)];
    const nonNullTypes = uniqueTypes.filter((type) => type !== 'null');
    const includesNull = uniqueTypes.includes('null');
    if (!includesNull || nonNullTypes.length !== 1) {
      const propertyPath = [currentSchemaName, propName].filter(Boolean).join('.');
      throw new Error(`Unsupported schema type union: ${propertyPath || '<anonymous>'}`);
    }
    prop = { ...prop, type: nonNullTypes[0] };
    unionNullable = true;
  }

  // $ref가 직접 정의된 경우
  if (prop.$ref) {
    const refSchema = getSchemaNameFromRef(prop.$ref);
    const refExpression = referencedSchemaExpression(refSchema, direction);
    if (refSchema === currentSchemaName) {
      zodChain = `z.lazy((): z.ZodType => ${refExpression})`;
    } else {
      zodChain = `z.lazy(() => ${refExpression})`;
    }
  } else {
    switch (prop.type) {
      case 'string':
        if (Array.isArray(prop.enum) && prop.enum.length > 0) {
          // enum 은 z.enum 으로 정확 방출(TS 리터럴 유니온과 정합). min/max/pattern 미적용.
          zodChain = `z.enum(${JSON.stringify(prop.enum)})`;
          break;
        }
        zodChain = prop.format === 'date-time'
          ? 'z.iso.datetime({ offset: true, local: true })'
          : 'z.string()';
        if (prop.minLength !== undefined) {
          zodChain += `.min(${prop.minLength})`;
        }
        if (prop.maxLength !== undefined) {
          zodChain += `.max(${prop.maxLength})`;
        }
        if (prop.pattern !== undefined) {
          // 이스케이프 보호를 위해 JSON.stringify를 활용해 new RegExp 문자열 생성
          const safePattern = JSON.stringify(prop.pattern);
          zodChain += `.regex(new RegExp(${safePattern}))`;
        }
        break;
      case 'integer':
        zodChain = 'z.number()';
        zodChain += '.int()';
        if (prop.minimum !== undefined) {
          zodChain += `.min(${prop.minimum})`;
        }
        if (prop.maximum !== undefined) {
          zodChain += `.max(${prop.maximum})`;
        }
        break;
      case 'number':
        zodChain = 'z.number()';
        if (prop.minimum !== undefined) {
          zodChain += `.min(${prop.minimum})`;
        }
        if (prop.maximum !== undefined) {
          zodChain += `.max(${prop.maximum})`;
        }
        break;
      case 'boolean':
        zodChain = 'z.boolean()';
        break;
      case 'array':
        if (prop.items) {
          if (prop.items.$ref) {
            const refSchema = getSchemaNameFromRef(prop.items.$ref);
            const refExpression = referencedSchemaExpression(refSchema, direction);
            if (refSchema === currentSchemaName) {
              zodChain = `z.array(z.lazy((): z.ZodType => ${refExpression}))`;
            } else {
              zodChain = `z.array(z.lazy(() => ${refExpression}))`;
            }
          } else {
            // 배열 아이템은 항상 present — propName='' 로 인해 붙는 .optional() 을 제거해 TS(string[])와 정합.
            // (배열 필드 자체의 optional 은 아래 isRequired 분기가 별도 처리)
            const itemType = convertPropertyToZod(
              '',
              prop.items,
              [],
              currentSchemaName,
              direction,
            ).replace(/\.optional\(\)$/, '');
            zodChain = `z.array(${itemType})`;
          }
        } else {
          zodChain = 'z.array(z.any())';
        }
        if (prop.minItems !== undefined) {
          zodChain += `.min(${prop.minItems})`;
        }
        if (prop.maxItems !== undefined) {
          zodChain += `.max(${prop.maxItems})`;
        }
        break;
      case 'object':
        if (prop.properties) {
          const nestedProps = [];
          const nestedRequired = prop.required || [];
          for (const [subName, subProp] of Object.entries(prop.properties)) {
            if (!propertyAllowedInDirection(subProp, direction)) continue;
            nestedProps.push(`  ${subName}: ${convertPropertyToZod(
              subName,
              subProp,
              nestedRequired,
              currentSchemaName,
              direction,
            )}`);
          }
          zodChain = `z.object({\n  ${nestedProps.join(',\n  ')}\n})`;
        } else {
          zodChain = 'z.record(z.string(), z.any())';
        }
        break;
      default:
        zodChain = 'z.any()';
    }
  }

  // 필수 값이 아니면 optional 처리
  if (!isRequired) {
    zodChain += '.optional()';
  }

  // nullable인 경우 처리
  if (prop.nullable || unionNullable) {
    zodChain += '.nullable()';
  } else if (!isRequired && direction === 'response') {
    // [2026-09-01] 응답의 non-required 필드는 null 도 허용한다.
    //
    // ⚠ 이것은 계약 완화가 아니라 **거짓 red 의 제거**다. 세 실측이 근거다.
    //   ① springdoc 은 Java DTO 에서 nullability 를 추론하지 않는다 — `@Schema(nullable = true)`
    //      를 손으로 달지 않으면 문서에 아무 표시도 남지 않는다. 즉 문서의 nullable 부재는
    //      "null 이 아니다" 라는 보장이 아니라 "말하지 않았다" 이다.
    //   ② 이 저장소에는 전역 Jackson null 생략 설정이 없다(`ApiResponse` 의 특정 필드에만
    //      `@JsonInclude(NON_NULL)`). 따라서 NULL 허용 컬럼에서 온 값은 응답 JSON 에
    //      `"authrtExpln": null` 로 그대로 실린다 — 정상 동작이다.
    //   ③ zod 의 `.optional()` 은 undefined 만 허용하고 null 을 거부한다. 그래서 ①②가 겹치면
    //      **정상 응답이 런타임에 throw** 된다. 2026-09-01 CI e2e 에서 권한 관리·주소록·알림·
    //      부서업무 화면이 SSR 단계에서 동시에 죽었다(3개 샤드 전부 red).
    //
    // required 필드와 요청(request) 방향은 그대로 엄격하게 둔다 — 서버가 반드시 채우는 값과
    // 클라이언트가 보내는 값은 이 완화의 근거를 공유하지 않는다.
    zodChain += '.nullable()';
  }

  return zodChain;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const BROWSER_MANAGED_COOKIE_SPECIAL = Object.freeze({
  method: 'post',
  operationId: 'reissue',
  path: '/api/v1/auth/reissue',
  parameter: Object.freeze({
    name: 'refreshToken',
    required: false,
    schema: Object.freeze({ type: 'string' }),
  }),
});

function zodExpressionForRequiredValue(schema, currentSchemaName = '', direction = 'neutral') {
  return convertPropertyToZod('__value', schema, ['__value'], currentSchemaName, direction);
}

function multipartBinarySchemaExpression(required) {
  const blob = "z.custom<Blob>((value) => typeof Blob !== 'undefined' && value instanceof Blob)";
  return required ? blob : `${blob}.optional()`;
}

function multipartBinaryPartContract(name, required, multiple, mediaType) {
  let schemaExpression = multipartBinarySchemaExpression(true);
  if (multiple) {
    schemaExpression = `z.array(${schemaExpression})${required ? '.min(1)' : ''}`;
    if (!required) schemaExpression += '.optional()';
  } else if (!required) {
    schemaExpression = multipartBinarySchemaExpression(false);
  }
  return {
    schema: `  ${JSON.stringify(name)}: ${schemaExpression}`,
    part: {
      name,
      required,
      multiple,
      mediaType: mediaType || 'application/octet-stream',
      schemaRef: null,
    },
  };
}

function multipartJsonPartContract(name, propertySchema, required, mediaType) {
  if (propertySchema.type === 'array' || !propertySchema.$ref) return null;
  const schemaExpression = convertPropertyToZod(
    name,
    propertySchema,
    required ? [name] : [],
    '',
    'request',
  );
  return {
    schema: `  ${JSON.stringify(name)}: ${schemaExpression}`,
    part: {
      name,
      required,
      multiple: false,
      mediaType: mediaType || 'application/json',
      schemaRef: propertySchema.$ref,
    },
  };
}

function multipartPartContract(name, propertySchema, required, mediaType, operationId) {
  const multiple = propertySchema.type === 'array';
  const valueSchema = multiple ? propertySchema.items : propertySchema;
  if (valueSchema?.type === 'string' && valueSchema.format === 'binary') {
    return multipartBinaryPartContract(name, required, multiple, mediaType);
  }

  // JSON DTO part는 component $ref로만 허용한다. Inline/primitive part를 임의 문자열로
  // 직렬화하면 media type과 검증 의미가 불명확하므로 생성 시 차단한다.
  const jsonPart = multipartJsonPartContract(name, propertySchema, required, mediaType);
  if (jsonPart) return jsonPart;
  throw new Error(`Unsupported multipart part ${operationId}.${name}`);
}

function multipartRequestContract(multipartContent, operationId) {
  const multipartSchema = multipartContent?.schema;
  if (multipartSchema?.type !== 'object' || !multipartSchema.properties) {
    throw new Error(`Multipart request must declare an object schema for operation ${operationId}`);
  }

  const properties = Object.entries(multipartSchema.properties);
  if (properties.length === 0) {
    throw new Error(`Multipart request must declare at least one part for operation ${operationId}`);
  }

  const requiredParts = new Set(multipartSchema.required || []);
  const contracts = properties.map(([name, propertySchema]) => multipartPartContract(
    name,
    propertySchema,
    requiredParts.has(name),
    multipartContent.encoding?.[name]?.contentType,
    operationId,
  ));

  return {
    schema: `z.object({\n${contracts.map(({ schema }) => schema).join(',\n')}\n}).strict()`,
    parts: contracts.map(({ part }) => part),
  };
}

function firstSuccessResponse(operation) {
  const successes = Object.entries(operation.responses || {})
    .filter(([status]) => /^2\d\d$/.test(status))
    .sort(([left], [right]) => Number(left) - Number(right));
  if (successes.length !== 1) {
    throw new Error(
      `Operation ${operation.operationId} must declare exactly one 2xx response; found ${successes.length}`,
    );
  }
  return successes[0][1];
}

function operationRequestContract(operation) {
  if (!operation.requestBody) {
    return {
      kind: 'none', schema: 'null', sourceSchema: null, multipartParts: null,
    };
  }
  const content = operation.requestBody?.content;
  const mediaTypes = Object.keys(content || {});
  if (mediaTypes.length !== 1) {
    throw new Error(
      `Operation ${operation.operationId} must declare exactly one requestBody content type; found ${mediaTypes.length}`,
    );
  }

  const mediaType = mediaTypes[0];
  if (mediaType === 'application/json') {
    const jsonSchema = content[mediaType]?.schema;
    if (!jsonSchema) {
      throw new Error(`Missing application/json request schema for operation ${operation.operationId}`);
    }
    if (jsonSchema.$ref) {
      const requestSchemaName = getSchemaNameFromRef(jsonSchema.$ref);
      const requestSchema = schemas[requestSchemaName];
      if (requestSchema?.type === 'object') {
        return {
          kind: 'json',
          schema: `${requestSchemaName}RequestSchema.strict()`,
          sourceSchema: jsonSchema,
          multipartParts: null,
        };
      }
    }
    return {
      kind: 'json',
      schema: zodExpressionForRequiredValue(jsonSchema, '', 'request'),
      sourceSchema: jsonSchema,
      multipartParts: null,
    };
  }

  if (mediaType === 'multipart/form-data') {
    const multipartContent = content[mediaType];
    const multipart = multipartRequestContract(multipartContent, operation.operationId);
    return {
      kind: 'multipart',
      schema: multipart.schema,
      sourceSchema: multipartContent.schema,
      multipartParts: multipart.parts,
    };
  }

  throw new Error(`Unsupported request media type for operation ${operation.operationId}`);
}

function operationResponseContract(operation) {
  const successResponse = firstSuccessResponse(operation);
  const content = successResponse?.content;
  if (!content || Object.keys(content).length === 0) {
    throw new Error(`Contentless success response is not supported for operation ${operation.operationId}`);
  }
  const mediaTypes = Object.keys(content);
  if (mediaTypes.length !== 1) {
    throw new Error(
      `Operation ${operation.operationId} must declare exactly one success response content type; found ${mediaTypes.length}`,
    );
  }

  const jsonSchema = content['application/json']?.schema;
  if (jsonSchema) {
    if (!jsonSchema.$ref) {
      throw new Error(`Operation ${operation.operationId} must use an ApiResponse JSON wrapper`);
    }
    const responseSchemaName = getSchemaNameFromRef(jsonSchema.$ref);
    const responseSchema = schemas[responseSchemaName];
    if (!responseSchemaName.startsWith('ApiResponse')) {
      throw new Error(`Operation ${operation.operationId} must use an ApiResponse JSON wrapper`);
    }
    if (responseSchemaName === 'ApiResponseVoid') {
      return {
        kind: 'void',
        schema: 'null',
        envelopeSchema: `${responseSchemaName}ResponseSchema`,
        sourceSchema: null,
      };
    }
    if (!responseSchema?.properties?.data) {
      throw new Error(`ApiResponse JSON wrapper ${responseSchemaName} lacks data for operation ${operation.operationId}`);
    }
    return {
      kind: 'json',
      schema: zodExpressionForRequiredValue(
        responseSchema.properties.data,
        responseSchemaName,
        'response',
      ),
      envelopeSchema: `${responseSchemaName}ResponseSchema`,
      sourceSchema: responseSchema.properties.data,
    };
  }

  const binarySchema = content['*/*']?.schema
    || content['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']?.schema;
  if (binarySchema?.format === 'binary') {
    return { kind: 'binary', schema: 'null', envelopeSchema: 'null', sourceSchema: null };
  }

  throw new Error(`Unsupported response media type for operation ${operation.operationId}`);
}

function mergedOperationParameters(pathItem, operation) {
  const parameters = new Map();
  for (const parameter of [...(pathItem.parameters || []), ...(operation.parameters || [])]) {
    if (parameter.$ref) {
      throw new Error(`Referenced parameters are not supported for operation ${operation.operationId}`);
    }
    parameters.set(`${parameter.in}:${parameter.name}`, parameter);
  }
  return [...parameters.values()];
}

function matchesBrowserManagedCookieSpecial(operationPath, method, operation, cookieParameters) {
  const special = BROWSER_MANAGED_COOKIE_SPECIAL;
  if (operationPath !== special.path
    || method !== special.method
    || operation.operationId !== special.operationId
    || cookieParameters.length !== 1) return false;
  const [parameter] = cookieParameters;
  const schemaKeys = Object.keys(parameter.schema || {});
  return parameter.name === special.parameter.name
    && parameter.required === special.parameter.required
    && schemaKeys.length === 1
    && parameter.schema?.type === special.parameter.schema.type
    && parameter.style === undefined
    && parameter.explode === undefined
    && parameter.allowReserved === undefined;
}

function validateParameterSerialization(parameter, operation) {
  if (parameter.in === 'query') {
    if (parameter.style !== undefined && parameter.style !== 'form') {
      throw new Error(`Unsupported query style for ${operation.operationId}.${parameter.name}`);
    }
    if (parameter.explode !== undefined && parameter.explode !== true) {
      throw new Error(`Unsupported query explode for ${operation.operationId}.${parameter.name}`);
    }
    if (parameter.allowReserved !== undefined && parameter.allowReserved !== false) {
      throw new Error(`Unsupported query allowReserved for ${operation.operationId}.${parameter.name}`);
    }
    return;
  }
  if (parameter.in === 'path') {
    if (parameter.style !== undefined && parameter.style !== 'simple') {
      throw new Error(`Unsupported path style for ${operation.operationId}.${parameter.name}`);
    }
    if (parameter.explode !== undefined && parameter.explode !== false) {
      throw new Error(`Unsupported path explode for ${operation.operationId}.${parameter.name}`);
    }
    if (parameter.allowReserved !== undefined) {
      throw new Error(`Unsupported path allowReserved for ${operation.operationId}.${parameter.name}`);
    }
    return;
  }
  if (parameter.in === 'header') {
    throw new Error(`Header parameters are not supported for operation ${operation.operationId}`);
  }
  if (parameter.in !== 'cookie') {
    throw new Error(`Unsupported parameter location ${parameter.in} for operation ${operation.operationId}`);
  }
}

function validatedOperationParameters(operationPath, method, pathItem, operation) {
  const parameters = mergedOperationParameters(pathItem, operation);
  const cookieParameters = parameters.filter((parameter) => parameter.in === 'cookie');
  const isCookieSpecial = operationPath === BROWSER_MANAGED_COOKIE_SPECIAL.path
    && method === BROWSER_MANAGED_COOKIE_SPECIAL.method
    && operation.operationId === BROWSER_MANAGED_COOKIE_SPECIAL.operationId;
  if ((cookieParameters.length > 0 || isCookieSpecial)
    && !matchesBrowserManagedCookieSpecial(operationPath, method, operation, cookieParameters)) {
    throw new Error(`Unsupported cookie parameter contract for operation ${operation.operationId}`);
  }

  for (const parameter of parameters) validateParameterSerialization(parameter, operation);
  // refreshToken은 HttpOnly cookie라 generic executor argument로 받을 수 없다. 정확히 검증된
  // auth reissue special만 브라우저/BFF가 전달하도록 두고 path/query schema에서는 의도적으로 제외한다.
  return parameters;
}

function operationParameterSchema(parameters, operation, location) {
  const selectedParameters = parameters
    .filter((parameter) => parameter.in === location);
  if (selectedParameters.length === 0) return 'null';

  const required = selectedParameters
    .filter((parameter) => parameter.required || location === 'path')
    .map((parameter) => parameter.name);
  const fields = selectedParameters.map((parameter) => {
    if (!parameter.schema) {
      throw new Error(`Missing ${location} schema for ${operation.operationId}.${parameter.name}`);
    }
    return `${JSON.stringify(parameter.name)}: ${convertPropertyToZod(
      parameter.name,
      parameter.schema,
      required,
    )}`;
  });
  return `z.object({ ${fields.join(', ')} }).strict()`;
}

function operationForbiddenPaths(schema, forbiddenProperty, prefix = [], visited = new Set()) {
  if (!schema || typeof schema !== 'object') return [];
  if (schema.$ref) {
    const schemaName = getSchemaNameFromRef(schema.$ref);
    if (visited.has(schemaName)) return [];
    const nextVisited = new Set(visited);
    nextVisited.add(schemaName);
    return operationForbiddenPaths(schemas[schemaName], forbiddenProperty, prefix, nextVisited);
  }
  if (schema.type === 'array') {
    return operationForbiddenPaths(schema.items, forbiddenProperty, [...prefix, '*'], visited);
  }
  if (schema.type !== 'object' && !schema.properties) return [];

  const paths = [];
  for (const [propertyName, propertySchema] of Object.entries(schema.properties || {})) {
    const propertyPath = [...prefix, propertyName];
    if (propertySchema?.[forbiddenProperty] === true) {
      paths.push(propertyPath);
      continue;
    }
    paths.push(...operationForbiddenPaths(propertySchema, forbiddenProperty, propertyPath, visited));
  }
  return paths;
}

// Zod 스키마 코드 빌드
let codeLines = [
  '// ==========================================================================',
  '// ⚠️ WARNING: Auto-generated file. Do not edit this file manually.',
  '// This file is generated by codegen-zod.js using api-docs.json.',
  '// ==========================================================================',
  '',
  "import { z } from 'zod';",
  ''
];

// 각 스키마의 Zod Object를 문자열로 빌드
for (const schemaName of schemaNames) {
  const schema = schemas[schemaName];
  
  codeLines.push(`// ==========================================================================`);
  codeLines.push(`// ${schemaName} Schema`);
  codeLines.push(`// ==========================================================================`);
  
  if (schema.type === 'object' && schema.properties) {
    const requiredList = schema.required || [];
    codeLines.push(`export const ${schemaName}Schema = z.object({`);
    
    for (const [propName, prop] of Object.entries(schema.properties)) {
      const zodProp = convertPropertyToZod(propName, prop, requiredList, schemaName);
      codeLines.push(`  ${propName}: ${zodProp},`);
    }
    
    codeLines.push(`});`);
    codeLines.push(`export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`);
  } else if (schema.type === 'array' && schema.items) {
    if (schema.items.$ref) {
      const refSchema = getSchemaNameFromRef(schema.items.$ref);
      codeLines.push(`export const ${schemaName}Schema = z.array(z.lazy(() => ${refSchema}Schema));`);
    } else {
      codeLines.push(`export const ${schemaName}Schema = z.array(z.any());`);
    }
    codeLines.push(`export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`);
  } else {
    // 그 외 단선 타입이거나 맵 형식 등
    codeLines.push(`export const ${schemaName}Schema = z.any();`);
    codeLines.push(`export type ${schemaName} = any;`);
  }
  codeLines.push('');
}

// 요청/응답 방향별 스키마. OpenAPI readOnly/writeOnly은 동일 component에서도
// 방향에 따라 required 의미가 다르므로 중립 스키마를 그대로 재사용하지 않는다.
for (const schemaName of schemaNames) {
  const schema = schemas[schemaName];
  for (const direction of ['request', 'response']) {
    const directionalName = directionalSchemaName(schemaName, direction);
    if (schema.type === 'object' && schema.properties) {
      const requiredList = schema.required || [];
      codeLines.push(`export const ${directionalName} = z.object({`);
      for (const [propName, prop] of Object.entries(schema.properties)) {
        if (!propertyAllowedInDirection(prop, direction)) continue;
        const zodProp = convertPropertyToZod(
          propName,
          prop,
          requiredList,
          schemaName,
          direction,
        );
        codeLines.push(`  ${propName}: ${zodProp},`);
      }
      codeLines.push('});');
    } else if (schema.type === 'array' && schema.items) {
      const itemSchema = convertPropertyToZod(
        '',
        schema.items,
        [],
        schemaName,
        direction,
      ).replace(/\.optional\(\)$/, '');
      codeLines.push(`export const ${directionalName} = z.array(${itemSchema});`);
    } else {
      codeLines.push(`export const ${directionalName} = ${schemaName}Schema;`);
    }
    codeLines.push('');
  }
}

// 디렉토리 존재 확인 및 생성
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 파일 쓰기
fs.writeFileSync(outputPath, codeLines.join('\n'), 'utf8');
console.log(`\nSuccessfully compiled and generated Zod schemas to ${outputPath}!`);
console.log(`Generated file size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB.`);

const operationDefinitions = [];
const operationIds = new Set();
for (const [operationPath, pathItem] of Object.entries(apiDocs.paths || {})) {
  for (const method of HTTP_METHODS) {
    const operation = pathItem[method];
    if (!operation) continue;
    const operationId = operation.operationId;
    if (!operationId || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(operationId)) {
      throw new Error(`Invalid or missing operationId for ${method.toUpperCase()} ${operationPath}`);
    }
    if (operationIds.has(operationId)) {
      throw new Error(`Duplicate operationId: ${operationId}`);
    }
    operationIds.add(operationId);
    const parameters = validatedOperationParameters(operationPath, method, pathItem, operation);
    operationDefinitions.push({
      id: operationId,
      method,
      path: operationPath,
      pathSchema: operationParameterSchema(parameters, operation, 'path'),
      querySchema: operationParameterSchema(parameters, operation, 'query'),
      requestRequired: Boolean(operation.requestBody?.required),
      request: operationRequestContract(operation),
      response: operationResponseContract(operation),
    });
  }
}

const operationSchemaNames = new Set();
for (const definition of operationDefinitions) {
  for (const expression of [
    definition.pathSchema,
    definition.querySchema,
    definition.request.schema,
    definition.response.schema,
    definition.response.envelopeSchema,
  ]) {
    for (const match of expression.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*Schema)\b/g)) {
      operationSchemaNames.add(match[1]);
    }
  }
}
const schemaImports = [...operationSchemaNames].sort().join(',\n  ');
const operationLines = [
  '// ==========================================================================',
  '// ⚠️ WARNING: Auto-generated file. Do not edit this file manually.',
  '// This file is generated by codegen-zod.js using api-docs.json.',
  '// ==========================================================================',
  '',
  "import { z } from 'zod';",
  "import type { operations } from './generated-api';",
  'import {',
  `  ${schemaImports}`,
  "} from './generated-zod';",
  '',
  'export type GeneratedOperationId = keyof operations;',
  "export type GeneratedRequestKind = 'none' | 'json' | 'multipart';",
  "export type GeneratedResponseKind = 'json' | 'void' | 'binary';",
  'export interface GeneratedMultipartPartDescriptor {',
  '  readonly name: string;',
  '  readonly required: boolean;',
  '  readonly multiple: boolean;',
  '  readonly mediaType: string;',
  "  readonly schemaRef: `#/components/schemas/${string}` | null;",
  '}',
  'export type GeneratedMultipartParts = readonly GeneratedMultipartPartDescriptor[];',
  '',
  'type SuccessfulStatus = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;',
  'type SuccessResponse<I extends GeneratedOperationId> =',
  "  operations[I] extends { responses: infer Responses }",
  '    ? Responses[Extract<keyof Responses, SuccessfulStatus>]',
  '    : never;',
  'type JsonContent<Response> = Response extends { content: infer Content }',
  "  ? Content extends { 'application/json': infer Json } ? Json : never",
  '  : never;',
  'type ApiData<Payload> = Payload extends { data?: infer Data } ? Exclude<Data, undefined> : Payload;',
  '',
  'export type GeneratedOperationData<I extends GeneratedOperationId> = ApiData<JsonContent<SuccessResponse<I>>>;',
  'export type GeneratedOperationPath<I extends GeneratedOperationId> =',
  "  Exclude<operations[I]['parameters']['path'], undefined>;",
  'export type GeneratedOperationQuery<I extends GeneratedOperationId> =',
  "  Exclude<operations[I]['parameters']['query'], undefined>;",
  'export type GeneratedOperationRequest<I extends GeneratedOperationId> =',
  "  operations[I] extends { requestBody?: infer Body }",
  "    ? Exclude<Body, undefined> extends { content: infer Content }",
  "      ? Content extends { 'application/json': infer Json } ? Json",
  "        : Content extends { 'multipart/form-data': infer Multipart } ? Multipart",
  '          : never',
  '        : never',
  '    : never;',
  '',
  'export interface GeneratedOperationDescriptor<',
  '  I extends GeneratedOperationId = GeneratedOperationId,',
  '  RequestKind extends GeneratedRequestKind = GeneratedRequestKind,',
  '  ResponseKind extends GeneratedResponseKind = GeneratedResponseKind,',
  '  RequestRequired extends boolean = boolean,',
  '  MultipartParts extends GeneratedMultipartParts | null = GeneratedMultipartParts | null,',
  '> {',
  '  readonly id: I;',
  "  readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete';",
  '  readonly path: string;',
  '  readonly requestKind: RequestKind;',
  '  readonly responseKind: ResponseKind;',
  '  readonly requestRequired: RequestRequired;',
  '  readonly multipartParts: MultipartParts;',
  '  readonly pathSchema: z.ZodType | null;',
  '  readonly querySchema: z.ZodType | null;',
  '  readonly requestSchema: z.ZodType | null;',
  '  readonly responseSchema: z.ZodType | null;',
  '  readonly envelopeSchema: z.ZodType | null;',
  '  readonly requestForbiddenPaths: readonly (readonly string[])[];',
  '  readonly responseForbiddenPaths: readonly (readonly string[])[];',
  '}',
  '',
  'type MultipartPartOf<Descriptor extends GeneratedOperationDescriptor> =',
  "  Exclude<Descriptor['multipartParts'], null>[number];",
  'type MultipartPartName<Descriptor extends GeneratedOperationDescriptor> =',
  "  MultipartPartOf<Descriptor>['name'];",
  'type RequiredMultipartPartName<Descriptor extends GeneratedOperationDescriptor> =',
  '  MultipartPartOf<Descriptor> extends infer Part',
  '    ? Part extends { readonly name: infer Name extends string; readonly required: true } ? Name : never',
  '    : never;',
  'type MultipartSourceValue<',
  '  Descriptor extends GeneratedOperationDescriptor,',
  '  Name extends PropertyKey,',
  '> = Name extends keyof GeneratedOperationRequest<Descriptor[\'id\']>',
  '  ? Exclude<GeneratedOperationRequest<Descriptor[\'id\']>[Name], undefined>',
  '  : never;',
  'type MultipartPartValue<',
  '  Descriptor extends GeneratedOperationDescriptor,',
  '  Name extends MultipartPartName<Descriptor>,',
  '> = Extract<MultipartPartOf<Descriptor>, { readonly name: Name }> extends infer Part',
  '  ? Part extends { readonly schemaRef: string }',
  '    ? MultipartSourceValue<Descriptor, Name>',
  '    : Part extends { readonly multiple: true } ? readonly Blob[] : Blob',
  '  : never;',
  'export type GeneratedMultipartLogicalRequest<Descriptor extends GeneratedOperationDescriptor> =',
  '  {',
  '    [Name in RequiredMultipartPartName<Descriptor>]: MultipartPartValue<Descriptor, Name>',
  '  } & {',
  '    [Name in Exclude<MultipartPartName<Descriptor>, RequiredMultipartPartName<Descriptor>>]?:',
  '      MultipartPartValue<Descriptor, Name>',
  '  };',
  '',
  'export type GeneratedOperationResponse<Descriptor extends GeneratedOperationDescriptor> =',
  "  Descriptor['responseKind'] extends 'void' ? void",
  "    : Descriptor['responseKind'] extends 'binary' ? Blob",
  "      : GeneratedOperationData<Descriptor['id']>;",
  '',
  'function defineGeneratedOperation<',
  '  const I extends GeneratedOperationId,',
  '  const RequestKind extends GeneratedRequestKind,',
  '  const ResponseKind extends GeneratedResponseKind,',
  '  const RequestRequired extends boolean,',
  '  const MultipartParts extends GeneratedMultipartParts | null,',
  '>(descriptor: GeneratedOperationDescriptor<I, RequestKind, ResponseKind, RequestRequired, MultipartParts>):',
  '  GeneratedOperationDescriptor<I, RequestKind, ResponseKind, RequestRequired, MultipartParts> {',
  '  return descriptor;',
  '}',
  '',
];

for (const definition of operationDefinitions) {
  operationLines.push(
    `export const ${definition.id}Operation = /*#__PURE__*/ defineGeneratedOperation({`,
    `  id: ${JSON.stringify(definition.id)},`,
    `  method: ${JSON.stringify(definition.method)},`,
    `  path: ${JSON.stringify(definition.path)},`,
    `  requestKind: ${JSON.stringify(definition.request.kind)},`,
    `  responseKind: ${JSON.stringify(definition.response.kind)},`,
    `  requestRequired: ${JSON.stringify(definition.requestRequired)},`,
    `  multipartParts: ${JSON.stringify(definition.request.multipartParts)},`,
    `  pathSchema: ${definition.pathSchema},`,
    `  querySchema: ${definition.querySchema},`,
    `  requestSchema: ${definition.request.schema},`,
    `  responseSchema: ${definition.response.schema},`,
    `  envelopeSchema: ${definition.response.envelopeSchema},`,
    `  requestForbiddenPaths: ${JSON.stringify(operationForbiddenPaths(definition.request.sourceSchema, 'readOnly'))},`,
    `  responseForbiddenPaths: ${JSON.stringify(operationForbiddenPaths(definition.response.sourceSchema, 'writeOnly'))},`,
    '});',
    '',
  );
}

fs.writeFileSync(operationsOutputPath, operationLines.join('\n'), 'utf8');
console.log(`Generated ${operationDefinitions.length} operation contracts to ${operationsOutputPath}.`);
