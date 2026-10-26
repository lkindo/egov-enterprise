import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import React from 'react';
import { server } from './src/mocks/server';
import { assertNoUnhandledRequests, watchUnhandledRequests } from './src/mocks/unhandled-requests';

/*
 * [2026-10-26] 핸들러 없는 요청은 시험 실패다. 종전 'warn' 은 그 요청을 실제 네트워크(jsdom 기준 http://localhost:3000)로
 * 통과시켜, 그 포트에 서버가 떠 있으면 시험 결과가 주변 서버의 응답에 따라 바뀌었다. 'error' 는 요청을 막지만 로그만 남기고 앱 코드가
 * 그 실패를 삼키므로 시험은 붉어지지 않는다 — 그래서 미처리 요청을 모아 시험이 끝날 때 실패로 올린다. 실제 요청이 필요한 시험은
 * server.use(http.X(url, () => passthrough())) 로 밝힌다.
 */
watchUnhandledRequests(server);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  assertNoUnhandledRequests();
});
afterAll(() => {
  server.close();
  assertNoUnhandledRequests();
});

// ============================================
// Environment Variables Setup
// ============================================
Object.assign(process.env, {
  NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1/',
  NODE_ENV: 'test',
});

// Mock Next.js Navigation
vi.mock('next/navigation', () => {
  // 실제 Next 의 useSearchParams 는 렌더 사이에 같은 객체다. 렌더마다 새 객체를 주면 searchParams 를 의존성으로 둔 effect 가
  //   끝없이 다시 돌아, 공용 브레드크럼의 메뉴 조회처럼 시험 하나가 수백 건을 요청했다(2026-10-26 실측 약 1,500건).
  const searchParams = new URLSearchParams();
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => searchParams,
    useParams: () => ({}),
  };
});

// Mock useToast with stable object
const toastMock = {
  toast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn()
};
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => toastMock,
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useConfirm
vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

// Mock observers
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

global.IntersectionObserver = class IntersectionObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
} as any;

// Mock Common UI Components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => children,
  TooltipProvider: ({ children }: any) => children,
}));

// Radix Dialog 모킹 — ⚠ open 을 반드시 존중해야 한다.
// 종전 모킹은 open 과 무관하게 children 을 **항상** 렌더했다. 그 결과 "다이얼로그가 닫혔는가"를
// DOM 으로 관측할 수 없었고, 다이얼로그 테스트가 열림/닫힘을 구분하지 못한 채 green 이 됐다
// (session-expiry-warning.test.tsx 는 바로 이 때문에 파일 로컬 모킹으로 우회해야 했다).
//
// 실제 Radix 의 구조를 최소한으로 흉내낸다:
//   - Dialog: 열림 상태를 컨텍스트로 내려주되 children 은 항상 렌더한다.
//     (Dialog 자체를 감추면 닫혀 있을 때 DialogTrigger 까지 사라져, 트리거를 눌러 여는
//      시나리오를 아예 쓸 수 없게 된다. 실제 Radix 도 트리거는 닫힘 상태에서 계속 보인다.)
//   - DialogContent: 열려 있을 때만 렌더한다. Header/Title/Description/Footer 는 Content 의
//     자식이므로 함께 사라진다.
//
// [의도적 한계] open 을 주지 않은 비제어(uncontrolled) 사용은 '열림'으로 취급한다. 이 모킹에는
// 트리거→열림 상태 기계가 없어 닫힘으로 두면 그런 다이얼로그를 영영 열 수 없기 때문이다.
// 저장소의 실제 사용처는 전부 제어 방식(open={state})이라 이 한계에 걸리는 곳은 현재 없다.
vi.mock('@/components/ui/dialog', () => {
  const React = require('react');
  const DialogOpenContext = React.createContext({ open: true, onOpenChange: (_open: boolean) => {} });

  function Dialog({ children, open, onOpenChange }: any) {
    const isOpened = open !== false;
    const value = React.useMemo(() => ({ open: isOpened, onOpenChange }), [isOpened, onOpenChange]);
    return React.createElement(DialogOpenContext.Provider, { value }, children);
  }

  function DialogContent({
    children,
    showCloseButton: _showCloseButton = true,
    onEscapeKeyDown,
    onPointerDownOutside,
    onInteractOutside,
    ...props
  }: any) {
    const ctx = React.useContext(DialogOpenContext);

    const requestDismiss = (event: any, handlers: Array<((event: any) => void) | undefined>) => {
      for (const handler of handlers) handler?.(event);
      if (!event.defaultPrevented && ctx.onOpenChange) ctx.onOpenChange(false);
    };

    React.useEffect(() => {
      if (ctx.open) {
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = 'unset';
        };
      }
    }, [ctx.open]);

    if (!ctx.open) return null;

    return React.createElement(
      'div',
      null,
      React.createElement('div', {
        'data-slot': 'dialog-overlay',
        onPointerDown: (event: any) => requestDismiss(event, [onPointerDownOutside, onInteractOutside]),
        onClick: () => ctx.onOpenChange && ctx.onOpenChange(false),
      }),
      React.createElement('div', {
        role: 'dialog',
        'aria-modal': 'true',
        onKeyDown: (event: any) => {
          if (event.key === 'Escape') requestDismiss(event, [onEscapeKeyDown]);
        },
        ...props,
      }, children)
    );
  }

  function DialogClose({ children, onClick, ...props }: any) {
    const ctx = React.useContext(DialogOpenContext);
    const handleClick = (e: any) => {
      if (onClick) onClick(e);
      if (ctx.onOpenChange) ctx.onOpenChange(false);
    };

    if (React.isValidElement(children)) {
      const childProps = children.props as any;
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: (e: any) => {
          if (childProps && typeof childProps.onClick === 'function') {
            childProps.onClick(e);
          }
          handleClick(e);
        },
      });
    }

    return React.createElement('button', { type: 'button', onClick: handleClick, ...props }, children);
  }

  function DialogTitle({ children, ...props }: any) {
    return React.createElement('h2', props, children);
  }

  const passthrough = (name: string) => {
    const Component = ({ children }: any) => children;
    Component.displayName = name;
    return Component;
  };

  return {
    Dialog,
    DialogContent,
    DialogClose,
    DialogTrigger: passthrough('DialogTrigger'),
    DialogHeader: passthrough('DialogHeader'),
    DialogTitle,
    DialogDescription: passthrough('DialogDescription'),
    DialogFooter: passthrough('DialogFooter'),
    DialogOverlay: passthrough('DialogOverlay'),
    DialogPortal: passthrough('DialogPortal'),
  };
});

// [2026-10-26] 탭·드롭다운의 전역 children 통과 mock 을 걷었다. 탭 mock 은 선택 상태·숨김·키보드·ARIA 를 지워, 실물을 검사한다고
//   믿은 탭 단위 시험이 mock 을 검사했고(실물 0% 실행) 탭 화면 시험은 하나하나 vi.unmock 으로 되돌려야 했다. 드롭다운 모듈은 없다.

// Mock framer-motion without leaking animation-only props onto real DOM nodes.
const MOTION_ONLY_PROPS = new Set([
  'animate',
  'exit',
  'initial',
  'layout',
  'layoutId',
  'transition',
  'variants',
  'viewport',
  'whileDrag',
  'whileFocus',
  'whileHover',
  'whileInView',
  'whileTap',
]);

function mockMotionElement(tag: keyof React.JSX.IntrinsicElements) {
  function MockMotionElement({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
    const domProps = Object.fromEntries(
      Object.entries(props).filter(([name]) => !MOTION_ONLY_PROPS.has(name)),
    );
    return React.createElement(tag, domProps, children);
  }

  MockMotionElement.displayName = `MockMotion.${tag}`;
  return MockMotionElement;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: mockMotionElement('div'),
    header: mockMotionElement('header'),
    main: mockMotionElement('main'),
    section: mockMotionElement('section'),
    nav: mockMotionElement('nav'),
    a: mockMotionElement('a'),
    button: mockMotionElement('button'),
    span: mockMotionElement('span'),
    li: mockMotionElement('li'),
    ul: mockMotionElement('ul'),
    p: mockMotionElement('p'),
    h1: mockMotionElement('h1'),
    h2: mockMotionElement('h2'),
    h3: mockMotionElement('h3'),
  },
  AnimatePresence: ({ children }: any) => children,
  useScroll: () => ({ scrollY: { onChange: vi.fn() } }),
  useTransform: () => ({}),
  useSpring: () => ({}),
}));

// Mock window APIs
// ⚠ typeof 가드 필수 — setupFiles 는 node 환경 테스트(@vitest-environment node, 예: middleware 테스트)
//   에서도 실행되므로, 가드 없이 window 를 만지면 그 테스트 파일이 수집 단계에서 통째로 죽는다.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock lucide-react with an exhaustive list of components to satisfy Vitest's named import checks
vi.mock('lucide-react', () => {
    const React = require('react');
    const mockIcon = (name: string) => {
        const Icon = (props: any) => React.createElement('span', { ...props, 'data-testid': `icon-${name.toLowerCase()}` }, name);
        Icon.displayName = name;
        return Icon;
    };

    const icons = [
        'Users', 'Briefcase', 'Search', 'Home', 'Zap', 'Loader2', 'CheckIcon', 
        'ChevronDownIcon', 'SlidersHorizontal', 'X', 'MessageSquare', 'User', 
        'Clock', 'Trash2', 'Edit2', 'Send', 'Check', 'ArrowRight', 'ArrowLeft',
        'ChevronLeft', 'ChevronRight', 'Plus', 'Settings', 'Bell', 'Calendar',
        'FileText', 'LayoutDashboard', 'ShieldCheck', 'Database', 'Globe',
        'Menu', 'ChevronUp', 'ChevronDown', 'ChevronsUpDown', 'Download',
        'ChevronUpIcon', 'ChevronDownIcon',
        'Mail', 'Phone', 'Lock', 'LogOut', 'UserPlus', 'AlertCircle', 'ExternalLink',
        'LogIn', 'UserRound', 'LockKeyhole', 'Monitor', 'Smartphone', 'Laptop',
        'Activity', 'CheckSquare', 'Workflow', 'Rocket', 'Cpu', 'Layers', 'Shield',
        'RotateCcw', 'RotateCw', 'History', 'Undo', 'Redo',
        'List', 'Grid', 'Columns', 'PlusCircle', 'MinusCircle',
        'UserCheck', 'UserX', 'Fingerprint', 'LayoutGrid', 'SearchCode', 
        'ShieldAlert', 'Settings2', 'Filter', 'Pencil', 'MoreHorizontal', 'XCircle',
        'CheckCircle2', 'Info', 'AlertTriangle', 'ArrowUpDown', 'Eye', 'EyeOff',
        'Copy', 'RefreshCw', 'CheckCircle', 'RefreshCcw', 'BarChart3', 'ArrowUpRight', 'Sparkles', 'Save',
        'FileCode', 'Type', 'Link', 'FolderOpen', 'Settings2', 'MessageSquare', 'Globe', 'Box', 'Terminal',
        'CloudLightning', 'ZapOff', 'Server', 'ShieldCheck', 'Database', 'BarChart', 'Layout', 'Clock', 'Zap', 'TrendingUp', 'MousePointer2', 'FileText', 'Target'
    ];

    const exports: any = {
        __esModule: true,
    };

    icons.forEach(name => {
        exports[name] = mockIcon(name);
    });

    // [열거 대신 Proxy] 위 배열은 allow-list 라, 화면에 새 아이콘을 하나 쓸 때마다 무관한 테스트가
    // "No 'X' export is defined on the lucide-react mock" 으로 깨졌다(실제로 CalendarDays 로 깨져 있었다).
    // 아이콘은 이름만 다른 동형 컴포넌트이므로 요청되는 이름마다 즉석 생성한다.
    // 주의: 심볼 키와 'then' 은 반드시 undefined 를 돌려줘야 한다 — 모듈을 await 할 때
    // then 이 함수로 보이면 thenable 로 오인돼 모듈 로딩이 멈춘다.
    return new Proxy(exports, {
        get(target, prop) {
            if (typeof prop === 'symbol' || prop === 'then' || prop in target) {
                return target[prop as string];
            }
            target[prop as string] = mockIcon(String(prop));
            return target[prop as string];
        },
        has: () => true,
    });
});

// setupFiles 는 node 환경 테스트(@vitest-environment node)에서도 실행된다.
// 가드 없이 window 를 만지면 그런 테스트가 "ReferenceError: window is not defined" 로 수집 단계에서 통째로 죽는다.
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}

// Mock DOM elements for Radix UI
if (typeof window !== 'undefined') {
  window.Element.prototype.scrollIntoView = vi.fn();
  window.Element.prototype.hasPointerCapture = vi.fn();
  window.Element.prototype.releasePointerCapture = vi.fn();
}

// Global D3 Mock to prevent ReferenceError in visualization components
(global as any).d3 = {
  select: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  attr: vi.fn().mockReturnThis(),
  style: vi.fn().mockReturnThis(),
  append: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  data: vi.fn().mockReturnThis(),
  enter: vi.fn().mockReturnThis(),
  exit: vi.fn().mockReturnThis(),
  transition: vi.fn().mockReturnThis(),
  duration: vi.fn().mockReturnThis(),
  scaleLinear: vi.fn().mockReturnValue({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
  }),
  scaleTime: vi.fn().mockReturnValue({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
  }),
  scaleOrdinal: vi.fn().mockReturnValue({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
  }),
  axisBottom: vi.fn().mockReturnThis(),
  axisLeft: vi.fn().mockReturnThis(),
  line: vi.fn().mockReturnThis(),
  area: vi.fn().mockReturnThis(),
  arc: vi.fn().mockReturnThis(),
  pie: vi.fn().mockReturnThis(),
  hierarchy: vi.fn().mockReturnThis(),
  tree: vi.fn().mockReturnThis(),
  forceSimulation: vi.fn().mockReturnThis(),
};
