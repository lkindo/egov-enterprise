vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, expectTypeOf, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { addressbookUserService } from '../addressbook/AddressbookUserService';
import { approvalUserService } from '../approval/ApprovalUserService';
import { communityUserService } from '../community/CommunityUserService';
import { reportService, type WorkReportInput } from '../ReportService';
import { createWorkReportOperation, updateWorkReportOperation } from '@/types/generated-operations';
import {
 WorkReportDtoRequestSchema,
 WorkReportDtoResponseSchema,
 WorkReportDtoSchema,
} from '@/types/generated-zod';

vi.mock('@/lib/api/client', () => {
 const get = vi.fn();
 const post = vi.fn();
 const put = vi.fn();
 const remove = vi.fn();

 return {
 default: {
 get,
 post,
 put,
 delete: remove,
 getRaw: vi.fn(async (url: string, config?: unknown) => {
 const result = await get(url, config);
 return { success: true, code: 'S000', message: '성공', data: result ?? {} };
 }),
 requestRaw: vi.fn(async (request: Record<string, unknown>) => {
 const { url, method, data, ...rest } = request;
 const config = Object.keys(rest).length > 0 ? rest : undefined;
 let result: unknown;
 if (method === 'post') result = await post(url, data, config);
 if (method === 'put') result = await put(url, data, config);
 if (method === 'delete') result = await remove(url, config);
 return { success: true, code: 'S000', message: '성공', data: result };
 }),
 }
 };
});

const PAGE = {
 success: true,
 code: 'S000',
 message: '성공',
 data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
};

/*
 * [GAP-PACK-001] 이 파일은 **demo pack 소유 서비스만** 검증한다 — 그 pack 이 빠진 프로필
 * (core·collaboration)에서는 검증 대상이 함께 사라지므로 파일이 cascade 제거되는 것이 정확한 동작이다.
 * 다른 pack 의 서비스를 여기 섞으면 그 서비스의 검증이 축소 프로필에서 조용히 없어진다.
 */
describe('Demo user services', () => {
 beforeEach(() => vi.clearAllMocks());

 it('addressbookUserService calls correct endpoints', async () => {
 vi.mocked(client.getRaw).mockResolvedValueOnce(PAGE);
 await addressbookUserService.getAddressBooks({ page: 1 });
 expect(client.getRaw).toHaveBeenCalledWith('address-books', {
 params: { page: 1, searchCnd: '0' },
 });
 });

 /*
  * 서버(AddressBookRepositoryImpl)는 searchCnd 가 '0'/'1' 일 때만 검색 조건을 만든다.
  * 종전에는 두 호출부 모두 searchCnd 를 보내지 않아 QueryDSL 의 and(null) 로 무시됐고,
  * **검색어를 넣어도 목록과 총건수가 전체 그대로**였다. 오류도 로딩도 없어 사용자는 알 수 없다.
  */
 it('addressbookUserService 는 검색어가 서버에 닿도록 searchCnd 를 실어 보낸다', async () => {
 vi.mocked(client.getRaw).mockResolvedValueOnce(PAGE);
 await addressbookUserService.getAddressBooks({ page: 0, size: 10, searchWrd: '영업팀' });

 const [, config] = vi.mocked(client.getRaw).mock.calls.at(-1)!;
 expect(config?.params).toMatchObject({ searchWrd: '영업팀', searchCnd: '0' });
 });

 it('addressbookUserService 는 호출부가 고른 검색 축을 덮어쓰지 않는다', async () => {
 vi.mocked(client.getRaw).mockResolvedValueOnce(PAGE);
 await addressbookUserService.getAddressBooks({ page: 0, searchWrd: 'kim', searchCnd: '1' });

 const [, config] = vi.mocked(client.getRaw).mock.calls.at(-1)!;
 expect(config?.params.searchCnd).toBe('1');
 });

 it('ApprovalUserService should call correct endpoints', async () => {
 vi.mocked(client.getRaw).mockResolvedValueOnce(PAGE);
 await approvalUserService.getPending({ page: 0 });
 expect(client.getRaw).toHaveBeenCalledWith('approvals/pending', { params: { page: 0 } });
 });

 /*
  * ⚠ 커뮤니티 사용자 서비스는 core 로 보이지만 demo 다 — 서비스 파일 자체는 어느 pack 의
  *   removePaths 에도 없고, 그것이 import 하는 `@/types/business/community.ts` 가 demo 소유라
  *   cascade 로 함께 빠진다. manifest 의 경로 목록만 읽으면 놓치고, 도달성 census 를 실행해야 보인다.
  */
 it('communityUserService calls correct endpoints', async () => {
 vi.mocked(client.getRaw).mockResolvedValueOnce(PAGE);
 await communityUserService.getCommunityList({} as never);
 expect(client.getRaw).toHaveBeenCalledWith('communities', { params: {} });
 });

 it('reportService rejects every server-owned report field before transport', async () => {
 const serverOwnedFields = ['rptpSn', 'userId', 'userNm', 'rptSttsCd', 'rptTypeCd'] as const;
 type ServerOwnedField = Extract<keyof WorkReportInput, (typeof serverOwnedFields)[number]>;
 expectTypeOf<ServerOwnedField>().toEqualTypeOf<never>();

 const forbiddenPaths = serverOwnedFields.map((field) => [field]);
 expect(createWorkReportOperation.requestForbiddenPaths).toStrictEqual(forbiddenPaths);
 expect(updateWorkReportOperation.requestForbiddenPaths).toStrictEqual(forbiddenPaths);
 expect(Object.keys(WorkReportDtoRequestSchema.shape).sort()).toStrictEqual(
 ['rptTtl', 'rptCn', 'rptSeCd', 'atchFileSn', 'rptYmd'].sort(),
 );
 expect(Object.keys(WorkReportDtoSchema.shape)).toEqual(expect.arrayContaining([...serverOwnedFields]));
 expect(Object.keys(WorkReportDtoResponseSchema.shape).sort()).toStrictEqual(
 Object.keys(WorkReportDtoSchema.shape).sort(),
 );

 for (const field of serverOwnedFields) {
 const forged = { rptTtl: '보고', [field]: 'forged-value' };
 await expect(reportService.createReport(forged as never))
 .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
 await expect(reportService.updateReport(23, forged as never))
 .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
 }
 expect(vi.mocked(client.requestRaw)).not.toHaveBeenCalled();
 });

 it('reportService preserves its pagination aliases and config at the generated boundary', async () => {
 const page = { list: [], total: 0, page: 1, size: 20, totalPage: 0 };
 vi.mocked(client.getRaw)
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: page })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { rptpSn: 23, rptTtl: '기존 보고' } });
 vi.mocked(client.requestRaw)
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined });

 await reportService.getReports(
 { pageIndex: 2, pageUnit: 20, searchWrd: '주간' },
 { timeout: 1500 },
 );
 await reportService.getReport(23);
 await reportService.createReport({ rptTtl: '신규 보고' });
 await reportService.updateReport(23, { rptTtl: '수정 보고' });
 await reportService.deleteReport(23);

 expect(vi.mocked(client.getRaw).mock.calls).toEqual([
 ['work-reports', {
 timeout: 1500,
 params: { pageIndex: 2, pageUnit: 20, searchKeyword: '주간' },
 }],
 ['work-reports/23', undefined],
 ]);
 expect(vi.mocked(client.requestRaw).mock.calls).toEqual([
 [{ url: 'work-reports', method: 'post', data: { rptTtl: '신규 보고' } }],
 [{ url: 'work-reports/23', method: 'put', data: { rptTtl: '수정 보고' } }],
 [{ url: 'work-reports/23', method: 'delete' }],
 ]);
 });

 it('reportService uses the numeric report serial number in resource paths', async () => {
 vi.mocked(client.get).mockResolvedValueOnce({ rptpSn: 23, rptTtl: '기존 보고' });
 await reportService.getReport(23);
 expect(client.get).toHaveBeenCalledWith('work-reports/23', undefined);
 await reportService.updateReport(23, { rptTtl: '수정 보고' });
 expect(client.put).toHaveBeenCalledWith('work-reports/23', { rptTtl: '수정 보고' }, undefined);
 await reportService.deleteReport(23);
 expect(client.delete).toHaveBeenCalledWith('work-reports/23', undefined);
 });
});
