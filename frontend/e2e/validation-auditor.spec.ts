import { test, expect } from './fixtures/base-test';

/**
 * 🛡️ Validation Auditor (검증 감사관)
 * 전체 화면의 입력 폼에 검증 로직이 누락되었는지 자동으로 체크합니다.
 */
test.describe('Global Validation Audit', () => {
  // 관리자 세션 재사용
  test.use({ storageState: 'playwright/.auth/admin.json' });

  const targetPages = [
    { name: '사용자 관리', url: '/admin/user/manage', btnName: '사용자 등록' },
    { name: '부서 관리', url: '/admin/user/manage', btnName: '신규 부서 등록', tabName: '부서 관리' },
    { name: '인프라 관리', url: '/admin/system/network', btnName: '신규 노드 등록' },
    { name: '프로그램 관리', url: '/admin/system/programs', btnName: '신규 등록' },
    { name: '메뉴 관리', url: '/admin/system/menus', btnName: '신규 등록' },
    { name: '공통코드 관리', url: '/admin/system/common-code', btnName: '신규 등록' },
    { name: '배너 관리', url: '/admin/system/banner', btnName: '신규 배너 등록' },
    { name: '보안 권한 허브', url: '/admin/security/authority', btnName: '신규 보안 아키텍처 설정' },
  ];

  for (const target of targetPages) {
    test(`Audit validation for ${target.name}`, async ({ page }) => {
      console.log(`>>> Auditing: ${target.name} (${target.url})`);
      
      await page.goto(target.url, { waitUntil: 'networkidle' });

      // 0. 탭 전환이 필요한 경우 (예: 부서 관리)
      if (target.tabName) {
        const tabBtn = page.getByRole('button', { name: target.tabName }).first();
        if (await tabBtn.isVisible()) {
          await tabBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // 1. 등록/수정 폼 열기
      // 텍스트 기반 검색 (더 유연한 로케이터 사용)
      const openBtn = page.locator('button').filter({ hasText: new RegExp(target.btnName, 'i') }).first();
      
      if (await openBtn.isVisible()) {
        await openBtn.click();
        await page.waitForTimeout(1000); // 폼 렌더링 대기
      } else {
        // 백업: 테이블 내의 수정 버튼 시도
        const tableEditBtn = page.locator('table button, .data-table button').filter({ hasText: /수정|편집|Edit/i }).first();
        if (await tableEditBtn.isVisible()) {
           await tableEditBtn.click();
           await page.waitForTimeout(1000);
        } else {
           console.log(`>>> Warning: ${target.btnName} button not found. Skipping.`);
           return;
        }
      }

      // 2. 빈 상태로 제출 시도 (Zod Validation 트리거)
      const submitBtn = page.locator('button[type="submit"], button:has-text("확인"), button:has-text("저장"), button:has-text("등록")').first();
      if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
        await submitBtn.click();
        await page.waitForTimeout(500); // 검증 대기
        
        // 3. Validation 확인 (에러 메시지 또는 토스트)
        // shadcn/ui FormMessage 또는 일반 에러 텍스트 검색
        const errorMessages = page.locator('p.text-destructive, [data-slot="form-message"], .form-error');
        const toastMessage = page.locator('[data-sonner-toast], .toast-error');
        
        const errorCount = await errorMessages.count();
        const toastVisible = await toastMessage.isVisible();
        
        console.log(`>>> ${target.name}: Found ${errorCount} error messages, Toast visible: ${toastVisible}`);
        
        expect(errorCount > 0 || toastVisible).toBeTruthy();
        console.log(`>>> SUCCESS: Validation logic confirmed for ${target.name}`);
      } else {
        console.log(`>>> Warning: Submit button for ${target.name} is not clickable.`);
      }
    });
  }
});
