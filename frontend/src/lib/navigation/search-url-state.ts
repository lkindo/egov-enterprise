/** ADR-0009 pilot: a source contract for /search, never an authorization decision. */
export const SEARCH_URL_STATE = Object.freeze({
  route: '/search',
  key: 'q',
  maxLength: 200,
  duplicatePolicy: 'reject',
  unknownKeyPolicy: 'discard',
} as const);

export interface SearchUrlState { readonly q: string }
export type SearchUrlInput = Readonly<Record<string, string | string[] | undefined>>;
export type SearchUrlError = 'duplicate-query' | 'invalid-type' | 'query-too-long' | 'invalid-unicode';
export type SearchUrlParseResult = { ok: true; state: SearchUrlState } | { ok: false; error: SearchUrlError };

/** Next already decodes query values. Unknown keys are discarded, with no second decoding or trimming. */
export function parseSearchUrlState(input: SearchUrlInput): SearchUrlParseResult {
  const q = Object.hasOwn(input, SEARCH_URL_STATE.key) ? input.q : undefined;
  if (q === undefined) return { ok: true, state: { q: '' } };
  if (Array.isArray(q)) return { ok: false, error: 'duplicate-query' };
  if (typeof q !== 'string') return { ok: false, error: 'invalid-type' };
  if (q.length > SEARCH_URL_STATE.maxLength) return { ok: false, error: 'query-too-long' };
  // Lone UTF-16 surrogates have no valid URL encoding. Keep normal Unicode and literal '%' unchanged.
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(q)) {
    return { ok: false, error: 'invalid-unicode' };
  }
  return { ok: true, state: { q } };
}

/** Encode only the declared q value; callers retain the observable literal search route and key. */
export function serializeSearchQuery(state: SearchUrlState): string {
  if (Object.keys(state).some(key => key !== SEARCH_URL_STATE.key)) throw new Error('undeclared-search-url-key');
  const parsed = parseSearchUrlState({ q: state.q });
  if (!parsed.ok) throw new Error(parsed.error);
  return encodeURIComponent(parsed.state.q);
}

export function searchUrlErrorMessage(error: SearchUrlError): string {
  if (error === 'duplicate-query') return '검색어가 여러 번 지정되었습니다. 검색어를 하나만 입력해 주세요.';
  if (error === 'query-too-long') return `검색어는 ${SEARCH_URL_STATE.maxLength}자 이내로 입력해 주세요.`;
  return '검색어 형식을 확인하고 다시 입력해 주세요.';
}
