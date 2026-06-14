/* eslint-disable react/display-name */
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
    expect(result.current.data?.list[0].bbsId).toBe('BBSMSTR_000000000001');
  });

  it('should use initialData if provided', () => {
    const initialData = {
      list: [
        {
          pstId: 'POST_001',
          bbsId: 'BBSMSTR_000000000001',
          pstTtl: '임시 공지',
          pstCn: '본문',
          useYn: 'Y',
          userId: 'admin',
          userNm: '관리자',
          crtDt: '2026-06-01T00:00:00'
        }
      ],
      total: 1,
      totalPage: 1,
    };

    const { result } = renderHook(() => useBoardList(defaultParams, initialData), {
      wrapper: createWrapper(),
    });

    expect(result.current.data?.list[0].pstTtl).toBe('임시 공지');
  });
});
