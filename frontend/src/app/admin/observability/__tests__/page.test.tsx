import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ObservabilityPage from '../page';

// Mock dynamic import
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-topology">Mock Topology</div>
}));

describe('ObservabilityPage', () => {
  it('renders correctly with premium elements', () => {
    render(<ObservabilityPage />);
    
    expect(screen.getByText(/시스템 통합 관제/)).toBeInTheDocument();
    expect(screen.getByText(/글로벌 트래픽/)).toBeInTheDocument();
    expect(screen.getByText(/시스템 지연시간/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-topology')).toBeInTheDocument();
  });
});
