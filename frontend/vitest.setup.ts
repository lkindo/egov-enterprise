import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import React from 'react';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============================================
// Environment Variables Setup
// ============================================
Object.assign(process.env, {
  NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1/',
  NODE_ENV: 'test',
});

// Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

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

  function DialogContent({ children, showCloseButton = true, ...props }: any) {
    const ctx = React.useContext(DialogOpenContext);

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
        onClick: () => ctx.onOpenChange && ctx.onOpenChange(false),
      }),
      React.createElement('div', { role: 'dialog', 'aria-modal': 'true', ...props }, children)
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

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => children,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => children,
  DropdownMenuItem: ({ children }: any) => children,
  DropdownMenuSeparator: () => null,
  DropdownMenuLabel: ({ children }: any) => children,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => children,
  TabsList: ({ children }: any) => children,
  TabsTrigger: ({ children }: any) => children,
  TabsContent: ({ children }: any) => children,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
    header: ({ children, ...props }: any) => React.createElement('header', props, children),
    main: ({ children, ...props }: any) => React.createElement('main', props, children),
    section: ({ children, ...props }: any) => React.createElement('section', props, children),
    nav: ({ children, ...props }: any) => React.createElement('nav', props, children),
    a: ({ children, ...props }: any) => React.createElement('a', props, children),
    button: ({ children, ...props }: any) => React.createElement('button', props, children),
    span: ({ children, ...props }: any) => React.createElement('span', props, children),
    li: ({ children, ...props }: any) => React.createElement('li', props, children),
    ul: ({ children, ...props }: any) => React.createElement('ul', props, children),
    p: ({ children, ...props }: any) => React.createElement('p', props, children),
    h1: ({ children, ...props }: any) => React.createElement('h1', props, children),
    h2: ({ children, ...props }: any) => React.createElement('h2', props, children),
    h3: ({ children, ...props }: any) => React.createElement('h3', props, children),
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
