// 실행기(engine.mjs)와 실제 migration-tool CLI 의 계약을 Java 소스와 대조한다(DEC-OPS-383).
// - engine 이 만드는 명령·옵션·시스템 속성·값이 WorkflowCliOptions 의 명령별 허용 옵션과 Java 해석 규칙 안에 있는가
//   (엔진을 가짜 spawn 으로 실제로 돌려 받은 인자로 본다. engine 의 옵션 리터럴 집합과 관측 집합은 정확히 같아야 한다)
// - engine 이 알아보는 진단 코드가 WorkflowFailureDiagnostic 의 공개 코드와 정확히 같고 화면이 코드마다 안내를 갖는가
// - 가짜 CLI 가 Java 상수(형식 판수·산출물 종류·필드 이름)대로 쓴 산출물을 engine 이 받아들이는가
// JAR 를 실행하지 않는 소스 대조다. 실제 JAR 와 DB 를 잇는 실행 증거는 이 시험이 대신하지 않는다.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { createEngine } from './engine.mjs';
import { openWorkspace } from './store.mjs';

const REPO = new URL('../../', import.meta.url);
const JAVA = 'migration-tool/src/main/java/nuri/migration/';
const read = path => readFile(new URL(path, REPO), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');

// ─── Java·engine 소스 해석(못 읽으면 조용히 비우지 않고 실패한다) ─────────────────────────────────────────────

const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
function required(value, label) {
  if (value === undefined || value === null || (value instanceof Map || value instanceof Set ? value.size === 0 : Array.isArray(value) && value.length === 0)) {
    throw new Error(`계약 대상을 소스에서 읽지 못했다: ${label}`);
  }
  return value;
}
export function allowedOptions(source) {
  const block = required(/ALLOWED\s*=\s*Map\.of\(([\s\S]*?)\);/.exec(stripComments(source))?.[1], 'WorkflowCliOptions.ALLOWED');
  const result = new Map();
  for (const [, command, names] of block.matchAll(/WorkflowCommand\.([A-Z_]+)\s*,\s*Set\.of\(([^)]*)\)/g)) {
    result.set(command, new Set([...names.matchAll(/"([a-z][a-z-]*)"/g)].map(match => match[1])));
  }
  return required(result, 'WorkflowCliOptions.ALLOWED entries');
}
export function commandValues(source) {
  const result = new Map([...stripComments(source).matchAll(/case\s+"([a-z][a-z-]*)"\s*->\s*WorkflowCommand\.([A-Z_]+)\s*;/g)].map(match => [match[1], match[2]]));
  return required(result, 'WorkflowCliOptions.parseCommand');
}
export function modeValues(source) {
  const result = new Map([...stripComments(source).matchAll(/"([a-z][a-z-]*)"\.equalsIgnoreCase\(value\)\)\s*\{\s*return\s+([A-Z_]+);/g)].map(match => [match[1], match[2]]));
  return required(result, 'MigrationMode.parse');
}
export function enumConstants(source, name) {
  // 상수 목록은 첫 `;`(메서드가 있을 때) 또는 enum 의 닫는 `}`(상수만 있을 때)에서 끝난다.
  const body = required(new RegExp(`enum\\s+${name}\\s*\\{([^;}]*)[;}]`).exec(stripComments(source))?.[1], `enum ${name}`);
  return required(body.split(',').map(part => part.trim()).filter(Boolean).map(part => required(/^([A-Z][A-Z0-9_]*)/.exec(part)?.[1], `${name} constant`)), `${name} constants`);
}
export function recordComponents(source, name) {
  const text = stripComments(source);
  const start = text.search(new RegExp(`record\\s+${name}\\s*\\(`));
  if (start < 0) throw new Error(`계약 대상을 소스에서 읽지 못했다: record ${name}`);
  const parts = [];
  let depth = 1, angle = 0, current = '';
  for (let index = text.indexOf('(', start) + 1; index < text.length; index++) {
    const ch = text[index];
    if (ch === '(') depth++;
    if (ch === ')' && --depth === 0) break;
    if (ch === '<') angle++;
    if (ch === '>') angle--;
    if (ch === ',' && depth === 1 && angle === 0) { parts.push(current); current = ''; } else current += ch;
  }
  parts.push(current);
  return required(parts.map(part => part.replace(/@[\w.]+(?:\([^)]*\))?/g, ' ').trim().split(/\s+/)).filter(tokens => tokens[0])
    .map(tokens => ({ type: tokens[0], name: tokens.at(-1) })), `record ${name} components`);
}
export function constant(source, name) {
  const match = required(new RegExp(`static\\s+final\\s+(?:int|String)\\s+${name}\\s*=\\s*("([^"]*)"|\\d+)\\s*;`).exec(source), `constant ${name}`);
  return match[2] ?? Number(match[1]);
}
const versionKey = components => required(components.find(({ type, name }) => ['int', 'Integer'].includes(type) && name.endsWith('Version'))?.name, 'version component');
function sliceBetween(source, from, to, label) {
  const start = source.indexOf(from);
  const end = start < 0 ? -1 : source.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`계약 대상을 소스에서 읽지 못했다: ${label}`);
  return source.slice(start, end);
}
/** buildJob 이 CLI 로 넘길 수 있는 `--옵션` 이름과 `-D` 속성 이름(소스의 리터럴). */
export function engineLiterals(source) {
  const body = sliceBetween(source, 'async function buildJob(', 'async function capture(', 'engine buildJob');
  const options = new Set();
  for (const pattern of [/(?<![.\w])add\('([a-z][a-z-]*)'/g, /(?<![.\w])use\('[A-Za-z]+',\s*'([a-z][a-z-]*)'\)/g, /'--([a-z][a-z-]*)'/g, /`--([a-z][a-z-]*)=\$\{/g]) {
    for (const match of body.matchAll(pattern)) options.add(match[1]);
  }
  const properties = new Set([...body.matchAll(/`-D([a-z][a-z0-9.-]*)=\$\{/g)].map(match => match[1]));
  return { options: required(options, 'engine CLI option literals'), properties };
}
export function engineDiagnosticCodes(source) {
  const list = required(/MW_DIAGNOSTIC=\(([A-Z0-9_|]+)\)/.exec(source)?.[1], 'engine MW_DIAGNOSTIC list');
  return list.split('|');
}
export function uiDiagnosticKeys(source) {
  const block = sliceBetween(source, 'const jobErrors = {', '\n};', 'public/app.js jobErrors');
  return new Set([...block.matchAll(/^\s*([A-Z][A-Z0-9_]*):/gm)].map(match => match[1]));
}

async function javaFacts() {
  const [options, failure, mode, kinds, catalog, catalogEnvelope, collection, planCodec, planEnvelope, plan, execution, ledger, review, engine, ui] = await Promise.all([
    'WorkflowCliOptions.java', 'WorkflowFailureDiagnostic.java', 'etl/MigrationMode.java', 'discovery/ObjectKind.java',
    'artifact/CatalogSnapshotArtifactCodec.java', 'artifact/CatalogSnapshotArtifactEnvelope.java', 'artifact/CollectionArtifactCodec.java',
    'artifact/MigrationPlanArtifactCodec.java', 'artifact/MigrationPlanArtifactEnvelope.java', 'plan/MigrationPlan.java',
    'artifact/MigrationExecutionArtifact.java', 'validate/ledger/TermLedger.java', 'workflow/WorkflowReview.java',
  ].map(file => read(JAVA + file)).concat([read('tools/migration-workspace/engine.mjs'), read('tools/migration-workspace/public/app.js')]));
  const adapterDirectory = new URL(`${JAVA}adapter/`, REPO);
  const adapters = new Set();
  for (const file of (await readdir(adapterDirectory)).filter(name => name.endsWith('.java'))) {
    for (const match of (await readFile(new URL(file, adapterDirectory), 'utf8')).matchAll(/new\s+AdapterIdentity\(\s*"([^"]+)"/g)) adapters.add(match[1]);
  }
  const properties = new Set();
  const walk = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.java')) for (const match of (await readFile(path, 'utf8')).matchAll(/@Value\("\$\{([a-zA-Z0-9.-]+)[:}]/g)) properties.add(match[1]);
    }
  };
  await walk(new URL(JAVA, REPO));
  const digestAlgorithm = constant(collection, 'DIGEST_ALGORITHM');
  const collectionKey = versionKey(recordComponents(collection, 'ProfileEnvelope'));
  const collectionVersion = constant(collection, 'CURRENT_ENVELOPE_VERSION');
  return {
    source: { options, failure, engine, ui },
    allowed: allowedOptions(options), commands: commandValues(options), modes: modeValues(mode),
    objectKinds: new Set(enumConstants(kinds, 'ObjectKind')), adapters: required(adapters, 'adapter identities'), properties: required(properties, '@Value properties'),
    diagnostics: enumConstants(failure, 'WorkflowFailureDiagnostic'),
    envelopes: {
      inventory: { type: constant(catalog, 'ARTIFACT_TYPE'), key: versionKey(recordComponents(catalogEnvelope, 'CatalogSnapshotArtifactEnvelope')), version: constant(catalog, 'CURRENT_ENVELOPE_VERSION') },
      profile: { type: constant(collection, 'PROFILE_TYPE'), key: collectionKey, version: collectionVersion },
      appUsage: { type: constant(collection, 'APP_USAGE_TYPE'), key: collectionKey, version: collectionVersion },
      suggestions: { type: constant(collection, 'SUGGESTION_TYPE'), key: versionKey(recordComponents(collection, 'SuggestionEnvelope')), version: collectionVersion },
      plan: { type: constant(planCodec, 'ARTIFACT_TYPE'), key: versionKey(recordComponents(planEnvelope, 'MigrationPlanArtifactEnvelope')), version: constant(planCodec, 'CURRENT_ENVELOPE_VERSION') },
    },
    digestAlgorithm,
    envelopeFields: [catalogEnvelope, planEnvelope].map((source, index) => recordComponents(source, ['CatalogSnapshotArtifactEnvelope', 'MigrationPlanArtifactEnvelope'][index]).map(({ name }) => name))
      .concat([recordComponents(collection, 'ProfileEnvelope').map(({ name }) => name)]),
    planPayload: { version: constant(plan, 'CURRENT_SCHEMA_VERSION'), fields: recordComponents(plan, 'MigrationPlan').map(({ name }) => name) },
    execution: { version: constant(execution, 'CURRENT_SCHEMA_VERSION'), fields: recordComponents(execution, 'MigrationExecutionArtifact').map(({ name }) => name) },
    ledger: { version: constant(ledger, 'CURRENT_SCHEMA_VERSION'), fields: recordComponents(ledger, 'TermLedger').map(({ name }) => name) },
    review: { version: constant(review, 'CURRENT_SCHEMA_VERSION'), fields: recordComponents(review, 'WorkflowReview').map(({ name }) => name) },
  };
}

/** 관측한 CLI 호출 하나하나가 Java 의 명령·허용 옵션·속성·값 규칙을 지키는지. 위반 문장 목록을 돌려준다. */
export function cliViolations(calls, facts) {
  const violations = [];
  for (const args of calls) {
    const jar = args.indexOf('-jar');
    if (jar < 0) { violations.push(`no -jar: ${args.join(' ')}`); continue; }
    for (const jvm of args.slice(0, jar)) {
      const property = /^-D([^=]+)=/.exec(jvm)?.[1];
      if (!property || !facts.properties.has(property)) violations.push(`JVM argument not read by migration-tool: ${jvm.split('=')[0]}`);
    }
    const options = new Map();
    for (const arg of args.slice(jar + 2)) {
      if (!arg.startsWith('--')) { violations.push('non-option CLI argument (WorkflowCliOptions rejects it)'); continue; }
      const at = arg.indexOf('=');
      options.set(at < 0 ? arg.slice(2) : arg.slice(2, at), at < 0 ? true : arg.slice(at + 1));
    }
    const command = facts.commands.get(options.get('command'));
    if (!command) { violations.push(`unknown --command=${options.get('command')}`); continue; }
    for (const name of options.keys()) if (!facts.allowed.get(command)?.has(name)) violations.push(`${command} does not accept --${name}`);
    if (options.has('mode') && !facts.modes.has(options.get('mode'))) violations.push(`unknown --mode=${options.get('mode')}`);
    for (const name of ['source-adapter', 'ack-adapter']) if (options.has(name) && !facts.adapters.has(options.get(name))) violations.push(`unknown adapter --${name}=${options.get(name)}`);
    if (options.has('object-kinds')) for (const kind of String(options.get('object-kinds')).split(',')) if (!facts.objectKinds.has(kind)) violations.push(`unknown object kind ${kind}`);
  }
  return violations;
}

/** engine 이 알아보는 진단 코드와 Java 공개 코드(CLI_FAILED 는 engine 의 기본값)가 정확히 같은지, 화면이 코드마다 안내를 갖는지. */
export function diagnosticDrift({ engineCodes, javaCodes, uiKeys, engineSource }) {
  const drift = [];
  const expected = javaCodes.filter(code => code !== 'CLI_FAILED');
  for (const code of expected) if (!engineCodes.includes(code)) drift.push(`engine does not recognise ${code}`);
  for (const code of engineCodes) if (!expected.includes(code)) drift.push(`engine recognises ${code}, which migration-tool never emits`);
  if (!javaCodes.includes('CLI_FAILED') || !engineSource.includes("'CLI_FAILED'")) drift.push('CLI_FAILED must stay the shared fallback');
  for (const code of javaCodes) if (!uiKeys.has(code)) drift.push(`the screen has no guidance for ${code}`);
  return drift;
}

// ─── 가짜 CLI: Java 상수대로 산출물을 쓴다 ─────────────────────────────────────────────────────────────────────

function fakeCli(facts, { failWith, versionDelta = 0 } = {}) {
  const calls = [];
  let loads = 0;
  const envelope = (kind, payload) => JSON.stringify({ [facts.envelopes[kind].key]: facts.envelopes[kind].version + versionDelta, artifactType: facts.envelopes[kind].type, digestAlgorithm: facts.digestAlgorithm, payloadDigest: hash(JSON.stringify(payload)), payload });
  const spawnImpl = (command, args) => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { setImmediate(() => child.emit('close', null, 'SIGTERM')); return true; };
    setImmediate(async () => {
      try {
        if (args[0] === '-version') { child.stderr.write('openjdk version "21.0.8"'); child.emit('close', 0, null); return; }
        if (args.includes('-C')) {
          const cwd = args[args.indexOf('-C') + 1];
          if (args.includes('--show-toplevel')) child.stdout.write(cwd + '\n');
          else if (args.includes('ls-files')) child.stdout.write(`100644 ${'d'.repeat(40)} 0\t${args.at(-1)}\0`);
          else if (args.includes('cat-file')) child.stdout.write(await readFile(join(cwd, 'ledger.json')));
          else child.stdout.write((args.at(-1) === 'HEAD^{commit}' ? 'c' : 'd').repeat(40) + '\n');
          child.emit('close', 0, null); return;
        }
        calls.push(args);
        const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
        if (failWith) { child.stderr.write(`workflow failed MW_DIAGNOSTIC=${failWith}\n`); child.emit('close', 1, null); return; }
        const operation = option('command');
        if (operation === 'discover') await writeFile(option('inventory'), envelope('inventory', { objects: [] }));
        if (operation === 'profile') await writeFile(option('profile'), envelope('profile', { tables: [] }));
        if (operation === 'app-scan') await writeFile(option('app-usage'), envelope('appUsage', { status: 'COMPLETE', usages: [] }));
        if (operation === 'term-suggest') {
          await writeFile(option('suggestions'), envelope('suggestions', { suggestions: [] }));
          await writeFile(option('ledger-draft'), JSON.stringify({ schemaVersion: facts.ledger.version, entries: [{ id: 'synthetic-column', source: { table: 'tb_synthetic', column: 'synthetic_id' }, grade: 'INFERRED', status: 'PROPOSED', history: [] }] }));
        }
        if (operation === 'mapping-generate') await writeFile(option('mapping'), 'source:\n  password: ${MW_SOURCE_PASSWORD}\ntarget:\n  password: ${MW_TARGET_PASSWORD}\ntables: []\nledger:\n  path: ledger.json\n');
        if (operation === 'plan') await writeFile(option('plan'), envelope('plan', { schemaVersion: facts.planPayload.version, mappingDigest: 'a'.repeat(64), targetSchemaDigest: 'b'.repeat(64) }));
        if (operation === 'load') {
          const planned = JSON.parse(await readFile(option('plan'), 'utf8'));
          await writeFile(`${option('plan')}.load-contract-${++loads}.json`, JSON.stringify({ schemaVersion: facts.execution.version, planDigest: planned.payloadDigest,
            mappingDigest: planned.payload.mappingDigest, targetDigest: planned.payload.targetSchemaDigest, mode: facts.modes.get(option('mode')), status: 'PASS', tables: [] }));
        }
        child.emit('close', 0, null);
      } catch { child.emit('close', 1, null); }
    });
    return child;
  };
  return { spawnImpl, calls };
}

const source = { vendor: 'postgresql', host: '127.0.0.1', port: 5432, database: 'legacy', schema: 'public', username: 'reader', tlsMode: 'disable' };
const target = { ...source, database: 'standard', username: 'writer' };
let requestCounter = 0;

async function fixture(t, facts, fakeOptions) {
  const root = await mkdtemp(join(tmpdir(), 'migration-cli-contract-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const jarPath = join(root, 'migration.jar'), javaPath = join(root, 'java.exe'), gitPath = join(root, 'git.exe');
  await writeFile(jarPath, 'PK synthetic test jar'); await writeFile(javaPath, 'synthetic executable'); await writeFile(gitPath, 'synthetic executable');
  const store = await openWorkspace({ directory: join(root, 'workspace') });
  t.after(() => store.close());
  const fake = fakeCli(facts, fakeOptions);
  const engine = createEngine({ store, jarPath, javaPath, gitPath, spawnImpl: fake.spawnImpl });
  const revision = async () => (await engine.state()).revision;
  const run = async (operation, options) => {
    const started = await engine.startJob({ operation, requestId: `contract-${++requestCounter}`, revision: await revision(), ...(options ? { options } : {}) });
    for (let attempt = 0; attempt < 300; attempt++) {
      const job = (await engine.state()).jobs.find(item => item.id === started.id);
      if (!['starting', 'running', 'cancelling'].includes(job.status)) return job;
      await delay(10);
    }
    throw new Error(`${operation} did not settle`);
  };
  const importJson = async (kind, name, value, directory = root) => {
    const path = join(directory, name);
    await writeFile(path, JSON.stringify(value));
    return engine.importArtifact(kind, path, await revision());
  };
  return { root, engine, fake, revision, run, importJson };
}

// ─── 시험 ────────────────────────────────────────────────────────────────────────────────────────────────────

test('every engine CLI invocation uses commands, options, properties and values the migration-tool CLI accepts', async t => {
  const facts = await javaFacts();
  // 쓰기 산출물의 필드 이름도 Java 기록 형식에 있다 — engine 이 읽는 필드가 Java 에서 사라지면 붉다.
  for (const fields of facts.envelopeFields) for (const field of ['artifactType', 'digestAlgorithm', 'payloadDigest', 'payload']) assert.ok(fields.includes(field), field);
  for (const field of ['mappingDigest', 'targetSchemaDigest']) assert.ok(facts.planPayload.fields.includes(field), `MigrationPlan.${field}`);
  for (const field of ['schemaVersion', 'planDigest', 'mappingDigest', 'targetDigest', 'mode', 'status']) assert.ok(facts.execution.fields.includes(field), `MigrationExecutionArtifact.${field}`);
  assert.deepEqual(facts.ledger.fields, ['schemaVersion', 'entries']);
  for (const field of ['schemaVersion', 'sourceInventoryDigest', 'targetSchemaDigest', 'mappingDigest', 'executionContractDigest', 'decisions']) assert.ok(facts.review.fields.includes(field), `WorkflowReview.${field}`);

  // PostgreSQL 원천으로 모든 단계를 조건부 옵션까지 켜서 돈다.
  const f = await fixture(t, facts);
  await f.engine.configureProfile('source', source, 'local-fixture-password', await f.revision());
  await f.engine.configureProfile('target', target, 'local-fixture-password', await f.revision());
  const sourceRoot = join(f.root, 'application'); await mkdir(sourceRoot);
  await f.engine.configureInputs({ sourceRoot, sourceFingerprint: 'a'.repeat(64) }, await f.revision());
  const repository = join(f.root, 'reviewed'); await mkdir(join(repository, '.git'), { recursive: true });
  await f.importJson('skeleton', 'skeleton.json', { tables: [], run: { runId: 'synthetic-contract', sourceNamespace: 'synthetic' } });
  await f.importJson('confirmed-ledger', 'ledger.json', { schemaVersion: facts.ledger.version, entries: [] }, repository);
  await f.importJson('standard-columns', 'standard-columns.json', [{ table_name: 'public.tb_synthetic', column_name: 'synthetic_id' }]);
  const steps = [['discover'], ['profile', { rowLimit: 10 }], ['app-scan'], ['term-suggest'], ['mapping-generate']];
  for (const [operation, options] of steps) {
    const job = await f.run(operation, options); assert.equal(job.status, 'succeeded', `${operation}: ${job.errorCode}`);
  }
  const sha = 'f'.repeat(64);
  await f.importJson('review', 'review.json', { schemaVersion: facts.review.version, sourceInventoryDigest: sha, targetSchemaDigest: sha, mappingDigest: sha, executionContractDigest: sha, decisions: [] });
  for (const operation of ['plan', 'validate']) {
    const job = await f.run(operation); assert.equal(job.status, 'succeeded', `${operation}: ${job.errorCode}`);
  }
  const acknowledgement = { ackAdapter: 'postgresql-pg-catalog', ackFreeze: true, ackDriverHash: 'e'.repeat(64) };
  const dryRun = await f.run('dry-run', acknowledgement); assert.equal(dryRun.status, 'succeeded', `dry-run: ${dryRun.errorCode}`);
  const archiveDirectory = join(f.root, 'external-archive'); await mkdir(archiveDirectory);
  const commit = await f.run('commit', { ...acknowledgement, confirm: true, targetPhrase: `COMMIT ${target.database}`, archiveDirectory, ackControlSchemaUpgrade: true });
  assert.equal(commit.status, 'succeeded', `commit: ${commit.errorCode}`);

  // 외부 드라이버가 필요한 원천은 드라이버 옵션을 함께 넘긴다.
  const mysql = await fixture(t, facts);
  const driverJar = join(mysql.root, 'driver.jar'); await writeFile(driverJar, 'PK synthetic driver');
  await mysql.engine.configureProfile('source', { ...source, vendor: 'mysql', port: 3306, driverJar, driverClass: 'com.mysql.cj.jdbc.Driver' }, 'local-fixture-password', await mysql.revision());
  const discovered = await mysql.run('discover'); assert.equal(discovered.status, 'succeeded', `mysql discover: ${discovered.errorCode}`);

  const calls = [...f.fake.calls, ...mysql.fake.calls];
  assert.deepEqual(cliViolations(calls, facts), []);
  // 관측한 옵션·속성은 engine 소스의 리터럴과 정확히 같다 — 새 옵션을 더하면 이 시나리오도 그 옵션을 내도록 넓혀야 통과한다.
  const literals = engineLiterals(facts.source.engine);
  const observed = new Set(calls.flatMap(args => args.filter(arg => arg.startsWith('--')).map(arg => arg.slice(2).split('=')[0])));
  const properties = new Set(calls.flatMap(args => args.filter(arg => arg.startsWith('-D')).map(arg => arg.slice(2).split('=')[0])));
  assert.deepEqual([...observed].sort(), [...literals.options].sort());
  assert.deepEqual([...properties].sort(), [...literals.properties].sort());
  // engine 이 아는 모든 원천의 adapter id 가 migration-tool 에 있다(실행하지 않은 원천 포함).
  for (const [, adapter] of facts.source.engine.matchAll(/adapter:\s*'([a-z][a-z-]*)'/g)) assert.ok(facts.adapters.has(adapter), adapter);
});

test('diagnostic codes are exactly the Java WorkflowFailureDiagnostic codes and each reaches the job and the screen', async t => {
  const facts = await javaFacts();
  const engineCodes = engineDiagnosticCodes(facts.source.engine);
  assert.deepEqual(diagnosticDrift({ engineCodes, javaCodes: facts.diagnostics, uiKeys: uiDiagnosticKeys(facts.source.ui), engineSource: facts.source.engine }), []);
  // migration-tool 이 내는 코드마다 engine 이 그 코드로 실패를 기록한다. 모르는 코드는 CLI_FAILED 다.
  for (const code of [...facts.diagnostics, 'DB_SYNTHETIC_DRIFT']) {
    const f = await fixture(t, facts, { failWith: code });
    await f.engine.configureProfile('source', source, 'local-fixture-password', await f.revision());
    const job = await f.run('discover');
    assert.equal(job.status, 'failed');
    assert.equal(job.errorCode, facts.diagnostics.includes(code) ? code : 'CLI_FAILED', code);
  }
});

test('engine rejects artifacts whose format version differs from the Java writer', async t => {
  const facts = await javaFacts();
  for (const versionDelta of [1, -1]) {
    const f = await fixture(t, facts, { versionDelta });
    await f.engine.configureProfile('source', source, 'local-fixture-password', await f.revision());
    const job = await f.run('discover');
    assert.equal(job.status, 'failed');
    assert.equal(job.errorCode, 'ARTIFACT_CONTRACT');
  }
});

// 부정 사례: 소스 한쪽만 바뀌면 대조가 붉어진다. 소스를 못 읽으면 빈 집합으로 통과하지 않는다.
test('the contract turns red when either side drifts and fails loudly when a source can no longer be read', async () => {
  const facts = await javaFacts();
  const call = ['-Dmigration.db-columns-path=/x', '-jar', '/x.jar', '--command=profile', '--profile-row-limit=5', '--source-adapter=postgresql-pg-catalog', '--object-kinds=TABLE'];
  assert.deepEqual(cliViolations([call], facts), []);
  const narrowed = facts.source.options.replace('"profile", "profile-row-limit",', '"profile",');
  assert.notEqual(narrowed, facts.source.options, 'fixture must still find the PROFILE allow-list');
  assert.deepEqual(cliViolations([call], { ...facts, allowed: allowedOptions(narrowed) }), ['PROFILE does not accept --profile-row-limit']);
  assert.deepEqual(cliViolations([['-Dmigration.renamed-path=/x', ...call.slice(1)]], facts), ['JVM argument not read by migration-tool: -Dmigration.renamed-path']);
  assert.deepEqual(cliViolations([[...call, 'stray']], facts), ['non-option CLI argument (WorkflowCliOptions rejects it)']);
  assert.deepEqual(cliViolations([['-jar', '/x.jar', '--command=load', '--mode=rehearse']], facts), ['unknown --mode=rehearse']);
  assert.deepEqual(cliViolations([['-jar', '/x.jar', '--command=discover', '--source-adapter=postgresql-catalog']], facts), ['unknown adapter --source-adapter=postgresql-catalog']);
  assert.deepEqual(cliViolations([['-jar', '/x.jar', '--command=scan']], facts), ['unknown --command=scan']);

  const engineCodes = engineDiagnosticCodes(facts.source.engine);
  const uiKeys = uiDiagnosticKeys(facts.source.ui);
  const added = facts.source.failure.replace('DB_DRIVER_UNAVAILABLE,', 'DB_DRIVER_UNAVAILABLE,\n    DB_TLS_PROTOCOL,');
  assert.deepEqual(diagnosticDrift({ engineCodes, javaCodes: enumConstants(added, 'WorkflowFailureDiagnostic'), uiKeys, engineSource: facts.source.engine }),
    ['engine does not recognise DB_TLS_PROTOCOL', 'the screen has no guidance for DB_TLS_PROTOCOL']);
  const renamed = facts.source.failure.replace('DB_TLS_CERTIFICATE,', 'DB_TLS_CERT,');
  assert.deepEqual(diagnosticDrift({ engineCodes, javaCodes: enumConstants(renamed, 'WorkflowFailureDiagnostic'), uiKeys, engineSource: facts.source.engine }),
    ['engine does not recognise DB_TLS_CERT', 'engine recognises DB_TLS_CERTIFICATE, which migration-tool never emits', 'the screen has no guidance for DB_TLS_CERT']);

  assert.throws(() => allowedOptions('class Nothing {}'), /WorkflowCliOptions\.ALLOWED/);
  assert.throws(() => engineDiagnosticCodes('const DIAGNOSTIC = new Set([]);'), /MW_DIAGNOSTIC/);
  assert.throws(() => engineLiterals('function other() {}'), /buildJob/);
  assert.throws(() => enumConstants('enum Other { A; }', 'WorkflowFailureDiagnostic'), /WorkflowFailureDiagnostic/);
});
