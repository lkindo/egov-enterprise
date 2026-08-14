import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { eventService } from '../eventService';

describe('eventService numeric serial contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the numeric event serial number for detail, update, and delete paths', async () => {
    await eventService.getEvent(101);
    await eventService.updateEvent(101, { evntNm: '수정 행사' });
    await eventService.deleteEvent(101);

    expect(client.get).toHaveBeenCalledWith('admin/operation/events/101');
    expect(client.put).toHaveBeenCalledWith(
      'admin/operation/events/101',
      { evntNm: '수정 행사' },
    );
    expect(client.delete).toHaveBeenCalledWith('admin/operation/events/101');
  });

  it('does not send a client-generated primary key when creating an event', async () => {
    const request = { evntNm: '신규 행사' };

    await eventService.createEvent(request);

    expect(client.post).toHaveBeenCalledWith('admin/operation/events', request);
  });
});
