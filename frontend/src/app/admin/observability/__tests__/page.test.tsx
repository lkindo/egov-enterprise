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
    expect(screen.getByText(/Global Traffic/)).toBeInTheDocument();
    expect(screen.getByText(/System Latency/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-topology')).toBeInTheDocument();
  });
});
