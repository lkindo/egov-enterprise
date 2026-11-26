/**
 * 로그아웃 직전·세션을 잃었을 때 끝내야 하는 일(2026-11-25 품질 평가).
 *
 * <p>로그아웃은 {@code markSignedOut()} 으로 그 뒤의 요청을 막는다(DIP B4). 그래서 화면이 사라지며 보내던 일 — 결재함의 되돌리기 대기 중
 * 승인 — 이 그 표지에 막혀 조용히 사라졌다. 그런 일은 여기에 등록하고, 로그아웃은 표지를 세우기 전에 등록된 일을 끝까지(상한 시간까지)
 * 기다린다. 다른 탭의 로그아웃·세션 만료처럼 이미 세션이 끝나 보낼 수 없는 경로는 {@link runOnSessionLost} 로 남은 일을 정리하고, 사용자가
 * 다시 로그인할 때 볼 안내({@link rememberSignOutNotice})를 남긴다.
 *
 * <p>기능 모듈이 이 코어 모듈에 등록한다(역방향 import 없음) — 기능이 빠진 생성물에는 등록도 없다. 등록은 기능별 고정 키라 모듈이 다시
 * 평가돼도(HMR) 하나만 남는다.
 */
type BeforeSignOutTask = () => Promise<unknown> | unknown;

const beforeSignOut = new Map<string, BeforeSignOutTask>();
const onSessionLost = new Map<string, () => void>();

/** 로그아웃 직전에 할 일을 기능별 키로 등록한다. 돌려준 함수로 등록을 푼다. */
export function registerBeforeSignOut(key: string, task: BeforeSignOutTask): () => void {
  beforeSignOut.set(key, task);
  return () => {
    if (beforeSignOut.get(key) === task) beforeSignOut.delete(key);
  };
}

/**
 * 로그아웃이 기다리는 상한. API 요청 시간 제한(15초, lib/api/client)보다 길게 둔다 — 그 안에 대기 중 승인의 성공·실패가 정해져
 * 결과를 모른 채 로그아웃하지 않는다. 그래도 넘기면 남은 일은 {@link runOnSessionLost} 로 넘겨 안내를 남긴다.
 */
export const BEFORE_SIGN_OUT_TIMEOUT_MS = 20_000;

/** 등록된 일을 모두 시작하고, 모두 끝나거나 상한 시간이 지날 때까지 기다린다. 실패는 삼킨다(등록한 쪽이 알린다). */
export async function runBeforeSignOut(timeoutMs: number = BEFORE_SIGN_OUT_TIMEOUT_MS): Promise<{ timedOut: boolean }> {
  forgetShownSignOutNotices();
  if (beforeSignOut.size === 0) return { timedOut: false };
  const running = [...beforeSignOut.values()].map((task) => Promise.resolve().then(task).catch(() => undefined));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  try {
    const outcome = await Promise.race([Promise.allSettled(running).then(() => 'done' as const), deadline]);
    return { timedOut: outcome === 'timeout' };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** 세션이 이미 끝나 보낼 수 없을 때(다른 탭 로그아웃·만료·상한 초과) 할 일을 기능별 키로 등록한다. 동기로 끝내야 한다. */
export function registerOnSessionLost(key: string, task: () => void): () => void {
  onSessionLost.set(key, task);
  return () => {
    if (onSessionLost.get(key) === task) onSessionLost.delete(key);
  };
}

/** 등록된 세션 상실 정리를 부른다. 하나의 실패가 나머지를 막지 않는다. 페이지를 떠나기 직전에 부른다. */
export function runOnSessionLost(): void {
  forgetShownSignOutNotices();
  for (const task of onSessionLost.values()) {
    try {
      task();
    } catch {
      // 정리 실패가 로그아웃·이동을 막지 않는다.
    }
  }
}

const NOTICE_KEY = 'egov.sign-out-notices.v2';

/**
 * 다시 로그인할 때 보일 안내 — 문장이 아니라 카탈로그 키와 값이다(ADR-0063: 로그인 화면이 현재 로케일로 그린다). 건수 같은 값만 싣고
 * 사용자·문서 식별자나 제목은 싣지 않는다.
 */
export interface SignOutNotice {
  key: string;
  values?: Record<string, number>;
}

function isNotice(value: unknown): value is SignOutNotice {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { key?: unknown; values?: unknown };
  if (typeof candidate.key !== 'string' || candidate.key.length === 0) return false;
  if (candidate.values === undefined) return true;
  return typeof candidate.values === 'object' && candidate.values !== null
    && Object.values(candidate.values as Record<string, unknown>).every((item) => typeof item === 'number');
}

/** 다시 로그인할 때 보일 안내를 남긴다(이 탭의 세션 저장소). 같은 키는 새 값으로 바꾼다. */
export function rememberSignOutNotice(key: string, values?: Record<string, number>): void {
  forgetShownSignOutNotices();
  try {
    const current = JSON.parse(window.sessionStorage.getItem(NOTICE_KEY) ?? '[]') as unknown;
    const list = (Array.isArray(current) ? current.filter(isNotice) : []).filter((notice) => notice.key !== key);
    list.push(values ? { key, values } : { key });
    window.sessionStorage.setItem(NOTICE_KEY, JSON.stringify(list.slice(-5)));
  } catch {
    // 저장소를 쓸 수 없으면 안내만 잃는다.
  }
}

/**
 * 로그인 화면이 보일 안내의 스냅숏(useSyncExternalStore) — 처음 읽을 때 남긴 안내를 꺼내 고정한다. 같은 화면의 다시 그리기와 Strict Mode 의
 * 이중 렌더가 같은 목록을 보고, 로그아웃이 시작되거나 새 안내가 남으면 비운다(다음 로그인 화면이 새로 꺼낸다). 서버 렌더는 빈 목록이다.
 */
const NO_NOTICES: readonly SignOutNotice[] = Object.freeze([]);
let shownNotices: readonly SignOutNotice[] | null = null;

export function signOutNoticesSnapshot(): readonly SignOutNotice[] {
  if (shownNotices === null) {
    const taken = takeSignOutNotices();
    shownNotices = taken.length === 0 ? NO_NOTICES : Object.freeze(taken);
  }
  return shownNotices;
}

export function serverSignOutNoticesSnapshot(): readonly SignOutNotice[] {
  return NO_NOTICES;
}

/** 안내는 바깥에서 바뀌지 않는다(로그인 화면에 있는 동안 새로 남지 않는다) — 구독할 것이 없다. */
export function subscribeSignOutNotices(): () => void {
  return () => {};
}

/** 보인 안내를 잊는다 — 로그아웃이 시작되거나 새 안내가 남을 때(다음 로그인 화면은 새로 꺼낸다). 로그인 화면에 머무는 동안은 그대로 둔다. */
export function forgetShownSignOutNotices(): void {
  shownNotices = null;
}

/** 남긴 안내를 읽고 지운다. */
export function takeSignOutNotices(): SignOutNotice[] {
  try {
    const raw = window.sessionStorage.getItem(NOTICE_KEY);
    window.sessionStorage.removeItem(NOTICE_KEY);
    const parsed = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter(isNotice) : [];
  } catch {
    return [];
  }
}
