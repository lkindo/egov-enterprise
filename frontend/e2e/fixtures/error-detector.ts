import { Page } from '@playwright/test';

/**
 * [Item 1 & 3] 전역 브라우저 에러 및 네트워크 리소스 감시 유틸리티
 */
export async function setupGlobalErrorDetection(page: Page) {
  // 1. 콘솔 에러 리스너 [Item 1]
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // 특정 무해한 경고나 외부 라이브러리 경고는 무시
      if (!text.includes('React DevTools') && 
          !text.includes('unsupported by') && 
          !text.includes('Lit is in dev mode')) {
        
        console.error(`🚨 [CONSOLE ERROR]: ${text}`);
        // Note: 즉시 throw 시 가끔 비동기 레이스 컨디션 발생 가능하므로, 
        // 실제 운영 시에는 배열에 모았다가 test.afterEach에서 검증하는 것이 안정적입니다.
        // 현재는 요구사항에 따라 즉시 에러 가시화
      }
    }
  });

  // 2. 런타임 예외 리스너 [Item 1]
  page.on('pageerror', (err) => {
    console.error(`🚨 [RUNTIME EXCEPTION]: ${err.message}\nStack: ${err.stack}`);
    throw new Error(`[BROWSER RUNTIME ERROR] ${err.message}\n${err.stack}`);
  });

  // 3. 네트워크 리소스 무결성 검사 [Item 3]
  // 이미지, CSS, 폰트 등 정적 리소스 로드 실패(404, 500 등) 감지
  page.on('response', (response) => {
    const status = response.status();
    const request = response.request();
    const url = response.url();
    
    // 400 이상의 상태 코드 중 API fetch가 아닌 정적 리소스(이미지, 스타일, 스크립트 등) 로드 실패 체크
    if (status >= 400) {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'script', 'media'].includes(resourceType)) {
        console.error(`❌ [RESOURCE LOAD FAILED]: ${url} [${status}] (${resourceType})`);
        // 정적 리소스 로드 실패는 UX에 치명적일 수 있으므로 기록
      } else if (status >= 500) {
        console.error(`🔥 [SERVER ERROR ON REQUEST]: ${url} [${status}]`);
      }
    }
  });
}
