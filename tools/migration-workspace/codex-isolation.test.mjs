import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessCodexRequest } from './codex-isolation.mjs';

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
