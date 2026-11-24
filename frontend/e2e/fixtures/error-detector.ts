import { type Frame, type Page, type Request, type Response, expect } from '@playwright/test';

export type ExpectedErrorChannel = 'console' | 'pageerror' | 'response' | 'requestfailed';
export type ExpectedErrorPattern = string | RegExp;

/** 의도된 브라우저 오류의 감사 가능한 ledger 항목. */
export interface ExpectedErrorEntry {
  id: string;
  specScope: ExpectedErrorPattern;
  channel: ExpectedErrorChannel;
  urlPattern: ExpectedErrorPattern | null;
  messagePattern: ExpectedErrorPattern | null;
  method: string | null;
  status: number | null;
  minOccurrences?: number;
  maxOccurrences: number;
  reason: string;
  expiresAt: string;
}

export interface ExpectedErrorEvent {
  channel: ExpectedErrorChannel;
  url: string | null;
  message: string | null;
  method: string | null;
  status: number | null;
}

interface LedgerRecord {
  entry: ExpectedErrorEntry;
  occurrences: number;
}

function matches(pattern: ExpectedErrorPattern, value: string): boolean {
  if (typeof pattern === 'string') return value.includes(pattern);
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function formatPattern(pattern: ExpectedErrorPattern | null): string {
  if (pattern === null) return '-';
  return typeof pattern === 'string' ? pattern : pattern.toString();
}

export function buildSpecScope(file: string, title: string): string {
  const fileName = file.split(/[\\/]/).pop() ?? file;
  return `${fileName} :: ${title}`;
}

/** 등록만 해 두고 무제한 무시하는 allow-list가 아니라, 반드시 소진·만료되는 오류 ledger다. */
export class ExpectedErrorLedger {
  private readonly records: LedgerRecord[] = [];

  constructor(
    private readonly currentScope: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  register(entry: ExpectedErrorEntry): void {
    if (!/^E2E-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(entry.id)) {
      throw new Error(`expected-error ID는 안정적인 E2E-* 형식이어야 함: ${entry.id}`);
    }
    if (this.records.some((record) => record.entry.id === entry.id)) {
      throw new Error(`expected-error ID 중복: ${entry.id}`);
    }
    const scopeMatches = typeof entry.specScope === 'string'
      ? entry.specScope === this.currentScope
      : matches(entry.specScope, this.currentScope);
    if (!scopeMatches) {
      throw new Error(`expected-error ${entry.id} scope 불일치: ${this.currentScope}`);
    }
    if (entry.urlPattern === null && entry.messagePattern === null) {
      throw new Error(`expected-error ${entry.id}에는 urlPattern 또는 messagePattern이 필요함`);
    }
    if (!Number.isInteger(entry.maxOccurrences) || entry.maxOccurrences < 1) {
      throw new Error(`expected-error ${entry.id} maxOccurrences는 1 이상의 정수여야 함`);
    }
    if (entry.minOccurrences !== undefined && (!Number.isInteger(entry.minOccurrences) || entry.minOccurrences < 0)) {
      throw new Error(`expected-error ${entry.id} minOccurrences는 0 이상의 정수여야 함`);
    }
    if (entry.reason.trim().length < 10) {
      throw new Error(`expected-error ${entry.id} reason이 너무 짧음`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expiresAt)) {
      throw new Error(`expected-error ${entry.id} expiresAt은 YYYY-MM-DD 형식이어야 함`);
    }
    const expiresAt = new Date(`${entry.expiresAt}T23:59:59.999Z`);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < this.now().getTime()) {
      throw new Error(`expected-error ${entry.id}가 만료됨: ${entry.expiresAt}`);
    }

    if (entry.channel === 'response') {
      if (entry.urlPattern === null || entry.method === null || entry.status === null) {
        throw new Error(`response expected-error ${entry.id}에는 url/method/status가 모두 필요함`);
      }
    } else if (entry.channel === 'requestfailed') {
      if (entry.urlPattern === null || entry.method === null || entry.status !== null) {
        throw new Error(`requestfailed expected-error ${entry.id}에는 url/method와 status:null이 필요함`);
      }
    } else if (entry.method !== null || entry.status !== null || entry.messagePattern === null) {
      throw new Error(`${entry.channel} expected-error ${entry.id}에는 message와 method/status:null이 필요함`);
    }

    this.records.push({ entry, occurrences: 0 });
  }

  consume(event: ExpectedErrorEvent): boolean {
    const record = this.records.find(({ entry }) => {
      if (entry.channel !== event.channel) return false;
      if (entry.urlPattern !== null && (event.url === null || !matches(entry.urlPattern, event.url))) return false;
      if (entry.messagePattern !== null && (event.message === null || !matches(entry.messagePattern, event.message))) return false;
      if (entry.method !== null && entry.method.toUpperCase() !== event.method?.toUpperCase()) return false;
      return entry.status === null || entry.status === event.status;
    });

    if (!record) return false;
    record.occurrences += 1;
    return true;
  }

  violations(): string[] {
    return this.records.flatMap(({ entry, occurrences }) => {
      const details = `url=${formatPattern(entry.urlPattern)}, message=${formatPattern(entry.messagePattern)}`;
      const problems: string[] = [];
      const expiresAt = new Date(`${entry.expiresAt}T23:59:59.999Z`);
      if (expiresAt.getTime() < this.now().getTime()) {
        problems.push(`[EXPECTED ERROR EXPIRED] ${entry.id}: ${entry.expiresAt} (${entry.reason})`);
      }
      const minRequired = entry.minOccurrences ?? 1;
      if (occurrences < minRequired) {
        problems.push(`[EXPECTED ERROR 미발생] ${entry.id}: ${details} (${entry.reason})`);
      } else if (occurrences > entry.maxOccurrences) {
        problems.push(`[EXPECTED ERROR 초과] ${entry.id}: 최대 ${entry.maxOccurrences}회, 실제 ${occurrences}회 (${details})`);
      }
      return problems;
    });
  }
}

/** 결과를 받을 문서가 사라지면 잃을 것이 없는 읽기 요청. 쓰기는 끊기면 저장이 잘렸을 수 있다. */
const READ_METHODS = new Set(['GET', 'HEAD']);

/** 문서를 바꾸지 않는 탐색 응답 — 리다이렉트는 다음 요청으로 이어지고, 204·205 는 탐색을 멈춘다. */
const NON_COMMITTING_STATUSES = new Set([204, 205, 301, 302, 303, 307, 308]);

/** 이 탐색 응답으로 문서가 바뀔 수 있는가. 내려받기로 바뀌는 응답도 문서를 바꾸지 않는다. */
function mayCommitDocument(response: Response): boolean {
  if (NON_COMMITTING_STATUSES.has(response.status())) return false;
  return !/^\s*attachment/i.test(response.headers()['content-disposition'] ?? '');
}

/** 커밋된 주소는 조각(#…)을 달지만 탐색 요청의 주소에는 없다. */
const withoutFragment = (url: string) => url.split('#', 1)[0];

/** 응답 없이 문서가 바뀌는 주소. 같은 문서 안 이동(pushState)으로는 갈 수 없다. */
const LOCAL_DOCUMENT_URL = /^(?:about|data):/i;

/** 실패 묶음과 framenavigated 는 연달아 도착한다. 응답 없는 커밋에서 이보다 먼저 끊긴 취소는 묶음이 아니다. */
const COMMIT_BURST_MS = 100;

/** 서비스 워커의 요청은 프레임이 없어 frame() 이 던진다. */
function frameOf(request: Request): Frame | null {
  try {
    return request.frame();
  } catch {
    return null;
  }
}

/** 전역 브라우저 에러, 콘솔 에러 및 네트워크 리소스 감시 가드. */
export class ConsoleErrorGuard {
  private readonly errors: string[] = [];
  private readonly ledger: ExpectedErrorLedger;
  /**
   * 새 문서 커밋 때 Playwright 가 합성하는 실패 묶음을 가르는 상태.
   *
   * Playwright 1.65 부터 새 문서가 커밋되면 이전 문서에서 진행 중이던 요청을 그 자리에서 한꺼번에
   * `net::ERR_ABORTED` 로 실패 보고한 뒤 framenavigated 를 낸다(crPage `_onFrameNavigated` →
   * `frame._failInflightRequests`; 1.64 까지는 보고 없이 사라졌다). 클라이언트가 받는 순서는 새 문서의 응답 →
   * 실패 묶음 → framenavigated 다(1.65.1, 요청 가로채기를 켜도 같음 — 2026-11-24 실측).
   *
   * 그래서 끊긴 읽기 요청은 바로 버리지 않고 보류한다. 같은 프레임에 다른 네트워크 사건(요청·응답·완료,
   * 기다리던 탐색의 실패 — 다운로드·204 로 끝난 탐색)이 끼면 보류분은 앱의 취소로 확정한다. 같은 문서 안
   * 이동(pushState·조각)도 framenavigated 를 내므로, framenavigated 에서는 문서가 실제로 바뀐 커밋일 때만 보류분을
   * 면제한다: 문서를 바꿀 수 있는 탐색 응답(리다이렉트·204·205·내려받기가 아닌 것)을 받고 기다리던 그 탐색의
   * 주소로 커밋된 것이거나(그 응답이 앞선 보류분을 이미 확정했으므로 남은 것은 응답 뒤의 묶음이다), 응답 없이
   * 바뀌는 주소(about:blank 등)로 커밋되며 COMMIT_BURST_MS 안에 끊긴 것. 그 밖의 framenavigated 와 검증 때 남은
   * 보류분은 결함이다. 남는 틈: 최종 문서 응답과 커밋 사이(수 ms)에 다른 사건 없이 앱이 취소한 읽기나 기다리던
   * 탐색과 같은 주소로의 같은 문서 안 이동, 응답 없는 커밋 COMMIT_BURST_MS 안의 앱 취소, 형식 때문에 내려받기로
   * 바뀌는 응답, 요청 가로채기로 바꾼 탐색 주소(E2E 는 쓰지 않는다)는 묶음과 구별되지 않거나 거짓 red 가 된다.
   */
  private readonly awaitingCommit = new Map<Frame, Request>();
  private readonly abortsBeforeCommit = new Map<Frame, Array<{ request: Request; at: number }>>();

  constructor(private readonly page: Page, scope = 'unspecified', private readonly clock: () => Date = () => new Date()) {
    this.ledger = new ExpectedErrorLedger(scope, clock);
  }

  expectErrors(entries: ExpectedErrorEntry[]): void {
    entries.forEach((entry) => this.ledger.register(entry));
  }

  async install(): Promise<void> {
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      const isHydrationMismatch =
        /Hydration failed/i.test(text) ||
        /Text content did not match/i.test(text) ||
        /Prop.*did not match/i.test(text) ||
        /Did not expect server HTML/i.test(text) ||
        /error happened outside of a Suspense boundary/i.test(text) ||
        text.includes('🌊 [HYDRATION MISMATCH DETECTED]');

      if (isHydrationMismatch) {
        const message = `🌊 [HYDRATION MISMATCH]: ${text}`;
        this.errors.push(message);
        console.error(`🚨 ${message}`);
        return;
      }

      // Chromium이 HTTP 실패를 console에도 복제하는 정형 문구다. 같은 실패는 response 리스너가
      // URL·method·status로 더 강하게 판정하므로 이 중복 표현만 제외한다. DNS/abort 문구는 제외하지 않는다.
      if (/^Failed to load resource: the server responded with a status of \d{3}/i.test(text)) return;

      const isFrameworkNoise =
        ((type === 'log' || type === 'info') && text.includes('React DevTools')) ||
        (type === 'warning' && text.includes('Lit is in dev mode'));
      if (isFrameworkNoise) return;

      // SockJS 핸드셰이크가 끝나기 전에 페이지가 이동하면 Chromium이 이 경고를 남긴다.
      // 알림 소켓을 붙이는 화면이면 어느 테스트에서나 발생하는 전송 계층 정리(teardown)
      // 부산물이며 제품 신호가 아니다. 종전 구현도 같은 문구를 명시적으로 무시했고
      // ledger 로 옮기는 과정에서 대체 없이 사라져 무관한 테스트 다수가 red 가 됐다.
      // 테스트별 ledger 항목으로 두지 않는 이유: 이 경고는 특정 테스트의 의도가 아니라
      // 화면 구성에 따라붙으므로, 미발생 시 오히려 ledger 가 실패한다(occurrences === 0).
      const isTransportTeardown =
        type === 'warning'
        && /^WebSocket connection to 'wss?:\/\/[^']*' failed: (?:WebSocket is closed before the connection is established\.|Error in connection establishment)/
          .test(text);
      if (isTransportTeardown) return;

      const isSystemLog =
        text.includes('[Fast Refresh]') ||
        text.includes('ready in') ||
        text.includes('event -') ||
        text.includes('compiled successfully') ||
        text.includes('Attention: ') ||
        text.includes('[HMR]') ||
        text.includes('Subscribed to private notifications') ||
        text.startsWith('webpack');
      if ((type === 'log' || type === 'info') && isSystemLog) return;

      if (!['error', 'warning', 'log', 'info'].includes(type) || text.trim().length === 0) return;
      if (this.ledger.consume({
        channel: 'console',
        url: msg.location().url || null,
        message: text,
        method: null,
        status: null,
      })) return;

      const prefix = type === 'error'
        ? '[CONSOLE ERROR]'
        : type === 'warning'
          ? '⚠️ [FORBIDDEN CONSOLE WARNING]'
          : '⚠️ [FORBIDDEN CONSOLE LOG]';
      const message = `${prefix}: ${text}`;
      this.errors.push(message);
      console.error(`🚨 ${message}`);
    });

    this.page.on('pageerror', (err) => {
      if (this.ledger.consume({
        channel: 'pageerror',
        url: this.page.url() || null,
        message: err.message,
        method: null,
        status: null,
      })) return;

      const message = `[RUNTIME EXCEPTION]: ${err.message}\nStack: ${err.stack}`;
      this.errors.push(message);
      console.error(`🚨 ${message}`);
    });

    // 같은 프레임에 네트워크 사건이 끼면 보류한 취소는 커밋 때의 실패 묶음이 아니다.
    const interruptAbortsBeforeCommit = (request: Request) => {
      const frame = frameOf(request);
      if (frame) this.settleAbortsAsDefects(frame);
    };
    this.page.on('request', interruptAbortsBeforeCommit);
    this.page.on('requestfinished', interruptAbortsBeforeCommit);

    this.page.on('framenavigated', (frame) => {
      const pending = this.abortsBeforeCommit.get(frame) ?? [];
      this.abortsBeforeCommit.delete(frame);
      const awaited = this.awaitingCommit.get(frame);
      const networkCommit = awaited !== undefined && withoutFragment(frame.url()) === withoutFragment(awaited.url());
      const localCommit = LOCAL_DOCUMENT_URL.test(frame.url());
      // 같은 문서 안 이동이면 기다리던 탐색은 아직 커밋 전이다.
      if (networkCommit || localCommit) this.awaitingCommit.delete(frame);
      const now = this.clock().getTime();
      for (const { request, at } of pending) {
        // 문서가 실제로 바뀐 커밋 직전의 묶음이면 이전 문서의 읽기다. 그 밖(같은 문서 안 이동 등)은 앱의 취소다.
        if (networkCommit || (localCommit && now - at <= COMMIT_BURST_MS)) continue;
        this.reportRequestFailure(request, 'net::ERR_ABORTED');
      }
    });

    this.page.on('response', (response) => {
      const request = response.request();
      interruptAbortsBeforeCommit(request);
      // 리다이렉트·204·205·내려받기 응답의 주소로는 커밋되지 않는다 — 기다리지 않는다.
      if (request.isNavigationRequest() && mayCommitDocument(response)) {
        const frame = frameOf(request);
        if (frame) this.awaitingCommit.set(frame, request);
      }

      const status = response.status();
      if (status < 400) return;

      const event: ExpectedErrorEvent = {
        channel: 'response',
        url: response.url(),
        message: null,
        method: request.method(),
        status,
      };
      if (this.ledger.consume(event)) return;

      const message = `[HTTP ${status} ${request.method()}]: ${response.url()} (${request.resourceType()})`;
      this.errors.push(message);
      console.error(`❌ ${message}`);
    });

    this.page.on('requestfailed', (request) => {
      const errorText = request.failure()?.errorText || 'Unknown error';
      const frame = frameOf(request);
      // 기다리던 탐색이 다운로드·204 로 끝나면 문서는 바뀌지 않는다 — 보류분은 앱의 취소다.
      if (frame && this.awaitingCommit.get(frame) === request) {
        this.awaitingCommit.delete(frame);
        this.settleAbortsAsDefects(frame);
      }

      // 브라우저가 스스로 취소한 **문서 및 화면 라우트 요청**은 앱 결함이 아니다.
      //   ① 탐색이 다른 탐색으로 대체됨(로그인 리다이렉트 등)
      //   ② App Router 가 링크를 미리 당겨오다(RSC/fetch prefetch) 실제 이동이 먼저 일어나 취소
      // 어느 쪽도 요청이 유실되지 않는다 — 실제 이동은 별도 요청으로 다시 나간다.
      // 비-API 화면 라우트의 fetch/document 취소 및 `_rsc=` prefetch 취소는 허용하고,
      // `/api/`로 향하는 실제 비즈니스 API 요청의 fetch/XHR 취소는 결함으로 남긴다.
      const url = request.url();
      const isApiRequest = /\/api\//.test(url);
      if (errorText === 'net::ERR_ABORTED'
        && (!isApiRequest || request.resourceType() === 'document' || /[?&]_rsc=/.test(url))) {
        return;
      }
      // ③ 새 문서가 커밋되며 이전 문서의 읽기 요청이 끊김 — 그 문서는 사라져 결과를 받을 곳이 없고, 새 문서가
      //    필요한 조회를 다시 보낸다. 시험이 화면의 첫 조회가 시작된 직후 다음 문서로 이동하면 생긴다. 여기서는
      //    보류만 하고 판정은 framenavigated·끼어든 사건·검증이 한다(awaitingCommit 설명). 쓰기 요청의 중단은
      //    저장이 잘렸을 수 있어 보류하지 않는다.
      if (errorText === 'net::ERR_ABORTED' && frame && READ_METHODS.has(request.method())) {
        const pending = this.abortsBeforeCommit.get(frame) ?? [];
        this.abortsBeforeCommit.set(frame, [...pending, { request, at: this.clock().getTime() }]);
        return;
      }

      this.reportRequestFailure(request, errorText);
    });
  }

  /** 커밋 전에 보류한 취소를 앱의 취소로 확정한다. */
  private settleAbortsAsDefects(frame: Frame): void {
    const pending = this.abortsBeforeCommit.get(frame);
    if (!pending) return;
    this.abortsBeforeCommit.delete(frame);
    for (const { request } of pending) this.reportRequestFailure(request, 'net::ERR_ABORTED');
  }

  private reportRequestFailure(request: Request, errorText: string): void {
    const event: ExpectedErrorEvent = {
      channel: 'requestfailed',
      url: request.url(),
      message: errorText,
      method: request.method(),
      status: null,
    };
    if (this.ledger.consume(event)) return;

    // resourceType 을 함께 남긴다. 취소·실패의 성격은 URL 만으로 판정할 수 없고,
    // 이것이 없으면 CI 로그만으로 원인을 좁히지 못한다(실제로 한 회차를 그렇게 소모했다).
    const message = `[NETWORK FAILED]: ${request.url()} (${request.resourceType()}) - ${errorText}`;
    this.errors.push(message);
    console.error(`❌ ${message}`);
  }

  async verify(): Promise<void> {
    // 커밋으로 이어지지 않은 채 남은 보류분은 앱의 취소다.
    for (const frame of [...this.abortsBeforeCommit.keys()]) this.settleAbortsAsDefects(frame);
    this.errors.push(...this.ledger.violations());
    if (this.errors.length > 0) {
      const errorSummary = this.errors.join('\n');
      expect(this.errors, `Detected ${this.errors.length} browser errors during test:\n${errorSummary}`).toHaveLength(0);
    }
  }
}

export async function setupGlobalErrorDetection(page: Page) {
  const guard = new ConsoleErrorGuard(page);
  await guard.install();
  return guard;
}
