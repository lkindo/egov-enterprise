import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { smsAdminService } from '../SmsAdminService';

describe('SmsAdminService numeric transmission serial contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the numeric SMS transmission serial number for detail and recipient paths', async () => {
    await smsAdminService.getSms(101);
    await smsAdminService.getSmsRecipients(101);

    expect(client.get).toHaveBeenNthCalledWith(1, 'admin/operation/sms/101', undefined);
    expect(client.get).toHaveBeenNthCalledWith(2, 'admin/operation/sms/101/recipients', undefined);
  });

  it('does not send a client-generated primary key and returns the numeric server key', async () => {
    const request = {
      sndngTelno: '0212345678',
      sndngCn: 'message',
      recipients: [{ rcptnTelno: '01033334444' }],
    };
    client.post.mockResolvedValue(101);

    const generatedSn = await smsAdminService.sendSms(request);

    expect(client.post).toHaveBeenCalledWith('admin/operation/sms', request, undefined);
    expect(generatedSn).toBe(101);
  });
});
