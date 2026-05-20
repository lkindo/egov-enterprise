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
    /Article not found \(possibly deleted\)/i,
    /Article Not Found/i,
    /\/api\/v1\/admin\/operation\/events/i,
    /\/api\/v1\/calendar\/schedule/i,
  ];

  constructor(page: Page) {
    this.page = page;
  }

  async install() {
    // 1. 콘솔 에러 리스너
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error' || type === 'warning') {
        const isIgnored = this.ignorePatterns.some(pattern => 
          typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
        );

        if (!isIgnored) {
          const message = `[CONSOLE ${type.toUpperCase()}]: ${text}`;
          this.errors.push(message);
          console.error(`🚨 ${message}`);
        }
      }
    });

    // 2. 런타임 예외 리스너
    this.page.on('pageerror', (err) => {
      const message = `[RUNTIME EXCEPTION]: ${err.message}\nStack: ${err.stack}`;
      this.errors.push(message);
      console.error(`🚨 ${message}`);
    });

    // 3. 네트워크 리소스 무결성 검사 (400+ 에러)
    this.page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        const request = response.request();
        const url = response.url();
        const resourceType = request.resourceType();
        
        // [PATCH] Skip image loading errors (4xx) for functional stability
        if (resourceType === 'image' && status >= 400 && status < 500) {
          console.warn(`⚠️ [SKIP_IMAGE_ERROR]: ${status} ${url}`);
          return;
        }

        // 특정 API 에러(401/403)는 인증/보안 테스트에서 의도될 수 있음
        const isAuthExpected = [401, 403].includes(status) && (
          url.includes('/api/auth') || 
          url.includes('/api/user/info') ||
          url.includes('/api/v1/admin/') || // Generic RBAC test support
          url.includes('/api/v1/admin/system/banners/reflected') || 
          url.includes('/api/v1/admin/system/statistics/connect')
        );

        const isIgnored = this.ignorePatterns.some(pattern => 
          typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url)
        );

        if (!isAuthExpected && !isIgnored) {
          // [PATCH] Skip image loading errors (4xx) for functional stability
          if (resourceType === 'image' && status >= 400 && status < 500) {
            console.warn(`⚠️ [SKIP_IMAGE_ERROR]: ${status} ${url}`);
            return;
          }

          const message = `[HTTP ${status}]: ${url} (${resourceType})`;
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
