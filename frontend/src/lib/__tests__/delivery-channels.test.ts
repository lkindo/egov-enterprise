import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasDeliveryChannel } from '../delivery-channels';
import type { SlotContributions } from '@/extensions/slots';
import { inProjection } from '@/test-utils/projection';

/**
 * 전달 채널 도우미(GAP-COMPOSE-001). 결재·메모 보고 화면이 '알린다' 고 말하거나 재알림 단추를 두기 전에 이것을 묻는다.
 *
 * 레지스트리 모듈은 vi.mock 으로 감싸 실제 값(원본 기여의 렌더)과 빈 배열(알림이 빠진 구성의 렌더) 사이를 오간다. 알림 기여가
 * 투영으로 빠진 생성물에서는 실제 레지스트리가 이미 빈 배열이므로, 실제 값을 쓰는 시험은 투영 원장으로 기대를 가른다.
 */
const NOTIFICATION_CONTRIBUTION = 'frontend/src/extensions/notification/delivery-channels.ts';
const notificationInProjection = inProjection(NOTIFICATION_CONTRIBUTION);

type Registry = readonly SlotContributions<'delivery-channels'>[];
const state = vi.hoisted(() => ({
  mode: 'actual' as 'actual' | 'empty' | 'fake',
  fake: [] as unknown,
  /** 실제 레지스트리(원본 기여의 렌더 — 알림이 빠진 생성물에서는 빈 배열). */
  actual: [] as unknown,
}));

vi.mock('@/extensions/generated-delivery-channels', async (importOriginal) => {
  const actual = await importOriginal<{ deliveryChannels: Registry }>();
  state.actual = actual.deliveryChannels;
  const empty: Registry = [];
  return {
    get deliveryChannels() {
      return state.mode === 'actual' ? actual.deliveryChannels : state.mode === 'empty' ? empty : state.fake;
    },
  };
});

describe('hasDeliveryChannel', () => {
  beforeEach(() => {
    state.mode = 'actual';
    state.fake = [];
  });

  it('실제 레지스트리: 알림 기여가 남은 구성에서는 있다고, 투영으로 빠진 구성에서는 없다고 답한다', () => {
    expect(hasDeliveryChannel('notification')).toBe(notificationInProjection);
    // 원본 기여는 알림 하나이고 노출 술어는 사유가 있는 always 다 — 구성의 사실이라 보는 사람마다 다르지 않다.
    const entries = (state.actual as Registry).flat();
    if (notificationInProjection) {
      expect(entries).toEqual([{ id: 'notification', visibleWhen: { always: expect.stringMatching(/\S/) } }]);
    } else {
      expect(entries).toEqual([]);
    }
  });

  it('빈 레지스트리(알림이 빠진 구성의 렌더)에서는 없다고 답한다', () => {
    state.mode = 'empty';
    expect(hasDeliveryChannel('notification')).toBe(false);
  });

  it('다른 채널만 있으면 없다고 답한다 — 레지스트리가 비었는지가 아니라 그 채널의 id 로 판정한다', () => {
    state.mode = 'fake';
    state.fake = [[{ id: 'mail', visibleWhen: { always: '시험' } }]];
    expect(hasDeliveryChannel('notification')).toBe(false);
    state.fake = [[{ id: 'mail', visibleWhen: { always: '시험' } }], [{ id: 'notification', visibleWhen: { always: '시험' } }]];
    expect(hasDeliveryChannel('notification')).toBe(true);
  });
});
