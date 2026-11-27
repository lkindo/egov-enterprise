'use client';

import { useRef, useState } from 'react';

/**
 * 한 번에 하나만 도는 쓰기 동작(2026-11-27, 품질 평가 A안 2번).
 *
 * 화면마다 손으로 짜던 `if (pendingRef.current) return; pendingRef.current = true; setPending(true); try { … } finally { … }` 를
 * 한 곳에 둔다. 동기 잠금(ref)은 같은 틱의 연타를 막고, 처리 중 상태(`pending`·`pendingKey`)는 단추의 `disabled`·`aria-busy` 에
 * 쓰며, 해제는 task 가 실패해도 finally 에서 한다.
 *
 * - 동작마다 인스턴스를 하나씩 둔다(`const deleteFlight = useSingleFlight<number>()`). 한 인스턴스를 여러 동작이 함께 쓰면 단추가
 *   어느 동작이 진행 중인지 말하지 못한다 — 폼 검증 census 도 그렇게 판정한다.
 * - 행마다 대기를 보이려면 `runFor(key, task)` 와 `pendingKey` 를 쓴다(`aria-busy={flight.pendingKey === row.id}`). 단추의
 *   `disabled` 와 `aria-busy` 는 같은 상태(`pending` 또는 `pendingKey`)로 묶는다.
 * - 다른 동작과 서로 막아야 하면 시작 전에 `otherFlight.isRunning()` 을 본다.
 * - 진행 중이면 task 를 부르지 않고 `undefined` 를 돌려준다. task 의 실패는 그대로 던진다 — 실패 알림은 task 안의 catch 가 맡는다.
 *
 * 돌려주는 함수는 렌더마다 새로 만든다. 폼 검증 census 가 다른 파일의 감싸기 함수를 그 선언으로 따라가기 때문이다.
 * 의존성 배열에 넣어야 하면 인스턴스(`flight`)가 아니라 필요한 값만 넣는다.
 */
export function useSingleFlight<K = string | number>() {
  const inFlightRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [pendingKey, setPendingKey] = useState<K | null>(null);

  /** task 를 하나만 돌린다. 진행 중이면 부르지 않고 undefined 를 돌려준다. */
  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setPending(true);
    try {
      return await task();
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  }

  /** run 과 같되, 진행 중인 대상(행 번호 등)을 pendingKey 로도 알린다(pending 도 참이 된다). */
  async function runFor<T>(key: K, task: () => Promise<T>): Promise<T | undefined> {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setPending(true);
    setPendingKey(key);
    try {
      return await task();
    } finally {
      inFlightRef.current = false;
      setPending(false);
      setPendingKey(null);
    }
  }

  /** 지금 진행 중인가 — 렌더 전에도 맞는 동기 값이다(다른 동작과 서로 막을 때 쓴다). */
  function isRunning() {
    return inFlightRef.current;
  }

  return { run, runFor, isRunning, pending, pendingKey };
}
