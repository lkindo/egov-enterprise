import { describe, expect, it } from 'vitest';
import { SEARCH_URL_STATE, parseSearchUrlState, serializeSearchQuery, type SearchUrlInput, type SearchUrlState } from '../search-url-state';

describe('/search declarative URL state', () => {
  it('keeps the existing route, single key and decoded bookmark values', () => {
    expect(SEARCH_URL_STATE).toEqual({ route: '/search', key: 'q', maxLength: 200, duplicatePolicy: 'reject', unknownKeyPolicy: 'discard' });
    for (const q of ['', '홍 길동', ' A+B & 100% #?= ', '📋 검색', '%2Falready-decoded']) {
      expect(parseSearchUrlState({ q })).toEqual({ ok: true, state: { q } });
      const encoded = serializeSearchQuery({ q });
      expect(encoded).toBe(encodeURIComponent(q));
      expect(new URLSearchParams(`q=${encoded}`).get('q')).toBe(q);
    }
    expect(parseSearchUrlState({})).toEqual({ ok: true, state: { q: '' } });
  });

  it('discards unknown bookmark keys and cannot serialize undeclared fields', () => {
    const parsed = parseSearchUrlState({ q: '검색', token: 'synthetic', next: '/other', sort: 'name' });
    expect(parsed).toEqual({ ok: true, state: { q: '검색' } });
    if (!parsed.ok) throw new Error('fixture must parse');
    expect(serializeSearchQuery(parsed.state)).toBe(encodeURIComponent('검색'));
    expect(() => serializeSearchQuery({ q: '검색', token: 'synthetic' } as SearchUrlState)).toThrow('undeclared-search-url-key');
  });

  it('rejects repeated keys, malformed types, invalid Unicode and oversized values without truncation', () => {
    for (const q of [['first', 'second'], ['same', 'same'], []]) {
      expect(parseSearchUrlState({ q })).toEqual({ ok: false, error: 'duplicate-query' });
    }
    expect(parseSearchUrlState({ q: 123 } as unknown as SearchUrlInput)).toEqual({ ok: false, error: 'invalid-type' });
    expect(parseSearchUrlState({ q: '한'.repeat(200) })).toEqual({ ok: true, state: { q: '한'.repeat(200) } });
    expect(parseSearchUrlState({ q: '한'.repeat(201) })).toEqual({ ok: false, error: 'query-too-long' });
    expect(() => serializeSearchQuery({ q: 'x'.repeat(201) })).toThrow('query-too-long');
    for (const q of ['\uD800', '\uDC00']) {
      expect(parseSearchUrlState({ q })).toEqual({ ok: false, error: 'invalid-unicode' });
      expect(() => serializeSearchQuery({ q })).toThrow('invalid-unicode');
    }
  });
});
