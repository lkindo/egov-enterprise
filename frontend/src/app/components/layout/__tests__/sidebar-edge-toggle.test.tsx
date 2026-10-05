/**
 * 넓은 화면(lg 이상) 사이드바 경계선의 접기·펼치기 단추(2026-10-05 DEC-OPS-228, 카탈로그 §4 '사이드바 접기').
 *
 * 사용자 결정: 머리글 로고 옆 아이콘은 보지 못했고, 사이드바 맨 위 글자 단추·접힘 막대의 '펼치기'보다 경계선의 아이콘이
 * 직관적이다 — 접기 단추는 경계선의 원형 단추 하나만 남긴다. jsdom 은 CSS 를 적용하지 않으므로 보이고 숨는 사실·위치는
 * 클래스·표지로, 실제 화면 표현(경계선에 걸침·같은 높이·띠 폭)은 e2e(responsive-shell)가 본다.
 *
 * 고정하는 것:
 *  - 단추는 사이드바 랜드마크(aside '주 메뉴') 안, 숨는 안쪽 내용 컨테이너 밖에 있다 — 접어도 DOM·랜드마크에 남는다.
 *    메뉴 탐색보다 앞(첫 Tab 정지)이다.
 *  - 이름은 고정이고 접힘 상태는 aria-expanded 하나로만 말하며(APG disclosure), aria-controls 로 숨고 보이는 내용 컨테이너를
 *    가리킨다. 툴팁(title)도 이름과 같다 — 다르면 접근 설명으로 노출돼 상태를 두 번 말한다.
 *  - 마우스를 올려도 아이콘이 배경과 같은 색이 되지 않고(outline 변형의 반전 hover 배경을 쓰지 않는다), OS 다크 설정이
 *    배경을 반투명으로 바꾸지 않는다(변형의 dark:bg-input/30 이 없다).
 *  - 아이콘만 있는 단추다 — 보이는 글자가 없고, 아이콘 둘은 <html data-sidebar-collapsed> 를 보는 CSS 가 하나만 보인다.
 *  - 넓은 화면에서만 보인다(hidden lg:inline-flex) — 서랍에는 '사이드바 닫기'가 있다.
 *  - 누르면(키보드 포함) <html> 표지와 이 브라우저의 기억이 함께 바뀌고, 단추가 DOM 에 남아 포커스가 그대로 있다(2.4.3).
 *  - 저장소를 쓸 수 없어도 이번 화면의 접기·펼치기는 동작하고, 그리기 전 스크립트가 되살린 접힘을 단추가 그대로 읽는다.
 *  - 사이드바에는 이 단추 말고 접기·펼치기 단추가 없다(같은 기능의 단추가 둘이 되지 않는다).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutProvider } from '@/contexts/LayoutContext';
import {
  SIDEBAR_COLLAPSE_SCRIPT,
  SIDEBAR_COLLAPSED_ATTRIBUTE,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_CONTENT_ID,
  SIDEBAR_TOGGLE_LABEL,
} from '@/lib/layout/sidebar-collapse-script';
import { setSidebarCollapsed } from '@/lib/layout/use-sidebar-collapsed';
import { Sidebar } from '../sidebar';

const menu = vi.hoisted(() => ({ getHeadMenus: vi.fn(), getLeftMenus: vi.fn(), getMyBookmarks: vi.fn() }));
vi.mock('@/services/business/user/MenuService', () => ({ menuService: menu }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u', groups: ['USER'], permissions: [], authorizationVersion: 'v1' } }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

function renderSidebar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LayoutProvider>
        <Sidebar />
        <main id="main-content" tabIndex={-1}>본문</main>
      </LayoutProvider>
    </QueryClientProvider>,
  );
}

const html = () => document.documentElement;
const sidebar = () => screen.getByRole('complementary', { name: '주 메뉴' });
const edgeToggle = () => within(sidebar()).getByRole('button', { name: SIDEBAR_TOGGLE_LABEL });

describe('사이드바 경계선 접기·펼치기 단추', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    menu.getHeadMenus.mockResolvedValue([]);
    menu.getMyBookmarks.mockResolvedValue([]);
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('사이드바 랜드마크 안, 숨는 내용 컨테이너 밖에 있고 메뉴 탐색보다 앞이다', () => {
    renderSidebar();
    const toggle = edgeToggle();
    const content = document.getElementById(SIDEBAR_CONTENT_ID);

    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-app-sidebar-content', '');
    expect(sidebar()).toContainElement(content);
    // 접으면 내용 컨테이너만 숨는다(globals.css) — 단추가 그 안에 있으면 함께 사라져 포커스가 떨어지고 펼칠 길이 없어진다.
    expect(content).not.toContainElement(toggle);
    expect(toggle.parentElement).toBe(sidebar());
    expect(toggle).toHaveAttribute('data-app-sidebar-edge-toggle', '');
    const nav = screen.getByRole('navigation', { name: '주 메뉴 탐색' });
    expect(toggle.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('고정 이름·aria-expanded·aria-controls·툴팁을 갖고, 넓은 화면에서만 보이는 원형 아이콘 단추다', () => {
    renderSidebar();
    const toggle = edgeToggle();

    expect(SIDEBAR_TOGGLE_LABEL).toBe('사이드바 접기·펼치기');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', SIDEBAR_CONTENT_ID);
    expect(toggle).toHaveAttribute('title', SIDEBAR_TOGGLE_LABEL);
    // 아이콘만 둔다 — 아이콘 밖에 보이는 글자가 없다(접근 이름은 aria-label). 테스트 설정의 아이콘 대역은 이름을 글자로
    //   그리므로 아이콘을 뺀 나머지만 본다.
    const withoutIcons = toggle.cloneNode(true) as HTMLElement;
    withoutIcons.querySelectorAll('[data-sidebar-icon]').forEach((icon) => icon.remove());
    expect(withoutIcons.textContent?.trim()).toBe('');
    // 서랍(lg 미만)에는 위쪽 '사이드바 닫기'가 있다 — 이 단추는 넓은 화면에서만 보인다(CSS 만, 단일 DOM). 호버로만 나타나지
    //   않는다(opacity·group-hover 없음). 경계선에 반쯤 걸치는 배치(오른쪽 끝에서 단추 폭의 절반만큼 밖 — top-4)와
    //   원형·테두리·그림자를 고정한다.
    expect(toggle).toHaveClass(
      'hidden', 'lg:inline-flex', 'absolute', 'right-0', 'translate-x-1/2', 'top-4',
      'rounded-full', 'border', 'border-muted-foreground/50', 'bg-card', 'shadow-md',
    );
    expect(toggle.className).not.toMatch(/(?:^|\s)(?:opacity-0|group-hover:|hover:opacity)/);
    // 합쳐진 최종 클래스 — hover 배경과 글자색은 짝이어야 한다. 반전 배경(surface-inverse)에 글자색만 foreground 로 덮이면
    //   밝은 테마에서 아이콘이 배경과 같은 색이 된다(KRDS 1:1). dark:bg-input/30 은 OS 다크 설정만으로 배경을 반투명으로
    //   바꿔 경계선이 단추 가운데로 비친다(Tailwind 기본 dark 변형은 prefers-color-scheme 이다).
    const classes = toggle.className.split(/\s+/);
    expect(classes).not.toContain('hover:bg-surface-inverse');
    expect(classes.filter((c) => c.startsWith('dark:bg-') || c.startsWith('dark:border-'))).toEqual([]);
    expect(classes).toEqual(expect.arrayContaining(['hover:bg-muted', 'hover:text-foreground']));
    expect(within(sidebar()).getByRole('button', { name: '사이드바 닫기' })).toBeInTheDocument();
  });

  it('아이콘은 둘 다 그리고 접힘 속성을 보는 CSS 가 하나만 보인다(하이드레이션 전에도 맞는 아이콘)', () => {
    renderSidebar();
    const toggle = edgeToggle();
    const collapseIcon = toggle.querySelector('[data-sidebar-icon="collapse"]');
    const expandIcon = toggle.querySelector('[data-sidebar-icon="expand"]');

    expect(collapseIcon).toHaveAttribute('aria-hidden', 'true');
    expect(expandIcon).toHaveAttribute('aria-hidden', 'true');
    expect(collapseIcon).toHaveClass('sidebar-collapsed:hidden');
    expect(collapseIcon).not.toHaveClass('hidden');
    expect(expandIcon).toHaveClass('hidden', 'sidebar-collapsed:block');
  });

  it('사이드바에는 이 단추 말고 접기·펼치기 단추가 없다', () => {
    renderSidebar();
    const buttons = within(sidebar()).queryAllByRole('button', { name: /사이드바 (?:접기|펼치기)/ });
    expect(buttons).toEqual([edgeToggle()]);
  });

  it('누르면 접히고 기억되며 포커스가 단추에 남고, 다시 누르면 편다(이름은 그대로, 상태만 바뀐다)', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const toggle = edgeToggle();

    await user.click(toggle);
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('1');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('title', SIDEBAR_TOGGLE_LABEL);
    expect(toggle).toHaveAccessibleName(SIDEBAR_TOGGLE_LABEL);
    // 단추가 DOM 에 남아 같은 요소다 — 포커스가 문서 처음으로 떨어지지 않는다(2.4.3).
    expect(edgeToggle()).toBe(toggle);
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveFocus();
  });

  it('키보드(Enter·Space)로도 접고 펴며 포커스가 단추에 남는다', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const toggle = edgeToggle();

    toggle.focus();
    await user.keyboard('{Enter}');
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
    expect(toggle).toHaveFocus();

    await user.keyboard(' ');
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(toggle).toHaveFocus();
  });

  it('저장소를 쓸 수 없어도 이번 화면의 접기·펼치기는 동작한다', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('SecurityError'); });
    // 저장 실패는 던지지 않는다 — 던지면 단추의 클릭 처리기가 중간에 끊긴다.
    expect(() => setSidebarCollapsed(true)).not.toThrow();
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
    expect(() => setSidebarCollapsed(false)).not.toThrow();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    const user = userEvent.setup();
    renderSidebar();

    await user.click(edgeToggle());
    expect(edgeToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');

    await user.click(edgeToggle());
    expect(edgeToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('그리기 전 스크립트가 되살린 접힘을 단추가 그대로 읽는다', () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, '1');
    new Function(SIDEBAR_COLLAPSE_SCRIPT)();
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');

    renderSidebar();
    expect(edgeToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(edgeToggle()).toHaveAttribute('title', SIDEBAR_TOGGLE_LABEL);
  });
});

describe('그리기 전 복원 스크립트', () => {
  beforeEach(() => {
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('기억이 없거나 다른 값이면 아무것도 하지 않는다(기본 펼침)', () => {
    new Function(SIDEBAR_COLLAPSE_SCRIPT)();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);

    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');
    new Function(SIDEBAR_COLLAPSE_SCRIPT)();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('저장소 접근이 막혀도 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(() => new Function(SIDEBAR_COLLAPSE_SCRIPT)()).not.toThrow();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('정적 문자열이다 — 요청 값이 섞일 자리가 없다', () => {
    expect(SIDEBAR_COLLAPSE_SCRIPT).not.toMatch(/\$\{/);
    expect(SIDEBAR_COLLAPSE_SCRIPT).toContain(`'${SIDEBAR_COLLAPSED_STORAGE_KEY}'`);
    expect(SIDEBAR_COLLAPSE_SCRIPT).toContain(`'${SIDEBAR_COLLAPSED_ATTRIBUTE}'`);
  });
});
