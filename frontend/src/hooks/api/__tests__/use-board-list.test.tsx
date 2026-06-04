import { renderHook, waitFor } from '@testing-library/react';
import { useBoardList } from '../use-board-list';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect } from 'vitest';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useBoardList Hook', () => {
  const defaultParams = {
    bbsId: 'BBSMSTR_000000000001',
    page: 0,
    pageUnit: 10,
    searchWrd: '',
    searchCnd: '0',
    orderBy: '',
  };

  it('should fetch board post list successfully via MSW', async () => {
    const { result } = renderHook(() => useBoardList(defaultParams), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.list).toHaveLength(1);
    expect(result.current.data?.list[0].bbsNm).toBe('공지사항');
  });

  it('should use initialData if provided', () => {
    const initialData = {
      list: [
        {
          bbsId: 'BBSMSTR_000000000001',
          bbsNm: '임시 공지',
          bbsTyCode: 'BBST01',
          useAt: 'Y',
          frstRegisterPnttm: '2026-06-01T00:00:00',
          nttId: 1,
          nttSj: '임시글',
          nttCn: '본문',
          inqireCo: 0,
          ntcrNm: '작성자',
          frstRegisterId: 'admin'
        }
      ],
      total: 1,
      totalPage: 1,
    };

    const { result } = renderHook(() => useBoardList(defaultParams, initialData), {
      wrapper: createWrapper(),
    });

    expect(result.current.data?.list[0].bbsNm).toBe('임시 공지');
  });
});
