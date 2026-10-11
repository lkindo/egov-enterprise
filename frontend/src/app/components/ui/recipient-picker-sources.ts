import { useMemo } from 'react';
import { recipientPickerSources } from '@/extensions/generated-recipient-picker-sources';
import type { RecipientPickerSource } from '@/extensions/slots';
import { useSlotEntries } from '@/extensions/use-slot-entries';
import type { RecipientAddressBookSource } from '@/types/recipient-address-book';

/** 주소록 출처를 받는 발송 채널. 알림은 계정(esntlId)으로 전달되므로 명함 출처를 받지 않는다. */
export type RecipientAddressBookChannel = 'mail' | 'sms';

/** 발송 화면이 피커와 입력 안내에 넘기는 주소록 출처. */
export interface RecipientAddressBookOffer {
  source: RecipientAddressBookSource;
  /** 입력 안내에 쓰는 출처 이름('주소록'). */
  label: string;
}

const acceptsChannel = (channel: RecipientAddressBookChannel) => (entry: RecipientPickerSource) => entry.channels.includes(channel);
// 채널마다 고정한 판정 함수다 — 렌더마다 새로 만들면 useSlotEntries 의 결과 배열도 매번 새로 만들어진다.
const ACCEPT_BY_CHANNEL = new Map<string, (entry: RecipientPickerSource) => boolean>([
  ['mail', acceptsChannel('mail')],
  ['sms', acceptsChannel('sms')],
]);
const ACCEPT_NONE = () => false;

/**
 * 수신자 피커의 주소록 출처를 슬롯 레지스트리(recipient-picker-sources)에서 받는다(슬롯 단계 PR-4).
 *
 * 주소록 구현은 주소록 기능 소유다. 발송 화면(메일·문자)이 그 구현을 직접 import 하면 주소록이 빠진 구성에서 화면 전체가 import
 * 연쇄로 함께 지워진다. 그래서 주소록은 자기 디렉터리의 기여 파일로 출처를 내놓고, 화면은 이 도우미로 레지스트리를 읽는다. 주소록이
 * 빠진 구성에서는 투영이 레지스트리를 빈 배열로 다시 만들어 이 도우미가 undefined 를 돌려준다 — 피커는 주소록 탭을, 입력 안내는
 * '주소록' 을 보이지 않는다(화면이 없는 출처를 약속하지 않는다).
 *
 * 노출은 기여의 visibleWhen 이 정한다. 노출일 뿐 인가가 아니다 — 목록 API 의 권한은 서버가 집행한다(H3).
 * 피커의 주소록 탭은 출처 하나를 받으므로 그 채널에 보이는 첫 항목만 쓴다. 두 번째 출처를 들일 때는 피커 API 를 먼저 바꾼다.
 * 결과 객체는 항목(기여 모듈의 값)이 같으면 같은 객체다.
 */
export function useRecipientAddressBook(channel: RecipientAddressBookChannel): RecipientAddressBookOffer | undefined {
  const [entry] = useSlotEntries(recipientPickerSources, ACCEPT_BY_CHANNEL.get(channel) ?? ACCEPT_NONE);
  return useMemo(() => (entry ? { source: entry.source, label: entry.label } : undefined), [entry]);
}
