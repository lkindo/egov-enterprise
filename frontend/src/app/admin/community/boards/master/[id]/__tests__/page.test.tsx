import { describe, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('../BoardOperationsClient', () => ({ BoardOperationsClient: () => null }));

import BoardOperationsPage from '../page';

/** 운영 화면 라우트는 게시판 ID 형식(`BBSMSTR_` 뒤 12자)만 받는다(ADR-0040 결정 2). */
describe('게시판 운영 화면 라우트', () => {
  it.each(['xyz', 'BBSMSTR_SHORT', 'BBSMSTR_aaaaaaaaaaaa', 'BBSMSTR_AAAAAAAAAAAAA', 'BBSMSTR_AAAA-AAAAAAA'])(
    '잘못된 ID(%s)는 화면을 그리지 않고 없는 화면이다', async (id) => {
      mocks.notFound.mockClear();
      await expect(BoardOperationsPage({ params: Promise.resolve({ id }) })).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mocks.notFound).toHaveBeenCalledTimes(1);
    });

  it('형식이 맞으면 운영 화면을 그린다', async () => {
    mocks.notFound.mockClear();
    const element = await BoardOperationsPage({ params: Promise.resolve({ id: 'BBSMSTR_AAAAAAAAAAAA' }) });
    expect(isValidElement(element)).toBe(true);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});
