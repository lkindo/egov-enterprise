import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  GENERATED_CONTRACT_TYPES, contractModuleDirectory, contractModuleNames, generatedContractTextAt, verifyGeneratedContracts,
} from './verify-generated-contracts.mjs';

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
// operation 수의 확인 지점은 배선 census 원장의 expected.operationCount 하나이고, 그 대조는 배선 census(OPERATION_COUNT_DRIFT·
// INVALID_OPERATION_COUNT, scripts/operation-consumer-census.mjs)가 소유한다. 이 시험은 생성물과 스펙의 operation 집합만 대조한다.
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
  // 본문은 진입 파일과 묶음 모듈을 이은 것이다. generated 는 저장소 기준 경로 → 본문(검증 fixture 가 그대로 쓴다).
  const zodSource = result.status === 0 ? generatedContractTextAt(zodOutput) : null;
  const operationSource = result.status === 0 ? generatedContractTextAt(operationOutput) : null;
  const generated = new Map();
  if (result.status === 0) {
    for (const [output, entry] of [[zodOutput, GENERATED_CONTRACT_TYPES.zod], [operationOutput, GENERATED_CONTRACT_TYPES.operations]]) {
      generated.set(entry, readFileSync(output, 'utf8'));
      for (const name of contractModuleNames(output)) {
        generated.set(`${contractModuleDirectory(entry)}/${name}`, readFileSync(join(contractModuleDirectory(output), name), 'utf8'));
      }
    }
  }
  rmSync(fixtureDir, { recursive: true, force: true });
  return { ...result, zodSource, operationSource, generated };
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

function verificationFixture(t, kind) {
  const root = mkdtempSync(join(tmpdir(), 'generated-contract-check-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    rmSync(root, { recursive: true, force: true });
  });
  const spec = { ...contractSpec({
    '/api/v1/items': { get: { operationId: 'readItems', responses: wrappedVoidResponse() } },
  }), info: { title: 'Verification fixture', version: '1.0.0' } };
  const specPath = join(root, 'api-docs.json');
  writeFileSync(specPath, `${JSON.stringify(spec)}\n`);
  mkdirSync(join(root, 'frontend/src/types'), { recursive: true });
  // entries 는 verify 가 돌려주는 진입 파일, files 는 진입 파일과 묶음 모듈 전부(zod)다.
  const entries = kind === 'api'
    ? ['frontend/src/types/generated-api.d.ts']
    : ['frontend/src/types/generated-zod.ts', 'frontend/src/types/generated-operations.ts'];
  let files = entries;
  if (kind === 'api') {
    const result = spawnSync(process.execPath, [join(repoRoot, 'frontend/node_modules/openapi-typescript/bin/cli.js'),
      specPath, '-o', join(root, files[0])], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, fixtureOutput(result));
  } else {
    const result = runFixture(spec);
    assert.equal(result.status, 0, fixtureOutput(result));
    files = [...result.generated.keys()];
    for (const [file, source] of result.generated) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), source);
    }
    assert.ok(files.length > entries.length, 'zod 생성물은 진입 파일 옆에 묶음 모듈을 둔다');
  }
  const sources = files.map(file => readFileSync(join(root, file), 'utf8'));
  // The CLI's auto-discovered apis would ignore -o and overwrite the fixture spec.
  writeFileSync(join(root, 'frontend/redocly.yaml'),
    'apis:\n  unsafe-output:\n    root: ../api-docs.json\n    x-openapi-ts:\n      output: ../api-docs.json\n');
  const git = (args, env) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, env: env && { ...process.env, ...env } });
    assert.equal(result.status, 0, fixtureOutput(result));
  };
  git(['init', '--quiet']);
  // The index holds the spec and its valid generation, as a commit would.
  git(['-c', 'core.autocrlf=false', 'add', '--', 'api-docs.json', ...files]);
  const snapshot = (indexes = ['.git/index']) => ['api-docs.json', ...files, 'frontend/redocly.yaml', ...indexes]
    .map(file => readFileSync(join(root, file)));
  return { root, entries, files, sources, git, snapshot, specPath, spec };
}

// The drift list names each file with the pair that failed; only those entries count (the explanation also says [index]).
const driftEntries = message => [...message.matchAll(/(frontend\/\S+) \[(index|working tree)\]/gu)].map(match => `${match[1]} [${match[2]}]`);
const driftOf = (file, side) => error => error.message.includes('Generated contract drift')
  && driftEntries(error.message).includes(`${file} [${side}]`) && driftEntries(error.message).every(entry => entry.endsWith(`[${side}]`));

for (const kind of ['api', 'zod']) {
  test(`${kind} verify는 index 쌍을 읽기 전용으로 비교하고, 작업 트리가 다르면 작업 트리 쌍도 비교한다`, t => {
    const fixture = verificationFixture(t, kind);
    for (const newline of ['\n', '\r\n']) {
      fixture.files.forEach((file, index) => writeFileSync(join(fixture.root, file), fixture.sources[index].replace(/\r?\n/gu, newline)));
      const before = fixture.snapshot();
      assert.deepEqual(verifyGeneratedContracts(kind, fixture.root), fixture.entries);
      assert.deepEqual(fixture.snapshot(), before, 'green must preserve the spec, generated files and index bytes');
      for (const file of fixture.files) {
        const target = join(fixture.root, file);
        const valid = readFileSync(target, 'utf8');
        writeFileSync(target, `${valid}${newline}// uncommitted local change${newline}`);
        const drift = fixture.snapshot();
        assert.throws(() => verifyGeneratedContracts(kind, fixture.root), driftOf(file, 'working tree'));
        assert.deepEqual(fixture.snapshot(), drift, 'red must preserve the local change and index bytes');
        writeFileSync(target, valid);
      }
    }
    // A working-tree spec that differs from the index but still matches its generation regenerates in the checkout pair.
    // The isolated generator cwd keeps frontend/redocly.yaml from redirecting -o onto the spec.
    writeFileSync(fixture.specPath, `${JSON.stringify(fixture.spec, null, 2)}\n`);
    const reformatted = fixture.snapshot();
    assert.deepEqual(verifyGeneratedContracts(kind, fixture.root), fixture.entries);
    assert.deepEqual(fixture.snapshot(), reformatted, 'the working-tree pair must not rewrite the spec or generated files');
    writeFileSync(fixture.specPath, '{ invalid JSON');
    const invalid = fixture.snapshot();
    assert.throws(() => verifyGeneratedContracts(kind, fixture.root), /failed/u);
    assert.deepEqual(fixture.snapshot(), invalid, 'generator failure must also preserve the checkout');
  });

  test(`${kind} verify는 다시 만든 생성물을 stage 하지 않은 index 를 작업 트리가 맞아도 막는다`, t => {
    const fixture = verificationFixture(t, kind);
    // The spec is staged with a stale generation; the regenerated files exist only in the working tree.
    fixture.files.forEach((file, index) => writeFileSync(join(fixture.root, file), `// staged prior version\n${fixture.sources[index]}`));
    fixture.git(['-c', 'core.autocrlf=false', 'add', '--', ...fixture.files]);
    fixture.files.forEach((file, index) => writeFileSync(join(fixture.root, file), fixture.sources[index]));
    const before = fixture.snapshot();
    assert.throws(() => verifyGeneratedContracts(kind, fixture.root), driftOf(fixture.files[0], 'index'));
    assert.deepEqual(fixture.snapshot(), before, 'red must preserve the working tree and index bytes');
  });

  test(`${kind} verify는 누락·미추적 생성물을 복원하지 않고 실패한다`, t => {
    const fixture = verificationFixture(t, kind);
    const target = join(fixture.root, fixture.files[0]);
    unlinkSync(target);
    assert.throws(() => verifyGeneratedContracts(kind, fixture.root), /ENOENT/u);
    writeFileSync(target, fixture.sources[0]);
    fixture.git(['rm', '--cached', '--force', '--', fixture.files[0]]);
    const before = fixture.snapshot();
    assert.throws(() => verifyGeneratedContracts(kind, fixture.root), /git failed/u);
    assert.deepEqual(fixture.snapshot(), before, 'untracked files must remain untouched');
  });
}

// 묶음 모듈은 진입 파일과 같은 쌍으로 비교한다 — 빠진 모듈, 다시 만든 결과에 없는 낡은 모듈, 폴더 자체의 누락을 모두 막는다.
test('zod verify는 묶음 모듈의 누락·낡은 모듈·폴더 누락을 막는다', t => {
  const fixture = verificationFixture(t, 'zod');
  const module = fixture.files.find(file => file.startsWith(`${contractModuleDirectory(GENERATED_CONTRACT_TYPES.operations)}/`)
    && !file.endsWith('/_define.ts'));
  assert.ok(module, 'fixture must contain an operation module');
  const target = join(fixture.root, module);
  const valid = readFileSync(target);
  unlinkSync(target);
  assert.throws(() => verifyGeneratedContracts('zod', fixture.root), driftOf(module, 'working tree'));
  writeFileSync(target, valid);
  const stale = `${contractModuleDirectory(GENERATED_CONTRACT_TYPES.zod)}/stale.ts`;
  writeFileSync(join(fixture.root, stale), 'export const StaleSchema = 1;\n');
  assert.throws(() => verifyGeneratedContracts('zod', fixture.root), driftOf(stale, 'working tree'));
  unlinkSync(join(fixture.root, stale));
  assert.deepEqual(verifyGeneratedContracts('zod', fixture.root), fixture.entries);
  const directory = join(fixture.root, contractModuleDirectory(GENERATED_CONTRACT_TYPES.zod));
  rmSync(directory, { recursive: true, force: true });
  assert.throws(() => verifyGeneratedContracts('zod', fixture.root), /ENOENT/u);
});

// The index is read through the shared git helper for both kinds; the cheaper generator proves it once.
test('verify는 pre-commit 의 GIT_INDEX_FILE 이 가리키는 index 를 따른다', t => {
  const fixture = verificationFixture(t, 'zod');
  const alternate = join(fixture.root, '.git', 'alternate-index');
  writeFileSync(alternate, readFileSync(join(fixture.root, '.git', 'index')));
  const target = join(fixture.root, fixture.files[0]);
  writeFileSync(target, `// staged prior version\n${fixture.sources[0]}`);
  fixture.git(['-c', 'core.autocrlf=false', 'add', '--', fixture.files[0]], { GIT_INDEX_FILE: alternate });
  writeFileSync(target, fixture.sources[0]);
  const before = fixture.snapshot(['.git/index', '.git/alternate-index']);
  assert.deepEqual(verifyGeneratedContracts('zod', fixture.root), fixture.entries, 'the default index is consistent');
  const previous = process.env.GIT_INDEX_FILE;
  process.env.GIT_INDEX_FILE = alternate;
  try {
    assert.throws(() => verifyGeneratedContracts('zod', fixture.root), driftOf(fixture.files[0], 'index'));
  } finally {
    if (previous === undefined) delete process.env.GIT_INDEX_FILE;
    else process.env.GIT_INDEX_FILE = previous;
  }
  assert.deepEqual(fixture.snapshot(['.git/index', '.git/alternate-index']), before, 'both indexes must stay untouched');
});

test('생성된 미사용 계약은 중첩 Zod 생성까지 포함한 순수 초기화 단위로 제거할 수 있다', () => {
  const fixture = runFixture(contractSpec({
    '/api/v1/items/{id}': {
      get: {
        operationId: 'readItem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: wrappedVoidResponse(),
      },
    },
  }, {
    Item: { type: 'object', properties: { name: { type: 'string', pattern: '^[A-Z]+$' } } },
    ItemList: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
    Labels: { type: 'array', items: { type: 'string' } },
    Scalar: { type: 'string' },
  }));
  assert.equal(fixture.status, 0, fixtureOutput(fixture));
  const declarations = [...fixture.zodSource.matchAll(/^export const (\w+) = (.+)$/gm)];
  assert.equal(declarations.length, 15);
  for (const [, name, initializer] of declarations) {
    if (/^\w+Schema;$/.test(initializer)) continue; // Pure aliases do not construct a schema.
    assert.match(initializer, /^\/\*#__PURE__\*\/ \(\(\) => /, name);
  }
  assert.match(fixture.operationSource,
    /export const readItemOperation = \/\*#__PURE__\*\/ \(\(\) => \{\n  return defineGeneratedOperation\(\{/);
  assert.match(fixture.operationSource, /pathSchema: z\.object\(\{ "id": z\.number\(\)\.int\(\) \}\)\.strict\(\)/);
  assert.match(fixture.operationSource, /responseForbiddenPaths: \[\],\n  \}\);\n\}\)\(\);/);
});

test('사용되지 않는 component의 잘못된 정규식도 생성 단계에서 거부한다', () => {
  const fixture = runFixture(contractSpec({}, {
    InvalidPattern: { type: 'object', properties: { name: { type: 'string', pattern: '[' } } },
  }));
  assert.notEqual(fixture.status, 0);
  assert.match(fixtureOutput(fixture), /Invalid regular expression/);
});

test('generated operation descriptor가 OpenAPI의 모든 operationId·method·path를 정확히 결속한다', () => {
  const spec = JSON.parse(readFileSync(apiDocsPath, 'utf8'));
  const operations = specOperations(spec);
  const generated = generatedContractTextAt(generatedOperationsPath);
  const generatedIds = [...generated.matchAll(/^export const ([A-Za-z_$][\w$]*)Operation =/gm)]
    .map((match) => match[1]);

  // 수는 배선 census 원장 하나가 정하고 그 대조는 배선 census 가 한다(위 머리 주석) — 여기서는 집합만 본다.
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
    /export const UserDtoRequestSchema = \/\*#__PURE__\*\/ \(\(\) => z\.object\(\{([\s\S]*?)\n\}\)\)\(\);/,
  )?.[1] ?? '';
  const responseSection = fixture.zodSource.match(
    /export const UserDtoResponseSchema = \/\*#__PURE__\*\/ \(\(\) => z\.object\(\{([\s\S]*?)\n\}\)\)\(\);/,
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
