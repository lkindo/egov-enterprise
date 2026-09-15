vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { noteService } from '../NoteService';
import { scrapService } from '../ScrapService';
import { mailService } from '../../mail/MailService';
import { boardUserService } from '../board/BoardUserService';

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
 const fallback = url.endsWith('/received') || url.endsWith('/sent') || url === 'scraps'
 ? { list: [], total: 0, page: 0, size: 10, totalPage: 0 }
 : {};
 return { success: true, code: 'S000', message: '성공', data: result ?? fallback };
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

/*
 * [GAP-PACK-001] 이 파일은 **collaboration pack 소유 서비스만** 검증한다 — 그 pack 이 빠진 프로필
 * (core)에서는 검증 대상이 함께 사라지므로 파일이 cascade 제거되는 것이 정확한 동작이다.
 * 다른 pack 의 서비스를 여기 섞으면 그 서비스의 검증이 core 에서 조용히 없어진다.
 * 경계는 scripts/frontend-reachability-census.test.mjs 의 생존 가드가 지킨다.
 */
describe('Collaboration user services', () => {
 beforeEach(() => vi.clearAllMocks());

 it('noteService validates every JSON/void operation through the generated raw boundary', async () => {
 const page = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
 vi.mocked(client.getRaw)
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: page })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: page })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { noteSn: 31 } });
 vi.mocked(client.requestRaw)
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined });

 await noteService.getReceivedNotes({ page: 0, size: 10 });
 await noteService.getSentNotes({ page: 1, searchWrd: '회의' });
 await noteService.sendNote({ rcverId: 'user01', noteSj: '제목', noteCn: '내용' });
 await noteService.getNote(31, { type: 'received', relationSn: 41 });
 await noteService.deleteNote(41, { type: 'received' });

 expect(vi.mocked(client.getRaw).mock.calls).toEqual([
 ['notes/received', { params: { page: 0, size: 10 } }],
 ['notes/sent', { params: { searchWrd: '회의', page: 1 } }],
 ['notes/31', { params: { type: 'received', relationSn: 41 } }],
 ]);
 expect(vi.mocked(client.requestRaw).mock.calls).toEqual([
 [{
 url: 'notes',
 method: 'post',
 data: { rcverId: 'user01', noteSj: '제목', noteCn: '내용' },
 }],
 [{ url: 'notes/41', method: 'delete', params: { type: 'received' } }],
 ]);
 });

 it('mailService validates list/detail/send/delete with generated operation descriptors', async () => {
 const page = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
 vi.mocked(client.getRaw)
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: page })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { emlDsptchSn: 17 } });
 vi.mocked(client.requestRaw)
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: 71 })
 .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined });

 await mailService.getSentMails({ page: 0, size: 10, searchKeyword: '공지' });
 await mailService.getSentMail(17);
 await expect(mailService.sendMail({ sj: '제목', recptnPerson: 'user@example.com' })).resolves.toBe(71);
 await mailService.deleteMail(17);

 expect(vi.mocked(client.getRaw).mock.calls).toEqual([
 ['mails', { params: { searchKeyword: '공지', page: 0, size: 10 } }],
 ['mails/17', undefined],
 ]);
 expect(vi.mocked(client.requestRaw).mock.calls).toEqual([
 [{
 url: 'mails',
 method: 'post',
 data: { sj: '제목', recptnPerson: 'user@example.com' },
 }],
 [{ url: 'mails/17', method: 'delete' }],
 ]);
 });

 it('noteService calls correct endpoints', async () => {
 await noteService.getReceivedNotes({ page: 0 });
 expect(client.get).toHaveBeenCalledWith('notes/received', expect.any(Object));
 await noteService.getNote(31, { type: 'received', relationSn: 41 });
 expect(client.get).toHaveBeenCalledWith('notes/31', { params: { type: 'received', relationSn: 41 } });
 await noteService.deleteNote(41, { type: 'received' });
 expect(client.delete).toHaveBeenCalledWith('notes/41', { params: { type: 'received' } });
 });

 it('scrapService calls correct endpoints', async () => {
 vi.mocked(client.get).mockResolvedValueOnce({ list: [], total: 0, page: 0, size: 10, totalPage: 0 });
 await scrapService.getMyScraps({ pageIndex: 1, pageUnit: 10 });
 expect(client.get).toHaveBeenCalledWith('scraps', expect.any(Object));
 await scrapService.deleteScrap(7);
 expect(client.delete).toHaveBeenCalledWith('scraps/7', undefined);
 });

 it('mailService uses the numeric dispatch serial number in resource paths', async () => {
 await mailService.getSentMail(17);
 expect(client.get).toHaveBeenCalledWith('mails/17', undefined);
 await mailService.deleteMail(17);
 expect(client.delete).toHaveBeenCalledWith('mails/17', undefined);
 });

 it('BoardUserService should call correct endpoints', async () => {
 vi.mocked(client.getRaw).mockResolvedValueOnce({
 success: true,
 code: 'S000',
 message: '성공',
 data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
 });
 await boardUserService.getPosts('BBS01', { page: 0 });
 expect(client.getRaw).toHaveBeenCalledWith('boards/BBS01', {
 params: { page: 0 },
 });
 });
});
