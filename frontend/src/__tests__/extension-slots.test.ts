import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  defineContributions,
  isContributionVisible,
  visibleEntries,
  type RecipientPickerSource,
  type SlotContributions,
  type SlotVisibility,
} from '@/extensions/slots';
import { useSlotEntries } from '@/extensions/use-slot-entries';
import type { RecipientAddressBookSource } from '@/types/recipient-address-book';

/**
 * 확장 슬롯 장치(슬롯 단계 PR-4)의 노출·순서 판정. 노출 술어는 라우트 게이트·기능권한과 같은 함수(canPermission·canOpenPage)로
 * 판정한다 — 다른 판정을 두면 버튼은 보이는데 누르면 튕기는 비대칭이 생긴다(DEC-OPS-023 ②).
 * 생성 레지스트리는 import 하지 않는다 — 레지스트리를 읽는 모듈은 경계 계약의 소비자 표에 있는 것뿐이다. 실제 기여의 노출은 그 소비자의
 * 시험이 본다. 예시 권한은 core 코드(DEPT_READ·USER_READ)다 — 생성물은 권한 목록을 구성 코드로 줄이므로(Phase 2 10단계 10b) 기능의
 * 코드를 쓰면 그 기능이 빠진 구성에서 타입 검사와 판정이 함께 깨진다.
 */
const subject = (permissions: string[]) => ({ permissions, authorizationVersion: 'v1' });
const source: RecipientAddressBookSource = { listBooks: async () => [], listContacts: async () => [] };
const entry = (id: string, visibleWhen: SlotVisibility, channels: RecipientPickerSource['channels'] = ['mail']): RecipientPickerSource => ({
  id, label: id, channels, source, visibleWhen,
});
const always: SlotVisibility = { always: '시험용 사유' };

describe('isContributionVisible', () => {
  it('always 는 주체 없이도 보인다', () => {
    expect(isContributionVisible(null, always)).toBe(true);
    expect(isContributionVisible(undefined, always)).toBe(true);
  });

  it('permissions 는 적은 권한을 모두 가진 주체에게만 보인다 — 권한 상태를 모르면 보이지 않는다', () => {
    const rule: SlotVisibility = { permissions: ['DEPT_READ', 'USER_READ'] };
    expect(isContributionVisible(subject(['DEPT_READ', 'USER_READ']), rule)).toBe(true);
    expect(isContributionVisible(subject(['DEPT_READ']), rule)).toBe(false);
    expect(isContributionVisible({ permissions: ['DEPT_READ', 'USER_READ'] }, rule)).toBe(false);
    expect(isContributionVisible(null, rule)).toBe(false);
  });

  it('page 는 라우트 게이트가 통과시키는 주체에게만 보이고, /admin 밖은 늘 보인다', () => {
    expect(isContributionVisible(subject(['AUTHRT_READ']), { page: '/admin/security/authority' })).toBe(true);
    expect(isContributionVisible(subject([]), { page: '/admin/security/authority' })).toBe(false);
    expect(isContributionVisible(null, { page: '/note' })).toBe(true);
  });
});

describe('visibleEntries', () => {
  it('order 가 있는 항목이 앞(작은 값 먼저), 그다음 레지스트리 순서(기능 코드 포인트), 같은 기능 안에서는 id 순이다', () => {
    const first = entry('z-first', always);
    const second = entry('b', always);
    const third = entry('a', always);
    const ordered = Object.assign(entry('ordered-late', always), { order: 2 });
    const orderedEarly = Object.assign(entry('ordered-early', always), { order: 1 });
    const registry: readonly SlotContributions<'recipient-picker-sources'>[] = [[second, ordered, third], [first, orderedEarly]];
    expect(visibleEntries(null, registry).map((row) => row.id)).toEqual(['ordered-early', 'ordered-late', 'a', 'b', 'z-first']);
  });

  it('보이지 않는 항목과 accept 가 거른 항목을 빼고, 기여 모듈의 객체를 그대로 돌려준다', () => {
    const mail = entry('mail', always, ['mail']);
    const sms = entry('sms', always, ['sms']);
    const gated = entry('gated', { permissions: ['DEPT_READ'] }, ['mail']);
    const registry = [defineContributions('recipient-picker-sources', [mail, sms, gated])];
    const forMail = visibleEntries(null, registry, (row) => row.channels.includes('mail'));
    expect(forMail).toEqual([mail]);
    expect(forMail[0]).toBe(mail);
    expect(visibleEntries(subject(['DEPT_READ']), registry, (row) => row.channels.includes('mail')).map((row) => row.id)).toEqual(['gated', 'mail']);
    expect(visibleEntries(null, [])).toEqual([]);
  });
});

describe('useSlotEntries', () => {
  it('인증 공급자 밖에서는 주체가 없어 always 항목만 보인다', () => {
    const registry = [defineContributions('recipient-picker-sources', [entry('open', always), entry('gated', { permissions: ['DEPT_READ'] })])];
    const { result } = renderHook(() => useSlotEntries(registry));
    expect(result.current.map((row) => row.id)).toEqual(['open']);
  });
});
