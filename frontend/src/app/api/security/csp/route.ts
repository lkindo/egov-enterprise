import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP 위반 report는 브라우저가 보내는 비인증·신뢰 불가 텔레메트리다.
 * 이 endpoint는 로그 보조 신호일 뿐 보안 판정의 권위가 아니며, backend/API record를 소유하지 않는다.
 */
const ALLOWED_TYPES = ['application/csp-report', 'application/reports+json', 'application/json'];
const MAX_BODY_BYTES = 32 * 1024;
const MAX_REPORTS_PER_REQUEST = 10;
const PROCESS_WINDOW_MS = 60_000;
const PROCESS_REQUEST_LIMIT = 30;

// 프로세스 로컬 best-effort 상한이다. 여러 Next 인스턴스/edge isolate 사이에는 공유되지 않으므로
// 배포 전체 rate limit은 reverse proxy/WAF가 소유해야 한다. 여기서는 한 프로세스의 메모리·로그 폭주만 막는다.
let processWindowStartedAt = Date.now();
let processWindowCount = 0;

function sanitize(value: unknown): string {
  return String(value ?? '')
    .replace(new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}]`, 'g'), ' ')
    .slice(0, 512);
}

function sanitizeUrl(value: unknown): string {
  const raw = sanitize(value).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.search = '';
    url.hash = '';
    return sanitize(url.toString());
  } catch {
    return raw.split(/[?#]/, 1)[0] ?? '';
  }
}

function hasRateCapacity(now = Date.now()): boolean {
  if (now - processWindowStartedAt >= PROCESS_WINDOW_MS) {
    processWindowStartedAt = now;
    processWindowCount = 0;
  }
  if (processWindowCount >= PROCESS_REQUEST_LIMIT) return false;
  processWindowCount += 1;
  return true;
}

async function readBodyWithinLimit(request: NextRequest): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel('CSP report body limit exceeded');
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function POST(request: NextRequest) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(type)) return new NextResponse(null, { status: 415 });

  // 공격자가 큰 body를 선언한 경우 stream을 열기 전에 거부한다. 헤더가 없거나 거짓으로 작으면
  // 아래 reader의 실제 byte 누적 상한이 동일한 방어를 수행한다.
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  if (!hasRateCapacity()) {
    return new NextResponse(null, {
      status: 429,
      headers: { 'Retry-After': String(PROCESS_WINDOW_MS / 1000) },
    });
  }

  const raw = await readBodyWithinLimit(request);
  if (raw === null) return new NextResponse(null, { status: 413 });

  try {
    const parsed: unknown = JSON.parse(raw);
    const candidates = Array.isArray(parsed)
      ? parsed.map((entry) => isRecord(entry) && isRecord(entry.body) ? entry.body : entry)
      : [isRecord(parsed) && isRecord(parsed['csp-report']) ? parsed['csp-report'] : parsed];

    if (candidates.length > MAX_REPORTS_PER_REQUEST) {
      return new NextResponse(null, { status: 413 });
    }

    for (const candidate of candidates) {
      if (!isRecord(candidate)) continue;
      // query/fragment는 record locator·토큰을 포함할 수 있고 script sample은 사용자 입력이나
      // 페이지 데이터를 포함할 수 있으므로 아예 기록하지 않는다.
      console.warn('[csp-violation]', JSON.stringify({
        directive: sanitize(
          candidate['effective-directive']
          || candidate.effectiveDirective
          || candidate['violated-directive'],
        ),
        blocked: sanitizeUrl(candidate['blocked-uri'] || candidate.blockedURL),
        document: sanitizeUrl(candidate['document-uri'] || candidate.documentURL),
      }));
    }
  } catch {
    // 파싱 실패는 공격자에게 상세를 돌려주거나 원문을 로그에 남기지 않는다.
  }

  return new NextResponse(null, { status: 204 });
}
