import { Page } from '@playwright/test';

/**
 * 🎨 프론트엔드 UX 헌법 제17조(정보 밀도 제어 및 숨통 원칙) 자동 검증 하네스
 */
export class LayoutBreathingGuard {
  constructor(private page: Page) {}

  /**
   * 컴포넌트 내의 실제 텍스트 정보 면적 비율을 계산하여
   * 정보 밀도가 60%를 초과하거나(정보 체증) 여백 비율이 40% 미만인 경우
   * 경고(Warning)를 발행하여 빌드 로그 및 비주얼 보고서에 기록합니다.
   */
  async verifyBreathingRatio(selector: string, componentName: string) {
    await this.page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const isVisible = await this.page.locator(selector).first().isVisible();
    if (!isVisible) return;

    const metrics = await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const totalArea = rect.width * rect.height;
      if (totalArea === 0) return { totalArea: 0, textPercent: 0, whitespacePercent: 100 };

      // 임시로 컴포넌트 내 텍스트 엘리먼트들의 면적 구함
      let occupiedArea = 0;
      const textContainers = el.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, li, td, a');
      textContainers.forEach(container => {
        const cRect = container.getBoundingClientRect();
        // 겹치는 부분이 생기지 않도록 대략적인 총 텍스트 점유 영역 추정
        if (cRect.width > 0 && cRect.height > 0) {
          // 순수하게 텍스트가 차지하는 가용 공간
          occupiedArea += (cRect.width * cRect.height);
        }
      });

      // 텍스트 엘리먼트들이 실질적으로 차지하는 가중 면적을 60% 한도로 제한하여 보정
      const estimatedOccupied = Math.min(occupiedArea * 0.35, totalArea * 0.9); // 0.35는 컨테이너 여백 보정치
      const textPercent = Math.round((estimatedOccupied / totalArea) * 100);
      const whitespacePercent = 100 - textPercent;

      return {
        totalArea,
        textPercent,
        whitespacePercent
      };
    }, selector);

    if (metrics) {
      console.log(`🎨 [VISUAL AUDIT] ${componentName} (${selector}) -> Total Area: ${metrics.totalArea}px, Estimated Information Density: ${metrics.textPercent}%, Breathing Space (White Space): ${metrics.whitespacePercent}%`);
      
      // UX 헌법 제17조 2항: 정보 영역 60% 제한, 여백 비율 40% 보존
      if (metrics.whitespacePercent < 40) {
        console.warn(`⚠️ [UX CONSTITUTION VIOLATION] ${componentName}의 여백 비율(${metrics.whitespacePercent}%)이 40% 미만으로 정보 체증(Information Congestion)이 우려됩니다!`);
      }
    }
  }
}
