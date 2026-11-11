import { spawn } from 'node:child_process';
import { accessSync, constants, realpathSync, statSync } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';
import { assertExternalWorkspace } from './store.mjs';

export const AI_MODEL = 'claude-opus-5-5';
export const AI_EFFORT = 'xhigh';
export const AI_ANALYSIS_EFFORT = 'high';
export const MAX_ANALYSIS_MODEL_CALLS = 1024;
export const aiEffortForPhase = phase => ['synthesis', 'analysis', 'analysis-context', 'analysis-merge', 'review-requirements', 'decomposition', 'review-plan'].includes(phase) ? AI_ANALYSIS_EFFORT : AI_EFFORT;
const failure = code => Object.assign(new Error(code), { code });

export function findClaudeExecutable({ path = process.env.PATH ?? process.env.Path ?? '' } = {}) {
  for (const directory of path.split(delimiter).filter(isAbsolute)) {
    const candidates = process.platform === 'win32'
      ? [join(directory, 'claude.exe'), join(directory, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')]
      : [join(directory, 'claude')];
    for (const candidate of candidates) {
      try {
        const command = realpathSync(candidate);
        if (!statSync(command).isFile()) continue;
        accessSync(command, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
        return { command, args: [] };
      } catch { /* Try the next installed executable, never a shell shim. */ }
    }
  }
  throw failure('AI_CLI_UNAVAILABLE');
}

function childEnvironment() {
  // Keep OS/auth/proxy inputs the installed CLI needs, rather than forwarding
  // the web server's unrelated credentials, NODE_OPTIONS or agent sessions.
  const allowed = /^(PATH|PATHEXT|SystemRoot|WINDIR|COMSPEC|HOME|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|TEMP|TMP|TMPDIR|LANG|LC_ALL|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|CLAUDE_CODE_OAUTH_TOKEN)$/i;
  return { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.test(key))), CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1', CLAUDE_CODE_SKIP_PROMPT_HISTORY: '1', DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1' };
}

export function createCliRunner({ launch, timeoutMs = 15 * 60 * 1000, maxOutputBytes = 2 * 1024 ** 2 } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30 * 60 * 1000 || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 8 * 1024 ** 2) throw failure('AI_CONFIGURATION_INVALID');
  return async function run({ request, schema, cwd, signal, attachments = [] }) {
    if (signal?.aborted) throw failure('AI_CANCELLED');
    assertExternalWorkspace(cwd);
    const executable = launch ?? findClaudeExecutable();
    if (!isAbsolute(executable.command) || !Array.isArray(executable.args)) throw failure('AI_CONFIGURATION_INVALID');
    if (!Array.isArray(attachments) || attachments.length > 100) throw failure('AI_ATTACHMENT_INVALID');
    let attachmentBytes = 0;
    for (const attachment of attachments) {
      if (!attachment || Object.keys(attachment).some(key => !['mediaType', 'base64'].includes(key)) || !['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(attachment.mediaType) || typeof attachment.base64 !== 'string' || !attachment.base64.length || attachment.base64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.base64)) throw failure('AI_ATTACHMENT_INVALID');
      const bytes = Buffer.from(attachment.base64, 'base64'); attachmentBytes += bytes.length;
      if (bytes.toString('base64') !== attachment.base64 || attachmentBytes > 20 * 1024 ** 2) throw failure('AI_ATTACHMENT_INVALID');
    }
    const effort = aiEffortForPhase(request.phase);
    const requestText = JSON.stringify(request), schemaText = JSON.stringify(schema);
    if (Buffer.byteLength(requestText) > 1024 ** 2 || schemaText.length > 20000) throw failure('AI_INPUT_TOO_LARGE');
    const input = attachments.length ? `${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: requestText }, ...attachments.map(attachment => ({ type: attachment.mediaType === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: attachment.mediaType, data: attachment.base64 } }))] } })}\n` : requestText;
    const args = [...executable.args, '-p', '--model', AI_MODEL, '--effort', effort, '--output-format', attachments.length ? 'stream-json' : 'json', '--json-schema', schemaText,
      '--tools', '', '--restricted', '--safe-mode', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--no-session-persistence', '--disable-slash-commands', '--max-turns', '2'];
    if (attachments.length) args.push('--input-format', 'stream-json', '--verbose');
    return await new Promise((resolve, reject) => {
      let child, finished = false, reason, count = 0, forceTimer;
      const chunks = [];
      const stop = code => {
        reason ??= code;
        if (!child || child.exitCode !== null) return;
        child.kill('SIGTERM');
        forceTimer ??= setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1000);
        forceTimer.unref();
      };
      const abort = () => stop('AI_CANCELLED');
      const timer = setTimeout(() => stop('AI_TIMEOUT'), timeoutMs); timer.unref();
      const finish = (error, value) => {
        if (finished) return;
        finished = true; clearTimeout(timer); clearTimeout(forceTimer); signal?.removeEventListener('abort', abort);
        if (error) reject(error); else resolve(value);
      };
      try { child = spawn(executable.command, args, { cwd, shell: false, windowsHide: true, env: childEnvironment(), stdio: ['pipe', 'pipe', 'pipe'] }); }
      catch { finish(failure('AI_CLI_FAILED')); return; }
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      child.stdout.on('data', chunk => { count += chunk.length; if (count > maxOutputBytes) stop('AI_OUTPUT_TOO_LARGE'); else if (!reason) chunks.push(chunk); });
      // CLI errors may contain customer text or credentials. Drain but never
      // persist, reflect or log their bytes, even when the child exits nonzero.
      child.stderr.on('data', chunk => { count += chunk.length; if (count > maxOutputBytes) stop('AI_OUTPUT_TOO_LARGE'); });
      child.on('error', () => finish(failure('AI_CLI_FAILED')));
      child.on('close', code => {
        if (reason || code !== 0) { finish(failure(reason ?? 'AI_CLI_FAILED')); return; }
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)).trim();
          const results = attachments.length ? text.split(/\r?\n/).map(line => JSON.parse(line)).filter(event => event.type === 'result') : [JSON.parse(text)];
          if (results.length !== 1) throw failure('AI_CLI_FAILED');
          const envelope = results[0];
          if (envelope.type !== 'result' || envelope.subtype !== 'success' || envelope.is_error !== false || !envelope.structured_output || envelope.permission_denials?.length) throw failure('AI_CLI_FAILED');
          const models = Object.keys(envelope.modelUsage ?? {});
          if (models.length !== 1 || models[0] !== AI_MODEL) throw failure('AI_MODEL_MISMATCH');
          const usage = envelope.modelUsage[AI_MODEL];
          const telemetry = { outputBytes: Buffer.byteLength(JSON.stringify(envelope.structured_output)) };
          for (const key of ['cacheReadInputTokens', 'cacheCreationInputTokens']) if (Number.isSafeInteger(usage[key]) && usage[key] >= 0) telemetry[key] = usage[key];
          finish(null, { output: envelope.structured_output, model: AI_MODEL, effort, usage: { inputTokens: Number.isSafeInteger(usage.inputTokens) ? usage.inputTokens : 0, outputTokens: Number.isSafeInteger(usage.outputTokens) ? usage.outputTokens : 0 }, telemetry });
        } catch (error) { finish(failure(error.code === 'AI_MODEL_MISMATCH' ? error.code : 'AI_CLI_FAILED')); }
      });
      child.stdin.on('error', () => { /* An early CLI failure is handled by close. */ });
      child.stdin.end(input);
    });
  };
}
