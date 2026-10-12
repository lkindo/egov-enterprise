'use client';

import { useMemo } from 'react';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { visibleEntries, type SlotContributions, type SlotId, type SlotMap } from './slots';

/**
 * 클라이언트 셸이 슬롯 레지스트리를 읽는 훅. 로그인 주체로 노출 술어(visibleWhen)를 판정해 보이는 항목만 돌려준다.
 * 인증 공급자 밖에서는 주체가 없으므로 permissions·/admin 의 page 술어는 거짓이고 always 항목만 보인다.
 *
 * 결과 배열은 주체·레지스트리·accept 가 같으면 같은 배열이다. accept 를 렌더마다 새로 만들면 배열도 매번 새로 만들어지므로,
 * 결과를 의존성에 쓰는 곳은 accept 를 고정하거나 항목(기여 모듈의 값이라 늘 같은 객체다)을 의존성으로 쓴다.
 * accept 가 타입 술어면 결과 타입도 좁혀진다(visibleEntries 와 같다).
 */
export function useSlotEntries<S extends SlotId, T extends SlotMap[S]>(
  registry: readonly SlotContributions<S>[],
  accept: (entry: SlotMap[S]) => entry is T,
): T[];
export function useSlotEntries<S extends SlotId>(
  registry: readonly SlotContributions<S>[],
  accept?: (entry: SlotMap[S]) => boolean,
): SlotMap[S][];
export function useSlotEntries<S extends SlotId>(
  registry: readonly SlotContributions<S>[],
  accept?: (entry: SlotMap[S]) => boolean,
): SlotMap[S][] {
  const user = useOptionalAuth()?.user;
  return useMemo(() => visibleEntries(user, registry, accept), [user, registry, accept]);
}
