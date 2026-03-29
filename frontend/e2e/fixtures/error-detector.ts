import { Page } from '@playwright/test';

/**
 * 전역 브라우저 에러 감시를 위한 유틸리티 (순수 Page 리스너 방식)
 */
export async function setupGlobalErrorDetection(page: Page) {
  // 1. 콘솔 에러 리스너
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // 특정 무해한 경고는 무시
      if (!text.includes('React DevTools') && 
          !text.includes('unsupported by') && 
          !text.includes('Lit is in dev mode')) {
        
        console.error(`🚨 [DETECTED CONSOLE ERROR]: ${text}`);
        // 테스트를 즉시 실패 처리 (throw 시 Playwright가 catch하여 실패로 처리함)
        throw new Error(`[BROWSER CONSOLE ERROR] ${text}`);
      }
    }
  });

  // 2. 런타임 예외 리스너
  page.on('pageerror', (err) => {
    console.error(`🚨 [DETECTED RUNTIME EXCEPTION]: ${err.message}`);
    throw new Error(`[BROWSER RUNTIME ERROR] ${err.message}`);
  });
}
