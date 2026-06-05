import { render,  screen,  fireEvent,  act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// 1. Mock Next.js config
vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

// 2. Mock Lucide Icons - EXPLICITLY AND MANUALLY FOR EVERY ICON IN THIS FILE
vi.mock('lucide-react', () => {
    const R = require('react');
    const Icon = (name: string) => {
        const C = (props: any) => R.createElement('span', { ...props, 'data-testid': `icon-${name.toLowerCase()}` }, name);
        C.displayName = name;
        return C;
    };
    return {
        Plus: Icon('Plus'),
        ChevronRight: Icon('ChevronRight'),
        Settings: Icon('Settings'),
        Trash2: Icon('Trash2'),
        FolderTree: Icon('FolderTree'),
        FileCode: Icon('FileCode'),
        Save: Icon('Save'),
        Layers: Icon('Layers'),
        Link: Icon('Link'),
        ChevronsDownUp: Icon('ChevronsDownUp'),
        ChevronsUpDown: Icon('ChevronsUpDown'),
        SearchCode: Icon('SearchCode'),
        ShieldCheck: Icon('ShieldCheck'),
        Network: Icon('Network'),
        Database: Icon('Database'),
        GripVertical: Icon('GripVertical'),
        Home: Icon('Home'),
        Loader2: Icon('Loader2'),
    };
});

// 3. Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue('') }),
}));

// 4. Mock DND Kit (Nullify for unit tests)
vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children }: any) => <div>{children}</div>,
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    useSensor: vi.fn(),
    useSensors: vi.fn(),
    DragOverlay: ({ children }: any) => <div>{children}</div>,
    closestCenter: vi.fn(),
    MeasuringStrategy: { Always: 1 },
    defaultDropAnimationSideEffects: vi.fn(),
}));
vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: any) => <div>{children}</div>,
    verticalListSortingStrategy: {},
    useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: null, isDragging: false }),
    arrayMove: (array: any) => array,
    sortableKeyboardCoordinates: vi.fn(),
}));
vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Translate: { toString: () => '' } }
}));

// 5. Mock heavy UI components directly
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <div data-testid="hub-header"><h2>{title}</h2>{actions}</div>
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children, action }: any) => <div data-testid="section-card"><h3>{title}</h3>{action}{children}</div>
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: any) => <div data-testid="page-header"><h1>{title}</h1></div>
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ children, isOpen, title }: any) => isOpen ? (
    <div data-testid="standard-modal">
      <h2>{title}</h2>
      {children}
    </div>
  ) : null
}));

import MenuAdminClient from '../MenuAdminClient';

describe('MenuAdminClient Component', () => {
    const mockInitialMenus = [
      { menuNo: 1, menuNm: 'Main Menu', upperMenuNo: 0, upperMenuId: 0, menuOrdr: 1, progrmFileNm: 'prog1' },
    ] as any;
    const mockPrograms = [{ progrmFileNm: 'prog1', progrmNm: 'Program 1' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    const menusPromise = Promise.resolve(mockInitialMenus);
    const programsPromise = Promise.resolve(mockPrograms);
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>
      );
    });
    expect(await screen.findByText('Main Menu')).toBeInTheDocument();
  });

  it('opens create modal on "신규 등록" click', async () => {
    const menusPromise = Promise.resolve(mockInitialMenus);
    const programsPromise = Promise.resolve(mockPrograms);
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>
      );
    });
    const btn = await screen.findByText(/신규 등록/i);
    fireEvent.click(btn);
    expect(await screen.findByText(/신규 메뉴 정의/i)).toBeInTheDocument();
  });
});
