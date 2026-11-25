/**
 * 로그아웃 직전에 끝내야 하는 일(2026-11-25 품질 평가).
 *
 * <p>로그아웃은 가장 먼저 {@code markSignedOut()} 으로 그 뒤의 요청을 막는다(DIP B4). 그래서 화면이 사라지며 보내던 일 —
 * 결재함의 되돌리기 대기 중 승인 — 이 그 표지에 막혀 조용히 사라졌다. 그런 일은 여기에 등록하고, 로그아웃은 표지를 세우기 전에
 * 등록된 일을 끝까지(상한 시간까지) 기다린다. 실패는 등록한 쪽이 처리하고 로그아웃을 막지 않는다.
 *
 * <p>기능 모듈이 이 코어 모듈에 등록한다(역방향 import 없음) — 기능이 빠진 생성물에는 등록도 없다.
 */
type BeforeSignOutTask = () => Promise<unknown> | unknown;

const tasks = new Set<BeforeSignOutTask>();

/** 로그아웃 직전에 할 일을 등록한다. 돌려준 함수로 등록을 푼다. */
export function registerBeforeSignOut(task: BeforeSignOutTask): () => void {
  tasks.add(task);
  return () => {
    tasks.delete(task);
  };
}

/** 로그아웃이 기다리는 상한 — 서버가 느려도 로그아웃이 멈추지 않는다. */
export const BEFORE_SIGN_OUT_TIMEOUT_MS = 5_000;

/** 등록된 일을 모두 시작하고, 모두 끝나거나 상한 시간이 지날 때까지 기다린다. 실패는 삼킨다(등록한 쪽이 알린다). */
export async function runBeforeSignOut(timeoutMs: number = BEFORE_SIGN_OUT_TIMEOUT_MS): Promise<void> {
  if (tasks.size === 0) return;
  const running = [...tasks].map((task) => Promise.resolve().then(task).catch(() => undefined));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([Promise.allSettled(running).then(() => undefined), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
