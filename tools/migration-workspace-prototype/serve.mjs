import { spawn } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 8769;
const FILES = [
  ['index.html', 'text/html; charset=utf-8'],
  ['app.js', 'text/javascript; charset=utf-8'],
  ['styles.css', 'text/css; charset=utf-8'],
  ['fonts/PretendardVariable.woff2', 'font/woff2'],
];
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), display-capture=(), usb=()',
};

export function parseArguments(args) {
  let port = DEFAULT_PORT;
  let open = true;
  let portSeen = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--no-open') {
      open = false;
    } else if (args[i] === '--port' && !portSeen && /^\d+$/.test(args[i + 1] ?? '')) {
      port = Number(args[++i]);
      portSeen = true;
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('포트는 1~65535 정수여야 합니다.');
    } else {
      // Do not echo unknown arguments: they may contain accidentally pasted secrets.
      throw new Error('사용법: node serve.mjs [--port 8769] [--no-open]');
    }
  }
  return { port, open };
}

/** A static simulator only. No path-derived file access, API, credentials, or migration execution. */
export async function startSimulationServer({ port = DEFAULT_PORT } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('유효하지 않은 포트입니다.');
  const assets = new Map();
  for (const [name, type] of FILES) {
    const path = new URL(name, import.meta.url);
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('정적 화면 파일은 일반 파일이어야 합니다.');
    assets.set(`/${name}`, { body: await readFile(path), type });
  }
  assets.set('/', assets.get('/index.html'));

  const server = createServer((request, response) => {
    const authority = `${HOST}:${server.address().port}`;
    const countHeader = name => request.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === name).length;
    const send = (status, body, type = 'text/plain; charset=utf-8', extra = {}) => {
      response.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), ...extra });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    const userDocumentNavigation = request.method === 'GET'
      && (request.url === '/' || request.url === '/index.html')
      && request.headers['sec-fetch-mode'] === 'navigate'
      && request.headers['sec-fetch-dest'] === 'document'
      && request.headers['sec-fetch-user'] === '?1'
      && request.headers.origin === undefined;
    if (countHeader('host') !== 1 || request.headers.host !== authority
        || countHeader('origin') > 1
        || (request.headers.origin !== undefined && request.headers.origin !== `http://${authority}`)
        || (request.headers['sec-fetch-site'] === 'cross-site' && !userDocumentNavigation)) {
      send(403, '로컬 시뮬레이션 주소에서만 접근할 수 있습니다.\n');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(405, '정적 화면 조회만 지원합니다.\n', undefined, { Allow: 'GET, HEAD' });
      return;
    }
    // Match the raw target, not a normalized/decoded path. Queries and traversal are not routes.
    const asset = assets.get(request.url);
    if (!asset) {
      send(404, '제공하지 않는 경로입니다.\n');
      return;
    }
    send(200, asset.body, asset.type);
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => {
      server.removeListener('error', reject);
      resolveListen();
    });
  });
  return server;
}

function openBrowser(url) {
  const [command, args] = process.platform === 'win32'
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = spawn(command, args, { shell: false, windowsHide: true, detached: true, stdio: 'ignore' });
  const warn = () => console.error('브라우저를 자동으로 열지 못했습니다. 위 주소를 직접 열어 주세요.');
  child.once('error', warn);
  child.once('exit', code => { if (code !== null && code !== 0) warn(); });
  child.unref();
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  let server;
  try {
    server = await startSimulationServer(options);
  } catch (error) {
    if (error.code === 'EADDRINUSE') throw new Error(`127.0.0.1:${options.port} 포트를 이미 사용 중입니다. --port로 다른 포트를 선택하세요.`);
    throw new Error('정적 시뮬레이션 서버를 시작하지 못했습니다. 파일과 로컬 포트 사용 권한을 확인하세요.');
  }
  const url = `http://${HOST}:${server.address().port}/index.html#start`;
  console.log(`이관 작업공간 · 정적 시뮬레이션 전용\n${url}\n실제 DB 연결·파일 업로드·AI 호출·CLI 이관 실행은 제공하지 않습니다.\n종료: Ctrl+C`);
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      console.log('정적 시뮬레이션 서버를 종료했습니다.');
    });
    server.closeAllConnections();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  if (options.open) openBrowser(url);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
