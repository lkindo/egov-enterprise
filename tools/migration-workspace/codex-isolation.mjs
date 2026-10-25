import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { openCodex, inspectCodexHome } from './codex-adapter.mjs';

const validModel = model => typeof model === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(model);

// 합성 검사가 실제 세션과 다른 조건은 이것뿐이다: 로컬 합성 provider, 인증 정보를 저장하지 않는 저장소, 압축 끔.
// 나머지 제한(CODEX_RESTRICTIONS)은 openCodex 가 같은 값으로 붙인다. 계약 시험이 이 차이를 고정한다.
export function probeConfig(port, model) {
  return {
    model, model_provider: 'migration_probe',
    'model_providers.migration_probe.name': 'Local synthetic isolation check',
    'model_providers.migration_probe.base_url': `http://127.0.0.1:${port}/v1`,
    'model_providers.migration_probe.wire_api': 'responses',
    'model_providers.migration_probe.requires_openai_auth': false,
    'features.enable_request_compression': false,
    cli_auth_credentials_store: 'ephemeral',
  };
}

/** Inspect the captured synthetic wire body; never return its prompt or machine paths. */
export function assessCodexRequest(captured, localRoots, expectedModel) {
  if (!validModel(expectedModel)) return { qualified: false, code: 'CODEX_MODEL_UNCONFIRMED', tools: [] };
  if (!captured || typeof captured !== 'object' || !Array.isArray(captured.input) || (captured.tools != null && !Array.isArray(captured.tools))) return { qualified: false, code: 'CODEX_PROBE_INVALID', model: expectedModel, tools: [] };
  const descriptors = captured.tools ?? [];
  const tools = descriptors.map(tool => typeof tool?.name === 'string' && /^[a-zA-Z0-9_]{1,80}$/.test(tool.name) ? tool.name : typeof tool?.type === 'string' && /^[a-zA-Z0-9_]{1,80}$/.test(tool.type) ? tool.type : 'unknown');
  const roots = localRoots.filter(root => typeof root === 'string' && root.length > 1).map(root => root.replaceAll('\\', '/').toLowerCase());
  function leaks(value) {
    if (typeof value === 'string') {
      const normalized = value.replaceAll('\\', '/').toLowerCase();
      return roots.some(root => normalized.includes(root)) || /[a-z]:\//.test(normalized) || normalized.includes('file://') || /<(environment_context|skills_instructions|permissions instructions)\b/.test(normalized);
    }
    return value && typeof value === 'object' && Object.values(value).some(leaks);
  }
  const leaksLocalContext = leaks(captured);
  // Only the built-in question function is inert: our transport rejects that RPC as well.
  const unsafeTools = descriptors.some(tool => tool?.type !== 'function' || tool.name !== 'request_user_input');
  const code = captured.model !== expectedModel ? 'CODEX_MODEL_UNCONFIRMED' : unsafeTools ? 'CODEX_BUILTIN_TOOLS_PRESENT' : leaksLocalContext ? 'CODEX_LOCAL_CONTEXT_PRESENT' : 'CODEX_ISOLATION_CONFIRMED';
  return { qualified: code === 'CODEX_ISOLATION_CONFIRMED', code, model: expectedModel, tools };
}

/** Synthetic local provider probe: no login, real model request, or institutional data leaves the PC. */
export async function inspectCodexIsolation(executable, selectedModel, { home } = {}) {
  if (!validModel(selectedModel)) return { qualified: false, code: 'CODEX_MODEL_UNCONFIRMED', tools: [] };
  // 검사는 빈 임시 홈에서 돈다. 실제 세션 홈에 설정·지시 입력이 있으면 결과를 그 홈에 옮길 수 없으므로 통과시키지 않는다.
  if (home !== undefined) {
    let homeInput;
    try { homeInput = typeof home === 'string' && home ? await inspectCodexHome(home) : 'CODEX_HOME_UNREADABLE'; } catch (error) { homeInput = /^CODEX_[A-Z_]+$/.test(error?.code) ? error.code : 'CODEX_HOME_UNREADABLE'; }
    if (homeInput) return { qualified: false, code: homeInput, model: selectedModel, tools: [] };
  }
  const directory = await mkdtemp(path.join(tmpdir(), 'migration-ai-probe-'));
  let client, captured, hasCredentials = false;
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/v1/responses') { response.writeHead(404).end(); return; }
    hasCredentials ||= Boolean(request.headers.authorization);
    const chunks = []; let bytes = 0;
    for await (const chunk of request) { bytes += chunk.length; if (bytes > 1024 * 1024) { response.writeHead(413).end(); return; } chunks.push(chunk); }
    try { captured = JSON.parse(Buffer.concat(chunks)); } catch { response.writeHead(400).end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    response.end('event: response.completed\ndata: {"type":"response.completed","response":{"id":"synthetic","status":"completed","output":[],"usage":{"input_tokens":0,"output_tokens":0,"total_tokens":0}}}\n\n');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let reason = 'CODEX_PROBE_FAILED';
  try {
    client = await openCodex({ executable, directory, testConfig: probeConfig(server.address().port, selectedModel) });
    let timeout;
    try { await Promise.race([client.complete('Synthetic migration fixture only. Return a message.', { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false }).catch(error => { reason = error.code; }), new Promise(resolve => { timeout = setTimeout(resolve, 20000); })]); } finally { clearTimeout(timeout); }
    if (hasCredentials) return { qualified: false, code: 'CODEX_PROBE_AUTH_PRESENT', model: selectedModel, tools: [] };
    if (!captured) return { qualified: false, code: reason, model: selectedModel, tools: [] };
    return assessCodexRequest(captured, [directory, client.cwd, process.cwd(), homedir(), tmpdir(), executable], selectedModel);
  } catch (error) {
    return { qualified: false, code: /^CODEX_[A-Z_]+$/.test(error?.code) ? error.code : 'CODEX_PROBE_FAILED', model: selectedModel, tools: [] };
  } finally {
    await client?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    const target = path.resolve(directory);
    if (path.dirname(target) === path.resolve(tmpdir()) && path.basename(target).startsWith('migration-ai-probe-')) await rm(target, { recursive: true, force: true });
  }
}
