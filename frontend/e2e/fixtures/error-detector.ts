import { Page, expect } from '@playwright/test';

/**
 * 전역 브라우저 에러, 콘솔 에러 및 네트워크 리소스 감시 가드
 */
export class ConsoleErrorGuard {
  private errors: string[] = [];
  private page: Page;
  
  // 무시할 로그 패턴들 (정규식 또는 문자열)
  private ignorePatterns: (string | RegExp)[] = [
    'React DevTools',
    'unsupported by',
    'Lit is in dev mode',
    /401 \(Unauthorized\)/i, // 인증 체크 시 발생하는 401은 실패로 간주하지 않음
    /Check your network connection/i, 
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
        
        // 특정 API 에러(의도된 에러 처리 등)를 제외하고 정적 자산 로드 실패 위주로 수집 가능
        if (['image', 'stylesheet', 'font', 'script', 'media'].includes(resourceType)) {
          const message = `[RESOURCE LOAD FAILED]: ${url} [${status}] (${resourceType})`;
          this.errors.push(message);
          console.error(`❌ ${message}`);
        }
      }
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
