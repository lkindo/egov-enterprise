import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { GENERATED_CONTRACT_TYPES, apiDocsText, projectSourceApiDocs, regenerateContractTypes } from './reusable-contract-projection.mjs';
import { assertContractReferencesSurvive, assertVanishedContractNames, contractModuleOf, exportedNames, isContractScopeFile, parseContractReferences,
  predictFromProjection, predictVanishedContractNames, vanishedContractReferences } from './reusable-contract-references.mjs';
import { trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

const root = resolve(import.meta.dirname, '..');
const read = file => readFileSync(join(root, file), 'utf8');
const names = ({ references }) => references.map(reference => (reference.kind ? `${reference.module}:${reference.kind}:${reference.name}` : `${reference.module}:${reference.name}`));
const ADDRESS_BOOK = 'api-server/src/main/java/nuri/api/controller/business/addressbook/AddressBookApiController.java';

/*
 * 생성 계약 이름 판정(트랙 K 검토 #2). 생성물의 tsc 가 실패할 자리 — 남는 파일이 구성에서 빠진 생성 이름을 쓰는 자리 — 를 생성기와
 * 정밀 점검이 같은 함수로 찾는다. 판정할 수 없는 모양은 건너뛰지 않는다.
 */
test('the scope is the frontend typecheck scope, tests included, without the generated contract modules', () => {
  for (const file of ['frontend/src/lib/x.ts', 'frontend/src/app/a/page.tsx', 'frontend/src/lib/api/__tests__/x.test.ts', 'frontend/next.config.ts', 'frontend/src/x.mts']) {
    assert.ok(isContractScopeFile(file), file);
  }
  for (const file of ['frontend/e2e/x.spec.ts', 'frontend/scripts/x.ts', 'frontend/node_modules/x/index.ts', 'frontend/vitest.config.mts', 'frontend/vitest.setup.ts',
    'frontend/src/types/generated-zod.ts', 'frontend/src/types/generated-operations.ts', 'frontend/src/types/generated-api.d.ts', 'frontend/src/x.js', 'scripts/x.ts']) {
    assert.ok(!isContractScopeFile(file), file);
  }
});

test('import specifiers resolve to the three generated contract modules only', () => {
  assert.equal(contractModuleOf('@/types/generated-zod', 'frontend/src/lib/x.ts'), 'zod');
  assert.equal(contractModuleOf('../../types/generated-operations', 'frontend/src/lib/api/x.ts'), 'operations');
  assert.equal(contractModuleOf('./generated-api', 'frontend/src/types/x.ts'), 'api');
  assert.equal(contractModuleOf('@/types/generated-api.d', 'frontend/src/x.ts'), 'api');
  assert.equal(contractModuleOf('@/lib/api/generated-api-client', 'frontend/src/x.ts'), undefined);
  assert.equal(contractModuleOf('zod', 'frontend/src/x.ts'), undefined);
});

test('named imports, re-exports, namespaces and literal api indexes are read; comments and strings are not', () => {
  const source = [
    "import { FooSchema, type Bar, BazSchema as Baz } from '@/types/generated-zod';",
    "import type { getFooOperation } from '@/types/generated-operations';",
    "export { QuxSchema } from '@/types/generated-zod';",
    "import * as Ops from '@/types/generated-operations';",
    "import type { components, operations as Api } from '@/types/generated-api';",
    "// import { CommentedSchema } from '@/types/generated-zod';",
    "const text = \"import { StringSchema } from '@/types/generated-zod'\";",
    'type A = components["schemas"]["FooDto"];',
    "type B = Api['getFoo']['responses'];",
    'type C = components[`schemas`][`BarDto`];',
    'const d = Ops.deleteFooOperation;',
    'const e = { operations: [1] };',
  ].join('\n');
  const parsed = parseContractReferences(source, 'frontend/src/lib/x.ts');
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(names(parsed), ['zod:FooSchema', 'zod:Bar', 'zod:BazSchema', 'operations:getFooOperation', 'zod:QuxSchema',
    'api:schema:FooDto', 'api:operation:getFoo', 'api:schema:BarDto', 'operations:deleteFooOperation']);
});

test('forms the check cannot judge are reported instead of skipped', () => {
  const cases = [
    ["const m = await import('@/types/generated-zod');", /dynamic import of a generated contract module/],
    ["export * from '@/types/generated-operations';", /re-export of every name/],
    ["import zod from '@/types/generated-zod';", /default import/],
    ["import type { components } from '@/types/generated-api';\ntype S = components['schemas'];", /not indexed as \['schemas'\]\['<literal>'\]/],
    ["import type { components } from '@/types/generated-api';\ntype S = components['schemas'][Key];", /not indexed as/],
    ["import type { operations } from '@/types/generated-api';\ntype K = keyof operations;", /not indexed with a literal/],
    ["import * as Z from '@/types/generated-zod';\nconst all = Z;", /namespace Z is used without a member/],
    ["import type { webhooks } from '@/types/generated-api';", /generated-api has no member webhooks/],
  ];
  for (const [source, expected] of cases) {
    const { issues } = parseContractReferences(source, 'frontend/src/lib/x.ts');
    assert.equal(issues.length, 1, source);
    assert.match(issues[0].detail, expected, source);
  }
  // 계약 모듈이 아닌 동적 import 는 이 판정의 일이 아니다.
  assert.deepEqual(parseContractReferences("const m = await import('@/lib/api/generated-api-client');", 'frontend/src/lib/x.ts').issues, []);
});

test('every file in the frontend typecheck scope is read without an issue', () => {
  const files = trackedAndUntrackedFiles(root).map(file => file.replaceAll('\\', '/')).filter(isContractScopeFile);
  assert.ok(files.length > 1000, `scope population ${files.length}`);
  const issues = [];
  let references = 0;
  for (const file of files) {
    const parsed = parseContractReferences(read(file), file);
    issues.push(...parsed.issues);
    references += parsed.references.length;
  }
  assert.deepEqual(issues, [], 'a new unjudgeable form must be rewritten or taught to the check');
  assert.ok(references > 600, `references ${references}`);
});

test('generated contract exports are read completely and an unread export form fails', () => {
  const zod = exportedNames(read(GENERATED_CONTRACT_TYPES.zod), 'generated-zod');
  const operations = exportedNames(read(GENERATED_CONTRACT_TYPES.operations), 'generated-operations');
  const count = file => read(file).replace(/\r\n/g, '\n').split('\n').filter(line => line.startsWith('export ')).length;
  assert.equal(zod.size, count(GENERATED_CONTRACT_TYPES.zod));
  assert.equal(operations.size, count(GENERATED_CONTRACT_TYPES.operations));
  assert.throws(() => exportedNames('export const A = 1;\nexport { B } from "./b";\n', 'x'), /exports in a form the contract name check does not read: export \{ B \}/);
});

/*
 * 정밀 점검은 다시 만들지 않고 이름을 예측한다. 생성기는 다시 만든 파일과의 차이가 예측과 같은지 본다 — 실제 원본의 줄인 구성으로 대조한다.
 */
test('the predicted vanishing names equal the export difference of the regenerated contract types', { timeout: 120_000 }, t => {
  const projection = projectSourceApiDocs(root, file => file === ADDRESS_BOOK);
  const output = mkdtempSync(join(tmpdir(), 'contract-names-'));
  t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
  mkdirSync(join(output, 'frontend/src/types'), { recursive: true });
  writeFileSync(join(output, 'api-docs.json'), apiDocsText(projection.doc));
  regenerateContractTypes({ sourceRoot: root, output });
  const texts = {
    sourceZod: read(GENERATED_CONTRACT_TYPES.zod), sourceOperations: read(GENERATED_CONTRACT_TYPES.operations),
    outputZod: readFileSync(join(output, GENERATED_CONTRACT_TYPES.zod), 'utf8'), outputOperations: readFileSync(join(output, GENERATED_CONTRACT_TYPES.operations), 'utf8'),
  };
  const predicted = predictFromProjection(root, projection);
  assert.ok(predicted.zod.size >= 4 && predicted.operations.size >= 3, `predicted ${predicted.zod.size}/${predicted.operations.size}`);
  assert.equal(assertVanishedContractNames(predicted, texts), predicted);
  // 예측이 하나라도 어긋나면(정밀 점검이 다르게 판정할 구성) 실패한다.
  const missing = { ...predicted, zod: new Set([...predicted.zod].slice(1)) };
  assert.throws(() => assertVanishedContractNames(missing, texts), /regenerated generated-zod differs from the predicted contract names .*vanished-unpredicted \[\w+\]/);
  const extra = { ...predicted, operations: new Set([...predicted.operations, 'getUsersOperation']) };
  assert.throws(() => assertVanishedContractNames(extra, texts), /generated-operations differs .*predicted-but-kept \[getUsersOperation\]/);

  // 남는 파일이 사라진 이름을 쓰면 생성기는 파일과 줄을 밝히며 멈춘다(B4 이동을 되돌린 core 위치 파일이 이 모양이다).
  const schema = [...predicted.zod].find(name => name.endsWith('Schema') && !name.endsWith('RequestSchema') && !name.endsWith('ResponseSchema'));
  const operation = [...predicted.operations][0];
  const legacy = 'frontend/src/lib/validation/legacy-feature-schemas.ts';
  const testFile = 'frontend/src/lib/api/__tests__/legacy-feature.test.ts';
  const write = (file, text) => { mkdirSync(dirname(join(output, file)), { recursive: true }); writeFileSync(join(output, file), text); };
  write(legacy, `import { ${schema} } from '@/types/generated-zod';\nexport const legacy = ${schema};\n`);
  write(testFile, `import { ${operation} } from '@/types/generated-operations';\nimport type { components } from '@/types/generated-api';\ntype T = components['schemas']['${projection.removedSchemas[0]}'];\nvoid ${operation};\n`);
  assert.throws(() => assertContractReferencesSurvive({ sourceRoot: root, output, projection, files: [legacy, testFile, 'frontend/src/never-copied.ts'] }),
    error => error.message.includes('surviving frontend code uses API contract names this composition removes')
      && error.message.includes(`${legacy}:1 ${schema}`) && error.message.includes(`${testFile}:1 ${operation}`)
      && error.message.includes(`${testFile}:3 generated-api schema ${projection.removedSchemas[0]}`));
  // 사라지지 않는 이름만 쓰면 통과한다.
  write(legacy, "import { ApiResponseVoidSchema } from '@/types/generated-zod';\nexport const legacy = ApiResponseVoidSchema;\n");
  write(testFile, "import type { components } from '@/types/generated-api';\ntype T = components['schemas']['ApiResponseVoid'];\n");
  assert.deepEqual(assertContractReferencesSurvive({ sourceRoot: root, output, projection, files: [legacy, testFile] }),
    { checkedFiles: 2, vanishedNames: predicted.zod.size + predicted.operations.size });
});

test('prediction counts only names the source contract types export', () => {
  const sourceZod = 'export const FooSchema = z.object({});\nexport const FooRequestSchema = FooSchema;\nexport type Foo = z.infer<typeof FooSchema>;\n';
  const sourceOperations = 'export const getFooOperation = {};\n';
  const predicted = predictVanishedContractNames({ sourceZod, sourceOperations, removedSchemas: ['Foo', 'Gone'], removedOperationIds: ['getFoo', 'neverDescribed'], removedPaths: ['/foo'] });
  assert.deepEqual([...predicted.zod].sort(), ['Foo', 'FooRequestSchema', 'FooSchema']);
  assert.deepEqual([...predicted.operations], ['getFooOperation']);
  const { hits } = vanishedContractReferences([{ file: 'frontend/src/x.ts', source: "import type { paths } from '@/types/generated-api';\ntype P = paths['/foo'];\n" }], predicted);
  assert.deepEqual(hits.map(hit => `${hit.kind}:${hit.name}`), ['path:/foo']);
});
