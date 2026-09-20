#!/usr/bin/env node
/** A local-only transport over the same composition engine used by the CLI. */
import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'tools/project-composer/public');
const LIMIT = 32 * 1024;
const STAGES = Object.freeze({
  resolve: '선택한 구성 확인 중', database: 'PostgreSQL 스키마와 초기 데이터 생성 중',
  source: '선택한 기능의 소스 구성 중', install: '프로젝트 의존성 준비 중',
  verify: '생성 프로젝트 검증 중', complete: '생성과 검증 완료',
});
const MESSAGES = Object.freeze({
  BAD_REQUEST: '요청 형식을 확인해 주세요.', FORBIDDEN: '이 생성기 화면에서 다시 시도해 주세요.',
  NOT_FOUND: '요청한 항목을 찾을 수 없습니다.', METHOD_NOT_ALLOWED: '지원하지 않는 요청 방식입니다.',
  BODY_TOO_LARGE: '선택 정보가 너무 큽니다. 기능 선택을 다시 확인해 주세요.',
  INVALID_RECIPE: '프로젝트명과 기능 선택을 확인해 주세요. 지원하는 구성만 생성할 수 있습니다.',
  BUSY: '다른 프로젝트를 생성하고 있습니다. 완료 후 다시 시도해 주세요.',
  REQUEST_CONFLICT: '이미 사용한 요청입니다. 구성을 확인한 뒤 다시 시도해 주세요.',
  GENERATION_FAILED: '프로젝트 생성에 실패했습니다. Docker와 개발 도구 상태를 확인한 뒤 다시 시도해 주세요.',
  INTERNAL_ERROR: '요청을 처리하지 못했습니다. 입력은 유지됩니다. 잠시 후 다시 시도해 주세요.',
});

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);

/** Reject extra input channels before invoking an engine or creating any output. */
export function validateComposerRequestRecipe(recipe) {
  if (!keys(recipe, ['schemaVersion', 'project', 'sourceRef', 'selection', 'database', 'backendLayout'])
    || recipe.schemaVersion !== 1 || !keys(recipe.project, ['name']) || typeof recipe.project.name !== 'string'
    || recipe.project.name.length > 63 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(recipe.project.name)
    || typeof recipe.sourceRef !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/.test(recipe.sourceRef)
    || recipe.sourceRef.includes('..') || !keys(recipe.database, ['vendor']) || recipe.database.vendor !== 'postgresql'
    || !['multi-module', 'single-module'].includes(recipe.backendLayout)
    || !keys(recipe.selection, ['preset', 'domains'])) throw new HttpError(400, 'INVALID_RECIPE');
  const selection = recipe.selection;
  const preset = Object.hasOwn(selection, 'preset');
  const capabilities = Object.hasOwn(selection, 'domains');
  if (preset === capabilities || (preset && !identifier(selection.preset))
    || (capabilities && (!Array.isArray(selection.domains) || selection.domains.length > 100
      || !selection.domains.every(identifier) || new Set(selection.domains).size !== selection.domains.length))) {
    throw new HttpError(400, 'INVALID_RECIPE');
  }
  return recipe;
}

function secureHeaders(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}
function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
async function body(request) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) throw new HttpError(400, 'BAD_REQUEST');
  if (Number(request.headers['content-length'] ?? 0) > LIMIT) throw new HttpError(413, 'BODY_TOO_LARGE');
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > LIMIT) throw new HttpError(413, 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'BAD_REQUEST'); }
}
function safeResult(value, recipe) {
  // Raw child-process output and arbitrary error fields are never sent to a browser.
  const result = { recipe, verified: value?.verified === true };
  for (const key of ['projectDirectory', 'databaseDirectory', 'reportPath']) {
    if (typeof value?.[key] === 'string' && value[key].length <= 2048 && !/[\r\n\0]/.test(value[key])) result[key] = value[key];
  }
  return result;
}

export function createComposerServer({ engine, publicDirectory = PUBLIC } = {}) {
  if (!engine || ['catalog', 'plan', 'generate'].some(method => typeof engine[method] !== 'function')) throw new TypeError('catalog, plan and generate engine methods are required');
  const csrfToken = randomBytes(32).toString('hex');
  const jobs = new Map();
  const requests = new Map();
  let active;
  let latest;
  const server = createServer(async (request, response) => {
    secureHeaders(response);
    try {
      const authority = `127.0.0.1:${server.address().port}`;
      const origin = `http://${authority}`;
      // Opening the published local link is safe; cross-site API/subresource reads remain blocked.
      const initialNavigation = request.method === 'GET' && request.url === '/'
        && request.headers['sec-fetch-mode'] === 'navigate' && request.headers['sec-fetch-dest'] === 'document';
      const hostCount = request.rawHeaders.filter((_, index) => index % 2 === 0 && request.rawHeaders[index].toLowerCase() === 'host').length;
      if (hostCount !== 1 || request.headers.host !== authority
        || !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)
        || ['forwarded', 'x-forwarded-host', 'x-forwarded-proto'].some(key => request.headers[key] !== undefined)
        || (request.headers.origin !== undefined && request.headers.origin !== origin)
        || (request.headers['sec-fetch-site'] === 'cross-site' && !initialNavigation)) throw new HttpError(403, 'FORBIDDEN');
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw new HttpError(400, 'BAD_REQUEST');
      const url = new URL(request.url, origin);
      if (url.search || url.hash) throw new HttpError(400, 'BAD_REQUEST');
      const path = url.pathname;
      const mutation = ['/api/plan', '/api/jobs'].includes(path);
      if (request.method !== (mutation ? 'POST' : 'GET')) throw new HttpError(405, 'METHOD_NOT_ALLOWED');
      if (mutation) {
        const supplied = request.headers['x-composer-csrf'];
        if (request.headers.origin !== origin || typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied)
          || !timingSafeEqual(Buffer.from(supplied), Buffer.from(csrfToken))) throw new HttpError(403, 'FORBIDDEN');
      }
      if (path === '/api/session') {
        json(response, 200, { csrfToken, catalog: await engine.catalog(), job: latest ? jobs.get(latest) : null });
      } else if (mutation) {
        const input = await body(request);
        if (!keys(input, path === '/api/jobs' ? ['recipe', 'requestId'] : ['recipe'])) throw new HttpError(400, 'BAD_REQUEST');
        const recipe = validateComposerRequestRecipe(input.recipe);
        if (path === '/api/plan') {
          let plan;
          try { plan = await engine.plan(recipe); } catch { throw new HttpError(400, 'INVALID_RECIPE'); }
          json(response, 200, { plan });
        } else {
          if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) throw new HttpError(400, 'BAD_REQUEST');
          const previous = requests.get(input.requestId);
          if (previous) {
            if (previous.recipe !== JSON.stringify(recipe)) throw new HttpError(409, 'REQUEST_CONFLICT');
            json(response, 200, { job: jobs.get(previous.id) });
            return;
          }
          if (active) throw new HttpError(409, 'BUSY');
          // Reserve before async planning, so simultaneous requests cannot both start.
          const id = randomUUID();
          active = id;
          try { await engine.plan(recipe); } catch { active = undefined; throw new HttpError(400, 'INVALID_RECIPE'); }
          const job = { id, requestId: input.requestId, status: 'running', recipe, stage: 'resolve', message: STAGES.resolve, progress: 0 };
          latest = id;
          jobs.set(id, job);
          requests.set(input.requestId, { id, recipe: JSON.stringify(recipe) });
          // A short in-memory history supports retries without creating a persistent job service.
          while (jobs.size > 20) {
            const oldest = jobs.keys().next().value;
            jobs.delete(oldest);
            for (const [key, record] of requests) if (record.id === oldest) requests.delete(key);
          }
          json(response, 202, { job });
          Promise.resolve().then(() => engine.generate(recipe, { onProgress: event => {
            if (job.status !== 'running' || !event || !Object.hasOwn(STAGES, event.stage)) return;
            job.stage = event.stage;
            job.message = STAGES[event.stage];
            if (Number.isFinite(event.progress)) job.progress = Math.max(job.progress, Math.min(99, Math.max(0, event.progress)));
          } })).then(result => {
            job.status = 'succeeded'; job.stage = 'complete'; job.message = STAGES.complete; job.progress = 100;
            job.result = safeResult(result, recipe);
          }, () => {
            job.status = 'failed'; job.error = { code: 'GENERATION_FAILED', message: MESSAGES.GENERATION_FAILED };
            job.message = MESSAGES.GENERATION_FAILED;
          }).finally(() => { if (active === id) active = undefined; });
        }
      } else if (/^\/api\/jobs\/[0-9a-f-]{36}$/.test(path)) {
        const job = jobs.get(path.slice('/api/jobs/'.length));
        if (!job) throw new HttpError(404, 'NOT_FOUND');
        json(response, 200, { job });
      } else {
        const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
        if (!Object.hasOwn(assets, path)) throw new HttpError(404, 'NOT_FOUND');
        const [file, type] = assets[path];
        const content = await readFile(resolve(publicDirectory, file));
        response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        response.end(content);
      }
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
      json(response, error instanceof HttpError ? error.status : 500, { error: { code, message: MESSAGES[code] } });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  // Never expose a caller-controlled host option: this tool can only bind IPv4 loopback.
  return {
    server,
    async listen(port = 3100) {
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new TypeError('invalid local port');
      await new Promise((accept, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => { server.off('error', reject); accept(); });
      });
      return `http://127.0.0.1:${server.address().port}`;
    },
    async close() { server.closeAllConnections(); await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept())); },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--port' || !/^\d+$/.test(args[1]))) throw new Error('usage');
    const { createComposerEngine } = await import('./project-composer.mjs');
    const application = createComposerServer({ engine: await createComposerEngine() });
    const origin = await application.listen(args.length ? Number(args[1]) : 3100);
    process.stdout.write(`[project-composer] ${origin}\n`);
  } catch {
    process.stderr.write('[project-composer] 로컬 생성기를 시작하지 못했습니다. 포트 사용 여부와 --port 값을 확인해 주세요.\n');
    process.exitCode = 1;
  }
}
