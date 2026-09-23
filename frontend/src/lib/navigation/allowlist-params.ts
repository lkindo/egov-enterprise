/**
 * 화면이 다음 URL 을 만들 때 **이름을 아는 키만** 다시 조립한다.
 *
 * [2026-09-23 DEC-OPS-029 Q2 이행] 종전 관용구 `new URLSearchParams(searchParams.toString())` 는
 * 들어온 쿼리를 이름을 묻지 않고 전부 복사한 뒤 자기 키만 덮어썼다. 그 형태는 **모르는 이름이
 * URL 에 한 번 들어오면 탭·페이지 클릭마다 재발행하는 캐리어**이고, URL-state census 가 그런
 * record 를 `copy-existing-query` + `unknown-query-passthrough`·`repeated-query-passthrough`·
 * `encoded-query-passthrough` 로 분류해 `opaque`(판정 불가) 부류에 넣는다.
 *
 * 이 함수는 빈 `URLSearchParams` 에서 시작하므로 다음 셋이 함께 닫힌다.
 *
 * - **모르는 이름**: allowlist 밖은 다시 실리지 않는다.
 * - **반복된 이름**: `get()` 이 첫 값만 주고 `set()` 이 하나만 남긴다.
 * - **인코딩 변형**: 디코딩된 이름으로 대조하므로 `%74ab` 같은 우회가 통과하지 못한다.
 *
 * ⚠ allowlist 는 **라우트 소유**다. 공용 기본 목록을 두지 않는 이유는, 한 곳에 모으면 어느 화면이
 *   그 키를 실제로 읽는지가 사라지고 목록이 합집합으로만 자라기 때문이다. 새 파라미터를 도입하면
 *   그 라우트의 목록에 함께 넣어야 한다 — 그러지 않으면 이동 시 **조용히 사라진다.**
 */
export function pickAllowedParams(
  source: { get(name: string): string | null },
  keys: readonly string[],
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = source.get(key);
    if (value) params.set(key, value);
  }
  return params;
}
