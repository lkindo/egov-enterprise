import { test, expect } from './fixtures/base-test';

test.describe('콘솔 감사(Audit) 테스트 (서버 독립형)', () => {
  test('정상 페이지에서는 에러 없이 성공해야 함', async ({ page }) => {
    // 빈 페이지 로드
    await page.setContent('<html><body><h1>정상 페이지</h1></body></html>');
    // 명시적인 에러가 없으므로 성공해야 함
  });

  test('의도적으로 콘솔 에러를 발생시키면 테스트가 실패해야 함', async ({ page }) => {
    await page.setContent('<html><body><h1>에러 발생 페이지</h1></body></html>');
    
    // 브라우저 내부에서 콘솔 에러 발생
    await page.evaluate(() => {
      console.error('이것은 테스트를 실패시키기 위한 의도적인 콘솔 에러입니다.');
    });
    
    // 이 테스트는 verify() 단계에서 실패해야 함 (에러 메시지가 수집됨)
  });

  test('의도적으로 런타임 예외를 발생시키면 테스트가 실패해야 함', async ({ page }) => {
    await page.setContent('<html><body><h1>예외 발생 페이지</h1></body></html>');
    
    // 런타임 예외 발생
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('의도적인 런타임 예외');
      }, 50);
    });
    
    await page.waitForTimeout(200); // 예외가 발생할 시간을 줌
  });

  test('특정 에러를 무시하도록 설정하면 성공해야 함', async ({ page, consoleGuard }) => {
    await page.setContent('<html><body><h1>에러 무시 페이지</h1></body></html>');
    
    // 무시할 패턴 등록
    consoleGuard.addIgnorePattern('허용된 에러');
    
    await page.evaluate(() => {
      console.error('이것은 허용된 에러입니다.');
    });
    
    // verify() 단계에서 에러가 없어야 함
  });
});
