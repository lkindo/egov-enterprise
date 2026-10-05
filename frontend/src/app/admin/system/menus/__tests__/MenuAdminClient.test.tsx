import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { handOffScreen } from '@/lib/navigation/target-handoff';

/**
 * [2026-10-02 D1·D2] 보드형 메뉴 구조 편집기 — 영역 탭·카드·줄, 오른쪽 상세(인스펙터), 끌지 않는 옮기기, 찾기, 그룹 미리보기,
 * 한 번에 저장(메뉴 구조 버전 확인). 1단계의 즉시 저장 수정 창(등록·수정·삭제)과 구조 저장(batch-order)은 걷었다 —
 * 그 테스트가 지키던 의미(이름 필수·100자, 경로 형식, 중복 실행 차단, 실패 피드백, 권한별 표시, 초안 중 서버 목록 재수신)는
 * 아래에서 새 경로로 다시 고정한다.
 */
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  toast: vi.fn(),
  save: vi.fn(),
  reload: vi.fn(),
  matrix: vi.fn(),
  refresh: vi.fn(),
}));
const auth = vi.hoisted(() => ({ permissions: [] as string[], loading: false }));
const dnd = vi.hoisted(() => ({ event: null as null | Record<string, unknown> }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: mocks.refresh, back: vi.fn() }),
  usePathname: () => '/admin/system/menus',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav aria-label="현재 위치" /> }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin', permissions: auth.permissions, authorizationVersion: 'v1' }, loading: auth.loading }),
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { saveMenuStructure: mocks.save, getMenuStructure: mocks.reload },
}));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({
  authorizationAdminService: { getGrantMatrix: mocks.matrix },
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ children, footer, isOpen, title, onClose }: { children: React.ReactNode; footer?: React.ReactNode; isOpen: boolean; title: string; onClose: () => void }) => (isOpen ? (
    <div data-testid="standard-modal" role="dialog" aria-label={title}>
      <h2>{title}</h2>
      <button type="button" onClick={onClose}>모달 닫기 요청</button>
      {children}
      {footer}
    </div>
  ) : null),
}));

/*
  dnd-kit 은 jsdom 에서 끌 수 없다 — 끌기 처리기만 부르는 단추를 둔다. 테스트가 dnd.event 에 끄는 메뉴·놓을 곳·위치를 둔다.
  다중 컨테이너 보드가 쓰는 export(useDraggable·useDroppable·pointerWithin 등)를 모두 둔다.
*/
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragMove, onDragEnd, onDragCancel }: Record<string, (event: unknown) => void> & { children: React.ReactNode }) => (
    <div>
      {children}
      <button type="button" onClick={() => onDragStart?.(dnd.event)}>테스트 끌기 시작</button>
      <button type="button" onClick={() => onDragMove?.(dnd.event)}>테스트 끌기 이동</button>
      <button type="button" onClick={() => onDragEnd?.(dnd.event)}>테스트 끌기 놓기</button>
      <button type="button" onClick={() => onDragCancel?.(dnd.event)}>테스트 끌기 취소</button>
    </div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
  pointerWithin: vi.fn(() => []),
  closestCenter: vi.fn(() => []),
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), isDragging: false }),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
}));

import MenuAdminClient from '../MenuAdminClient';

const FULL = ['MENU_READ', 'MENU_CREATE', 'MENU_UPDATE', 'MENU_DELETE', 'AUTHRT_READ', 'AUTHRT_GRANT'];

const menu = (menuNo: number, menuNm: string, upMenuSn: number | null, menuOrdr: number, modernRoute: string | null = null) => ({
  menuNo, menuNm, upMenuSn, menuOrdr, modernRoute, menuExpln: null, useYn: 'Y' as const, prgrmFileNm: null,
});
/*
  업무(1) ─ 결재(2, 섹션) ─ 결재함(3), 권한별 메뉴(4)
          └ 메뉴 관리(8, 한 줄 카드)
  관리(5) ─ 시스템(6, 빈 섹션)
*/
const MENUS = [
  menu(1, '업무', null, 1),
  menu(2, '결재', 1, 1),
  menu(3, '결재함', 2, 1, '/approvals'),
  menu(4, '권한별 메뉴', 2, 2, '/admin/system/menus/by-authority'),
  menu(8, '메뉴 관리', 1, 2, '/admin/system/menus'),
  menu(5, '관리', null, 2),
  menu(6, '시스템', 5, 1),
];
const nav = (...ids: number[]) => ids.map((id) => ({ type: 'NAVIGATION', code: String(id) }));
const MATRIX = {
  catalogVersion: 'c1',
  groups: [
    { code: 'ROLE_ADMIN', name: '관리자', description: null, version: 'admin-v1', complete: true, grants: [...nav(1, 2, 3, 4, 8, 5, 6), { type: 'OPERATION', code: 'MENU_READ' }] },
    { code: 'ROLE_USER', name: '사용자', description: null, version: 'user-v1', complete: true, grants: nav(1, 2, 3) },
  ],
};
const structure = (menus = MENUS, version = 'v1') => ({ version, menus });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject; });
  return { promise, resolve, reject };
}

type Loaded = { data: ReturnType<typeof structure> | null; error: string | null };
async function renderClient(options: { menus?: ReturnType<typeof menu>[]; version?: string; error?: string; permissions?: string[] } = {}) {
  auth.permissions = options.permissions ?? FULL;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (loaded: Promise<Loaded>) => (
    <QueryClientProvider client={client}>
      <React.Suspense fallback={<p>불러오는 중</p>}>
        <MenuAdminClient structurePromise={loaded} />
      </React.Suspense>
    </QueryClientProvider>
  );
  const first: Promise<Loaded> = Promise.resolve(options.error
    ? { data: null, error: options.error }
    : { data: structure(options.menus ?? MENUS, options.version ?? 'v1'), error: null });
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(tree(first)); });
  return {
    client,
    reload: async (next: Loaded) => { await act(async () => { view.rerender(tree(Promise.resolve(next))); }); },
  };
}

const rowButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name} ID: `) });
/** 영역 탭 — 접근 이름이 '{영역} ' 으로 시작한다(뒤에 하위 수·보임 수·일치 수와 변경 수가 붙는다). */
const areaTab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name} `) });
const undoButton = () => screen.getByRole('button', { name: '직전 변경 되돌리기' });
const rowOrder = () => screen.getAllByRole('button', { name: /ID: / }).map((button) => button.getAttribute('data-menu-no'));
const liveText = () => [...document.querySelectorAll('[aria-live="polite"]')].map((element) => element.textContent).join(' ');
const saveButton = () => screen.getByRole('button', { name: /^변경 저장/ });

beforeEach(() => {
  vi.clearAllMocks();
  auth.loading = false;
  dnd.event = null;
  window.sessionStorage.clear();
  mocks.confirm.mockResolvedValue(true);
  mocks.matrix.mockResolvedValue(MATRIX);
  mocks.save.mockResolvedValue(structure(MENUS, 'v2'));
  mocks.reload.mockResolvedValue(structure(MENUS, 'v3'));
});

describe('보드 — 영역 탭·카드·줄과 선택', () => {
  it('첫 영역을 열고 섹션 카드의 줄·한 줄 카드·영역 머리를 보이며, 고르기 전에는 상세가 비어 있다', async () => {
    await renderClient();

    expect(screen.getByRole('heading', { level: 1, name: '시스템 메뉴 관리' })).toBeInTheDocument();
    expect(areaTab('업무')).toHaveAttribute('aria-selected', 'true');
    expect(areaTab('관리')).toHaveAttribute('aria-selected', 'false');
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(screen.getByRole('region', { name: '결재 섹션' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '메뉴 관리 화면' })).toBeInTheDocument();
    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    // 첫 항목만 탭 순서에 든다(셸의 ↑/↓ 가 나머지를 옮겨 다닌다).
    expect(rowButton('업무')).toHaveAttribute('tabindex', '0');
    expect(rowButton('결재함')).toHaveAttribute('tabindex', '-1');
  });

  it('줄을 고르면 aria-current 와 상세(위치·이름·보이는 그룹)를 보이고, 다른 영역 탭을 열면 선택을 푼다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));

    expect(rowButton('결재함')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: '결재함' })).toBeInTheDocument();
    expect(screen.getByText('업무 › 결재 › 결재함')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toHaveValue('결재함');
    expect(await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ })).toBeChecked();

    fireEvent.click(areaTab('관리'));
    expect(rowOrder()).toEqual(['5', '6']);
    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();
  });

  it('영역 탭은 ←/→ 로 옮겨 다닌다', async () => {
    await renderClient();
    const first = areaTab('업무');
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(areaTab('관리')).toHaveAttribute('aria-selected', 'true');
    expect(areaTab('관리')).toHaveFocus();
  });
});

describe('권한별 표시 — 쓰기 단추는 그 동작의 기능 권한으로 보인다', () => {
  const WRITE_CONTROLS = ['변경 저장', '영역 추가', '한 칸 위로', '한 칸 아래로', '다른 곳으로 옮기기…', '메뉴 삭제'];

  it('조회 권한만 있으면 저장·추가·옮기기·삭제·끌기 손잡이가 없고 상세는 읽기 전용이다. 그룹 권한은 묻지 않는다', async () => {
    await renderClient({ permissions: ['MENU_READ'] });
    fireEvent.click(rowButton('결재함'));

    expect(screen.getByRole('heading', { level: 2, name: '결재함' })).toBeInTheDocument();
    for (const name of WRITE_CONTROLS) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /섹션 추가/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /화면 추가/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /끌어서 옮기기$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '메뉴 이름' })).not.toBeInTheDocument();
    expect(rowButton('결재함')).not.toHaveAttribute('aria-keyshortcuts');
    // Alt+↓·Ctrl+X 도 옮기지 않는다 — 저장할 수 없는 초안을 만들지 않는다.
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.keyDown(rowButton('결재함'), { key: 'x', ctrlKey: true });
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(screen.queryByText(/잘라 낸 메뉴/)).not.toBeInTheDocument();
    expect(screen.getByText(/권한 조회 권한이 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '그룹 미리보기' })).not.toBeInTheDocument();
    expect(mocks.matrix).not.toHaveBeenCalled();
  });

  it('수정 권한만 있으면 저장·옮기기·이름 편집·끌기는 되고, 영역·섹션·화면 추가와 삭제는 없다', async () => {
    await renderClient({ permissions: ['MENU_READ', 'MENU_UPDATE'] });
    fireEvent.click(rowButton('결재함'));

    expect(saveButton()).toBeInTheDocument();
    for (const name of ['한 칸 위로', '한 칸 아래로', '다른 곳으로 옮기기…']) expect(screen.getByRole('button', { name })).toBeEnabled();
    expect(screen.getByRole('button', { name: '결재함 끌어서 옮기기' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toBeEnabled();
    expect(rowButton('결재함')).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown Control+X Control+V');
    for (const name of ['영역 추가', '메뉴 삭제']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /섹션 추가/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /화면 추가/ })).not.toBeInTheDocument();
  });

  it('등록·삭제 권한이 있으면 영역·섹션·화면 추가와 메뉴 삭제를 보인다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    expect(screen.getByRole('button', { name: '영역 추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '섹션 추가(업무)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 아래 화면 추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '메뉴 삭제' })).toBeEnabled();
  });

  it('권한 설정 권한이 없으면 그룹 메뉴 표시를 바꾸지 않는다 — 체크는 보이되 잠긴다', async () => {
    await renderClient({ permissions: ['MENU_READ', 'MENU_UPDATE', 'AUTHRT_READ'] });
    fireEvent.click(rowButton('결재함'));
    const checkbox = await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ });
    expect(checkbox).toBeDisabled();
    expect(screen.getByText('메뉴 표시를 바꾸려면 메뉴 수정 권한과 권한 설정 권한이 모두 필요합니다.')).toBeInTheDocument();
  });
});

describe('끌지 않는 옮기기 — Alt+↑/↓, 다른 곳으로 옮기기, 잘라내기·붙여넣기', () => {
  it('Alt+↓ 로 같은 상위 안에서 한 칸 옮기고, 변경 표시·결과 안내를 남긴 뒤 원래 자리로 오면 변경 0 이다', async () => {
    await renderClient();
    const row = rowButton('결재함');
    fireEvent.click(row);

    const altDown = fireEvent.keyDown(row, { key: 'ArrowDown', altKey: true });
    expect(altDown).toBe(false);
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);
    expect(liveText()).toContain('결재함 메뉴를 한 칸 아래로 옮겼습니다(업무 › 결재 아래 2개 중 2번째). 변경 저장을 눌러야 반영됩니다.');
    // 맞바꾼 두 메뉴 가운데 어느 쪽에 '순서' 를 붙일지는 계산이 정한다 — 하나만 붙는다.
    expect(screen.getAllByText('순서')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '변경 1건' })).toBeInTheDocument();
    // [2026-10-05 2차 리뷰] 탭의 접근 이름은 보이는 글자('업무 4')로 시작한다(WCAG 2.5.3).
    expect(screen.getByRole('tab', { name: '업무 4개 하위 메뉴 1건 변경' })).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    await waitFor(() => expect(rowButton('결재함')).toHaveFocus());

    // 끝에서 거듭 누르면 같은 문장을 새 노드로 다시 말한다(aria-live 가 다시 읽는다).
    const boundary = '결재함 메뉴는 같은 상위 안에서 더 아래로 옮길 수 없습니다.';
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    const firstNotice = screen.getByText(boundary);
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    const secondNotice = screen.getByText(boundary);
    expect(secondNotice).not.toBe(firstNotice);
    expect(firstNotice.isConnected).toBe(false);

    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowUp', altKey: true });
    expect(saveButton()).toBeDisabled();
    // [2026-10-05 반박 리뷰 — 통합 단계에서 테스트를 구현에 맞췄다] '변경 n건' 단추는 늘 그려 도구 줄 폭을 고정한다(첫 변경에서
    //   단추가 새로 생기며 도구 줄이 줄바꿈되어 보드가 밀렸다). 변경이 없으면 '변경 0건' 으로 막힌다.
    expect(screen.getByRole('button', { name: '변경 0건' })).toBeDisabled();
  });

  it('다른 곳으로 옮기기 대화상자는 막힌 자리를 이유와 함께 막고, 고른 영역의 섹션 맨 앞으로 옮긴 뒤 그 영역을 연다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재'));
    fireEvent.click(screen.getByRole('button', { name: '다른 곳으로 옮기기…' }));
    const dialog = within(await screen.findByRole('dialog', { name: '다른 곳으로 옮기기' }));
    // 하위가 있는 섹션은 다른 섹션 안으로 갈 수 없다.
    const blocked = dialog.getByRole('button', { name: '관리 › 시스템' });
    expect(blocked).toBeDisabled();
    expect(blocked).toHaveAccessibleDescription('하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.');
    expect(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' })).toBeDisabled();
    expect(dialog.getByRole('button', { name: '업무 · 지금 위치' })).toBeEnabled();

    fireEvent.click(dialog.getByRole('button', { name: '관리' }));
    fireEvent.click(dialog.getByRole('button', { name: '맨 앞에 두기' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^관리/ })).toHaveAttribute('aria-selected', 'true');
    expect(rowOrder()).toEqual(['5', '2', '3', '4', '6']);
    expect(liveText()).toContain('결재 메뉴를 관리 맨 앞으로 옮겼습니다.');
    // 다른 영역으로 옮긴 결재는 어떤 그룹에서 숨는다(저장을 막는 문제). 그 수는 '변경 n건' 단추 모서리 배지로 읽힌다.
    // [2026-10-05 2차 리뷰] 변경 목록은 저절로 펼치지 않는다(보드를 밀었다) — 결과 안내가 그 사실을 함께 말하고, 단추로 연다.
    expect(liveText()).toContain("그 결과 메뉴가 숨겨지는 그룹이 1건 생겨 저장할 수 없습니다 — '변경' 목록에서 해결하세요.");
    const toggle = screen.getByRole('button', { name: '변경 1건 저장 전 해결 1건' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByText('결재 — 업무 → 관리')).toBeInTheDocument();
  });

  it('Ctrl+X 로 잘라 놓을 카드를 고른 뒤 Ctrl+V 로 그 안에 붙이고, Esc 는 잘라내기를 취소한다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'x', ctrlKey: true });
    expect(screen.getByText(/잘라 낸 메뉴:/)).toBeInTheDocument();
    fireEvent.keyDown(rowButton('결재함'), { key: 'Escape' });
    expect(screen.queryByText(/잘라 낸 메뉴:/)).not.toBeInTheDocument();
    expect(liveText()).toContain('잘라내기를 취소했습니다.');

    fireEvent.keyDown(rowButton('결재함'), { key: 'x', ctrlKey: true });
    fireEvent.click(rowButton('메뉴 관리'));
    fireEvent.keyDown(rowButton('메뉴 관리'), { key: 'v', ctrlKey: true });

    expect(screen.queryByText(/잘라 낸 메뉴:/)).not.toBeInTheDocument();
    // 한 줄 카드에 줄을 붙이면 그 카드 안 맨 뒤다 — 카드는 섹션이 된다.
    expect(rowOrder()).toEqual(['1', '2', '4', '8', '3']);
    expect(screen.getByRole('region', { name: '메뉴 관리 섹션' })).toBeInTheDocument();
    await waitFor(() => expect(rowButton('결재함')).toHaveFocus());
  });
});

describe('끌어 놓기(다중 컨테이너)', () => {
  const drag = (event: Record<string, unknown>) => {
    dnd.event = event;
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 이동' }));
  };

  it('줄을 다른 줄의 아래쪽 절반에 놓으면 그 뒤로 간다. 놓아도 토스트를 띄우지 않는다', async () => {
    await renderClient();
    drag({ active: { id: 'menu:3', rect: { current: { translated: { top: 30, height: 10 } } } }, over: { id: 'row:4', rect: { top: 20, height: 10 } } });
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 놓기' }));

    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);
    expect(saveButton()).toBeEnabled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('제자리 놓기는 변경이 아니고, 끌기를 취소하면 아무것도 바뀌지 않는다', async () => {
    await renderClient();
    drag({ active: { id: 'menu:3' }, over: { id: 'row:4' } });
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 놓기' }));
    expect(saveButton()).toBeDisabled();

    drag({ active: { id: 'menu:3' }, over: { id: 'section-end:6' } });
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 취소' }));
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(saveButton()).toBeDisabled();
  });

  it('놓을 수 없는 자리는 끄는 동안 이유를 보이고, 놓으면 옮기지 않고 이유를 말한다', async () => {
    await renderClient();
    drag({ active: { id: 'menu:2' }, over: { id: 'section-end:8' } });
    expect(screen.getAllByText('하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 놓기' }));

    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(liveText()).toContain('결재 메뉴를 그 자리로 옮길 수 없습니다. 하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.');
  });

  it('줄을 카드 머리에 끌면 그 카드 안으로 간다고 표시하고(앞·뒤 선이 아니다), 카드를 카드에 끌면 앞·뒤 선을 그린다', async () => {
    await renderClient();
    drag({ active: { id: 'menu:3', rect: { current: { translated: { top: 0, height: 10 } } } }, over: { id: 'card:8', rect: { top: 0, height: 10 } } });
    const card = rowButton('메뉴 관리').closest('[data-menu-entry]') as HTMLElement;
    expect(card.className).toMatch(/ring-2/);
    expect(card.className).toMatch(/ring-primary/);
    expect(card.querySelector('[data-drop-line]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 취소' }));

    drag({ active: { id: 'menu:8', rect: { current: { translated: { top: 0, height: 10 } } } }, over: { id: 'card:2', rect: { top: 0, height: 10 } } });
    const section = rowButton('결재').closest('[data-menu-entry]') as HTMLElement;
    expect(section.querySelector('[data-drop-line="before"]')).not.toBeNull();
    expect(section.className).not.toMatch(/ring-2/);
  });

  it('영역 탭에 놓으면 그 영역의 맨 뒤 2단계로 간다', async () => {
    await renderClient();
    drag({ active: { id: 'menu:3' }, over: { id: 'area-tab:5' } });
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 놓기' }));

    expect(screen.getByRole('tab', { name: /^관리/ })).toHaveAttribute('aria-selected', 'true');
    expect(rowOrder()).toEqual(['5', '6', '3']);
  });
});

describe('찾기 — 거르지 않고 강조하며 Enter 로 다음 일치', () => {
  it('일치는 강조하고 나머지는 흐리게 하며, Enter 는 일치 메뉴를 고른다. 찾는 중에도 옮길 수 있다', async () => {
    await renderClient();
    const search = screen.getByRole('textbox', { name: '메뉴 검색' });
    fireEvent.change(search, { target: { value: '결재함' } });

    expect(screen.getByText('일치 1개')).toBeInTheDocument();
    // 지금 영역(업무)에 일치가 있으면 탭을 바꾸지 않는다.
    expect(areaTab('업무')).toHaveAttribute('aria-selected', 'true');
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(rowButton('결재함').closest('[data-search-match="true"]')).not.toBeNull();
    // 흐리게는 점선 외곽선과 보조 글자색이다 — 줄 전체 불투명도를 낮춰 글자 대비를 떨어뜨리지 않는다. [2026-10-05 2차 리뷰]
    //   테두리를 높이를 더하지 않는 안쪽 외곽선으로 바꿨다(줄 높이 34px → 32px).
    const dimmed = rowButton('권한별 메뉴').closest('[data-menu-entry]') as HTMLElement;
    expect(dimmed).toHaveAttribute('data-dimmed', 'true');
    expect(dimmed.className).not.toMatch(/opacity-/);
    expect(dimmed.className).toMatch(/outline-dashed/);
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(rowButton('결재함')).toHaveAttribute('aria-current', 'true');
    expect(liveText()).toContain('일치 1개 중 1번째: 결재함');

    fireEvent.change(search, { target: { value: '결재' } });
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowUp', altKey: true });
    expect(liveText()).toContain('결재함 메뉴는 같은 상위 안에서 더 위로 옮길 수 없습니다.');
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    expect(saveButton()).toBeEnabled();
  });

  it('입력만으로, 지금 영역에 일치가 없고 다른 영역에 있으면 첫 일치 영역을 연다(시안). 지금 영역에 있으면 그대로 둔다', async () => {
    await renderClient();
    const search = screen.getByRole('textbox', { name: '메뉴 검색' });
    fireEvent.click(rowButton('결재함'));

    fireEvent.change(search, { target: { value: '시스템' } });
    expect(areaTab('관리')).toHaveAttribute('aria-selected', 'true');
    expect(rowOrder()).toEqual(['5', '6']);
    expect(rowButton('시스템').closest('[data-search-match="true"]')).not.toBeNull();
    expect(liveText()).toContain('찾는 메뉴가 있는 관리 영역을 열었습니다.');
    // 다른 영역을 열면 그 영역에 없는 선택은 푼다(탭을 누른 것과 같다).
    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();

    // '관' 은 지금 영역(관리)에도 있다 — 그대로 둔다.
    fireEvent.change(search, { target: { value: '관' } });
    expect(areaTab('관리')).toHaveAttribute('aria-selected', 'true');

    fireEvent.change(search, { target: { value: '결재' } });
    expect(areaTab('업무')).toHaveAttribute('aria-selected', 'true');

    // 어디에도 없으면 탭을 바꾸지 않는다.
    fireEvent.change(search, { target: { value: '없는 메뉴' } });
    expect(areaTab('업무')).toHaveAttribute('aria-selected', 'true');
  });

  it('영역 탭은 하위 메뉴 수를, 찾는 중에는 영역마다 일치 수를, 그룹 미리보기 중에는 보이는 수/하위 수를 보인다', async () => {
    await renderClient();
    // [2026-10-05 2차 리뷰] 이름은 보이는 글자로 시작하고 설명이 뒤에 붙는다(WCAG 2.5.3 — 종전 '업무 하위 메뉴 4개').
    expect(screen.getByRole('tab', { name: '업무 4개 하위 메뉴' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '관리 1개 하위 메뉴' })).toBeInTheDocument();

    const select = await screen.findByRole('combobox', { name: '그룹 미리보기' });
    await waitFor(() => expect(select).toBeEnabled());
    fireEvent.change(select, { target: { value: 'ROLE_USER' } });
    // 사용자 그룹: 업무 아래 결재·결재함만 보인다(권한별 메뉴·메뉴 관리는 메뉴 표시 없음). 관리는 영역부터 숨는다.
    expect(screen.getByRole('tab', { name: '업무 2/4(보이는 메뉴 2개, 하위 메뉴 4개)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '관리 0/1(보이는 메뉴 0개, 하위 메뉴 1개)' })).toBeInTheDocument();
    expect(areaTab('업무').querySelector('[data-area-count]')?.textContent).toContain('2/4');

    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 검색' }), { target: { value: '결재' } });
    expect(screen.getByRole('tab', { name: '업무 2개 찾기 일치' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '관리 0개 찾기 일치' })).toBeInTheDocument();
  });
});

describe('상세 편집 — 초안에 바로 반영하고 검증한다', () => {
  it('이름을 고치면 수정 표시와 변경 목록이 생기고, 비우면 오류를 보이며 저장을 막는다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    const name = screen.getByRole('textbox', { name: '메뉴 이름' });
    fireEvent.change(name, { target: { value: '내 결재함' } });

    expect(rowButton('내 결재함')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '변경 1건' }));
    expect(screen.getByText('내 결재함 — 이름 수정')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();

    fireEvent.change(name, { target: { value: '   ' } });
    expect(screen.getAllByText('메뉴 이름을 입력하세요.').length).toBeGreaterThan(0);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveAccessibleDescription(/입력 오류 1건을 고쳐야 저장할 수 있습니다/);

    // 이름을 비운 메뉴는 번호로 부른다.
    fireEvent.click(screen.getByRole('button', { name: 'ID 3 속성 변경 되돌리기' }));
    expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toHaveValue('결재함');
    expect(saveButton()).toBeDisabled();
  });

  it('연결 화면은 화면 목록에서 고르거나 경로를 직접 쓰고, 별칭·형식 오류를 말한다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재'));
    expect(screen.getByText('연결 경로가 없습니다 — 하위 메뉴를 묶는 분류 메뉴입니다.')).toBeInTheDocument();
    const detail = within(screen.getByTestId('master-detail-detail'));
    // [2026-10-05] 화면 목록은 평소 접혀 있다 — '연결 화면 바꾸기' 를 눌러야 검색 칸과 목록이 펼쳐진다.
    expect(detail.queryByRole('textbox', { name: '연결할 화면 검색' })).not.toBeInTheDocument();
    const change = detail.getByRole('button', { name: '연결 화면 바꾸기' });
    expect(change).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(change);
    expect(change).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(detail.getByRole('textbox', { name: '연결할 화면 검색' }), { target: { value: '/admin/system/menus/by-authority' } });
    fireEvent.click(detail.getByRole('button', { name: /\/admin\/system\/menus\/by-authority$/ }));
    expect(screen.getByText('/admin/system/menus/by-authority', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/진입 권한:/)).toBeInTheDocument();
    // 고르면 목록을 접고 포커스를 '바꾸기' 로 돌린다(누른 항목이 사라져 포커스가 문서 밖으로 빠지지 않게).
    expect(detail.queryByRole('textbox', { name: '연결할 화면 검색' })).not.toBeInTheDocument();
    await waitFor(() => expect(detail.getByRole('button', { name: '연결 화면 바꾸기' })).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: '경로 직접 입력' }));
    const route = screen.getByRole('textbox', { name: '연결 경로' });
    fireEvent.change(route, { target: { value: '/admin/collaboration/address-book' } });
    expect(screen.getByText(/다른 화면으로 넘어가는 경로입니다: \/admin\/collaboration\/address-book\/select-address-book-list/)).toBeInTheDocument();
    fireEvent.change(route, { target: { value: '/admin/x?q=홍길동' } });
    expect(screen.getAllByText(/연결 경로 형식이 올바르지 않습니다/).length).toBeGreaterThan(0);
    expect(saveButton()).toBeDisabled();
  });

  it('하위가 있는 메뉴는 삭제를 막고 이유를 말하며, 줄은 삭제 예정으로 표시했다가 취소할 수 있다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재'));
    expect(screen.getByRole('button', { name: '메뉴 삭제' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '메뉴 삭제' })).toHaveAccessibleDescription(/하위 메뉴 2개가 있어 삭제할 수 없습니다/);

    fireEvent.click(rowButton('결재함'));
    fireEvent.click(screen.getByRole('button', { name: '메뉴 삭제' }));
    expect(within(rowButton('결재함')).getByText('삭제 예정')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '메뉴 이름' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한 칸 위로' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '삭제 취소' }));
    expect(saveButton()).toBeDisabled();
  });
});

describe('새 메뉴 — 그 자리 맨 끝에 초안으로 만들고 이름 칸으로 간다', () => {
  it('화면 추가는 섹션 맨 끝에 저장 전 메뉴를 만들고, 그룹에 보이지 않는다는 사실을 말하며, 지울 수 있다', async () => {
    await renderClient();
    fireEvent.click(screen.getByRole('button', { name: '결재 아래 화면 추가' }));

    expect(rowOrder()).toEqual(['1', '2', '3', '4', '-1', '8']);
    const created = screen.getByRole('button', { name: /^이름 없는 새 메뉴 ID: 저장 전/ });
    expect(created).toHaveAttribute('aria-current', 'true');
    expect(within(created).getByText('새 메뉴')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toHaveFocus());
    expect(screen.getByText(/새 메뉴는 저장 전에는 어느 그룹에도 보이지 않습니다/)).toBeInTheDocument();
    // 이름이 없으면 저장할 수 없다.
    expect(saveButton()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '새 메뉴 지우기' }));
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(saveButton()).toBeDisabled();
  });

  it('화면 관리의 메뉴에 추가 인계가 있으면 새 메뉴 위치 고르기를 열어 그 경로·이름으로 만들고, 인계를 지운다', async () => {
    expect(handOffScreen({ route: '/admin/system/menus/by-authority', label: '그룹별 메뉴 현황' })).toBe(true);
    await renderClient();
    const dialog = within(await screen.findByRole('dialog', { name: '새 메뉴 위치 고르기' }));
    expect(dialog.getByText(/그룹별 메뉴 현황 화면\(\/admin\/system\/menus\/by-authority\)을 연결한 새 메뉴를 만들 곳을 고르세요/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: '관리 › 시스템' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치에 새 메뉴 만들기' }));

    expect(areaTab('관리')).toHaveAttribute('aria-selected', 'true');
    expect(rowButton('그룹별 메뉴 현황')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toHaveValue('그룹별 메뉴 현황');
    await waitFor(() => expect(window.sessionStorage.length).toBe(0));
  });

  it('등록 권한이 없으면 인계를 받아도 대화상자를 열지 않고 이유를 말한다', async () => {
    handOffScreen({ route: '/admin/system/menus', label: '메뉴 관리' });
    await renderClient({ permissions: ['MENU_READ', 'MENU_UPDATE'] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(liveText()).toContain('화면을 메뉴에 추가하려면 메뉴 등록 권한과 메뉴 수정 권한이 모두 필요합니다.');
  });
});

describe('보이는 그룹 — 메뉴 표시와 진입 권한(초안)', () => {
  it('하위를 켜면 상위를 함께 켜고, 진입 권한이 없으면 그 그룹 진입 권한 추가를 둔다', async () => {
    await renderClient();
    fireEvent.click(rowButton('메뉴 관리'));
    const userCheck = await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ });
    expect(userCheck).not.toBeChecked();
    fireEvent.click(userCheck);
    expect(userCheck).toBeChecked();
    expect(screen.getByText(/진입 권한 없음 — 필요한 권한: .*\(MENU_READ\)/)).toBeInTheDocument();
    const addEntry = screen.getByRole('button', { name: '사용자 진입 권한 추가' });
    addEntry.focus();
    fireEvent.click(addEntry);
    expect(screen.queryByText(/진입 권한 없음/)).not.toBeInTheDocument();
    // 누른 단추가 사라지므로 같은 그룹의 메뉴 표시 체크로 포커스를 옮긴다.
    expect(screen.getByRole('checkbox', { name: /사용자 메뉴 표시/ })).toHaveFocus();

    fireEvent.click(screen.getByRole('tab', { name: /^관리/ }));
    fireEvent.click(rowButton('시스템'));
    fireEvent.click(await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ }));
    expect(liveText()).toContain('사용자 그룹에 시스템 메뉴 표시를 켰습니다. 상위 메뉴 표시도 함께 켰습니다.');
    fireEvent.click(screen.getByRole('button', { name: '변경 1건' }));
    expect(screen.getByText('사용자 그룹 — 메뉴 표시 추가 메뉴 관리, 관리, 시스템 · 기능권한 추가 MENU_READ')).toBeInTheDocument();
  });

  it('옮긴 메뉴가 어떤 그룹에서 숨겨지면 경고하고 저장을 막으며, 상위 표시 추가로 해결한다', async () => {
    await renderClient();
    await screen.findByRole('combobox', { name: '그룹 미리보기' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: '그룹 미리보기' })).toBeEnabled());
    fireEvent.click(rowButton('결재함'));
    fireEvent.click(screen.getByRole('button', { name: '다른 곳으로 옮기기…' }));
    const dialog = within(await screen.findByRole('dialog', { name: '다른 곳으로 옮기기' }));
    fireEvent.click(dialog.getByRole('button', { name: '관리 › 시스템' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' }));

    // [2026-10-05 2차 리뷰] 목록은 저절로 펼치지 않는다 — 결과 안내와 단추 배지가 알리고, 단추로 연다.
    expect(liveText()).toContain('그 결과 메뉴가 숨겨지는 그룹이 1건 생겨 저장할 수 없습니다');
    expect(screen.queryByRole('group', { name: '저장 전에 해결할 문제' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '변경 1건 저장 전 해결 1건' }));
    const problems = within(screen.getByRole('group', { name: '저장 전에 해결할 문제' }));
    expect(problems.getByText("'결재함'을(를) 옮기면 사용자 그룹에서 상위 메뉴 '시스템'가 표시되지 않아 숨겨집니다.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveAccessibleDescription(/메뉴가 숨겨지는 그룹 1건을 해결해야 저장할 수 있습니다/);
    expect(problems.getByRole('button', { name: '사용자에서 이 메뉴 표시 회수' })).toBeEnabled();
    const resolve = problems.getByRole('button', { name: '사용자에 상위 메뉴 표시 추가' });
    resolve.focus();
    fireEvent.click(resolve);

    expect(screen.queryByRole('group', { name: '저장 전에 해결할 문제' })).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    // 해결 단추는 문제와 함께 사라진다 — 포커스는 문서 밖으로 빠지지 않고 변경 목록 단추로 간다.
    await waitFor(() => expect(screen.getByRole('button', { name: '변경 2건' })).toHaveFocus());
  });

  it('새 메뉴의 표시를 켠 뒤 그 그룹이 보지 않는 곳으로 옮기면, 상위도 표시해야 한다고 경고하고 저장을 막는다', async () => {
    await renderClient();
    await waitFor(() => expect(screen.getByRole('combobox', { name: '그룹 미리보기' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결재 아래 화면 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: '새 화면' } });
    fireEvent.click(await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ }));
    fireEvent.click(screen.getByRole('button', { name: '다른 곳으로 옮기기…' }));
    const dialog = within(await screen.findByRole('dialog', { name: '다른 곳으로 옮기기' }));
    fireEvent.click(dialog.getByRole('button', { name: '관리 › 시스템' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' }));

    // 새 메뉴는 '옮긴 기존 메뉴' 검사에 들지 않는다 — 그래도 서버가 상위 선택 누락으로 거부하므로 저장 전에 막는다.
    expect(liveText()).toContain('그 결과 메뉴가 숨겨지는 그룹이 1건 생겨 저장할 수 없습니다');
    fireEvent.click(screen.getByRole('button', { name: /^변경 \d+건 저장 전 해결 1건$/ }));
    const problems = within(screen.getByRole('group', { name: '저장 전에 해결할 문제' }));
    expect(problems.getByText("'새 화면'을(를) 사용자 그룹에 표시하려면 지금 상위 메뉴 '시스템'도 그 그룹에 표시해야 합니다.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    fireEvent.click(problems.getByRole('button', { name: '사용자에 상위 메뉴 표시 추가' }));
    expect(screen.queryByRole('group', { name: '저장 전에 해결할 문제' })).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('진입 권한 후보 선택은 그 메뉴의 것이다 — 다른 메뉴를 고르면 그 메뉴에 보이는 후보를 추가한다', async () => {
    mocks.matrix.mockResolvedValue({ catalogVersion: 'c1', groups: [{ code: 'ROLE_USER', name: '사용자', description: null, version: 'u1', complete: true, grants: nav(1, 2, 3) }] });
    await renderClient({ menus: [menu(1, '관리', null, 1), menu(2, '로그', 1, 1, '/admin/system/logs'), menu(3, '권한', 1, 2, '/admin/security/authority')] });
    fireEvent.click(rowButton('로그'));
    fireEvent.change(await screen.findByRole('combobox', { name: '사용자 진입 권한 선택' }), { target: { value: 'WEB_LOG_READ' } });

    fireEvent.click(rowButton('권한'));
    const select = await screen.findByRole('combobox', { name: '사용자 진입 권한 선택' }) as HTMLSelectElement;
    const shown = select.value;
    expect([...select.options].map((option) => option.value)).toContain(shown);
    expect(shown).not.toBe('WEB_LOG_READ');
    fireEvent.click(screen.getByRole('button', { name: '사용자 진입 권한 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '변경 1건' }));
    expect(screen.getByText(`사용자 그룹 — 기능권한 추가 ${shown}`)).toBeInTheDocument();
  });

  it('후보 선택은 메뉴마다 새로 시작한다 — 같은 후보를 가진 다른 메뉴에 앞 메뉴의 선택이 남지 않는다', async () => {
    mocks.matrix.mockResolvedValue({ catalogVersion: 'c1', groups: [{ code: 'ROLE_USER', name: '사용자', description: null, version: 'u1', complete: true, grants: nav(1, 2, 3) }] });
    await renderClient({ menus: [menu(1, '관리', null, 1), menu(2, '로그', 1, 1, '/admin/system/logs'), menu(3, '로그 사본', 1, 2, '/admin/system/logs')] });
    fireEvent.click(rowButton('로그 사본'));
    const preferred = (await screen.findByRole('combobox', { name: '사용자 진입 권한 선택' }) as HTMLSelectElement).value;
    fireEvent.click(rowButton('로그'));
    const first = await screen.findByRole('combobox', { name: '사용자 진입 권한 선택' }) as HTMLSelectElement;
    const other = [...first.options].map((option) => option.value).find((value) => value !== preferred)!;
    fireEvent.change(first, { target: { value: other } });

    fireEvent.click(rowButton('로그 사본'));
    expect((screen.getByRole('combobox', { name: '사용자 진입 권한 선택' }) as HTMLSelectElement).value).toBe(preferred);
  });

  it('같은 메뉴의 연결 화면을 바꿔 후보가 달라지면 앞서 고른 후보를 버리고 지금 보이는 후보를 추가한다', async () => {
    mocks.matrix.mockResolvedValue({ catalogVersion: 'c1', groups: [{ code: 'ROLE_USER', name: '사용자', description: null, version: 'u1', complete: true, grants: nav(1, 2) }] });
    await renderClient({ menus: [menu(1, '관리', null, 1), menu(2, '로그', 1, 1, '/admin/system/logs')] });
    fireEvent.click(rowButton('로그'));
    fireEvent.change(await screen.findByRole('combobox', { name: '사용자 진입 권한 선택' }), { target: { value: 'WEB_LOG_READ' } });
    fireEvent.click(screen.getByRole('button', { name: '경로 직접 입력' }));
    fireEvent.change(screen.getByRole('textbox', { name: '연결 경로' }), { target: { value: '/admin/security/authority' } });

    const select = screen.getByRole('combobox', { name: '사용자 진입 권한 선택' }) as HTMLSelectElement;
    const shown = select.value;
    expect(shown).not.toBe('WEB_LOG_READ');
    fireEvent.click(screen.getByRole('button', { name: '사용자 진입 권한 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '변경 2건' }));
    expect(screen.getByText(`사용자 그룹 — 기능권한 추가 ${shown}`)).toBeInTheDocument();
  });

  it('그룹 미리보기를 고르면 그 그룹에서 숨는 메뉴를 흐리게 하고 이유를 붙인다', async () => {
    await renderClient();
    const select = await screen.findByRole('combobox', { name: '그룹 미리보기' });
    await waitFor(() => expect(select).toBeEnabled());
    fireEvent.change(select, { target: { value: 'ROLE_USER' } });

    expect(within(rowButton('메뉴 관리')).getByText('메뉴 표시 없음')).toBeInTheDocument();
    expect(within(rowButton('권한별 메뉴')).getByText('메뉴 표시 없음')).toBeInTheDocument();
    expect(within(rowButton('결재함')).queryByText('메뉴 표시 없음')).not.toBeInTheDocument();
    // 요약은 탭 줄 아래 상태 줄에 둔다(종전에는 보드 위 두 줄 문장이 보드를 밀었다).
    expect(screen.getByText(/사용자 그룹 미리보기 — 저장 전 초안 기준 보이는 메뉴 3개, 숨는 메뉴 4개/)).toBeInTheDocument();
    expect(screen.getByText('사용자 · 보임 3 · 숨김 4')).toBeInTheDocument();
  });
});

describe('저장 — 한 번에, 버전 확인, 중복 실행 차단', () => {
  it('변경 저장은 같은 tick 중복 실행을 막고, 요약을 확인한 뒤 저장하며, pending·실패를 안내하고 초안을 지킨다', async () => {
    const pending = deferred<ReturnType<typeof structure>>();
    mocks.save.mockReturnValueOnce(pending.promise);
    await renderClient();
    await waitFor(() => expect(mocks.matrix).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    const button = screen.getByRole('button', { name: '변경 저장' });
    expect(button).toBeEnabled();

    act(() => {
      button.click();
      button.click();
    });

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '메뉴 구조 저장',
      message: '새 메뉴 0개 · 삭제 0개 · 위치 1개 · 속성 0개 · 그룹 배정 0건(그룹 0개)을 저장합니다.',
      confirmText: '변경 저장',
    }));
    expect(mocks.save).toHaveBeenCalledWith({
      version: 'v1',
      creations: [],
      placements: [
        { ref: '4', parentRef: '2', menuOrdr: 1 },
        { ref: '3', parentRef: '2', menuOrdr: 2 },
      ],
      properties: [],
      deletions: [],
      grants: [],
    }, { suppressErrorToast: true });
    const pendingButton = screen.getByRole('button', { name: '변경 저장 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    // 저장 중에는 끌기·옮기기를 막는다.
    expect(screen.getByRole('button', { name: '결재함 끌어서 옮기기' })).toBeDisabled();

    await act(async () => pending.reject({ response: { status: 400, data: { message: "메뉴는 3단계까지만 둘 수 있습니다. '결재함'이(가) 4단계가 됩니다." } } }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('변경을 저장하지 못했습니다');
    expect(alert).toHaveTextContent("메뉴는 3단계까지만 둘 수 있습니다. '결재함'이(가) 4단계가 됩니다.");
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);
    expect(saveButton()).toBeEnabled();
  });

  it('저장에 성공하면 응답 구조를 새 기준선으로 삼고, 그룹 권한을 다시 읽고, 화면을 새로 고친다', async () => {
    const saved = structure([MENUS[0], MENUS[1], MENUS[3], { ...MENUS[2], menuOrdr: 2 }, ...MENUS.slice(4)].map((item) => (
      item.menuNo === 4 ? { ...item, menuOrdr: 1 } : item)), 'v2');
    mocks.save.mockResolvedValueOnce(saved);
    await renderClient();
    await waitFor(() => expect(mocks.matrix).toHaveBeenCalledTimes(1));
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    expect(undoButton()).not.toHaveAttribute('aria-disabled');
    fireEvent.click(saveButton());

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메뉴 구조를 저장했습니다.', 'success'));
    expect(saveButton()).toBeDisabled();
    // 저장하면 되돌리기 이력도 비운다 — 쌓인 초안은 옛 기준선의 것이다. 되돌리기는 disabled 가 아니라 aria-disabled 다(포커스를
    // 잃지 않는다 — 반박 리뷰). '변경 n건' 은 늘 그리며 변경이 없으면 막힌다.
    expect(undoButton()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: '변경 0건' })).toBeDisabled();
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);
    expect(rowButton('결재함')).toHaveAttribute('aria-current', 'true');
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.matrix).toHaveBeenCalledTimes(2));
  });

  it('저장 확인 대화상자는 요약 문장과 함께 저장할 변경 목록을 보인다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: '내 결재함' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));

    const options = mocks.confirm.mock.calls[0][0] as { detailsLabel?: string; details?: React.ReactNode };
    expect(options.detailsLabel).toBe('저장할 변경 목록');
    const details = render(<>{options.details}</>);
    const items = within(details.container).getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual(['권한별 메뉴 — 순서 변경(업무 › 결재)', '내 결재함 — 이름 수정']);
  });

  it('확인을 취소하면 저장하지 않는다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    await renderClient();
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(saveButton()).toBeEnabled();
  });

  it('409 면 초안을 지우지 않고 배너를 보이며, 다시 불러오기는 최신 구조로 바꾼다', async () => {
    mocks.save.mockRejectedValueOnce({ response: { status: 409, data: { message: '메뉴 구조가 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.' } } });
    mocks.reload.mockResolvedValueOnce(structure([...MENUS, menu(9, '새로 생긴 메뉴', 5, 2)], 'v3'));
    await renderClient();
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(saveButton());

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('다른 곳에서 메뉴 구조나 그룹 권한이 바뀌었습니다');
    expect(banner).toHaveTextContent('메뉴 구조가 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.');
    expect(banner).toHaveTextContent('다시 불러오면 지금 변경은 사라집니다.');
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);

    fireEvent.click(within(banner).getByRole('button', { name: '다시 불러오기' }));
    await waitFor(() => expect(mocks.reload).toHaveBeenCalledWith({ suppressErrorToast: true }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(saveButton()).toBeDisabled();
  });

  it('Ctrl/Cmd+S 는 선택과 무관하게 같은 저장을 실행한다(페이지 범위)', async () => {
    await renderClient();
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(screen.getByRole('tab', { name: /^관리/ }));
    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();

    const shortcut = fireEvent.keyDown(screen.getByRole('textbox', { name: '메뉴 검색' }), { key: 's', ctrlKey: true });
    expect(shortcut).toBe(false);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  });

  it('변경 모두 되돌리기는 확인을 거친다', async () => {
    await renderClient();
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(screen.getByRole('button', { name: '변경 1건' }));
    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '모두 되돌리기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '변경 모두 되돌리기', confirmText: '모두 되돌리기', variant: 'destructive',
    })));
    expect(saveButton()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '모두 되돌리기' }));
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(liveText()).toContain('저장하지 않은 변경을 모두 되돌렸습니다.');
  });
});

describe('포커스 — 누른 단추가 사라져도 문서 밖으로 빠지지 않는다', () => {
  it('새 메뉴의 이름 칸 포커스는 한 번만이다 — 상세가 닫혔다 같은 메뉴로 다시 열려도 이름 칸으로 끌려가지 않는다', async () => {
    await renderClient();
    fireEvent.click(screen.getByRole('button', { name: '결재 아래 화면 추가' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toHaveFocus());

    fireEvent.click(areaTab('관리'));
    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();
    fireEvent.click(areaTab('업무'));
    const created = screen.getByRole('button', { name: /^이름 없는 새 메뉴 ID: 저장 전/ });
    created.focus();
    fireEvent.click(created);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(created).toHaveFocus();
  });

  it('새 메뉴를 지우면 바로 앞 메뉴를 고르고 그 보드 항목으로 포커스를 옮기며, 그 뒤 상세가 다시 열려도 이름 칸으로 끌려가지 않는다', async () => {
    await renderClient();
    fireEvent.click(screen.getByRole('button', { name: '결재 아래 화면 추가' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: '새 메뉴 지우기' }));

    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(rowButton('권한별 메뉴')).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(rowButton('권한별 메뉴')).toHaveFocus());

    // 다른 영역 탭에 다녀와 상세를 닫았다 다시 연다 — 지난 포커스 요청을 다시 쓰지 않는다.
    fireEvent.click(areaTab('관리'));
    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();
    fireEvent.click(areaTab('업무'));
    rowButton('결재함').focus();
    fireEvent.click(rowButton('결재함'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(rowButton('결재함')).toHaveFocus();
  });

  it('삭제 예정 하위가 있는 새 메뉴는 지울 수 없다 — 상세 단추도 초안 연산과 같은 판정으로 막는다', async () => {
    await renderClient();
    fireEvent.click(screen.getByRole('button', { name: '섹션 추가(업무)' }));
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: '새 섹션' } });
    fireEvent.click(rowButton('메뉴 관리'));
    fireEvent.click(screen.getByRole('button', { name: '다른 곳으로 옮기기…' }));
    const dialog = within(await screen.findByRole('dialog', { name: '다른 곳으로 옮기기' }));
    fireEvent.click(dialog.getByRole('button', { name: '업무 › 새 섹션' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' }));
    fireEvent.click(screen.getByRole('button', { name: '메뉴 삭제' }));

    fireEvent.click(rowButton('새 섹션'));
    const remove = screen.getByRole('button', { name: '새 메뉴 지우기' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAccessibleDescription(/하위 메뉴 1개\(삭제 예정 포함\)가 있어 지울 수 없습니다/);
  });

  it('메뉴 삭제와 삭제 취소는 같은 단추다 — 누른 뒤에도 포커스가 그 단추에 남는다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    const button = screen.getByRole('button', { name: '메뉴 삭제' });
    button.focus();
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '삭제 취소' })).toBe(button);
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '메뉴 삭제' })).toHaveFocus();
  });

  it('변경 목록에서 되돌리면 다음 항목의 되돌리기로, 남은 변경이 없으면 보드의 고른 항목으로 포커스가 간다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: '내 결재함' } });
    fireEvent.keyDown(rowButton('내 결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(screen.getByRole('button', { name: '변경 2건' }));

    // 맞바꾼 두 메뉴 가운데 '순서' 는 계산이 정한 하나(권한별 메뉴)에 붙는다.
    const place = screen.getByRole('button', { name: '권한별 메뉴 위치 변경 되돌리기' });
    place.focus();
    fireEvent.click(place);
    await waitFor(() => expect(screen.getByRole('button', { name: '내 결재함 속성 변경 되돌리기' })).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: '내 결재함 속성 변경 되돌리기' }));
    expect(screen.queryByRole('region', { name: '저장하지 않은 변경' })).not.toBeInTheDocument();
    await waitFor(() => expect(rowButton('결재함')).toHaveFocus());
  });

  it('입력 오류의 고치기는 첫 오류 칸으로 간다 — 연결 경로 오류면 접어 둔 직접 입력 칸을 열어 그 칸으로 간다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재'));
    fireEvent.click(screen.getByRole('button', { name: '경로 직접 입력' }));
    fireEvent.change(screen.getByRole('textbox', { name: '연결 경로' }), { target: { value: '/admin/x?q=홍길동' } });
    fireEvent.click(screen.getByRole('button', { name: '화면 목록에서 고르기' }));
    expect(screen.queryByRole('textbox', { name: '연결 경로' })).not.toBeInTheDocument();

    // 입력 오류는 변경 목록 안에 있다(목록은 저절로 펼치지 않는다 — '변경 n건' 단추로 연다).
    fireEvent.click(screen.getByRole('button', { name: '변경 1건 저장 전 해결 1건' }));
    fireEvent.click(screen.getByRole('button', { name: '결재 고치기' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '연결 경로' })).toHaveFocus());
  });
});

describe('그룹 권한을 모를 때와 배너 문장', () => {
  it('그룹 권한 다시 읽기가 실패하면 앞서 읽은 값으로 판정하지 않는다 — 오류로 보이고, 숨김 검사를 못 했다고 말한다', async () => {
    const view = await renderClient();
    fireEvent.click(rowButton('결재함'));
    expect(await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ })).toBeInTheDocument();

    mocks.matrix.mockRejectedValueOnce(new Error('network'));
    await act(async () => { await view.client.refetchQueries(); });
    expect(await screen.findByText('그룹 권한을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /사용자 메뉴 표시/ })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '그룹 미리보기' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '다른 곳으로 옮기기…' }));
    const dialog = within(await screen.findByRole('dialog', { name: '다른 곳으로 옮기기' }));
    fireEvent.click(dialog.getByRole('button', { name: '관리 › 시스템' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' }));
    expect(screen.queryByRole('group', { name: '저장 전에 해결할 문제' })).not.toBeInTheDocument();
    expect(saveButton()).toHaveAccessibleDescription(/그룹 권한을 불러오지 못해 메뉴가 숨겨지는 그룹을 미리 확인하지 못했습니다/);
  });

  it('저장 뒤 그룹 권한을 다시 읽는 동안에는 저장 전 권한으로 그룹 메뉴 표시를 보이거나 바꾸지 않는다', async () => {
    await renderClient();
    await waitFor(() => expect(mocks.matrix).toHaveBeenCalledTimes(1));
    fireEvent.click(rowButton('결재함'));
    expect(await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ })).toBeInTheDocument();
    const reread = deferred<typeof MATRIX>();
    mocks.matrix.mockReturnValueOnce(reread.promise);
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메뉴 구조를 저장했습니다.', 'success'));

    expect(await screen.findByText('그룹 권한을 불러오는 중…')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /사용자 메뉴 표시/ })).not.toBeInTheDocument();
    await act(async () => reread.resolve({ ...MATRIX, groups: MATRIX.groups.map((group) => ({ ...group, version: `${group.version}-2` })) }));
    expect(await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ })).toBeInTheDocument();
  });

  it('409 뒤 변경을 모두 되돌리면 배너는 지킬 변경이 없다고 말한다', async () => {
    mocks.save.mockRejectedValueOnce({ response: { status: 409, data: { message: '메뉴 구조가 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.' } } });
    await renderClient();
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('다시 불러오면 지금 변경은 사라집니다.');

    fireEvent.click(screen.getByRole('button', { name: '변경 1건' }));
    fireEvent.click(screen.getByRole('button', { name: '모두 되돌리기' }));
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.getByRole('alert')).toHaveTextContent('저장하지 않은 변경은 이제 없습니다. 최신 구조를 보려면 다시 불러오세요.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('지금 변경은 지우지 않았습니다');
  });

  it('400 뒤 초안을 바꾸면 거부 문구를 마지막 저장 시도로 말하고, 변경이 없어지면 거둔다', async () => {
    mocks.save.mockRejectedValueOnce({ response: { status: 400, data: { message: '서버가 거부한 사유입니다.' } } });
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('변경을 저장하지 못했습니다');

    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: '내 결재함' } });
    expect(screen.getByRole('alert')).toHaveTextContent('마지막 저장 시도를 서버가 거부했습니다');
    expect(screen.getByRole('alert')).toHaveTextContent('서버가 거부한 사유입니다.');

    fireEvent.click(screen.getByRole('button', { name: '변경 2건' }));
    fireEvent.click(screen.getByRole('button', { name: '모두 되돌리기' }));
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('원래 상위가 삭제 예정인 위치 변경은 되돌리기를 막고 이유를 말한다', async () => {
    await renderClient();
    fireEvent.click(areaTab('관리'));
    fireEvent.click(rowButton('시스템'));
    fireEvent.click(screen.getByRole('button', { name: '다른 곳으로 옮기기…' }));
    const dialog = within(await screen.findByRole('dialog', { name: '다른 곳으로 옮기기' }));
    fireEvent.click(dialog.getByRole('button', { name: '업무' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' }));
    fireEvent.click(screen.getByRole('tab', { name: /^관리/ }));
    fireEvent.click(rowButton('관리'));
    fireEvent.click(screen.getByRole('button', { name: '메뉴 삭제' }));

    fireEvent.click(screen.getByRole('button', { name: '변경 2건' }));
    const revert = screen.getByRole('button', { name: '시스템 위치 변경 되돌리기' });
    expect(revert).toBeDisabled();
    expect(revert).toHaveAccessibleDescription("원래 상위 메뉴 '관리'이(가) 삭제 예정이라 되돌릴 수 없습니다. 그 메뉴의 삭제를 먼저 취소하세요.");
  });
});

describe('시안 밀도 — 한 줄 줄·카드 순번·변경 목록 여닫기·되돌리기·그룹별 결과', () => {
  it('줄은 한 줄이다 — ID 는 접근 이름에만, 번호·연결 경로는 title 에 두고 보드에 경로 글자를 그리지 않는다', async () => {
    await renderClient();
    const row = rowButton('결재함');
    expect(row).toHaveAccessibleName('결재함 ID: 3');
    expect(row).toHaveAttribute('title', 'ID: 3 · /approvals');
    // 'ID: 3' 은 sr-only 안에만 있다 — 보이는 글자로 그리지 않는다.
    expect(within(row).getByText('ID: 3')).toHaveClass('sr-only');
    const master = within(screen.getByTestId('master-detail-master'));
    expect(master.queryByText('/approvals')).not.toBeInTheDocument();
    // 고른 줄의 상세는 번호와 연결 경로를 늘 보인다(헌법 제16조 2항 — hover 에만 두지 않는다).
    fireEvent.click(row);
    expect(screen.getByText('메뉴 ID 3')).toBeInTheDocument();
    expect(within(screen.getByTestId('master-detail-detail')).getByText('/approvals', { selector: 'p' })).toBeInTheDocument();
  });

  it('카드 머리는 순번과 하위 수를 보이고, 화면 추가는 카드 머리의 + 단추다. 하위 없는 화면 카드는 한 줄 카드다', async () => {
    await renderClient();
    const section = screen.getByRole('region', { name: '결재 섹션' });
    expect(within(section).getByText('1', { selector: '[data-seq]' })).toBeInTheDocument();
    expect(section.querySelector('[data-child-count]')).toHaveTextContent('하위 2개');
    const add = within(section).getByRole('button', { name: '결재 아래 화면 추가' });
    expect(add.closest('[data-menu-entry="card"]')).not.toBeNull();
    const screenCard = screen.getByRole('region', { name: '메뉴 관리 화면' });
    expect(within(screenCard).getByText('2', { selector: '[data-seq]' })).toBeInTheDocument();
    expect(screenCard.querySelector('ul')).toBeNull();
    expect(screenCard.querySelector('[data-child-count]')).toBeNull();
    // [2026-10-05 2차 리뷰] 섹션 추가·영역 추가는 영역 머리 줄 오른쪽에 있다 — 탭 줄에 두면 좁은 창에서 탭 줄이 두세 줄로 접혀
    //   보드를 밀었다(Chromium 실측 1366 폭 77px·1280 폭 113px). 탭 줄에는 영역 탭만 있다.
    const tablistRow = screen.getByRole('tablist', { name: '메뉴 영역' }).parentElement as HTMLElement;
    expect(within(tablistRow).queryAllByRole('button')).toHaveLength(0);
    const areaHead = screen.getByRole('button', { name: /^업무 ID: 1$/ }).closest('[data-menu-entry="area"]') as HTMLElement;
    expect(within(areaHead).getByRole('button', { name: '섹션 추가(업무)' })).toBeInTheDocument();
    expect(within(areaHead).getByRole('button', { name: '영역 추가' })).toBeInTheDocument();
  });

  it('변경 목록은 저절로 펼치지 않는다 — 첫 변경도, 저장을 막는 문제가 생겨도 단추 배지와 변경 저장의 설명이 알리고 단추로 연다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });

    const toggle = screen.getByRole('button', { name: '변경 1건' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: '저장하지 않은 변경' })).not.toBeInTheDocument();
    // 닫혀 있어도 저장 상태 문장은 '변경 저장' 의 설명으로 남는다.
    expect(saveButton()).toHaveAccessibleDescription(/저장하지 않은 변경이 있습니다/);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: '저장하지 않은 변경' })).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByRole('region', { name: '저장하지 않은 변경' })).not.toBeInTheDocument();

    // [2026-10-05 2차 리뷰] 저장을 막는 문제(이름 비움)가 생겨도 목록은 닫힌 채다 — 저절로 펼친 목록이 보드 위에서 보드를 밀어
    //   방금 다룬 줄이 시야 밖으로 나갔다(Chromium 실측 1920×950 보이는 항목 12→0). 문제의 수는 단추 모서리 배지로 읽히고,
    //   '변경 저장' 의 설명이 무엇이 저장을 막는지 말한다.
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: ' ' } });
    const blockedToggle = screen.getByRole('button', { name: '변경 2건 저장 전 해결 1건' });
    expect(blockedToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: '저장하지 않은 변경' })).not.toBeInTheDocument();
    expect(within(blockedToggle).getByText('저장 전 해결 1건')).toHaveClass('sr-only');
    expect(saveButton()).toHaveAccessibleDescription(/입력 오류 1건을 고쳐야 저장할 수 있습니다/);
    fireEvent.click(blockedToggle);
    expect(within(screen.getByRole('list', { name: '입력 오류' })).getByText(/메뉴 이름을 입력하세요/)).toBeInTheDocument();
    // 사용자가 연 목록은 문제가 풀려도 닫히지 않는다(사용자가 닫는다).
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: '결재함' } });
    expect(screen.getByRole('button', { name: '변경 1건' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: '저장하지 않은 변경' })).toBeInTheDocument();
  });

  it('저장을 막는 문제의 배지는 단추 폭에 들지 않는다 — 단추 모서리에 겹쳐 그려 도구 줄이 접히지 않는다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 이름' }), { target: { value: ' ' } });
    const toggle = screen.getByRole('button', { name: '변경 1건 저장 전 해결 1건' });
    const badge = toggle.querySelector('[data-blocking-badge]') as HTMLElement;
    // jsdom 은 배치를 재지 않는다 — 폭에 들지 않게 하는 클래스 성질(겹쳐 그리기)을 고정한다. 단추는 그 기준(relative)이다.
    expect(badge).toHaveClass('absolute');
    expect(toggle).toHaveClass('relative', 'min-w-[7rem]');
  });

  it('되돌리기 단추와 Ctrl+Z 는 직전 변경을 한 단계씩 되돌리고, 이어서 입력한 이름은 한 단계다. 입력 칸의 Ctrl+Z 는 가로채지 않는다', async () => {
    await renderClient();
    expect(undoButton()).toHaveAttribute('aria-disabled', 'true');
    expect(undoButton()).toHaveAttribute('aria-keyshortcuts', 'Control+Z');
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);

    const name = screen.getByRole('textbox', { name: '메뉴 이름' });
    fireEvent.change(name, { target: { value: '내' } });
    fireEvent.change(name, { target: { value: '내 결재' } });
    fireEvent.change(name, { target: { value: '내 결재함' } });
    // 이름 칸에서는 브라우저의 입력 되돌리기에 맡긴다(기본 동작을 막지 않고 초안도 그대로다).
    expect(fireEvent.keyDown(name, { key: 'z', ctrlKey: true })).toBe(true);
    expect(name).toHaveValue('내 결재함');

    fireEvent.click(undoButton());
    expect(screen.getByRole('textbox', { name: '메뉴 이름' })).toHaveValue('결재함');
    expect(liveText()).toContain('직전 변경(결재함 이름 수정)을 되돌렸습니다.');
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);

    expect(fireEvent.keyDown(rowButton('결재함'), { key: 'z', ctrlKey: true })).toBe(false);
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
    expect(liveText()).toContain('직전 변경(결재함 한 칸 아래로)을 되돌렸습니다.');
    expect(saveButton()).toBeDisabled();
    // 마지막 단계를 되돌리면 막히지만 disabled 가 아니라 aria-disabled 라 단추에 둔 포커스가 문서 밖으로 빠지지 않는다(WCAG
    // 2.4.3, 반박 리뷰). 막힌 채 누르면 되돌릴 것이 없다고 말한다.
    expect(undoButton()).toHaveAttribute('aria-disabled', 'true');
    expect(undoButton()).not.toBeDisabled();
    undoButton().focus();
    fireEvent.click(undoButton());
    expect(undoButton()).toHaveFocus();
    expect(liveText()).toContain('되돌릴 변경이 없습니다.');
  });

  it('옮기기를 되돌리면 고른 메뉴의 원래 영역을 연다. 모두 되돌리기도 되돌리기로 다시 살릴 수 있다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재'));
    fireEvent.click(screen.getByRole('button', { name: '다른 곳으로 옮기기…' }));
    const dialog = within(await screen.findByRole('dialog', { name: '다른 곳으로 옮기기' }));
    fireEvent.click(dialog.getByRole('button', { name: '관리' }));
    fireEvent.click(dialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' }));
    expect(areaTab('관리')).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(undoButton());
    expect(areaTab('업무')).toHaveAttribute('aria-selected', 'true');
    expect(rowButton('결재')).toHaveAttribute('aria-current', 'true');
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);

    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    fireEvent.click(screen.getByRole('button', { name: '변경 1건' }));
    fireEvent.click(screen.getByRole('button', { name: '모두 되돌리기' }));
    await waitFor(() => expect(saveButton()).toBeDisabled());
    fireEvent.click(undoButton());
    expect(saveButton()).toBeEnabled();
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);
  });

  it('상세는 위치 → 이 메뉴가 보이는 그룹 → 속성 → 삭제 순서이고, 그룹마다 저장 전 초안 기준 실제 결과(보임·숨는 이유)를 보인다', async () => {
    await renderClient();
    fireEvent.click(rowButton('메뉴 관리'));
    const detail = within(screen.getByTestId('master-detail-detail'));
    expect(detail.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent))
      .toEqual(['위치', '이 메뉴가 보이는 그룹', '메뉴 속성', '삭제']);

    const userRow = (await screen.findByRole('checkbox', { name: /사용자 메뉴 표시/ })).closest('li') as HTMLElement;
    const adminRow = screen.getByRole('checkbox', { name: /관리자 메뉴 표시/ }).closest('li') as HTMLElement;
    expect(within(adminRow).getByText('보임')).toBeInTheDocument();
    expect(within(userRow).getByText('메뉴 표시 없음')).toBeInTheDocument();
    expect(userRow.querySelector('[data-group-verdict]')).toHaveTextContent('사용자 그룹 사이드바에서 메뉴 표시 없음');

    // 메뉴 표시를 켜도 진입 권한이 없으면 숨는다 — 체크 상태와 실제 결과를 따로 말한다.
    fireEvent.click(within(userRow).getByRole('checkbox'));
    expect(within(userRow).getByText('진입 권한 없음')).toBeInTheDocument();
    fireEvent.click(within(userRow).getByRole('button', { name: '사용자 진입 권한 추가' }));
    expect(within(userRow).getByText('보임')).toBeInTheDocument();
  });
});

describe('2차 리뷰 — 변이가 살아남던 동작을 고정한다', () => {
  it('끄는 동안에는 되돌리기 단추·Ctrl+Z 가 초안을 바꾸지 않고 이유를 말한다 — 끌기를 마치면 다시 되돌린다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);

    // 끄는 메뉴를 만든 단계를 되돌리면 끄는 메뉴가 사라지거나 놓을 자리 판정이 어긋난다(초안 무결성).
    dnd.event = { active: { id: 'menu:4' }, over: null };
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 시작' }));
    fireEvent.click(undoButton());
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);
    expect(liveText()).toContain('끌기를 마치거나 취소한 뒤 되돌리세요.');
    // Ctrl+Z 는 가로채지 않는다(기본 동작을 막지 않고 초안도 그대로다).
    expect(fireEvent.keyDown(rowButton('결재함'), { key: 'z', ctrlKey: true })).toBe(true);
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);

    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 취소' }));
    fireEvent.click(undoButton());
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
  });

  it('한글 조합 중에는 영역을 저절로 바꾸지 않고 Enter 도 고르지 않는다 — 조합이 끝나면 한 번 연다', async () => {
    await renderClient();
    const search = screen.getByRole('textbox', { name: '메뉴 검색' });
    fireEvent.compositionStart(search);
    fireEvent.change(search, { target: { value: '시스' } });
    fireEvent.change(search, { target: { value: '시스템' } });
    expect(areaTab('업무')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(document.querySelector('[data-a2-master-item][aria-current="true"]')).toBeNull();

    fireEvent.compositionEnd(search);
    expect(areaTab('관리')).toHaveAttribute('aria-selected', 'true');
    expect(liveText()).toContain('찾는 메뉴가 있는 관리 영역을 열었습니다.');
  });

  it('화면 목록에서 고르기는 누를 때마다 한 단계다 — A 를 고른 뒤 B 를 고르고 되돌리면 A 다', async () => {
    await renderClient();
    fireEvent.click(rowButton('결재'));
    const detail = within(screen.getByTestId('master-detail-detail'));
    const pick = (route: RegExp) => {
      fireEvent.click(detail.getByRole('button', { name: '연결 화면 바꾸기' }));
      fireEvent.change(detail.getByRole('textbox', { name: '연결할 화면 검색' }), { target: { value: '/admin/system/menus' } });
      fireEvent.click(detail.getByRole('button', { name: route }));
    };
    pick(/\/admin\/system\/menus\/by-authority$/);
    pick(/\/admin\/system\/menus$/);
    expect(detail.getByText('/admin/system/menus', { selector: 'p' })).toBeInTheDocument();

    fireEvent.click(undoButton());
    expect(detail.getByText('/admin/system/menus/by-authority', { selector: 'p' })).toBeInTheDocument();
    fireEvent.click(undoButton());
    expect(detail.getByText('연결 없음', { selector: 'p' })).toBeInTheDocument();
  });

  it('다른 메뉴를 골랐다 돌아와 같은 칸을 다시 치면 따로 되돌린다 — 이어 입력 묶음은 메뉴를 바꾸면 끝난다', async () => {
    await renderClient();
    const name = () => screen.getByRole('textbox', { name: '메뉴 이름' });
    fireEvent.click(rowButton('결재함'));
    fireEvent.change(name(), { target: { value: '결재함 1' } });
    fireEvent.click(rowButton('권한별 메뉴'));
    fireEvent.click(rowButton('결재함 1'));
    fireEvent.change(name(), { target: { value: '결재함 12' } });

    fireEvent.click(undoButton());
    expect(name()).toHaveValue('결재함 1');
    fireEvent.click(undoButton());
    expect(name()).toHaveValue('결재함');
  });

  it('다시 불러오면 되돌리기 이력을 비운다 — 쌓인 초안은 옛 기준선의 것이다', async () => {
    mocks.save.mockRejectedValueOnce({ response: { status: 409, data: { message: '다른 곳에서 바뀌었습니다.' } } });
    await renderClient();
    fireEvent.click(rowButton('결재함'));
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });
    expect(undoButton()).not.toHaveAttribute('aria-disabled');
    fireEvent.click(saveButton());
    const reload = await screen.findByRole('button', { name: '다시 불러오기' });
    fireEvent.click(reload);
    await waitFor(() => expect(mocks.reload).toHaveBeenCalled());
    await waitFor(() => expect(undoButton()).toHaveAttribute('aria-disabled', 'true'));
    fireEvent.click(undoButton());
    expect(liveText()).toContain('되돌릴 변경이 없습니다.');
    expect(rowOrder()).toEqual(['1', '2', '3', '4', '8']);
  });

  it('끌기 손잡이는 탭 순서에 하나만 든다 — 고른 줄의 손잡이(영역 머리에는 손잡이가 없다)', async () => {
    await renderClient();
    const tabbable = () => screen.getAllByRole('button', { name: /끌어서 옮기기$/ })
      .filter((handle) => handle.tabIndex === 0)
      .map((handle) => handle.getAttribute('aria-label'));
    expect(tabbable()).toEqual([]);
    fireEvent.click(rowButton('결재함'));
    expect(tabbable()).toEqual(['결재함 끌어서 옮기기']);
    fireEvent.click(rowButton('메뉴 관리'));
    expect(tabbable()).toEqual(['메뉴 관리 끌어서 옮기기']);
  });

  it('줄의 설명은 연결 경로다 — title 이 설명이 되어 이름의 ID 를 두 번 읽지 않는다', async () => {
    await renderClient();
    expect(rowButton('결재함')).toHaveAccessibleDescription('연결 경로 /approvals');
    expect(rowButton('결재')).toHaveAccessibleDescription('연결 경로 없음');
  });

  it('빈 섹션은 안내 줄 전체가 섹션 끝 놓을 곳이고, 놓을 곳은 끄는 동안에도 높이를 바꾸지 않는다', async () => {
    await renderClient();
    fireEvent.click(areaTab('관리'));
    const zone = screen.getByText('하위 메뉴가 없습니다.');
    expect(zone).toHaveAttribute('data-drop-zone', 'section-end:6');
    const sizeTokens = (element: Element) => element.className.split(/\s+/)
      .filter((token) => /^-?(?:h|min-h|max-h|size|p[xytblr]?|m[xytblr]?|leading|text-(?:xs|sm|base|lg))(?:-|$)/.test(token.split(':').pop() ?? ''));
    const before = sizeTokens(zone);
    const areaEndBefore = sizeTokens(document.querySelector('[data-drop-zone="area-end:5"]') as HTMLElement);

    dnd.event = { active: { id: 'menu:6' }, over: null };
    fireEvent.click(screen.getByRole('button', { name: '테스트 끌기 시작' }));
    const during = screen.getByText('하위 메뉴가 없습니다.');
    // 끄는 동안에는 외곽선·배경만 바뀐다.
    expect(during.className).toMatch(/border-border/);
    expect(sizeTokens(during)).toEqual(before);
    expect(sizeTokens(document.querySelector('[data-drop-zone="area-end:5"]') as HTMLElement)).toEqual(areaEndBefore);
  });
});

describe('보드 배치 계약 — jsdom 은 배치를 재지 않는다, Chromium 실측이 의존하는 클래스 성질을 고정한다', () => {
  it('보드만 스크롤한다 — 탭 줄(탭만)·보드 스크롤 상자·상태 줄(맨 아래) 순서이고, 마스터 칸에서 보드까지 높이 사슬이 이어진다', async () => {
    await renderClient();
    const master = screen.getByTestId('master-detail-master');
    const board = master.querySelector('[data-menu-board]') as HTMLElement;
    const scroll = screen.getByRole('tabpanel');
    const status = master.querySelector('[data-menu-status]') as HTMLElement;
    const tabRow = screen.getByRole('tablist', { name: '메뉴 영역' }).parentElement as HTMLElement;

    // 사슬: 칸(세로 flex) → 마스터 묶음(중간 고리) → 보드(중간 고리) → 보드 스크롤 상자(남은 높이·스스로 스크롤).
    const chain = ['work-fill:flex', 'work-fill:min-h-0', 'work-fill:flex-1', 'work-fill:flex-col'];
    expect(master).toHaveClass('work-fill:flex', 'work-fill:flex-col');
    expect(master.firstElementChild).toHaveClass(...chain);
    expect(board).toHaveClass(...chain);
    expect(scroll).toHaveAttribute('data-menu-board-scroll');
    expect(scroll).toHaveClass('relative', 'work-fill:min-h-0', 'work-fill:flex-1', 'work-fill:overflow-y-auto');
    // 탭 줄과 상태 줄은 보드 스크롤 밖이다 — 상태 줄은 보드 뒤(아래)에 있어 길어져도 보드의 위쪽을 밀지 않는다.
    expect(Array.from(board.children)).toEqual([tabRow, scroll, status]);
    expect(scroll.contains(status)).toBe(false);
    expect(within(tabRow).queryAllByRole('button')).toHaveLength(0);
    // 상태 줄은 두 줄 높이를 미리 잡지 않는다(맨 아래라 필요 없다).
    expect(status.className).not.toMatch(/min-h-/);
  });

  it('카드는 CSS 다단으로 쌓이고(렌더 분기 없음), 줄은 행 토큰 높이의 한 줄이며 좁으면 배지를 다음 줄로 내린다', async () => {
    await renderClient();
    const columns = document.querySelector('[data-menu-columns]') as HTMLElement;
    expect(columns).toHaveClass('columns-[14.5rem]');
    expect(columns.className).not.toMatch(/\bgrid\b/);
    for (const card of document.querySelectorAll('section[data-menu-card]')) expect(card).toHaveClass('break-inside-avoid');

    const row = rowButton('결재함');
    expect(row).toHaveClass('flex-wrap', 'py-[var(--work-cell-py)]');
    expect(row.className).not.toMatch(/\b(?:flex-nowrap|overflow-hidden)\b/);
    // 줄 상자의 테두리는 높이를 더하지 않는 안쪽 외곽선이다(테두리면 위아래 2px 가 더해져 34px 였다).
    const entry = row.closest('[data-menu-entry]') as HTMLElement;
    expect(entry).toHaveClass('outline-1', '-outline-offset-1');
    expect(entry.className.split(/\s+/).filter((token) => /^border(?:-|$)/.test(token))).toEqual([]);
    // 손잡이는 밀도와 무관한 24px(2.5.8 최소 타깃).
    expect(screen.getByRole('button', { name: '결재함 끌어서 옮기기' })).toHaveClass('size-6');
  });

  it('영역 탭의 개수 칸은 미리보기의 보임/전체 자리를 늘 잡아 두어 탭 폭이 상태에 따라 바뀌지 않는다', async () => {
    await renderClient();
    const counts = document.querySelectorAll('[data-area-count]');
    expect(counts.length).toBeGreaterThan(0);
    for (const count of counts) expect(count).toHaveClass('inline-block', 'min-w-[5ch]', 'tabular-nums');
  });
});

describe('서버 구조 재수신(DIP C5)과 조회 실패', () => {
  it('저장하지 않은 변경이 있는 동안 다른 버전이 다시 읽히면 덮지 않고 알리며, 변경 취소는 최신 구조로 바꾼다', async () => {
    const view = await renderClient();
    fireEvent.keyDown(rowButton('결재함'), { key: 'ArrowDown', altKey: true });

    // 같은 버전(방금 저장한 결과 등)이면 아무 일도 없다.
    await view.reload({ data: structure(MENUS, 'v1'), error: null });
    expect(screen.queryByText(/메뉴 구조가 다시 읽혔습니다/)).not.toBeInTheDocument();

    await view.reload({ data: structure([...MENUS, menu(9, '새로 생긴 메뉴', 1, 3, '/admin')], 'v2'), error: null });
    const banner = screen.getAllByRole('status').find((element) => element.textContent?.includes('메뉴 구조가 다시 읽혔습니다'));
    expect(banner).toBeDefined();
    expect(screen.queryByRole('button', { name: /^새로 생긴 메뉴 ID/ })).not.toBeInTheDocument();
    expect(rowOrder()).toEqual(['1', '2', '4', '3', '8']);

    fireEvent.click(within(banner!).getByRole('button', { name: '변경 취소' }));
    await waitFor(() => expect(mocks.reload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it('변경이 없으면 다시 읽힌 구조를 그대로 받는다', async () => {
    const view = await renderClient();
    await view.reload({ data: structure([...MENUS, menu(9, '새로 생긴 메뉴', 1, 3, '/admin')], 'v2'), error: null });
    expect(rowButton('새로 생긴 메뉴')).toBeInTheDocument();
  });

  it('조회에 실패하면 빈 보드로 위장하지 않고 사유와 다시 불러오기를 보인다', async () => {
    await renderClient({ error: '메뉴 조회 권한이 없습니다.' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('메뉴 구조를 불러오지 못했습니다');
    expect(alert).toHaveTextContent('메뉴 조회 권한이 없습니다.');
    fireEvent.click(within(alert).getByRole('button', { name: '메뉴 구조 다시 불러오기' }));
    await waitFor(() => expect(rowButton('업무')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
