import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StandardModal } from '../standard-modal';

test('StandardModal renders correctly and has a11y attributes', () => {
  const handleClose = vi.fn();
  render(
    <StandardModal isOpen={true} onClose={handleClose} title="Test Modal">
      <div>Modal Content</div>
    </StandardModal>
  );

  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

  const title = screen.getByText('Test Modal');
  expect(title).toBeInTheDocument();
  expect(title).toHaveAttribute('id', 'modal-title');

  const closeButton = screen.getByRole('button', { name: '닫기' });
  expect(closeButton).toBeInTheDocument();
  expect(closeButton).toHaveClass('focus-visible:ring-2');
});
