import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assessCodexRequest, inspectCodexIsolation, probeConfig } from './codex-isolation.mjs';
import { CODEX_RESTRICTIONS } from './codex-adapter.mjs';

const request = () => ({ model: 'gpt-5.4', instructions: 'Synthetic review instructions.', input: [{ role: 'user', content: [{ type: 'input_text', text: 'Synthetic schema fixture only.' }] }], tools: [{ type: 'function', name: 'request_user_input' }] });
const roots = ['C:\\Synthetic\\private-workspace', '/synthetic/private-home'];

test('synthetic schema-only request allows only the inert built-in question function', () => {
  assert.deepEqual(assessCodexRequest(request(), roots, 'gpt-5.4'), { qualified: true, code: 'CODEX_ISOLATION_CONFIRMED', model: 'gpt-5.4', tools: ['request_user_input'] });
  const noTools = request(); noTools.tools = [];
  assert.equal(assessCodexRequest(noTools, roots, 'gpt-5.4').qualified, true);
});

test('local paths and automatic context blocks are rejected anywhere in the request body', () => {
  for (const value of ['C:\\Synthetic\\private-workspace\\empty', 'c:/SYNTHETIC/private-workspace/skills', '/synthetic/private-home/skills', 'D:/another/unknown/local/path', 'file:///another/private/path', '<environment_context>machine data</environment_context>', '<skills_instructions>catalog</skills_instructions>', '<permissions instructions>roots</permissions instructions>']) {
    const body = request(); body.metadata = { nested: [{ value }] };
    const result = assessCodexRequest(body, roots, 'gpt-5.4');
    assert.equal(result.qualified, false);
    assert.equal(result.code, 'CODEX_LOCAL_CONTEXT_PRESENT');
    assert.ok(!JSON.stringify(result).includes(value));
  }
});

test('tool capability additions and question-name spoofing fail closed', () => {
  for (const tool of [{ type: 'function', name: 'exec_command' }, { type: 'web_search' }, { type: 'mcp', name: 'request_user_input' }, { type: 'function', function: { name: 'request_user_input' } }, null]) {
    const body = request(); body.tools.push(tool);
    assert.equal(assessCodexRequest(body, roots, 'gpt-5.4').code, 'CODEX_BUILTIN_TOOLS_PRESENT');
  }
});

test('missing input, malformed tool collections and unexpected models cannot qualify', () => {
  for (const body of [null, {}, { model: 'gpt-5.4', input: 'invalid' }, { ...request(), tools: {} }]) assert.equal(assessCodexRequest(body, roots, 'gpt-5.4').code, 'CODEX_PROBE_INVALID');
  assert.equal(assessCodexRequest({ ...request(), model: 'unexpected-model' }, roots, 'gpt-5.4').code, 'CODEX_MODEL_UNCONFIRMED');
  assert.equal(assessCodexRequest(request(), roots).code, 'CODEX_MODEL_UNCONFIRMED');
});

test('the probe differs from the real session only in its synthetic provider, credential store and compression', () => {
  const config = probeConfig(4321, 'gpt-5.4');
  // 실제 세션 제한을 덮어쓰는 키는 인증 저장소 하나뿐이고, 나머지는 합성 provider 정의다.
  assert.deepEqual(Object.keys(config).filter(key => Object.hasOwn(CODEX_RESTRICTIONS, key)), ['cli_auth_credentials_store']);
  assert.equal(config.cli_auth_credentials_store, 'ephemeral');
  for (const key of Object.keys(config)) assert.ok(['model', 'model_provider', 'features.enable_request_compression', 'cli_auth_credentials_store'].includes(key) || key.startsWith('model_providers.migration_probe.'), key);
  assert.equal(config['model_providers.migration_probe.base_url'], 'http://127.0.0.1:4321/v1');
});

test('a real session home with inherited configuration cannot qualify, and nothing is started for it', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'migration-ai-isolation-home-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, 'official-codex-client'), executable = path.join(root, 'missing-codex.exe');
  await mkdir(home);
  await writeFile(path.join(home, 'config.toml'), 'developer_instructions = "synthetic inherited instruction"');
  // 실행 파일이 없어도 홈 검사에서 먼저 멈춘다 — 합성 검사 프로세스도 띄우지 않는다.
  assert.deepEqual(await inspectCodexIsolation(executable, 'gpt-5.4', { home }), { qualified: false, code: 'CODEX_HOME_CONFIG_PRESENT', model: 'gpt-5.4', tools: [] });
  await rm(path.join(home, 'config.toml')); await mkdir(path.join(home, 'empty', '.codex'), { recursive: true });
  assert.equal((await inspectCodexIsolation(executable, 'gpt-5.4', { home })).code, 'CODEX_HOME_CONFIG_PRESENT');
  for (const invalid of ['', 42]) assert.equal((await inspectCodexIsolation(executable, 'gpt-5.4', { home: invalid })).code, 'CODEX_HOME_UNREADABLE');
});
