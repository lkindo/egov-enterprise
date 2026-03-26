import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { noteService } from '../NoteService';
import { scrapService } from '../ScrapService';
import { menuService } from '../MenuService';

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
 expect(client.get).toHaveBeenCalledWith('/notes/received', expect.any(Object));
 });

 it('scrapService calls correct endpoints', async () => {
 await scrapService.getMyScraps({ page: 0 });
 expect(client.get).toHaveBeenCalledWith('/scraps', expect.any(Object));
 });

 it('menuService calls correct endpoints', async () => {
 // MenuService expects { list: [] }
 (client.get as any).mockResolvedValue({ list: [] });
 await menuService.getHeadMenus();
 expect(client.get).toHaveBeenCalledWith('/menus/head', undefined);
 });
});
