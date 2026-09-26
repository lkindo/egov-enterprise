import { describe, expect, it } from 'vitest';
import { canEnterRegisteredPage as proxyCanEnter } from '../page-authorization';
import { canEnterRegisteredPage, canOpenPage, registeredPagePermissions } from '../page-access';
import { PAGE_PERMISSIONS } from '@/types/generated-permissions';

/**
 * 화면의 링크 노출 판정(canOpenPage)은 라우트 게이트(proxy.ts 의 canEnterRegisteredPage)와 같은 판정이어야 한다
 * (DIP B4 P1). 다르면 버튼은 보이는데 누르면 홈으로 튕긴다.
 */
const subject = (permissions: string[]) => ({ permissions, authorizationVersion: 'v1' });

describe('canOpenPage', () => {
  it('라우트 게이트와 같은 함수를 쓴다', () => {
    expect(proxyCanEnter).toBe(canEnterRegisteredPage);
  });

  it('목적지 라우트의 권한으로 판정한다 — 다른 화면의 권한은 길을 열지 않는다', () => {
    expect(PAGE_PERMISSIONS['/admin/operation/memo-reports']).toEqual(['MEMO_RPT_READ_ALL']);
    expect(canOpenPage(subject(['DEPT_BOX_READ']), '/admin/operation/memo-reports')).toBe(false);
    expect(canOpenPage(subject(['MEMO_RPT_READ_ALL']), '/admin/operation/memo-reports')).toBe(true);
  });

  it('쿼리와 해시는 판정에 쓰지 않는다', () => {
    expect(canOpenPage(subject(['AUTHRT_READ']), '/admin/security/authority?tab=users#top')).toBe(true);
    expect(canOpenPage(subject([]), '/admin/security/authority?tab=users')).toBe(false);
  });

  it('동적 세그먼트는 등록된 라우트 모양으로도, 실제 값으로도 판정한다', () => {
    expect(canOpenPage(subject(['SURVEY_READ_ALL']), '/admin/survey/manage/[id]')).toBe(true);
    expect(canOpenPage(subject(['SURVEY_READ_ALL']), '/admin/survey/manage/12')).toBe(true);
    expect(canOpenPage(subject(['SURVEY_RSP_READ']), '/admin/survey/manage/12')).toBe(false);
  });

  it('권한 버전이 없는 주체와 등록되지 않은 관리 경로는 열지 않는다', () => {
    expect(canOpenPage({ permissions: ['MEMO_RPT_READ_ALL'] }, '/admin/operation/memo-reports')).toBe(false);
    expect(canOpenPage(null, '/admin/operation/memo-reports')).toBe(false);
    expect(registeredPagePermissions('/admin/operation/memo-reports/unregistered')).toBeNull();
    expect(canOpenPage(subject(['MEMO_RPT_READ_ALL']), '/admin/operation/memo-reports/unregistered')).toBe(false);
  });

  it('관리 경로 밖은 페이지 게이트가 없다(세그먼트 경계를 지킨다)', () => {
    expect(canOpenPage(null, '/approvals')).toBe(true);
    expect(canOpenPage(null, '/administrators')).toBe(true);
    // 대소문자를 흉내낸 관리 경로는 게이트 대상이며 등록된 경로가 아니므로 거부한다(proxy 와 같다).
    expect(canOpenPage(subject(['MENU_READ']), '/Admin/system/menus')).toBe(false);
  });

  it('인증만 요구하는 관리 경로는 권한 없이도 열린다', () => {
    expect(registeredPagePermissions('/admin/work-hub')).toEqual([]);
    expect(canOpenPage(subject([]), '/admin/work-hub')).toBe(true);
  });
});
