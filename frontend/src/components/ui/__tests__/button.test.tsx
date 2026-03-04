import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';
import { describe, it, expect, vi } from 'vitest';

describe('Button', () => {
    it('renders correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeDefined();
    });

    it('handles click events', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        fireEvent.click(screen.getByText('Click me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders with different variants', () => {
        const { rerender } = render(<Button variant="destructive">Destructive</Button>);
        expect(screen.getByRole('button')).toHaveClass('bg-destructive');

        rerender(<Button variant="outline">Outline</Button>);
        expect(screen.getByRole('button')).toHaveClass('border');
    });

    it('renders as disabled', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows loading state', () => {
        render(<Button isLoading>Loading</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
        const loader = screen.getByRole('button').querySelector('.animate-spin');
        expect(loader).not.toBeNull();
    });
});
