import { render, renderHook, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { RecipientPicker, type RecipientChannel } from '../recipient-picker';
import { useRecipientAddressBook, type RecipientAddressBookChannel } from '../recipient-picker-sources';
import type { RecipientPickerSource, SlotContributions } from '@/extensions/slots';
import type { RecipientAddressBookSource } from '@/types/recipient-address-book';
import { inProjection, REPO_ROOT } from '@/test-utils/projection';

/**
 * 수신자 피커 주소록 출처 도우미의 노출 행렬(슬롯 단계 PR-4 구조 · PR-5 노출).
 *
 * [채널 mail·sms·notification] × [주체: ADBK_READ 있음·없음·권한 미확정 4종] × [레지스트리: 실제 기여·빈 렌더].
 * 주소록 탭은 실제 기여가 있고, 주체가 ADBK_READ 를 가지며, 채널이 메일·문자일 때만 보인다. 권한 상태를 모르면(인증 공급자 밖·
 * 로그아웃·권한 버전 없음·빈 권한 버전) 보이지 않는다. 노출일 뿐 인가가 아니다 — 목록·단건 API 는 서버가 같은 권한으로 막는다(H3).
 * 쪽지·알림 발송 화면은 도우미를 부르지 않고 출처를 넘기지 않는다 — 표의 notification 열이 그 조합이다.
 *
 * 레지스트리 모듈은 vi.mock 으로 감싸 실제 값(원본 기여)과 빈 배열(주소록이 빠진 구성의 렌더) 사이를 오간다. 실제 값을 쓰는 시험은
 * 기여 파일이 투영으로 빠지지 않았을 때만 등록한다 — 빠진 구성에서는 실제 레지스트리가 이미 빈 배열이다.
 */
const ADDRESS_BOOK_CONTRIBUTION = 'frontend/src/extensions/addressbook/recipient-picker-sources.ts';
const ADDRESS_BOOK_ADAPTER = 'frontend/src/services/business/user/addressbook/recipient-address-book-source.ts';
const addressBookInProjection = inProjection([ADDRESS_BOOK_CONTRIBUTION, ADDRESS_BOOK_ADAPTER]);

type Registry = readonly SlotContributions<'recipient-picker-sources'>[];
type AuthValue = undefined | { user: null | { permissions: string[]; authorizationVersion?: string } };
const state = vi.hoisted(() => ({
  mode: 'actual' as 'actual' | 'empty' | 'fake',
  fake: [] as unknown,
  /** 실제 레지스트리(원본 기여의 렌더). 술어–API 결속 시험이 읽는다. */
  actual: [] as unknown,
  auth: undefined as AuthValue,
}));

vi.mock('@/extensions/generated-recipient-picker-sources', async (importOriginal) => {
  const actual = await importOriginal<{ recipientPickerSources: Registry }>();
  state.actual = actual.recipientPickerSources;
  const empty: Registry = [];
  return {
    get recipientPickerSources() {
      return state.mode === 'actual' ? actual.recipientPickerSources : state.mode === 'empty' ? empty : state.fake;
    },
  };
});

// 인증 맥락은 실제처럼 사용자 하나를 돌려준다. 판정은 목으로 막지 않는다 — canPermission 을 그대로 탄다.
vi.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: () => state.auth }));

vi.mock('next/dynamic', () => ({
  default: () => function MockStandardModal({ isOpen, title, children }: { isOpen: boolean; title: string; children: ReactNode }) {
    return isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null;
  },
}));

vi.mock('@/services/business/user/UserSearchService', () => ({ userSearchService: { searchAssignableUsers: vi.fn() } }));
vi.mock('@/lib/safe-error-log', () => ({ logErrorSafely: vi.fn() }));

const AUTH = {
  granted: { user: { permissions: ['ADBK_READ'], authorizationVersion: 'v1' } },
  // 근접 오답: 대행 권한(ADBK_READ_ALL)과 발송 권한만 있다. 목록·단건 API 는 정확히 ADBK_READ 를 요구한다.
  denied: { user: { permissions: ['ADBK_READ_ALL', 'MAIL_SEND', 'SMS_READ', 'SMS_SEND'], authorizationVersion: 'v1' } },
  noProvider: undefined,
  signedOut: { user: null },
  noVersion: { user: { permissions: ['ADBK_READ'] } },
  emptyVersion: { user: { permissions: ['ADBK_READ'], authorizationVersion: '' } },
} satisfies Record<string, AuthValue>;
type AuthCase = keyof typeof AUTH;
const AUTH_CASES = Object.keys(AUTH) as AuthCase[];
const CHANNELS = ['mail', 'sms', 'notification'] as const;
const REGISTRIES: Array<'actual' | 'empty'> = addressBookInProjection ? ['actual', 'empty'] : ['empty'];

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

beforeEach(() => {
  state.mode = 'actual';
  // 기본 주체는 권한이 있는 사용자다 — 빈 레지스트리 열이 '권한이 있어도 없다' 를 보게 해 그 단언이 비지 않는다.
  state.auth = AUTH.granted;
});

describe.each(REGISTRIES)('노출 행렬 — 레지스트리 %s', (registry) => {
  describe.each(AUTH_CASES)('주체 %s', (authCase) => {
    it.each(CHANNELS)('%s', (channel) => {
      state.mode = registry;
      state.auth = AUTH[authCase];
      const shown = registry === 'actual' && authCase === 'granted' && channel !== 'notification';
      expect(addressBookTabShown(channel)).toBe(shown);
      // 알림 화면은 도우미를 부르지 않는다(타입이 막는다 — '판정 규칙'). 실행 경로도 출처를 주지 않는지 함께 본다.
      const offer = renderHook(() => useRecipientAddressBook(channel as RecipientAddressBookChannel)).result.current;
      expect(offer?.label).toBe(shown ? '주소록' : undefined);
    });
  });
});

if (addressBookInProjection) {
  describe('실제 주소록 기여', () => {
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

    it('권한이 회수되거나 부여되면 다시 렌더할 때 따라간다', () => {
      const hook = renderHook(() => useRecipientAddressBook('mail'));
      expect(hook.result.current?.label).toBe('주소록');
      state.auth = AUTH.denied;
      hook.rerender();
      expect(hook.result.current).toBeUndefined();
      state.auth = AUTH.granted;
      hook.rerender();
      expect(hook.result.current?.label).toBe('주소록');
    });

    it('같은 항목이면 같은 결과 객체다 — 피커 prop 이 렌더마다 바뀌지 않는다', () => {
      const hook = renderHook(() => useRecipientAddressBook('sms'));
      const first = hook.result.current;
      expect(first?.label).toBe('주소록');
      hook.rerender();
      expect(hook.result.current).toBe(first);
    });

    it('노출 술어는 출처가 부르는 목록·단건 API 의 권한과 같고, 기본 그룹 셋이 모두 그 권한을 가진다', () => {
      const readConfig = (relative: string) => JSON.parse(readFileSync(path.join(REPO_ROOT, relative), 'utf8'));
      const bindings = readConfig('config/governance/authorization-policies.json').operationBindings as Array<{
        method: string; handler: string; permission: string | null;
      }>;
      // 어댑터의 listBooks·listContacts 가 부르는 연산(getAddressBooks·getAddressBook).
      const called = bindings.filter((row) => row.method === 'GET'
        && ['#getAddressBooks', '#getAddressBook'].some((suffix) => row.handler.endsWith(`.AddressBookApiController${suffix}`)));
      expect(called).toHaveLength(2);
      const required = [...new Set(called.map((row) => row.permission))];
      expect(required).toEqual(['ADBK_READ']);
      expect((state.actual as Registry).flat().map((entry) => entry.visibleWhen)).toEqual([{ permissions: required }]);
      // 기본 그룹은 모두 이 권한을 가져 화면이 바뀌지 않는다(DEC-OPS-268). 기본 그룹에서 빠지면 이 노출 결정을 다시 본다.
      const catalog = readConfig('config/governance/permission-catalog.json') as { permissions: Array<{ code: string; defaultGroups: string[] }> };
      expect(catalog.permissions.find((row) => row.code === 'ADBK_READ')?.defaultGroups).toEqual(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER']);
    });
  });
}

/*
 * 판정 규칙은 대역 기여로 본다. 대역의 노출 권한은 core 코드(DEPT_READ)다 — 생성물은 권한 목록을 구성 코드로 줄이므로(Phase 2 10단계 10b)
 * 주소록이 빠진 구성에서도 이 도우미의 규칙은 같은 뜻으로 돈다. 주소록 권한(ADBK_READ)은 위 실제 기여 시험이 본다.
 */
describe('판정 규칙', () => {
  const source: RecipientAddressBookSource = { listBooks: async () => [], listContacts: async () => [] };
  const entry = (id: string, channels: RecipientPickerSource['channels'], visibleWhen: RecipientPickerSource['visibleWhen']) => ({
    id, label: id, channels, source, visibleWhen,
  });

  it('그 채널을 받는 항목만, 보이는 항목만 돌려준다', () => {
    state.mode = 'fake';
    state.auth = AUTH.noProvider;
    state.fake = [[entry('sms-only', ['sms'], { always: '시험용 사유' }), entry('gated', ['mail'], { permissions: ['DEPT_READ'] })]];
    expect(renderHook(() => useRecipientAddressBook('mail')).result.current).toBeUndefined();
    expect(renderHook(() => useRecipientAddressBook('sms')).result.current?.label).toBe('sms-only');
    state.auth = { user: { permissions: ['DEPT_READ'], authorizationVersion: 'v1' } };
    expect(renderHook(() => useRecipientAddressBook('mail')).result.current?.label).toBe('gated');
  });

  it('알림 채널은 주소록 출처를 받지 않는다 — 타입이 막고, 실행해도 없다', () => {
    state.mode = 'fake';
    state.fake = [[entry('every', ['mail', 'sms'], { always: '시험용 사유' })]];
    // @ts-expect-error 알림 채널은 계정 전달이라 도우미의 채널이 아니다.
    expect(renderHook(() => useRecipientAddressBook('notification')).result.current).toBeUndefined();
  });
});
