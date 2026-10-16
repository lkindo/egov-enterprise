import { deliveryChannels } from '@/extensions/generated-delivery-channels';
import type { DeliveryChannel } from '@/extensions/slots';

/** 화면이 묻는 전달 채널. */
export type DeliveryChannelId = DeliveryChannel['id'];

/**
 * 이 구성에 그 전달 채널이 있는지(GAP-COMPOSE-001). 슬롯 레지스트리(delivery-channels)를 읽는 core 도우미다.
 *
 * 결재·메모 보고 화면은 알림 기능을 import 하지 않는다 — import 하면 알림이 빠진 구성에서 화면이 연쇄로 함께 지워진다. 그래서 알림은
 * 자기 디렉터리의 기여로 '있다' 고 알리고, 화면은 이 도우미로 묻는다. 알림이 빠진 구성에서는 투영이 레지스트리를 빈 배열로 다시 만들어
 * false 를 돌려준다 — 화면은 재알림 단추를 감추고 알린다고 말하지 않는다(서버 API 는 그대로다).
 *
 * 구성의 사실이라 주체를 받지 않는다(기여의 노출 술어는 always 하나다). 렌더 중에 불러도 된다 — 레지스트리는 모듈 상수다.
 */
export function hasDeliveryChannel(channel: DeliveryChannelId): boolean {
  return deliveryChannels.some(entries => entries.some(entry => entry.id === channel));
}
