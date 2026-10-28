import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * E2E axe 감사의 준비와 실행을 한 곳에 둔다(2026-10-28 감사 D6-7).
 *
 * 종전에는 spec 마다 준비(로딩 대기·동작 멈춤·투명도 안정 대기)를 따로 복제해, 한 spec 에서 고친 경합(진행 문구 패턴, JS 페이드)이
 * 다른 spec 에는 남았다. 여기서만 `new AxeBuilder` 를 만든다 — e2e-harness-hygiene 계약이 fixtures 밖의 생성을 막는다.
 * 규칙을 끄는 선택지는 두지 않는다(ui-quality-scenarios 계약이 color-contrast 비활성을 이 파일까지 본다).
 */

/**
 * 진행 문구는 '…는 중'과 '…고 있습니다' 두 형태다.
 * [2026-10-25 PR #977 flaky] 게시글 작성 화면은 게시판 편집 권한을 받기 전까지 '게시판 편집 권한을 확인하고 있습니다.'를 보이며
 *   입력 영역(fieldset)을 비활성으로 두는데, 종전 패턴이 '확인하는 중'만 잡아 권한 응답이 늦으면 비활성(50% 투명) 단추를
 *   color-contrast 위반으로 감사했다(첫 시도만 실패). 각 spec 의 좁은 패턴('^…불러오는 중' 등)은 모두 이 패턴의 부분이다.
 */
export const LOADING_TEXT = /(불러오|준비하|확인하|가져오)(는 중|고 있습니다)|로딩 중/;

/**
 * 로딩 폴백이 아닌 h1 이 보이고 진행 상태(role=status)가 사라질 때까지 기다린다. 공통 loading/Suspense 폴백도 sr-only h1 을 가지므로
 * 임의 h1 이 아니라 진행 문구가 없는 h1 을 기다린다(01-core-base 의 2026-07-27 스피너 오감사 선례).
 */
export async function expectContentReady(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 }).filter({ hasNotText: LOADING_TEXT }).first())
    .toBeVisible({ timeout: 30000 });
  await expect(page.locator('[role="status"]').filter({ hasText: LOADING_TEXT })).toHaveCount(0);
}

/**
 * 진입 모션이 끝난 상태를 감사한다. CSS 애니메이션·전환을 0 으로 두고 두 프레임을 넘긴 뒤, JS 로 구동되는 투명도 페이드가 멈출 때까지
 * 기다린다.
 * [2026-09-14 main CI flaky] CSS 는 JS 진입 모션을 멈추지 못한다. MotionConfig reducedMotion="user" 도 이동만 끄고 투명도 페이드는
 *   남기므로, 페이드 도중에 감사하면 반투명 글자가 color-contrast 위반으로 잡혔다(게시글 작성 화면, 첫 시도만 실패·재시도 통과).
 *   인라인 투명도가 여러 번 연속 같고 실행 중인 애니메이션이 없을 때 감사한다. 고정 반투명(예: 배너 0.8)은 값이 변하지 않으므로
 *   대기를 막지 않고, 영구 대비 결함은 그대로 잡힌다.
 */
async function stabilizeMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
  });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.waitForFunction(() => {
    const state = window as unknown as {
      __axeOpacity?: string;
      __axeStableSamples?: number;
    };
    const opacities = Array.from(document.querySelectorAll<HTMLElement>('[style*="opacity"]'))
      .map((element) => element.style.opacity)
      .join('|');
    const animating = document.getAnimations().some((animation) => animation.playState === 'running');
    if (animating || opacities !== state.__axeOpacity) {
      state.__axeOpacity = opacities;
      state.__axeStableSamples = 0;
      return false;
    }
    state.__axeStableSamples = (state.__axeStableSamples ?? 0) + 1;
    return state.__axeStableSamples >= 3;
  }, undefined, { polling: 100, timeout: 10000 });
}

export type AccessibilityAuditOptions = {
  /**
   * 감사 전 준비 대기. 기본 'content' 는 {@link expectContentReady} 다. false 는 호출자가 감사할 상태(초점·오류 문구 등)를 이미
   * 단언했을 때만 쓴다.
   */
  ready?: 'content' | false;
  /** 동작 멈춤({@link stabilizeMotion}). 기본 true. false 는 측정 환경을 바꾸지 않아야 하는 관찰(작업 실험실)에서만 쓴다. */
  stabilize?: boolean;
  /** 감사 범위를 이 선택자로 좁힌다. */
  include?: string;
  /**
   * 이 선택자 영역의 진입 애니메이션을 끝 상태(불투명·제자리)로 강제한다. 페이드 도중의 합성 색을 재지 않으려는 것이지 대비를
   * 바꾸려는 것이 아니다 — 정착 상태가 사용자가 실제로 보는 화면이다(로그인 카드, 2026-07-27).
   */
  forceSettled?: string;
};

/** 준비를 마친 뒤 axe 를 돌려 결과를 돌려준다. 위반 판정은 호출자가 하거나 {@link expectNoAccessibilityViolations} 를 쓴다. */
export async function auditAccessibility(page: Page, options: AccessibilityAuditOptions = {}) {
  const { ready = 'content', stabilize = true, include, forceSettled } = options;
  if (ready === 'content') await expectContentReady(page);
  if (forceSettled) {
    await page.addStyleTag({
      content: `${forceSettled}, ${forceSettled} * { opacity: 1 !important; transform: none !important; animation: none !important; transition: none !important; }`,
    });
  }
  if (stabilize) await stabilizeMotion(page);
  const builder = new AxeBuilder({ page });
  if (include) builder.include(include);
  return builder.analyze();
}

/** 준비를 마친 뒤 axe 위반이 없음을 단언한다. label 은 실패 메시지의 첫머리(경로·화면 이름)다. */
export async function expectNoAccessibilityViolations(
  page: Page,
  label: string,
  options: AccessibilityAuditOptions = {},
): Promise<void> {
  const results = await auditAccessibility(page, options);
  expect(results.violations, `${label}: ${JSON.stringify(results.violations.map((v) => `${v.id}(${v.nodes.length})`))}`)
    .toEqual([]);
}
