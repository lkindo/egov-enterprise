import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { bannerAdminService } from '../BannerAdminService';
import { communityAdminService } from '../CommunityAdminService';
import { deptAdminService } from '../DeptAdminService';
import { groupAdminService } from '../GroupAdminService';
import { menuAdminService } from '../MenuAdminService';
import { roleAdminService } from '../RoleAdminService';
import { statsAdminService } from '../StatsAdminService';

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
const page = (list: unknown[] = []) => ({ list, total: list.length, page: 0, size: 10, totalPage: 1 });

describe('generated system boundary wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue(envelope(undefined));
  });

  it('MenuAdminService의 9개 경계를 operation descriptor로 실행한다', async () => {
    const menu = { menuNo: 7, menuNm: '메뉴', menuOrdr: 1 };
    client.getRaw
      .mockResolvedValueOnce(envelope(page([menu])))
      .mockResolvedValueOnce(envelope([menu]))
      .mockResolvedValueOnce(envelope(menu))
      .mockResolvedValueOnce(envelope(page([])));

    await menuAdminService.getMenuList({ page: 0, size: 20, searchWrd: '메뉴' });
    await menuAdminService.getAllMenus();
    await menuAdminService.getMenu(7);
    await menuAdminService.createMenu({ menuNm: '메뉴', menuOrdr: 1 });
    await menuAdminService.updateMenu(7, { menuNm: '수정', menuOrdr: 2 });
    await menuAdminService.updateMenuOrder([{ menuNm: '메뉴', menuOrdr: 1 }]);
    await menuAdminService.deleteMenu(7);
    await menuAdminService.getMenuCreationManageList({ page: 0, size: 20 });
    await menuAdminService.saveMenuCreation('ROLE_ADMIN', [1, 2]);

    expect(client.getRaw.mock.calls.map(([url]) => url)).toEqual([
      'admin/system/menus',
      'admin/system/menus/all',
      'admin/system/menus/7',
      'admin/system/menus/creation-manage',
    ]);
    expect(client.requestRaw.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
      ['post', 'admin/system/menus'],
      ['put', 'admin/system/menus/7'],
      ['put', 'admin/system/menus/batch-order'],
      ['delete', 'admin/system/menus/7'],
      ['post', 'admin/system/menus/creation/ROLE_ADMIN'],
    ]);
  });

  it('DeptAdminService의 7개 경계를 operation descriptor로 실행한다', async () => {
    const dept = { ognzId: 'ORG_001', ognzNm: '개발부' };
    client.getRaw
      .mockResolvedValueOnce(envelope(page([dept])))
      .mockResolvedValueOnce(envelope([dept]))
      .mockResolvedValueOnce(envelope(dept));
    client.requestRaw
      .mockResolvedValueOnce(envelope('ORG_002'))
      .mockResolvedValue(envelope(undefined));

    await deptAdminService.getDeptList({ keyword: '개발', page: 0, size: 20 });
    await deptAdminService.getDeptTree('개발');
    await deptAdminService.getDept('ORG_001');
    await deptAdminService.createDept({ ognzNm: '신설부' });
    await deptAdminService.updateDept('ORG_001', { ognzNm: '수정부' });
    await deptAdminService.updateDeptHierarchy([{ ognzId: 'ORG_001', sortOrdr: 1 }]);
    await deptAdminService.deleteDept('ORG_001');

    expect(client.getRaw.mock.calls.map(([url]) => url)).toEqual([
      'admin/system/departments',
      'admin/system/departments/tree',
      'admin/system/departments/ORG_001',
    ]);
    expect(client.requestRaw.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
      ['post', 'admin/system/departments'],
      ['put', 'admin/system/departments/ORG_001'],
      ['put', 'admin/system/departments/batch-hierarchy'],
      ['delete', 'admin/system/departments/ORG_001'],
    ]);
    expect(client.put).not.toHaveBeenCalled();
  });

  it('조직 계층 배열 item의 과거 오타 필드는 전송 전에 fail-closed 된다', async () => {
    const legacyItems = [{
      ognzId: 'ORG_001',
      upperOgnzId: 'ORG_ROOT',
      ordr: 2,
    }];

    await expect(deptAdminService.updateDeptHierarchy(legacyItems)).rejects.toThrow(
      '생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.',
    );
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('RoleAdminService의 6개 경계를 operation descriptor로 실행한다', async () => {
    const role = { roleId: 'ROLE_A', roleNm: '역할' };
    client.getRaw
      .mockResolvedValueOnce(envelope(page([role])))
      .mockResolvedValueOnce(envelope(role));

    await roleAdminService.getRoleList({ page: 0, size: 20, searchWrd: '역할' });
    await roleAdminService.getRole('ROLE_A');
    await roleAdminService.createRole({ roleNm: '역할' });
    await roleAdminService.updateRole('ROLE_A', { roleNm: '수정' });
    await roleAdminService.deleteRole('ROLE_A');
    await roleAdminService.deleteRoles(['ROLE_A', 'ROLE_B']);

    expect(client.getRaw.mock.calls.map(([url]) => url)).toEqual([
      'admin/system/roles',
      'admin/system/roles/ROLE_A',
    ]);
    expect(client.requestRaw.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
      ['post', 'admin/system/roles'],
      ['put', 'admin/system/roles/ROLE_A'],
      ['delete', 'admin/system/roles/ROLE_A'],
      ['delete', 'admin/system/roles'],
    ]);
  });

  it('StatsAdminService의 6개 조회 경계를 operation descriptor로 실행한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(envelope({ totalUsers: 1, totalPosts: 2, todayConnects: 3 }))
      .mockResolvedValue(envelope([]));

    await statsAdminService.getSummary();
    await statsAdminService.getConnectStats({ fromDate: '20260101', statsKind: 'DAY' });
    await statsAdminService.getBbsStats({ fromDate: '20260101' });
    await statsAdminService.getUserStats({ toDate: '20260131' });
    await statsAdminService.getReportStats();
    await statsAdminService.getDataUsageStats();

    expect(client.getRaw.mock.calls.map(([url]) => url)).toEqual([
      'admin/system/statistics/summary',
      'admin/system/statistics/connect',
      'admin/system/statistics/bbs',
      'admin/system/statistics/user',
      'admin/system/statistics/report',
      'admin/system/statistics/data-usage',
    ]);
  });

  it('GroupAdminService의 6개 경계를 operation descriptor로 실행한다', async () => {
    const group = { groupId: 'GROUP_A', groupNm: '그룹' };
    client.getRaw
      .mockResolvedValueOnce(envelope(page([group])))
      .mockResolvedValueOnce(envelope(group));

    await groupAdminService.getGroupList({ page: 0, size: 20, searchKeyword: '그룹' });
    await groupAdminService.getGroup('GROUP_A');
    await groupAdminService.createGroup({ groupNm: '그룹' });
    await groupAdminService.updateGroup('GROUP_A', { groupNm: '수정' });
    await groupAdminService.deleteGroup('GROUP_A');
    await groupAdminService.deleteGroups(['GROUP_A', 'GROUP_B']);

    expect(client.getRaw.mock.calls.map(([url]) => url)).toEqual([
      'admin/system/groups',
      'admin/system/groups/GROUP_A',
    ]);
    expect(client.requestRaw.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
      ['post', 'admin/system/groups'],
      ['put', 'admin/system/groups/GROUP_A'],
      ['delete', 'admin/system/groups/GROUP_A'],
      ['delete', 'admin/system/groups'],
    ]);
  });

  it('CommunityAdminService의 6개 경계를 operation descriptor로 실행한다', async () => {
    const wireCommunity = { cmntySn: 7, cmntyNm: '커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' };
    client.getRaw
      .mockResolvedValueOnce(envelope(page([wireCommunity])))
      .mockResolvedValueOnce(envelope(wireCommunity))
      .mockResolvedValueOnce(envelope([wireCommunity]));
    client.requestRaw
      .mockResolvedValueOnce(envelope(wireCommunity))
      .mockResolvedValue(envelope(undefined));

    await communityAdminService.getCommunityList({ page: 0, size: 20, searchWrd: '커뮤니티' });
    await communityAdminService.getCommunity(7);
    await communityAdminService.createCommunity({ cmntyNm: '커뮤니티', cmntyIntrcn: '소개', useYn: 'Y' });
    await communityAdminService.updateCommunity(7, { cmntyNm: '수정', cmntyIntrcn: '소개', useYn: 'Y' });
    await communityAdminService.deleteCommunity(7);
    await communityAdminService.getCommunityPortlet();

    expect(client.getRaw.mock.calls.map(([url]) => url)).toEqual([
      'admin/content/community',
      'admin/content/community/7',
      'admin/content/community/portlet',
    ]);
    expect(client.requestRaw.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
      ['post', 'admin/content/community'],
      ['put', 'admin/content/community/7'],
      ['delete', 'admin/content/community/7'],
    ]);
  });

  it('BannerAdminService의 6개 경계를 operation descriptor로 실행한다', async () => {
    const banner = { bnrSn: 7, bnrNm: '배너' };
    client.getRaw
      .mockResolvedValueOnce(envelope(page([banner])))
      .mockResolvedValueOnce(envelope([banner]))
      .mockResolvedValueOnce(envelope(banner));
    client.requestRaw
      .mockResolvedValueOnce(envelope(8))
      .mockResolvedValue(envelope(undefined));

    await bannerAdminService.getBannerList({ page: 0, size: 20, searchWrd: '배너' });
    await bannerAdminService.getReflectedBanners();
    await bannerAdminService.getBanner(7);
    await bannerAdminService.createBanner({ bnrNm: '배너' });
    await bannerAdminService.updateBanner(7, { bnrNm: '수정' });
    await bannerAdminService.deleteBanner(7);

    expect(client.getRaw.mock.calls.map(([url]) => url)).toEqual([
      'admin/system/banners',
      'admin/system/banners/reflected',
      'admin/system/banners/7',
    ]);
    expect(client.requestRaw.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
      ['post', 'admin/system/banners'],
      ['put', 'admin/system/banners/7'],
      ['delete', 'admin/system/banners/7'],
    ]);
  });

  it('생성 query·request·response 계약 위반을 transport 전에 또는 응답 경계에서 차단한다', async () => {
    await expect(bannerAdminService.getBannerList({ sort: 'invalid-sort' }))
      .rejects.toThrow('생성 API 쿼리 파라미터가 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.getRaw).not.toHaveBeenCalled();

    await expect(bannerAdminService.createBanner({}))
      .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();

    client.getRaw.mockResolvedValue(envelope(page([{ bnrSn: 7 }])));
    await expect(bannerAdminService.getBannerList())
      .rejects.toThrow('생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.');
  });
});
