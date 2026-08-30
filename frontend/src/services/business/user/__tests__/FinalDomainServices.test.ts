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
import { menuService } from '../MenuService';
import { mailService } from '../../mail/MailService';
import { reportService } from '../ReportService';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 }
}));

describe('Final Domain Services', () => {
 beforeEach(() => vi.clearAllMocks());

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

 it('reportService uses the numeric report serial number in resource paths', async () => {
 await reportService.getReport(23);
 expect(client.get).toHaveBeenCalledWith('work-reports/23', undefined);
 await reportService.updateReport(23, { rptTtl: '수정 보고' });
 expect(client.put).toHaveBeenCalledWith('work-reports/23', { rptTtl: '수정 보고' }, undefined);
 await reportService.deleteReport(23);
 expect(client.delete).toHaveBeenCalledWith('work-reports/23', undefined);
 });

 it('menuService calls correct endpoints', async () => {
 // MenuService expects { list: [] }
 (client.get as any).mockResolvedValue({ list: [] });
 await menuService.getHeadMenus();
 expect(client.get).toHaveBeenCalledWith('menus/head', undefined);
 });
});
