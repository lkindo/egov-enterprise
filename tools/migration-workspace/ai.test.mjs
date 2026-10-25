import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createAi, checkApproval, AI_POLICY, CONNECTION_TEST_PROMPT, AI_PROFILE_ROW_LIMIT_MAX, AI_TRANSMISSION_LOG_MAX } from './ai.mjs';
import { openWorkspace } from './store.mjs';

async function fixture(t, { approved = true, verify = true } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'migration-ai-test-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const workspaceId = createHash('sha256').update(directory).digest('hex').slice(0, 24), approvalPath = path.join(directory, 'approval.json');
  const approval = { policy: AI_POLICY, workspaceId, service: 'openai-api', reference: 'synthetic-local-test', processingLocation: 'test', retention: 'test', expiresAt: '2099-01-01T00:00:00Z', modes: ['restricted', 'expanded'], scopes: ['names', 'candidates', 'diagnostics', 'excerpts'] };
  if (approved) await writeFile(approvalPath, JSON.stringify(approval));
  const state = { revision: 1, inputRevision: 1, profiles: {}, inputs: {}, jobs: [], activeJobId: null, ai: {} };
  let ledger = { schemaVersion: 2, entries: [{ id: 'column-1', source: { table: 'legacy.person', column: 'name' }, status: 'PROPOSED' }] };
  const calls = [], jobs = [], secrets = ['synthetic-db-private-value'];
  // store.update 와 같은 판 검사·판 증가만 흉내 낸다. 실제 색인 검증은 별도 시험이 실제 store 로 본다.
  const store = { directory, failWith: undefined, update: async (revision, updater) => {
    if (store.failWith) throw Object.assign(new Error(store.failWith), { code: store.failWith });
    if (revision !== state.revision) throw Object.assign(new Error('WORKSPACE_REVISION_CONFLICT'), { code: 'WORKSPACE_REVISION_CONFLICT' });
    const draft = structuredClone(state); updater(draft); Object.assign(state, draft, { revision: state.revision + 1 }); return structuredClone(state);
  } };
  const response = { message: '사용처와 표준 후보를 비교하세요.', question: '이름은 개인 성명을 뜻하나요?', nextOperation: '', changes: [{ entryId: 'column-1', engAbbr: 'USER_NM', rationale: '사람 이름에 쓰이는 후보입니다.' }] };
  const chatResponse = { message: 'DB 연결 준비 화면에서 원천 DB를 설정한 뒤 구조 조사를 진행하세요.', question: '먼저 원천 DB 종류를 선택하시겠어요?', route: 'connect', focusField: 'source-vendor', patches: [] };
  const engine = { state: async () => structuredClone(state), getArtifact: async kind => ({ content: JSON.stringify(kind === 'ledger' ? ledger : { payload: { columns: [{ table: 'legacy.person', column: 'name', candidates: [{ termName: '사용자명', engAbbr: 'USER_NM', domain: '문자열' }], sampleValues: ['DO_NOT_SEND'] }] } }) }), saveLedger: async value => { ledger = value; state.revision++; return state; }, startJob: async value => { jobs.push(value); return { id: 'synthetic', status: 'running' }; } };
  const transport = { status: 200, testReply: 'MIGRATION_CONNECTION_OK' };
  const ai = await createAi({ store, engine, approvalPath, forbiddenValues: () => secrets, fetchImpl: async (url, init) => { calls.push({ url, init }); const request = JSON.parse(init.body); const value = request.text.format.name === 'migration_connection_test' ? { message: transport.testReply } : request.input.includes('migration-screen-chat-v1') ? chatResponse : response; if (transport.changeRevision) state.revision++; if (transport.beforeRespond) await transport.beforeRespond(); return { ok: transport.status === 200, status: transport.status, text: async () => JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }) }; } });
  await ai.configure({ provider: 'openai-api', apiKey: 'synthetic-session-key-not-real', model: 'synthetic-model' });
  if (verify) { assert.equal((await ai.testConnection()).connectionTest.status, 'passed'); calls.length = 0; }
  return { ai, engine, store, directory, state, calls, jobs, secrets, response, chatResponse, transport, approval, approvalPath, ledger: () => ledger };
}
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('approval binds service, workspace, policy, expiry and mode', () => {
  const approval = { policy: AI_POLICY, workspaceId: 'test', service: 'codex', reference: 'ref', processingLocation: 'test', retention: 'test', expiresAt: '2099-01-01', modes: ['restricted'], scopes: ['names'] };
  const scope = { provider: 'codex', workspaceId: 'test', mode: 'restricted' };
  assert.equal(checkApproval(approval, scope).valid, true);
  for (const override of [{ provider: 'openai-api' }, { workspaceId: 'other' }, { mode: 'expanded' }, { now: Date.parse('2100-01-01') }]) assert.equal(checkApproval(approval, { ...scope, ...override }).valid, false);
  // 승인 식별자는 전송 기록에 그대로 남으므로 짧은 한 줄 식별자만 받는다.
  for (const reference of ['x'.repeat(201), 'ref\nnext', 'ref\u0000']) assert.equal(checkApproval({ ...approval, reference }, scope).valid, false);
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
  // 전송 기록이 작업공간 판을 하나 올린다. 제안은 기록 뒤의 판에 묶인다.
  assert.equal(proposal.revision, 2); assert.equal(f.state.revision, 2);
  await assert.rejects(f.ai.apply({ proposalId: proposal.proposalId, revision: proposal.revision, changes: [{ ...proposal.changes[0], engAbbr: 'OTHER' }] }), { code: 'AI_STALE_PROPOSAL' });
  await assert.rejects(f.ai.apply({ proposalId: proposal.proposalId, revision: 1, changes: proposal.changes }), { code: 'AI_STALE_PROPOSAL' });
  await f.ai.apply({ proposalId: proposal.proposalId, revision: proposal.revision, changes: proposal.changes });
  assert.equal(f.ledger().entries[0].term.engAbbr, 'USER_NM'); assert.equal(f.ledger().entries[0].status, 'PROPOSED');
  const [record] = f.state.ai.transmissions;
  assert.equal(f.ledger().entries[0].note, `사람이 기록한 업무 근거\nAI 제안(미확정, 전송 기록 ${record.id}, 문맥 SHA-256 ${record.contextSha256}): ${f.response.changes[0].rationale}`);
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
  assert.deepEqual(f.jobs[0], { revision: 2, requestId: f.jobs[0].requestId, operation: 'app-scan', options: {} });
  await f.ai.approveReadPlan({ revision: f.state.revision, operations: [] }); p = await f.ai.preview({ mode: 'restricted', artifactIds: [] }); await f.ai.ask({ previewId: p.previewId, question: '읽기 분석을 도와주세요.' }); assert.equal(f.jobs.length, 1);
  p = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  f.response.nextOperation = 'commit'; await assert.rejects(f.ai.ask({ previewId: p.previewId, question: '검토하세요.' }), { code: 'AI_RESPONSE_INVALID' });
});

test('an AI-started profile is bounded by the row limit the user bound to the read plan', async t => {
  const f = await fixture(t); f.response.nextOperation = 'profile'; f.response.changes = [];
  for (const profileRowLimit of [undefined, 0, -1, 1.5, '5000', AI_PROFILE_ROW_LIMIT_MAX + 1]) await assert.rejects(f.ai.approveReadPlan({ revision: 1, operations: ['profile'], profileRowLimit }), { code: 'AI_PROFILE_ROW_LIMIT_REQUIRED' });
  await assert.rejects(f.ai.approveReadPlan({ revision: 1, operations: ['app-scan'], profileRowLimit: 5000 }), { code: 'AI_READ_PLAN_INVALID' });
  assert.equal((await f.ai.status()).readPlan, null);
  const plan = await f.ai.approveReadPlan({ revision: 1, operations: ['profile', 'app-scan'], profileRowLimit: 5000 });
  assert.equal(plan.profileRowLimit, 5000); assert.equal((await f.ai.status()).readPlan.profileRowLimit, 5000);
  const p = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  await f.ai.ask({ previewId: p.previewId, question: '표본 범위를 정해 품질을 확인해 주세요.' });
  assert.equal(f.jobs.length, 1); assert.equal(f.jobs[0].operation, 'profile'); assert.deepEqual(f.jobs[0].options, { rowLimit: 5000 });
});

test('AI cannot change a confirmed ledger or invent standards', async t => {
  const f = await fixture(t); f.ledger().entries[0].status = 'CONFIRMED';
  let p = await f.ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions'] }); const proposal = await f.ai.ask({ previewId: p.previewId, question: '검토하세요.' });
  await assert.rejects(f.ai.apply({ proposalId: proposal.proposalId, revision: proposal.revision, changes: proposal.changes }), { code: 'AI_DRAFT_ONLY' });
  p = await f.ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions'] });
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
  const probeArgs = [], opened = [];
  const ai = await createAi({ store: { directory: f.directory }, engine: f.engine, codexPath: 'synthetic-native-client', codexOpen: async options => { opened.push(options); return client; }, isolationProbe: async (...args) => { probes++; probeArgs.push(args); return { qualified: false, code: 'CODEX_LOCAL_CONTEXT_PRESENT' }; } });
  const pending = await ai.login(); assert.equal(pending.status.login.state, 'pending'); assert.equal(probes, 0);
  assert.equal((await ai.cancelLogin()).login.state, 'cancelled');
  await ai.login(); account = { authenticated: true, loginState: 'complete' };
  const result = await ai.testConnection();
  assert.equal(result.authenticated, true); assert.equal(result.connectionTest.code, 'CODEX_LOCAL_CONTEXT_PRESENT');
  assert.equal(probes, 1); assert.equal(requests, 0); assert.equal(result.inferenceAvailable, false);
  // 합성 검사는 실제 세션이 여는 바로 그 홈의 조건도 검사하도록 그 경로를 받는다.
  assert.equal(probeArgs[0][0], 'synthetic-native-client');
  assert.deepEqual(probeArgs[0][2], { home: opened[0].directory });
  assert.equal(opened[0].directory, path.join(f.directory, 'official-codex-client'));
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
  let preview = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  f.transport.beforeRespond = () => f.ai.approveReadPlan({ revision: f.state.revision, operations: ['app-scan'] });
  await f.ai.ask({ previewId: preview.previewId, question: '다음 읽기 단계를 안내해 주세요.' });
  assert.equal(f.jobs.length, 0);
  f.transport.beforeRespond = undefined;
  preview = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  await f.ai.ask({ previewId: preview.previewId, question: '허용한 읽기 단계를 안내해 주세요.' });
  assert.equal(f.jobs.length, 1);
});

test('each institutional transmission is recorded before sending, without secrets, with the exact context digest', async t => {
  const f = await fixture(t);
  f.state.profiles.source = { host: 'private-host.example', username: 'private-reader', database: 'PRIVATE_DB', schema: 'private_schema', driverJar: 'D:/private/driver.jar' };
  f.state.inputs.sourceRoot = 'D:/private-source';
  // 들여쓴 승인 파일: 기록은 다시 직렬화한 값이 아니라 파일 바이트의 digest 여야 한다.
  await writeFile(f.approvalPath, JSON.stringify(f.approval, null, 2));
  const preview = await f.ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions'] });
  assert.equal(preview.contextSha256, sha256(JSON.stringify(preview.context)));
  let recordedBeforeSend;
  f.transport.beforeRespond = () => { recordedBeforeSend = structuredClone(f.state.ai.transmissions); };
  const question = '이름 용어의 업무 의미를 검토해 주세요.';
  const proposal = await f.ai.ask({ previewId: preview.previewId, question });
  assert.equal(recordedBeforeSend?.length, 1);
  const [record] = f.state.ai.transmissions;
  assert.deepEqual(Object.keys(record).sort(), ['approvalReference', 'approvalSha256', 'contextSha256', 'counts', 'id', 'mode', 'model', 'policy', 'provider', 'sentAt'].sort());
  assert.deepEqual({ ...record, id: undefined, sentAt: undefined }, { id: undefined, sentAt: undefined, policy: AI_POLICY, provider: 'openai-api', model: 'synthetic-model', mode: 'restricted', approvalReference: f.approval.reference, approvalSha256: sha256(await readFile(f.approvalPath)), contextSha256: preview.contextSha256, counts: { names: preview.context.names.length, candidates: preview.context.candidates.length, diagnostics: 0, excerpts: 0 } });
  assert.ok(Number.isFinite(Date.parse(record.sentAt)));
  // 기록의 digest 는 실제로 보낸 프롬프트 속 문맥 직렬화와 같은 바이트다.
  const wire = JSON.parse(f.calls[0].init.body), sent = JSON.parse(wire.input);
  assert.equal(sha256(JSON.stringify(sent.context)), record.contextSha256);
  assert.ok(wire.input.includes(JSON.stringify(preview.context)));
  const serialized = JSON.stringify(f.state.ai);
  for (const value of [question, 'private-host.example', 'private-reader', 'PRIVATE_DB', 'private_schema', 'D:/private', 'synthetic-session-key-not-real', 'synthetic-db-private-value', f.directory, f.approvalPath, 'legacy.person', 'jdbc:']) assert.ok(!serialized.includes(value), value);
  assert.deepEqual(proposal.transmission, { id: record.id, contextSha256: record.contextSha256 });
});

test('no record means no transmission: write failures, conflicts, active jobs and a full log send nothing', async t => {
  const f = await fixture(t);
  const ask = async () => f.ai.ask({ previewId: (await f.ai.preview({ mode: 'restricted', artifactIds: [] })).previewId, question: '진행 순서를 알려 주세요.' });
  f.store.failWith = 'WORKSPACE_READ_ONLY'; await assert.rejects(ask(), { code: 'AI_TRANSMISSION_RECORD_FAILED' });
  f.store.failWith = 'WORKSPACE_SENSITIVE_DATA'; await assert.rejects(ask(), { code: 'AI_TRANSMISSION_RECORD_FAILED' });
  f.store.failWith = 'WORKSPACE_REVISION_CONFLICT'; await assert.rejects(ask(), { code: 'AI_STALE_CONTEXT' });
  f.store.failWith = undefined;
  f.state.activeJobId = 'synthetic-running-job'; await assert.rejects(ask(), { code: 'AI_JOB_ACTIVE' });
  // 판을 읽은 뒤 작업이 시작돼도 기록 단계가 같은 판에서 다시 막는다.
  const preview = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  f.state.activeJobId = null;
  const original = f.store.update;
  f.store.update = (revision, updater) => original(revision, draft => { draft.activeJobId = 'synthetic-started-job'; updater(draft); });
  await assert.rejects(f.ai.ask({ previewId: preview.previewId, question: '진행 순서를 알려 주세요.' }), { code: 'AI_JOB_ACTIVE' });
  f.store.update = original;
  f.state.ai = { transmissions: Array.from({ length: AI_TRANSMISSION_LOG_MAX }, (_, index) => ({ id: `synthetic-${index}` })) };
  await assert.rejects(ask(), { code: 'AI_TRANSMISSION_LOG_FULL' });
  assert.equal(f.calls.length, 0); assert.equal(f.state.ai.transmissions.length, AI_TRANSMISSION_LOG_MAX);
});

test('a checked preview is consumed by one transmission and cannot be resent with another question', async t => {
  const f = await fixture(t), preview = await f.ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions'] });
  await f.ai.ask({ previewId: preview.previewId, question: '첫 질문입니다.' });
  await assert.rejects(f.ai.ask({ previewId: preview.previewId, question: '다른 질문입니다.' }), { code: 'AI_STALE_CONTEXT' });
  assert.equal(f.calls.length, 1); assert.equal(f.state.ai.transmissions.length, 1);
});

test('screen chat and the fixed connection test carry no institutional data and leave no transmission record', async t => {
  const f = await fixture(t, { verify: false });
  await f.ai.testConnection();
  await f.ai.chat(chatInput);
  assert.equal(f.calls.length, 2); assert.equal(f.state.revision, 1); assert.deepEqual(f.state.ai, {});
});

test('the real workspace index accepts the transmission record', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'migration-ai-store-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await openWorkspace({ directory }); t.after(() => store.close());
  const workspaceId = createHash('sha256').update(store.directory).digest('hex').slice(0, 24), approvalPath = path.join(directory, 'approval.json');
  await writeFile(approvalPath, JSON.stringify({ policy: AI_POLICY, workspaceId, service: 'openai-api', reference: 'synthetic-local-test', processingLocation: 'test', retention: 'test', expiresAt: '2099-01-01T00:00:00Z', modes: ['restricted'], scopes: ['names', 'candidates'] }));
  const ledger = { schemaVersion: 2, entries: [{ id: 'column-1', source: { table: 'legacy.person', column: 'name' }, status: 'PROPOSED' }] };
  const engine = { state: () => store.read(), getArtifact: async kind => ({ content: JSON.stringify(kind === 'ledger' ? ledger : { payload: { columns: [{ table: 'legacy.person', column: 'name', candidates: [{ termName: '사용자명', engAbbr: 'USER_NM', domain: '문자열' }] }] } }) }), startJob: async () => assert.fail('no job') };
  const reply = value => ({ ok: true, status: 200, text: async () => JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }) });
  const ai = await createAi({ store, engine, approvalPath, fetchImpl: async (url, init) => reply(JSON.parse(init.body).text.format.name === 'migration_connection_test' ? { message: 'MIGRATION_CONNECTION_OK' } : { message: '확인했습니다.', question: '', nextOperation: '', changes: [] }) });
  t.after(() => ai.close());
  await ai.configure({ provider: 'openai-api', apiKey: 'synthetic-session-key-not-real', model: 'synthetic-model' });
  await ai.testConnection();
  const preview = await ai.preview({ mode: 'restricted', artifactIds: ['ledger', 'suggestions'] });
  const proposal = await ai.ask({ previewId: preview.previewId, question: '이름 용어를 검토해 주세요.' });
  const saved = await store.read();
  assert.equal(saved.ai.transmissions.length, 1); assert.equal(saved.ai.transmissions[0].contextSha256, preview.contextSha256);
  assert.equal(proposal.revision, saved.revision);
});

test('evidence questions get the screen-chat checks for profile names, source roots, UNC and Unix paths and server names', async t => {
  const f = await fixture(t);
  f.state.profiles.source = { host: 'legacy-db', username: 'legacy-reader', database: 'LEGACY_HR', schema: 'HR_ARCHIVE', instance: 'HRINST', driverJar: 'E:/drivers/legacy-jdbc.jar' };
  f.state.inputs.sourceRoot = '\\\\fs01\\legacy\\hr';
  const preview = await f.ai.preview({ mode: 'restricted', artifactIds: [] });
  for (const question of ['LEGACY_HR 의 \\\\fs01\\legacy\\hr 소스 기준으로 REG_ID 의미는?', 'legacy_hr 기준으로 REG_ID 의미는?', 'HR_ARCHIVE 표의 REG_ID 의미는?', 'HRINST 인스턴스의 의미는?', 'E:/drivers/legacy-jdbc.jar 버전은?', '\\\\fs02\\share\\app 소스 기준 의미는?', '/srv/legacy/hr 소스 기준 의미는?', 'hr.example.internal 서버의 컬럼 의미는?', '호스트=사내서버 의 의미는?']) {
    await assert.rejects(f.ai.ask({ previewId: preview.previewId, question }), { code: 'AI_SENSITIVE_CONTEXT' }, question);
  }
  assert.equal(f.calls.length, 0); assert.equal(f.state.ai.transmissions, undefined);
  // 문맥 기준은 그대로다: 스키마가 붙은 표 이름은 문맥으로 보낼 수 있다.
  f.engine.getArtifact = async () => ({ content: JSON.stringify({ payload: { columns: [{ table: 'hr_archive.person', column: 'reg_id', candidates: [] }] } }) });
  const scoped = await f.ai.preview({ mode: 'restricted', artifactIds: ['suggestions'] });
  assert.deepEqual(scoped.context.names, [{ table: 'hr_archive.person', column: 'reg_id' }]);
  f.response.changes = [];
  await f.ai.ask({ previewId: scoped.previewId, question: 'REG_ID 는 등록자를 뜻하나요?' });
  assert.equal(f.calls.length, 1);
});

test('UNC and Unix paths in names and excerpts are withheld like drive paths', async t => {
  const f = await fixture(t);
  f.engine.getArtifact = async kind => kind === 'appUsage' ? { content: JSON.stringify({ payload: { columns: [{ usages: [{ path: 'Query.sql', line: 1 }] }] } }) } : { content: JSON.stringify({ payload: { columns: [{ table: '\\\\fs01\\share\\person', column: 'name', candidates: [] }, { table: 'person', column: 'name', candidates: [] }] } }) };
  const names = await f.ai.preview({ mode: 'restricted', artifactIds: ['suggestions'] });
  assert.deepEqual(names.context.names, [{ table: 'person', column: 'name' }]); assert.deepEqual(names.excluded, [{ reason: 'SENSITIVE_NAME_WITHHELD' }]);
  f.state.inputs.sourceRoot = f.directory;
  for (const text of ['select name from person -- \\\\fs01\\share\\dump', 'select name from person -- /srv/legacy/dump']) {
    await writeFile(path.join(f.directory, 'Query.sql'), text);
    const preview = await f.ai.preview({ mode: 'expanded', excerpts: [{ path: 'Query.sql', startLine: 1, lineCount: 1 }] });
    assert.equal(preview.context.excerpts.length, 0, text); assert.equal(preview.excluded[0].reason, 'LITERAL_OR_SENSITIVE_EXCERPT_WITHHELD');
  }
});
