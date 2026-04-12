import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

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

// Mock window APIs
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

// Mock lucide-react with a proxy to handle any icon
vi.mock('lucide-react', () => {
  const React = require('react');
  const icons: Record<string, any> = {};

  return new Proxy(icons, {
    get: (target, prop: string) => {
      if (prop === '__esModule') return true;
      return (props: any) => React.createElement('span', { 
        ...props,
        'data-testid': `icon-${prop.toLowerCase()}` 
      }, `ICON_${prop.toUpperCase()}`);
    }
  });
});

window.scrollTo = vi.fn();

// Mock DOM elements for Radix UI
if (typeof window !== 'undefined') {
  window.Element.prototype.scrollIntoView = vi.fn();
  window.Element.prototype.hasPointerCapture = vi.fn();
  window.Element.prototype.releasePointerCapture = vi.fn();
}
