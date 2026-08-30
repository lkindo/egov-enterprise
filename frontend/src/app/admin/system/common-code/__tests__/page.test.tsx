import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  getClCodeList: vi.fn(),
  getCmmnCodeList: vi.fn(),
  getDetailCodeList: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    getClCodeList: mocks.getClCodeList,
    getCmmnCodeList: mocks.getCmmnCodeList,
    getDetailCodeList: mocks.getDetailCodeList,
  },
}));

import type { ReactElement } from 'react';
import CommonCodePage from '../page';
import type { CmmnCode, CmmnDetailCode } from '@/types/foundation/system';

describe('CommonCodePage pagination boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ get: () => ({ value: 'access-token' }) });
    mocks.getClCodeList.mockResolvedValue({
      list: [{ clsfCd: 'DOMAIN', clsfCdNm: '도메인', clsfCdExpln: '', useYn: 'Y' }],
      total: 1,
    });
  });

  it('그룹 전 페이지와 선택 그룹 상세만 서버 상한 이내로 조회한다', async () => {
    const firstGroups = Array.from({ length: 100 }, (_, index) => ({
      clsfCd: 'DOMAIN',
      cdId: `GROUP_${index}`,
      cdIdNm: `그룹 ${index}`,
      cdIdExpln: '',
      useYn: 'Y' as const,
    }));
    mocks.getCmmnCodeList
      .mockResolvedValueOnce({ list: firstGroups, total: 101 })
      .mockResolvedValueOnce({
        list: [{ clsfCd: 'DOMAIN', cdId: 'TARGET', cdIdNm: '대상', cdIdExpln: '', useYn: 'Y' }],
        total: 101,
      });
    mocks.getDetailCodeList.mockResolvedValue({
      list: [
        { cdId: 'TARGET', dtlCd: 'Y', dtlCdNm: '사용', dtlCdExpln: '', useYn: 'Y' },
        { cdId: 'OTHER', dtlCd: 'N', dtlCdNm: '제외', dtlCdExpln: '', useYn: 'Y' },
      ],
      total: 2,
    });

    const page = await CommonCodePage({ searchParams: Promise.resolve({ groupId: 'TARGET' }) });
    const client = page.props.children as ReactElement<{
      groups: CmmnCode[];
      details: CmmnDetailCode[];
    }>;

    expect(client.props.groups).toHaveLength(101);
    expect(client.props.details.map((detail) => detail.cdId)).toEqual(['TARGET']);
    expect(mocks.getCmmnCodeList.mock.calls.map(([params]) => params)).toEqual([
      { pageIndex: 1, pageUnit: 100 },
      { pageIndex: 2, pageUnit: 100 },
    ]);
    expect(mocks.getDetailCodeList).toHaveBeenCalledWith(
      {
        searchCondition: '1',
        searchKeyword: 'TARGET',
        pageIndex: 1,
        pageUnit: 100,
      },
      { headers: { Authorization: 'Bearer access-token' } },
    );
  });
});
