import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BEAN_VALIDATION_PATTERN, ERROR_CODE_PATTERN, HANDLER_KEY_PATTERN, MESSAGE_BUNDLES, MESSAGE_CONTRACT, MESSAGE_HANDLER_SOURCE,
  MESSAGE_SCAN_MODULES, beanValidationKeysIn, beanValidationRefsIn, errorCodesIn, handlerKeysIn, isErrorCodeSource, lowerContractFloors,
  orphanedValidationKeys, ownedMessageKeys, pruneBundleText, pruneOwnedMessageKeys, validationKeysToPrune,
} from './reusable-source-messages.mjs';
import { pruneJava, stripJavaComments } from './reusable-source-java.mjs';
import { composerOwnership, loadComposerModules } from './composer-modules.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(ROOT, path), 'utf8');
const BOARD = 'business-app/src/main/java/nuri/business/domain/board/exception/BoardErrorCode.java';
const keysOf = text => text.split(/\r?\n/).map(line => /^([^#!=:\s][^=:\s]*)\s*=/.exec(line)?.[1]).filter(Boolean);
const javaLiteral = (source, name) => {
  const literal = new RegExp(`Pattern ${name} = Pattern\\.compile\\("((?:[^"\\\\]|\\\\.)*)"\\);`).exec(source)?.[1];
  assert.ok(literal, `계약의 ${name} 선언을 찾지 못했다`);
  return literal.replace(/\\(.)/g, '$1');
};
const floorOf = (source, name) => Number(new RegExp(`private static final int ${name} = (\\d+);`).exec(source)?.[1]);

/** 계약과 같은 범위·같은 판정으로 센다 — 네 모듈의 src/main/java. */
function census(root) {
  const files = [];
  const walk = directory => {
    if (!existsSync(directory)) return;
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.java')) files.push(path);
    }
  };
  for (const module of MESSAGE_SCAN_MODULES) walk(join(root, module, 'src', 'main', 'java'));
  const codes = new Set();
  const validationKeys = new Set();
  let refs = 0;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (file.endsWith('ErrorCode.java')) errorCodesIn(source).forEach(code => codes.add(code));
    const stripped = stripJavaComments(source);
    refs += beanValidationRefsIn(stripped);
    beanValidationKeysIn(stripped).forEach(key => validationKeys.add(key));
  }
  return { errorCodes: codes.size, beanValidationRefs: refs, codes, validationKeys };
}

/**
 * 계약의 세 해석 경로(ErrorCode 코드·handler 키·Bean Validation 키)로 번들을 대조한다 — 고아 키(어느 경로도 읽지 않음)와
 * 빠진 키(경로가 읽는데 ko·en 어느 한쪽에 없음). 계약(everyBundleKeyIsReferencedByAResolutionPath 와 정방향 세 검사)과 같은 판정이라
 * 투영이 덜 걷으면 고아로, 더 걷으면 빠진 키로 PR 시점에 붉다(T2 를 기다리지 않는다).
 */
function bundleResolution(root) {
  const { codes, validationKeys } = census(root);
  const handler = handlerKeysIn(readFileSync(join(root, MESSAGE_HANDLER_SOURCE), 'utf8'));
  const referenced = new Set([...codes, ...handler, ...validationKeys]);
  const [ko, en] = MESSAGE_BUNDLES.map(path => new Set(keysOf(readFileSync(join(root, path), 'utf8'))));
  return {
    orphans: [...new Set([...ko, ...en])].filter(key => !referenced.has(key)).sort(),
    missing: [...referenced].filter(key => !ko.has(key) || !en.has(key)).sort(),
  };
}

function projectedTree(profileName) {
  const output = mkdtempSync(join(tmpdir(), 'egov-message-prune-'));
  for (const path of ['config', 'api-server/src/main/java', 'api-server/src/test/java', 'business-app/src/main/java',
    'business-app/src/test/java', 'business-core/src/main/java', 'business-core/src/test/java',
    'foundation/src/main/java', 'foundation/src/test/java', ...MESSAGE_BUNDLES]) {
    mkdirSync(dirname(join(output, path)), { recursive: true });
    cpSync(join(ROOT, path), join(output, path), { recursive: true });
  }
  // 생성기처럼 매니페스트 v2 의 기능 소유와 시작 구성의 기능 목록으로 투영한다(11단계 C3).
  const modules = loadComposerModules(ROOT);
  const preset = modules.files['presets.json'].presets.find(entry => entry.id === profileName);
  return { output, java: pruneJava(output, composerOwnership(modules), { resolvedDomains: preset.domains }) };
}

test('ErrorCode·Bean Validation·handler 정규식은 메시지 번들 계약의 원문과 같다', () => {
  const contract = read(MESSAGE_CONTRACT);
  assert.equal(javaLiteral(contract, 'ERROR_CODE'), ERROR_CODE_PATTERN);
  assert.equal(javaLiteral(contract, 'BEAN_VALIDATION_KEY'), BEAN_VALIDATION_PATTERN);
  assert.equal(javaLiteral(contract, 'HANDLER_KEY'), HANDLER_KEY_PATTERN);
  assert.ok(contract.includes(`"${MESSAGE_HANDLER_SOURCE}"`), '계약이 읽는 handler 소스 경로가 다르다');
  assert.match(contract, /List\.of\("foundation", "business-core", "business-app", "api-server"\)/);
  assert.deepEqual(MESSAGE_SCAN_MODULES, ['foundation', 'business-core', 'business-app', 'api-server']);
  // B003(댓글 없음)은 게시판이 아니라 댓글 ErrorCode 가 정의한다.
  assert.deepEqual(errorCodesIn(read(BOARD)), ['B001', 'B002', 'B004', 'B005', 'B006', 'B007']);
  assert.deepEqual(errorCodesIn(read('business-app/src/main/java/nuri/business/domain/comment/exception/CommentErrorCode.java')), ['B003']);
});

test('계약이 스캔하지 않는 ErrorCode 소스는 세지 않는다', () => {
  assert.equal(isErrorCodeSource(BOARD), true);
  assert.equal(isErrorCodeSource('business-app/src/test/java/nuri/x/FakeErrorCode.java'), false);
  assert.equal(isErrorCodeSource('migration-tool/src/main/java/nuri/x/MigrationErrorCode.java'), false);
  assert.equal(isErrorCodeSource('business-app/src/main/java/nuri/x/ErrorCodeTest.java'), false);
});

test('지워지는 ErrorCode 의 키만 고르고, 남는 enum 이 같은 코드를 정의하면 남긴다', () => {
  const removed = [{ path: 'x/BoardErrorCode.java', source: '("B001", "a"), ("B002", "b")' }];
  assert.deepEqual(ownedMessageKeys(removed, []), { keys: ['B001', 'B002'], owners: ['BoardErrorCode'] });
  const surviving = [{ path: 'y/OtherErrorCode.java', source: '("B002", "c")' }];
  assert.deepEqual(ownedMessageKeys(removed, surviving), { keys: ['B001'], owners: ['BoardErrorCode'] });
  const shadowed = [{ path: 'y/OtherErrorCode.java', source: '("B001", "c"), ("B002", "d")' }];
  assert.deepEqual(ownedMessageKeys(removed, shadowed), { keys: [], owners: [] });
});

test('지운 소스만 참조하던 Bean Validation 키만 고르고, 남는 소스·ErrorCode·handler 가 읽는 키는 남긴다', () => {
  const removed = ['@Pattern(regexp = "x", message = "{validation.pattern}") @Size(message = "{validation.size.max}")',
    'message = "{validation.only.removed}" message = "{C001}" message = "{handler.shared}"'];
  const surviving = ['@Size(max = 5, message = "{validation.size.max}")'];
  assert.deepEqual(orphanedValidationKeys(removed, surviving, { errorCodes: ['C001'], handlerKeys: ['handler.shared'] }),
    ['validation.only.removed', 'validation.pattern']);
  assert.deepEqual(orphanedValidationKeys(removed, [...surviving, 'message = "{validation.pattern}"'],
    { errorCodes: ['C001'], handlerKeys: ['handler.shared'] }), ['validation.only.removed']);
  assert.deepEqual(orphanedValidationKeys([], surviving), []);
  // 주석을 걷은 원문을 받는다 — 호출자가 걷지 않으면 주석 속 참조도 남는 참조로 세어 덜 걷는다(계약도 주석을 걷고 센다).
  assert.deepEqual(beanValidationKeysIn('message = "{a.b}", message="{c}"'), ['a.b', 'c']);
  assert.deepEqual(handlerKeysIn('resolve( "handler.not_found", x); resolve("Upper.key")'), ['handler.not_found']);
});

test('걷을 후보가 없으면 handler 를 읽지 않고, 후보가 있는데 handler 가 없으면 실패한다', () => {
  const removed = ['message = "{validation.only.removed}" message = "{handler.shared}"'];
  let reads = 0;
  const handler = source => () => { reads += 1; return source; };
  // 번들·handler 가 없는 합성 저장소(생성기 시험): 지운 소스에 키 참조가 없으면 handler 없이도 투영된다.
  assert.deepEqual(validationKeysToPrune(['class MailService {}'], [], { readHandler: handler(undefined) }), []);
  assert.equal(reads, 0, '후보가 없으면 handler 를 읽지 않는다');
  assert.throws(() => validationKeysToPrune(removed, [], { readHandler: handler(undefined) }),
    new RegExp(`메시지 해석 경로\\(handler\\) 소스가 없다: ${MESSAGE_HANDLER_SOURCE.replaceAll('.', '\\.')}`));
  assert.deepEqual(validationKeysToPrune(removed, [], { readHandler: handler('resolve("handler.shared")') }), ['validation.only.removed'],
    'handler 가 읽는 키는 남긴다');
});

test('번들에서 키 줄과 그 enum 의 머리 주석만 지우고 줄 끝 형식을 지킨다', () => {
  const text = '# CodeErrorCode (CD0x)\r\nCD01=a\r\n\r\n# BoardErrorCode (B0xx)\r\nB001=b\r\nB0010=keep\r\n# BoardErrorCodeX (keep)\r\n';
  const pruned = pruneBundleText(text, { keys: ['B001'], owners: ['BoardErrorCode'] });
  assert.equal(pruned, '# CodeErrorCode (CD0x)\r\nCD01=a\r\n\r\nB0010=keep\r\n# BoardErrorCodeX (keep)\r\n');
});

test('들여쓴 키와 BOM 이 붙은 첫 키도 Java Properties 처럼 읽어 걷고, BOM 은 남긴다', () => {
  const text = '\uFEFFB001=a\n  B002 = b\nC001=c\n';
  assert.equal(pruneBundleText(text, { keys: ['B001', 'B002'], owners: [] }), '\uFEFFC001=c\n');
  assert.equal(pruneBundleText('\uFEFFC001=c\nB001=a\n', { keys: ['B001'], owners: [] }), '\uFEFFC001=c\n');
});

test('번들 경로가 바뀌면 조용히 넘기지 않고 실패한다', () => {
  const output = mkdtempSync(join(tmpdir(), 'egov-message-prune-'));
  try {
    assert.throws(() => pruneOwnedMessageKeys(output, { keys: ['B001'], owners: [] }), /메시지 번들이 없다/);
    assert.deepEqual(pruneOwnedMessageKeys(output, { keys: [], owners: [] }), []);
  } finally { rmSync(output, { recursive: true }); }
});

test('하한은 지운 몫만큼만 내리고, 상수가 없거나 1 아래로 내려가면 실패한다', () => {
  const source = 'private static final int MIN_ERROR_CODES = 39;\nprivate static final int MIN_BEAN_VALIDATION_REFS = 10;\n';
  assert.deepEqual(lowerContractFloors(source, { errorCodes: 6, beanValidationRefs: 5 }), {
    source: 'private static final int MIN_ERROR_CODES = 33;\nprivate static final int MIN_BEAN_VALIDATION_REFS = 5;\n',
    changes: { MIN_ERROR_CODES: [39, 33], MIN_BEAN_VALIDATION_REFS: [10, 5] },
  });
  assert.deepEqual(lowerContractFloors(source, { errorCodes: 0, beanValidationRefs: 0 }), { source, changes: {} });
  assert.throws(() => lowerContractFloors('', { errorCodes: 1 }), /하한 상수를 찾지 못했다: MIN_ERROR_CODES/);
  assert.throws(() => lowerContractFloors(source, { beanValidationRefs: 10 }), /1 아래로 내려간다/);
});

test('원본 번들은 세 해석 경로와 정확히 맞는다(고아 키·빠진 키 없음)', () => {
  assert.deepEqual(bundleResolution(ROOT), { orphans: [], missing: [] });
});

test('core 투영은 게시판·댓글 ErrorCode 의 키를 걷고, 계약 하한을 원본과 같은 여유 폭으로 내린다', () => {
  const { output, java } = projectedTree('core');
  try {
    assert.deepEqual(java.prunedMessageKeys, ['B001', 'B002', 'B003', 'B004', 'B005', 'B006', 'B007']);
    // ADR-0043 뒤 validation.pattern 은 게시판 DTO 만 참조한다 — 게시판이 빠지면 함께 걷는다(T2 2026-10-27~ 의 고아 키).
    assert.deepEqual(java.prunedValidationMessageKeys, ['validation.pattern']);
    assert.deepEqual(bundleResolution(output), { orphans: [], missing: [] }, '투영 뒤 번들이 계약의 세 해석 경로와 어긋난다');
    const [ko, en] = MESSAGE_BUNDLES.map(path => readFileSync(join(output, path), 'utf8'));
    for (const text of [ko, en]) {
      assert.ok(!keysOf(text).some(key => /^B00\d$/.test(key)), '게시판 키가 남았다');
      assert.ok(!text.includes('# BoardErrorCode ('), '게시판 머리 주석이 남았다');
      assert.ok(keysOf(text).includes('C001'), '공통 키까지 지웠다');
    }
    assert.deepEqual(keysOf(ko).sort(), keysOf(en).sort());
    assert.equal(ko.includes('\r\n'), read(MESSAGE_BUNDLES[0]).includes('\r\n'), '줄 끝 형식이 바뀌었다');

    // 원본과 생성물을 계약과 같은 범위·판정으로 세어 여유 폭(실측 - 하한)이 같은지 본다.
    const upstream = census(ROOT);
    const projected = census(output);
    const upstreamContract = read(MESSAGE_CONTRACT);
    const projectedContract = readFileSync(join(output, MESSAGE_CONTRACT), 'utf8');
    for (const [measure, constant] of [['errorCodes', 'MIN_ERROR_CODES'], ['beanValidationRefs', 'MIN_BEAN_VALIDATION_REFS']]) {
      const before = floorOf(upstreamContract, constant);
      const after = floorOf(projectedContract, constant);
      assert.deepEqual(java.messageContractFloors[constant], [before, after], constant);
      assert.ok(after < before, `${constant}: 기능을 지웠는데 하한이 그대로다`);
      assert.equal(projected[measure] - after, upstream[measure] - before, `${constant}: 여유 폭이 원본과 다르다`);
    }
  } finally { rmSync(output, { recursive: true }); }
});

test('게시판이 남는 collaboration 투영은 메시지 키와 하한을 건드리지 않는다', () => {
  const { output, java } = projectedTree('collaboration');
  try {
    assert.equal(java.prunedMessageKeys, undefined);
    assert.equal(java.prunedValidationMessageKeys, undefined);
    assert.equal(java.messageContractFloors, undefined);
    for (const path of [...MESSAGE_BUNDLES, MESSAGE_CONTRACT]) assert.equal(readFileSync(join(output, path), 'utf8'), read(path));
  } finally { rmSync(output, { recursive: true }); }
});

test('투영 픽스처는 원본 번들과 계약을 바꾸지 않는다', () => {
  // 위 시험들이 임시 폴더가 아니라 원본을 고쳤다면 원본에서 게시판 키가 빠지거나 하한이 내려가 있다.
  for (const path of MESSAGE_BUNDLES) assert.ok(keysOf(read(path)).includes('B001'), path);
  for (const path of MESSAGE_BUNDLES) assert.ok(keysOf(read(path)).includes('validation.pattern'), path);
  assert.equal(floorOf(read(MESSAGE_CONTRACT), 'MIN_ERROR_CODES'), 39);
  assert.equal(floorOf(read(MESSAGE_CONTRACT), 'MIN_BEAN_VALIDATION_REFS'), 33);
});
