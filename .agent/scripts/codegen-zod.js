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
          // PURE로 제거되는 미사용 스키마도 잘못된 정규식을 생성 단계에서 거부한다.
          new RegExp(prop.pattern);
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

// 생성 파일 머리. 진입 파일(generated-zod.ts·generated-operations.ts)과 묶음 모듈이 함께 쓴다.
const GENERATED_HEADER = [
  '// ==========================================================================',
  '// ⚠️ WARNING: Auto-generated file. Do not edit this file manually.',
  '// This file is generated by codegen-zod.js using api-docs.json.',
  '// ==========================================================================',
];

/*
 * [2026-10-19] 스키마·연산을 API 태그(컨트롤러) 묶음 모듈로 나누고, 진입 파일은 그 모듈을 다시 내보내기만 한다.
 *
 * 한 파일에 모두 두면 번들러(Turbopack)는 그 파일을 쪼개지 못해, 루트 레이아웃이 인증·메뉴 연산 몇 개를 부르는 것만으로 스키마
 * 1,227개·연산 410개 전체가 모든 라우트의 첫 로드 JS 에 실렸다(gzip 약 37KB, 실행 때 zod 객체 수천 개 생성). 다시 내보내기만 하는
 * 진입 파일은 부작용이 없어 번들러가 쓰이는 묶음 모듈로 곧장 이어 주므로, 화면마다 실제로 부르는 태그의 묶음만 실린다.
 * 소비자는 그대로 `@/types/generated-zod`·`@/types/generated-operations` 를 import 한다.
 *
 * 묶음 규칙:
 *   - 연산은 첫 태그의 묶음(`generated-operations/<태그>.ts`)에 둔다. 태그가 없으면 `_untagged`.
 *   - 스키마는 컴포넌트(S·SRequest·SResponse 세 변형) 단위로 둔다. 컴포넌트 참조 그래프(모든 변형의 참조)를 따라 그 컴포넌트에
 *     닿는 연산 태그가 하나면 그 태그 묶음(`generated-zod/<태그>.ts`), 둘 이상이면 `_shared`, 없으면 `_unbound` 다.
 *     참조 폐포로 정하므로 태그 묶음은 자기 묶음과 `_shared` 만 부른다 — 한 태그를 쓰는 화면이 다른 태그 묶음을 끌어오지 않는다.
 *   - 모듈 하나에 export 를 모두 두면 모듈 수천 개가 생겨 시험 실행기(vitest)가 시험 파일마다 그만큼 모듈을 적재한다. 태그 묶음은
 *     모듈 수를 백여 개로 두면서 루트가 싣는 양을 전체의 약 4분의 1 로 줄인다(2026-10-19 실측).
 * 모듈 폴더는 진입 파일 옆의 같은 이름 폴더다(`generated-zod.ts` → `generated-zod/`). 다시 만들 때 그 폴더의 낡은 모듈은 지운다 —
 * 폴더에는 이 생성기가 만든 `.ts` 모듈만 있어야 한다.
 */
const SHARED_GROUP = '_shared';
const UNBOUND_GROUP = '_unbound';
const UNTAGGED_GROUP = '_untagged';
// 연산 묶음이 쓰는 defineGeneratedOperation 의 모듈. 태그 묶음 이름은 '_' 로 시작하지 않는다.
const DEFINE_MODULE = '_define';

/** 진입 파일 옆의 모듈 폴더(`x/generated-zod.ts` → `x/generated-zod`). */
function moduleDirectoryOf(entryPath) {
  if (!entryPath.endsWith('.ts')) throw new Error(`Generated entry file must be a .ts file: ${entryPath}`);
  return entryPath.slice(0, -'.ts'.length);
}

/** from 폴더에서 target 경로로 가는 import 지정자(posix, 확장자 없음). */
function importSpecifier(fromDirectory, targetWithoutExtension) {
  const relative = path.relative(fromDirectory, targetWithoutExtension).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** 태그 이름을 모듈 파일 이름으로(소문자, 영숫자 밖은 '-'). 비면 실패한다. */
function tagModuleName(tag) {
  const name = String(tag).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!name) throw new Error(`OpenAPI tag cannot be used as a module name: ${JSON.stringify(tag)}`);
  return name;
}

/** 코드에 나오는 생성 스키마 이름(known 에 든 것만). */
function mentionedSchemaNames(code, known) {
  const names = new Set();
  for (const match of code.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*Schema)\b/g)) {
    if (known.has(match[1])) names.add(match[1]);
  }
  return names;
}

/** 묶음 모듈 본문: 머리, zod(쓸 때만)·추가 import, 선언들. */
function moduleSource(code, imports) {
  const lines = [...GENERATED_HEADER, ''];
  if (/\bz\./.test(code)) lines.push("import { z } from 'zod';");
  lines.push(...imports);
  lines.push('', code, '');
  return lines.join('\n');
}

/** 모듈별로 다른 모듈에서 가져올 이름을 import 문으로(모듈·이름 정렬). */
function importLines(fromModule, needs, specifierOf) {
  return [...needs.entries()]
    .filter(([module]) => module !== fromModule)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([module, names]) => `import { ${[...names].sort().join(', ')} } from '${specifierOf(module)}';`);
}

/**
 * 모듈 폴더를 이번 결과로 맞춘다. 폴더에 이 생성기가 만들지 않는 항목(하위 폴더·.ts 가 아닌 파일)이 있으면 지우지 않고 멈춘다.
 * 대소문자만 다른 이름은 대소문자를 가리지 않는 파일 시스템(Windows)에서 한 파일이 되므로 멈춘다.
 */
function writeModuleDirectory(directory, modules) {
  const seen = new Map();
  for (const name of modules.keys()) {
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`Generated module names collide on a case-insensitive file system: ${seen.get(key)}, ${name}`);
    seen.set(key, name);
  }
  fs.mkdirSync(directory, { recursive: true });
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) {
      throw new Error(`Unexpected entry in generated module directory ${directory}: ${entry.name}`);
    }
    if (!modules.has(entry.name.slice(0, -'.ts'.length))) fs.unlinkSync(path.join(directory, entry.name));
  }
  for (const [name, source] of modules) fs.writeFileSync(path.join(directory, `${name}.ts`), source, 'utf8');
}

// Zod 스키마 선언. 초기화 전체를 순수 단위로 묶어 미사용 스키마의 중첩 Zod/RegExp 생성도 제거할 수 있게 한다.
// 사용되는 선언은 기존 객체를 즉시 생성한다. 런타임 lazy/strict/parse 의미는 바꾸지 않는다. 다른 컴포넌트는 z.lazy 로만 참조한다.
const zodDeclarations = [];
for (const schemaName of schemaNames) {
  const schema = schemas[schemaName];
  const lines = [];

  if (schema.type === 'object' && schema.properties) {
    const requiredList = schema.required || [];
    lines.push(`export const ${schemaName}Schema = /*#__PURE__*/ (() => z.object({`);
    for (const [propName, prop] of Object.entries(schema.properties)) {
      const zodProp = convertPropertyToZod(propName, prop, requiredList, schemaName);
      lines.push(`  ${propName}: ${zodProp},`);
    }
    lines.push(`}))();`);
    lines.push(`export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`);
  } else if (schema.type === 'array' && schema.items) {
    if (schema.items.$ref) {
      const refSchema = getSchemaNameFromRef(schema.items.$ref);
      lines.push(`export const ${schemaName}Schema = /*#__PURE__*/ (() => z.array(z.lazy(() => ${refSchema}Schema)))();`);
    } else {
      lines.push(`export const ${schemaName}Schema = /*#__PURE__*/ (() => z.array(z.any()))();`);
    }
    lines.push(`export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`);
  } else {
    // 그 외 단선 타입이거나 맵 형식 등
    lines.push(`export const ${schemaName}Schema = /*#__PURE__*/ (() => z.any())();`);
    lines.push(`export type ${schemaName} = any;`);
  }
  zodDeclarations.push({ name: `${schemaName}Schema`, component: schemaName, typeName: schemaName, code: lines.join('\n') });
}

// 요청/응답 방향별 스키마. OpenAPI readOnly/writeOnly은 동일 component에서도
// 방향에 따라 required 의미가 다르므로 중립 스키마를 그대로 재사용하지 않는다.
for (const schemaName of schemaNames) {
  const schema = schemas[schemaName];
  for (const direction of ['request', 'response']) {
    const directionalName = directionalSchemaName(schemaName, direction);
    let code;
    if (schema.type === 'object' && schema.properties) {
      const requiredList = schema.required || [];
      const lines = [`export const ${directionalName} = /*#__PURE__*/ (() => z.object({`];
      for (const [propName, prop] of Object.entries(schema.properties)) {
        if (!propertyAllowedInDirection(prop, direction)) continue;
        const zodProp = convertPropertyToZod(
          propName,
          prop,
          requiredList,
          schemaName,
          direction,
        );
        lines.push(`  ${propName}: ${zodProp},`);
      }
      lines.push('}))();');
      code = lines.join('\n');
    } else if (schema.type === 'array' && schema.items) {
      const itemSchema = convertPropertyToZod(
        '',
        schema.items,
        [],
        schemaName,
        direction,
      ).replace(/\.optional\(\)$/, '');
      code = `export const ${directionalName} = /*#__PURE__*/ (() => z.array(${itemSchema}))();`;
    } else {
      code = `export const ${directionalName} = ${schemaName}Schema;`;
    }
    zodDeclarations.push({ name: directionalName, component: schemaName, typeName: null, code });
  }
}

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
      tag: Array.isArray(operation.tags) && operation.tags.length > 0 ? operation.tags[0] : null,
      pathSchema: operationParameterSchema(parameters, operation, 'path'),
      querySchema: operationParameterSchema(parameters, operation, 'query'),
      requestRequired: Boolean(operation.requestBody?.required),
      request: operationRequestContract(operation),
      response: operationResponseContract(operation),
    });
  }
}

// 묶음 정하기. 태그 이름 → 모듈 이름은 서로 달라야 한다(다른 태그가 같은 이름이 되면 멈춘다).
const tagModules = new Map();
const moduleTags = new Map();
function operationModuleOf(definition) {
  if (definition.tag === null) return UNTAGGED_GROUP;
  if (!tagModules.has(definition.tag)) {
    const name = tagModuleName(definition.tag);
    if (moduleTags.has(name)) throw new Error(`OpenAPI tags map to the same module name ${name}: ${moduleTags.get(name)}, ${definition.tag}`);
    tagModules.set(definition.tag, name);
    moduleTags.set(name, definition.tag);
  }
  return tagModules.get(definition.tag);
}

const zodNames = new Set(zodDeclarations.map(declaration => declaration.name));
const componentOf = new Map(zodDeclarations.map(declaration => [declaration.name, declaration.component]));
const componentReferences = new Map(schemaNames.map(schemaName => [schemaName, new Set()]));
for (const declaration of zodDeclarations) {
  for (const name of mentionedSchemaNames(declaration.code, zodNames)) {
    if (componentOf.get(name) !== declaration.component) componentReferences.get(declaration.component).add(componentOf.get(name));
  }
}
for (const definition of operationDefinitions) {
  // 스키마 참조는 연산의 스키마 식에서만 센다(객체 키 pathSchema 등은 이름이 아니다).
  const expressions = [definition.pathSchema, definition.querySchema, definition.request.schema,
    definition.response.schema, definition.response.envelopeSchema].join('\n');
  const mentioned = [...new Set([...expressions.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*Schema)\b/g)].map(match => match[1]))];
  const unknown = mentioned.filter(name => !zodNames.has(name));
  if (unknown.length) throw new Error(`Operation ${definition.id} references schemas that were not generated: ${unknown.join(', ')}`);
  definition.module = operationModuleOf(definition);
  definition.schemaNames = mentioned.sort();
}
const componentModules = new Map(schemaNames.map(schemaName => [schemaName, new Set()]));
for (const definition of operationDefinitions) {
  const queue = definition.schemaNames.map(name => componentOf.get(name));
  const seen = new Set();
  while (queue.length) {
    const component = queue.pop();
    if (seen.has(component)) continue;
    seen.add(component);
    componentModules.get(component).add(definition.module);
    queue.push(...componentReferences.get(component));
  }
}
function zodModuleOf(component) {
  const modules = componentModules.get(component);
  if (modules.size === 0) return UNBOUND_GROUP;
  return modules.size > 1 ? SHARED_GROUP : [...modules][0];
}

const zodModuleDirectory = moduleDirectoryOf(outputPath);
const zodEntrySpecifier = importSpecifier(path.dirname(outputPath), zodModuleDirectory);
const zodModuleDeclarations = new Map();
for (const declaration of zodDeclarations) {
  const module = zodModuleOf(declaration.component);
  if (!zodModuleDeclarations.has(module)) zodModuleDeclarations.set(module, []);
  zodModuleDeclarations.get(module).push(declaration);
}
const zodModules = new Map();
const zodEntryLines = [...GENERATED_HEADER, ''];
for (const [module, declarations] of [...zodModuleDeclarations].sort(([left], [right]) => left.localeCompare(right))) {
  const needs = new Map();
  for (const declaration of declarations) {
    for (const name of mentionedSchemaNames(declaration.code, zodNames)) {
      const target = zodModuleOf(componentOf.get(name));
      if (target === module) continue;
      if (!needs.has(target)) needs.set(target, new Set());
      needs.get(target).add(name);
    }
  }
  const code = declarations.map(declaration => declaration.code).join('\n\n');
  zodModules.set(module, moduleSource(code, importLines(module, needs, target => `./${target}`)));
}
// 진입 파일은 종전과 같은 순서(중립 스키마 전부, 그다음 방향별)로 다시 내보낸다.
for (const declaration of zodDeclarations) {
  const module = zodModuleOf(declaration.component);
  zodEntryLines.push(`export { ${declaration.name} } from '${zodEntrySpecifier}/${module}';`);
  if (declaration.typeName) zodEntryLines.push(`export type { ${declaration.typeName} } from '${zodEntrySpecifier}/${module}';`);
}
zodEntryLines.push('');

const operationModuleDirectory = moduleDirectoryOf(operationsOutputPath);
const operationZodSpecifier = importSpecifier(operationModuleDirectory, zodModuleDirectory);
const operationEntrySpecifier = importSpecifier(path.dirname(operationsOutputPath), operationModuleDirectory);
const operationLines = [
  ...GENERATED_HEADER,
  '',
  "import type { z } from 'zod';",
  "import type { operations } from './generated-api';",
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
];

const operationModules = new Map();
operationModules.set(DEFINE_MODULE, [
  ...GENERATED_HEADER,
  '',
  'import type {',
  '  GeneratedMultipartParts,',
  '  GeneratedOperationDescriptor,',
  '  GeneratedOperationId,',
  '  GeneratedRequestKind,',
  '  GeneratedResponseKind,',
  `} from '../${path.basename(operationsOutputPath, '.ts')}';`,
  '',
  'export function defineGeneratedOperation<',
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
].join('\n'));

const operationModuleDefinitions = new Map();
for (const definition of operationDefinitions) {
  if (!operationModuleDefinitions.has(definition.module)) operationModuleDefinitions.set(definition.module, []);
  operationModuleDefinitions.get(definition.module).push(definition);
}
for (const [module, definitions] of [...operationModuleDefinitions].sort(([left], [right]) => left.localeCompare(right))) {
  const needs = new Map([[DEFINE_MODULE, new Set(['defineGeneratedOperation'])]]);
  const blocks = [];
  for (const definition of definitions) {
    for (const name of definition.schemaNames) {
      const target = zodModuleOf(componentOf.get(name));
      const key = `zod:${target}`;
      if (!needs.has(key)) needs.set(key, new Set());
      needs.get(key).add(name);
    }
    blocks.push([
      `export const ${definition.id}Operation = /*#__PURE__*/ (() => {`,
      '  return defineGeneratedOperation({',
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
      '  });',
      '})();',
    ].join('\n'));
  }
  const specifierOf = key => (key.startsWith('zod:') ? `${operationZodSpecifier}/${key.slice('zod:'.length)}` : `./${key}`);
  operationModules.set(module, moduleSource(blocks.join('\n\n'), importLines(module, needs, specifierOf)));
}
// 진입 파일은 종전과 같은 순서(api-docs 경로·메서드 순)로 다시 내보낸다.
for (const definition of operationDefinitions) {
  operationLines.push(`export { ${definition.id}Operation } from '${operationEntrySpecifier}/${definition.module}';`);
}
operationLines.push('');

// 디렉토리 존재 확인 및 생성
for (const directory of [path.dirname(outputPath), path.dirname(operationsOutputPath)]) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
}

// 파일 쓰기 — 모듈 폴더를 먼저 맞추고 진입 파일을 쓴다.
writeModuleDirectory(zodModuleDirectory, zodModules);
fs.writeFileSync(outputPath, zodEntryLines.join('\n'), 'utf8');
console.log(`\nSuccessfully compiled and generated Zod schemas to ${outputPath}!`);
console.log(`Generated ${zodDeclarations.length} schemas in ${zodModules.size} modules under ${zodModuleDirectory}.`);
writeModuleDirectory(operationModuleDirectory, operationModules);
fs.writeFileSync(operationsOutputPath, operationLines.join('\n'), 'utf8');
console.log(`Generated ${operationDefinitions.length} operation contracts in ${operationModules.size - 1} modules under ${operationModuleDirectory}.`);
