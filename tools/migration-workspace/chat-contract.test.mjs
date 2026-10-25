import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fieldCatalog, routeCatalog, parseChatDraft, validateDraftPatches } from './chat-contract.mjs';

const values = { 'source-vendor': 'postgresql', 'source-port': '5432', 'target-vendor': 'postgresql', 'target-port': '5432' };
const parse = (message, options = {}) => parseChatDraft({ message, values, ...options });
const map = result => Object.fromEntries(result.patches.map(patch => [patch.fieldId, patch.value]));
const publicText = result => JSON.stringify({ reply: result.reply, displayMessage: result.displayMessage });

test('catalog maps only editable controls to actual form IDs and fixed routes', async () => {
  const profiles = await readFile(new URL('./public/profiles.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
  assert.equal(new Set(fieldCatalog.map(field => field.id)).size, fieldCatalog.length);
  for (const field of fieldCatalog) {
    assert.ok(routeCatalog.some(route => route.route === field.route));
    assert.equal(typeof field.sensitive, 'boolean');
    if (['source-path', 'source-upload-kind'].includes(field.id)) assert.ok(html.includes(`id="${field.id}"`));
    else {
      const name = field.id.replace(/^(source|target)-/, '');
      assert.ok(name === 'vendor' ? profiles.includes('`${role}-vendor`') : profiles.includes(`add('${name}'`));
    }
  }
  assert.ok(!fieldCatalog.some(field => field.id.includes('driverClass') || field.id === 'source-upload-file'));
});

test('Korean DB setup identifies real controls, preserves values, and removes grammar suffixes', () => {
  const result = parse('원천 DB는 PostgreSQL이고 호스트는 localhost, 포트는 5544야');
  assert.equal(result.handled, true);
  assert.deepEqual(map(result), { 'source-vendor': 'postgresql', 'source-host': 'localhost', 'source-port': '5544' });
  assert.equal(result.navigate, 'connect');
  assert.deepEqual(result.pending, { fieldId: 'source-database' });
  assert.doesNotMatch(publicText(result), /localhost|5544/);
});

test('pending field supports a plain answer and asks the next missing field', () => {
  const first = parse('원천 DB 연결을 준비해줘');
  assert.deepEqual(first.pending, { fieldId: 'source-host' });
  const second = parse('db.synthetic.invalid', { pending: first.pending });
  assert.deepEqual(map(second), { 'source-host': 'db.synthetic.invalid' });
  assert.deepEqual(second.pending, { fieldId: 'source-database' });
  const third = parse('legacy', { pending: second.pending, values: { ...values, 'source-host': 'db.synthetic.invalid' } });
  assert.deepEqual(map(third), { 'source-database': 'legacy' });
  assert.deepEqual(third.pending, { fieldId: 'source-schema' });
});

test('ambiguous role is never inferred from route or populated fields and can be answered later', () => {
  const first = parse('DB 이름은 legacy, 스키마 public', { route: 'connect' });
  assert.deepEqual(first.patches, []);
  assert.equal(first.pending.chooseRole, true);
  assert.doesNotMatch(publicText(first), /legacy|public/);
  const second = parse('원천이야', { pending: first.pending });
  assert.deepEqual(map(second), { 'source-database': 'legacy', 'source-schema': 'public' });
});

test('explicit field prefixes keep source and target changes distinct', () => {
  const result = parse('source-host=legacy.synthetic.invalid target-host=target.synthetic.invalid');
  assert.deepEqual(map(result), { 'source-host': 'legacy.synthetic.invalid', 'target-host': 'target.synthetic.invalid' });
});

test('password and paths remain exact local values and never appear in public response', () => {
  const password = 'synthetic p,ass=word야';
  const result = parse(`원천 username=synthetic_reader password="${password}"`);
  assert.deepEqual(map(result), { 'source-username': 'synthetic_reader', 'source-password': password });
  assert.doesNotMatch(publicText(result), /synthetic|p,ass/);
  const folder = parse('소스 폴더="D:\\synthetic source\\application"');
  assert.deepEqual(map(folder), { 'source-path': 'D:\\synthetic source\\application' });
  assert.equal(folder.navigate, 'source');
  assert.doesNotMatch(publicText(folder), /synthetic|D:/);
});

test('target vendor and vendor-specific fields are validated against the current draft', () => {
  assert.equal(parse('대상 DB는 Oracle').blocked, true);
  assert.equal(parse('원천 oracleMode=sid').blocked, true);
  assert.deepEqual(map(parse('원천 DB=Oracle oracleMode=service database=ORCL')), { 'source-vendor': 'oracle', 'source-oracleMode': 'service', 'source-database': 'ORCL' });
  assert.equal(parse('원천 instance=INSTANCE_A').blocked, true);
  assert.deepEqual(map(parse('원천 DB=SQL Server instance=INSTANCE_A')), { 'source-vendor': 'sqlserver', 'source-instance': 'INSTANCE_A' });
});

test('ZIP and DDL use the actual kind control but never fabricate a selected file', () => {
  for (const [message, kind] of [['ZIP 파일 D:\\synthetic\\source.zip 가져와줘', 'zip'], ['DDL 스키마 가져오기', 'ddl']]) {
    const result = parse(message);
    assert.deepEqual(map(result), { 'source-upload-kind': kind });
    assert.match(result.reply, /직접 선택/);
    assert.doesNotMatch(publicText(result), /synthetic/);
  }
});

test('unsupported credential and execution assignments stay local without partial patches', () => {
  for (const message of [
    '원천 host=localhost api_key=synthetic-only', '원천 jdbcUrl=jdbc:postgresql://synthetic/test',
    '원천 password=synthetic driverClass=evil.Driver', 'selector=#commit shell=delete',
    'refresh_token=synthetic-only', '이 값은 123456-1234567 입니다',
    'https://synthetic.invalid/token', 'D:\\synthetic\\secrets.txt를 보내줘',
  ]) {
    const result = parse(message);
    assert.equal(result.handled, true, message); assert.equal(result.blocked, true, message);
    assert.deepEqual(result.patches, []); assert.doesNotMatch(publicText(result), /synthetic-only|123456-1234567|evil\.Driver|secrets\.txt/);
  }
});

test('invalid ports, duplicate assignments, unknown field keys, and payload properties fail closed', () => {
  for (const message of ['원천 port=0', '원천 port=65536', '원천 port=3.2', '원천 host=one host=two']) assert.equal(parse(message).blocked, true, message);
  for (const patches of [
    [{ fieldId: 'commit-confirm-name', value: 'COMMIT' }], [{ fieldId: 'source-driverClass', value: 'evil.Driver' }],
    [{ fieldId: 'source-upload-file', value: 'D:\\synthetic.zip' }], [{ fieldId: '__proto__', value: 'bad' }],
    [{ fieldId: 'source-port', value: 5432 }], [{ fieldId: 'source-host', value: 'localhost', execute: true }],
    [{ fieldId: 'source-host', value: 'localhost; DROP TABLE synthetic' }],
  ]) assert.throws(() => validateDraftPatches(patches, { values }));
});

test('external model patches are restricted to canonical enums with no text or port payloads', () => {
  assert.deepEqual(validateDraftPatches([{ fieldId: 'source-vendor', value: 'oracle' }], { values, allowSensitive: false }), [{ fieldId: 'source-vendor', value: 'oracle' }]);
  for (const [fieldId, value] of [['source-host', 'localhost'], ['source-password', 'synthetic'], ['source-schema', 'public'], ['source-path', 'D:\\synthetic'], ['source-port', '5432']]) {
    assert.throws(() => validateDraftPatches([{ fieldId, value }], { values, allowSensitive: false }), { code: 'CHAT_FIELD_NOT_ALLOWED' });
  }
  assert.throws(() => validateDraftPatches([{ fieldId: 'source-vendor', value: 'arbitrary-model-output' }], { values, allowSensitive: false }));
});

test('navigation uses only catalog routes and ordinary unhandled questions expose no transcript raw text', () => {
  assert.equal(parse('변환 원장 화면을 열어줘').navigate, 'review');
  const result = parse('용어 후보의 점수는 무슨 의미인가요?', { route: 'review' });
  assert.equal(result.handled, false); assert.equal(result.route, 'review'); assert.equal(result.displayMessage, 'AI 질문');
  assert.equal(parse('취소', { pending: { fieldId: 'source-password' } }).pending, undefined);
});

test('field questions never become literal values, including a pending follow-up answer', () => {
  for (const message of ['스키마는 무엇인가요?', '호스트는 어디서 확인해?', '비밀번호는 뭘 넣어?', '포트는 무슨 뜻인가요?']) {
    const result = parse(message, { pending: { fieldId: 'source-host' } });
    assert.equal(result.handled, true); assert.deepEqual(result.patches, []); assert.deepEqual(result.pending, { fieldId: 'source-host' });
    assert.equal(result.navigate, 'connect'); assert.match(result.reply, /입력|확인|서버|로컬/);
  }
});

test('follow-up labels retain the chosen DB role without asking the same role again', () => {
  const result = parse('DB 이름은 legacy, 스키마 public', { pending: { fieldId: 'source-host' } });
  assert.deepEqual(map(result), { 'source-database': 'legacy', 'source-schema': 'public' });
  assert.deepEqual(result.pending, { fieldId: 'source-host' });
});

test('password follow-up never consumes execution or navigation commands', () => {
  for (const message of ['저장해줘', '실제 적재를 실행해줘', '분석해주세요', '결과 화면을 열어줘']) {
    const result = parse(message, { pending: { fieldId: 'source-password' } });
    assert.equal(result.handled, true); assert.deepEqual(result.patches, []);
  }
  assert.equal(parse('결과 화면을 열어줘', { pending: { fieldId: 'source-password' } }).navigate, 'results');
});

test('unsaved sensitive form values cannot escape through an otherwise ordinary external question', () => {
  for (const [fieldId, value] of [['source-host', 'legacy-dev'], ['source-username', 'synthetic-reader'], ['source-password', 'only-local-secret'], ['source-database', 'privateCatalog'], ['source-schema', 'INTERNAL_SCOPE']]) {
    const result = parse(`이 ${value} 내용을 설명해줘`, { values: { ...values, [fieldId]: value } });
    assert.equal(result.handled, true); assert.equal(result.blocked, true); assert.deepEqual(result.patches, []);
    assert.ok(!publicText(result).includes(value));
  }
});

test('clear change phrases and host address alias populate the intended current-role controls', () => {
  for (const phrase of ['포트는 5433으로 바꿔줘', '포트는 5433으로 변경해줘']) {
    assert.deepEqual(map(parse(phrase, { pending: { fieldId: 'source-port' } })), { 'source-port': '5433' });
  }
  assert.deepEqual(map(parse('원천 주소는 localhost로 바꿔줘')), { 'source-host': 'localhost' });
});

test('Oracle service and SID labels set both real controls only with an Oracle vendor', () => {
  const oracleValues = { ...values, 'source-vendor': 'oracle' };
  for (const [phrase, mode] of [['서비스 이름은 ORCL', 'service'], ['서비스명=ORCL', 'service'], ['SID는 ORCL', 'sid']]) {
    const options = { pending: { fieldId: 'source-database' } };
    assert.deepEqual(map(parse(phrase, { ...options, values: oracleValues })), { 'source-database': 'ORCL', 'source-oracleMode': mode });
    assert.equal(parse(phrase, options).blocked, true);
  }
});

test('obvious pasted institutional material stays local and ordinary process questions remain available', () => {
  for (const message of ['SELECT USER_NM FROM TB_SYNTHETIC;', 'public class Synthetic {}', '<query>synthetic</query>', '{"name":"synthetic"}', 'ID,NAME\n1,SYNTHETIC', '문제\n at synthetic.Service.call(Service.java:10)']) {
    const result = parse(message);
    assert.equal(result.handled, true); assert.equal(result.blocked, true); assert.equal(result.navigate, 'ai');
    assert.deepEqual(result.patches, []); assert.doesNotMatch(publicText(result), /synthetic/i);
  }
  assert.equal(parse('표준 용어를 비교하는 절차가 궁금합니다.').handled, false);
  assert.equal(parse('SQL 문법을 공부하려면 어떤 순서가 좋나요?').handled, false);
});

test('a password-form hint never turns the following bare answer into model input or a guessed password', () => {
  const result = parse('synthetic-private-answer', { pending: { fieldId: 'source-password', directOnly: true } });
  assert.equal(result.handled, true); assert.equal(result.blocked, true); assert.deepEqual(result.patches, []);
  assert.equal(result.navigate, 'connect'); assert.doesNotMatch(publicText(result), /synthetic-private-answer/);
});
