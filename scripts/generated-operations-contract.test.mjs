import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiDocsPath = join(repoRoot, 'api-docs.json');
const generatorPath = join(repoRoot, '.agent', 'scripts', 'codegen-zod.js');
const generatedOperationsPath = join(
  repoRoot,
  'frontend',
  'src',
  'types',
  'generated-operations.ts',
);
const methods = ['get', 'post', 'put', 'patch', 'delete'];

function specOperations(spec) {
  const operations = [];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of methods) {
      const operation = pathItem[method];
      if (operation) operations.push({ id: operation.operationId, method, path });
    }
  }
  return operations;
}

function runFixture(spec) {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'generated-operation-contract-'));
  const fixtureSpec = join(fixtureDir, 'api-docs.json');
  const zodOutput = join(fixtureDir, 'generated-zod.ts');
  const operationOutput = join(fixtureDir, 'generated-operations.ts');
  writeFileSync(fixtureSpec, `${JSON.stringify(spec)}\n`, 'utf8');
  const result = spawnSync(process.execPath, [generatorPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEGEN_API_DOCS_PATH: fixtureSpec,
      CODEGEN_ZOD_OUTPUT_PATH: zodOutput,
      CODEGEN_OPERATIONS_OUTPUT_PATH: operationOutput,
    },
  });
  const zodSource = result.status === 0 ? readFileSync(zodOutput, 'utf8') : null;
  const operationSource = result.status === 0 ? readFileSync(operationOutput, 'utf8') : null;
  rmSync(fixtureDir, { recursive: true, force: true });
  return { ...result, zodSource, operationSource };
}

function contractSpec(paths, schemas = {}) {
  return {
    openapi: '3.1.0',
    components: {
      schemas: {
        ApiResponseVoid: { type: 'object', properties: {} },
        ...schemas,
      },
    },
    paths,
  };
}

function wrappedVoidResponse() {
  return {
    200: {
      description: 'OK',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/ApiResponseVoid' } },
      },
    },
  };
}

function fixtureOutput(result) {
  return `${result.stderr}${result.stdout}`;
}

test('generated operation descriptor가 OpenAPI의 모든 operationId·method·path를 정확히 결속한다', () => {
  const spec = JSON.parse(readFileSync(apiDocsPath, 'utf8'));
  const operations = specOperations(spec);
  const generated = readFileSync(generatedOperationsPath, 'utf8');
  const generatedIds = [...generated.matchAll(/^export const ([A-Za-z_$][\w$]*)Operation =/gm)]
    .map((match) => match[1]);

  // [2026-09-05 결재 도메인 완결] createApproval·getProcessed·getTaskTypes 3개 신설 — 367 -> 370.
  // [2026-09-05 첨부 삭제 경로] deleteFile 4개(기본 + admin 별칭 3) 신설 — 370 -> 374.
  // [2026-09-05 운영 정정 경로] 외부인사·포상·템플릿 PUT/DELETE 6개 신설 — 374 -> 380.
  assert.equal(operations.length, 380);
  assert.equal(new Set(generatedIds).size, operations.length);
  assert.deepEqual(new Set(generatedIds), new Set(operations.map(({ id }) => id)));

  for (const { id, method, path } of operations) {
    const marker = `export const ${id}Operation =`;
    const start = generated.indexOf(marker);
    assert.notEqual(start, -1, `missing generated operation: ${id}`);
    const descriptor = generated.slice(start, generated.indexOf('});', start) + 3);
    assert.match(descriptor, new RegExp(`method: ${JSON.stringify(method)}`));
    assert.ok(descriptor.includes(`path: ${JSON.stringify(path)}`), `wrong generated path: ${id}`);
  }
});

test('operationId 누락·중복과 지원하지 않는 media type은 생성 단계에서 fail-closed한다', () => {
  const response = wrappedVoidResponse();
  const base = contractSpec({});

  const missing = runFixture({
    ...base,
    paths: { '/api/v1/missing': { get: { responses: response } } },
  });
  assert.notEqual(missing.status, 0);
  assert.match(`${missing.stderr}${missing.stdout}`, /Invalid or missing operationId/);

  const duplicate = runFixture({
    ...base,
    paths: {
      '/api/v1/one': { get: { operationId: 'duplicate', responses: response } },
      '/api/v1/two': { get: { operationId: 'duplicate', responses: response } },
    },
  });
  assert.notEqual(duplicate.status, 0);
  assert.match(`${duplicate.stderr}${duplicate.stdout}`, /Duplicate operationId/);

  const unsupported = runFixture({
    ...base,
    paths: {
      '/api/v1/media': {
        post: {
          operationId: 'unsupportedMedia',
          requestBody: { content: { 'text/plain': { schema: { type: 'string' } } } },
          responses: response,
        },
      },
    },
  });
  assert.notEqual(unsupported.status, 0);
  assert.match(`${unsupported.stderr}${unsupported.stdout}`, /Unsupported request media type/);

  const unresolved = runFixture({
    ...base,
    paths: {
      '/api/v1/unresolved': {
        get: {
          operationId: 'unresolvedSchema',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Missing' } },
              },
            },
          },
        },
      },
    },
  });
  assert.notEqual(unresolved.status, 0);
  assert.match(`${unresolved.stderr}${unresolved.stdout}`, /Unresolved schema reference/);
});

test('success response는 단 하나의 2xx와 ApiResponse JSON envelope를 요구한다', () => {
  const multiple = runFixture(contractSpec({
    '/api/v1/multiple-success': {
      get: {
        operationId: 'multipleSuccess',
        responses: {
          ...wrappedVoidResponse(),
          201: wrappedVoidResponse()[200],
        },
      },
    },
  }));
  assert.notEqual(multiple.status, 0);
  assert.match(fixtureOutput(multiple), /exactly one 2xx response/i);

  const contentless = runFixture(contractSpec({
    '/api/v1/contentless-success': {
      get: {
        operationId: 'contentlessSuccess',
        responses: { 204: { description: 'No content' } },
      },
    },
  }));
  assert.notEqual(contentless.status, 0);
  assert.match(fixtureOutput(contentless), /contentless success response/i);

  const nonWrapper = runFixture(contractSpec({
    '/api/v1/non-wrapper': {
      get: {
        operationId: 'nonApiResponseWrapper',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserDto' } },
            },
          },
        },
      },
    },
  }, {
    UserDto: { type: 'object', properties: { name: { type: 'string' } } },
  }));
  assert.notEqual(nonWrapper.status, 0);
  assert.match(fixtureOutput(nonWrapper), /ApiResponse JSON wrapper/i);
});

test('requestBody는 정확히 하나의 JSON 또는 multipart media type만 허용한다', () => {
  const operation = (requestBody) => ({
    post: {
      operationId: 'requestMediaFixture',
      requestBody,
      responses: wrappedVoidResponse(),
    },
  });

  for (const requestBody of [{}, { content: {} }]) {
    const result = runFixture(contractSpec({
      '/api/v1/request-media': operation(requestBody),
    }));
    assert.notEqual(result.status, 0);
    assert.match(fixtureOutput(result), /exactly one requestBody content type/i);
  }

  const dual = runFixture(contractSpec({
    '/api/v1/request-media': operation({
      content: {
        'application/json': { schema: { type: 'object', properties: {} } },
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: { file: { type: 'string', format: 'binary' } },
          },
        },
      },
    }),
  }));
  assert.notEqual(dual.status, 0);
  assert.match(fixtureOutput(dual), /exactly one requestBody content type/i);

  const unsupported = runFixture(contractSpec({
    '/api/v1/request-media': operation({
      content: { 'application/xml': { schema: { type: 'string' } } },
    }),
  }));
  assert.notEqual(unsupported.status, 0);
  assert.match(fixtureOutput(unsupported), /Unsupported request media type/i);
});

test('JSON request의 참조 object는 배열 item과 중첩 필드에서도 strict하게 생성한다', () => {
  const result = runFixture(contractSpec({
    '/api/v1/items/batch': {
      put: {
        operationId: 'updateItems',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/ItemRequest' },
              },
            },
          },
        },
        responses: wrappedVoidResponse(),
      },
    },
    '/api/v1/items/container': {
      put: {
        operationId: 'updateItemContainer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContainerRequest' },
            },
          },
        },
        responses: wrappedVoidResponse(),
      },
    },
  }, {
    ItemRequest: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
    ContainerRequest: {
      type: 'object',
      required: ['item'],
      properties: {
        item: { $ref: '#/components/schemas/ItemRequest' },
      },
    },
  }));

  assert.equal(result.status, 0, fixtureOutput(result));
  assert.match(
    result.operationSource,
    /requestSchema: z\.array\(z\.lazy\(\(\) => ItemRequestRequestSchema\.strict\(\)\)\)/,
  );
  assert.match(
    result.zodSource,
    /item: z\.lazy\(\(\) => ItemRequestRequestSchema\.strict\(\)\)/,
  );
});

test('query와 path parameter serialization 범위를 벗어나면 생성 단계에서 fail-closed한다', () => {
  const runParameter = (parameter, suffix) => runFixture(contractSpec({
    [`/api/v1/parameter-${suffix}${parameter.in === 'path' ? '/{value}' : ''}`]: {
      get: {
        operationId: `parameter${suffix}`,
        parameters: [{
          name: 'value',
          required: parameter.in === 'path',
          schema: { type: 'string' },
          ...parameter,
        }],
        responses: wrappedVoidResponse(),
      },
    },
  }));

  for (const [parameter, suffix] of [
    [{ in: 'query' }, 'QueryDefault'],
    [{ in: 'query', style: 'form', explode: true, allowReserved: false }, 'QueryExplicit'],
    [{ in: 'path' }, 'PathDefault'],
    [{ in: 'path', style: 'simple', explode: false }, 'PathExplicit'],
  ]) {
    const result = runParameter(parameter, suffix);
    assert.equal(result.status, 0, fixtureOutput(result));
  }

  for (const [parameter, suffix, message] of [
    [{ in: 'query', style: 'spaceDelimited' }, 'QueryStyle', /Unsupported query style/i],
    [{ in: 'query', explode: false }, 'QueryExplode', /Unsupported query explode/i],
    [{ in: 'query', allowReserved: true }, 'QueryReserved', /Unsupported query allowReserved/i],
    [{ in: 'path', style: 'label' }, 'PathStyle', /Unsupported path style/i],
    [{ in: 'path', explode: true }, 'PathExplode', /Unsupported path explode/i],
    [{ in: 'header' }, 'Header', /Header parameters are not supported/i],
  ]) {
    const result = runParameter(parameter, suffix);
    assert.notEqual(result.status, 0);
    assert.match(fixtureOutput(result), message);
  }
});

test('auth reissue의 browser-managed cookie special만 정확한 형태로 허용한다', () => {
  const refreshCookie = {
    name: 'refreshToken',
    in: 'cookie',
    required: false,
    schema: { type: 'string' },
  };
  const cookieOperation = ({
    method = 'post',
    operationId = 'reissue',
    parameters = [refreshCookie],
    path = '/api/v1/auth/reissue',
  } = {}) => contractSpec({
    [path]: {
      [method]: {
        operationId,
        parameters,
        responses: wrappedVoidResponse(),
      },
    },
  });

  const allowed = runFixture(cookieOperation());
  assert.equal(allowed.status, 0, fixtureOutput(allowed));
  assert.match(allowed.operationSource, /export const reissueOperation/);
  assert.match(allowed.operationSource, /pathSchema: null/);
  assert.match(allowed.operationSource, /querySchema: null/);
  assert.doesNotMatch(allowed.operationSource, /refreshToken/);

  for (const spec of [
    cookieOperation({ parameters: [] }),
    cookieOperation({ parameters: [{ ...refreshCookie, name: 'otherCookie' }] }),
    cookieOperation({ parameters: [{ ...refreshCookie, required: true }] }),
    cookieOperation({ parameters: [{ ...refreshCookie, schema: { type: 'integer' } }] }),
    cookieOperation({ parameters: [{ ...refreshCookie, style: 'form' }] }),
    cookieOperation({ parameters: [refreshCookie, { ...refreshCookie, name: 'anotherCookie' }] }),
    cookieOperation({ operationId: 'notReissue' }),
    cookieOperation({ method: 'get' }),
    cookieOperation({ path: '/api/v1/not-reissue' }),
  ]) {
    const result = runFixture(spec);
    assert.notEqual(result.status, 0);
    assert.match(fixtureOutput(result), /Unsupported cookie parameter contract/i);
  }
});

test('OpenAPI 3.1 primitive|null union은 nullable Zod로 생성하고 다중 primitive union은 차단한다', () => {
  const response = wrappedVoidResponse();
  const nullable = runFixture({
    openapi: '3.1.0',
    components: {
      schemas: {
        ApiResponseVoid: { type: 'object', properties: {} },
        NullableRecord: {
          type: 'object',
          required: ['nickname'],
          properties: {
            nickname: { type: ['string', 'null'] },
          },
        },
      },
    },
    paths: {
      '/api/v1/nullable': {
        get: { operationId: 'getNullable', responses: response },
      },
    },
  });
  assert.equal(nullable.status, 0);
  assert.match(nullable.zodSource, /nickname: z\.string\(\)\.nullable\(\)/);
  assert.doesNotMatch(nullable.zodSource, /nickname: z\.any\(\)/);

  const unsupported = runFixture({
    openapi: '3.1.0',
    components: {
      schemas: {
        ApiResponseVoid: { type: 'object', properties: {} },
        AmbiguousRecord: {
          type: 'object',
          properties: {
            value: { type: ['string', 'integer', 'null'] },
          },
        },
      },
    },
    paths: {
      '/api/v1/ambiguous': {
        get: { operationId: 'getAmbiguous', responses: response },
      },
    },
  });
  assert.notEqual(unsupported.status, 0);
  assert.match(`${unsupported.stderr}${unsupported.stdout}`, /Unsupported schema type union/);
});

test('readOnly/writeOnly component는 요청·응답 방향별 스키마로 분리된다', () => {
  const fixture = runFixture({
    openapi: '3.1.0',
    components: {
      schemas: {
        UserDto: {
          type: 'object',
          required: ['id', 'name', 'pswd'],
          properties: {
            id: { type: 'integer', readOnly: true },
            name: { type: 'string' },
            pswd: { type: 'string', writeOnly: true },
          },
        },
        ApiResponseUserDto: {
          type: 'object',
          required: ['success', 'code', 'message', 'data'],
          properties: {
            success: { type: 'boolean' },
            code: { type: 'string' },
            message: { type: 'string' },
            data: { $ref: '#/components/schemas/UserDto' },
          },
        },
      },
    },
    paths: {
      '/api/v1/users': {
        post: {
          operationId: 'createUserFixture',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserDto' } },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponseUserDto' },
                },
              },
            },
          },
        },
      },
    },
  });
  assert.equal(fixture.status, 0);

  const requestSection = fixture.zodSource.match(
    /export const UserDtoRequestSchema = z\.object\(\{([\s\S]*?)\n\}\);/,
  )?.[1] ?? '';
  const responseSection = fixture.zodSource.match(
    /export const UserDtoResponseSchema = z\.object\(\{([\s\S]*?)\n\}\);/,
  )?.[1] ?? '';
  assert.match(requestSection, /pswd: z\.string\(\)/);
  assert.doesNotMatch(requestSection, /\bid:/);
  assert.match(responseSection, /id: z\.number\(\)\.int\(\)/);
  assert.doesNotMatch(responseSection, /\bpswd:/);
  assert.match(fixture.operationSource, /requestSchema: UserDtoRequestSchema\.strict\(\)/);
  assert.match(fixture.operationSource, /responseSchema: z\.lazy\(\(\) => UserDtoResponseSchema\)/);
  assert.match(fixture.operationSource, /envelopeSchema: ApiResponseUserDtoResponseSchema/);
});

test('multipart operation은 part 이름·필수성·복수성·media type·JSON schema ref를 생성한다', () => {
  const fixture = runFixture({
    openapi: '3.1.0',
    components: {
      schemas: {
        ApiResponseVoid: { type: 'object', properties: {} },
        BoardSaveRequest: {
          type: 'object',
          required: ['bbsId', 'pstTtl', 'pstCn'],
          properties: {
            bbsId: { type: 'string' },
            pstTtl: { type: 'string', minLength: 1 },
            pstCn: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/v1/bbs/{bbsId}': {
        post: {
          operationId: 'createMultipartBoardFixture',
          parameters: [{
            in: 'path',
            name: 'bbsId',
            required: true,
            schema: { type: 'string' },
          }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['board'],
                  properties: {
                    board: { $ref: '#/components/schemas/BoardSaveRequest' },
                    file: {
                      type: 'array',
                      items: { type: 'string', format: 'binary' },
                    },
                  },
                },
              },
            },
          },
          responses: wrappedVoidResponse(),
        },
      },
      '/api/v1/files': {
        post: {
          operationId: 'uploadMultipartFilesFixture',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['files'],
                  properties: {
                    files: {
                      type: 'array',
                      items: { type: 'string', format: 'binary' },
                    },
                  },
                },
              },
            },
          },
          responses: wrappedVoidResponse(),
        },
      },
    },
  });

  assert.equal(fixture.status, 0, `${fixture.stderr}${fixture.stdout}`);
  assert.match(
    fixture.operationSource,
    /multipartParts: \[\{"name":"board","required":true,"multiple":false,"mediaType":"application\/json","schemaRef":"#\/components\/schemas\/BoardSaveRequest"\},\{"name":"file","required":false,"multiple":true,"mediaType":"application\/octet-stream","schemaRef":null\}\]/,
  );
  assert.match(
    fixture.operationSource,
    /multipartParts: \[\{"name":"files","required":true,"multiple":true,"mediaType":"application\/octet-stream","schemaRef":null\}\]/,
  );
  assert.match(
    fixture.operationSource,
    /requestSchema: z\.object\(\{[\s\S]*"board": z\.lazy\(\(\) => BoardSaveRequestRequestSchema\.strict\(\)\)[\s\S]*"file": z\.array\(z\.custom<Blob>/,
  );
  assert.match(fixture.operationSource, /export type GeneratedMultipartLogicalRequest</);
});

test('multipart primitive part와 빈 part 객체는 생성 단계에서 fail-closed한다', () => {
  const response = wrappedVoidResponse();
  const base = contractSpec({});
  const primitive = runFixture({
    ...base,
    paths: {
      '/api/v1/primitive': {
        post: {
          operationId: 'unsupportedMultipartPrimitive',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { description: { type: 'string' } },
                },
              },
            },
          },
          responses: response,
        },
      },
    },
  });
  assert.notEqual(primitive.status, 0);
  assert.match(`${primitive.stderr}${primitive.stdout}`, /Unsupported multipart part/);

  const empty = runFixture({
    ...base,
    paths: {
      '/api/v1/empty': {
        post: {
          operationId: 'emptyMultipart',
          requestBody: {
            content: {
              'multipart/form-data': { schema: { type: 'object', properties: {} } },
            },
          },
          responses: response,
        },
      },
    },
  });
  assert.notEqual(empty.status, 0);
  assert.match(`${empty.stderr}${empty.stdout}`, /Multipart request must declare at least one part/);
});
