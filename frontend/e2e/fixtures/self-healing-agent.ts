import { Page, Locator } from '@playwright/test';

/**
 * 🤖 자가 치유형 E2E 테스트 하네스 에이전트 (Self-Healing E2E Agent)
 * 
 * UI 마이너 업데이트나 Tailwind CSS 클래스 리팩토링 등으로 인해
 * 주 셀렉터(Primary Selector)가 부서졌을 때, 텍스트 힌트와 시맨틱 ARIA 역할(Role),
 * 그리고 태그 속성 기반의 휴리스틱 매칭 알고리즘을 기동하여 테스트의 중단 없이
 * 동적으로 엘리먼트를 복구(Heal)하고 테스트를 성공으로 인도합니다.
 */
export class SelfHealingAgent {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 엘리먼트를 안전하게 감지하고 주 셀렉터 실패 시 복구를 시도합니다.
   */
  async safeLocate(
    primarySelector: string, 
    options: { textHint?: string; role?: 'button' | 'link' | 'textbox' } = {}
  ): Promise<Locator> {
    try {
      // 1. 주 셀렉터(Primary Selector) 시도
      const primaryLocator = this.page.locator(primarySelector);
      // 고속 대기 (1.5초)로 주 셀렉터 검증
      await primaryLocator.first().waitFor({ state: 'visible', timeout: 1500 });
      return primaryLocator.first();
    } catch (e) {
      console.warn(`⚠️ [E2E FRAGILITY DETECTED]: 주 셀렉터 '${primarySelector}'를 찾을 수 없습니다. 자가 치유(Self-Healing) 매커니즘을 시작합니다...`);

      // 치유 전략 1: ARIA 역할 + 텍스트 매칭
      if (options.role && options.textHint) {
        try {
          const healed = this.page.getByRole(options.role, { name: options.textHint, exact: false });
          if (await healed.count() > 0) {
            const resolvedText = await healed.first().textContent();
            console.log(`❇️ [SELF-HEALED SUCCESS]: ARIA 역할 '${options.role}' 및 텍스트 힌트 '${options.textHint}'를 통해 엘리먼트를 치유 완료했습니다. (실제 텍스트: '${resolvedText?.trim()}')`);
            return healed.first();
          }
        } catch (h1) {
          // 실패 시 다음 전략으로 이동
        }
      }

      // 치유 전략 2: 단순 텍스트 힌트 검색
      if (options.textHint) {
        try {
          const healedByText = this.page.locator(`text=${options.textHint}`);
          if (await healedByText.count() > 0) {
            console.log(`❇️ [SELF-HEALED SUCCESS]: 텍스트 매칭 'text=${options.textHint}'를 통해 엘리먼트를 성공적으로 복구했습니다.`);
            return healedByText.first();
          }
        } catch (h2) {
          // 실패 시 다음 전략으로 이동
        }
      }

      // 치유 전략 3: 폼 엘리먼트 휴리스틱 루프 스캔 (Button, Input)
      try {
        if (options.role === 'button' || primarySelector.includes('button') || primarySelector.includes('submit')) {
          const buttons = this.page.locator('button, input[type="button"], input[type="submit"]');
          const count = await buttons.count();
          for (let i = 0; i < count; i++) {
            const btn = buttons.nth(i);
            const txt = await btn.textContent();
            if (txt && options.textHint && txt.toLowerCase().includes(options.textHint.toLowerCase())) {
              console.log(`❇️ [SELF-HEALED SUCCESS]: 휴리스틱 스캔을 통해 버튼 엘리먼트 '${txt.trim()}'를 발견하여 매칭했습니다.`);
              return btn;
            }
          }
        }
      } catch (h3) {
        // 실패 시 다음 전략으로 이동
      }

      // 모든 치유 실패 시 원본 에러를 슬로우하여 테스트 실패 리포팅 처리
      throw new Error(`❌ [SELF-HEALING FAILED]: 주 셀렉터 '${primarySelector}' 및 복구 알고리즘이 모두 실패하여 요소를 결정할 수 없습니다.`);
    }
  }

  /**
   * 자가 치유형 클릭 액션
   */
  async safeClick(primarySelector: string, options: { textHint?: string; role?: 'button' | 'link' } = {}) {
    const locator = await this.safeLocate(primarySelector, options);
    await locator.click();
  }

  /**
   * 자가 치유형 텍스트 입력 액션
   */
  async safeFill(primarySelector: string, value: string, options: { textHint?: string; role?: 'textbox' } = {}) {
    const locator = await this.safeLocate(primarySelector, options);
    await locator.fill(value);
  }
}
