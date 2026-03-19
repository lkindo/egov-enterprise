import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
 useRouter: () => ({ push: vi.fn() }),
 usePathname: () => '/survey',
 useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/client', () => ({
 default: { get: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
}));

import SurveyListPage from '../page';

describe('SurveyListPage', () => {
 it('renders survey list page structure', () => {
 render(<SurveyListPage />);
 expect(screen.getByText(/온라인 설문 조사/)).toBeInTheDocument();
 });
});
