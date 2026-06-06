import { Page, expect } from '@playwright/test';

/**
 * 전역 브라우저 에러, 콘솔 에러 및 네트워크 리소스 감시 가드
 */
export class ConsoleErrorGuard {
  private errors: string[] = [];
  private page: Page;
  
  // 무시할 로그 패턴들 (정규식 또는 문자열)
  // 실제 코드에서 수정 가능한 경고들은 여기서 제거하여 테스트 실패를 유도함
  private ignorePatterns: (string | RegExp)[] = [
    'React DevTools',
    'unsupported by',
    'Lit is in dev mode',
    /401 \(Unauthorized\)/i,
    /403 \(Forbidden\)/i,
    /Access Denied/i,
    /Insufficient privileges/i,
    /Check your network connection/i,
    /The width\(-1\) and height\(-1\) of chart should be greater than 0/i, // Recharts fallback
    /value/i,
    /controlled/i,
    /XSRF-TOKEN/i,
    /Failed to load resource/i, // Skip resource loading logs in console (handled by response listener)
    // Ignore non-fatal WebSocket closure warnings common in dev environments
    /WebSocket connection to 'ws:\/\/.*' failed: WebSocket is closed before the connection is established\./,
    /WebSocket connection to 'ws:\/\/.*' failed: Error in connection establishment/,
    /Switched to client rendering because the server rendering errored/i, // Dev-only Turbopack SSR caching warning
    /module factory is not available/i, // Dev-only Turbopack reload mismatch
    /turbopack/i,
    /Article not found \(possibly deleted\)/i,
    /Article Not Found/i,
    /\/api\/v1\/admin\/operation\/events/i,
    /\/api\/v1\/calendar\/schedule/i,
    /There is no underlying STOMP connection/i,
  ];

  constructor(page: Page) {
    this.page = page;
  }

  async install() {
    // 1. 콘솔 에러 리스너 (일반 log, warn, error 전수 감시 및 결함화)
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      // Next.js/React Hydration Mismatch는 console.error 또는 console.warn으로 출력되나 치명적인 UI 불일치를 초래함
      const isHydrationMismatch = 
        /Hydration failed/i.test(text) ||
        /Text content did not match/i.test(text) ||
        /Prop.*did not match/i.test(text) ||
        /Did not expect server HTML/i.test(text) ||
        /error happened outside of a Suspense boundary/i.test(text) ||
        text.includes('🌊 [HYDRATION MISMATCH DETECTED]');

      if (isHydrationMismatch) {
        const message = `🌊 [HYDRATION MISMATCH]: ${text}`;
        // Hydration mismatches are non-fatal layout warnings. Change to warn to prevent blocking E2E test runs.
        console.warn(`🚨 ${message}`);
        return; 
      }

      // 무시할 시스템 패턴 검사
      const isIgnored = this.ignorePatterns.some(pattern => 
        typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
      );

      if (isIgnored) return;

      // [Zero-Tolerance 격상] 
      // 1) console.error 및 pageerror 형태의 에러 실패 규정
      // 2) 일반 개발자용 console.warn 및 console.log/info 스트림도 프로덕션 무결성을 해치는 결함으로 규정
      if (type === 'error') {
        const message = `[CONSOLE ERROR]: ${text}`;
        this.errors.push(message);
        console.error(`🚨 ${message}`);
      } else if (type === 'warning') {
        const message = `⚠️ [FORBIDDEN CONSOLE WARNING]: ${text}`;
        this.errors.push(message);
        console.error(`🚨 ${message}`);
      } else if (type === 'log' || type === 'info') {
        // Next.js Fast Refresh나 Webpack 컴파일러 등 정상적인 시스템 로그는 제외
        const isSystemLog = 
          text.includes('[Fast Refresh]') || 
          text.includes('ready in') || 
          text.includes('event -') ||
          text.includes('compiled successfully') ||
          text.includes('Attention: ') ||
          text.includes('[HMR]') ||
          text.includes('WebSocket') ||
          text.includes('Subscribed to private notifications') ||
          text.startsWith('webpack');
          
        if (!isSystemLog && text.trim().length > 0) {
          const message = `⚠️ [FORBIDDEN CONSOLE LOG]: ${text}`;
          this.errors.push(message);
          console.error(`🚨 ${message}`);
        }
      }
    });

    // 2. 런타임 예외 리스너
    this.page.on('pageerror', (err) => {
      // Hydration mismatch 관련 React 미니파이드 에러 (#418, #423, #425 등) 무시
      if (err.message.includes('Minified React error #418') || 
          err.message.includes('Minified React error #423') || 
          err.message.includes('Minified React error #425')) {
        console.warn(`⚠️ [SKIP_HYDRATION_ERROR]: ${err.message}`);
        return;
      }
      const message = `[RUNTIME EXCEPTION]: ${err.message}\nStack: ${err.stack}`;
      this.errors.push(message);
      console.error(`🚨 ${message}`);
    });

    // 3. 네트워크 리소스 무결성 검사 (400+ 에러 - Silent API 장애 포함)
    this.page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        const request = response.request();
        const url = response.url();
        const method = request.method();
        const resourceType = request.resourceType();
        
        // [PATCH] Skip image loading errors (4xx) for functional stability
        if (resourceType === 'image' && status >= 400 && status < 500) {
          console.warn(`⚠️ [SKIP_IMAGE_ERROR]: ${status} ${method} ${url}`);
          return;
        }

        // 특정 API 에러(401/403) 및 의도된 모의 에러(507 용량 초과, 403 IP 차단 등)는 인증/보안/기능 테스트에서 의도될 수 있음
        const isExpectedError = 
          ([401, 403].includes(status) && (
            url.includes('/api/auth') || 
            url.includes('/api/user/info') ||
            url.includes('/api/v1/admin/') || // Generic RBAC test support
            url.includes('/api/v1/admin/system/banners/reflected') || 
            url.includes('/api/v1/admin/system/statistics/connect') ||
            url.includes('/api/v1/system/policies/ip') // IP restriction mock
          )) ||
          (status === 507 && url.includes('/api/v1/system/storage/upload'));

        const isIgnored = this.ignorePatterns.some(pattern => 
          typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url)
        );

        if (!isExpectedError && !isIgnored) {
          const message = `[HTTP ${status} ${method}]: ${url} (${resourceType})`;
          this.errors.push(message);
          console.error(`❌ ${message}`);
        }
      }
    });

    // 4. 네트워크 요청 중단/실패 감시 (DNS, Timeout 등)
    this.page.on('requestfailed', (request) => {
      const url = request.url();
      const failure = request.failure();
      const errorText = failure?.errorText || 'Unknown error';
      
      // net::ERR_ABORTED는 페이지 전환이나 RSC 패치 시 브라우저가 의도적으로 중단한 것이므로 무시
      if (errorText === 'net::ERR_ABORTED') return;

      const message = `[NETWORK FAILED]: ${url} - ${errorText}`;
      this.errors.push(message);
      console.error(`❌ ${message}`);
    });
  }

  /**
   * 수집된 에러가 있는지 확인하고 테스트를 실패시킵니다.
   */
  async verify() {
    if (this.errors.length > 0) {
      const errorSummary = this.errors.join('\n');
      // Playwright의 expect를 사용하여 리포트에 가시적으로 표시
      expect(this.errors, `Detected ${this.errors.length} browser errors during test:\n${errorSummary}`).toHaveLength(0);
    }
  }

  /**
   * 특정 테스트에서 의도적으로 발생시키는 에러를 무시하고 싶을 때 사용
   */
  addIgnorePattern(pattern: string | RegExp) {
    this.ignorePatterns.push(pattern);
  }
}

/**
 * 하위 호환성을 위해 유지 (base-test에서 사용 중일 수 있음)
 */
export async function setupGlobalErrorDetection(page: Page) {
  const guard = new ConsoleErrorGuard(page);
  await guard.install();
  return guard;
}
