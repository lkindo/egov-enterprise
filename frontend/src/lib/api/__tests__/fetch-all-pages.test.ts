import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages, MAX_PAGE_UNIT } from '../fetch-all-pages';

describe('fetchAllPages', () => {
  it('서버 상한 이내의 크기로 마지막 페이지까지 순서대로 수집한다', async () => {
    const fetchPage = vi.fn(async (pageIndex: number, pageUnit: number) => {
      const start = (pageIndex - 1) * pageUnit;
      const all = Array.from({ length: 201 }, (_, index) => index + 1);
      return {
        list: all.slice(start, start + pageUnit),
        total: all.length,
      };
    });

    await expect(fetchAllPages(fetchPage)).resolves.toEqual(
      Array.from({ length: 201 }, (_, index) => index + 1),
    );
    expect(fetchPage.mock.calls).toEqual([
      [1, MAX_PAGE_UNIT],
      [2, MAX_PAGE_UNIT],
      [3, MAX_PAGE_UNIT],
    ]);
  });

  it('total이 없는 응답은 짧은 페이지를 전량으로 추측하지 않고 거부한다', async () => {
    const fetchPage = vi.fn(async () => ({ list: [1] }));

    await expect(fetchAllPages(fetchPage as never)).rejects.toThrow('페이지 응답 형식');
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('total이 남았는데 빈 페이지가 오면 잘린 결과를 성공으로 위장하지 않는다', async () => {
    const fetchPage = vi.fn(async (pageIndex: number) => ({
      list: pageIndex === 1
        ? Array.from({ length: MAX_PAGE_UNIT }, (_, index) => index)
        : [],
      total: MAX_PAGE_UNIT + 1,
    }));

    await expect(fetchAllPages(fetchPage)).rejects.toThrow('전체 건수와 페이지 응답이 일치하지 않습니다');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('전체 건수가 안전 상한을 넘으면 다음 페이지를 요청하기 전에 거부한다', async () => {
    const fetchPage = vi.fn(async () => ({
      list: Array.from({ length: MAX_PAGE_UNIT }, (_, index) => index),
      total: 5_001,
    }));

    await expect(fetchAllPages(fetchPage)).rejects.toThrow('안전 상한');
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('서버가 요청한 pageUnit보다 많은 행을 반환하면 계약 불일치로 거부한다', async () => {
    const fetchPage = vi.fn(async () => ({
      list: Array.from({ length: MAX_PAGE_UNIT + 1 }, (_, index) => index),
      total: MAX_PAGE_UNIT + 1,
    }));

    await expect(fetchAllPages(fetchPage)).rejects.toThrow('페이지 응답 형식');
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
