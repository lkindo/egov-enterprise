import { test, expect } from '@playwright/test';

/**
 * Legacy JS 자산 및 기능 검증 테스트
 * - eGovFrame 기반의 레거시 자산들이 정상적으로 서빙되고 기본적인 기능을 수행하는지 확인합니다.
 */
test.describe('Legacy JS Assets Verification', () => {
    
    // 검증 대상 레거시 JS 파일 목록
    const legacyJsFiles = [
        '/js/EgovValidation.js',
        '/js/EgovBBSMng.js',
        '/js/EgovMainMenu.js',
        '/js/jquery.js'
    ];

    // 1. 파일 가용성 테스트
    for (const jsFile of legacyJsFiles) {
        test(`should be accessible: ${jsFile}`, async ({ request }) => {
            // 백엔드가 실행 중인 환경(8080)에서 파일을 직접 확인하거나, 
            // 프론트엔드 프록시 설정이 되어 있다면 baseURL을 통해 확인합니다.
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
            const response = await request.get(`${backendUrl}${jsFile}`);
            
            // 파일이 존재하고 올바른 Content-Type을 반환하는지 확인
            expect(response.status(), `${jsFile} should exist`).toBe(200);
            expect(await response.headerValue('content-type')).toContain('application/javascript');
        });
    }

    // 2. EgovValidation.js 기능 검증
    test('EgovValidation.js should be functional in browser context', async ({ page }) => {
        // 비어있는 페이지에서 스크립트를 주입하여 로직을 테스트합니다.
        await page.goto('about:blank');
        
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
        await page.addScriptTag({ url: `${backendUrl}/js/EgovValidation.js` });

        // EgovValidation 객체 존재 확인
        const isDefined = await page.evaluate(() => typeof (window as any).EgovValidation !== 'undefined');
        expect(isDefined).toBe(true);

        // trim 유틸리티 함수 확인
        const trimmed = await page.evaluate(() => (window as any).EgovValidation.trim('  egovframe  '));
        expect(trimmed).toBe('egovframe');

        // 이메일 정규식 규칙 확인
        const validEmail = await page.evaluate(() => (window as any).EgovValidation.rules.email('standard@egov.com'));
        expect(validEmail).toBe(true);

        const invalidEmail = await page.evaluate(() => (window as any).EgovValidation.rules.email('not-an-email'));
        expect(invalidEmail).toBe(false);
    });

    // 3. jQuery 및 UI 호환성 기초 확인
    test('Legacy jQuery version check', async ({ page }) => {
        await page.goto('about:blank');
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
        await page.addScriptTag({ url: `${backendUrl}/js/jquery.js` });

        const jqueryVersion = await page.evaluate(() => (window as any).$.fn.jquery);
        // 레거시 환경에서 1.x 버전을 사용하는지 확인 (EgovFrame 3.x/4.x 호환용)
        expect(jqueryVersion).toMatch(/^1\./);
    });
});
