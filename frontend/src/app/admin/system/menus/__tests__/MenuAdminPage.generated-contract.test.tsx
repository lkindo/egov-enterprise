import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const menuAdminService = vi.hoisted(() => ({ getAllMenus: vi.fn() }));
const programAdminService = vi.hoisted(() => ({ getProgramList: vi.fn() }));
const captured = vi.hoisted(() => ({
  programsPromise: undefined as Promise<unknown> | undefined,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => name === 'accessToken' ? { value: 'token' } : undefined,
  })),
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({ menuAdminService }));
vi.mock('@/services/foundation/system/ProgramAdminService', () => ({ programAdminService }));
vi.mock('../MenuAdminClient', () => ({
  default: (props: { programsPromise: Promise<unknown> }) => {
    captured.programsPromise = props.programsPromise;
    return null;
  },
}));

import MenuAdminPage from '../page';

describe('MenuAdminPage program 전체조회 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.programsPromise = undefined;
    menuAdminService.getAllMenus.mockResolvedValue([]);
  });

  it('pageUnit 최대 100을 지키며 total 건수까지 모든 프로그램 페이지를 조회한다', async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({
      prgrmFileNm: `program-${index}.do`,
      prgrmKornNm: `프로그램 ${index}`,
    }));
    const last = { prgrmFileNm: 'program-100.do', prgrmKornNm: '프로그램 100' };
    programAdminService.getProgramList
      .mockResolvedValueOnce({ list: first, total: 101, page: 1, size: 100, totalPage: 2 })
      .mockResolvedValueOnce({ list: [last], total: 101, page: 2, size: 100, totalPage: 2 });

    render(await MenuAdminPage());

    await waitFor(() => expect(programAdminService.getProgramList).toHaveBeenCalledTimes(2));
    await expect(captured.programsPromise).resolves.toStrictEqual({
      data: [...first, last],
      error: null,
    });
    expect(programAdminService.getProgramList).toHaveBeenNthCalledWith(
      1,
      { pageIndex: 1, pageUnit: 100 },
      { headers: { Authorization: 'Bearer token' } },
    );
    expect(programAdminService.getProgramList).toHaveBeenNthCalledWith(
      2,
      { pageIndex: 2, pageUnit: 100 },
      { headers: { Authorization: 'Bearer token' } },
    );
  });
});
