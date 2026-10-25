import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { PassThrough } from 'node:stream';
import { setImmediate as nextTick } from 'node:timers/promises';
import { test } from 'node:test';
import { openCodex, CODEX_HOME_INPUTS } from './codex-adapter.mjs';

// thread 생성 전 홈 재검사가 실제 파일 I/O 를 한 번 거치므로 틱 수가 아니라 시간으로 기다린다.
const until = async (predicate, ms = 2000) => { const end = Date.now() + ms; while (!predicate() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 5)); };
const privateEmail = 'synthetic-private-account@example.invalid';
const privateToken = 'synthetic-private-oauth-value';
const privateError = `provider diagnostics ${privateEmail} ${privateToken}`;
const chatgptAccount = { type: 'chatgpt', email: privateEmail, planType: 'plus', accessToken: privateToken };

function fakeServer({ authUrl = 'https://auth.openai.com/authorize?state=synthetic-state', account = null, rejectedMethod = null, models = [{ model: 'synthetic-default-model', isDefault: true }], accountChangesDuringThread = false } = {}) {
  const calls = [], responses = [], invocations = [];
  const child = new EventEmitter();
  child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  let currentAccount = account, modelCatalog = models, stopped = false;
  const send = message => child.stdout.write(JSON.stringify(message) + '\n');
  child.kill = () => {
    if (!stopped) { stopped = true; setImmediate(() => { child.stdout.end(); child.stderr.end(); child.emit('close', 0, null); }); }
    return true;
  };
  createInterface({ input: child.stdin }).on('line', line => {
    const message = JSON.parse(line);
    if (!message.method) { responses.push(message); return; }
    calls.push(message);
    if (message.id == null) return;
    setImmediate(() => {
      if (message.method === rejectedMethod) { send({ id: message.id, error: { code: -32000, message: privateError, data: { accessToken: privateToken } } }); return; }
      let result;
      switch (message.method) {
        case 'initialize': result = { userAgent: 'synthetic-client', platformFamily: 'windows', platformOs: 'windows' }; break;
        case 'account/read': result = { account: currentAccount, requiresOpenaiAuth: true, accessToken: privateToken }; break;
        case 'account/login/start': result = { type: 'chatgpt', loginId: 'synthetic-login-id', authUrl, accessToken: privateToken }; break;
        case 'account/login/cancel': result = { status: 'canceled' }; break;
        case 'account/logout': currentAccount = null; result = {}; break;
        case 'model/list': result = { data: modelCatalog, nextCursor: null }; break;
        case 'thread/start': result = { thread: { id: 'synthetic-thread' }, model: message.params.model, approvalPolicy: 'never', sandbox: { type: 'readOnly' }, instructionSources: [] }; break;
        case 'turn/start': result = { turn: { id: 'synthetic-turn' } }; break;
        default: send({ id: message.id, error: { code: -32601, message: 'Unexpected fake RPC' } }); return;
      }
      send({ id: message.id, result });
      if (message.method === 'thread/start' && accountChangesDuringThread) send({ method: 'account/updated', params: { authMode: 'chatgpt' } });
    });
  });
  return {
    calls, responses, invocations, child,
    spawnImpl(command, args, options) { invocations.push({ command, args, options }); return child; },
    setAccount(value) { currentAccount = value; },
    setModels(value) { modelCatalog = value; },
    notify(params) { send({ method: 'account/login/completed', params }); },
    send,
  };
}

async function fixture(t, options, testConfig = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'migration-codex-adapter-'));
  const executable = path.join(root, 'fake.exe');
  const directory = path.join(root, 'isolated-codex');
  await writeFile(executable, 'synthetic executable; never executed');
  const fake = fakeServer(options);
  const adapter = await openCodex({ executable, directory, spawnImpl: fake.spawnImpl, testConfig });
  t.after(async () => {
    await adapter.close();
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(tmpdir()));
    assert.ok(path.basename(target).startsWith('migration-codex-adapter-'));
    await rm(target, { recursive: true, force: true });
  });
  return { adapter, fake, executable, directory };
}

function assertPrivate(value) {
  const serialized = JSON.stringify(value);
  assert.ok(!serialized.includes(privateEmail));
  assert.ok(!serialized.includes(privateToken));
  assert.ok(!serialized.includes('provider diagnostics'));
}

test('Codex child starts without a shell in an empty private directory with restricted configuration and environment', async t => {
  const { adapter, fake, executable, directory } = await fixture(t);
  assert.equal(fake.invocations.length, 1);
  const invocation = fake.invocations[0];
  assert.equal(invocation.command.toLowerCase(), executable.toLowerCase());
  assert.equal(invocation.options.shell, false);
  assert.equal(invocation.options.windowsHide, true);
  assert.deepEqual(invocation.options.stdio, ['pipe', 'pipe', 'pipe']);
  assert.equal(invocation.options.cwd, adapter.cwd);
  assert.equal(path.dirname(adapter.cwd).toLowerCase(), directory.toLowerCase());
  assert.deepEqual(await readdir(adapter.cwd), []);
  assert.equal(invocation.options.env.CODEX_HOME.toLowerCase(), directory.toLowerCase());
  const allowed = new Set(['SystemRoot', 'WINDIR', 'PATH', 'TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'CODEX_HOME']);
  for (const key of Object.keys(invocation.options.env)) assert.ok(allowed.has(key), `Unexpected inherited environment key: ${key}`);
  for (const key of ['MW_SOURCE_PASSWORD', 'MW_TARGET_PASSWORD', 'DATABASE_URL', 'OPENAI_API_KEY', 'ACCESS_TOKEN', 'JAVA_TOOL_OPTIONS', 'NODE_OPTIONS']) assert.equal(invocation.options.env[key], undefined);
  assert.ok(invocation.args.includes('--strict-config'));
  assert.equal(invocation.args[0], 'app-server');
  const settings = {};
  for (let index = 0; index < invocation.args.length; index++) if (invocation.args[index] === '-c') {
    const value = invocation.args[++index], at = value.indexOf('=');
    settings[value.slice(0, at)] = JSON.parse(value.slice(at + 1));
  }
  for (const key of ['include_environment_context', 'include_permissions_instructions', 'skills.include_instructions', 'skills.bundled.enabled', 'features.shell_tool', 'features.shell_snapshot', 'features.apps', 'features.remote_plugin', 'features.multi_agent', 'features.hooks', 'features.memories', 'features.goals', 'features.code_mode.enabled', 'features.skill_mcp_dependency_install', 'features.plugins', 'agents.enabled', 'apps._default.enabled', 'analytics.enabled', 'feedback.enabled', 'check_for_update_on_startup']) assert.equal(settings[key], false, key);
  for (const [key, value] of Object.entries({ web_search: 'disabled', approval_policy: 'never', sandbox_mode: 'read-only', 'history.persistence': 'none', 'shell_environment_policy.inherit': 'none', cli_auth_credentials_store: 'keyring' })) assert.equal(settings[key], value, key);
  assert.deepEqual(fake.calls.map(call => call.method), ['initialize', 'initialized']);
});

test('account status exposes authentication booleans but never raw account or credential fields', async t => {
  const { adapter, fake } = await fixture(t, { account: chatgptAccount });
  const status = await adapter.status();
  assert.deepEqual(status, { authenticated: true, provider: 'codex', loginPending: false, loginState: 'idle', model: 'synthetic-default-model' });
  assertPrivate(status);
  assert.deepEqual(fake.calls.find(call => call.method === 'account/read').params, { refreshToken: false });
  fake.setAccount({ type: 'apiKey', email: privateEmail, apiKey: privateToken });
  assert.deepEqual(await adapter.status(), { authenticated: false, provider: 'codex', loginPending: false, loginState: 'idle' });
});

test('login moves idle to pending to complete only for its matching completion notification', async t => {
  const { adapter, fake } = await fixture(t);
  assert.deepEqual(await adapter.status(), { authenticated: false, provider: 'codex', loginPending: false, loginState: 'idle' });
  const login = await adapter.login();
  assert.deepEqual(login, { loginUrl: 'https://auth.openai.com/authorize?state=synthetic-state', loginId: 'synthetic-login-id' });
  assertPrivate(login);
  assert.deepEqual(fake.calls.find(call => call.method === 'account/login/start').params, { type: 'chatgpt' });
  assert.deepEqual(await adapter.status(), { authenticated: false, provider: 'codex', loginPending: true, loginState: 'pending' });
  fake.notify({ loginId: 'unrelated-login', success: true, error: null });
  assert.equal((await adapter.status()).loginState, 'pending');
  fake.setAccount(chatgptAccount);
  fake.notify({ loginId: login.loginId, success: true, error: null });
  assert.deepEqual(await adapter.status(), { authenticated: true, provider: 'codex', loginPending: false, loginState: 'complete', model: 'synthetic-default-model' });
});

test('failed login notification exposes a failed state without provider error text or secrets', async t => {
  const { adapter, fake } = await fixture(t);
  const login = await adapter.login();
  fake.child.stderr.write(privateError);
  fake.notify({ loginId: login.loginId, success: false, error: privateError });
  const status = await adapter.status();
  assert.equal(status.authenticated, false);
  assert.equal(status.provider, 'codex');
  assert.equal(status.loginPending, false);
  assert.equal(status.loginState, 'failed');
  assertPrivate(status);
  for (const [key, value] of Object.entries(status)) if (!['authenticated', 'provider', 'loginPending', 'loginState'].includes(key)) {
    if (value != null) assert.match(value, /^CODEX_[A-Z_]+$/);
  }
});

test('cancelLogin uses the official loginId RPC and ignores later completion of the cancelled attempt', async t => {
  const { adapter, fake } = await fixture(t);
  assert.deepEqual(await adapter.cancelLogin(), { cancelled: false });
  assert.equal(fake.calls.filter(call => call.method === 'account/login/cancel').length, 0);
  const login = await adapter.login();
  assert.deepEqual(await adapter.cancelLogin(), { cancelled: true });
  const cancellations = fake.calls.filter(call => call.method === 'account/login/cancel');
  assert.equal(cancellations.length, 1);
  assert.deepEqual(cancellations[0].params, { loginId: login.loginId });
  assert.deepEqual(await adapter.status(), { authenticated: false, provider: 'codex', loginPending: false, loginState: 'cancelled' });
  fake.notify({ loginId: login.loginId, success: true, error: null });
  assert.equal((await adapter.status()).loginState, 'cancelled');
  assert.deepEqual(await adapter.cancelLogin(), { cancelled: false });
  assert.equal(fake.calls.filter(call => call.method === 'account/login/cancel').length, 1);
});

test('logout uses account/logout and clears both authentication and pending login state', async t => {
  const { adapter, fake } = await fixture(t, { account: chatgptAccount });
  const login = await adapter.login();
  const expected = { authenticated: false, provider: 'codex', loginPending: false, loginState: 'idle' };
  assert.deepEqual(await adapter.logout(), expected);
  assert.equal(fake.calls.filter(call => call.method === 'account/logout').length, 1);
  assert.deepEqual(await adapter.status(), expected);
  fake.notify({ loginId: login.loginId, success: true, error: null });
  assert.deepEqual(await adapter.status(), expected);
});

test('login URLs require HTTPS and an exact auth.openai.com or chatgpt.com host', async t => {
  for (const authUrl of ['https://auth.openai.com/authorize?state=synthetic', 'https://chatgpt.com/auth/login?state=synthetic']) {
    const { adapter } = await fixture(t, { authUrl });
    assert.equal((await adapter.login()).loginUrl, authUrl);
  }
  for (const authUrl of ['http://auth.openai.com/authorize', 'https://auth.openai.com.evil.invalid/authorize', 'https://chatgpt.com.evil.invalid/authorize', 'https://sub.chatgpt.com/authorize', 'https://auth.openai.com@evil.invalid/authorize', 'https://user:secret@chatgpt.com/authorize', 'https://chatgpt.com:444/authorize', 'https://example.invalid/authorize', 'not-a-url']) {
    const { adapter } = await fixture(t, { authUrl });
    await assert.rejects(adapter.login(), { code: 'CODEX_LOGIN_URL_REJECTED' });
    const status = await adapter.status();
    assert.equal(status.loginPending, false);
    assertPrivate(status);
  }
});

test('JSON-RPC errors become fixed codes and server tool requests are rejected', async t => {
  const { adapter, fake } = await fixture(t, { rejectedMethod: 'account/read' });
  await assert.rejects(adapter.status(), error => {
    assert.equal(error.code, 'CODEX_REQUEST_REJECTED');
    assert.equal(error.message, 'CODEX_REQUEST_REJECTED');
    assertPrivate(error);
    return true;
  });
  fake.send({ id: 9001, method: 'item/commandExecution/requestApproval', params: { command: 'synthetic forbidden command' } });
  await nextTick();
  const response = fake.responses.find(message => message.id === 9001);
  assert.equal(response.error.code, -32601);
  assert.equal(response.result, undefined);
});

test('a disconnected child exposes closed to the owner and rejects an active turn immediately', async t => {
  const { adapter, fake } = await fixture(t, { account: chatgptAccount });
  assert.equal(adapter.closed, false);
  const completion = adapter.complete('Synthetic fixture only.', { type: 'object' });
  const rejected = assert.rejects(completion, { code: 'CODEX_DISCONNECTED' });
  await until(() => fake.calls.some(call => call.method === 'turn/start'));
  assert.ok(fake.calls.some(call => call.method === 'turn/start'));
  const start = fake.calls.find(call => call.method === 'thread/start');
  assert.equal(start.params.model, 'synthetic-default-model');
  assert.deepEqual(start.params.environments, []);
  assert.deepEqual(start.params.runtimeWorkspaceRoots, []);
  assert.deepEqual(start.params.selectedCapabilityRoots, []);
  assert.deepEqual(start.params.dynamicTools, []);
  fake.child.kill();
  await rejected;
  assert.equal(adapter.closed, true);
  await assert.rejects(adapter.status(), { code: 'CODEX_DISCONNECTED' });
});

test('concurrent login cannot replace a pending attempt', async t => {
  const { adapter, fake } = await fixture(t);
  await adapter.login();
  await assert.rejects(adapter.login(), { code: 'CODEX_LOGIN_PENDING' });
  assert.equal(fake.calls.filter(call => call.method === 'account/login/start').length, 1);
  assert.equal((await adapter.status()).loginState, 'pending');
});

test('only an authenticated client discovers and caches the official default model', async t => {
  const { adapter, fake } = await fixture(t);
  assert.equal((await adapter.status()).model, undefined);
  assert.equal(fake.calls.filter(call => call.method === 'model/list').length, 0);
  fake.setAccount(chatgptAccount);
  assert.equal((await adapter.status()).model, 'synthetic-default-model');
  assert.equal((await adapter.status()).model, 'synthetic-default-model');
  assert.equal(fake.calls.filter(call => call.method === 'model/list').length, 1);
  fake.setModels([{ model: 'synthetic-new-default', isDefault: true }]);
  fake.send({ method: 'account/updated', params: { authMode: 'chatgpt' } });
  assert.equal((await adapter.status()).model, 'synthetic-new-default');
  assert.equal(fake.calls.filter(call => call.method === 'model/list').length, 2);
});

test('missing or ambiguous default models fail closed without falling back to a listed model', async t => {
  for (const models of [[], [{ model: 'synthetic-other', isDefault: false }], [{ model: 'one', isDefault: true }, { model: 'two', isDefault: true }], [{ model: 'invalid model/path', isDefault: true }]]) {
    const { adapter, fake } = await fixture(t, { account: chatgptAccount, models });
    await assert.rejects(adapter.status(), { code: 'CODEX_MODEL_UNAVAILABLE' });
    assert.equal(fake.calls.filter(call => call.method === 'thread/start').length, 0);
  }
});

test('login and logout invalidate the selected account model', async t => {
  const { adapter, fake } = await fixture(t, { account: chatgptAccount });
  assert.equal((await adapter.status()).model, 'synthetic-default-model');
  fake.setModels([{ model: 'synthetic-after-login', isDefault: true }]);
  const login = await adapter.login();
  fake.notify({ loginId: login.loginId, success: true });
  assert.equal((await adapter.status()).model, 'synthetic-after-login');
  await adapter.logout();
  fake.setAccount(chatgptAccount);
  fake.setModels([{ model: 'synthetic-after-logout', isDefault: true }]);
  assert.equal((await adapter.status()).model, 'synthetic-after-logout');
});

test('the local synthetic provider uses its explicit model without any account or model-list request', async t => {
  const { adapter, fake } = await fixture(t, {}, { model: 'synthetic-probe-model' });
  const completion = adapter.complete('Synthetic fixture only.', { type: 'object' });
  const rejected = assert.rejects(completion, { code: 'CODEX_DISCONNECTED' });
  await until(() => fake.calls.some(call => call.method === 'turn/start'));
  assert.equal(fake.calls.find(call => call.method === 'thread/start')?.params.model, 'synthetic-probe-model');
  assert.equal(fake.calls.filter(call => ['account/read', 'model/list'].includes(call.method)).length, 0);
  fake.child.kill(); await rejected;
});

test('a model different from the verified probe is rejected before a thread or prompt is sent', async t => {
  const { adapter, fake } = await fixture(t, { account: chatgptAccount });
  const verifiedModel = (await adapter.status()).model;
  fake.setModels([{ model: 'synthetic-changed-default', isDefault: true }]);
  fake.send({ method: 'account/updated', params: { authMode: 'chatgpt' } });
  await assert.rejects(adapter.complete('Synthetic fixture only.', { type: 'object' }, verifiedModel), { code: 'CODEX_MODEL_CHANGED' });
  assert.equal(fake.calls.filter(call => ['thread/start', 'turn/start'].includes(call.method)).length, 0);
});

test('an account update during thread creation prevents the prompt from being sent', async t => {
  const { adapter, fake } = await fixture(t, { account: chatgptAccount, accountChangesDuringThread: true });
  await assert.rejects(adapter.complete('Synthetic fixture only.', { type: 'object' }, 'synthetic-default-model'), { code: 'CODEX_ACCOUNT_CHANGED' });
  assert.equal(fake.calls.filter(call => call.method === 'turn/start').length, 0);
});

async function homeFixture(t, entries) {
  const root = await mkdtemp(path.join(tmpdir(), 'migration-codex-home-'));
  t.after(async () => {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(tmpdir()));
    assert.ok(path.basename(target).startsWith('migration-codex-home-'));
    await rm(target, { recursive: true, force: true });
  });
  const executable = path.join(root, 'fake.exe'), directory = path.join(root, 'isolated-codex');
  await writeFile(executable, 'synthetic executable; never executed');
  for (const entry of entries) {
    const target = path.join(directory, entry.replace(/\/$/, ''));
    if (entry.endsWith('/')) await mkdir(target, { recursive: true });
    else { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, 'synthetic inherited input'); }
  }
  return { executable, directory };
}

test('a Codex home holding configuration or instruction inputs the launcher did not create is refused before start', async t => {
  const cases = [...CODEX_HOME_INPUTS.map(name => ['config.toml', 'managed_config.toml', 'requirements.toml', 'agents.md', 'agents.override.md', 'instructions.md', 'hooks.json', '.env'].includes(name) ? name : `${name}/`),
    'CONFIG.TOML', 'Agents.md', 'Skills/', 'empty/AGENTS.md', 'empty/.codex/config.toml'];
  for (const entry of cases) {
    const { executable, directory } = await homeFixture(t, [entry]);
    const fake = fakeServer();
    await assert.rejects(openCodex({ executable, directory, spawnImpl: fake.spawnImpl }), { code: 'CODEX_HOME_CONFIG_PRESENT' }, entry);
    assert.equal(fake.invocations.length, 0, entry);
  }
});

test('state files Codex creates itself do not block reopening the same home', async t => {
  // Codex 0.162.1 이 빈 홈에서 initialize·thread/start 뒤 남긴 항목(2026-10-25 실측).
  const { executable, directory } = await homeFixture(t, ['state_5.sqlite', 'state_5.sqlite-wal', 'logs_2.sqlite', 'goals_1.sqlite', 'memories_1.sqlite', 'queue_1.sqlite', 'installation_id', '.sandbox_migration', '.tmp/', 'empty/']);
  const fake = fakeServer();
  const adapter = await openCodex({ executable, directory, spawnImpl: fake.spawnImpl });
  t.after(() => adapter.close());
  assert.equal(fake.invocations.length, 1);
});

test('a configuration input added after start blocks the next request before any thread or prompt', async t => {
  const { adapter, fake, directory } = await fixture(t, { account: chatgptAccount });
  await writeFile(path.join(directory, 'config.toml'), 'developer_instructions = "synthetic inherited instruction"\n');
  // 가짜 서버는 turn 을 끝내지 않으므로, 검사가 빠지면 완료 대신 대기 시간 초과로 붉어진다.
  let timer;
  const stalled = new Promise((resolve, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('TEST_STALLED'), { code: 'TEST_STALLED' })), 2000); });
  try { await assert.rejects(Promise.race([adapter.complete('Synthetic fixture only.', { type: 'object' }, 'synthetic-default-model'), stalled]), { code: 'CODEX_HOME_CONFIG_PRESENT' }); } finally { clearTimeout(timer); }
  assert.equal(fake.calls.filter(call => ['thread/start', 'turn/start'].includes(call.method)).length, 0);
});
