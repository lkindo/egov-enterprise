import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BoardMakerWizard } from '../BoardMakerWizard';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { createBoard: vi.fn() },
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { createMenu: vi.fn() },
}));
vi.mock('../BoardPreview', () => ({ BoardPreview: () => null }));

describe('BoardMakerWizard switch accessibility', () => {
  it('댓글·첨부 스위치를 보이는 라벨과 설명에 결속하고 키보드로 전환한다', async () => {
    const user = userEvent.setup();
    render(<BoardMakerWizard />);

    const comments = screen.getByRole('switch', { name: '댓글 사용 여부' });
    const attachments = screen.getByRole('switch', { name: '파일 첨부 여부' });

    expect(comments).toHaveAccessibleDescription('게시글에 댓글을 작성할 수 있도록 합니다.');
    expect(attachments).toHaveAccessibleDescription('문서 및 이미지를 첨부할 수 있게 합니다.');
    expect(comments).toHaveAttribute('aria-checked', 'false');
    expect(attachments).toHaveAttribute('aria-checked', 'true');

    comments.focus();
    await user.keyboard(' ');
    expect(comments).toHaveAttribute('aria-checked', 'true');
  });
});
