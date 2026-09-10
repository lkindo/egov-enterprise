import { describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import Page from '../page';

vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }) }));

describe('retired technical role page', () => {
  it('기존 URL을 정규 권한 그룹 관리 화면으로 연결한다', () => {
    expect(() => Page()).toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/admin/security/authority');
  });
});
