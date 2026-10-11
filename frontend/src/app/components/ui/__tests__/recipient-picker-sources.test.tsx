import { render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { RecipientPicker, type RecipientChannel } from '../recipient-picker';
import { useRecipientAddressBook } from '../recipient-picker-sources';
import type { RecipientPickerSource, SlotContributions } from '@/extensions/slots';
import type { RecipientAddressBookSource } from '@/types/recipient-address-book';
import { inProjection } from '@/test-utils/projection';

/**
 * 수신자 피커 주소록 출처 도우미(슬롯 단계 PR-4)의 노출 동등성.
 *
 * 종전에는 메일·문자 화면이 주소록 어댑터를 마커 블록 안에서 피커에 넘겼다. 이제 주소록 기능이 슬롯 기여로 출처를 내놓고, 화면은 이
 * 도우미로 받는다. 이 시험은 [채널 mail·sms·notification] × [기여 있음·투영으로 빠짐] 에서 피커의 주소록 탭이 종전과 같은지 본다.
 * 쪽지·알림 발송 화면은 도우미를 부르지 않고 출처를 넘기지 않는다(종전과 같다) — 표의 notification 열이 그 조합이다.
 *
 * 레지스트리 모듈은 vi.mock 으로 감싸 실제 값(원본 기여)과 빈 배열(주소록이 빠진 구성의 렌더) 사이를 오간다. 실제 값을 쓰는 시험은
 * 기여 파일이 투영으로 빠지지 않았을 때만 등록한다 — 빠진 구성에서는 실제 레지스트리가 이미 빈 배열이다.
 */
const ADDRESS_BOOK_CONTRIBUTION = 'frontend/src/extensions/addressbook/recipient-picker-sources.ts';
const ADDRESS_BOOK_ADAPTER = 'frontend/src/services/business/user/addressbook/recipient-address-book-source.ts';
const addressBookInProjection = inProjection([ADDRESS_BOOK_CONTRIBUTION, ADDRESS_BOOK_ADAPTER]);

type Registry = readonly SlotContributions<'recipient-picker-sources'>[];
const state = vi.hoisted(() => ({
  mode: 'actual' as 'actual' | 'empty' | 'fake',
  fake: [] as unknown,
  user: undefined as { permissions: string[]; authorizationVersion: string } | undefined,
}));

vi.mock('@/extensions/generated-recipient-picker-sources', async (importOriginal) => {
  const actual = await importOriginal<{ recipientPickerSources: Registry }>();
  const empty: Registry = [];
  return {
    get recipientPickerSources() {
      return state.mode === 'actual' ? actual.recipientPickerSources : state.mode === 'empty' ? empty : state.fake;
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useOptionalAuth: () => (state.user ? { user: state.user } : undefined),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockStandardModal({ isOpen, title, children }: { isOpen: boolean; title: string; children: ReactNode }) {
    return isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null;
  },
}));

vi.mock('@/services/business/user/UserSearchService', () => ({ userSearchService: { searchAssignableUsers: vi.fn() } }));
vi.mock('@/lib/safe-error-log', () => ({ logErrorSafely: vi.fn() }));

/** 메일·문자 화면은 도우미가 준 출처를, 쪽지·알림 발송 화면은 출처 없이 피커를 연다. */
function composedAddressBook(channel: RecipientChannel): RecipientAddressBookSource | undefined {
  if (channel === 'notification') return undefined;
  return renderHook(() => useRecipientAddressBook(channel)).result.current?.source;
}

function addressBookTabShown(channel: RecipientChannel): boolean {
  const addressBook = composedAddressBook(channel);
  const view = render(<RecipientPicker isOpen channel={channel} onClose={vi.fn()} onConfirm={vi.fn()} addressBook={addressBook} />);
  const shown = screen.queryByRole('tab', { name: /주소록/ }) !== null;
  view.unmount();
  return shown;
}

const CHANNELS = ['mail', 'sms', 'notification'] as const;

beforeEach(() => {
  state.mode = 'actual';
  state.user = undefined;
});

if (addressBookInProjection) {
  describe('주소록 기여가 있는 구성', () => {
    it.each(CHANNELS)('%s: 주소록 탭은 메일·문자에만 보인다(종전과 같다)', (channel) => {
      expect(addressBookTabShown(channel)).toBe(channel !== 'notification');
    });

    it('메일·문자는 같은 출처와 이름(주소록)을 받고, 그 출처는 종전 화면이 넘기던 어댑터 그대로다', async () => {
      const { recipientAddressBookSource } = await vi.importActual<{ recipientAddressBookSource: RecipientAddressBookSource }>(
        '@/services/business/user/addressbook/recipient-address-book-source',
      );
      for (const channel of ['mail', 'sms'] as const) {
        const offer = renderHook(() => useRecipientAddressBook(channel)).result.current;
        expect(offer?.label).toBe('주소록');
        expect(offer?.source).toBe(recipientAddressBookSource);
      }
    });

    it('권한 상태와 무관하게 보인다 — 노출을 권한에 묶는 일은 따로 한다', () => {
      state.user = { permissions: [], authorizationVersion: 'v1' };
      expect(renderHook(() => useRecipientAddressBook('mail')).result.current?.label).toBe('주소록');
    });

    it('같은 항목이면 같은 결과 객체다 — 피커 prop 이 렌더마다 바뀌지 않는다', () => {
      const hook = renderHook(() => useRecipientAddressBook('sms'));
      const first = hook.result.current;
      hook.rerender();
      expect(hook.result.current).toBe(first);
    });
  });
}

describe('주소록이 투영으로 빠진 구성(레지스트리가 빈 배열)', () => {
  it.each(CHANNELS)('%s: 주소록 탭이 없다', (channel) => {
    state.mode = 'empty';
    expect(addressBookTabShown(channel)).toBe(false);
  });

  it('메일·문자 모두 출처를 받지 않는다', () => {
    state.mode = 'empty';
    expect(renderHook(() => useRecipientAddressBook('mail')).result.current).toBeUndefined();
    expect(renderHook(() => useRecipientAddressBook('sms')).result.current).toBeUndefined();
  });
});

describe('판정 규칙', () => {
  const source: RecipientAddressBookSource = { listBooks: async () => [], listContacts: async () => [] };
  const entry = (id: string, channels: RecipientPickerSource['channels'], visibleWhen: RecipientPickerSource['visibleWhen']) => ({
    id, label: id, channels, source, visibleWhen,
  });

  it('그 채널을 받는 항목만, 보이는 항목만 돌려준다', () => {
    state.mode = 'fake';
    state.fake = [[entry('sms-only', ['sms'], { always: '시험용 사유' }), entry('gated', ['mail'], { permissions: ['ADBK_READ'] })]];
    expect(renderHook(() => useRecipientAddressBook('mail')).result.current).toBeUndefined();
    expect(renderHook(() => useRecipientAddressBook('sms')).result.current?.label).toBe('sms-only');
    state.user = { permissions: ['ADBK_READ'], authorizationVersion: 'v1' };
    expect(renderHook(() => useRecipientAddressBook('mail')).result.current?.label).toBe('gated');
  });

  it('알림 채널은 주소록 출처를 받지 않는다 — 타입이 막고, 실행해도 없다', () => {
    state.mode = 'fake';
    state.fake = [[entry('every', ['mail', 'sms'], { always: '시험용 사유' })]];
    // @ts-expect-error 알림 채널은 계정 전달이라 도우미의 채널이 아니다.
    expect(renderHook(() => useRecipientAddressBook('notification')).result.current).toBeUndefined();
  });
});
