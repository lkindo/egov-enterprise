import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { eventService } from '../eventService';

describe('eventService numeric serial contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockResolvedValue({
      success: true, code: 'S000', message: '성공', data: { evntSn: 101 },
    });
    client.requestRaw.mockResolvedValue({
      success: true, code: 'S000', message: '성공', data: null,
    });
  });

  it('uses the numeric event serial number for detail, update, and delete paths', async () => {
    await eventService.getEvent(101);
    await eventService.updateEvent(101, { evntNm: '수정 행사' });
    await eventService.deleteEvent(101);

    expect(client.getRaw).toHaveBeenCalledWith('admin/operation/events/101', undefined);
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'admin/operation/events/101',
      method: 'put',
      data: { evntNm: '수정 행사' },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'admin/operation/events/101',
      method: 'delete',
    });
  });

  it('does not send a client-generated primary key when creating an event', async () => {
    const request = { evntNm: '신규 행사' };
    client.requestRaw.mockResolvedValueOnce({
      success: true, code: 'S000', message: '성공', data: 101,
    });

    await eventService.createEvent(request);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/operation/events',
      method: 'post',
      data: request,
    });
  });
});
