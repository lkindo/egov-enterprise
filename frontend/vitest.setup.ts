import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock useToast with stable object
const toastMock = { toast: vi.fn() };
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => toastMock,
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
