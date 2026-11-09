import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCliRunner, findClaudeExecutable } from './ai-cli.mjs';

function fixture(t, body) {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-ai-cli-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const script = join(cwd, 'fake-cli.mjs');
  writeFileSync(script, body);
  return { cwd, runner: options => createCliRunner({ launch: { command: process.execPath, args: [script] }, ...options }) };
}
const success = value => JSON.stringify({ type: 'result', subtype: 'success', is_error: false, structured_output: value, modelUsage: { 'claude-opus-5-5': { inputTokens: 5, outputTokens: 10 } } });
test('prompt is stdin data; fixed arguments remove tools and persistence; shell metacharacters cannot execute', async t => {
  const { cwd, runner } = fixture(t, `let data='';for await(const chunk of process.stdin)data+=chunk;process.stdout.write(JSON.stringify({type:'result',subtype:'success',is_error:false,structured_output:{input:JSON.parse(data),args:process.argv.slice(2)},modelUsage:{'claude-opus-5-5':{inputTokens:5,outputTokens:10}}}));`);
  const marker = join(cwd, 'MUST-NOT-EXIST');
  const prompt = { data: { text: `& echo unsafe > ${marker}; $(touch ${marker})` } };
  const result = await runner()({ request: prompt, schema: { type: 'object' }, cwd });
  assert.deepEqual(result.output.input, prompt);
  assert.equal(existsSync(marker), false);
  const args = result.output.args;
  assert.equal(args[args.indexOf('--tools') + 1], '');
  assert.ok(args.includes('--restricted')); assert.ok(args.includes('--safe-mode')); assert.ok(args.includes('--no-session-persistence')); assert.ok(args.includes('--strict-mcp-config'));
  assert.equal(args.some(arg => arg.includes('echo unsafe')), false);
  assert.equal(result.model, 'claude-opus-5-5');
});
test('nonzero exit, model errors, malformed JSON and unavailable structured output return safe errors', async t => {
  for (const body of [`process.stderr.write('PRIVATE-CUSTOMER-VALUE');process.exit(9);`, `process.stdout.write('not json PRIVATE-CUSTOMER-VALUE');`, `process.stdout.write(JSON.stringify({type:'result',is_error:true,result:'PRIVATE-CUSTOMER-VALUE'}));`, `process.stdout.write(JSON.stringify({type:'result',is_error:false,result:'{}'}));`]) {
    const { cwd, runner } = fixture(t, body);
    await assert.rejects(runner()({ request: {}, schema: {}, cwd }), error => error.code === 'AI_CLI_FAILED' && !error.message.includes('PRIVATE'));
  }
});

test('document analysis uses high while original reading and independent reviews retain xhigh', async t => {
  const { cwd, runner } = fixture(t, `let data='';for await(const chunk of process.stdin)data+=chunk;process.stdout.write(JSON.stringify({type:'result',subtype:'success',is_error:false,structured_output:{args:process.argv.slice(2)},modelUsage:{'claude-opus-5-5':{inputTokens:1,outputTokens:1}}}));`);
  for (const [phase, expected] of [['reading', 'xhigh'], ['synthesis', 'high'], ['analysis', 'high'], ['review-requirements', 'high'], ['decomposition', 'high'], ['review-plan', 'high'], [undefined, 'xhigh']]) {
    const result = await runner()({ request: { ...(phase ? { phase } : {}), data: {} }, schema: { type: 'object' }, cwd });
    assert.equal(result.output.args[result.output.args.indexOf('--effort') + 1], expected, phase ?? 'independent code review');
    assert.equal(result.effort, expected);
  }
});
test('oversized output, timeout and cancellation terminate the owned child', async t => {
  const large = fixture(t, `process.stdout.write('X'.repeat(8192));setInterval(()=>{},1000);`);
  await assert.rejects(large.runner({ maxOutputBytes: 2048 })({ request: {}, schema: {}, cwd: large.cwd }), { code: 'AI_OUTPUT_TOO_LARGE' });
  const idle = fixture(t, `setInterval(()=>{},1000);`);
  await assert.rejects(idle.runner({ timeoutMs: 250 })({ request: {}, schema: {}, cwd: idle.cwd }), { code: 'AI_TIMEOUT' });
  const controller = new AbortController();
  const pending = idle.runner()({ request: {}, schema: {}, cwd: idle.cwd, signal: controller.signal }); controller.abort();
  await assert.rejects(pending, { code: 'AI_CANCELLED' });
});
test('fallback model, denied tools and unsuccessful envelopes cannot be accepted silently', async t => {
  const denied = JSON.parse(success({ okay: true })); denied.permission_denials = [{ tool_name: 'Read' }];
  const incomplete = JSON.parse(success({ okay: true })); incomplete.subtype = 'error_max_turns';
  for (const envelope of [denied, incomplete]) {
    const { cwd, runner } = fixture(t, `process.stdout.write(${JSON.stringify(JSON.stringify(envelope))});`);
    await assert.rejects(runner()({ request: {}, schema: {}, cwd }), { code: 'AI_CLI_FAILED' });
  }
  const changed = JSON.parse(success({ okay: true })); changed.modelUsage = { 'different-provider-model': {} };
  const { cwd, runner } = fixture(t, `process.stdout.write(${JSON.stringify(JSON.stringify(changed))});`);
  await assert.rejects(runner()({ request: {}, schema: {}, cwd }), { code: 'AI_MODEL_MISMATCH' });
});
test('CLI discovery accepts only an installed executable and never executes command text', () => {
  assert.throws(() => findClaudeExecutable({ path: '/definitely-not-installed' }), { code: 'AI_CLI_UNAVAILABLE' });
});

test('registered images are stdin message content, with no filesystem tools or image bytes in command arguments', async t => {
  const { cwd, runner } = fixture(t, `let data='';for await(const chunk of process.stdin)data+=chunk;process.stdout.write(JSON.stringify({type:'result',subtype:'success',is_error:false,structured_output:{input:JSON.parse(data),args:process.argv.slice(2)},modelUsage:{'claude-opus-5-5':{inputTokens:1,outputTokens:1}}}));`);
  const base64 = readFileSync(new URL('./test-fixtures/receipt.png', import.meta.url)).toString('base64');
  const result = await runner()({ request: { instructions: 'synthetic image', data: {} }, schema: { type: 'object' }, cwd, attachments: [{ mediaType: 'image/png', base64 }] });
  assert.equal(result.output.input.type, 'user');
  assert.equal(result.output.input.message.content[1].type, 'image');
  assert.ok(result.output.input.message.content[1].source.data === base64);
  assert.equal(result.output.args[result.output.args.indexOf('--input-format') + 1], 'stream-json');
  assert.equal(result.output.args[result.output.args.indexOf('--output-format') + 1], 'stream-json');
  assert.equal(result.output.args.some(arg => arg.includes(base64)), false);
  await assert.rejects(runner()({ request: {}, schema: {}, cwd, attachments: [{ mediaType: 'text/html', base64 }] }), { code: 'AI_ATTACHMENT_INVALID' });
});

test('image mode reads the single final result from a JSON event stream and rejects ambiguous results', async t => {
  const base64 = readFileSync(new URL('./test-fixtures/receipt.png', import.meta.url)).toString('base64');
  const output = `${JSON.stringify({ type: 'system', subtype: 'init' })}\n${success({ visible: true })}\n`;
  const valid = fixture(t, `process.stdout.write(${JSON.stringify(output)});`);
  assert.deepEqual((await valid.runner()({ request: {}, schema: {}, cwd: valid.cwd, attachments: [{ mediaType: 'image/png', base64 }] })).output, { visible: true });
  const ambiguous = fixture(t, `process.stdout.write(${JSON.stringify(`${output}${success({ visible: false })}\n`)});`);
  await assert.rejects(ambiguous.runner()({ request: {}, schema: {}, cwd: ambiguous.cwd, attachments: [{ mediaType: 'image/png', base64 }] }), { code: 'AI_CLI_FAILED' });
});

test('PDF attachments use document content rather than filesystem read tools', async t => {
  const { cwd, runner } = fixture(t, `let data='';for await(const chunk of process.stdin)data+=chunk;process.stdout.write(JSON.stringify({type:'result',subtype:'success',is_error:false,structured_output:{input:JSON.parse(data)},modelUsage:{'claude-opus-5-5':{inputTokens:1,outputTokens:1}}}));`);
  const base64 = readFileSync(new URL('./test-fixtures/receipt.pdf', import.meta.url)).toString('base64');
  const result = await runner()({ request: {}, schema: {}, cwd, attachments: [{ mediaType: 'application/pdf', base64 }] });
  assert.equal(result.output.input.message.content[1].type, 'document');
});
