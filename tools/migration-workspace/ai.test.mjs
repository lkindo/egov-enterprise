import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createAi, checkApproval, AI_POLICY, CONNECTION_TEST_PROMPT } from './ai.mjs';

async function fixture(t, { approved = true, verify = true } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'migration-ai-test-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const workspaceId = createHash('sha256').update(directory).digest('hex').slice(0, 24), approvalPath = path.join(directory, 'approval.json');
  const approval = { policy: AI_POLICY, workspaceId, service: 'openai-api', reference: 'synthetic-local-test', processingLocation: 'test', retention: 'test', expiresAt: '2099-01-01T00:00:00Z', modes: ['restricted', 'expanded'], scopes: ['names', 'candidates', 'diagnostics', 'excerpts'] };
  if (approved) await writeFile(approvalPath, JSON.stringify(approval));
  const state = { revision: 1, inputRevision: 1, profiles: {}, inputs: {}, jobs: [] };
  let ledger = { schemaVersion: 2, entries: [{ id: 'column-1', source: { table: 'legacy.person', column: 'name' }, status: 'PROPOSED' }] };
  const calls = [], jobs = [], secrets = ['synthetic-db-private-value'];
  const response = { message: '사용처와 표준 후보를 비교하세요.', question: '이름은 개인 성명을 뜻하나요?', nextOperation: '', changes: [{ entryId: 'column-1', engAbbr: 'USER_NM', rationale: '사람 이름에 쓰이는 후보입니다.' }] };
  const chatResponse = { message: 'DB 연결 준비 화면에서 원천 DB를 설정한 뒤 구조 조사를 진행하세요.', question: '먼저 원천 DB 종류를 선택하시겠어요?', route: 'connect', focusField: 'source-vendor', patches: [] };
  const engine = { state: async () => structuredClone(state), getArtifact: async kind => ({ content: JSON.stringify(kind === 'ledger' ? ledger : { payload: { columns: [{ table: 'legacy.person', column: 'name', candidates: [{ termName: '사용자명', engAbbr: 'USER_NM', domain: '문자열' }], sampleValues: ['DO_NOT_SEND'] }] } }) }), saveLedger: async value => { ledger = value; state.revision++; return state; }, startJob: async value => { jobs.push(value); return { id: 'synthetic', status: 'running' }; } };
  const transport = { status: 200, testReply: 'MIGRATION_CONNECTION_OK' };
  const ai = await createAi({ store: { directory }, engine, approvalPath, forbiddenValues: () => secrets, fetchImpl: async (url, init) => { calls.push({ url, init }); const request = JSON.parse(init.body); const value = request.text.format.name === 'migration_connection_test' ? { message: transport.testReply } : request.input.includes('migration-screen-chat-v1') ? chatResponse : response; if (transport.changeRevision) state.revision++; if (transport.beforeRespond) await transport.beforeRespond(); return { ok: transport.status === 200, status: transport.status, text: async () => JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }) }; } });
  await ai.configure({ provider: 'openai-api', apiKey: 'synthetic-session-key-not-real', model: 'synthetic-model' });
  if (verify) { assert.equal((await ai.testConnection()).connectionTest.status, 'passed'); calls.length = 0; }
  return { ai, engine, directory, state, calls, jobs, secrets, response, chatResponse, transport, approval, approvalPath, ledger: () => ledger };
}

test('approval binds service, workspace, policy, expiry and mode', () => {
  const approval = { policy: AI_POLICY, workspaceId: 'test', service: 'codex', reference: 'ref', processingLocation: 'test', retention: 'test', expiresAt: '2099-01-01', modes: ['restricted'], scopes: ['names'] };
  const scope = { provider: 'codex', workspaceId: 'test', mode: 'restricted' };
  assert.equal(checkApproval(approval, scope).valid, true);
  for (const override of [{ provider: 'openai-api' }, { workspaceId: 'other' }, { mode: 'expanded' }, { now: Date.parse('2100-01-01') }]) assert.equal(checkApproval(approval, { ...scope, ...override }).valid, false);
});

test('no institutional approval means zero workspace model calls, even after synthetic connection verification', async t => {
  const { ai, calls } = await fixture(t, { approved: false });
  const preview = await ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions'] });
  await assert.rejects(ai.ask({ previewId: preview.previewId, question: '용어를 추천해 주세요.' }), { code: 'INSTITUTION_APPROVAL_REQUIRED' });
  assert.equal(calls.length, 0); assert.equal((await ai.status()).inferenceAvailable, false);
});

test('AI transmits projected fields only and applies exact selected draft changes', async t => {
  const f = await fixture(t), preview = await f.ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions', 'profile'] });
  f.ledger().entries[0].note = '사람이 기록한 업무 근거';
  assert.ok(preview.excluded.length);
  const proposal = await f.ai.ask({ previewId: preview.previewId, question: '이름 용어를 검토해 주세요.' });
  const request = JSON.parse(f.calls[0].init.body);
  assert.deepEqual(request.tools, []); assert.equal(request.store, false);
  assert.ok(!request.input.includes('DO_NOT_SEND')); assert.ok(!request.input.includes('synthetic-session-key'));
  await assert.rejects(f.ai.apply({ proposalId: proposal.proposalId, revision: 1, changes: [{ ...proposal.changes[0], engAbbr: 'OTHER' }] }), { code: 'AI_STALE_PROPOSAL' });
  await f.ai.apply({ proposalId: proposal.proposalId, revision: 1, changes: proposal.changes });
  assert.equal(f.ledger().entries[0].term.engAbbr, 'USER_NM'); assert.equal(f.ledger().entries[0].status, 'PROPOSED');
  assert.ok(f.ledger().entries[0].note.startsWith('사람이 기록한 업무 근거\nAI 제안(미확정):'));
});

test('stale previews, changed approvals and secrets cannot reach the provider', async t => {
  const f = await fixture(t); let p = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  for (const question of ['password=synthetic', 'host 192.0.2.2', 'synthetic-db-private-value', 'synthetic-session-key-not-real']) await assert.rejects(f.ai.ask({ previewId: p.previewId, question }), { code: 'AI_SENSITIVE_CONTEXT' });
  f.state.revision++; await assert.rejects(f.ai.ask({ previewId: p.previewId, question: '진행하세요.' }), { code: 'AI_STALE_CONTEXT' });
  p = await f.ai.preview({ mode: 'restricted', artifactIds: [] }); await writeFile(f.approvalPath, JSON.stringify({ ...f.approval, reference: 'changed' }));
  await assert.rejects(f.ai.ask({ previewId: p.previewId, question: '진행하세요.' }), { code: 'AI_STALE_CONTEXT' }); assert.equal(f.calls.length, 0);
});

test('read plan can execute only approved operations and can be revoked', async t => {
  const f = await fixture(t); f.response.nextOperation = 'app-scan'; f.response.changes = [];
  await assert.rejects(f.ai.approveReadPlan({ revision: 1, operations: ['commit'] }), { code: 'AI_OPERATION_DENIED' });
  await f.ai.approveReadPlan({ revision: 1, operations: ['app-scan'] });
  let p = await f.ai.preview({ mode: 'restricted', artifactIds: [] }); await f.ai.ask({ previewId: p.previewId, question: '읽기 분석을 도와주세요.' }); assert.equal(f.jobs.length, 1);
  await f.ai.approveReadPlan({ revision: 1, operations: [] }); p = await f.ai.preview({ mode: 'restricted', artifactIds: [] }); await f.ai.ask({ previewId: p.previewId, question: '읽기 분석을 도와주세요.' }); assert.equal(f.jobs.length, 1);
  f.response.nextOperation = 'commit'; await assert.rejects(f.ai.ask({ previewId: p.previewId, question: '검토하세요.' }), { code: 'AI_RESPONSE_INVALID' });
});

test('AI cannot change a confirmed ledger or invent standards', async t => {
  const f = await fixture(t); f.ledger().entries[0].status = 'CONFIRMED';
  const p = await f.ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions'] }); const proposal = await f.ai.ask({ previewId: p.previewId, question: '검토하세요.' });
  await assert.rejects(f.ai.apply({ proposalId: proposal.proposalId, revision: 1, changes: proposal.changes }), { code: 'AI_DRAFT_ONLY' });
  f.response.changes[0].engAbbr = 'INVENTED'; await assert.rejects(f.ai.ask({ previewId: p.previewId, question: '검토하세요.' }), { code: 'AI_RESPONSE_INVALID' });
});

test('AI locks the whole request before asynchronous preflight and rejects configuration races', async t => {
  const f = await fixture(t), p = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  f.response.changes = [];
  const original = f.engine.state;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  f.engine.state = async () => { await gate; return original(); };
  const pending = f.ai.ask({ previewId: p.previewId, question: '안내해 주세요.' });
  await assert.rejects(f.ai.ask({ previewId: p.previewId, question: '중복 질문' }), { code: 'AI_BUSY' });
  await assert.rejects(f.ai.configure({ provider: 'codex' }), { code: 'AI_BUSY' });
  release(); await pending;
  assert.equal(f.calls.length, 1);
});

test('expanded excerpts require scanner evidence and exclude credentials and unscanned files', async t => {
  const f = await fixture(t);
  f.state.inputs.sourceRoot = f.directory;
  await mkdir(path.join(f.directory, '.aws'));
  await writeFile(path.join(f.directory, '.aws', 'credentials'), 'aws_secret_access_key = synthetic');
  await writeFile(path.join(f.directory, 'Query.sql'), 'select name from person');
  const original = f.engine.getArtifact;
  f.engine.getArtifact = async kind => kind === 'appUsage' ? { content: JSON.stringify({ payload: { columns: [{ usages: [{ path: 'Query.sql', line: 1 }] }] } }) } : original(kind);
  const excerpt = file => f.ai.preview({ mode: 'expanded', excerpts: [{ path: file, startLine: 1, lineCount: 1 }] });
  await assert.rejects(excerpt('.aws/credentials'), { code: 'AI_EXCERPT_INVALID' });
  await assert.rejects(excerpt('Unscanned.sql'), { code: 'AI_EXCERPT_NOT_SCANNED' });
  let preview = await excerpt('Query.sql');
  assert.equal(preview.context.excerpts[0].text, 'select name from person');
  assert.ok(!JSON.stringify(preview.context).includes('Query.sql'));
  await writeFile(path.join(f.directory, 'Query.sql'), 'aws_secret_access_key = synthetic');
  preview = await excerpt('Query.sql');
  assert.equal(preview.context.excerpts.length, 0);
  assert.equal(preview.excluded[0].reason, 'LITERAL_OR_SENSITIVE_EXCERPT_WITHHELD');
  assert.equal(f.calls.length, 0);
});

test('API credentials are unverified until a fixed synthetic response succeeds; no workspace context is sent', async t => {
  const f = await fixture(t, { approved: false, verify: false });
  let status = await f.ai.status();
  assert.equal(status.authenticated, false); assert.equal(status.testAvailable, true); assert.equal(status.inferenceAvailable, false);
  status = await f.ai.testConnection();
  assert.equal(status.authenticated, true); assert.equal(status.connectionTest.status, 'passed');
  assert.equal(status.inferenceAvailable, false); assert.equal(status.approval.valid, false);
  const request = JSON.parse(f.calls[0].init.body);
  assert.equal(request.input, CONNECTION_TEST_PROMPT); assert.deepEqual(request.tools, []); assert.equal(request.max_output_tokens, 64);
  assert.ok(!request.input.includes('legacy.person'));
  status = await f.ai.logout();
  assert.equal(status.authenticated, false); assert.equal(status.testAvailable, false); assert.equal(status.connectionTest.status, 'idle');
});

test('failed credentials, unusable models and malformed test answers never become connected', async t => {
  const f = await fixture(t, { verify: false });
  for (const status of [401, 429, 403]) {
    f.transport.status = status;
    const result = await f.ai.testConnection();
    assert.equal(result.authenticated, false); assert.equal(result.connectionTest.status, 'failed'); assert.equal(result.inferenceAvailable, false);
  }
  f.transport.status = 200; f.transport.testReply = 'wrong';
  assert.equal((await f.ai.testConnection()).connectionTest.code, 'AI_TEST_RESPONSE_INVALID');
});

test('official OAuth login and cancel are independent from inference isolation and institution approval', async t => {
  const f = await fixture(t, { approved: false, verify: false });
  let account = { authenticated: false, loginState: 'idle' }, probes = 0, requests = 0;
  const client = {
    status: async () => account,
    login: async () => { account = { authenticated: false, loginState: 'pending' }; return { loginUrl: 'https://auth.openai.com/authorize?synthetic=true' }; },
    cancelLogin: async () => { account = { authenticated: false, loginState: 'cancelled' }; },
    logout: async () => { account = { authenticated: false, loginState: 'idle' }; },
    complete: async () => { requests++; return { message: 'MIGRATION_CONNECTION_OK' }; }, close: async () => {},
  };
  const ai = await createAi({ store: { directory: f.directory }, engine: f.engine, codexPath: 'synthetic-native-client', codexOpen: async () => client, isolationProbe: async () => { probes++; return { qualified: false, code: 'CODEX_LOCAL_CONTEXT_PRESENT' }; } });
  const pending = await ai.login(); assert.equal(pending.status.login.state, 'pending'); assert.equal(probes, 0);
  assert.equal((await ai.cancelLogin()).login.state, 'cancelled');
  await ai.login(); account = { authenticated: true, loginState: 'complete' };
  const result = await ai.testConnection();
  assert.equal(result.authenticated, true); assert.equal(result.connectionTest.code, 'CODEX_LOCAL_CONTEXT_PRESENT');
  assert.equal(probes, 1); assert.equal(requests, 0); assert.equal(result.inferenceAvailable, false);
  assert.equal((await ai.logout()).authenticated, false);
});

test('official client is recreated after disconnect and an in-flight startup is closed on shutdown', async t => {
  const f = await fixture(t, { approved: false, verify: false });
  let opened = 0, stopped = 0;
  const clients = [];
  const ai = await createAi({ store: { directory: f.directory }, engine: f.engine, codexPath: 'synthetic-native-client', codexOpen: async () => {
    opened++;
    const client = { closed: false, status: async () => ({ authenticated: false }), close: async () => { client.closed = true; stopped++; } };
    clients.push(client); return client;
  } });
  await ai.status(); clients[0].closed = true; await ai.status();
  assert.equal(opened, 2); await ai.close(); assert.equal(stopped, 1);
  let release, started;
  const pending = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { started = resolve; });
  const delayed = await createAi({ store: { directory: f.directory }, engine: f.engine, codexPath: 'synthetic-native-client', codexOpen: () => { started(); return pending; } });
  const reading = delayed.status(); await ready;
  const shutdown = delayed.close(); release({ close: async () => { stopped++; } });
  await Promise.all([reading, shutdown]); assert.equal(stopped, 2);
});

const chatInput = { revision: 1, message: '이관 절차의 전체 흐름을 설명해 주세요.', screen: 'start', filledFields: [] };

test('screen chat works without institutional artifacts and preserves bounded follow-up context', async t => {
  const f = await fixture(t, { approved: false });
  f.state.profiles.source = { host: 'private-host', username: 'private-user', database: 'private-database', schema: 'private-schema' };
  f.state.inputs.sourceRoot = 'D:/private-source';
  f.engine.getArtifact = () => { throw new Error('Chat must not read artifacts'); };
  const status = await f.ai.status(); assert.equal(status.chatAvailable, true); assert.equal(status.inferenceAvailable, false);
  const first = await f.ai.chat(chatInput);
  const second = await f.ai.chat({ ...chatInput, conversationId: first.conversationId, message: '그 단계 전에 무엇을 확인하면 좋을까요?', screen: 'connect', filledFields: ['source-vendor'] });
  assert.equal(first.conversationId, second.conversationId); assert.equal(f.jobs.length, 0);
  const wire = JSON.parse(f.calls[1].init.body), prompt = JSON.parse(wire.input);
  assert.equal(prompt.history.length, 2); assert.equal(prompt.history[0].message, chatInput.message);
  assert.deepEqual(prompt.filledFields, ['source-vendor']); assert.deepEqual(wire.tools, []);
  for (const privateValue of ['private-host', 'private-user', 'private-database', 'private-schema', 'D:/private-source', 'legacy.person', 'DO_NOT_SEND']) assert.ok(!wire.input.includes(privateValue));
  f.ai.resetChat();
  await assert.rejects(f.ai.chat({ ...chatInput, conversationId: first.conversationId }), { code: 'AI_CHAT_EXPIRED' });
});

test('screen chat rejects raw credentials, local-setting messages, unknown fields and unverified models before transmission', async t => {
  const f = await fixture(t, { verify: false });
  await assert.rejects(f.ai.chat(chatInput), { code: 'AI_LOGIN_REQUIRED' });
  await f.ai.testConnection(); f.calls.length = 0;
  for (const message of ['password=synthetic', '원천 호스트는 internal-host', '계정은 private-reader', '소스 경로 D:/synthetic', '연락처 010-1234-5678', 'synthetic-db-private-value']) {
    await assert.rejects(f.ai.chat({ ...chatInput, message }), error => ['AI_SENSITIVE_CONTEXT', 'AI_CHAT_LOCAL_INPUT'].includes(error.code));
  }
  await assert.rejects(f.ai.chat({ ...chatInput, screen: 'admin' }), { code: 'AI_CHAT_INVALID' });
  await assert.rejects(f.ai.chat({ ...chatInput, filledFields: ['commit-confirm-name'] }), { code: 'AI_CHAT_INVALID' });
  assert.equal(f.calls.length, 0);
});

test('model chat can only propose supported enum drafts and cannot bypass stale input or execute jobs', async t => {
  const f = await fixture(t);
  for (const patches of [[{ fieldId: 'source-password', value: 'invented' }], [{ fieldId: 'commit-confirm-name', value: 'COMMIT' }], [{ fieldId: 'source-vendor', value: 'unsupported' }]]) {
    f.chatResponse.patches = patches;
    await assert.rejects(f.ai.chat(chatInput), error => ['AI_RESPONSE_INVALID', 'CHAT_INVALID_VALUE'].includes(error.code));
  }
  f.chatResponse.patches = [{ fieldId: 'source-vendor', value: 'oracle' }];
  assert.deepEqual((await f.ai.chat(chatInput)).patches, f.chatResponse.patches);
  assert.equal(f.state.revision, 1); assert.equal(f.jobs.length, 0);
  f.transport.changeRevision = true;
  await assert.rejects(f.ai.chat(chatInput), { code: 'AI_STALE_CONTEXT' });
});

test('pasted source, SQL, structured rows and stack traces never use ordinary chat or question-only scope', async t => {
  const f = await fixture(t), preview = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  for (const message of ['SELECT USER_NM FROM TB_SYNTHETIC_USER;', 'public class SyntheticCustomer {}', '<mapper namespace="synthetic">내용</mapper>', '{"syntheticRow":{"name":"sample"}}', 'ID,NAME\n1,SYNTHETIC', '오류:\n at synthetic.Service.run(Service.java:12)', '```sql\nselect synthetic\n```']) {
    await assert.rejects(f.ai.chat({ ...chatInput, message }), error => ['AI_CHAT_LOCAL_INPUT', 'AI_SENSITIVE_CONTEXT'].includes(error.code));
    await assert.rejects(f.ai.ask({ previewId: preview.previewId, question: message }), { code: 'AI_SENSITIVE_CONTEXT' });
  }
  assert.equal(f.calls.length, 0);
});

test('secret checks preserve short credentials and case variants in both AI request paths', async t => {
  const f = await fixture(t), preview = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  const escapedSecret = 'Synthetic\\"Value';
  f.secrets.push('Q7', escapedSecret); f.state.profiles.source = { host: 'PrivateSyntheticHost', username: 'PrivateSyntheticUser' };
  for (const message of ['이 항목 q7은 무엇인가요?', 'PRIVATESYNTHETICHOST 의미가 궁금합니다.', 'PRIVATESYNTHETICUSER 의미가 궁금합니다.', `이 항목 ${escapedSecret} 의미가 궁금합니다.`]) {
    await assert.rejects(f.ai.chat({ ...chatInput, message }), { code: 'AI_SENSITIVE_CONTEXT' });
    await assert.rejects(f.ai.ask({ previewId: preview.previewId, question: message }), { code: 'AI_SENSITIVE_CONTEXT' });
  }
  assert.equal(f.calls.length, 0);
});

test('conversation history is rechecked when a previously ordinary term becomes a private profile value', async t => {
  const f = await fixture(t, { approved: false });
  const first = await f.ai.chat({ ...chatInput, message: 'SyntheticAlias 의미가 궁금합니다.' });
  f.state.profiles.source = { host: 'syntheticalias' }; f.state.revision++;
  await assert.rejects(f.ai.chat({ ...chatInput, revision: 2, conversationId: first.conversationId }), { code: 'AI_CHAT_EXPIRED' });
  assert.equal(f.calls.length, 1);
});

test('read execution uses the same approved plan that existed when the model request started', async t => {
  const f = await fixture(t); f.response.nextOperation = 'app-scan'; f.response.changes = [];
  const preview = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  f.transport.beforeRespond = () => f.ai.approveReadPlan({ revision: 1, operations: ['app-scan'] });
  await f.ai.ask({ previewId: preview.previewId, question: '다음 읽기 단계를 안내해 주세요.' });
  assert.equal(f.jobs.length, 0);
  f.transport.beforeRespond = undefined;
  await f.ai.ask({ previewId: preview.previewId, question: '허용한 읽기 단계를 안내해 주세요.' });
  assert.equal(f.jobs.length, 1);
});
