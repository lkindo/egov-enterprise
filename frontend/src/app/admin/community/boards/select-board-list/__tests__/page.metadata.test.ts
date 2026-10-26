import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE_IDENTITY } from '@/config/site-identity';

/**
 * [2026-10-26 ADR-0043 UX-15] 게시판 이용 목록의 문서 제목은 '게시판 이름 | 사이트 이름' 이다. 종전 고정 제목('전체 게시글 - 전자정부
 * 프레임워크')은 어느 게시판을 열어도 같아 탭·방문 기록·화면낭독기가 지금 어느 게시판인지 말하지 못했다. 이름을 받지 못하면 일반 제목을
 * 쓰고 이름을 지어내지 않는다. bbsId 없이 들어오면 화면과 같은 기본 게시판의 이름을 쓴다.
 */
const mocks = vi.hoisted(() => ({
  getBoardTitle: vi.fn(),
  resolveDefaultBoardId: vi.fn(),
}));

vi.mock('../BoardListServer', () => ({
  getBoardTitle: mocks.getBoardTitle,
  getInitialBoardData: vi.fn(),
  resolveDefaultBoardId: mocks.resolveDefaultBoardId,
}));
vi.mock('../BoardListClient', () => ({ BoardListClient: () => null }));

import { generateMetadata } from '../page';

const metadataFor = (searchParams: Record<string, string | string[] | undefined>) =>
  generateMetadata({ searchParams: Promise.resolve(searchParams) });

describe('게시판 이용 목록 문서 제목', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveDefaultBoardId.mockResolvedValue('BBS_DEFAULT');
  });

  it('게시판 이름 | 사이트 이름으로 만든다', async () => {
    mocks.getBoardTitle.mockResolvedValueOnce('자료실');
    const metadata = await metadataFor({ bbsId: 'BBS_1' });

    expect(metadata.title).toBe(`자료실 | ${SITE_IDENTITY.frameworkName}`);
    expect(mocks.getBoardTitle).toHaveBeenCalledWith('BBS_1');
    expect(mocks.resolveDefaultBoardId).not.toHaveBeenCalled();
  });

  it('이름을 받지 못하면 일반 제목을 쓴다', async () => {
    mocks.getBoardTitle.mockResolvedValueOnce(null);
    const metadata = await metadataFor({ bbsId: 'BBS_GONE' });

    expect(metadata.title).toBe(`게시판 | ${SITE_IDENTITY.frameworkName}`);
    expect(String(metadata.title)).not.toContain('BBS_GONE');
  });

  it('bbsId 없이 들어오면 화면과 같은 기본 게시판의 이름을 쓴다', async () => {
    mocks.getBoardTitle.mockResolvedValueOnce('공지사항');
    const metadata = await metadataFor({});

    expect(mocks.getBoardTitle).toHaveBeenCalledWith('BBS_DEFAULT');
    expect(metadata.title).toBe(`공지사항 | ${SITE_IDENTITY.frameworkName}`);
  });
});
