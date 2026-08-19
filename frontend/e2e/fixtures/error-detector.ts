import { Page, expect } from '@playwright/test';

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
      if (occurrences === 0) {
        problems.push(`[EXPECTED ERROR 미발생] ${entry.id}: ${details} (${entry.reason})`);
      } else if (occurrences > entry.maxOccurrences) {
        problems.push(`[EXPECTED ERROR 초과] ${entry.id}: 최대 ${entry.maxOccurrences}회, 실제 ${occurrences}회 (${details})`);
      }
      return problems;
    });
  }
}

/** 전역 브라우저 에러, 콘솔 에러 및 네트워크 리소스 감시 가드. */
export class ConsoleErrorGuard {
  private readonly errors: string[] = [];
  private readonly ledger: ExpectedErrorLedger;

  constructor(private readonly page: Page, scope = 'unspecified') {
    this.ledger = new ExpectedErrorLedger(scope);
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

    this.page.on('response', (response) => {
      const status = response.status();
      if (status < 400) return;

      const request = response.request();
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

      // 로그인 리다이렉트처럼 main-frame 문서 탐색이 다른 탐색으로 대체될 때의 브라우저 취소만 허용한다.
      // fetch/XHR/RSC/image의 ERR_ABORTED는 모두 결함이며 아래 ledger/오류 경로로 간다.
      if (errorText === 'net::ERR_ABORTED' && request.isNavigationRequest() && request.frame() === this.page.mainFrame()) {
        return;
      }

      const event: ExpectedErrorEvent = {
        channel: 'requestfailed',
        url: request.url(),
        message: errorText,
        method: request.method(),
        status: null,
      };
      if (this.ledger.consume(event)) return;

      const message = `[NETWORK FAILED]: ${request.url()} - ${errorText}`;
      this.errors.push(message);
      console.error(`❌ ${message}`);
    });
  }

  async verify(): Promise<void> {
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
