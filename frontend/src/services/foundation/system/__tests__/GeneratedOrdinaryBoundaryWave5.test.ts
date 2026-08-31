import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { communityService } from '@/services/business/community/communityService';
import { approvalUserService, SANCTION_STATUS } from '@/services/business/user/approval/ApprovalUserService';
import { bannerService } from '@/services/business/user/BannerService';
import { communityUserService } from '@/services/business/user/community/CommunityUserService';
import { menuService } from '@/services/business/user/MenuService';
import { popupService } from '@/services/business/user/PopupService';
import { userService } from '@/services/business/user/userService';
import { userSearchService } from '@/services/business/user/UserSearchService';
import { fileService } from '@/services/foundation/file/FileService';
import { commentAdminService } from '../CommentAdminService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

const emptyPage = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };

describe('ordinary generated boundary wave5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('menu queries use exact generated paths and preserve the list adapter', async () => {
    const head = [{ menuNo: 1, menuNm: '업무', menuOrdr: 1 }];
    const left = [{ menuNo: 2, menuNm: '게시판', menuOrdr: 1 }];
    client.getRaw
      .mockResolvedValueOnce(success({ list: head }))
      .mockResolvedValueOnce(success({ list: left }));

    await expect(menuService.getHeadMenus()).resolves.toStrictEqual(head);
    await expect(menuService.getLeftMenus(1)).resolves.toStrictEqual(left);
    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'menus/head', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'menus/left', { params: { menuNo: 1 } });
  });

  it('menu fallback still turns generated response failures into an empty list', async () => {
    client.getRaw.mockResolvedValueOnce({ list: [] });

    await expect(menuService.getHeadMenus()).resolves.toStrictEqual([]);
  });

  it('popup, banner, and assignable-user reads use their exact operations', async () => {
    const popups = [{ popupSn: 3, popupTtlNm: '안내' }];
    const banners = [{ bnrSn: 4, bnrNm: '메인' }];
    const users = [{ esntlId: 'USER_1', userNm: '홍길동', deptNm: '기획팀' }];
    client.getRaw
      .mockResolvedValueOnce(success(popups))
      .mockResolvedValueOnce(success(popups[0]))
      .mockResolvedValueOnce(success(banners))
      .mockResolvedValueOnce(success(users));

    await expect(popupService.getActivePopups()).resolves.toStrictEqual(popups);
    await expect(popupService.getPopup(3)).resolves.toStrictEqual(popups[0]);
    await expect(bannerService.getReflectedBanners()).resolves.toStrictEqual(banners);
    await expect(userSearchService.searchAssignableUsers('홍길')).resolves.toStrictEqual(users);

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'popups/active', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'popups/3', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'banners/reflected', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(4, 'users/search', { params: { keyword: '홍길' } });
  });

  it('both community services normalize legacy aliases into the generated Pageable query', async () => {
    client.getRaw
      .mockResolvedValueOnce(success(emptyPage))
      .mockResolvedValueOnce(success(emptyPage));

    await communityService.getCommunityList({
      pageIndex: 2,
      pageUnit: 25,
      searchCondition: '0',
      searchKeyword: '개발',
      useYn: 'Y',
    });
    await communityUserService.getCommunityList({ page: 0, size: 10, searchCnd: '0', searchWrd: '운영' });

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'communities', {
      params: { page: 1, size: 25, searchCnd: '0', searchWrd: '개발' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'communities', {
      params: { page: 0, size: 10, searchCnd: '0', searchWrd: '운영' },
    });
  });

  it('community detail and join use generated path variables and void response', async () => {
    const community = { cmntySn: 7, cmntyNm: '개발', cmntyIntroCn: '소개', useYn: 'Y' as const };
    client.getRaw
      .mockResolvedValueOnce(success(community))
      .mockResolvedValueOnce(success(community));

    await expect(communityService.getCommunity(7)).resolves.toStrictEqual(community);
    await expect(communityUserService.getCommunity(7)).resolves.toStrictEqual(community);
    await communityUserService.joinCommunity(7);

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'communities/7', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'communities/7', undefined);
    expect(client.requestRaw).toHaveBeenCalledWith({ url: 'communities/7/join', method: 'post' });
  });

  it('approval lists and decision use generated pageable and request contracts', async () => {
    client.getRaw
      .mockResolvedValueOnce(success(emptyPage))
      .mockResolvedValueOnce(success(emptyPage));

    await expect(approvalUserService.getPending({ page: 0, size: 10 })).resolves.toStrictEqual(emptyPage);
    await expect(approvalUserService.getMyHistory({ page: 1, size: 20 })).resolves.toStrictEqual({
      ...emptyPage,
      page: 0,
      size: 10,
    });
    await approvalUserService.confirm(9, SANCTION_STATUS.REJECTED, '자료 보완');

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'approvals/pending', {
      params: { page: 0, size: 10 },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'approvals/my', {
      params: { page: 1, size: 20 },
    });
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'approvals/9/confirm',
      method: 'put',
      data: { status: 'R', reason: '자료 보완' },
    });
  });

  it('comment aliases map to the exact generated query and delete path', async () => {
    client.getRaw.mockResolvedValueOnce(success(emptyPage));

    await expect(commentAdminService.getComments({
      pstSn: 5,
      bbsId: 'BBS_1',
      page: 0,
      size: 10,
      searchWrd: '스팸',
    })).resolves.toStrictEqual(emptyPage);
    await commentAdminService.deleteComment(8);

    expect(client.getRaw).toHaveBeenCalledWith('admin/comments', {
      params: { pstSn: 5, bbsId: 'BBS_1', page: 0, size: 10, searchKeyword: '스팸' },
    });
    expect(client.requestRaw).toHaveBeenCalledWith({ url: 'admin/comments/8', method: 'delete' });
  });

  it('my-profile read, profile update, and password change all use their generated contracts', async () => {
    const me = { userId: 'test_user', userNm: '홍길동', esntlId: 'USER_1', role: 'ROLE_USER' };
    client.getRaw.mockResolvedValueOnce(success(me));
    await expect(userService.getMe()).resolves.toStrictEqual(me);
    await userService.changePassword('Oldpass1!', 'Newpass1!');
    await userService.updateMe({ userNm: '김철수' });

    expect(client.getRaw).toHaveBeenCalledWith('users/me', undefined);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'users/me/password',
      method: 'put',
      data: { oldPassword: 'Oldpass1!', newPassword: 'Newpass1!' },
    });
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'users/me',
      method: 'put',
      data: { userNm: '김철수' },
    });
    expect(client.put).not.toHaveBeenCalled();
  });

  it('file multipart metadata, list JSON, and binary download use generated transport without changing bytes', async () => {
    const upload = new File(['original-bytes'], 'report.txt', { type: 'text/plain' });
    const files = [{
      atchFileSn: 11,
      fileSn: 2,
      fileStreCours: '/store',
      streFileNm: 'stored.txt',
      orignlFileNm: 'report.txt',
      fileExtsn: 'txt',
      fileMg: 14,
    }];
    const blob = new Blob(['download-bytes'], { type: 'application/octet-stream' });
    client.requestRaw.mockResolvedValueOnce(success(11));
    client.getRaw
      .mockResolvedValueOnce(success(files))
      .mockResolvedValueOnce(blob);

    await expect(fileService.uploadFiles([upload])).resolves.toBe(11);
    await expect(fileService.getFileList(11)).resolves.toStrictEqual(files);
    await expect(fileService.fetchBlob(11, 2)).resolves.toBe(blob);

    const multipartCall = client.requestRaw.mock.calls[0][0] as {
      url: string;
      method: string;
      data: FormData;
      headers?: unknown;
    };
    expect(multipartCall.url).toBe('files');
    expect(multipartCall.method).toBe('post');
    expect(multipartCall.data.getAll('files')).toStrictEqual([upload]);
    expect(multipartCall.headers).toEqual({ 'Content-Type': undefined });
    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'files/11', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'files/11/2', { responseType: 'blob' });
  });
});
