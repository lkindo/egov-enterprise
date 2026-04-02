vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/survey',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/client', () => ({
  default: { 
    get: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } 
  }
}));

import SurveyListPage from '../page';

describe('SurveyListPage', () => {
  it('renders survey list page structure', async () => {
    // Note: If SurveyListPage is a Server Component, this would need more setup for real testing, 
    // but here we are testing the basic structure or if it's already a client component or wrapped.
    render(<SurveyListPage />);
    expect(await screen.findByText(/온라인 설문 조사/i)).toBeInTheDocument();
  });
});
